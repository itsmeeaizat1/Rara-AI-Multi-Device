// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
// myvps.js — Daftar VPS milik sendiri dari registry (7 Okt 2026)
import { raraWrap } from "../../src/lib/rara-menu-style.js";
import { listByOwner, listAll } from "../../src/lib/rara-vps-registry.js";

const pluginConfig = {
  name: ["myvps", "vpsku"],
  alias: ["myvps", "vpsku"],
  category: "vps",
  description: "Lihat VPS milikmu (untuk gantipwvps dkk)",
  usage: ".myvps",
  example: ".myvps",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 5,
  energi: 0,
  isEnabled: true,
};

async function handler(m) {
  const showAll = m.isOwner && String(m.text || "").trim().toLowerCase() === "all";
  const list = showAll ? listAll() : listByOwner(m.sender);

  if (list.length === 0) {
    return m.reply(
      raraWrap("myvps", [
        "「 ✦ VPS Saya ✦ 」",
        "",
        showAll ? "Belum ada VPS terdaftar." : "Kamu belum punya VPS terdaftar.",
        "",
        "VPS yang dibuat lewat bot otomatis ke-catat di sini.",
      ].join("\n")),
      "myvps"
    );
  }

  const lines = [`「 ✦ VPS ${showAll ? "Semua" : "Saya"} ✦ 」`, `Total: ${list.length} VPS`, ""];
  for (const e of list) {
    lines.push(`ID: ${e.id} | ${e.ip}`);
    lines.push(`Label: ${e.label || "-"} | Provider: ${e.provider}`);
    if (showAll) lines.push(`Pemilik: +${e.owner}`);
    lines.push(`Ganti pw: ${m.prefix}gantipwvps ${e.id}`);
    lines.push("");
  }
  lines.push("_Powered by RARA AI - MULTI DEVICE_");
  return m.reply(raraWrap("myvps", lines.join("\n")), "myvps");
}

export { pluginConfig as config, handler };
