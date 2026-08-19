// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// RPG History — Quest sejarah dengan menjawab soal peristiwa penting
import { getDatabase } from "../../src/lib/nova-database.js";
import { claraWrap } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "rpghistory",
  alias: ["rpgsejarah", "historyrpg", "sejarahrpg", "rpgwaktu"],
  category: "rpg",
  description: "Quest sejarah — battle monster dengan menjawab soal peristiwa penting dunia",
  usage: ".rpghistory | .rpghistory status | .rpghistory timeline",
  example: ".rpghistory",
  isGroup: true,
  cooldown: 20,
  energi: 8,
  isEnabled: true,
};

const EVENTS = [
  { year: "1945", event: "Proklamasi Kemerdekaan Indonesia", desc: "Soekarno-Hatta memproklamasikan kemerdekaan Indonesia pada 17 Agustus.", era: "Modern" },
  { year: "1492", event: "Columbus menemukan Amerika", desc: "Christopher Columbus tiba di benua Amerika.", era: "Penjelajahan" },
  { year: "1969", event: "Manusia pertama mendarat di Bulan", desc: "Neil Armstrong menjadi manusia pertama menginjak Bulan.", era: "Modern" },
  { year: "1789", event: "Revolusi Prancis", desc: "Rakyat Prancis menggulingkan monarki, semboyan liberte, egalite, fraternite.", era: "Revolusi" },
  { year: "1945", event: "Berakhirnya Perang Dunia II", desc: "Jepang menyerah setelah bom atom Hiroshima dan Nagasaki.", era: "Modern" },
  { year: "1928", event: "Sumpah Pemuda", desc: "Pemuda Indonesia berikrar satu bahasa, bangsa, dan tanah air.", era: "Kebangkitan" },
  { year: "1912", event: "Tenggelamnya Titanic", desc: "Kapal mewah Titanic tenggelam setelah tabrakan iceberg.", era: "Modern" },
  { year: "1965", event: "Gerakan 30 September (G30S)", desc: "Peristiwa politik yang mengubah sejarah Indonesia.", era: "Modern" },
  { year: "1947", event: "India merdeka", desc: "India merdeka dari Inggris, dipimpin Mahatma Gandhi.", era: "Kemerdekaan" },
  { year: "1804", event: "Napoleon jadi Kaisar Prancis", desc: "Napoleon Bonaparte memahkotai diri sebagai kaisar.", era: "Imperial" },
  { year: "1453", event: "Jatuhnya Konstantinopel", desc: "Kekaisaran Ottoman menaklukan Konstantinopel, akhir Romawi Timur.", era: "Abad Pertengahan" },
  { year: "1963", event: "Pidato 'I Have a Dream' Martin Luther King", desc: "Pidato bersejarah tentang kesetaraan ras di Amerika.", era: "Modern" },
  { year: "1903", event: "Penerbangan pertama Wright Bersaudara", desc: "Pesawat pertama berhasil terbang di Kitty Hawk.", era: "Penemuan" },
  { year: "1948", event: "PBB mengadopsi Deklarasi HAM", desc: "Universal Declaration of Human Rights disahkan.", era: "Modern" },
  { year: "1955", event: "Konferensi Asia-Afrika", desc: "Konferensi di Bandung, lahirnya semangat non-blok.", era: "Kemerdekaan" },
  { year: "1512", event: "Ferdinand Magellan berlayar keliling dunia", desc: "Ekspedisi pertama berhasil mengelilingi bumi.", era: "Penjelajahan" },
  { year: "1914", event: "Mulainya Perang Dunia I", desc: "Perang global pertama setelah pembunuhan Archduke Franz Ferdinand.", era: "Perang" },
  { year: "1989", event: "Jatuhnya Tembok Berlin", desc: "Tembok Berlin runtuh, menandai akhir Perang Dingin.", era: "Modern" },
  { year: "2004", event: "Tsunami Aceh", desc: "Gempa 9.1 SR dan tsunami menewaskan 230.000+ jiwa.", era: "Modern" },
  { year: "1879", event: "Thomas Edison menemukan bohlam", desc: "Penemuan lampu pijar mengubah dunia.", era: "Penemuan" },
];

const Q_TYPES = ["year", "event", "desc", "era"];

async function handler(m, { conn, text, args, usedPrefix, command }) {
  try {
    const db = await getDatabase();
    const sender = m.sender;
    const user = db.data.users?.[sender] || {};
    const sub = (args[0] || "").toLowerCase();

    // STATUS
    if (sub === "status" || sub === "cek") {
      return m.reply(claraWrap("RPG History", [
        "STATUS SEJARAH RPG",
        "",
        "Level sejarah: " + (user.histLevel || 1),
        "Quest selesai: " + (user.histWins || 0),
        "Quest gagal: " + (user.histLosses || 0),
        "Soal benar: " + (user.histCorrect || 0),
        "Peristiwa dipelajari: " + (user.histLearned || 0) + "/" + EVENTS.length,
        "Koin: " + (user.koin || 0),
        "",
        "Ketik .rpghistory untuk mulai quest!",
        "Ketik .rpghistory timeline untuk lihat linimasa",
      ]));
    }

    // TIMELINE
    if (sub === "timeline" || sub === "linimasa") {
      const sorted = [...EVENTS].sort((a, b) => parseInt(a.year) - parseInt(b.year));
      let lines = ["LINIMASA SEJARAH (" + sorted.length + " peristiwa)", ""];
      sorted.forEach((e, i) => {
        lines.push((i + 1) + ". [" + e.year + "] " + e.event);
        lines.push("   Era: " + e.era);
      });
      return m.reply(claraWrap("RPG History", lines));
    }

    // QUEST / BATTLE
    if ((user.energi || 0) < pluginConfig.energi) {
      return m.reply(claraWrap("RPG History", "Energi kurang! Butuh " + pluginConfig.energi + " energi."));
    }

    const histLevel = user.histLevel || 1;
    const numQuestions = Math.min(5, 2 + Math.floor(histLevel / 2));

    let questions = [];
    for (let i = 0; i < numQuestions; i++) {
      const ev = EVENTS[Math.floor(Math.random() * EVENTS.length)];
      const qType = Q_TYPES[Math.floor(Math.random() * Q_TYPES.length)];

      let question, answer;
      switch (qType) {
        case "year":
          question = "Kapan peristiwa berikut terjadi?\n" + ev.event;
          answer = ev.year;
          break;
        case "event":
          question = "Peristiwa apakah yang terjadi pada " + ev.year + "?";
          answer = ev.event.toLowerCase();
          break;
        case "desc":
          question = "Peristiwa apakah ini?\n" + ev.desc;
          answer = ev.event.toLowerCase();
          break;
        case "era":
          question = "Era apa untuk peristiwa: " + ev.event + " (" + ev.year + ")?";
          answer = ev.era.toLowerCase();
          break;
      }

      // Options
      const wrongPool = EVENTS.filter((e) => e[qType].toLowerCase() !== answer);
      const wrongs = [];
      while (wrongs.length < 3) {
        const rand = wrongPool[Math.floor(Math.random() * wrongPool.length)];
        const w = rand[qType].toLowerCase();
        if (!wrongs.includes(w) && w !== answer) wrongs.push(w);
      }
      const options = [answer, ...wrongs].sort(() => Math.random() - 0.5);
      questions.push({ question, answer, options, event: ev, type: qType });
    }

    let correctCount = 0;
    let lines = [
      "QUEST SEJARAH RPG",
      "Level: " + histLevel,
      "Soal: " + numQuestions,
      "",
      "SOAL QUEST:",
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
      reward = 60 + (correctCount * 30) + (histLevel * 10);
      expGain = 25 + (correctCount * 10);
      user.koin = (user.koin || 0) + reward;
      user.exp = (user.exp || 0) + expGain;
      user.histWins = (user.histWins || 0) + 1;
      if (!user.histLearned) user.histLearned = 0;
      user.histLearned = Math.min(EVENTS.length, user.histLearned + 1);
      if (user.exp >= (user.histLevel || 1) * 100) {
        user.histLevel = (user.histLevel || 1) + 1;
      }
      lines.push("QUEST BERHASIL!");
      lines.push("Reward: " + reward + " koin, +" + expGain + " EXP");
    } else {
      user.histLosses = (user.histLosses || 0) + 1;
      lines.push("QUEST GAGAL!");
      lines.push("Pelajari lebih banyak sejarah!");
    }

    user.histCorrect = (user.histCorrect || 0) + correctCount;
    db.data.users[sender] = user;
    await db.save();

    lines.push("", "Jawaban benar: " + correctCount + "/" + numQuestions);
    lines.push("Energi tersisa: " + user.energi);
    lines.push("Level Sejarah: " + (user.histLevel || 1));
    lines.push("Peristiwa dipelajari: " + (user.histLearned || 0) + "/" + EVENTS.length);

    return m.reply(claraWrap("RPG History", lines, passed ? "success" : "warn"));
  } catch (e) {
    console.error("[RPG History]", e);
    m.reply(claraWrap("RPG History", "Error: " + e.message));
  }
}

export { pluginConfig as config, handler };
