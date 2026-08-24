// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { claraWrap, tipText } from "../../src/lib/nova-menu-style.js";
import { callAI } from "../../src/lib/nova-ai-service.js";

const pluginConfig = {
  name: "skripsiku",
  alias: ["skripsi", "thesis", "judulkripsi", "ideasripsi"],
  category: "education",
  description: "Asisten skripsi AI - ide judul, outline bab, review struktur",
  usage: ".skripsiku <command> <input>",
  example: ".skripsiku ide Teknik Informatika\n.skripsiku outline sistem pakar",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 15,
  energi: 5,
  isEnabled: true,
};

async function handler(m, { sock, args, config: botConfig }) {
  const prefix = botConfig?.command?.prefix || ".";
  const sub = (args[0] || "").toLowerCase();
  const input = args.slice(1).join(" ").trim();

  // .skripsiku ide <bidang>
  if (sub === "ide" || sub === "judul") {
    if (!input) {
      return m.reply( claraWrap("Skripsiku - Ide Judul", [
        `Generate ide judul skripsi berdasarkan bidang.`,
        ``,
        `Contoh:`,
        `${prefix}skripsiku ide Teknik Informatika`,
        `${prefix}skripsiku ide Hukum Pidana`,
        `${prefix}skripsiku ide Manajemen Pemasaran`,
      ].join("\n")), { commandName: "skripsiku" });
    }

    await m.react("🐣");
    try {
      const prompt = `Kamu adalah dosen pembimbing skripsi berpengalaman di Indonesia. 
Generate 7 ide judul skripsi untuk bidang: "${input}".

Format:
1. Judul: [judul]
   Singkat: [penjelasan 1 kalimat]
   Metode: [metode penelitian]

Kriteria:
- Relevan dengan kondisi Indonesia
- Bisa diteliti dalam 6 bulan
- Variabel jelas dan terukur
- Jangan terlalu umum, spesifik`;

      const result = await callAI({ messages: [{ role: "user", content: prompt }], systemPrompt: "Kamu adalah dosen pembimbing skripsi di Indonesia. Gunakan bahasa Indonesia formal." });
      return m.reply( claraWrap("Skripsiku - Ide Judul", `${input}\n\n${result}`), { commandName: "skripsiku" });
    } catch (e) {
      return m.reply( claraWrap("Error", `Gagal generate: ${e.message}`), { commandName: "skripsiku" });
    }
  }

  // .skripsiku outline <topik>
  if (sub === "outline" || sub === "struktur") {
    if (!input) {
      return m.reply( claraWrap("Skripsiku - Outline", [
        `Generate outline bab 1-5 berdasarkan topik.`,
        ``,
        `Contoh:`,
        `${prefix}skripsiku outline sistem pakar diagnosis penyakit`,
        `${prefix}skripsiku outline pengaruh media sosial terhadap minat belajar`,
      ].join("\n")), { commandName: "skripsiku" });
    }

    await m.react("🐣");
    try {
      const prompt = `Buat outline skripsi lengkap (Bab 1-5) untuk topik: "${input}".

Format per bab:
BAB X: [Nama Bab]
1. [Sub-bab] - [penjelasan singkat apa yang dibahas]
2. [Sub-bab]
...

Sesuaikan dengan standar skripsi Indonesia. Bab 3 harus sesuai jenis penelitian (kualitatif/kuantitatif/R&D).`;

      const result = await callAI({ messages: [{ role: "user", content: prompt }], systemPrompt: "Kamu adalah dosen pembimbing skripsi di Indonesia. Gunakan bahasa Indonesia formal." });
      return m.reply( claraWrap("Skripsiku - Outline", `${input}\n\n${result}`), { commandName: "skripsiku" });
    } catch (e) {
      return m.reply( claraWrap("Error", `Gagal generate: ${e.message}`), { commandName: "skripsiku" });
    }
  }

  // .skripsiku review <teks paragraf>
  if (sub === "review" || sub === "cek") {
    if (!input) {
      return m.reply( claraWrap("Skripsiku - Review", [
        `Review paragraf skripsi (struktur, bahasa, logika).`,
        ``,
        `Contoh:`,
        `${prefix}skripsiku review <tempel paragraf>`,
      ].join("\n")), { commandName: "skripsiku" });
    }

    await m.react("🐣");
    try {
      const prompt = `Review paragraf skripsi berikut. Beri penilaian dan saran perbaikan.

Paragraf:
"${input}"

Format:
1. Bahasa: [baik/perlu perbaikan] - [saran]
2. Struktur: [baik/perlu perbaikan] - [saran]
3. Logika: [baik/perlu perbaikan] - [saran]
4. Referensi: [saran jika perlu]
5. Revisi: [versi paragraf yang sudah diperbaiki]`;

      const result = await callAI({ messages: [{ role: "user", content: prompt }], systemPrompt: "Kamu adalah reviewer skripsi di Indonesia. Gunakan bahasa Indonesia formal." });
      return m.reply( claraWrap("Skripsiku - Review", result), { commandName: "skripsiku" });
    } catch (e) {
      return m.reply( claraWrap("Error", `Gagal review: ${e.message}`), { commandName: "skripsiku" });
    }
  }

  // .skripsiku referensi <topik>
  if (sub === "referensi" || sub === "sumber") {
    if (!input) {
      return m.reply( claraWrap("Skripsiku - Referensi", [
        `Saran referensi pendukung untuk topik.`,
        ``,
        `Contoh:`,
        `${prefix}skripsiku referensi deep learning`,
      ].join("\n")), { commandName: "skripsiku" });
    }

    await m.react("🐣");
    try {
      const prompt = `Beri 7 saran referensi (jurnal, buku, atau website) untuk topik: "${input}".

Format:
1. [Penulis] ([Tahun]). [Judul]. [Sumber/Jurnal]
   Relevansi: [kenapa relevan]

Minimal 3 referensi jurnal internasional, sisanya bebas (buku/web akademik).`;

      const result = await callAI({ messages: [{ role: "user", content: prompt }], systemPrompt: "Kamu adalah dosen pembimbing skripsi di Indonesia. Gunakan bahasa Indonesia formal." });
      return m.reply( claraWrap("Skripsiku - Referensi", `${input}\n\n${result}`), { commandName: "skripsiku" });
    } catch (e) {
      return m.reply( claraWrap("Error", `Gagal: ${e.message}`), { commandName: "skripsiku" });
    }
  }

  // Default: help
  const txt = claraWrap("Skripsiku - Asisten Skripsi AI", [
    `Bantuan skripsi pakai AI (ide judul, outline, review, referensi)`,
    ``,
    `Perintah:`,
    `1. ${prefix}skripsiku ide <bidang> - Generate ide judul`,
    `2. ${prefix}skripsiku outline <topik> - Outline Bab 1-5`,
    `3. ${prefix}skripsiku review <paragraf> - Review paragraf`,
    `4. ${prefix}skripsiku referensi <topik> - Saran referensi`,
  ].join("\n")) + "\n" + tipText(`Contoh: ${prefix}skripsiku ide Teknik Informatika`);
  return m.reply( txt, { commandName: "skripsiku" });
}

export { pluginConfig as config, handler };
