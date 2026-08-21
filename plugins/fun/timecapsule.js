// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { sendReplyWithNav } from "../../src/lib/nova-nav-buttons.js";

import {   separator,
  tipText,  claraWrap } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "timecapsule",
  alias: ["timecapsule", "ultah2", "capsule"],
  category: "fun",
  description: "Buat pesan time capsule terbuka di masa depan",
  usage: ".timecapsule <hari>|<pesan>",
  example: ".timecapsule 7|Semoga grup ini terus rame",
  isOwner: false,
  isPremium: false,
  isGroup: true,
  isPrivate: false,
  cooldown: 10,
  energi: 0,
  isEnabled: true,
};

const PRESETS = [
  "🍰 Ultah grup / anggota",
  "🎯 Capai goal bareng",
  "📅 Tahun baru grup",
  "💬 Reviewing momen lucu",
  "🏆 Keep track promises",
];

function buildMenu(prefix) {
  return (
    claraWrap("Time Capsule", ["╎❏ Fitur: *Time Capsule*",
      "╎❏ Konsep: *Pesan dikunci, terbuka nanti*",
      "╎❏ Cooldown: *10 detik*"].join("\n")) +
    "\n" +
    claraWrap("PreꜱEt Idea", PRESETS) +
    "\n\n" +
    separator("━", 22) +
    "\n" +
    claraWrap("Pakai", [`╎❏ ${prefix}timecapsule <hari>|<pesan>`, `╎❏ Contoh: ${prefix}timecapsule 7|Semoga grup rame terus`].join("\n")) +
    "\n\n" +
    separator("━", 22) +
    "\n" +
    tipText("Pesan tidak dikirim otomatis; ini simulasi konsep dulu") +
    "\n" +
    tipText(`Ketik ${prefix}menu untuk kembali`)
  );
}

async function handler(m, { sock, config: botConfig }) {
  try {
    const prefix = botConfig.command?.prefix || ".";
    const raw = m.text?.trim() ?? "";

    if (!raw) {
      await m.reply(buildMenu(prefix));
      return { handled: true };
    }

    const parts = raw.split("|").map((item) => item.trim()).filter(Boolean);
    const days = Number(parts[0]);
    const message = parts.slice(1).join("|").trim();

    if (!Number.isInteger(days) || days <= 0 || !message) {
      const text =
        claraWrap("Time Capsule", ["╎❏ Alasan: *Format salah*",
          `╎❏ Contoh: ${prefix}timecapsule 7|Semoga grup rame terus`].join("\n")) +
        "\n" +
        tipText(`Ketik ${prefix}timecapsule untuk melihat menu`);

      await m.reply(claraWrap("timecapsule", text));
      return { handled: true };
    }

    const openDate = new Date();
    openDate.setDate(openDate.getDate() + days);

    const text =
      claraWrap("Time Capsule", [`╎❏ Durasi: *${days} hari*`,
        `╎❏ Terbuka: *${openDate.toLocaleDateString("id-ID")}*`,
        `╎❏ Pesan: *"${message}"*`].join("\n")) +
      "\n" +
      tipText("Catatan: ini versi UI dulu, belum ada timer real") +
      "\n" +
      tipText(`Ketik ${prefix}timecapsule untuk buat lagi`) +
      "\n" +
      tipText(`Ketik ${prefix}menu untuk kembali`);

    await m.reply(claraWrap("timecapsule", text));
  } catch (error) {
    const text =
      claraWrap("Gagal", [`╎❏ Status: *Gagal*`,
        `╎❏ Alasan: *${error.message}*`].join("\n")) +
      "\n" +
      tipText(`Coba lagi nanti atau hubungi owner`);

    await m.reply(claraWrap("timecapsule", text));
  }

  return { handled: true };
}

export { pluginConfig as config, handler }
