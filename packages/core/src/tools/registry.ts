import type { Role, ToolContext, ToolDefinition, ToolResult, ToolSchema } from '../types.js';
import {
  allowedRolesForMinRole,
  isRoleAllowed,
  resolveEffectiveLevel,
} from '../security/resolver.js';

export class ToolRegistry {
  private readonly tools = new Map<string, ToolDefinition>();

  register(tool: ToolDefinition): void {
    if (this.tools.has(tool.name)) {
      throw new Error(`Tool ${tool.name} sudah terdaftar.`);
    }

    const normalized: ToolDefinition = {
      ...tool,
      parameters: tool.parameters ?? tool.params,
      risk: tool.risk ?? tool.baseLevel,
      allowedRoles: tool.allowedRoles ?? allowedRolesForMinRole(tool.minRole),
      execute: tool.execute ?? (tool.handler ? (ctx) => tool.handler!(ctx) : undefined),
    };

    this.tools.set(tool.name, normalized);
  }

  registerAll(tools: ToolDefinition[]): void {
    for (const tool of tools) this.register(tool);
  }

  get(name: string): ToolDefinition | undefined {
    return this.tools.get(name);
  }

  list(): ToolDefinition[] {
    return [...this.tools.values()];
  }

  /**
   * Mengembalikan daftar tool yang diizinkan untuk role tertentu sesuai Bagian 5:
   * - minRole sesuai
   * - implemented = true
   * - Tool L2 tidak pernah didaftarkan
   */
  listToolsForRole(role: Role): ToolDefinition[] {
    return this.list().filter(
      (tool) =>
        tool.baseLevel !== 'L2' &&
        tool.risk !== 'L2' &&
        tool.implemented === true &&
        isRoleAllowed(role, tool.minRole),
    );
  }

  /** Tool yang boleh ditawarkan ke AI untuk role tertentu. */
  schemasFor(role: Role): ToolSchema[] {
    return this.listToolsForRole(role).map((tool) => ({
      name: tool.name,
      description: tool.description,
      parameters: tool.params ?? tool.parameters ?? {},
      risk: tool.baseLevel ?? tool.risk ?? 'L0',
      allowedRoles: tool.allowedRoles ?? allowedRolesForMinRole(tool.minRole),
      category: tool.category,
      minRole: tool.minRole,
      implemented: tool.implemented,
      priority: tool.priority,
    }));
  }
}

export async function executeTool(
  tool: ToolDefinition,
  context: ToolContext,
): Promise<ToolResult> {
  const effective = resolveEffectiveLevel(tool, context.params, {
    currentChatId: context.chatId,
    senderId: context.senderId,
    role: context.role,
  });

  if (effective.level === 'L2') {
    return {
      ok: false,
      status: 'denied',
      errorCode: 'l2_locked',
      reason: 'Aksi L2 terkunci dan hanya dapat dilakukan lewat Web UI oleh Owner.',
      error: 'Aksi L2 terkunci dan hanya dapat dilakukan lewat Web UI oleh Owner.',
      retryable: false,
    };
  }

  // Enforce Bagian B langkah 8:
  // Semua tool L1 hanya boleh dieksekusi lewat callback ApprovalEngine.
  if (effective.level === 'L1' && context.isApprovalExecution !== true) {
    return {
      ok: false,
      status: 'denied',
      errorCode: 'approval_required',
      reason: 'Tool L1 hanya boleh dieksekusi lewat callback ApprovalEngine.',
      error: 'Tool L1 hanya boleh dieksekusi lewat callback ApprovalEngine.',
      retryable: false,
    };
  }

  if (!tool.implemented || (!tool.handler && !tool.execute)) {
    return {
      ok: false,
      status: 'error',
      errorCode: 'unsupported',
      error: `Tool ${tool.name} belum diimplementasikan pada versi ini.`,
      retryable: false,
    };
  }

  try {
    const handler = tool.handler ?? (tool.execute ? (ctx: ToolContext) => tool.execute!(ctx) : null);
    if (!handler) {
      return {
        ok: false,
        status: 'error',
        errorCode: 'unsupported',
        error: `Tool ${tool.name} belum memiliki handler.`,
        retryable: false,
      };
    }
    const result = await handler(context);
    return {
      ...result,
      status: result.status ?? (result.ok ? 'ok' : 'error'),
    };
  } catch (error) {
    return {
      ok: false,
      status: 'error',
      errorCode: 'execution_exception',
      error: error instanceof Error ? error.message : String(error),
      retryable: false,
    };
  }
}
