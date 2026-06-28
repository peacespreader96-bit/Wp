import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import fsp from 'fs/promises';
import path from 'path';
import crypto from 'crypto';

const execAsync = promisify(exec);

// Strict allowlist: only well-formed instagram.com post/reel/tv links, with
// only characters that are safe to interpolate into a shell command. This is
// what actually prevents command injection — anything that doesn't match is
// rejected before it ever reaches exec().
const INSTAGRAM_URL_REGEX =
  /^https?:\/\/(www\.)?instagram\.com\/(p|reel|reels|tv)\/[A-Za-z0-9_-]+\/?(\?[A-Za-z0-9=&_%.~-]*)?$/i;

const VIDEO_EXTENSIONS = new Set(['mp4', 'mov', 'webm', 'mkv']);
const IMAGE_EXTENSIONS = new Set(['jpg', 'jpeg', 'png', 'webp']);
const MAX_MEDIA_ITEMS = 10;
const DOWNLOAD_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes
const MAX_BUFFER_BYTES = 20 * 1024 * 1024;

async function cleanupFiles(filePaths) {
  await Promise.all(filePaths.map((filePath) => fsp.unlink(filePath).catch(() => {})));
}

/**
 * .ig <url> / .instagram <url>
 * Downloads every media item from an Instagram post or reel (including
 * carousels and mixed image/video posts) and sends each item back.
 */
export default async function instagram(sock, msg, args, ctx) {
  const jid = msg.key.remoteJid;
  const url = args.trim();
  const tempDir = ctx.tempDir;

  if (!url) {
    await sock.sendMessage(
      jid,
      { text: 'Please provide an Instagram link.\nExample: .ig https://www.instagram.com/p/xxxxxxxxx/' },
      { quoted: msg }
    );
    return;
  }

  if (!INSTAGRAM_URL_REGEX.test(url)) {
    await sock.sendMessage(
      jid,
      { text: 'Invalid Instagram URL. Please send a valid post, reel, or IGTV link.' },
      { quoted: msg }
    );
    return;
  }

  const cookiesPath = ctx.settings.cookiesPath;

  if (!fs.existsSync(cookiesPath)) {
    await sock.sendMessage(
      jid,
      { text: 'Instagram cookies are not configured.\nAsk the bot owner to use .setcookie.' },
      { quoted: msg }
    );
    return;
  }

  await sock.sendMessage(jid, { text: '⏳ Downloading media, please wait...' }, { quoted: msg });

  // Unique prefix per request — keeps concurrent downloads from colliding
  // and lets us reliably identify exactly which files belong to this
  // request afterwards, instead of relying solely on scraping stdout.
  const requestId = crypto.randomBytes(6).toString('hex');
  const outputTemplate = path.join(tempDir, `${requestId}_%(id)s_%(autonumber)s.%(ext)s`);
  const command =
    `yt-dlp --cookies "${cookiesPath}" --no-playlist ` +
    `--format "bestvideo+bestaudio[ext=m4a]/best[ext=mp4]/best" ` +
    `--output "${outputTemplate}" "${url}"`;

  let downloadedFiles = [];

  try {
    await execAsync(command, { timeout: DOWNLOAD_TIMEOUT_MS, maxBuffer: MAX_BUFFER_BYTES });

    const allFiles = await fsp.readdir(tempDir);
    downloadedFiles = allFiles
      .filter((name) => name.startsWith(`${requestId}_`))
      .sort()
      .map((name) => path.join(tempDir, name));
  } catch (err) {
    await cleanupFiles(downloadedFiles);

    const stderrText = String(err?.stderr || err?.message || '');

    if (err?.code === 127 || /command not found|yt-dlp.*not found|ENOENT/i.test(stderrText)) {
      await sock.sendMessage(
        jid,
        { text: 'yt-dlp is not installed on the server. Please ask the bot owner to install it.' },
        { quoted: msg }
      );
      return;
    }

    if (err?.killed || err?.signal === 'SIGTERM') {
      await sock.sendMessage(jid, { text: 'Download timed out. Please try again later.' }, { quoted: msg });
      return;
    }

    await sock.sendMessage(
      jid,
      { text: 'Failed to download media. The link may be private, deleted, or your cookies may have expired.' },
      { quoted: msg }
    );
    return;
  }

  if (downloadedFiles.length === 0) {
    await sock.sendMessage(jid, { text: 'No media could be found at that link.' }, { quoted: msg });
    return;
  }

  const itemsToSend = downloadedFiles.slice(0, MAX_MEDIA_ITEMS);

  try {
    for (const filePath of itemsToSend) {
      const ext = path.extname(filePath).slice(1).toLowerCase();

      try {
        const buffer = await fsp.readFile(filePath);

        if (VIDEO_EXTENSIONS.has(ext)) {
          await sock.sendMessage(jid, { video: buffer }, { quoted: msg });
        } else if (IMAGE_EXTENSIONS.has(ext)) {
          await sock.sendMessage(jid, { image: buffer }, { quoted: msg });
        }
        // Unknown extensions are skipped silently; they are still removed
        // by the cleanup pass below.
      } finally {
        await fsp.unlink(filePath).catch(() => {});
      }
    }
  } finally {
    // Catches any leftover files beyond MAX_MEDIA_ITEMS so temp/ never
    // accumulates unsent carousel items.
    await cleanupFiles(downloadedFiles);
  }
}
