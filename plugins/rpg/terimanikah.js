// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import fs from "fs";
import { toVoiceNote } from "../../src/lib/nova-ffmpeg.js";
import path from "path";
import { sendReplyWithNav } from "../../src/lib/nova-nav-buttons.js";
import { getDatabase } from "../../src/lib/nova-database.js";
import { separator,
  tipText,  claraWrap } from "../../src/lib/nova-menu-style.js";
import { pendingProposals, cleanExpired } from "./nikahmatch.js";

// VN files for romantic moments (put files in assets/vn/)
const VN_DIR = path.join(process.cwd(), "assets", "audio");
const VN_NIKAH = "vn_nikah_romantis.mp3"; // VN saat nikah diterima

const pluginConfig = {
  name: "terimanikah",
  alias: ["terimanikah"],
  category: "game",
  description: "Terima lamaran nikah",
  usage: ".terimanikah",
  example: ".terimanikah",
  isOwner: false,
  isPremium: false,
  isGroup: true,
  isPrivate: false,
  cooldown: 5,
  energi: 0,
  isEnabled: true,
};

const ACCEPT_QUOTES = [
  "Aku mau jadi alasan kamu tersenyum setiap hari.",
  "Dari semua yang datang, kamu yang aku pilih untuk tetap.",
  "Kalo sama kamu, aku nggak butuh alasan buat bahagia.",
  "Aku terima kamu apa adanya, dan aku janji buat jadi lebih baik setiap hari.",
  "Kamu bukan cuma pilihan, kamu tempat pulang aku.",
  "Mau nggak jadi cerita favoritku sampai akhir hayat?",
];

const ACCEPT_DECOR = [
  "🌹🥰🌹🥰🌹",
  "✨💕✨💕✨",
  "💎💑💎💑💎",
  "🌸💍🌸💍🌸",
];

async function handler(m, { sock, config: botConfig }) {
  try {
    const prefix = botConfig.command?.prefix || ".";
    const db = getDatabase();

    cleanExpired();
    const proposal = pendingProposals.get(m.sender);

    if (!proposal) {
      const text =
        claraWrap("Tidak Ada Lamaran", ["  ┊  ➶ Kamu tidak punya lamaran nikah yang menunggu",
          "  ┊  ➶ Atau lamaran sudah expired (5 menit)"].join("\n")) + "\n" +
        tipText("Tunggu seseorang melamar kamu");

      await sendReplyWithNav(sock, m, text, "terimanikah");
      return { handled: true };
    }

    if (proposal.groupId !== m.chat) {
      const text =
        claraWrap("Salah Tempat", ["  ┊  ➶ Lamaran harus dijawab di grup yang sama"].join("\n")) + "\n" +
        tipText("Balas di grup tempat kamu dilamar");

      await sendReplyWithNav(sock, m, text, "terimanikah");
      return { handled: true };
    }

    const proposerJid = proposal.proposer;
    const proposerName = proposal.proposerName;
    const targetName = proposal.targetName;

    const proposerUser = db.getUser(proposerJid);
    const targetUser = db.getUser(m.sender);
    if (!proposerUser.rpg) proposerUser.rpg = {};
    if (!targetUser.rpg) targetUser.rpg = {};

    if (proposerUser.rpg.spouse) {
      pendingProposals.delete(m.sender);
      const text = claraWrap("Maaf", ["  ┊  ➶ " + proposerName + " sudah menikah dengan orang lain"].join("\n"));
      await sendReplyWithNav(sock, m, text, "terimanikah");
      return { handled: true };
    }

    if (targetUser.rpg.spouse) {
      pendingProposals.delete(m.sender);
      const text = claraWrap("Sudah Menikah", ["  ┊  ➶ Kamu sudah menikah!"].join("\n"));
      await sendReplyWithNav(sock, m, text, "terimanikah");
      return { handled: true };
    }

    // Finalize marriage
    const now = Date.now();
    proposerUser.rpg.spouse = m.sender;
    proposerUser.rpg.marriedAt = now;
    proposerUser.rpg.partner = targetName;
    if (proposerUser.rpg.dating) proposerUser.rpg.dating = null;
    if (proposerUser.rpg.datingAt) proposerUser.rpg.datingAt = null;

    targetUser.rpg.spouse = proposerJid;
    targetUser.rpg.marriedAt = now;
    targetUser.rpg.partner = proposerName;
    if (targetUser.rpg.dating) targetUser.rpg.dating = null;
    if (targetUser.rpg.datingAt) targetUser.rpg.datingAt = null;

    db.save();
    pendingProposals.delete(m.sender);

    const dateStr = new Date(now).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
    const quote = ACCEPT_QUOTES[Math.floor(Math.random() * ACCEPT_QUOTES.length)];
    const decor = ACCEPT_DECOR[Math.floor(Math.random() * ACCEPT_DECOR.length)];

    let text = "";
    text += decor + "\n";
    text += "🎉 *SELAMAT MENIKAH* 🎉\n";
    text += decor + "\n\n";
    text += "@" + proposerJid.split("@")[0] + " 💑 @" + m.sender.split("@")[0] + "\n\n";
    text += "“" + quote + "”\n\n";
    text += separator("─", 30) + "\n";
    text += "👤 Mempelai : *" + proposerName + "*\n";
    text += "👥 Pasangan : *" + targetName + "*\n";
    text += "📅 Tanggal  : " + dateStr + "\n";
    text += "💍 Status   : *Resmi Menikah*\n";
    text += "✨ Bonus    : *+5% EXP* buat semua aktivitas RPG\n";
    text += separator("─", 30) + "\n\n";
    text += "🌹 Semoga langgeng dan bahagia selalu! 🌹\n\n";
    text += decor + "\n";
    text += tipText("Ketik " + prefix + "couple untuk cek status");
    text += "\n" + tipText("Ketik " + prefix + "dbcouple untuk lihat leaderboard");

    await sock.sendMessage(m.chat, { text: text, mentions: [proposerJid, m.sender] });

    // Kirim VN musik romantis (jika file ada)
    try {
      const vnPath = path.join(VN_DIR, VN_NIKAH);
      if (fs.existsSync(vnPath)) {
        const vnBuffer = fs.readFileSync(vnPath);
        await sock.sendMessage(m.chat, {
          audio: await toVoiceNote(vnBuffer),
          mimetype: "audio/ogg; codecs=opus",
          ptt: true,
        });
      }
    } catch (e) {
      console.log("[terima.js] VN error:", e.message);
    }

    return { handled: true };
  } catch (error) {
    await m.reply("Error: " + error.message);
    return { handled: true };
  }
}

export { pluginConfig as config, handler };
