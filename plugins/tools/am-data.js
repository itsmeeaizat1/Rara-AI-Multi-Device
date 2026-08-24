// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { claraWrap } from "../../src/lib/nova-menu-style.js";
import te from "../../src/lib/nova-error.js";
import config from "../../config.js";

const pluginConfig = {
  name: "am-data",
  alias: ["alightmotion-data"],
  category: "tools",
  description: "Lihat data project Alight Motion dari link share",
  usage: ".am-data <url>",
  example: ".am-data https://alightcreative.com/am/share/...",
  cooldown: 15,
  energi: 1,
  isEnabled: true,
};

const API = "https://api.obscuraworks.org/api/tools/amdata";
const KEY = config.APIkey.obscura;

function fmtSize(b) {
  if (!b) return "-";
  if (b < 1024) return b + " B";
  if (b < 1048576) return (b / 1024).toFixed(1) + " KB";
  return (b / 1048576).toFixed(1) + " MB";
}

function fmtDate(ts) {
  if (!ts?._seconds) return "-";
  return new Date(ts._seconds * 1000).toLocaleDateString("id-ID", {
    dateStyle: "long",
  });
}

async function handler(m, { sock }) {
  const url = m.text?.trim();
  if (!url || !url.includes("alightcreative.com")) {
    return m.reply(
      `📱 *ALIGHT MOTION DATA*\n\n` +
        `- Lihat info project AM dari link share\n` +
        `- Masukkan URL share Alight Motion\n\n` +
        `\`${m.prefix}am-data <url>\``,
    );
  }

  m.react("🕒");

  try {
    const r = await fetch(API, {
      method: "POST",
      headers: {
        Accept: "application/json, image/*, audio/*, video/*",
        Authorization: `Bearer ${KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ url }),
    });

    const res = await r.json();
    const d = res?.data;
    const info = d?.info;

    if (!res?.status || !info) {
      return m.reply(
        `📱 *GAGAL MEMBACA DATA*\n\n` + `- Pastikan URL share valid`,
      );
    }

    m.react("🐣");

    const projects =
      info.projects
        ?.map((p) => `  - *${p.title}* (${p.type}, ${fmtSize(p.size)})`)
        .join("\n") || "  - Tidak ada";

    const effects = info.requiredEffects?.length
      ? info.requiredEffects.slice(0, 8).join(", ") +
        (info.requiredEffects.length > 8
          ? `, +${info.requiredEffects.length - 8} lagi`
          : "")
      : "-";

    let msg = claraWrap("Alight Motion Data", [`*Judul* → ${info.title || "-"}`, `*Ukuran* → ${fmtSize(info.size)}`, `*Download* → ${info.downloads ?? 0}x`, `*Likes* → ${info.likes ?? 0}`, `*Versi* → \`${info.amVersionString || "-"}\``, `*Platform* → ${info.amPlatform || "-"}`, `*Max FF* → v${info.maxFFVer || "-"}`, `*Tanggal* → ${fmtDate(info.shareDate)}`, ``, `🎬 *Project*`, projects, ``, `✨ *Effects* → ${effects}`].join("\n"));

    if (info.largeThumbUrl) {
      await sock.sendMedia(m.chat, info.largeThumbUrl, null, m, {
        type: "image",
        caption: msg,
      });
    } else {
      await m.reply(claraWrap("am-data", msg));
    }
  } catch (e) {
    console.log(e);
    m.reply(claraWrap("am-data", te(m.prefix, m.command, m.pushName), "error"));
  }
}

export { pluginConfig as config, handler };
