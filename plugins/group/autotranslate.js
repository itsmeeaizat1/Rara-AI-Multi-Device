// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
// autotranslate.js — Auto-translate foreign messages in groups

import {
  raraError,
  toSC,
  bracketBox,
  tipText,
} from "../../src/lib/rara-menu-style.js";
import {
  enableAutoTranslate,
  disableAutoTranslate,
  getAutoTranslateStatus,
  setTargetLang,
  detectLanguage,
  translateMessage,
} from "../../src/lib/rara-autotranslate.js";

const pluginConfig = {
  name: "autotranslate",
  alias: ["autotranslate", "atranslate", "autotr"],
  category: "group",
  description: "Auto-translate pesan bahasa asing di grup",
  usage: ".autotranslate on/off/status/lang/test",
  example: ".autotranslate on\n.autotranslate lang en\n.autotranslate test hello world",
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

    // Admin check for on/off/lang
    const adminCmds = ["on", "off", "lang"];
    if (adminCmds.includes(subCmd)) {
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
        enableAutoTranslate(groupId);
        return m.reply(
          bracketBox("🌐", toSC("Auto Translate ON"), [
            toSC("Pesan bahasa asing akan diterjemahkan otomatis"),
            `${toSC("Target")}: Indonesian (id)`,
            "",
            tipText(toSC("Ubah target: .autotranslate lang en")),
          ])
        );
      }

      case "off": {
        disableAutoTranslate(groupId);
        return m.reply(
          bracketBox("🌐", toSC("Auto Translate OFF"), [
            toSC("Pesan tidak akan diterjemahkan otomatis"),
          ])
        );
      }

      case "status": {
        const status = getAutoTranslateStatus(groupId);
        return m.reply(
          bracketBox("🌐", toSC("Auto Translate Status"), [
            `${toSC("Status")}: ${status.enabled ? "ON ✅" : "OFF ❌"}`,
            `${toSC("Target lang")}: ${status.targetLang || "id"}`,
            `${toSC("Rate limit")}: 1/${toSC("per 10s per group")}`,
          ])
        );
      }

      case "lang": {
        const lang = (args[1] || "").toLowerCase();
        const supported = ["id", "en", "ja", "ar", "ko", "zh", "th", "ru", "fr", "de", "es", "pt", "vi"];
        if (!supported.includes(lang)) {
          return m.reply(
            bracketBox("❗", toSC("Invalid Language"), [
              toSC("Bahasa yang didukung:"),
              `📌 ${supported.join(", ")}`,
              "",
              `📌 ${prefix}autotranslate lang id`,
              `📌 ${prefix}autotranslate lang en`,
            ])
          );
        }
        setTargetLang(groupId, lang);
        return m.reply(
          bracketBox("🌐", toSC("Target Language Updated"), [
            `${toSC("Target")}: ${lang}`,
            "",
            tipText(toSC("Pesan asing akan diterjemahkan ke bahasa ini")),
          ])
        );
      }

      case "test": {
        const text = (args.slice(1) || []).join(" ");
        if (!text || text.length < 3) {
          return m.reply(
            bracketBox("❗", toSC("Test Translate"), [
              toSC("Masukkan teks untuk diterjemahkan"),
              `📌 ${prefix}autotranslate test Hello everyone`,
            ])
          );
        }
        const detected = detectLanguage(text);
        const translated = await translateMessage(text, "id", detected);
        return m.reply(
          bracketBox("🌐", toSC("Test Translate"), [
            `${toSC("Original")} (${detected}): ${text.slice(0, 100)}`,
            `${toSC("Translation")} (id): ${translated}`,
          ])
        );
      }

      default:
        return m.reply(
          bracketBox("🌐", toSC("Auto Translate — Commands"), [
            `📌 ${prefix}autotranslate on — ${toSC("aktifkan")}`,
            `📌 ${prefix}autotranslate off — ${toSC("nonaktifkan")}`,
            `📌 ${prefix}autotranslate status — ${toSC("cek status")}`,
            `📌 ${prefix}autotranslate lang <kode> — ${toSC("atur target bahasa")}`,
            `📌 ${prefix}autotranslate test <teks> — ${toSC("tes terjemahan")}`,
            "",
            tipText(toSC("Bahasa asing akan otomatis diterjemahkan ke target!")),
          ])
        );
    }
  } catch (e) {
    console.error("[AutoTranslate] Error:", e.message);
    return m.reply(raraError("AutoTranslate", "Gagal jalankan perintah nih"));
  }
}

export { pluginConfig as config, handler };
