// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { sendReplyWithNav } from "../../src/lib/nova-nav-buttons.js";
import { claraWrap } from "../../src/lib/nova-menu-style.js";
import config from "../../config.js";

const pluginConfig = {
  name: "linode",
  alias: ["server", "vpsinfo", "cloud"],
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

    let text = `❀°˖✧◝(⁰▿⁰)◜✧˖°❀ Server Info
┊
  ┊  ➶ *OS:* ${osName}
  ┊  ➶ *Host:* ${hostname}
  ┊  ➶ *Uptime:* ${uptime}
  ┊  ➶ *CPU:* ${cpu}
  ┊  ➶ *RAM:* ${ram}
❀⋆｡˚ Nova AI WhatsApp Bot ˚｡⋆❀

Ketik ${prefix}menu untuk kembali`;

    await m.reply(claraWrap("linode", text));
  } catch (error) {
    const prefix = botConfig.command?.prefix || ".";
    let text = `❀°˖✧◝(⁰▿⁰)◜✧˖°❀ Server Error
┊
  ┊  ➶ *Status:* Gagal
  ┊  ➶ *Alasan:* ${error.message}
❀⋆｡˚ Nova AI WhatsApp Bot ˚｡⋆❀

Coba lagi nanti atau hubungi owner`;

    await sendReplyWithNav(sock, m, text, "linode");
  }
}

export { pluginConfig as config, handler };
