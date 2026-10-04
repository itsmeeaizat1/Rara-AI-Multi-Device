// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
import { raraWrap } from "../../src/lib/rara-menu-style.js";
import te from "../../src/lib/rara-error.js";
import config from "../../config.js";
import { mediaResultCard, probeBuffer, probeMedia } from "../../src/lib/rara-media-result.js";

const pluginConfig = {
  name: "am-data",
  alias: ["am-data", "am"],
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
      `📱 *alight motion data*\n\n` +
        `- Lihat info project AM dari link share\n` +
        `- Masukkan URL share Alight Motion\n\n` +
        `\`${m.prefix}am-data <url>\``,
    );
  }
  try {
    await m.react("🕒");
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
        `📱 *gagal membaca data*\n\n` + `- Pastikan URL share valid`,
      );
    }
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

    let msg = raraWrap("Alight Motion Data", [`*judul* → ${info.title || "-"}`, `*ukuran* → ${fmtSize(info.size)}`, `*download* → ${info.downloads ?? 0}x`, `*likes* → ${info.likes ?? 0}`, `*versi* → \`${info.amVersionString || "-"}\``, `*platform* → ${info.amPlatform || "-"}`, `*max ff* → v${info.maxFFVer || "-"}`, `*tanggal* → ${fmtDate(info.shareDate)}`, ``, `🎬 *project*`, projects, ``, `*effects* → ${effects}`].join("\n"));

    if (info.largeThumbUrl) {
      let card = "";
      try {
        const pInfo = await probeMedia(info.largeThumbUrl);
        card = mediaResultCard({
          header: "am-data",
          type: "gambar",
          request: [["URL", url.length > 80 ? url.slice(0, 80) : url]],
          size: pInfo.size,
          mime: pInfo.mime,
          width: pInfo.width,
          height: pInfo.height,
        });
      } catch {}
      await sock.sendMedia(m.chat, info.largeThumbUrl, card || msg, m, {
        type: "image",
        caption: card || msg,
      });
    } else {
      await m.react("🐣");
      await m.reply(msg, "am-data");
    }
  } catch (e) {
    await m.react("❌");
    console.log(e);
    m.reply(raraWrap("am-data", te(m.prefix, m.command, m.pushName), "error"));
  }
}

export { pluginConfig as config, handler };
