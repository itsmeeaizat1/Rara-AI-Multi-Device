// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// Simple not-found reply — suggestion only, NO info section
// Info section hanya untuk menu/allmenu/allmenucategory
// REWORK 17 Sep 2026 (owner: "pesan di handler yg pakai drawing box, hapus
// garisnya") — header 「 ✦ Not Found ✦ 」, body polos TANPA prefix │,
// tanpa footer ╰──── (pola buildBox line-free 7 Sep).

import config from "../../config.js";
import { novaWrap, toSC } from "./nova-menu-style.js";

/**
 * Build not-found reply (line-free, tanpa drawing box)
 */
export async function buildNotFoundReply(m, ctx, command, closest, level, totalHits) {
  const botConfig = ctx?.config || config;
  const prefix = botConfig?.command?.prefix || ".";
  const smartEnabled = botConfig?.features?.commandSuggestionSmart !== false;
  if (!smartEnabled) level = 0;

  const lines = [];

  if (level === 0) {
    lines.push(toSC("Command") + " *" + prefix + command + "* " + toSC("tidak ditemukan"));
    if (closest) {
      lines.push("");
      lines.push("🤔 " + toSC("Mungkin maksudmu") + ": *" + prefix + closest + "* ?");
    }
    lines.push("");
    lines.push("💡 " + toSC("Ketik") + " *" + prefix + "tanyaai* " + toSC("untuk tanya AI"));
  } else if (level === 1) {
    lines.push("⚠ " + toSC("Kamu sudah salah ketik") + " " + totalHits + "x " + toSC("dalam 1 menit"));
    lines.push("");
    lines.push(toSC("Command") + " *" + prefix + command + "* " + toSC("tidak ditemukan"));
    if (closest) {
      lines.push("");
      lines.push("🤔 " + toSC("Mungkin") + ": *" + prefix + closest + "*");
    }
    lines.push("");
    lines.push("💡 " + toSC("Cek") + " *" + prefix + "menu* " + toSC("untuk daftar lengkap"));
  } else if (level === 2) {
    lines.push("⚠ " + toSC("Sudah") + " " + totalHits + "x " + toSC("command tidak ditemukan") + "!");
    lines.push("");
    lines.push(toSC("Tolong cek") + " *" + prefix + "menu* " + toSC("dulu ya"));
    lines.push("");
    lines.push("💡 " + toSC("Atau tanya") + " *" + prefix + "tanyaai* — " + toSC("AI bantu cari"));
  } else if (level === 4) {
    lines.push("😵 " + toSC("Kamu mengirim") + " " + totalHits + " " + toSC("command salah") + "!");
    lines.push("");
    lines.push(toSC("Bot tidak mengenal command tersebut"));
    lines.push("");
    lines.push("💡 " + toSC("Daripada tebak-tebakan, langsung tanya AI") + ":");
    lines.push("*" + prefix + "tanyaai* <" + toSC("apa yang kamu cari") + ">");
    lines.push("");
    lines.push(toSC("Atau cek daftar") + ": *" + prefix + "menu*");
  }

  return novaWrap("Not Found", lines);
}
