// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import fs from "fs";
import path from "path";
import { sendReplyWithNav } from "../../src/lib/nova-nav-buttons.js";
import { getDatabase } from "../../src/lib/nova-database.js";
import { pendingConfessions, cleanExpired } from "./jadianmatch.js";
import { separator, tipText, claraWrap } from "../../src/lib/nova-menu-style.js";

// VN files (put files in assets/vn/)
const VN_DIR = path.join(process.cwd(), "assets", "audio");
const VN_MAU_JADIAN = "vn_mau_jadian.mp3"; // VN saat jadian diterima

const pluginConfig = {
  name: "terimamatch",
  alias: ["terimamatch"],
  category: "game",
  description: "Terima confession jadian (pacaran)",
  usage: ".terimamatch",
  example: ".terimamatch",
  isOwner: false,
  isPremium: false,
  isGroup: true,
  isPrivate: false,
  cooldown: 5,
  energi: 0,
  isEnabled: true,
};

const ACCEPT_QUOTES = [
  "Gue mau! Dari sekian banyak orang, gue pilih lu buat bareng.",
  "Akhirnya lu bilang juga. Gue udah nunggu ini dari lama.",
  "Gue mau jadi alasan lu tersenyum, dan alasan lu balik lagi kalo lu sedih.",
  "Jujur, gue juga suka sama lu. Tinggal lu bilang aja, gue langsung mau.",
  "Gue nggak butuh waktu buat mikir, jawaban gue: mau, seratus persen mau.",
  "Dari semua tembakan yang pernah gue denger, ini yang paling bikin gue mau.",
  "Lu nembak, gue kena. Lu nanya mau nggak, gue jawab: mau banget.",
];

const ACCEPT_DECOR = [
  "🌸💕🌸💕🌸",
  "✨💗✨💗✨",
  "🌹💕🌹💕🌹",
  "💫💖💫💖💫",
];

async function handler(m, { sock, config: botConfig }) {
  try {
    const prefix = botConfig.command?.prefix || ".";
    const db = getDatabase();

    cleanExpired();
    const confession = pendingConfessions.get(m.sender);

    if (!confession) {
      const text =
        claraWrap("Tidak Ada Confession", [
          "◦ Nggak ada yang nembak kamu saat ini",
          "◦ Atau confession sudah expired (5 menit)",
        ].join("\n")) + "\n" +
        tipText("Sabar ya, jodong nggak kemana");

      await sendReplyWithNav(sock, m, text, "terimamatch");
      return { handled: true };
    }

    if (confession.groupId !== m.chat) {
      const text =
        claraWrap("Salah Tempat", [
          "◦ Confession harus dijawab di grup yang sama",
        ].join("\n")) + "\n" +
        tipText("Balas di grup tempat kamu ditembak");

      await sendReplyWithNav(sock, m, text, "terimamatch");
      return { handled: true };
    }

    const confessorJid = confession.confessor;
    const confessorName = confession.confessorName;
    const targetName = confession.targetName;

    const confessorUser = db.getUser(confessorJid);
    const targetUser = db.getUser(m.sender);
    if (!confessorUser.rpg) confessorUser.rpg = {};
    if (!targetUser.rpg) targetUser.rpg = {};

    // Validasi status
    if (confessorUser.rpg.dating) {
      pendingConfessions.delete(m.sender);
      const text = claraWrap("Maaf", [
        confessorName + " sudah jadian dengan orang lain",
      ].join("\n"));
      await sendReplyWithNav(sock, m, text, "terimamatch");
      return { handled: true };
    }

    if (targetUser.rpg.dating) {
      pendingConfessions.delete(m.sender);
      const text = claraWrap("Sudah Jadian", [
        "◦ Kamu sudah jadian dengan orang lain!",
        "◦ Putus dulu dengan *" + prefix + "putus*",
      ].join("\n"));
      await sendReplyWithNav(sock, m, text, "terimamatch");
      return { handled: true };
    }

    if (confessorUser.rpg.spouse || targetUser.rpg.spouse) {
      pendingConfessions.delete(m.sender);
      const text = claraWrap("Sudah Menikah", [
        "◦ Ada salah satu pihak yang sudah menikah!",
      ].join("\n"));
      await sendReplyWithNav(sock, m, text, "terimamatch");
      return { handled: true };
    }

    // Finalize jadian
    const now = Date.now();
    confessorUser.rpg.dating = m.sender;
    confessorUser.rpg.datingAt = now;
    confessorUser.rpg.partner = targetName;

    targetUser.rpg.dating = confessorJid;
    targetUser.rpg.datingAt = now;
    targetUser.rpg.partner = confessorName;

    db.save();
    pendingConfessions.delete(m.sender);

    const dateStr = new Date(now).toLocaleDateString("id-ID", {
      day: "numeric", month: "long", year: "numeric",
    });
    const quote = ACCEPT_QUOTES[Math.floor(Math.random() * ACCEPT_QUOTES.length)];
    const decor = ACCEPT_DECOR[Math.floor(Math.random() * ACCEPT_DECOR.length)];

    let text = "";
    text += decor + "\n";
    text += "💕 *JADIAN RESMI* 💕\n";
    text += decor + "\n\n";
    text += "@" + confessorJid.split("@")[0] + " 💑 @" + m.sender.split("@")[0] + "\n\n";
    text += "“" + quote + "”\n\n";
    text += separator("─", 30) + "\n";
    text += "👤 Cowok   : *" + confessorName + "*\n";
    text += "👥 Cewek   : *" + targetName + "*\n";
    text += "📅 Tanggal : " + dateStr + "\n";
    text += "💖 Status  : *Pacaran*\n";
    text += separator("─", 30) + "\n\n";
    text += "🌹 Selamat jadian! Semoga langgeng! 🌹\n\n";
    text += decor + "\n";
    text += tipText("Ketik " + prefix + "couple untuk cek status");
    text += "\n" + tipText("Ketik " + prefix + "putus untuk putus");

    await sock.sendMessage(m.chat, { text: text, mentions: [confessorJid, m.sender] });

    // Kirim VN musik romantis (jika file ada)
    try {
      const vnPath = path.join(VN_DIR, VN_MAU_JADIAN);
      if (fs.existsSync(vnPath)) {
        const vnBuffer = fs.readFileSync(vnPath);
        await sock.sendMessage(m.chat, {
          audio: vnBuffer,
          mimetype: "audio/mpeg",
          ptt: true,
        });
      }
    } catch (e) {
      console.log("[mau.js] VN error:", e.message);
    }

    return { handled: true };
  } catch (error) {
    await m.reply("Error: " + error.message);
    return { handled: true };
  }
}

export { pluginConfig as config, handler };
