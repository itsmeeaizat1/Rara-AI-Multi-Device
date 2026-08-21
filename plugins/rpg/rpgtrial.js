// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// RPG Trial of Gods — Ujian dewa dengan aturan unik per trial
import { getDatabase } from "../../src/lib/nova-database.js";
import { claraWrap } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "rpgtrial",
  alias: ["trial", "trialgods", "rpgujian", "rpgujiandewa"],
  category: "rpg",
  description: "RPG Trial of the Gods — ujian dari dewa dengan aturan unik per trial, reward besar!",
  usage: ".rpgtrial | .rpgtrial status | .rpgtrial info",
  example: ".rpgtrial",
  isGroup: true,
  cooldown: 60,
  energi: 15,
  isEnabled: true,
};

const TRIALS = [
  {
    name: "Trial of Zeus (Petir)",
    god: "Zeus",
    element: "Petir",
    desc: "Jawab 5 soal tentang sains dan fisika. Tidak boleh salah satupun.",
    type: "science",
    questions: [
      { q: "Satuan arus listrik?", a: "ampere", opts: ["Ampere", "Volt", "Watt", "Ohm"] },
      { q: "Hukum Ohm menyatakan V = ?", a: "i x r", opts: ["I x R", "I / R", "R / I", "I + R"] },
      { q: "Benda bermuatan listrik positif disebut?", a: "proton", opts: ["Proton", "Elektron", "Neutron", "Foton"] },
      { q: "Alat ukur tegangan listrik?", a: "voltmeter", opts: ["Voltmeter", "Ammeter", "Ohmmeter", "Wattmeter"] },
      { q: "Petir adalah pelepasan listrik dari?", a: "awan ke tanah", opts: ["Awan ke tanah", "Tanah ke awan", "Awan ke awan", "Semua benar"] },
    ],
    reward: { koin: 500, exp: 200, title: "Champion of Zeus" },
  },
  {
    name: "Trial of Athena (Kebijaksanaan)",
    god: "Athena",
    element: "Terang",
    desc: "Jawab 5 teka-teki logika. Semua harus benar.",
    type: "logic",
    questions: [
      { q: "Aku punya kepala tapi tidak punya otak. Aku?", a: "selang", opts: ["Selang", "Boneka", "Patung", "Buku"] },
      { q: "Makin gelap makin terang. Aku?", a: "bintang", opts: ["Bintang", "Lampu", "Bulan", "Matahari"] },
      { q: "Aku selalu mengikuti kamu tapi hilang di gelap. Aku?", a: "bayangan", opts: ["Bayangan", "Bulan", "Cermin", "Kucing"] },
      { q: "Semakin banyak kamu ambil, semakin banyak tersisa. Aku?", a: "jejak kaki", opts: ["Jejak kaki", "Uang", "Waktu", "Napak"] },
      { q: "Aku punya leher tapi tidak punya kepala. Aku?", a: "botol", opts: ["Botol", "Kursi", "Meja", "Bantal"] },
    ],
    reward: { koin: 600, exp: 250, title: "Sage of Athena" },
  },
  {
    name: "Trial of Ares (Pertempuran)",
    god: "Ares",
    element: "Api",
    desc: "Pilih strategi tempur yang benar untuk menang 5 ronde simulasi.",
    type: "battle",
    questions: [
      { q: "Musuh bertahan kuat. Strategi terbaik?", a: "serang sisi lemah", opts: ["Serang sisi lemah", "Serang langsung", "Kabur", "Diam"] },
      { q: "Musuh punya serangan cepat. Apa yang kamu lakukan?", a: "tunggu timing counter", opts: ["Tunggu dan counter", "Serang duluan", "Kabur", "Diam"] },
      { q: "Kamu terluka parah. Pilihan terbaik?", a: "minum ramuan", opts: ["Minum ramuan", "Serang terus", "Kabur", "Diam"] },
      { q: "Musuh menggunakan sihir. Cara terbaik?", a: "gunakan tamu sihir", opts: ["Gunakan tameng sihir", "Serang fisik", "Kabur", "Diam"] },
      { q: "Musuh hampir kalah. Strategi akhir?", a: "serangan khusus", opts: ["Serangan khusus", "Serang biasa", "Kabur", "Diam"] },
    ],
    reward: { koin: 550, exp: 220, title: "Warrior of Ares" },
  },
  {
    name: "Trial of Hades (Kegelapan)",
    god: "Hades",
    element: "Gelap",
    desc: "Jawab 5 soal tentang kematian dan dunia bawah dalam mitologi.",
    type: "mythology",
    questions: [
      { q: "Dewa kematian Yunani?", a: "hades", opts: ["Hades", "Zeus", "Poseidon", "Apollo"] },
      { q: "Sungai di dunia bawah?", a: "styx", opts: ["Styx", "Nil", "Amazon", "Lethe"] },
      { q: "Penjaga gerbang underworld?", a: "cerberus", opts: ["Cerberus", "Minotaur", "Hydra", "Pegasus"] },
      { q: "Koin untuk penjaga sungai underworld?", a: "obol", opts: ["Obol", "Gold", "Silver", "Bronze"] },
      { q: "Dewa kematian Mesir?", a: "anubis", opts: ["Anubis", "Ra", "Horus", "Osiris"] },
    ],
    reward: { koin: 700, exp: 280, title: "Shadow of Hades" },
  },
  {
    name: "Trial of Poseidon (Lautan)",
    god: "Poseidon",
    element: "Air",
    desc: "Jawab 5 soal tentang lautan dan ilmu kelautan.",
    type: "ocean",
    questions: [
      { q: "Samudra terbesar di dunia?", a: "pasifik", opts: ["Pasifik", "Atlantik", "Hindia", "Arktik"] },
      { q: "Samudra terdalam?", a: "pasifik", opts: ["Pasifik", "Atlantik", "Hindia", "Selatan"] },
      { q: "Palung terdalam di dunia?", a: "mariana", opts: ["Mariana", "Jawa", "Puerto Rico", "Tonga"] },
      { q: "Hewan terbesar di lautan?", a: "paus biru", opts: ["Paus biru", "Hiu putih", "Gurita", "Lumba-lumba"] },
      { q: "Pasang surut disebabkan oleh?", a: "gravitasi bulan", opts: ["Gravitasi bulan", "Angin", "Matahari", "Gempa"] },
    ],
    reward: { koin: 650, exp: 260, title: "Tide Lord of Poseidon" },
  },
];

async function handler(m, { conn, text, args, usedPrefix, command }) {
  try {
    const db = await getDatabase();
    const sender = m.sender;
    const user = db.data.users?.[sender] || {};
    const sub = (args[0] || "").toLowerCase();

    // STATUS
    if (sub === "status" || sub === "cek") {
      const completed = user.trialsCompleted || [];
      let lines = [
        "STATUS TRIAL OF THE GODS",
        "",
        "Trial selesai: " + completed.length + "/" + TRIALS.length,
      ];
      TRIALS.forEach((t, i) => {
        const done = completed.includes(t.god);
        lines.push((i + 1) + ". " + t.name + (done ? " [SELESAI]" : ""));
      });
      lines.push("", "Titles earned:");
      if (completed.length > 0) {
        completed.forEach((god) => {
          const trial = TRIALS.find((t) => t.god === god);
          if (trial) lines.push("- " + trial.reward.title);
        });
      } else {
        lines.push("Belum ada");
      }
      lines.push("", "Ketik .rpgtrial untuk mulai ujian!");
      return m.reply(claraWrap("RPG Trial of Gods", lines));
    }

    // INFO
    if (sub === "info" || sub === "daftar") {
      let lines = ["DAFTAR TRIAL OF THE GODS", ""];
      TRIALS.forEach((t, i) => {
        lines.push((i + 1) + ". " + t.name);
        lines.push("   " + t.desc);
        lines.push("   Reward: " + t.reward.koin + " koin, " + t.reward.exp + " exp, " + t.reward.title);
        lines.push("");
      });
      lines.push("Semua soal harus benar! Tidak boleh salah satu pun.");
      return m.reply(claraWrap("RPG Trial of Gods", lines));
    }

    // START TRIAL
    if ((user.energi || 0) < pluginConfig.energi) {
      return m.reply(claraWrap("RPG Trial of Gods", "Energi kurang! Butuh " + pluginConfig.energi + " energi."));
    }

    const completed = user.trialsCompleted || [];

    // Pick first uncompleted trial
    const trial = TRIALS.find((t) => !completed.includes(t.god)) || TRIALS[0];

    if (completed.includes(trial.god)) {
      return m.reply(claraWrap("RPG Trial of Gods", "Kamu sudah menyelesaikan semua trial! Ketik .rpgtrial status untuk lihat."));
    }

    // Run trial
    let correctCount = 0;
    let lines = [
      "TRIAL OF THE GODS",
      "",
      "Ujian: " + trial.name,
      "Dewa: " + trial.god + " (" + trial.element + ")",
      "Aturan: " + trial.desc,
      "",
      "SOAL UJIAN:",
      "",
    ];

    trial.questions.forEach((q, i) => {
      lines.push("Soal " + (i + 1) + ": " + q.q);
      lines.push("A. " + q.opts[0]);
      lines.push("B. " + q.opts[1]);
      lines.push("C. " + q.opts[2]);
      lines.push("D. " + q.opts[3]);
      const correctIdx = q.opts.findIndex((o) => o.toLowerCase() === q.a.toLowerCase());
      lines.push("Jawaban: " + ["A", "B", "C", "D"][correctIdx] + ". " + q.a);
      if (correctIdx >= 0) correctCount++;
      lines.push("");
    });

    user.energi -= pluginConfig.energi;
    const passed = correctCount === trial.questions.length;

    if (passed) {
      user.koin = (user.koin || 0) + trial.reward.koin;
      user.exp = (user.exp || 0) + trial.reward.exp;
      if (!user.trialsCompleted) user.trialsCompleted = [];
      user.trialsCompleted.push(trial.god);
      if (!user.titles) user.titles = [];
      user.titles.push(trial.reward.title);
      if (user.exp >= (user.level || 1) * 200) {
        user.level = (user.level || 1) + 1;
      }

      lines.push("TRIAL LULUS!");
      lines.push("Reward: " + trial.reward.koin + " koin, " + trial.reward.exp + " exp");
      lines.push("Title: " + trial.reward.title);
      lines.push("Level: " + (user.level || 1));

      // Check if all completed
      if (user.trialsCompleted.length === TRIALS.length) {
        user.koin = (user.koin || 0) + 2000;
        user.exp = (user.exp || 0) + 1000;
        lines.push("", "SEMUA TRIAL SELESAI!");
        lines.push("Bonus: 2000 koin + 1000 exp");
        lines.push("Title: Champion of the Gods!");
        user.titles.push("Champion of the Gods");
      }
    } else {
      lines.push("TRIAL GAGAL!");
      lines.push("Benar: " + correctCount + "/" + trial.questions.length);
      lines.push("Semua harus benar untuk lulus!");
    }

    db.data.users[sender] = user;
    await db.save();

    lines.push("", "Energi tersisa: " + user.energi);
    lines.push("Trial selesai: " + (user.trialsCompleted?.length || 0) + "/" + TRIALS.length);

    return m.reply(claraWrap("RPG Trial of Gods", lines, passed ? "success" : "warn"));
  } catch (e) {
    console.error("[RPG Trial of Gods]", e);
    m.reply(claraWrap("RPG Trial of Gods", "Error: " + e.message));
  }
}

export { pluginConfig as config, handler };
