// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// quizverify.js — Quiz verification system for new group members
// Anti-spam: member baru harus jawab quiz sebelum bisa chat

import {
  toSC,
  bracketBox,
  tipText,
} from "../../src/lib/nova-menu-style.js";
import {
  enableQuizVerify,
  disableQuizVerify,
  getQuizStatus,
  setDifficulty,
  setTimeoutMinutes,
  getPendingUsers,
} from "../../src/lib/nova-quiz-verify.js";

const pluginConfig = {
  name: "quizverify",
  alias: ["quizverify", "verifyquiz", "captchaverify"],
  category: "group",
  description: "Verifikasi member baru dengan quiz (anti-spam bot)",
  usage: ".quizverify on/off/status/difficulty/timeout/list",
  example: ".quizverify on\n.quizverify difficulty medium\n.quizverify timeout 10",
  isOwner: false,
  isPremium: false,
  isGroup: true,
  isPrivate: false,
  cooldown: 5,
  energi: 0,
  isEnabled: true,
};

async function handler(m, { sock, args }) {
  try {
    const subCmd = (args[0] || "").toLowerCase();
    const prefix = m.prefix || ".";
    const groupId = m.chat;

    // Admin check for on/off/difficulty/timeout/reset
    const adminCmds = ["on", "off", "difficulty", "timeout", "reset"];
    const needsAdmin = adminCmds.includes(subCmd);

    if (needsAdmin) {
      // Check if sender is admin
      const groupMeta = await sock.groupMetadata(groupId);
      const senderId = m.sender;
      const isAdmin = groupMeta.participants.some(
        (p) =>
          (p.id === senderId || p.jid === senderId) &&
          (p.admin === "admin" || p.admin === "superadmin")
      );

      if (!isAdmin) {
        await m.react("🚫");
        return m.reply(
          bracketBox("🚫", toSC("Akses Ditolak"), [
            toSC("Hanya admin grup yang bisa mengatur fitur ini!"),
          ])
        );
      }
    }

    switch (subCmd) {
      case "on": {
        await m.react("🕒");
        enableQuizVerify(groupId);
        await m.react("🐣");
        return m.reply(
          bracketBox("🛡️", toSC("Quiz Verification ON"), [
            toSC("Member baru harus jawab quiz untuk verifikasi"),
            `📌 ${toSC("Default difficulty")}: easy`,
            `⏰ ${toSC("Default timeout")}: 5 menit`,
            "",
            tipText(toSC("Atur difficulty: .quizverify difficulty medium")),
          ])
        );
      }

      case "off": {
        await m.react("🕒");
        disableQuizVerify(groupId);
        await m.react("🐣");
        return m.reply(
          bracketBox("🛡️", toSC("Quiz Verification OFF"), [
            toSC("Member baru bebas chat tanpa verifikasi"),
          ])
        );
      }

      case "status": {
        const status = getQuizStatus(groupId);
        const pending = getPendingUsers(groupId);
        return m.reply(
          bracketBox("🛡️", toSC("Quiz Verify Status"), [
            `${toSC("Status")}: ${status.enabled ? "ON ✅" : "OFF ❌"}`,
            `${toSC("Difficulty")}: ${status.difficulty || "easy"}`,
            `${toSC("Timeout")}: ${status.timeout || 5} ${toSC("menit")}`,
            `${toSC("Pending")}: ${pending.length} ${toSC("member")}`,
          ])
        );
      }

      case "difficulty": {
        const level = (args[1] || "").toLowerCase();
        if (!["easy", "medium", "hard"].includes(level)) {
          return m.reply(
            bracketBox("❗", toSC("Invalid Difficulty"), [
              toSC("Pilih: easy, medium, atau hard"),
              `📌 ${prefix}quizverify difficulty easy`,
              `📌 ${prefix}quizverify difficulty medium`,
              `📌 ${prefix}quizverify difficulty hard`,
            ])
          );
        }
        setDifficulty(groupId, level);
        await m.react("🐣");
        return m.reply(
          bracketBox("🛡️", toSC("Difficulty Updated"), [
            `${toSC("Difficulty")}: ${level}`,
            "",
            tipText(toSC("Member baru akan dapat pertanyaan level ini")),
          ])
        );
      }

      case "timeout": {
        const minutes = parseInt(args[1]);
        if (!minutes || minutes < 1 || minutes > 30) {
          return m.reply(
            bracketBox("❗", toSC("Invalid Timeout"), [
              toSC("Masukkan 1-30 menit"),
              `📌 ${prefix}quizverify timeout 5`,
              `📌 ${prefix}quizverify timeout 10`,
            ])
          );
        }
        setTimeoutMinutes(groupId, minutes);
        await m.react("🐣");
        return m.reply(
          bracketBox("🛡️", toSC("Timeout Updated"), [
            `${toSC("Timeout")}: ${minutes} ${toSC("menit")}`,
            "",
            tipText(toSC("Member yang tidak verifikasi dalam waktu ini akan dihapus")),
          ])
        );
      }

      case "list": {
        const pending = getPendingUsers(groupId);
        if (pending.length === 0) {
          return m.reply(
            bracketBox("🛡️", toSC("Pending Verifications"), [
              toSC("Tidak ada member yang pending verifikasi"),
            ])
          );
        }
        const lines = pending.map((p, i) => {
          const num = p.jid.split("@")[0].split(":")[0];
          const elapsed = Math.floor((Date.now() - p.joinedAt) / 1000);
          return `${i + 1}. @${num} — ${p.attempts}/3 ${toSC("salah")} (${elapsed}s)`;
        });
        return m.reply(
          bracketBox("🛡️", toSC("Pending Verifications"), lines)
        );
      }

      default:
        return m.reply(
          bracketBox("🛡️", toSC("Quiz Verify — Commands"), [
            `📌 ${prefix}quizverify on — ${toSC("aktifkan")}`,
            `📌 ${prefix}quizverify off — ${toSC("nonaktifkan")}`,
            `📌 ${prefix}quizverify status — ${toSC("cek status")}`,
            `📌 ${prefix}quizverify difficulty <level> — ${toSC("atur kesulitan")}`,
            `📌 ${prefix}quizverify timeout <menit> — ${toSC("atur timeout")}`,
            `📌 ${prefix}quizverify list — ${toSC("lihat pending")}`,
            "",
            tipText(toSC("Member baru harus jawab quiz untuk verifikasi!")),
          ])
        );
    }
  } catch (e) {
    console.error("[QuizVerify] Error:", e.message);
    await m.react("❌");
    return m.reply(
      bracketBox("❌", toSC("Error"), [
        toSC("Gagal menjalankan perintah!"),
        `${e.message}`,
      ])
    );
  }
}

export { pluginConfig as config, handler };
