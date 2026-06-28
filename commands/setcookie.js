import fs from 'fs/promises';
import { downloadMediaMessage } from '@whiskeysockets/baileys';

/**
 * .setcookie
 * Saves Instagram cookies from attached cookies.txt document
 * or from raw cookie text after command.
 */
export default async function setcookie(sock, msg, args, ctx) {
  const jid = msg.key.remoteJid;
  const cookiesPath = ctx.settings.cookiesPath;
  const documentMessage = msg.message?.documentMessage;

  try {
    if (documentMessage) {
      const buffer = await downloadMediaMessage(msg, 'buffer', {});
      if (!buffer || buffer.length === 0) {
        throw new Error('Downloaded document was empty.');
      }

      await fs.writeFile(cookiesPath, buffer);
    } else if (args.trim().length > 0) {
      await fs.writeFile(cookiesPath, `${args.trim()}\n`, 'utf-8');
    } else {
      await sock.sendMessage(
        jid,
        {
          text:
            'Please attach a cookies.txt file with caption .setcookie, ' +
            'or send .setcookie followed by the cookie text.',
        },
        { quoted: msg }
      );
      return;
    }

    await sock.sendMessage(jid, { text: '✅ Instagram cookies saved successfully.' }, { quoted: msg });
  } catch (err) {
    console.error('setcookie error:', err);
    await sock.sendMessage(jid, { text: '❌ Failed to save cookies. Please try again.' }, { quoted: msg });
  }
}