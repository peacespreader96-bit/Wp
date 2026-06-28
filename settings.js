import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configure the cookies file location here. Relative paths are resolved
// against the project root once, below, so every command can simply use
// settings.cookiesPath as-is without re-resolving it itself.
const COOKIES_PATH = './cookies.txt';

/**
 * Global bot configuration.
 * Edit the values below — no other file needs to change.
 */
export default {
  // Display name for the bot. Used only for logging/branding.
  botName: 'WhatsApp Bot',

  // Owner's WhatsApp number — digits only, no "+" and no spaces.
  // Example: country code 91, number 9876543210 -> "919876543210"
  ownerNumber: '916360814849',

  // Absolute path to the Instagram cookies file (Netscape format).
  // Created/updated via .setcookie, removed via .clearcookie.
  cookiesPath: path.isAbsolute(COOKIES_PATH) ? COOKIES_PATH : path.join(__dirname, COOKIES_PATH),
};
