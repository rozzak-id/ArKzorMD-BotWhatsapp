import type { proto, WASocket } from 'onigis';

export interface InteractiveButtonOptions {
  name?: string;
  buttonParamsJson?: string;
  text?: string;
  title?: string;
  label?: string;
  display_text?: string;
  id?: string;
  value?: string;
  type?: 'quick_reply' | 'cta_url' | 'cta_call' | 'cta_copy' | 'single_select' | 'list' | 'url' | 'call' | 'copy';
  url?: string;
  merchantUrl?: string;
  call?: string;
  phoneNumber?: string;
  phone?: string;
  copyCode?: string;
  copy?: string;
  sections?: Array<{ title?: string; rows?: Array<{ id?: string; title: string; description?: string }> }>;
  rows?: Array<{ id?: string; title: string; description?: string }>;
  sectionTitle?: string;
}

export interface SendInteractiveOptions {
  body?: string;
  caption?: string;
  text?: string;
  footer?: string;
  title?: string;
  subtitle?: string;
  image?: string | Buffer | null;
  video?: string | Buffer | null;
  document?: string | Buffer | null;
  mimetype?: string;
  fileName?: string;
  nativeFlow?: InteractiveButtonOptions[];
  buttons?: InteractiveButtonOptions[];
  quoted?: unknown;
  mentions?: string[];
  contextInfo?: Record<string, unknown>;
}

/**
 * Builds standard Native Flow button structures for WhatsApp using onigis proto.
 */
export function buildNativeFlowButtons(
  onigisProto: typeof proto,
  buttons: InteractiveButtonOptions[] = [],
): proto.Message.InteractiveMessage.NativeFlowMessage.INativeFlowButton[] {
  if (!Array.isArray(buttons)) return [];

  const NativeFlowButton = onigisProto.Message.InteractiveMessage.NativeFlowMessage.NativeFlowButton;

  return buttons.map((btn) => {
    // 0. If already formed NativeFlowButton proto or object
    if (btn?.name && btn?.buttonParamsJson) {
      return NativeFlowButton.create(btn as any);
    }

    // 1. Single Select / Bottom Sheet List
    if (btn.sections || btn.type === 'list' || btn.type === 'single_select') {
      const sections = btn.sections || (btn.rows ? [{ title: btn.sectionTitle || 'Pilih Opsi', rows: btn.rows }] : []);
      return NativeFlowButton.create({
        name: 'single_select',
        buttonParamsJson: JSON.stringify({
          title: btn.text || btn.title || 'Pilih Menu',
          sections,
        }),
      });
    }

    // 2. CTA URL Link Button
    if (btn.url || btn.type === 'url') {
      return NativeFlowButton.create({
        name: 'cta_url',
        buttonParamsJson: JSON.stringify({
          display_text: btn.text || btn.label || btn.display_text || 'Kunjungi Web',
          url: btn.url,
          merchant_url: btn.merchantUrl || btn.url,
        }),
      });
    }

    // 3. CTA Phone Call Button
    if (btn.call || btn.phoneNumber || btn.phone || btn.type === 'call') {
      return NativeFlowButton.create({
        name: 'cta_call',
        buttonParamsJson: JSON.stringify({
          display_text: btn.text || btn.label || 'Hubungi',
          phone_number: btn.call || btn.phoneNumber || btn.phone,
        }),
      });
    }

    // 4. CTA Copy Code Button
    if (btn.copyCode || btn.copy || btn.type === 'copy') {
      const code = btn.copyCode || btn.copy;
      return NativeFlowButton.create({
        name: 'cta_copy',
        buttonParamsJson: JSON.stringify({
          display_text: btn.text || btn.label || 'Salin Kode',
          id: btn.id || code,
          copy_code: code,
        }),
      });
    }

    // 5. Quick Reply Button (Default)
    return NativeFlowButton.create({
      name: 'quick_reply',
      buttonParamsJson: JSON.stringify({
        display_text: btn.text || btn.label || btn.display_text || 'Pilih',
        id: btn.id || btn.value || btn.text || 'btn_action',
      }),
    });
  });
}

/**
 * Sends a bulletproof Interactive Native Flow message for WhatsApp clients (Android & iOS)
 * Uses proto.Message constructors for maximum compatibility across OnigiBaileys versions.
 */
export async function sendInteractiveMessage(
  sock: WASocket,
  onigisMod: any,
  jid: string,
  options: SendInteractiveOptions = {},
): Promise<any> {
  const {
    body = '',
    caption = '',
    text = '',
    footer = 'ArKzorMD Executive',
    title = '',
    subtitle = '',
    image = null,
    video = null,
    document = null,
    nativeFlow = [],
    buttons = [],
    quoted = undefined,
  } = options;

  const contentText = body || caption || text || ' ';
  const buttonList = nativeFlow && nativeFlow.length > 0 ? nativeFlow : buttons;

  const protoMod = onigisMod.proto as typeof proto;
  const generateWAMessageFromContent = onigisMod.generateWAMessageFromContent;
  const prepareWAMessageMedia = onigisMod.prepareWAMessageMedia;

  try {
    let headerObj: any = null;
    if (image && prepareWAMessageMedia) {
      try {
        const media = await prepareWAMessageMedia(
          { image: typeof image === 'string' ? { url: image } : image },
          { upload: sock.waUploadToServer },
        );
        if (media?.imageMessage) {
          headerObj = protoMod.Message.InteractiveMessage.Header.create({
            hasMediaAttachment: true,
            imageMessage: media.imageMessage,
          });
        }
      } catch {
        // Fall back to text header if media preparation fails
      }
    } else if (video && prepareWAMessageMedia) {
      try {
        const media = await prepareWAMessageMedia(
          { video: typeof video === 'string' ? { url: video } : video },
          { upload: sock.waUploadToServer },
        );
        if (media?.videoMessage) {
          headerObj = protoMod.Message.InteractiveMessage.Header.create({
            hasMediaAttachment: true,
            videoMessage: media.videoMessage,
          });
        }
      } catch {
        // Fall back
      }
    } else if (document && prepareWAMessageMedia) {
      try {
        const media = await prepareWAMessageMedia(
          {
            document: typeof document === 'string' ? { url: document } : document,
            mimetype: options.mimetype || 'application/pdf',
            fileName: options.fileName || 'document.pdf',
          },
          { upload: sock.waUploadToServer },
        );
        if (media?.documentMessage) {
          headerObj = protoMod.Message.InteractiveMessage.Header.create({
            hasMediaAttachment: true,
            documentMessage: media.documentMessage,
          });
        }
      } catch {
        // Fall back
      }
    }

    if (!headerObj && (title || subtitle)) {
      headerObj = protoMod.Message.InteractiveMessage.Header.create({
        title: title || undefined,
        subtitle: subtitle || undefined,
        hasMediaAttachment: false,
      });
    }

    const formattedButtons = buildNativeFlowButtons(protoMod, buttonList);

    const interactiveMessage = protoMod.Message.InteractiveMessage.create({
      header: headerObj || undefined,
      body: protoMod.Message.InteractiveMessage.Body.create({ text: contentText }),
      footer: footer ? protoMod.Message.InteractiveMessage.Footer.create({ text: footer }) : undefined,
      nativeFlowMessage: protoMod.Message.InteractiveMessage.NativeFlowMessage.create({
        buttons: formattedButtons,
        messageParamsJson: '',
      }),
      contextInfo: {
        ...(options.contextInfo || {}),
        mentionedJid: Array.isArray(options.mentions) ? options.mentions : [],
      },
    });

    const userJid = sock.user?.id
      ? sock.user.id.includes(':')
        ? `${sock.user.id.split(':')[0]}@s.whatsapp.net`
        : sock.user.id
      : undefined;

    const message = generateWAMessageFromContent(
      jid,
      {
        viewOnceMessage: {
          message: {
            messageContextInfo: {
              deviceListMetadata: {},
              deviceListMetadataVersion: 2,
            },
            interactiveMessage,
          },
        },
      },
      {
        quoted: (quoted && (quoted as any).message) ? quoted : undefined,
        userJid,
      },
    );

    await sock.relayMessage(jid, message.message, { messageId: message.key.id });
    return message;
  } catch {
    // Fallback: send as plain text
    return sock.sendMessage(jid, { text: contentText }, { quoted: quoted as any });
  }
}
