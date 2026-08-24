// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import axios from "axios";
import { claraWrap, claraLine } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "sunnah",
  alias: ["sunnah", "sunnah2", "hadithv2"],
  category: "islamic",
  description: "Sunnah - Hadith via official sunnah.com API (requires API key)",
  usage: ".sunnah <command> [args]",
  example: ".sunnah list",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 10,
  energi: 2,
  isEnabled: true,
};

const API_BASE = "https://api.sunnah.com/v1";
const SUNNAH_API_KEY = process.env.SUNNAH_API_KEY || "";

function hasKey() {
  return SUNNAH_API_KEY && SUNNAH_API_KEY.length > 5;
}

async function apiGet(endpoint) {
  const res = await axios.get(`${API_BASE}${endpoint}`, {
    timeout: 20000,
    validateStatus: () => true,
    headers: {
      "X-API-Key": SUNNAH_API_KEY,
      "Accept": "application/json",
    },
  });
  return res;
}

async function handler(m, { sock, args }) {
  const cmd = (args[0] || "").toLowerCase();
  const cmdArgs = args.slice(1);

  if (!cmd || cmd === "help" || cmd === "menu") {
    let txt = `Sunnah (sunnah.com API)\n\n`;
    txt += `API Key: ${hasKey() ? "ON" : "OFF (no key)"}\n`;
    txt += `Official sunnah.com hadith database\n\n`;
    if (!hasKey()) {
      txt += `_Butuh API key! Request di:_\nhttps://github.com/sunnah-com/api/issues\n\n`;
    }
    txt += `Perintah:\n`;
    txt += `1. \`${m.prefix}sunnah list\` - Daftar koleksi\n`;
    txt += `2. \`${m.prefix}sunnah <collection>\` - Detail koleksi\n`;
    txt += `3. \`${m.prefix}sunnah books <collection>\` - Daftar buku\n`;
    txt += `4. \`${m.prefix}sunnah book <collection> <nomor>\` - Detail buku\n`;
    txt += `5. \`${m.prefix}sunnah chapters <collection> <book>\` - Daftar bab\n`;
    txt += `6. \`${m.prefix}sunnah bookhadiths <collection> <book> [hal]\` - Hadith per buku\n`;
    txt += `7. \`${m.prefix}sunnah hadith <collection> <nomor>\` - Hadith spesifik\n`;
    txt += `8. \`${m.prefix}sunnah setkey <key>\` - Set API key (owner)\n\n`;
    txt += `Contoh:\n`;
    txt += `\`${m.prefix}sunnah books bukhari\`\n`;
    txt += `\`${m.prefix}sunnah hadith bukhari 1\``;
    return await m.reply( txt, { commandName: "sunnah" });
  }

  if (!hasKey()) {
    return m.reply(`Sunnah.com API butuh API key!\n\nRequest di: https://github.com/sunnah-com/api/issues\n\nAtau gunakan \`${m.prefix}ummah\` (UmmahAPI, free, no key) untuk 36,000+ hadiths.`);
  }

  await m.react("🕒");

  try {
    // === SET API KEY (owner only) ===
    if (cmd === "setkey" || cmd === "setapi") {
      if (!m.isOwner) {
        return m.reply(claraWrap("Sunnah", "Hanya owner yang bisa set API key!"));
      }
      const key = cmdArgs[0];
      if (!key) return m.reply(claraWrap("Sunnah", "Masukkan API key!\n\nContoh: `.sunnah setkey YOUR_KEY`"));
      await m.reply(claraWrap("Sunnah", `API key diterima! Set environment variable:\n\nSUNNAH_API_KEY=${key}\n\nDi Pterodactyl, tambahkan di server settings.`));
      await m.react("✅");
    }

    // === LIST COLLECTIONS ===
    else if (cmd === "list" || cmd === "collections" || cmd === "koleksi") {
      const res = await apiGet(`/collections?limit=50`);
      if (res.status !== 200 || !res.data?.data) throw new Error("Gagal mengambil daftar koleksi");

      const collections = res.data.data;
      let txt = `Koleksi Hadith (sunnah.com)\n\n`;
      for (let i = 0; i < collections.length; i++) {
        const c = collections[i];
        txt += `${i + 1}. ${c.name || "?"}\n`;
        if (c.hasBooks) txt += `   Has books\n`;
        if (c.hasChapters) txt += `   Has chapters\n`;
        txt += `   \`${m.prefix}sunnah books ${c.name}\`\n\n`;
      }
      await m.reply(txt);
      await m.react("✅");
    }

    // === COLLECTION DETAIL ===
    else if (cmd === "collection" || cmd === "detail") {
      const collection = cmdArgs[0]?.toLowerCase();
      if (!collection) return m.reply(claraWrap("Sunnah", "Masukkan nama koleksi!\n\nContoh: `.sunnah collection bukhari`"));

      const res = await apiGet(`/collections/${collection}`);
      if (res.status !== 200 || !res.data) throw new Error("Koleksi tidak ditemukan");

      const c = res.data;
      let txt = `${c.name || collection}\n\n`;
      if (c.title) txt += `Title: ${c.title}\n`;
      if (c.author) txt += `Author: ${c.author}\n`;
      if (c.description) txt += `Description: ${c.description.slice(0, 200)}...\n`;
      if (c.hasBooks) txt += `Books: Available\n`;
      if (c.hasChapters) txt += `Chapters: Available\n`;
      txt += `\n\`${m.prefix}sunnah books ${collection}\``;
      await m.reply(txt);
      await m.react("✅");
    }

    // === BOOKS of a collection ===
    else if (cmd === "books" || cmd === "buku") {
      const collection = cmdArgs[0]?.toLowerCase();
      if (!collection) return m.reply(claraWrap("Sunnah", "Masukkan nama koleksi!\n\nContoh: `.sunnah books bukhari`"));

      const res = await apiGet(`/collections/${collection}/books?limit=50`);
      if (res.status !== 200 || !res.data?.data) throw new Error("Gagal mengambil daftar buku");

      const books = res.data.data;
      let txt = `Buku: ${collection}\n\n`;
      for (let i = 0; i < Math.min(books.length, 20); i++) {
        const b = books[i];
        txt += `${b.bookNumber || i + 1}. ${b.bookName || "?"}\n`;
        if (b.hadithCount) txt += `   ${b.hadithCount} hadith\n`;
        txt += `   \`${m.prefix}sunnah bookhadiths ${collection} ${b.bookNumber}\`\n\n`;
      }
      if (books.length > 20) txt += `...dan ${books.length - 20} buku lainnya.`;
      await m.reply(txt);
      await m.react("✅");
    }

    // === BOOK DETAIL ===
    else if (cmd === "book") {
      const collection = cmdArgs[0]?.toLowerCase();
      const bookNumber = cmdArgs[1];
      if (!collection || !bookNumber) return m.reply(claraWrap("sunnah", "Format salah!\n\nContoh: `.sunnah book bukhari 1`"));

      const res = await apiGet(`/collections/${collection}/books/${bookNumber}`);
      if (res.status !== 200 || !res.data) throw new Error("Buku tidak ditemukan");

      const b = res.data;
      let txt = `Buku ${bookNumber}: ${b.bookName || "?"}\n\n`;
      if (b.bookName) txt += `Name: ${b.bookName}\n`;
      if (b.bookNumber) txt += `Number: ${b.bookNumber}\n`;
      if (b.hadithCount) txt += `Hadiths: ${b.hadithCount}\n`;
      txt += `\n\`${m.prefix}sunnah bookhadiths ${collection} ${bookNumber}\`\n`;
      txt += `\`${m.prefix}sunnah chapters ${collection} ${bookNumber}\``;
      await m.reply(txt);
      await m.react("✅");
    }

    // === CHAPTERS of a book ===
    else if (cmd === "chapters" || cmd === "bab") {
      const collection = cmdArgs[0]?.toLowerCase();
      const bookNumber = cmdArgs[1];
      if (!collection || !bookNumber) return m.reply(claraWrap("sunnah", "Format salah!\n\nContoh: `.sunnah chapters bukhari 1`"));

      const res = await apiGet(`/collections/${collection}/books/${bookNumber}/chapters?limit=50`);
      if (res.status !== 200 || !res.data?.data) throw new Error("Gagal mengambil daftar bab");

      const chapters = res.data.data;
      let txt = `Bab: ${collection} - Buku ${bookNumber}\n\n`;
      for (let i = 0; i < Math.min(chapters.length, 20); i++) {
        const ch = chapters[i];
        txt += `${ch.chapterId || i + 1}. ${ch.chapterName || "?"}\n`;
        if (ch.english?.chapterTitle) txt += `   EN: ${ch.english.chapterTitle}\n`;
        txt += `\n`;
      }
      if (chapters.length > 20) txt += `...dan ${chapters.length - 20} bab lainnya.`;
      await m.reply(txt);
      await m.react("✅");
    }

    // === HADITHS of a book (with pagination) ===
    else if (cmd === "bookhadiths" || cmd === "bookhadith") {
      const collection = cmdArgs[0]?.toLowerCase();
      const bookNumber = cmdArgs[1];
      const page = parseInt(cmdArgs[2]) || 1;
      if (!collection || !bookNumber) return m.reply(claraWrap("sunnah", "Format salah!\n\nContoh: `.sunnah bookhadiths bukhari 1`"));

      const res = await apiGet(`/collections/${collection}/books/${bookNumber}/hadiths?limit=10&page=${page}`);
      if (res.status !== 200 || !res.data?.data) throw new Error("Gagal mengambil hadith");

      const hadiths = res.data.data;
      let txt = `Hadith: ${collection} - Buku ${bookNumber}\n`;
      txt += `Halaman ${page}\n\n`;

      for (let i = 0; i < hadiths.length; i++) {
        const h = hadiths[i];
        txt += `${h.hadithNumber || "?"}. `;
        if (h.english?.text) txt += `${h.english.text.slice(0, 200)}...\n`;
        if (h.arabic?.text) txt += `AR: ${h.arabic.text.slice(0, 100)}...\n`;
        if (h.english?.grade) txt += `Grade: ${h.english.grade}\n`;
        txt += `\n`;
      }

      txt += `Halaman ${page} | Next: \`${m.prefix}sunnah bookhadiths ${collection} ${bookNumber} ${page + 1}\``;
      await m.reply(txt);
      await m.react("✅");
    }

    // === SPECIFIC HADITH ===
    else if (cmd === "hadith" || cmd === "h") {
      const collection = cmdArgs[0]?.toLowerCase();
      const number = parseInt(cmdArgs[1]) || 1;
      if (!collection) return m.reply(claraWrap("Sunnah", "Masukkan koleksi dan nomor!\n\nContoh: `.sunnah hadith bukhari 1`"));

      const res = await apiGet(`/collections/${collection}/hadiths/${number}`);
      if (res.status !== 200 || !res.data) throw new Error(`Gagal mengambil ${collection} #${number}`);

      const h = res.data;
      let txt = `${h.collection?.name || collection}\n\n`;
      txt += `Hadith No. ${h.hadithNumber || number}\n`;
      if (h.book?.bookName) txt += `Book: ${h.book.bookName}\n`;
      if (h.chapter?.chapterName) txt += `Chapter: ${h.chapter.chapterName}\n`;
      if (h.english?.grade) txt += `Grade: ${h.english.grade}\n\n`;
      if (h.arabic?.text) txt += `Arabic:\n${h.arabic.text}\n\n`;
      if (h.english?.text) txt += `English:\n${h.english.text}\n`;
      txt += `\n\`${m.prefix}sunnah hadith ${collection} ${number - 1}\` <- -> \`${m.prefix}sunnah hadith ${collection} ${number + 1}\``;
      await m.reply(txt);
      await m.react("✅");
    }

    else {
      await m.reply(`Perintah tidak ditemukan!\n\nKetik \`${m.prefix}sunnah help\` untuk melihat semua perintah.`);
    }
  } catch (e) {
    console.error("[SUNNAH] Error:", e.message);
    await m.reply(claraWrap("sunnah", `Gagal mengambil hadith!\n\nError: ${e.message}`));
  }
}

export { pluginConfig as config, handler };
