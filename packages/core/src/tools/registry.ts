import type { Role, ToolContext, ToolDefinition, ToolResult, ToolSchema } from '../types.js';

export class ToolRegistry {
  private readonly tools = new Map<string, ToolDefinition>();

  register(tool: ToolDefinition): void {
    if (this.tools.has(tool.name)) {
      throw new Error(`Tool ${tool.name} sudah terdaftar.`);
    }
    this.tools.set(tool.name, tool);
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

  /** Tool yang boleh ditawarkan ke AI untuk role tertentu. */
  schemasFor(role: Role): ToolSchema[] {
    return this.list()
      .filter((tool) => tool.risk !== 'L2' && tool.allowedRoles.includes(role))
      .map(({ execute: _execute, ...schema }) => schema);
  }
}

export async function executeTool(
  tool: ToolDefinition,
  context: ToolContext,
): Promise<ToolResult> {
  try {
    return await tool.execute(context);
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) };
  }
}
