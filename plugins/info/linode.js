// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { novaError, novaEmpty, novaGuide, novaNoInput, claraWrap } from "../../src/lib/nova-menu-style.js";
import config from "../../config.js";

const pluginConfig = {
  name: "linode",
  alias: ["linode"],
  category: "info",
  description: "Cek status server/info VPS lokal",
  usage: ".linode",
  example: ".linode",
  isOwner: false,
  isPremium: false,
  isGroup: true,
  isPrivate: false,
  cooldown: 10,
  energi: 0,
  isEnabled: true,
};

async function handler(m, { sock, config: botConfig }) {
  try {
    const prefix = botConfig.command?.prefix || ".";

    let osName = process.platform || "linux";
    let hostname = process.env.HOSTNAME || "localhost";
    let uptime = process.uptime ? `${Math.floor(process.uptime / 60)}m` : "-";
    let cpu = "N/A";
    let ram = "N/A";

    try {
      const mem = process.memoryUsage?.();
      if (mem) ram = `${Math.round(mem.rss / 1024 / 1024)}MB`;
      const cpus = await import("os").then((os) => os.default.cpus());
      if (cpus && cpus.length > 0) {
        cpu = `${cpus.length}x ${cpus[0].model.split(" ").slice(0, 3).join(" ")}`;
      }
    } catch (e) { console.error('[linode.js]:', e.message); }

    let text = `╭──「 *Server Info* 」\n│ *OS:* ${osName}
│ *ʜᴏꜱᴛ:* ${hostname}
│ *ᴜᴘᴛɪᴍᴇ:* ${uptime}
│ *ᴄᴘᴜ:* ${cpu}
│ *ʀᴀᴍ:* ${ram}
╰──────────

Ketik ${prefix}menu untuk kembali`;

    await m.reply(claraWrap("linode", text));
  } catch (error) {
    const prefix = botConfig.command?.prefix || ".";
    let text = `╭──「 *Server Error* 」\n│ *Status:* Gagal
│ *ᴀʟᴀꜱᴀɴ:* ${error.message}
╰──────────

Coba lagi ya`;

    await m.reply( text, "linode");
  }
}

export { pluginConfig as config, handler };
