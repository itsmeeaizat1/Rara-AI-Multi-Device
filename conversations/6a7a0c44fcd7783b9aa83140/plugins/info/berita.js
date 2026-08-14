import { sendReplyWithNav } from "../../src/lib/nova-nav-buttons.js";

import { alyaHeader,
    separator,
  tipText,  claraWrap } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "berita",
  alias: ["berita", "newsinfo", "infonews"],
  category: "info",
  description: "Cari berita terbaru",
  usage: ".berita <query>",
  example: ".berita teknologi",
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
    const query = m.text?.trim();

    if (!query) {
      const text =
        claraWrap("Cara Pakai", [`◦ Penggunaan: *${prefix}berita <query>*`,
          `◦ Contoh: *${prefix}berita teknologi*`].join("\n")) +
        "\n" +
        tipText(`Ketik ${prefix}menu untuk kembali`);

      await sendReplyWithNav(sock, m, text, "berita");
      return { handled: true };
    }

    const apiUrl = `https://api.zeks.xyz/api/news?q=${encodeURIComponent(query)}`;
    let news = [];

    try {
      const res = await fetch(apiUrl);
      const json = await res.json();
      if (json.status && Array.isArray(json.result)) {
        news = json.result.map((item) => ({
          title: item.title || "Tanpa judul",
          link: item.link || item.url || "-",
        }));
      }
    } catch {
      news = [];
    }

    if (!news.length) {
      const text =
        claraWrap("Berita", [`◦ Query: *${query}*`,
          "◦ Status: *Tidak ada berita ditemukan*"].join("\n")) +
        "\n" +
        tipText(`Ketik ${prefix}berita <query> untuk cari berita lain`) +
        "\n" +
        tipText(`Ketik ${prefix}menu untuk kembali ke menu utama`);

      await m.reply(claraWrap("berita", text));
      return { handled: true };
    }

    const items = news.slice(0, 8).map((n, i) => `${i + 1}. ${n.title}\n   ${n.link}`);

    const text =
      claraWrap("Berita", "📰") +
      "\n\n" +
      claraWrap("ʜᴇᴀᴅʟɪɴᴇ", items) +
      "\n\n" +
      separator("━", 22) +
      "\n" +
      tipText(`Ketik ${prefix}berita <query> untuk cari berita lain`) +
      "\n" +
      tipText(`Ketik ${prefix}menu untuk kembali ke menu utama`);

    await m.reply(claraWrap("berita", text));
  } catch (error) {
    const prefix = botConfig.command?.prefix || ".";
    const text =
      claraWrap("Gagal", [`◦ Status: *Gagal*`,
        `◦ Alasan: *${error.message}*`].join("\n")) +
      "\n" +
      tipText(`Coba lagi nanti atau hubungi owner`);

    await m.reply(claraWrap("berita", text));
  }

  return { handled: true };
}

export { pluginConfig as config, handler }
