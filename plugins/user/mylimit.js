// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { claraWrap } from "../../src/lib/nova-menu-style.js";
import { getDatabase } from "../../src/lib/nova-database.js";
import { runLiveTicker } from "../../src/lib/nova-countdown.js";
import { computeNextResetTs, buildLimitCard } from "../../src/lib/nova-limit-card.js";
import config from "../../config.js";

const pluginConfig = {
  name: "mylimit",
  alias: ["mylimit"],
  category: "user",
  description: "Cek sisa limit harian, total dipakai, dan jam reset",
  usage: ".mylimit",
  example: ".mylimit",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 3,
  energi: 0,
  isEnabled: true,
};

function formatNumber(num) {
  if (num === -1) return "∞ Unlimited";
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

async function handler(m, { sock }) {
  const db = getDatabase();
  const user = db.getUser(m.sender) || db.setUser(m.sender);
  const currentEnergi = user?.energi ?? config.energi?.default ?? 300;
  const isPremium = user?.isPremium || false;
  const isOwner = m.isOwner;

  // Weekend check
  const hariIni = new Date().toLocaleDateString("en-US", { timeZone: "Asia/Jakarta", weekday: "long" });
  const isWeekend = hariIni === "Saturday" || hariIni === "Sunday";

  // Hitung total dipakai
  const baseLimit = isPremium ? (config.energi?.premium ?? 1000) : (config.energi?.default ?? 300);
  const weekendBonus = isWeekend && !isPremium && !isOwner ? baseLimit : 0;
  const totalLimit = baseLimit + weekendBonus;
  const terpakai = isOwner ? 0 : (currentEnergi === -1 ? 0 : Math.max(0, totalLimit - currentEnergi));

  // Reset jam
  const resetHour = config.scheduler?.resetHour ?? 0;
  const resetMinute = config.scheduler?.resetMinute ?? 0;
  const resetTime = `${String(resetHour).padStart(2, "0")}:${String(resetMinute).padStart(2, "0")}`;

  let status;
  if (isOwner) {
    status = "Owner (Unlimited)";
  } else if (isPremium) {
    status = "Premium";
  } else if (isWeekend) {
    status = "Free (Weekend x2)";
  } else {
    status = "Free";
  }

  // ⏳ PENGHITUNG (13 Sep 2026): meter terpakai + countdown live ke reset
  const isUnlimited = isOwner || currentEnergi === -1;
  const cardCtx = {
    title: "My Limit",
    name: m.pushName || "",
    status,
    sisa: formatNumber(currentEnergi),
    terpakai: !isUnlimited ? formatNumber(terpakai) : null,
    total: !isUnlimited ? totalLimit : null,
    resetTime,
    extra: [
      isWeekend && !isPremium && !isOwner
        ? `🎁 Bonus weekend: *+${formatNumber(weekendBonus)} limit*`
        : "",
    ],
    footer: "Beli limit? Ketik `.buyenergi <jumlah>`",
    isUnlimited,
  };

  if (isUnlimited) {
    // owner/unlimited → gak ada yang dihitung, kartu statis cukup
    return m.reply(buildLimitCard({ ...cardCtx, remainingMs: -1 }));
  }

  const targetTs = computeNextResetTs(resetHour, resetMinute);
  // fire-and-forget: gak nahan command/react 🐣
  runLiveTicker({
    sock,
    chat: m.chat,
    m,
    initialCard: buildLimitCard({ ...cardCtx, remainingMs: targetTs - Date.now() }),
    tickCard: (st) => buildLimitCard({ ...cardCtx, remainingMs: st.remainingMs }),
    finalCard: (st) => buildLimitCard({ ...cardCtx, remainingMs: st.remainingMs }),
    mode: "down",
    targetTs,
  }).catch(() => {});
  return;
}

export { pluginConfig as config, handler };
