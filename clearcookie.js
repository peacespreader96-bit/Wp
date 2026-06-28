import fs from 'fs/promises';

/**
 * .clearcookie
 * Deletes the stored Instagram cookies file.
 */
export default async function clearcookie(sock, msg, args, ctx) {
  const jid = msg.key.remoteJid;
  const cookiesPath = ctx.settings.cookiesPath;

  try {
    await fs.unlink(cookiesPath);
    await sock.sendMessage(jid, { text: '✅ Instagram cookies have been removed.' }, { quoted: msg });
  } catch (err) {
    if (err.code === 'ENOENT') {
      await sock.sendMessage(jid, { text: 'No cookies file was found to delete.' }, { quoted: msg });
    } else {
      console.error('clearcookie error:', err);
      await sock.sendMessage(jid, { text: '❌ Failed to delete cookies file.' }, { quoted: msg });
    }
  }
}