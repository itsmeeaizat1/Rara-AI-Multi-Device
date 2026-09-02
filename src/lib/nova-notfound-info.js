// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// Simple not-found reply — suggestion only, NO info section
// Info section hanya untuk menu/allmenu/allmenucategory

import config from "../../config.js";
import { toSC } from "./nova-menu-style.js";

/**
 * Build not-found reply (simple, no info section)
 */
export async function buildNotFoundReply(m, ctx, command, closest, level, totalHits) {
  const botConfig = ctx?.config || config;
  const prefix = botConfig?.command?.prefix || ".";
  const smartEnabled = botConfig?.features?.commandSuggestionSmart !== false;
  if (!smartEnabled) level = 0;

  let lines = [];

  if (level === 0) {
    lines.push("\u2502 " + toSC("Command") + " *" + prefix + command + "* " + toSC("tidak ditemukan"));
    if (closest) {
      lines.push("\u2502 " + toSC("Mungkin maksudmu") + ": *" + prefix + closest + "* ?");
    }
    lines.push("\u2502");
    lines.push("\u2502 \u{1F4A1} " + toSC("Ketik") + " *" + prefix + "tanyaai* " + toSC("untuk tanya AI"));
  } else if (level === 1) {
    lines.push("\u2502 \u26A0 " + toSC("Kamu sudah salah ketik") + " " + totalHits + "x " + toSC("dalam 1 menit"));
    lines.push("\u2502 " + toSC("Command") + " *" + prefix + command + "* " + toSC("tidak ditemukan"));
    if (closest) {
      lines.push("\u2502 " + toSC("Mungkin") + ": *" + prefix + closest + "*");
    }
    lines.push("\u2502");
    lines.push("\u2502 \u{1F4A1} " + toSC("Cek") + " *" + prefix + "menu* " + toSC("untuk daftar lengkap"));
  } else if (level === 2) {
    lines.push("\u2502 \u26A0 " + toSC("Sudah") + " " + totalHits + "x " + toSC("command tidak ditemukan") + "!");
    lines.push("\u2502 " + toSC("Tolong cek") + " *" + prefix + "menu* " + toSC("dulu ya"));
    lines.push("\u2502");
    lines.push("\u2502 \u{1F4A1} " + toSC("Atau tanya") + " *" + prefix + "tanyaai* \u2014 " + toSC("AI bantu cari"));
  } else if (level === 4) {
    lines.push("\u2502 \u{1F6A2} " + toSC("Kamu mengirim") + " " + totalHits + " " + toSC("command salah") + "!");
    lines.push("\u2502 " + toSC("Bot tidak mengenal command tersebut"));
    lines.push("\u2502");
    lines.push("\u2502 \u{1F4A1} " + toSC("Daripada tebak-tebakan, langsung tanya AI") + ":");
    lines.push("\u2502 *" + prefix + "tanyaai* <" + toSC("apa yang kamu cari") + ">");
    lines.push("\u2502");
    lines.push("\u2502 " + toSC("Atau cek daftar") + ": *" + prefix + "menu*");
  }

  let result = "\u256D\u2500\u300C \u2726 Not Found \u2726 \u300D\n";
  result += lines.join("\n") + "\n";
  result += "\u2570\u2500\u2500\u2500\u2500 \u2022 \u2500\u2500\u2500\u2500";

  return result;
}
