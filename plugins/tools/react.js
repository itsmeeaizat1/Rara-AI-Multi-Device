// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
// Plugin .linkreact — react emoji ke pesan WA manapun via link (port engine lama reaction.js)
import { raraGuide, raraError, raraWrap } from "../../src/lib/rara-menu-style.js";

const pluginConfig = {
  name: "react",
  alias: ["linkreact", "reactlink"],
  category: "tools",
  description: "Kirim reaksi emoji ke pesan WA manapun lewat link pesan",
  usage: ".linkreact <link> <emoji>",
  example: ".linkreact <link> 👍",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: true,
  cooldown: 10,
  energi: 0,
  isEnabled: true,
};

async function handler(m, { sock, config: botConfig }) {
  const prefix = botConfig.command?.prefix || ".";
  try {
    await m.react("🧠");
    const raw = (m.text || "").replace(new RegExp("^" + prefix + "react\\s*", "i"), "").trim();
    const parts = raw.split(/\s+/);
    const link = parts[0] || "";
    const emoji = parts[1] || "";
    if (!link || !emoji) {
      await m.react("🐣");
      await m.reply(raraGuide(
        "react",
        "Kirim reaksi emoji ke pesan WhatsApp manapun lewat link pesannya (port engine lama).",
        prefix + "react https://chat.whatsapp.com/.... 👍",
        "Ambil link pesan: reply pesan lalu pilih share/link. Emoji reaksi WA standard."
      ));
      return { handled: true };
    }
    const res = await fetch("https://reaction-whatsapp.edgeone.dev/react", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: "Bearer 9J88DPLJ" },
      body: JSON.stringify({ link, emoji }),
      signal: AbortSignal.timeout(60000),
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok) {
      await m.react("⚡");
      await m.reply(raraWrap("React", "Reaksi " + emoji + " udah dikirim ke link pesan itu."));
    } else {
      await m.react("❌");
      await m.reply(raraError("React", "Gagal: " + JSON.stringify(data).slice(0, 120)));
    }
  } catch (error) {
    console.error("[linkreact]:", error.message);
    await m.react("❌");
    await m.reply(raraError("React", "Gagal: " + String(error.message).slice(0, 120)));
  }
  return { handled: true };
}

export { pluginConfig as config, handler }
