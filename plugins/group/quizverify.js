// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// quizverify.js — Quiz verification system for new group members
// Anti-spam: member baru harus jawab quiz sebelum bisa chat

import {
  toSC,
  bracketBox,
  tipText,
  novaError,
  novaEmpty,
  novaGuide,
  novaNoInput,
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
          novaError("Akses Ditolak", "Cuma admin grup yang boleh ngatur fitur Quiz Verify ini!")
        );
      }
    }

    switch (subCmd) {
      case "on": {
        enableQuizVerify(groupId);
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
        disableQuizVerify(groupId);
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
            novaGuide("Difficulty Quiz", "Pilih tingkat kesulitan kuis yang valid ya!", `${prefix}quizverify difficulty easy | medium | hard`)
          );
        }
        setDifficulty(groupId, level);
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
            novaGuide("Timeout Quiz", "Masukkan durasi batas waktu kuis antara 1 sampai 30 menit ya!", `${prefix}quizverify timeout 5`)
          );
        }
        setTimeoutMinutes(groupId, minutes);
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
            novaEmpty("Quiz Verify", "Gak ada member yang lagi pending verifikasi saat ini~")
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
          novaGuide("Quiz Verify", "Verifikasi member baru lewat kuis anti-spam!", `${prefix}quizverify on | off | status | difficulty <level> | timeout <menit> | list`)
        );
    }
  } catch (e) {
    console.error("[QuizVerify] Error:", e.message);
    return m.reply(
      novaError("Quiz Verify", `Gagal memproses verifikasi kuis: ${e.message}`)
    );
  }
}

export { pluginConfig as config, handler };
