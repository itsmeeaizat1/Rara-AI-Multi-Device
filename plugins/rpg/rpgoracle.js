// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// RPG Oracle — Multi API oracle: Advice Slip, Numbers API, Bored API, ZenQuotes
import { getDatabase } from "../../src/lib/nova-database.js";
import { claraWrap } from "../../src/lib/nova-menu-style.js";
import fetch from "node-fetch";

const pluginConfig = {
  name: "rpgoracle",
  alias: ["oracle", "rpgwisdom", "rpgramal", "orakerpg"],
  category: "rpg",
  description: "RPG Oracle — kuil oracle multi-API: Advice Slip, Numbers API, Bored API, ZenQuotes",
  usage: ".rpgoracle advice | .rpgoracle number <angka> | .rpgoracle quest | .rpgoracle quote | .rpgoracle random",
  example: ".rpgoracle advice\n.rpgoracle number 42",
  isGroup: true,
  cooldown: 5,
  energi: 3,
  isEnabled: true,
};

async function fetchAdvice() {
  try {
    const res = await fetch("https://api.adviceslip.com/advice");
    if (!res.ok) return null;
    const data = await res.json();
    return data.slip?.advice || null;
  } catch { return null; }
}

async function fetchNumberFact(number) {
  try {
    const res = await fetch("http://numbersapi.com/" + number + "?json");
    // NumbersAPI uses http, but we need https for free plans
    // Fallback: use math fact via different endpoint
    if (!res.ok) return null;
    const data = await res.json();
    return data.text || null;
  } catch { return null; }
}

async function fetchNumberFactHttps(number) {
  try {
    const res = await fetch("https://numbersapi.com/" + number + "?json");
    if (!res.ok) return null;
    const data = await res.json();
    return data.text || null;
  } catch { return null; }
}

async function fetchBored() {
  try {
    const res = await fetch("https://www.boredapi.com/api/activity");
    if (!res.ok) return null;
    const data = await res.json();
    return {
      activity: data.activity,
      type: data.type,
      participants: data.participants,
      price: data.price,
    };
  } catch { return null; }
}

async function fetchQuote() {
  try {
    const res = await fetch("https://zenquotes.io/api/random");
    if (!res.ok) return null;
    const data = await res.json();
    return { quote: data[0]?.q, author: data[0]?.a };
  } catch { return null; }
}

async function handler(m, { conn, text, args, usedPrefix, command }) {
  try {
    const db = await getDatabase();
    const sender = m.sender;
    const user = db.data.users?.[sender] || {};
    const sub = (args[0] || "").toLowerCase();

    // ADVICE
    if (sub === "advice" || sub === "saran") {
      if ((user.energi || 0) < pluginConfig.energi) return m.reply(claraWrap("RPG Oracle", "Energi kurang!"));
      m.reply(claraWrap("RPG Oracle", "Berkonsultasi dengan Oracle (Advice Slip API)..."));
      const advice = await fetchAdvice();
      if (!advice) return m.reply(claraWrap("RPG Oracle", "Oracle sedang diam. Coba lagi nanti!"));

      user.energi -= pluginConfig.energi;
      user.oracleConsults = (user.oracleConsults || 0) + 1;
      user.exp = (user.exp || 0) + 5;
      db.data.users[sender] = user;
      await db.save();

      return m.reply(claraWrap("RPG Oracle", [
        "SARAN ORACLE",
        "",
        '"' + advice + '"',
        "",
        "Konsultasi: " + (user.oracleConsults || 1),
        "EXP +5",
      ], "info"));
    }

    // NUMBER FACT
    if (sub === "number" || sub === "angka") {
      const num = args[1] || Math.floor(Math.random() * 100) + 1;
      if ((user.energi || 0) < pluginConfig.energi) return m.reply(claraWrap("RPG Oracle", "Energi kurang!"));
      m.reply(claraWrap("RPG Oracle", "Menanyakan ramalan angka ke Numbers API..."));
      let fact = await fetchNumberFactHttps(num);
      if (!fact) fact = await fetchNumberFact(num);
      if (!fact) return m.reply(claraWrap("RPG Oracle", "Oracle tidak merespons angka ini. Coba lagi!"));

      user.energi -= pluginConfig.energi;
      user.oracleConsults = (user.oracleConsults || 0) + 1;
      user.exp = (user.exp || 0) + 8;
      db.data.users[sender] = user;
      await db.save();

      return m.reply(claraWrap("RPG Oracle", [
        "RAMALAN ANGKA #" + num,
        "",
        fact,
        "",
        "EXP +8",
      ], "info"));
    }

    // BORED QUEST
    if (sub === "quest" || sub === "misi") {
      if ((user.energi || 0) < pluginConfig.energi) return m.reply(claraWrap("RPG Oracle", "Energi kurang!"));
      m.reply(claraWrap("RPG Oracle", "Mencari misi dari Bored API..."));
      const activity = await fetchBored();
      if (!activity) return m.reply(claraWrap("RPG Oracle", "Tidak ada misi tersedia. Coba lagi!"));

      user.energi -= pluginConfig.energi;
      user.oracleConsults = (user.oracleConsults || 0) + 1;
      user.exp = (user.exp || 0) + 10;

      const priceLabel = activity.price === 0 ? "Gratis" : activity.price < 0.3 ? "Murah" : activity.price < 0.6 ? "Sedang" : "Mahal";

      // Random reward
      const reward = Math.floor(Math.random() * 100) + 20;
      user.koin = (user.koin || 0) + reward;

      db.data.users[sender] = user;
      await db.save();

      return m.reply(claraWrap("RPG Oracle", [
        "MISI ORACLE",
        "",
        "Aktivitas: " + activity.activity,
        "Tipe: " + activity.type,
        "Peserta: " + activity.participants + " orang",
        "Biaya: " + priceLabel,
        "",
        "Reward: " + reward + " koin, +10 EXP",
        "",
        "Selesaikan misi ini di dunia nyata untuk EXP bonus!",
      ], "success"));
    }

    // QUOTE
    if (sub === "quote" || sub === "kutipan" || sub === "bijak") {
      if ((user.energi || 0) < pluginConfig.energi) return m.reply(claraWrap("RPG Oracle", "Energi kurang!"));
      m.reply(claraWrap("RPG Oracle", "Mencari kutipan dari ZenQuotes..."));
      const quote = await fetchQuote();
      if (!quote || !quote.quote) return m.reply(claraWrap("RPG Oracle", "Oracle diam. Coba lagi nanti!"));

      user.energi -= pluginConfig.energi;
      user.oracleConsults = (user.oracleConsults || 0) + 1;
      user.exp = (user.exp || 0) + 5;
      db.data.users[sender] = user;
      await db.save();

      return m.reply(claraWrap("RPG Oracle", [
        "KUTIPAN ORACLE",
        "",
        '"' + quote.quote + '"',
        "- " + quote.author,
        "",
        "EXP +5",
      ], "info"));
    }

    // RANDOM (pilih salah satu API random)
    if (sub === "random" || sub === "" || sub === "acak") {
      if ((user.energi || 0) < pluginConfig.energi) return m.reply(claraWrap("RPG Oracle", "Energi kurang!"));
      const choice = Math.floor(Math.random() * 4);
      m.reply(claraWrap("RPG Oracle", "Oracle meramal..."));

      let lines = [];
      let expGain = 5;

      if (choice === 0) {
        const advice = await fetchAdvice();
        if (advice) {
          lines = ["SARAN ORACLE", "", '"' + advice + '"'];
        } else {
          lines = ["Oracle tidak merespons. Coba .rpgoracle advice"];
        }
      } else if (choice === 1) {
        const num = Math.floor(Math.random() * 100) + 1;
        let fact = await fetchNumberFactHttps(num);
        if (!fact) fact = await fetchNumberFact(num);
        if (fact) {
          lines = ["RAMALAN ANGKA #" + num, "", fact];
          expGain = 8;
        } else {
          lines = ["Oracle tidak merespons angka. Coba .rpgoracle number <angka>"];
        }
      } else if (choice === 2) {
        const activity = await fetchBored();
        if (activity) {
          lines = [
            "MISI ORACLE",
            "",
            "Aktivitas: " + activity.activity,
            "Tipe: " + activity.type,
            "Peserta: " + activity.participants,
          ];
          const reward = Math.floor(Math.random() * 100) + 20;
          user.koin = (user.koin || 0) + reward;
          lines.push("Reward: " + reward + " koin");
          expGain = 10;
        } else {
          lines = ["Tidak ada misi. Coba .rpgoracle quest"];
        }
      } else {
        const quote = await fetchQuote();
        if (quote && quote.quote) {
          lines = ["KUTIPAN ORACLE", "", '"' + quote.quote + '"', "- " + quote.author];
        } else {
          lines = ["Oracle diam. Coba .rpgoracle quote"];
        }
      }

      user.energi -= pluginConfig.energi;
      user.oracleConsults = (user.oracleConsults || 0) + 1;
      user.exp = (user.exp || 0) + expGain;
      db.data.users[sender] = user;
      await db.save();

      lines.push("", "EXP +" + expGain + " | Konsultasi: " + (user.oracleConsults || 1));
      return m.reply(claraWrap("RPG Oracle", lines, "info"));
    }

    // HELP
    return m.reply(claraWrap("RPG Oracle", [
      "Kuil Oracle multi-API",
      "",
      "CARA PAKAI:",
      usedPrefix + "rpgoracle advice — Saran dari Advice Slip API",
      usedPrefix + "rpgoracle number <angka> — Fakta angka dari Numbers API",
      usedPrefix + "rpgoracle quest — Misi dari Bored API + reward",
      usedPrefix + "rpgoracle quote — Kutipan dari ZenQuotes API",
      usedPrefix + "rpgoracle random — Oracle pilih sendiri",
      "",
      "Tiap konsultasi: " + pluginConfig.energi + " energi + EXP bonus",
    ]));
  } catch (e) {
    console.error("[RPG Oracle]", e);
    m.reply(claraWrap("RPG Oracle", "Error: " + e.message));
  }
}

export { pluginConfig as config, handler };
