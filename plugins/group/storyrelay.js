// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { getDatabase } from "../../src/lib/nova-database.js";
import { claraWrap } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "storyrelay",
  alias: ["storyrelay"],
  category: "group",
  description: "Sambung cerita bareng — tiap orang tambah 1 kalimat",
  usage: ".storyrelay start | .storyrelay <kalimat> | .storyrelay read | .storyrelay stop",
  isGroupOnly: true,
};

async function handler(m, { conn, text, args, usedPrefix, command }) {
  try {
    const db = await getDatabase();
    const groupId = m.key.remoteJid;
    const sender = m.key.participant || m.sender;
    const sub = (args[0] || "").toLowerCase();

    if (!db.data.storyRelay) db.data.storyRelay = {};
    if (!db.data.storyRelay[groupId]) {
      db.data.storyRelay[groupId] = { active: false, story: [], lastSender: null, startedAt: null };
      await db.save();
    }
    const game = db.data.storyRelay[groupId];

    // START
    if (sub === "start") {
      if (game.active) {
        return m.reply(claraWrap("Story Relay", "Cerita lagi berjalan!\nKetik .storyrelay read untuk baca.\nKetik .storyrelay stop untuk hentikan."));
      }
      game.active = true;
      game.story = [];
      game.lastSender = null;
      game.startedAt = Date.now();
      await db.save();

      return m.reply(claraWrap("Story Relay", [
        "Game sambung cerita dimulai!",
        "",
        "Cara main:",
        "1. Tiap orang tambah 1 kalimat",
        "2. Gak boleh komen 2x berturut-turut",
        "3. Cerita harus nyambung",
        "",
        "Ketik: .storyrelay <kalimat kamu>",
        "",
        "Contoh: .storyrelay Pagi itu, Budi bangun terlambat.",
      ]));
    }

    // READ
    if (sub === "read") {
      if (!game.active && game.story.length === 0) {
        return m.reply(claraWrap("Story Relay", "Belum ada cerita.\nKetik .storyrelay start untuk mulai."));
      }
      if (game.story.length === 0) {
        return m.reply(claraWrap("Story Relay", "Cerita kosong. Tunggu orang pertama menulis."));
      }
      let full = "";
      game.story.forEach((entry) => {
        full += entry.text + " ";
      });
      let info = "Total kontribusi: " + game.story.length + " kalimat\n";
      info += "Status: " + (game.active ? "Aktif" : "Selesai");
      return m.reply(claraWrap("Story Relay", info + "\n\n" + full.trim()));
    }

    // STOP
    if (sub === "stop") {
      if (!game.active) {
        return m.reply(claraWrap("Story Relay", "Gak ada cerita yang berjalan."));
      }
      game.active = false;
      await db.save();

      let full = "";
      game.story.forEach((entry) => {
        full += entry.text + " ";
      });

      return m.reply(claraWrap("Story Relay", [
        "Cerita selesai!",
        "Total kontribusi: " + game.story.length + " kalimat",
        "",
        full.trim(),
      ]));
    }

    // ADD SENTENCE
    if (!game.active) {
      return m.reply(claraWrap("Story Relay", "Gak ada game aktif.\nKetik .storyrelay start untuk mulai."));
    }

    const sentence = text.trim();
    if (!sentence || sentence.length < 3) {
      return m.reply(claraWrap("Story Relay", "Kalimat terlalu pendek!\nKetik .storyrelay <kalimat>"));
    }

    if (sentence.toLowerCase().startsWith("start") || sentence.toLowerCase().startsWith("stop") || sentence.toLowerCase().startsWith("read")) {
      return m.reply(claraWrap("Story Relay", "Itu perintah, bukan kalimat cerita.\nKetik: .storyrelay <kalimat ceritamu>"));
    }

    if (game.lastSender === sender) {
      return m.reply(claraWrap("Story Relay", "Kamu baru saja menulis! Tunggu orang lain dulu."));
    }

    game.story.push({ sender, text: sentence });
    game.lastSender = sender;
    await db.save();

    let full = "";
    game.story.forEach((entry) => {
      full += entry.text + " ";
    });

    return m.reply(claraWrap("Story Relay", [
      "Kalimat ditambahkan! (ke-" + game.story.length + ")",
      "",
      full.trim(),
      "",
      "Giliran orang lain! Ketik .storyrelay <kalimat>",
    ]));
  } catch (e) {
    console.error("[Story Relay]", e);
    m.reply(claraWrap("Story Relay", "Error: " + e.message));
  }
}

export { pluginConfig as config, handler };
