// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { getDatabase } from "../../src/lib/nova-database.js";
import { claraWrap, novaError } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "storybuild",
  alias: ["storybuild"],
  aliases: ["storybuild", "ceritabareng", "collabstory"],
  category: "group",
  description: "Collab cerita bareng - tiap member sambung 1 kalimat",
  usage: ".storybuild start <tema> | .storybuild add <kalimat> | .storybuild read | .storybuild end | .storybuild summary",
  isGroupOnly: true,
};

const STARTERS = [
  "Di sebuah desa terpencil, hidup seorang anak bernama Raka...",
  "Hujan turun deras malam itu saat pintu rumah tua itu terbuka sendiri...",
  "Sebuah pesan misterius muncul di layar hp semua orang sekaligus...",
  "Langit berubah jadi ungu tepat saat jam menunjukkan pukul 12 siang...",
  "Karakter di dalam game tiba-tiba berbicara kepada pemainnya...",
  "Surat tua itu sudah 50 tahun terkubur di bawah pohon beringin...",
  "Semua orang di kota tiba-tiba bisa mendengar pikiran orang lain...",
  "Sebuah kafe muncul di sudut jalan yang kemarin tidak ada...",
];

async function handler(m, { conn, text, args, usedPrefix, command }) {
  try {
    const db = await getDatabase();
    const groupId = m.key.remoteJid;
    const sender = m.key.participant || m.sender;
    const sub = (args[0] || "").toLowerCase();

    if (!db.data.storyBuild) db.data.storyBuild = {};
    if (!db.data.storyBuild[groupId]) {
      db.data.storyBuild[groupId] = { active: false, theme: "", sentences: [], contributors: [], maxRounds: 10, currentRound: 0, starter: "" };
      await db.save();
    }

    const story = db.data.storyBuild[groupId];

    if (sub === "start") {
      if (story.active) return m.reply(claraWrap("Story Build", "Sudang ada cerita berjalan."));
      const theme = text.split(" ").slice(1).join(" ").trim() || "Bebas";
      story.active = true;
      story.theme = theme;
      story.sentences = [];
      story.contributors = [];
      story.currentRound = 0;
      story.maxRounds = 10;
      story.starter = STARTERS[Math.floor(Math.random() * STARTERS.length)];
      story.sentences.push({ author: "bot", text: story.starter });
      await db.save();

      return m.reply(claraWrap("Story Build", [
        `Cerita dimulai! Tema: ${theme}`,
        `Max putaran: ${story.maxRounds}`,
        "",
        `Opening:`,
        `"${story.starter}"`,
        "",
        `Sambung cerita: ${usedPrefix}storybuild add <kalimat>`,
        `Lihat cerita: ${usedPrefix}storybuild read`,
        `Selesai: ${usedPrefix}storybuild end`,
      ].join("\n")));
    }

    if (sub === "add") {
      if (!story.active) return m.reply(claraWrap("Story Build", `Belum ada cerita. Mulai: ${usedPrefix}storybuild start <tema>`, "info"));
      const sentence = text.split(" ").slice(1).join(" ").trim();
      if (!sentence) return m.reply(claraWrap("Usage", `Cara: ${usedPrefix}storybuild add <kalimat kamu>`, "info"));
      if (story.currentRound >= story.maxRounds) return m.reply(claraWrap("Story Build", `Maksimal ${story.maxRounds} putaran. Ketik ${usedPrefix}storybuild end untuk rangkum.`, "info"));

      const lastAuthor = story.sentences[story.sentences.length - 1]?.author;
      if (lastAuthor === sender) return m.reply(claraWrap("Story Build", "Tunggu giliran orang lain dulu!"));

      story.sentences.push({ author: sender, text: sentence });
      if (!story.contributors.includes(sender)) story.contributors.push(sender);
      story.currentRound++;
      await db.save();

      const remaining = story.maxRounds - story.currentRound;
      let msg = `Kalimat ditambahkan! Sisa ${remaining} putaran.`;
      if (story.currentRound >= story.maxRounds) {
        msg += `\n\nCerita selesai! Ketik ${usedPrefix}storybuild summary untuk rangkum.`;
        story.active = false;
        await db.save();
      }
      return m.reply(claraWrap("Story Build", msg));
    }

    if (sub === "read") {
      if (story.sentences.length === 0) return m.reply(claraWrap("Story Build", "Belum ada cerita."));
      const fullStory = story.sentences.map((s, i) => {
        if (i === 0) return `"${s.text}"`;
        const authorName = s.author === "bot" ? "[Bot]" : "@" + s.author.split("@")[0];
        return `"${s.text}" - ${authorName}`;
      }).join("\n\n");
      return m.reply(claraWrap("Story Build", [
        `Tema: ${story.theme}`,
        `Putaran: ${story.currentRound}/${story.maxRounds}`,
        `Kontributor: ${story.contributors.length}`,
        "",
        fullStory,
      ].join("\n")));
    }

    if (sub === "summary" || sub === "end") {
      if (story.sentences.length === 0) return m.reply(claraWrap("Story Build", "Belum ada cerita."));
      story.active = false;
      await db.save();

      const fullText = story.sentences.map(s => s.text).join(" ");
      const summary = fullText.length > 500
        ? fullText.slice(0, 500) + "..."
        : fullText;
      const contributorList = story.contributors.map(c => "@" + c.split("@")[0]).join(", ");

      return m.reply(claraWrap("Story Build", [
        `Cerita Selesai!`,
        `Tema: ${story.theme}`,
        `Total kalimat: ${story.sentences.length}`,
        `Kontributor: ${contributorList}`,
        "",
        `Cerita Lengkap:`,
        summary,
      ].join("\n")));
    }

    if (sub === "stop") {
      story.active = false;
      story.sentences = [];
      story.contributors = [];
      story.currentRound = 0;
      await db.save();
      return m.reply(claraWrap("Story Build", "Cerita dihentikan dan direset."));
    }

    return m.reply(claraWrap("Story Build", [
      `Story Build - Collab cerita bareng grup`,
      "",
      `Command:`,
      `1. ${usedPrefix}storybuild start <tema> - Mulai cerita`,
      `2. ${usedPrefix}storybuild add <kalimat> - Sambung cerita`,
      `3. ${usedPrefix}storybuild read - Baca cerita`,
      `4. ${usedPrefix}storybuild summary - Rangkum & selesai`,
      `5. ${usedPrefix}storybuild stop - Reset`,
    ].join("\n")));
  } catch (e) {
    console.error("storybuild error:", e);
    return m.reply(novaError("Storybuild", e.message));
  }
}

export { pluginConfig as config, handler };
