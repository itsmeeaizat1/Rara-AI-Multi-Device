// RARA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { getDatabase } from "../../src/lib/rara-database.js";
import { raraWrap } from "../../src/lib/rara-menu-style.js";

const pluginConfig = {
  name: "bcpcjeda",
  alias: ["bcpcjeda"],
  category: "owner",
  description: "Atur jeda antar broadcast private contact",
  usage: ".bcpcjeda <angka><satuan>",
  example: ".bcpcjeda 5s",
  isOwner: true, isPremium: false, isGroup: false, isPrivate: false,
  cooldown: 5, energi: 0, isEnabled: true,
};

function parseDelay(input) {
  const match = String(input || "").trim().match(/^(\d+(?:\.\d+)?)(s|m|h|d)$/i);
  if (!match) return null;
  const num = parseFloat(match[1]);
  const unit = match[2].toLowerCase();
  const multipliers = { s: 1000, m: 60000, h: 3600000, d: 86400000 };
  return Math.round(num * multipliers[unit]);
}

function formatDelay(ms) {
  if (ms >= 86400000) return (ms / 86400000).toFixed(1).replace(".0", "") + " hari";
  if (ms >= 3600000) return (ms / 3600000).toFixed(1).replace(".0", "") + " jam";
  if (ms >= 60000) return (ms / 60000).toFixed(1).replace(".0", "") + " menit";
  return (ms / 1000).toFixed(1).replace(".0", "") + " detik";
}

async function handler(m, { sock }) {
  const db = getDatabase();
  const input = m.text?.trim();
  const current = db.setting("jedaBcpc") || 5000;

  if (!input) {
    return m.reply(raraWrap("Jeda Broadcast", `Jeda saat ini: ${formatDelay(current)} (${current}ms)\n\nCara pakai: ${m.prefix}bcpcjeda <angka><satuan>\nSatuan: s(detik) m(menit) h(jam) d(hari)\nContoh: ${m.prefix}bcpcjeda 5s`));
  }

  const ms = parseDelay(input);
  if (!ms || ms < 1000) {
    return m.reply(raraWrap("Jeda Broadcast", `Format salah. Contoh: 5s, 2m, 1h, 1d`));
  }

  const prev = current;
  db.setting("jedaBcpc", ms);

  return m.reply(raraWrap("Jeda Broadcast", `Jeda berhasil diubah.\nSebelumnya: ${formatDelay(prev)}\nSekarang: ${formatDelay(ms)}\nEstimasi 100 kontak: ${Math.ceil((100 * ms) / 60000)} menit`));
}

export { pluginConfig as config, handler };
