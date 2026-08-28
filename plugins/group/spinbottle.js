// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { getDatabase } from "../../src/lib/nova-database.js";
import { claraWrap, novaError, novaEmpty, novaGuide, novaNoInput } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "spinbottle",
  alias: ["spinbottle"],
  aliases: ["spinbottle", "bottle", "putarbotol"],
  category: "group",
  description: "Spin the Bottle - putar botol, dapet member random, truth/dare",
  usage: ".spinbottle spin | .spinbottle truth | .spinbottle dare | .spinbottle stop",
  isGroupOnly: true,
};

const TRUTH_QUESTIONS = [
  "Apa rahasia yang belum pernah kamu ceritakan ke siapapun?",
  "Siapa orang di grup ini yang paling kamu suka?",
  "Hal paling memalukan yang pernah kamu lakukan?",
  "Kapan terakhir kali kamu bohong dan apa yang kamu bohongi?",
  "Siapa di grup ini yang menurutmu paling menarik?",
  "Apa ketakutan terbesar kamu?",
  "Hal paling childish yang masih kamu lakukan sampai sekarang?",
  "Pernah naksir teman sendiri? Ceritakan.",
  "Apa hal yang paling bikin kamu insecure?",
  "Siapa orang yang paling sering kamu pikirin?",
  "Pernah ketahuan ngapain sama orang tua?",
  "Apa impian kamu yang belum tercapai?",
  "Hal paling reckless yang pernah kamu lakukan?",
  "Pernah crying karena hal kecil? Apa?",
  "Siapa di grup ini yang paling kamu percaya?",
];

const DARE_CHALLENGES = [
  "Kirim voice note nyanyi lagu nasional",
  "Ganti profile picture jadi meme selama 1 jam",
  "Kirim pesan 'Aku suka kamu' ke random contact",
  "Bikin puisi tentang member sebelah kirimuin ke grup",
  "Post story 'Aku sedang galau' tanpa alasan",
  "Kirim foto selfie dengan filter jelek",
  "Panggil member acak dengan sebutan 'Sayang' selama 5 menit",
  "Ceritakan mimpi teraneh kamu dalam VN",
  "React semua pesan di grup dengan emoji lucu",
  "Ganti nama di grup jadi 'Si Ganteng/Cantik' selama 1 jam",
  "Kirim stiker paling jelek yang kamu punya",
  "Bikin akrostik dari nama member random",
  "Kirim pesan ke 3 contact: 'Lagi apa?' tanpa context",
  "Rekam VN kartun sapaan ke semua member grup",
  "Post 'I love you all' di grup dan tunggu reaksi",
];

async function handler(m, { conn, text, args, usedPrefix, command }) {
  try {
    const db = await getDatabase();
    const groupId = m.key.remoteJid;
    const sender = m.key.participant || m.sender;
    const sub = (args[0] || "").toLowerCase();

    if (!db.data.spinBottle) db.data.spinBottle = {};
    if (!db.data.spinBottle[groupId]) {
      db.data.spinBottle[groupId] = { active: false, target: null, spinner: null, phase: "idle", turns: 0 };
      await db.save();
    }

    const game = db.data.spinBottle[groupId];

    if (sub === "spin") {
      const meta = await conn.groupMetadata(groupId).catch(() => null);
      if (!meta) return m.reply(novaError("Spin Bottle", "Gagal mengambil data/info grup nih."));
      const participants = meta.participants.map(p => p.id).filter(id => id !== conn.user?.id);
      if (participants.length < 2) return m.reply(novaError("Spin Bottle", "Minimal butuh 2 member di grup untuk putar botol ya!"));

      const randomTarget = participants[Math.floor(Math.random() * participants.length)];
      game.active = true;
      game.target = randomTarget;
      game.spinner = sender;
      game.phase = "choose";
      game.turns++;
      await db.save();

      const spins = Math.floor(Math.random() * 5) + 3;
      return m.reply(claraWrap("Spin The Bottle", [
        `Botol diputar ${spins}x...`,
        `Dan mendarat di: @${randomTarget.split("@")[0]}`,
        "",
        `@${randomTarget.split("@")[0]}, pilih:`,
        `${usedPrefix}spinbottle truth (jujur)`,
        `${usedPrefix}spinbottle dare (tantangan)`,
      ].join("\n")));
    }

    if (sub === "truth") {
      if (!game.active || game.target !== sender) return m.reply(novaError("Spin Bottle", "Bukan giliranmu untuk pilih truth/dare nih!"));
      const q = TRUTH_QUESTIONS[Math.floor(Math.random() * TRUTH_QUESTIONS.length)];
      game.phase = "answered";
      await db.save();
      return m.reply(claraWrap("Spin The Bottle", [
        `Truth untuk @${sender.split("@")[0]}:`,
        "",
        `"${q}"`,
        "",
        "Jawab jujur ya!",
      ].join("\n")));
    }

    if (sub === "dare") {
      if (!game.active || game.target !== sender) return m.reply(novaError("Spin Bottle", "Bukan giliranmu untuk pilih truth/dare nih!"));
      const d = DARE_CHALLENGES[Math.floor(Math.random() * DARE_CHALLENGES.length)];
      game.phase = "answered";
      await db.save();
      return m.reply(claraWrap("Spin The Bottle", [
        `Dare untuk @${sender.split("@")[0]}:`,
        "",
        `"${d}"`,
        "",
        "Kerjakan tantangannya!",
      ].join("\n")));
    }

    if (sub === "next") {
      if (!game.active) return m.reply(novaEmpty("Spin Bottle", "Tidak ada permainan Spin Bottle yang aktif nih."));
      game.phase = "idle";
      game.target = null;
      await db.save();
      return m.reply(claraWrap("Spin The Bottle", `Giliran selesai. Spin lagi: ${usedPrefix}spinbottle spin`));
    }

    if (sub === "stop") {
      game.active = false;
      game.target = null;
      game.spinner = null;
      game.phase = "idle";
      game.turns = 0;
      await db.save();
      return m.reply(claraWrap("Spin The Bottle", "Game dihentikan."));
    }

    if (sub === "status") {
      return m.reply(claraWrap("Spin The Bottle", [
        `Status: ${game.active ? "AKTIF" : "MATI"}`,
        `Turns: ${game.turns}`,
        game.target ? `Target: @${game.target.split("@")[0]}` : "Target: -",
      ].join("\n")));
    }

    return m.reply(claraWrap("Spin The Bottle", [
      `Spin The Bottle - Putar botol, truth or dare`,
      "",
      `Command:`,
      `1. ${usedPrefix}spinbottle spin - Putar botol`,
      `2. ${usedPrefix}spinbottle truth - Pilih truth`,
      `3. ${usedPrefix}spinbottle dare - Pilih dare`,
      `4. ${usedPrefix}spinbottle next - Lanjut spin`,
      `5. ${usedPrefix}spinbottle stop - Stop game`,
    ].join("\n")));
  } catch (e) {
    console.error("spinbottle error:", e);
    return m.reply(novaError("Spin Bottle", `Terjadi kesalahan: ${e.message}`));
  }
}

export { pluginConfig as config, handler };