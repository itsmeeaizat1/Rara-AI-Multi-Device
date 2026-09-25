// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { novaError, novaEmpty, novaGuide, novaNoInput, claraWrap, tipText } from "../../src/lib/nova-menu-style.js";
import { callAI } from "../../src/lib/nova-ai-service.js";

const pluginConfig = {
  name: "tutorku",
  alias: ["tutorku"],
  category: "education",
  description: "AI Tutor per mata kuliah - penjelasan, latihan soal, dan tanya jawab",
  usage: ".tutorku <mata kuliah> <pertanyaan>",
  example: ".tutorku matematika turunan\n.tutorku hukum asas hukum\n.tutorku ekonomi inflasi",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 10,
  energi: 4,
  isEnabled: true,
};

// Mata kuliah yang didukung dengan system prompt khusus
const SUBJECTS = {
  matematika: {
    label: "Matematika",
    prompt: "Kamu adalah dosen Matematika di perguruan tinggi Indonesia. Jelaskan konsep matematika dengan jelas, berikan contoh soal, dan langkah penyelesaian yang detail. Gunakan notasi matematika yang mudah dibaca di teks WhatsApp.",
  },
  fisika: {
    label: "Fisika",
    prompt: "Kamu adalah dosen Fisika di perguruan tinggi Indonesia. Jelaskan konsep fisika dengan analogi yang mudah dipahami, berikan rumus dan contoh soal. Gunakan satuan SI.",
  },
  kimia: {
    label: "Kimia",
    prompt: "Kamu adalah dosen Kimia di perguruan tinggi Indonesia. Jelaskan reaksi, rumus kimia, dan konsep dengan struktur yang jelas. Berikan contoh dari kehidupan sehari-hari.",
  },
  biologi: {
    label: "Biologi",
    prompt: "Kamu adalah dosen Biologi di perguruan tinggi Indonesia. Jelaskan konsep biologi dengan analogi, gambaran struktur, dan contoh nyata. Tekankan pemahaman konsep.",
  },
  hukum: {
    label: "Ilmu Hukum",
    prompt: "Kamu adalah dosen Hukum di perguruan tinggi Indonesia. Jelaskan konsep hukum dengan rujukan UU/putusan yang relevan. Gunakan bahasa hukum yang tepat namun mudah dipahami.",
  },
  ekonomi: {
    label: "Ilmu Ekonomi",
    prompt: "Kamu adalah dosen Ekonomi di perguruan tinggi Indonesia. Jelaskan konsep ekonomi dengan data dan contoh Indonesia. Bedakan mikro vs makro dengan jelas.",
  },
  akuntansi: {
    label: "Akuntansi",
    prompt: "Kamu adalah dosen Akuntansi di perguruan tinggi Indonesia. Jelaskan konsep akuntansi dengan contoh jurnal, laporan keuangan, dan standar PSAK. Beri langkah perhitungan.",
  },
  manajemen: {
    label: "Manajemen",
    prompt: "Kamu adalah dosen Manajemen di perguruan tinggi Indonesia. Jelaskan teori manajemen dengan contoh kasus bisnis Indonesia. Hubungkan dengan praktik nyata.",
  },
  informatika: {
    label: "Teknik Informatika",
    prompt: "Kamu adalah dosen Teknik Informatika di perguruan tinggi Indonesia. Jelaskan konsep IT/algoritma dengan kode contoh jika perlu. Gunakan bahasa yang teknis tapi terstruktur.",
  },
  sastra: {
    label: "Sastra/Bahasa",
    prompt: "Kamu adalah dosen Sastra dan Bahasa di perguruan tinggi Indonesia. Jelaskan teori sastra, analisis teks, dan tata bahasa dengan contoh. Hubungkan dengan konteks budaya Indonesia.",
  },
  sosiologi: {
    label: "Sosiologi",
    prompt: "Kamu adalah dosen Sosiologi di perguruan tinggi Indonesia. Jelaskan teori sosiologi dengan contoh fenomena sosial di Indonesia. Gunakan pendekatan analitis.",
  },
  psikologi: {
    label: "Psikologi",
    prompt: "Kamu adalah dosen Psikologi di perguruan tinggi Indonesia. Jelaskan teori psikologi dengan contoh kasus. Bedakan teori populer vs ilmiah.",
  },
  statistika: {
    label: "Statistika",
    prompt: "Kamu adalah dosen Statistika di perguruan tinggi Indonesia. Jelaskan konsep statistik dengan langkah perhitungan, rumus, dan interpretasi hasil. Beri contoh data.",
  },
  sejarah: {
    label: "Sejarah",
    prompt: "Kamu adalah dosen Sejarah di perguruan tinggi Indonesia. Jelaskan peristiwa sejarah dengan konteks, kronologi, dan dampak. Hubungkan dengan Indonesia.",
  },
  kedokteran: {
    label: "Kedokteran",
    prompt: "Kamu adalah dosen Kedokteran di perguruan tinggi Indonesia. Jelaskan konsep medis dengan terminologi yang tepat, mekanisme penyakit, dan pendekatan klinis.",
  },
};

function findSubject(input) {
  const lower = input.toLowerCase().trim();
  // Exact match
  if (SUBJECTS[lower]) return { key: lower, ...SUBJECTS[lower] };
  // Partial match
  for (const [key, val] of Object.entries(SUBJECTS)) {
    if (lower.includes(key) || key.includes(lower)) return { key, ...val };
    if (lower.includes(val.label.toLowerCase()) || val.label.toLowerCase().includes(lower)) return { key, ...val };
  }
  return null;
}

async function handler(m, { sock, args, config: botConfig }) {
  const prefix = botConfig?.command?.prefix || ".";
  const fullInput = args.join(" ").trim();

  // .tutorku list - show available subjects
  if ((args[0] || "").toLowerCase() === "list" || (args[0] || "").toLowerCase() === "daftar") {
    const subjectList = Object.values(SUBJECTS).map((s, i) => `${i + 1}. ${s.label}`).join("\n");
    return m.reply( claraWrap("Tutorku - Mata Kuliah", [
      `${Object.keys(SUBJECTS).length} mata kuliah tersedia:`,
      ``,
      subjectList,
      ``,
      `Cara pakai: ${prefix}tutorku <mata kuliah> <pertanyaan>`,
      `Contoh: ${prefix}tutorku matematika turunan`,
    ].join("\n")), { commandName: "tutorku" });
  }

  if (!fullInput) {
    const subjectList = Object.values(SUBJECTS).map((s, i) => `${i + 1}. ${s.label}`).join("\n");
    return m.reply( claraWrap("Tutorku - AI Tutor", [
      `AI tutor untuk bantu belajar mata kuliah.`,
      ``,
      `Cara pakai: ${prefix}tutorku <mata kuliah> <pertanyaan>`,
      ``,
      `Mata kuliah tersedia:`,
      subjectList,
      ``,
      `Contoh: ${prefix}tutorku matematika turunan`,
    ].join("\n")) + "\n" + tipText("AI akan jawab sesuai konteks mata kuliah"), { commandName: "tutorku" });
  }

  // Parse: first word = subject, rest = question
  const subject = findSubject(args[0]);
  if (!subject) {
    const subjectList = Object.values(SUBJECTS).map(s => s.label).join(", ");
    return m.reply( claraWrap("Tutorku", [
      `Mata kuliah "${args[0]}" tidak ditemukan.`,
      ``,
      `Tersedia: ${subjectList}`,
      ``,
      `Ketik ${prefix}tutorku list untuk daftar lengkap`,
    ].join("\n")), { commandName: "tutorku" });
  }

  const question = args.slice(1).join(" ").trim();
  if (!question) {
    return m.reply( claraWrap("Tutorku", [
      `Mata kuliah: ${subject.label}`,
      `Tulis pertanyaan kamu setelah nama mata kuliah.`,
      ``,
      `Contoh: ${prefix}tutorku ${subject.key} <pertanyaan>`,
    ].join("\n")), { commandName: "tutorku" });
  }
  try {
    const prompt = `Pertanyaan mahasiswa: "${question}"

Jawab dengan format:
1. Penjelasan singkat konsep (2-3 kalimat)
2. Penjelasan detail dengan contoh
3. Contoh soal + jawaban (jika relevan)
4. Tips belajar untuk topik ini

Sesuaikan level dengan mahasiswa S1 Indonesia.`;

    const result = await callAI({ messages: [{ role: "user", content: prompt }], systemPrompt: subject.prompt });
    return m.reply( claraWrap(`Tutorku - ${subject.label}`, result), { commandName: "tutorku" });
  } catch (e) {
    return m.reply( novaError("Tutorku", `Gagal nih: ${e.message}`), { commandName: "tutorku" });
  }
}

export { pluginConfig as config, handler };
