// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// playdouyin.js — .playdouyin: video/foto slide Douyin (TikTok China).
// DOUYIN MURNI — gak nyampur TikTok (request owner "jlo douyin .douyin g
// nyampur sm tiktok"): keyword via Apify douyin search, link via resolver
// douyin. Link tiktok.com DITOLAK (arahin ke .playtiktok/.tiktok).
// Fitur BARU — plugin .tiktok/.douyin lama TIDAK DISENTUH.
//
// Sumber search: Apify actors (vulnv → zen-studio) — Douyin gak ada API
// publik, anti-bot ekstrem. Biaya $0.005/hasil (maks 5/run), cache 30 mnt
// per keyword biar gak double-billing. Douyin sering block beberapa menit
// → run kosong nyaris gratis (actor-start ~$0.0001).

import {
  isDouyinLink,
  isTikTokLink,
  extractUrl,
  searchPlayDouyin,
  resolvePlayDouyin,
  pickRandom,
  pickBestVideoUrl,
} from "../../src/lib/nova-playdouyin.js";
import { claraWrap, novaGagal, novaGangguan } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "playdouyin",
  alias: ["douyinplay", "playdouy", "douyinsearch", "dyplay", "pldouyin"],
  category: "search",
  description: "Video/foto slide Douyin (TikTok China) via keyword atau link douyin",
  usage: ".playdouyin <keyword/link douyin>",
  example: ".playdouyin kucing lucu / .playdouyin https://v.douyin.com/xxx",
  cooldown: 15,
  energi: 1,
  isEnabled: true,
};

async function handler(m, { sock }) {
  const args = m.args || [];
  const arg = args.join(" ").trim();

  try {
    // usage guide
    if (!arg) {
      return m.reply(claraWrap("PlayDouyin", [
        `📌 Cari video/foto slide Douyin (TikTok China):`,
        ``,
        `${m.prefix}playdouyin <keyword> — cari konten douyin`,
        `${m.prefix}playdouyin <link douyin> — resolve tanpa watermark`,
        ``,
        `💡 Contoh:`,
        `${m.prefix}playdouyin kucing lucu`,
        `${m.prefix}playdouyin https://v.douyin.com/xxx`,
        ``,
        `❗ Khusus Douyin — link TikTok pakai ${m.prefix}playtiktok / ${m.prefix}tiktok`,
      ]));
    }

    await m.react("🕒");

    // link TikTok → DITOLAK (pisah total dari TikTok)
    if (isTikTokLink(arg)) {
      await m.react("❌");
      return m.reply(claraWrap("PlayDouyin", [
        `❗ Ini link TikTok — playdouyin hanya untuk Douyin.`,
        ``,
        `TikTok → pakai ${m.prefix}playtiktok atau ${m.prefix}tiktok`,
      ]));
    }

    if (arg.length < 2) {
      await m.react("❌");
      return m.reply(claraWrap("PlayDouyin", [`Keyword minimal 2 huruf.`]));
    }

    const url = /https?:\/\//i.test(arg) ? extractUrl(arg) : null;
    let item = null;
    let source = "";

    if (url) {
      // LINK DOUYIN
      if (!isDouyinLink(url)) {
        await m.react("❌");
        return m.reply(claraWrap("PlayDouyin", [
          `❗ Link harus douyin.com / v.douyin.com / iesdouyin.com.`,
          ``,
          `TikTok → ${m.prefix}playtiktok / ${m.prefix}tiktok`,
        ]));
      }
      const r = await resolvePlayDouyin(url);
      if (!r.item) {
        await m.react("❌");
        return m.reply(claraWrap("PlayDouyin", [`❌ ${r.error || "Link gak bisa diproses."}`]));
      }
      item = r.item;
      source = r.source;
    } else {
      // KEYWORD SEARCH
      const r = await searchPlayDouyin(arg);
      if (r.error || !r.items.length) {
        await m.react("❌");
        return m.reply(claraWrap("PlayDouyin", [
          `❌ ${r.error}`,
          ``,
          `💡 Douyin = TikTok China, sering ngeblok pencarian beberapa menit.`,
          `Coba lagi bentar, atau pakai mode link: ${m.prefix}playdouyin <link douyin>`,
        ]));
      }
      item = pickRandom(r.items);
      source = r.source;
    }

    if (!item) {
      await m.react("❌");
      return m.reply(novaGagal("PlayDouyin"));
    }

    // ── kirim media ──
    const title = (item.title || "").slice(0, 120).replace(/\n+/g, " ").trim() || "Douyin";
    const author = (item.author?.name || item.author?.handle || "").slice(0, 40);
    const stats = item.stats || {};
    const fmt = (n) => (n >= 1000 ? (n / 1000).toFixed(1) + "K" : String(n || 0));

    if (item.type === "photo" && item.images?.length) {
      const cap =
        `📸 Foto Slide Douyin\n\n` +
        `📝 ${title}\n` +
        (author ? `👤 ${author}\n` : "") +
        `🖼️ ${item.images.length} foto\n` +
        (item.link ? `\n🔗 ${item.link}\n` : "") +
        `🔖 Sumber: ${source}`;
      await sock.sendMessage(m.chat, { image: { url: item.images[0] }, caption: cap });
      for (const img of item.images.slice(1, 10)) {
        await new Promise((r) => setTimeout(r, 800));
        await sock.sendMessage(m.chat, { image: { url: img } }).catch(() => {});
      }
    } else {
      const videoUrl = pickBestVideoUrl(item);
      if (!videoUrl) {
        await m.react("❌");
        return m.reply(claraWrap("PlayDouyin", [`❌ Link media gak ketemu.`]));
      }
      const cap =
        `🎬 Video Douyin\n\n` +
        `📝 ${title}\n` +
        (author ? `👤 ${author}\n` : "") +
        (stats.plays || stats.likes
          ? `👀 ${fmt(stats.plays)} | ❤️ ${fmt(stats.likes)} | 💬 ${fmt(stats.comments)} | ↗️ ${fmt(stats.shares)}\n`
          : "") +
        `\n🎥 No Watermark\n` +
        (item.link ? `🔗 ${item.link}\n` : "") +
        `🔖 Sumber: ${source}`;
      await sock.sendMessage(m.chat, { video: { url: videoUrl }, caption: cap });
    }

    await m.react("🐣");
  } catch (err) {
    console.error("[PlayDouyin]", err.message || err);
    await m.react("❌");
    return m.reply(novaGangguan("PlayDouyin"));
  }
}

export { pluginConfig as config, handler };
