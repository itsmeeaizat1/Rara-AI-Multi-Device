// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import axios from "axios";
import { sendReplyWithNav } from "../../src/lib/nova-nav-buttons.js";
import { claraWrap, claraLine } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "ummah",
  alias: ["ummahv2", "ummahhadith"],
  category: "islamic",
  description: "Ummah Hadith - 36,000+ hadiths dari 10 collections (UmmahAPI, free)",
  usage: ".ummah <command> [args]",
  example: ".ummah random",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 10,
  energi: 2,
  isEnabled: true,
};

const API_BASE = "https://ummahapi.com/api/hadith";

const UMMAH_KEYS = ["bukhari", "muslim", "abudawud", "tirmidhi", "nasai", "ibnmajah", "malik", "nawawi40", "qudsi40", "shahwaliullah40"];

const TOPICS = {
  sholat: ["prayer", "salat", "pray"],
  puasa: ["fasting", "fast", "ramadan"],
  zakat: ["zakat", "charity", "sadaqah", "alms"],
  haji: ["hajj", "pilgrimage", "kaaba"],
  nikah: ["marriage", "nikah", "wife", "husband"],
  sabar: ["patience", "sabr", "perseverance"],
  sedekah: ["charity", "sadaqah", "donation", "giving"],
  ilmu: ["knowledge", "seeking knowledge", "learn"],
  akhlak: ["manner", "character", "akhlak", "behavior"],
  makan: ["food", "eating", "meal"],
  doa: ["supplication", "dua", "invoke"],
  taubat: ["repentance", "repent", "forgiveness", "tawbah"],
  jannah: ["paradise", "jannah", "heaven", "garden"],
  neraka: ["hell", "jahannam", "fire", "punishment"],
  rezeki: ["provision", "rizki", "sustenance"],
  orangtua: ["parents", "mother", "father", "filial"],
  tetangga: ["neighbor", "neighbour"],
};

async function apiGet(endpoint) {
  const res = await axios.get(`${API_BASE}${endpoint}`, {
    timeout: 20000,
    validateStatus: () => true,
    headers: { "User-Agent": "Mozilla/5.0" },
  });
  return res;
}

async function handler(m, { sock, args }) {
  const cmd = (args[0] || "").toLowerCase();
  const cmdArgs = args.slice(1);

  if (!cmd || cmd === "help" || cmd === "menu") {
    let txt = `Ummah Hadith (UmmahAPI)\n\n`;
    txt += `> 36,000+ hadiths dari 10 collections\n`;
    txt += `> Free, no API key required\n\n`;
    txt += `Perintah:\n`;
    txt += `1. \`${m.prefix}ummah daily\` - Hadith hari ini\n`;
    txt += `2. \`${m.prefix}ummah random\` - Hadith random\n`;
    txt += `3. \`${m.prefix}ummah random <collection>\` - Random dari koleksi\n`;
    txt += `4. \`${m.prefix}ummah search <kata>\` - Cari hadith\n`;
    txt += `5. \`${m.prefix}ummah topic <topik>\` - Hadith by topik\n`;
    txt += `6. \`${m.prefix}ummah topics\` - Daftar topik\n`;
    txt += `7. \`${m.prefix}ummah list\` - Daftar koleksi\n`;
    txt += `8. \`${m.prefix}ummah <collection> <nomor>\` - Hadith spesifik\n`;
    txt += `9. \`${m.prefix}ummah grade <collection> <nomor>\` - Hadith + grade\n\n`;
    txt += `Koleksi: ${UMMAH_KEYS.join(", ")}\n\n`;
    txt += `Contoh:\n`;
    txt += `\`${m.prefix}ummah daily\`\n`;
    txt += `\`${m.prefix}ummah topic zakat\`\n`;
    txt += `\`${m.prefix}ummah bukhari 1\``;
    return await sendReplyWithNav(m, sock, txt, { commandName: "ummah" });
  }

  await m.react("🕐");

  try {
    // === DAILY HADITH ===
    if (cmd === "daily" || cmd === "harian" || cmd === "today") {
      const today = new Date();
      const dayOfYear = Math.floor((today - new Date(today.getFullYear(), 0, 0)) / 86400000);
      const collection = UMMAH_KEYS[dayOfYear % UMMAH_KEYS.length];

      const res = await apiGet(`/random?collection=${collection}`);
      if (res.status !== 200 || !res.data?.success) throw new Error("Daily hadith gagal");

      const h = res.data.data;
      let txt = `Hadith Hari Ini\n`;
      txt += `${today.toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}\n\n`;
      txt += `${h.collection_name || collection}\n`;
      txt += `No. ${h.hadithnumber || "?"}\n`;
      if (h.grade) txt += `Grade: ${h.grade}\n\n`;
      if (h.arabic) txt += `${h.arabic}\n\n`;
      if (h.english) txt += `${h.english}\n`;
      txt += `\n> _Hadith ini dipilih otomatis setiap hari_`;

      await m.reply(txt);
      await m.react("✅");
    }

    // === TOPICS LIST ===
    else if (cmd === "topics" || cmd === "topik") {
      let txt = `Daftar Topik Hadith\n\n`;
      let i = 1;
      for (const key of Object.keys(TOPICS)) {
        txt += `${i}. ${key}\n`;
        i++;
      }
      txt += `\nContoh: \`${m.prefix}ummah topic zakat\``;
      await m.reply(txt);
      await m.react("✅");
    }

    // === HADITH BY TOPIC ===
    else if (cmd === "topic" || cmd === "t") {
      const topic = cmdArgs[0]?.toLowerCase();
      if (!topic) return m.reply(claraWrap("Ummah", "Masukkan topik!\n\nKetik `.ummah topics` untuk daftar topik."));

      const keywords = TOPICS[topic];
      if (!keywords) return m.reply(`Topik "${topic}" tidak ditemukan.\n\nKetik \`${m.prefix}ummah topics\` untuk daftar topik.`);

      let allResults = [];
      for (const kw of keywords) {
        const res = await apiGet(`/search?q=${encodeURIComponent(kw)}`);
        if (res.status === 200 && res.data?.success) {
          allResults = allResults.concat(res.data.data?.hadiths || []);
        }
        if (allResults.length >= 5) break;
      }

      const seen = new Set();
      allResults = allResults.filter(h => {
        const id = h.id || `${h.collection}-${h.hadithnumber}`;
        if (seen.has(id)) return false;
        seen.add(id);
        return true;
      });


      let txt = `Hadith Topik: ${topic}\n`;
      txt += `${allResults.length} hadith ditemukan\n\n`;

      for (let i = 0; i < Math.min(allResults.length, 5); i++) {
        const h = allResults[i];
        txt += `${i + 1}. ${h.collection_name || h.collection || "?"} #${h.hadithnumber || "?"}\n`;
        if (h.english) txt += `${h.english.slice(0, 250)}...\n`;
        if (h.grade) txt += `Grade: ${h.grade}\n`;
        txt += `\n`;
      }

      if (allResults.length > 5) txt += `...dan ${allResults.length - 5} hadith lainnya.`;
      await m.reply(txt);
      await m.react("✅");
    }

    // === RANDOM ===
    else if (cmd === "random" || cmd === "rnd" || cmd === "acak") {
      const collection = cmdArgs[0]?.toLowerCase() || "";
      const url = collection ? `/random?collection=${encodeURIComponent(collection)}` : `/random`;

      const res = await apiGet(url);
      if (res.status !== 200 || !res.data?.success) throw new Error("Random gagal");

      const h = res.data.data;
      let txt = `Hadith Random\n\n`;
      txt += `${h.collection_name || h.collection || "?"}\n`;
      txt += `No. ${h.hadithnumber || "?"}\n`;
      if (h.grade) txt += `Grade: ${h.grade}\n\n`;
      if (h.arabic) txt += `${h.arabic}\n\n`;
      if (h.english) txt += `${h.english}\n`;

      await m.reply(txt);
      await m.react("✅");
    }

    // === SEARCH ===
    else if (cmd === "search" || cmd === "cari" || cmd === "s") {
      const query = cmdArgs.join(" ").trim();
      if (!query) return m.reply(claraWrap("Ummah", "Masukkan kata kunci!\n\nContoh: `.ummah search charity`"));

      const res = await apiGet(`/search?q=${encodeURIComponent(query)}`);
      if (res.status !== 200 || !res.data?.success) throw new Error("Search gagal");

      const results = res.data.data?.hadiths || [];

      let txt = `Hasil Pencarian: ${query}\n`;
      txt += `${res.data.data?.total_found || results.length} hadith ditemukan\n\n`;

      for (let i = 0; i < Math.min(results.length, 5); i++) {
        const h = results[i];
        txt += `${i + 1}. ${h.collection_name || h.collection || "?"} #${h.hadithnumber || "?"}\n`;
        if (h.english) txt += `${h.english.slice(0, 200)}...\n`;
        if (h.grade) txt += `Grade: ${h.grade}\n`;
        txt += `\n`;
      }

      if (results.length > 5) txt += `...dan ${results.length - 5} hadith lainnya.`;
      await m.reply(txt);
      await m.react("✅");
    }

    // === GRADE DETAIL ===
    else if (cmd === "grade" || cmd === "derajat") {
      const collection = cmdArgs[0]?.toLowerCase();
      const number = parseInt(cmdArgs[1]) || 1;
      if (!collection || !UMMAH_KEYS.includes(collection)) {
        return m.reply(`Format salah!\n\nContoh: \`.ummah grade bukhari 1\`\n\nKoleksi: ${UMMAH_KEYS.join(", ")}`);
      }

      const res = await apiGet(`/${collection}/${number}`);
      if (res.status !== 200 || !res.data?.success) throw new Error("Gagal mengambil hadith");

      const h = res.data.data;
      let txt = `Grade Detail\n\n`;
      txt += `${h.collection_name || collection}\n`;
      txt += `No. ${h.hadithnumber || number}\n`;
      txt += `Grade: ${h.grade || "Tidak tersedia"}\n\n`;

      const gradeLower = (h.grade || "").toLowerCase();
      if (gradeLower.includes("sahih")) txt += `Sahih = Autentik, dapat dipercaya\n`;
      else if (gradeLower.includes("hasan")) txt += `Hasan = Baik, cukup dapat dipercaya\n`;
      else if (gradeLower.includes("da'if") || gradeLower.includes("daif")) txt += `Da'if = Lemah, perlu hati-hati\n`;
      else if (gradeLower.includes("mauquf")) txt += `Mauquf = Sabda sahabat, bukan langsung dari Nabi\n`;
      else if (gradeLower.includes("marfu")) txt += `Marfu = Sampai kepada Nabi SAW\n`;

      txt += `\n`;
      if (h.english) txt += `${h.english.slice(0, 300)}...\n`;

      await m.reply(txt);
      await m.react("✅");
    }

    // === LIST COLLECTIONS ===
    else if (cmd === "list" || cmd === "collections" || cmd === "koleksi") {
      const res = await apiGet(`/collections`);
      if (res.status !== 200 || !res.data?.success) throw new Error("Gagal mengambil daftar koleksi");

      const cols = res.data.data?.collections || [];
      let txt = `Koleksi Hadith (UmmahAPI)\n\n`;
      let total = 0;
      for (let i = 0; i < cols.length; i++) {
        const c = cols[i];
        txt += `${i + 1}. ${c.name || "?"}\n`;
        txt += `   Author: ${c.author || "?"}\n`;
        txt += `   Grade: ${c.reliability || "?"}\n`;
        txt += `   Total: ${c.total_hadiths || "?"} hadiths\n`;
        txt += `   \`${m.prefix}ummah ${c.key} 1\`\n\n`;
        total += c.total_hadiths || 0;
      }
      txt += `Total: ${total.toLocaleString()} hadiths`;
      await m.reply(txt);
      await m.react("✅");
    }

    // === SPECIFIC HADITH ===
    else if (UMMAH_KEYS.includes(cmd)) {
      const collection = cmd;
      const number = parseInt(cmdArgs[0]) || 1;

      const res = await apiGet(`/${collection}/${number}`);
      if (res.status !== 200 || !res.data?.success) throw new Error(`Gagal mengambil ${collection} #${number}`);

      const h = res.data.data;
      let txt = `${h.collection_name || collection}\n\n`;
      txt += `No. ${h.hadithnumber || number}\n`;
      if (h.grade) txt += `Grade: ${h.grade}\n\n`;
      if (h.arabic) txt += `${h.arabic}\n\n`;
      if (h.english) txt += `${h.english}\n`;
      txt += `\n\`${m.prefix}ummah ${collection} ${number - 1}\` <- -> \`${m.prefix}ummah ${collection} ${number + 1}\``;

      await m.reply(txt);
      await m.react("✅");
    }

    else {
      await m.reply(`Perintah tidak ditemukan!\n\nKetik \`${m.prefix}ummah help\` untuk melihat semua perintah.`);
    }
  } catch (e) {
    console.error("[UMMAH] Error:", e.message);
    await m.reply(claraWrap("ummah", `Gagal mengambil hadith!\n\nError: ${e.message}`));
  }
}

export { pluginConfig as config, handler };
