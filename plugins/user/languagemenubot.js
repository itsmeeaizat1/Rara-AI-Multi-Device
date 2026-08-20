// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// Multi-Language Menu Bot — User set bahasa preferensi
// .languagemenubot — lihat & set bahasa
// .languagemenubot <code> — set bahasa (contoh: .languagemenubot en)
// .languagemenubot reset — kembali ke default (Indonesia)
import { getDatabase } from "../../src/lib/nova-database.js";
import { sendReplyWithNav } from "../../src/lib/nova-nav-buttons.js";
import { claraWrap, separator, tipText } from "../../src/lib/nova-menu-style.js";
import {
  SUPPORTED_LANGUAGES,
  getUserLanguage,
  setUserLanguage,
  getUserLanguageInfo,
} from "../../src/lib/nova-language.js";

const pluginConfig = {
  name: "languagemenubot",
  alias: ["langmenu", "setlanguage", "setlang", "botlanguage", "bahasabot"],
  category: "user",
  description: "Set bahasa preferensi bot — auto translate semua response AI ke bahasa kamu",
  usage: ".languagemenubot (lihat daftar bahasa)\n.languagemenubot <code> (set bahasa)\n.languagemenubot reset (kembali ke Indonesia)",
  example: ".languagemenubot en\n.languagemenubot ja\n.languagemenubot reset",
  isOwner: false,
  isPremium: false,
  isGroup: true,
  isPrivate: true,
  cooldown: 3,
  energi: 0,
  isEnabled: true,
};

async function handler(m, { sock, config: botConfig }) {
  const prefix = botConfig.command?.prefix || ".";
  const args = m.args || [];
  const subCmd = args[0]?.toLowerCase();
  const sender = m.sender || m.key?.participant || m.key?.remoteJid || "";

  // No args — show language menu
  if (!subCmd || subCmd === "list" || subCmd === "cek" || subCmd === "status") {
    const currentLang = getUserLanguage(sender);
    const currentInfo = currentLang ? SUPPORTED_LANGUAGES[currentLang] : null;

    let text = claraWrap("Language Menu Bot", [
      `Bahasa saat ini: *${currentInfo ? currentInfo.native + " (" + currentInfo.name + ")" : "Indonesia (default)"}*`,
      `Total bahasa: *${Object.keys(SUPPORTED_LANGUAGES).length}*`,
    ].join("\n")) + "\n\nDAFTAR BAHASA:\n\n";

    let num = 1;
    for (const [code, info] of Object.entries(SUPPORTED_LANGUAGES)) {
      const active = currentLang === code ? " [AKTIF]" : "";
      text += `${num}. ${info.native} (${info.name})\n`;
      text += `   Set: ${prefix}languagemenubot ${code}${active}\n\n`;
      num++;
    }

    text += separator("-", 24) + "\n" +
      `Reset ke default: ${prefix}languagemenubot reset`;

    return sendReplyWithNav(sock, m, text, "languagemenubot");
  }

  // Reset bahasa
  if (subCmd === "reset" || subCmd === "default" || subCmd === "id") {
    const ok = setUserLanguage(sender, subCmd === "id" ? "id" : null);
    if (ok) {
      return sendReplyWithNav(
        sock,
        m,
        claraWrap("Language Menu Bot", [
          `Status: *Reset ke Indonesia (default)*`,
          `Semua response AI akan kembali ke Bahasa Indonesia`,
        ].join("\n")) + "\n\n" +
        `Set bahasa lain: ${prefix}languagemenubot <code>`,
        "languagemenubot"
      );
    }
    return sendReplyWithNav(sock, m, "Gagal reset bahasa. Coba lagi.", "languagemenubot");
  }

  // Set bahasa
  if (SUPPORTED_LANGUAGES[subCmd]) {
    const langInfo = SUPPORTED_LANGUAGES[subCmd];
    const ok = setUserLanguage(sender, subCmd);
    if (ok) {
      const responseMsg =
        subCmd === "id"
          ? `Status: *Indonesia (default)*\nBot akan merespons dalam Bahasa Indonesia`
          : `Status: *${langInfo.native} (${langInfo.name})*\nBot akan merespons dalam ${langInfo.name}`;

      return sendReplyWithNav(
        sock,
        m,
        claraWrap("Language Menu Bot", responseMsg) + "\n\n" +
        `Reset: ${prefix}languagemenubot reset\n` +
        `Ganti bahasa: ${prefix}languagemenubot <code>`,
        "languagemenubot"
      );
    }
    return sendReplyWithNav(sock, m, "Gagal set bahasa. Coba lagi.", "languagemenubot");
  }

  // Unknown language
  let availableList = "";
  for (const [code, info] of Object.entries(SUPPORTED_LANGUAGES)) {
    availableList += `${code} - ${info.native} (${info.name})\n`;
  }

  return sendReplyWithNav(
    sock,
    m,
    claraWrap("Language Menu Bot", [
      `Kode bahasa: *${subCmd}*`,
      `Tidak ada dalam daftar`,
    ].join("\n")) + "\nBAHASA TERSEDIA:\n\n" +
    availableList +
    "\nContoh: " + prefix + "languagemenubot en",
    "languagemenubot"
  );
}

export { pluginConfig as config, handler };
