// RARA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
/**
 * rara-nav-buttons.js
 * Helper untuk kirim pesan dengan tombol Kembali + Tanya AI
 * Dipakai semua plugin supaya konsisten.
 * Support toggle on/off via .tombol command (global & per-group).
 * Support multi-language translation via rara-i18n.js
 */

import proto from "nova";
import { generateWAMessageFromContent } from "nova";
import { getDatabase } from "./rara-database.js";
import { translateUI, translateButton, needsTranslation, preTranslateButton } from "./rara-i18n.js";

/**
 * Cek apakah tombol navigasi aktif untuk chat ini.
 * Prioritas: group setting > global setting > default (on)
 */
function isNavButtonsEnabled(chat) {
  try {
    const db = getDatabase();
    if (!db) return true;

    // Cek per-group override dulu
    if (chat && chat.endsWith("@g.us")) {
      const group = db.getGroup(chat);
      if (group && typeof group.navButtons === "boolean") {
        return group.navButtons;
      }
    }

    // Global setting
    const global = db.setting("navButtons");
    if (typeof global === "boolean") {
      return global;
    }

    // Default: on
    return true;
  } catch {
    return true;
  }
}

/**
 * Kirim pesan text dengan tombol Kembali + Tanya AI
 * @param {object} sock - WhatsApp socket
 * @param {object} m - Message object
 * @param {string} text - Teks pesan
 * @param {string} cmdName - Nama command/fitur (untuk Tanya AI kontekstual)
 */
async function sendReplyWithNav(sock, m, text, cmdName = "") {
  try {
    // Multi-language: translate teks UI ke bahasa user (Google Translate)
    const sender = m.sender || m.key?.participant || m.key?.remoteJid || "";
    let finalText = text;
    let btnKembali = "Kembali";
    let btnTanyaAI = "Tanya AI";

    if (needsTranslation(sender)) {
      // Translate body text
      finalText = await translateUI(text, sender);

      // Translate button labels
      btnKembali = translateButton("Kembali", sender);
      btnTanyaAI = translateButton("Tanya AI", sender);

      // Pre-translate button labels via Google Translate kalau belum di dictionary
      if (btnKembali === "Kembali") {
        btnKembali = await preTranslateButton("Kembali", sender);
      }
      if (btnTanyaAI === "Tanya AI") {
        btnTanyaAI = await preTranslateButton("Tanya AI", sender);
      }
    }

    // WhatsApp Channel (saluran/newsletter) tidak mendukung interactive/button
    // message — kirim plain text kalau chat-nya @newsletter, biar gak muncul
    // placeholder "versi WhatsApp Anda tidak mendukungnya".
    if (m.chat && m.chat.endsWith("@newsletter")) {
      return await sock.sendMessage(m.chat, { text: finalText });
    }

    // Cek toggle — kalau off, fallback ke m.reply biasa
    if (!isNavButtonsEnabled(m.chat)) {
      return await m.reply(finalText);
    }

    const prefix = m.prefix || ".";
    const aiId = cmdName
      ? `${prefix}aihelp ${cmdName}`
      : `${prefix}aihelp`;

    const msg = generateWAMessageInteractive(m.chat, finalText, [
      {
        name: "quick_reply",
        buttonParamsJson: JSON.stringify({
          display_text: btnKembali,
          id: `${prefix}menu`,
        }),
      },
      {
        name: "quick_reply",
        buttonParamsJson: JSON.stringify({
          display_text: btnTanyaAI,
          id: aiId,
        }),
      },
    ]);

    await sock.relayMessage(m.chat, msg.message, { messageId: msg.key.id });
  } catch {
    // Fallback ke reply biasa kalau interactive message gagal
    await sock.sendMessage(m.chat, { text }, { quoted: m });
  }
}

/**
 * Generate WA interactive message dengan buttons
 */
function generateWAMessageInteractive(chat, body, buttons) {
  const msg = generateWAMessageFromContent(chat, {
    viewOnceMessage: {
      message: {
        messageContextInfo: {},
        interactiveMessage: {
          body: { text: body },
          footer: { text: "Rara AI" },
          nativeFlowMessage: { buttons },
        },
      },
    },
  }, {});

  return msg;
}

export { sendReplyWithNav, isNavButtonsEnabled };
