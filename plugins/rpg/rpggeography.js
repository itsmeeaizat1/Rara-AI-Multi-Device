// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// RPG Geography — Eksplorasi dunia dengan menjawab soal geografi
import { getDatabase } from "../../src/lib/nova-database.js";
import { claraWrap } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "rpggeography",
  alias: ["rpggeografi", "geografirpg", "rpgdunia", "rpgexplorer"],
  category: "rpg",
  description: "Eksplorasi negara/benua dengan menjawab soal geografi dunia",
  usage: ".rpggeography | .rpggeography status | .rpggeography explore | .rpggeography map",
  example: ".rpggeography",
  isGroup: true,
  cooldown: 20,
  energi: 8,
  isEnabled: true,
};

const COUNTRIES = [
  { name: "Indonesia", capital: "Jakarta", continent: "Asia", fact: "Negara kepulauan terbesar dengan 17.508 pulau.", emoji: "ID" },
  { name: "Jepang", capital: "Tokyo", continent: "Asia", fact: "Negara matahari terbit, terkenal anime dan teknologi.", emoji: "JP" },
  { name: "Amerika Serikat", capital: "Washington D.C.", continent: "Amerika Utara", fact: "Negara dengan ekonomi terbesar di dunia.", emoji: "US" },
  { name: "Brasil", capital: "Brasilia", continent: "Amerika Selatan", fact: "Hutan Amazon terbesar di dunia ada di sini.", emoji: "BR" },
  { name: "Mesir", capital: "Kairo", continent: "Afrika", fact: "Piramid dan Sphinx berada di sini.", emoji: "EG" },
  { name: "Australia", capital: "Canberra", continent: "Oseania", fact: "Satu-satunya negara yang juga benua.", emoji: "AU" },
  { name: "Prancis", capital: "Paris", continent: "Eropa", fact: "Menara Eiffel dan Louvre ada di sini.", emoji: "FR" },
  { name: "Rusia", capital: "Moskow", continent: "Eropa/Asia", fact: "Negara terluas di dunia, membentang 11 zona waktu.", emoji: "RU" },
  { name: "Tiongkok", capital: "Beijing", continent: "Asia", fact: "Tembok Besar China terpanjang di dunia.", emoji: "CN" },
  { name: "India", capital: "New Delhi", continent: "Asia", fact: "Taj Mahal dan populasi terbesar di dunia.", emoji: "IN" },
  { name: "Italia", capital: "Roma", continent: "Eropa", fact: "Colosseum dan Menara Pisa ada di sini.", emoji: "IT" },
  { name: "Inggris", capital: "London", continent: "Eropa", fact: "Big Ben dan Buckingham Palace ada di sini.", emoji: "GB" },
  { name: "Kanada", capital: "Ottawa", continent: "Amerika Utara", fact: "Negara terbesar kedua di dunia.", emoji: "CA" },
  { name: "Afrika Selatan", capital: "Pretoria", continent: "Afrika", fact: "Punya 3 ibu kota: Pretoria, Cape Town, Bloemfontein.", emoji: "ZA" },
  { name: "Arab Saudi", capital: "Riyadh", continent: "Asia", fact: "Makkah dan Madinah ada di sini.", emoji: "SA" },
  { name: "Turki", capital: "Ankara", continent: "Eropa/Asia", fact: "Jembatan antara benua Eropa dan Asia.", emoji: "TR" },
  { name: "Argentina", capital: "Buenos Aires", continent: "Amerika Selatan", fact: "Tango dan Messi berasal dari sini.", emoji: "AR" },
  { name: "Thailand", capital: "Bangkok", continent: "Asia", fact: "Negeri gajah putih, terkenal candi dan street food.", emoji: "TH" },
  { name: "Spanyol", capital: "Madrid", continent: "Eropa", fact: "La Liga dan flamenco terkenal dari sini.", emoji: "ES" },
  { name: "Jerman", capital: "Berlin", continent: "Eropa", fact: "Pusat industri otomotif Eropa.", emoji: "DE" },
];

const QUESTIONS = [
  { type: "capital", q: "Ibu kota dari negara", a: "capital" },
  { type: "country", q: "Negara dengan ibu kota", a: "name" },
  { type: "continent", q: "Benua dari negara", a: "continent" },
  { type: "fact", q: "Negara apakah ini?", a: "name" },
];

async function handler(m, { conn, text, args, usedPrefix, command }) {
  try {
    const db = await getDatabase();
    const sender = m.sender;
    const user = db.data.users?.[sender] || {};
    const sub = (args[0] || "").toLowerCase();

    // STATUS
    if (sub === "status" || sub === "cek") {
      const explored = user.geoExplored || [];
      return m.reply(claraWrap("RPG Geography", [
        "STATUS EKSPLORASI DUNIA",
        "",
        "Level explorer: " + (user.geoLevel || 1),
        "Battle menang: " + (user.geoWins || 0),
        "Negara dieksplorasi: " + explored.length + "/" + COUNTRIES.length,
        "Soal benar: " + (user.geoCorrect || 0),
        "Koin: " + (user.koin || 0),
        "",
        "Ketik .rpggeography untuk eksplorasi!",
        "Ketik .rpggeography map untuk lihat peta",
      ]));
    }

    // MAP
    if (sub === "map" || sub === "peta" || sub === "daftar") {
      const explored = user.geoExplored || [];
      let lines = ["PETA EKSPLORASI DUNIA (" + explored.length + "/" + COUNTRIES.length + ")", ""];
      COUNTRIES.forEach((c, i) => {
        const visited = explored.includes(c.name) ? " [DIEKSPLORASI]" : "";
        lines.push((i + 1) + ". " + c.emoji + " " + c.name + " - " + c.continent + visited);
      });
      return m.reply(claraWrap("RPG Geography", lines));
    }

    // EXPLORE / BATTLE
    if (sub === "explore" || sub === "jelajah" || sub === "" || sub === "battle") {
      if ((user.energi || 0) < pluginConfig.energi) {
        return m.reply(claraWrap("RPG Geography", "Energi kurang! Butuh " + pluginConfig.energi + " energi."));
      }

      const geoLevel = user.geoLevel || 1;
      const numQuestions = Math.min(5, 2 + Math.floor(geoLevel / 2));

      // Generate questions
      let questions = [];
      for (let i = 0; i < numQuestions; i++) {
        const country = COUNTRIES[Math.floor(Math.random() * COUNTRIES.length)];
        const qType = QUESTIONS[Math.floor(Math.random() * QUESTIONS.length)];

        let question, answer;
        switch (qType.type) {
          case "capital":
            question = qType.q + " " + country.name + " (" + country.emoji + ") adalah?";
            answer = country.capital.toLowerCase();
            break;
          case "country":
            question = qType.q + " " + country.capital + " adalah?";
            answer = country.name.toLowerCase();
            break;
          case "continent":
            question = qType.q + " " + country.name + " (" + country.emoji + ") adalah?";
            answer = country.continent.toLowerCase();
            break;
          case "fact":
            question = "Fakta: " + country.fact + "\nNegara apakah ini?";
            answer = country.name.toLowerCase();
            break;
        }

        // Generate options
        const wrongPool = COUNTRIES.filter((c) => c[qType.a].toLowerCase() !== answer);
        const wrongs = [];
        while (wrongs.length < 3) {
          const rand = wrongPool[Math.floor(Math.random() * wrongPool.length)];
          const w = rand[qType.a].toLowerCase();
          if (!wrongs.includes(w) && w !== answer) wrongs.push(w);
        }
        const options = [answer, ...wrongs].sort(() => Math.random() - 0.5);
        questions.push({ question, answer, options, country, type: qType.type });
      }

      let correctCount = 0;
      let lines = [
        "EKSPLORESI DUNIA RPG",
        "Level Explorer: " + geoLevel,
        "Jumlah soal: " + numQuestions,
        "",
        "SOAL EKSPLORASI:",
        "",
      ];

      questions.forEach((q, i) => {
        lines.push("Soal " + (i + 1) + ": " + q.question);
        lines.push("A. " + q.options[0]);
        lines.push("B. " + q.options[1]);
        lines.push("C. " + q.options[2]);
        lines.push("D. " + q.options[3]);
        const correctLetter = ["A", "B", "C", "D"][q.options.indexOf(q.answer)];
        lines.push("Jawaban: " + correctLetter + ". " + q.answer);
        lines.push("");
        if (q.options.includes(q.answer)) correctCount++;
      });

      user.energi -= pluginConfig.energi;
      const passed = correctCount >= Math.ceil(numQuestions * 0.6);
      let reward = 0;
      let expGain = 0;

      if (passed) {
        reward = 50 + (correctCount * 30) + (geoLevel * 10);
        expGain = 20 + (correctCount * 10);
        user.koin = (user.koin || 0) + reward;
        user.exp = (user.exp || 0) + expGain;
        user.geoWins = (user.geoWins || 0) + 1;
        // Explore new country
        const newCountry = COUNTRIES[Math.floor(Math.random() * COUNTRIES.length)];
        if (!user.geoExplored) user.geoExplored = [];
        if (!user.geoExplored.includes(newCountry.name)) {
          user.geoExplored.push(newCountry.name);
        }
        if (user.exp >= (user.geoLevel || 1) * 100) {
          user.geoLevel = (user.geoLevel || 1) + 1;
        }
        lines.push("EKSPLORESI BERHASIL!");
        lines.push("Negara baru: " + newCountry.emoji + " " + newCountry.name);
        lines.push("Reward: " + reward + " koin, +" + expGain + " EXP");
      } else {
        user.geoLosses = (user.geoLosses || 0) + 1;
        lines.push("EKSPLORESI GAGAL!");
        lines.push("Pelajari lebih banyak geografi!");
      }

      user.geoCorrect = (user.geoCorrect || 0) + correctCount;
      db.data.users[sender] = user;
      await db.save();

      lines.push("");
      lines.push("Jawaban benar: " + correctCount + "/" + numQuestions);
      lines.push("Energi tersisa: " + user.energi);
      lines.push("Level: " + (user.geoLevel || 1));
      lines.push("Negara: " + (user.geoExplored?.length || 0) + "/" + COUNTRIES.length);

      return m.reply(claraWrap("RPG Geography", lines, passed ? "success" : "warn"));
    }

    // HELP
    return m.reply(claraWrap("RPG Geography", [
      "Eksplorasi dunia dengan menjawab soal geografi",
      "",
      "CARA PAKAI:",
      usedPrefix + "rpggeography — Mulai eksplorasi (battle soal)",
      usedPrefix + "rpggeography status — Lihat progress",
      usedPrefix + "rpggeography map — Lihat peta negara",
      "",
      "Soal: ibu kota, benua, fakta negara",
      "20 negara untuk dieksplorasi!",
    ]));
  } catch (e) {
    console.error("[RPG Geography]", e);
    m.reply(claraWrap("RPG Geography", "Error: " + e.message));
  }
}

export { pluginConfig as config, handler };
