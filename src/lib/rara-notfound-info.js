// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
// Simple not-found reply — suggestion only, NO info section
// Info section hanya untuk menu/allmenu/allmenucategory
// REWORK 17 Sep 2026 (owner: "pesan di handler yg pakai drawing box, hapus
// garisnya") — header 「 ✦ Not Found ✦ 」, body polos TANPA prefix │,
// tanpa footer ╰──── (pola buildBox line-free 7 Sep).

import config from "../../config.js";
import { raraWrap, toSC } from "./rara-menu-style.js";

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
    lines.push("(・_・?) " + toSC("command") + " *" + prefix + command + "* " + toSC("gak ketemu kak..."));
    if (closest) {
      lines.push("");
      lines.push("Mungkin maksud kamu: *" + prefix + closest + "* ?");
    }
    lines.push("");
    lines.push("💡 " + toSC("Ketik") + " *" + prefix + "tanyaai* " + toSC("untuk tanya AI"));
  } else if (level === 1) {
    lines.push("(¬_¬") " + toSC("kamu sudah salah ketik") + " " + totalHits + "x " + toSC("dalam 1 menit kak..."));
    lines.push("");
    lines.push(toSC("command") + " *" + prefix + command + "* " + toSC("gak ketemu"));
    if (closest) {
      lines.push("");
      lines.push("(・_・?) " + toSC("mungkin") + ": *" + prefix + closest + "*");
    }
    lines.push("");
    lines.push("💡 " + toSC("Cek") + " *" + prefix + "menu* " + toSC("untuk daftar lengkap"));
  } else if (level === 2) {
    lines.push("(￣～￣;) " + toSC("sudah") + " " + totalHits + "x " + toSC("command gak ketemu") + " kak!");
    lines.push("");
    lines.push(toSC("tolong cek") + " *" + prefix + "menu* " + toSC("dulu ya kak ♡"));
    lines.push("");
    lines.push("💡 " + toSC("Atau tanya") + " *" + prefix + "tanyaai* — " + toSC("AI bantu cari"));
  } else if (level === 4) {
    lines.push("(⊙_⊙;) " + toSC("kamu mengirim") + " " + totalHits + " " + toSC("command salah") + " kak!");
    lines.push("");
    lines.push(toSC("bot tidak mengenal command tersebut kak..."));
    lines.push("");
    lines.push("💡 " + toSC("Daripada tebak-tebakan, langsung tanya AI") + ":");
    lines.push("*" + prefix + "tanyaai* <" + toSC("apa yang kamu cari") + ">");
    lines.push("");
    lines.push(toSC("Atau cek daftar") + ": *" + prefix + "menu*");
  }

  return raraWrap("Not Found", lines);
}
