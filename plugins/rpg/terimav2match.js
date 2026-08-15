// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import fs from "fs";
import path from "path";
import { sendReplyWithNav } from "../../src/lib/nova-nav-buttons.js";
import { getDatabase } from "../../src/lib/nova-database.js";
import { pendingConfessionsV2, cleanExpired } from "./jadianv2match.js";
import { separator, tipText, claraWrap } from "../../src/lib/nova-menu-style.js";

// VN files (put files in assets/vn/)
const VN_DIR = path.join(process.cwd(), "assets", "audio");
const VN_MAU_V2 = "vn_mau_v2.mp3"; // VN saat jadian v2 diterima

const pluginConfig = {
  name: "terimav2match",
  alias: ["terimav2match"],
  category: "game",
  description: "Terima confession jadian V2 (pacaran)",
  usage: ".terimav2match",
  example: ".terimav2match",
  isOwner: false,
  isPremium: false,
  isGroup: true,
  isPrivate: false,
  cooldown: 5,
  energi: 0,
  isEnabled: true,
};

const ACCEPT_QUOTES_V2 = [
  "Aku mau! Bukan karena terpaksa, tapi karena kamu memang yang aku tunggu.",
  "Akhirnya kamu bilang juga. Aku udah nunggu momen ini dari lama.",
  "Aku mau jadi alasan kamu tersenyum, dan alasan kamu balik lagi kalo kamu sedih.",
  "Jujur, aku juga suka sama kamu dari awal. Tinggal kamu bilang aja, aku langsung mau.",
  "Aku nggak butuh waktu buat mikir, jawaban aku: mau, seratus persen mau.",
  "Di dunia yang serba nggak pasti, aku yakin mau sama kamu.",
  "Kamu nembak, aku kena. Kamu nanya mau nggak, aku jawab: mau banget.",
];

const ACCEPT_DECOR_V2 = [
  "💫💝💫💝💫",
  "🌸💖🌸💖🌸",
  "✨💘✨💘✨",
  "🌹💗🌹💗🌹",
];

async function handler(m, { sock, config: botConfig }) {
  try {
    const prefix = botConfig.command?.prefix || ".";
    const db = getDatabase();

    cleanExpired();
    const confession = pendingConfessionsV2.get(m.sender);

    if (!confession) {
      const text =
        claraWrap("Tidak Ada Confession V2", [
          "◦ Nggak ada yang nembak kamu (V2) saat ini",
          "◦ Atau confession sudah expired (5 menit)",
        ].join("\n")) + "\n" +
        tipText("Sabar ya, jodong nggak kemana");

      await sendReplyWithNav(sock, m, text, "terimav2match");
      return { handled: true };
    }

    if (confession.groupId !== m.chat) {
      const text =
        claraWrap("Salah Tempat", [
          "◦ Confession V2 harus dijawab di grup yang sama",
        ].join("\n")) + "\n" +
        tipText("Balas di grup tempat kamu ditembak");

      await sendReplyWithNav(sock, m, text, "terimav2match");
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
      pendingConfessionsV2.delete(m.sender);
      const text = claraWrap("Maaf", [
        confessorName + " sudah jadian dengan orang lain",
      ].join("\n"));
      await sendReplyWithNav(sock, m, text, "terimav2match");
      return { handled: true };
    }

    if (targetUser.rpg.dating) {
      pendingConfessionsV2.delete(m.sender);
      const text = claraWrap("Sudah Jadian", [
        "◦ Kamu sudah jadian dengan orang lain!",
        "◦ Putus dulu dengan *" + prefix + "putus*",
      ].join("\n"));
      await sendReplyWithNav(sock, m, text, "terimav2match");
      return { handled: true };
    }

    if (confessorUser.rpg.spouse || targetUser.rpg.spouse) {
      pendingConfessionsV2.delete(m.sender);
      const text = claraWrap("Sudah Menikah", [
        "◦ Ada salah satu pihak yang sudah menikah!",
      ].join("\n"));
      await sendReplyWithNav(sock, m, text, "terimav2match");
      return { handled: true };
    }

    // Finalize jadian v2
    const now = Date.now();
    confessorUser.rpg.dating = m.sender;
    confessorUser.rpg.datingAt = now;
    confessorUser.rpg.partner = targetName;

    targetUser.rpg.dating = confessorJid;
    targetUser.rpg.datingAt = now;
    targetUser.rpg.partner = confessorName;

    db.save();
    pendingConfessionsV2.delete(m.sender);

    const dateStr = new Date(now).toLocaleDateString("id-ID", {
      day: "numeric", month: "long", year: "numeric",
    });
    const quote = ACCEPT_QUOTES_V2[Math.floor(Math.random() * ACCEPT_QUOTES_V2.length)];
    const decor = ACCEPT_DECOR_V2[Math.floor(Math.random() * ACCEPT_DECOR_V2.length)];

    let text = "";
    text += decor + "\n";
    text += "💫 *JADIAN V2 RESMI* 💫\n";
    text += decor + "\n\n";
    text += "@" + confessorJid.split("@")[0] + " 💑 @" + m.sender.split("@")[0] + "\n\n";
    text += "“" + quote + "”\n\n";
    text += separator("─", 30) + "\n";
    text += "👤 Cowok   : *" + confessorName + "*\n";
    text += "👥 Cewek   : *" + targetName + "*\n";
    text += "📅 Tanggal : " + dateStr + "\n";
    text += "💖 Status  : *Pacaran (V2)*\n";
    text += separator("─", 30) + "\n\n";
    text += "🌹 Selamat jadian! Semoga langgeng! 🌹\n\n";
    text += decor + "\n";
    text += tipText("Ketik " + prefix + "couple untuk cek status");
    text += "\n" + tipText("Ketik " + prefix + "putus untuk putus");

    await sock.sendMessage(m.chat, { text: text, mentions: [confessorJid, m.sender] });

    // Kirim VN musik romantis (jika file ada)
    try {
      const vnPath = path.join(VN_DIR, VN_MAU_V2);
      if (fs.existsSync(vnPath)) {
        const vnBuffer = fs.readFileSync(vnPath);
        await sock.sendMessage(m.chat, {
          audio: vnBuffer,
          mimetype: "audio/mpeg",
          ptt: true,
        });
      }
    } catch (e) {
      console.log("[mauv2.js] VN error:", e.message);
    }

    return { handled: true };
  } catch (error) {
    await m.reply("Error: " + error.message);
    return { handled: true };
  }
}

export { pluginConfig as config, handler };
