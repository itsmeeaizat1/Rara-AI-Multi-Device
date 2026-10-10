// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
// Multi-Language Menu Bot — User set bahasa preferensi
// DEFAULT: OFF — Indonesia murni, no translation
// Owner aktifkan dulu via .languagemenubot on (owner only)
// Setelah aktif, user bisa set bahasa mereka sendiri
import { getDatabase } from "../../src/lib/rara-database.js";
import { raraError, raraEmpty, raraGuide, raraNoInput, separator, tipText } from "../../src/lib/rara-menu-style.js";
import {
  SUPPORTED_LANGUAGES,
  getUserLanguage,
  setUserLanguage,
  getUserLanguageInfo,
  isMultiLangEnabled,
} from "../../src/lib/rara-language.js";

const SC_MAP = {a:'a',b:'b',c:'c',d:'d',e:'e',f:'f',g:'g',h:'h',i:'i',j:'j',k:'k',l:'l',m:'m',n:'n',o:'o',p:'p',r:'r',s:'s',t:'t',u:'u',v:'v',w:'w',y:'y',z:'z'};
const toSC = (s) => String(s || "").replace(/[a-z]/g, c => SC_MAP[c] || c);

function raraWrap(title, text) {
  const body = Array.isArray(text) ? text.join("\n") : text;
  const scBody = body.split("\n").map(line => {
    if (line.trim().startsWith(".") || line.trim().startsWith("Toggle:")) return line;
    return toSC(line);
  }).join("\n");
  return `${toSC(title)}\n\n${scBody}`;
}

async function formatAndReply(m, text, cmdName) {
  try {
    text = text.split("\n").map(line => {
      if (line.trim().startsWith(".") || line.trim().startsWith("Toggle:") || line.includes("°˖") || line.includes("⋆｡˚")) return line;
      return toSC(line);
    }).join("\n");
    if (!text.includes("")) {
      text = text + "\n";
    }
    return await m.reply(text);
  } catch (e) {
    console.error('[languagemenubot.js]:', e.message);
    return await m.reply(text);
  }
}

const pluginConfig = {
  name: "languagemenubot",
  alias: ["languagemenubot"],
  category: "user",
  description: "Set bahasa preferensi bot — auto translate semua response ke bahasa kamu",
  usage: ".languagemenubot (lihat daftar bahasa)\n.languagemenubot <code> (set bahasa)\n.languagemenubot reset (kembali ke Indonesia)\n.languagemenubot on/off (owner: aktifkan/matikan fitur)",
  example: ".languagemenubot en\n.languagemenubot ja\n.languagemenubot reset",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 3,
  energi: 0,
  isEnabled: true,
};

async function handler(m, { sock, config: botConfig }) {
    const prefix = botConfig.command?.prefix || ".";
  try {
    const args = m.args || [];
    const subCmd = args[0]?.toLowerCase();
    const sender = m.sender || m.key?.participant || m.key?.remoteJid || "";
    const db = getDatabase();

    // OWNER: on/off master toggle
    if ((subCmd === "on" || subCmd === "off") && m.isOwner) {
      db.setting("multiLangEnabled", subCmd === "on");
      await db.save();
      await m.react(subCmd === "on" ? "✅" : "❌");
      const statusText = subCmd === "on"
        ? "MULTI-LANGUAGE DIAKTIFKAN\n\nUser sekarang bisa set bahasa mereka\nDefault tetap Indonesia (no translate)\n\nSet bahasa: " + prefix + "languagemenubot <code>"
        : "MULTI-LANGUAGE DINONAKTIFKAN\n\nSemua teks kembali ke Bahasa Indonesia murni\nTranslation dimatikan sepenuhnya";
      return formatAndReply(m, raraWrap("Language Menu Bot", statusText), "languagemenubot");
    }

    // Cek master toggle — kalo OFF, tolak user
    if (!isMultiLangEnabled()) {
      let offText = raraWrap("Language Menu Bot", [
        "Status: *multi-language off*",
        "Default: *Bahasa Indonesia (murni)*",
        "",
        "Fitur ini sedang dimatikan oleh owner",
        "Semua response bot menggunakan Bahasa Indonesia",
      ].join("\n"));
      if (m.isOwner) {
        offText += "\n\nAktifkan: " + prefix + "languagemenubot on";
      }
      return formatAndReply(m, offText, "languagemenubot");
    }

    // No args — show language menu
    if (!subCmd || subCmd === "list" || subCmd === "cek" || subCmd === "status") {
      const currentLang = getUserLanguage(sender);
      const currentInfo = currentLang ? SUPPORTED_LANGUAGES[currentLang] : null;
      // Engine translate (owner 10 Okt: kelas Immersive Translate via HY-MT)
      let engineLine = "Engine: *MyMemory* (default, tanpa key)";
      try {
        const { hasHyMtKey, hyMtModel } = await import("../../src/lib/rara-hymt.js");
        if (hasHyMtKey()) engineLine = "Engine: *HY-MT / SiliconFlow* (" + hyMtModel() + ", kelas Immersive Translate)";
      } catch {}
      let text = raraWrap("Language Menu Bot", [
        `Bahasa saat ini: *${currentInfo ? currentInfo.native + " (" + currentInfo.name + ")" : "Indonesia (default)"}*`,
        `Total bahasa: *${Object.keys(SUPPORTED_LANGUAGES).length}*`,
        engineLine,
      ].join("\n")) + "\n\nDAFTAR BAHASA:\n\n";
      let num = 1;
      for (const [code, info] of Object.entries(SUPPORTED_LANGUAGES)) {
        const active = currentLang === code ? " [AKTIF]" : "";
        text += `${num}. ${info.native} (${info.name})\n`;
        text += `   Set: ${prefix}languagemenubot ${code}${active}\n\n`;
        num++;
      }
      text += separator("-", 24) + "\n" + `Reset ke default: ${prefix}languagemenubot reset`;
      return formatAndReply(m, text, "languagemenubot");
    }

    // Reset bahasa
    if (subCmd === "reset" || subCmd === "default" || subCmd === "id") {
      const ok = setUserLanguage(sender, subCmd === "id" ? "id" : null);
      if (ok) {
        return formatAndReply(m, raraWrap("Language Menu Bot", [
          "Status: *Reset ke Indonesia (default)*",
          "Semua response AI akan kembali ke Bahasa Indonesia",
        ].join("\n")) + "\n\n" + `Set bahasa lain: ${prefix}languagemenubot <code>`, "languagemenubot");
      }
      return formatAndReply(m, "Gagal reset bahasa nih, coba lagi ya", "languagemenubot");
    }

    // Set bahasa
    if (SUPPORTED_LANGUAGES[subCmd]) {
      const langInfo = SUPPORTED_LANGUAGES[subCmd];
      const ok = setUserLanguage(sender, subCmd);
      if (ok) {
        const responseMsg = subCmd === "id"
          ? "Status: *Indonesia (default)*\nBot akan merespons dalam Bahasa Indonesia"
          : `Status: *${langInfo.native} (${langInfo.name})*\nBot akan merespons dalam ${langInfo.name}`;
        return formatAndReply(m, raraWrap("Language Menu Bot", responseMsg) + "\n\n" + `Reset: ${prefix}languagemenubot reset\n` + `Ganti bahasa: ${prefix}languagemenubot <code>`, "languagemenubot");
      }
      return formatAndReply(m, "Gagal set bahasa nih, coba lagi ya", "languagemenubot");
    }

    // Unknown language
    let availableList = "";
    for (const [code, info] of Object.entries(SUPPORTED_LANGUAGES)) {
      availableList += `${code} - ${info.native} (${info.name})\n`;
    }
    return formatAndReply(m, raraWrap("Language Menu Bot", [
      `Kode bahasa: *${subCmd}*`,
      "Tidak ada dalam daftar",
    ].join("\n")) + "\nBAHASA TERSEDIA:\n\n" + availableList + "\n💡 *Contoh:* " + prefix + "languagemenubot en", "languagemenubot");
  } catch (error) {
    console.error('[languagemenubot.js]:', error.message);
    await m.reply("Language Menu Bot\n\n│ Terjadi error: " + error.message + "\n");
    return { handled: true };
  }
}

export { pluginConfig as config, handler };
