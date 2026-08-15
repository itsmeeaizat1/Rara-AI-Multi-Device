// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { sendReplyWithNav } from "../../src/lib/nova-nav-buttons.js";

import { claraHeader,
    separator,
  tipText,  claraWrap } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "soulmatematch",
  alias: ["soulmatematch"],
  category: "rpg",
  description: "Cek soul score / compatibility dengan member lain",
  usage: ".soulmatematch <nama|@tag>",
  example: ".soulmatematch Adi",
  isOwner: false,
  isPremium: false,
  isGroup: true,
  isPrivate: false,
  cooldown: 8,
  energi: 0,
  isEnabled: true,
};

const TIERS = [
  { min: 90, emoji: "👑", label: "Soulmate", note: "Kalo ini bukan jodoh, apalagi yang lain" },
  { min: 75, emoji: "💘", label: "High Match", note: "Beda tapi saling melengkapi" },
  { min: 60, emoji: "❤️", label: "Cocok", note: "Ada chemistry, cuma butuh usaha" },
  { min: 45, emoji: "🫠", label: "Biasa", note: "Bisa, tapi agak nggak nyambung" },
  { min: 0, emoji: "💔", label: "Friendzone", note: "Mending jadian temen dulu" },
];

const FACTS = [
  "Kalian beda warna favorit, tapi suka film yang sama",
  "Sama-sama introvert di luar, tapi suka ngobrol sampai pagi",
  "Kemungkinan besar kalian pernah liat story sama tanpa ketemu",
  "Salah satunya biasanya yang duluan chat duluan",
  "Kamu lebih banyak narik perhatian dia daripada sebaliknya",
  "Kemungkinan chatnya panjang kalau topiknya keluar",
  "Kalo ketemu di dunia nyata, kemungkinan awkward dulu",
];

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function hashName(a, b) {
  const str = [a, b].sort().join("|");
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (h * 31 + str.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

function scoreFromHash(hash) {
  return ((hash % 61) + 40).clamp(40, 100);
}

Number.prototype.clamp = function (min, max) {
  return Math.min(max, Math.max(min, this));
};

async function handler(m, { sock, config: botConfig }) {
  try {
    const prefix = botConfig.command?.prefix || ".";
    const raw = m.text?.trim() ?? "";

    if (!raw) {
      const text =
        claraWrap("Soul Match", [`◦ Penggunaan: *${prefix}soulmatch <nama|@tag>*`,
          `◦ Contoh: *${prefix}soulmatch Adi*`].join("\n")) +
        "\n" +
        tipText("Bisa juga dari cmd ini reply pesan orangnya") +
        "\n" +
        tipText(`Ketik ${prefix}menu untuk kembali`);

      await sendReplyWithNav(sock, m, text, "soulmatematch");
      return { handled: true };
    }

    const targetName = raw.replace(/^\.soulmatch\s+/i, "").trim();
    const senderName = m.pushName || m.senderName || "Kamu";

    const nameA = String(senderName).trim();
    const nameB = String(targetName).trim();

    if (!nameB) {
      const text =
        claraWrap("Gagal", ["◦ Alasan: *Nama tujuan kosong*",
          `◦ Contoh: *${prefix}soulmatch Adi*`].join("\n")) +
        "\n" +
        tipText(`Ketik ${prefix}soulmatch untuk coba lagi`) +
        "\n" +
        tipText(`Ketik ${prefix}menu untuk kembali`);

      await sendReplyWithNav(sock, m, text, "soulmatematch");
      return { handled: true };
    }

    const hash = hashName(nameA, nameB);
    const score = scoreFromHash(hash);
    const tier = TIERS.find((t) => score >= t.min) || TIERS[TIERS.length - 1];
    const fact = pick(FACTS);

    const text =
      claraWrap("Soul Match", "💘") +
      "\n\n" +
      claraWrap(tier.label, [
        `◦ Dari: *${nameA}*`,
        `◦ Dengan: *${nameB}*`,
        `◦ Score: *${score}%*`,
        `◦ Tier: *${tier.emoji} ${tier.label}*`,
      ]) +
      "\n\n" +
      separator("━", 22) +
      "\n" +
      claraWrap("ᴄʟᴜᴇ", fact) +
      "\n\n" +
      separator("━", 22) +
      "\n" +
      tipText(tier.note) +
      "\n" +
      tipText(`Ketik ${prefix}soulmatch <nama> untuk cek lain`) +
      "\n" +
      tipText(`Ketik ${prefix}menu untuk kembali`);

    await sendReplyWithNav(sock, m, text, "soulmatematch");
  } catch (error) {
    const text =
      claraWrap("Gagal", [`◦ Status: *Gagal*`,
        `◦ Alasan: *${error.message}*`].join("\n")) +
      "\n" +
      tipText(`Coba lagi nanti atau hubungi owner`);

    await m.reply(claraWrap("soulmatematch", text));
  }

  return { handled: true };
}

export { pluginConfig as config, handler }
