/**
 * .ping
 * Replies with round-trip latency and human-readable uptime.
 */
export default async function ping(sock, msg, args, ctx) {
  const jid = msg.key.remoteJid;
  const start = Date.now();

  // Initial send round-trip is used as the latency measurement.
  const sent = await sock.sendMessage(jid, { text: 'Pong!' }, { quoted: msg });
  const latency = Date.now() - start;
  const uptime = ctx.formatUptime(Date.now() - ctx.startTime);

  const report = `Pong!\n\nLatency: ${latency}ms\nUptime: ${uptime}`;

  // Edit the message in place rather than sending a second one.
  await sock.sendMessage(jid, { text: report, edit: sent.key });
}
