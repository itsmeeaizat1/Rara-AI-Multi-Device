// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { claraHeader,
  separator,
  tipText,  claraWrap } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "dashboardpremium",
  alias: ["dashboardpremium"],
  category: "owner",
  description: "Leaderboard user yang paling banyak beli premium",
  usage: ".dashboardpremium",
  example: ".dbpremium",
  isOwner: true,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 10,
  energi: 0,
  isEnabled: true,
};

async function handler(m, { sock, config: botConfig }) {
  try {
    const prefix = botConfig.command?.prefix || ".";

    // Load premium list from premium-db
    let premiumList = [];
    try {
      const premiumDb = await import("../../src/lib/nova-premium-db.js");
      premiumList = premiumDb.loadPremium() || [];
    } catch (e) {
      return m.reply(claraWrap("dashboardpremium", "Gagal memuat data premium."));
    }

    if (premiumList.length === 0) {
      return m.reply(
        claraWrap("Dashboard Premium", "💎") + "\n\n" +
        "Belum ada user premium terdaftar.\n\n" +
        separator("━", 22) + "\n" +
        tipText(`Gunakan ${prefix}addprem untuk menambah premium`)
      );
    }

    // Filter active premium only (not expired)
    const now = new Date();
    const active = premiumList.filter((p) => {
      if (!p.expiredAt) return false;
      return new Date(p.expiredAt) > now;
    });

    // Sort by timesBought desc, then by totalDays desc
    const sorted = premiumList
      .map((p) => ({
        name: p.name || "Unknown",
        number: p.number || p.jid || "?",
        timesBought: p.timesBought || 1,
        totalDays: p.totalDays || 0,
        expiredAt: p.expiredAt,
        addedAt: p.addedAt,
        isActive: p.expiredAt && new Date(p.expiredAt) > now,
      }))
      .sort((a, b) => {
        if (b.timesBought !== a.timesBought) return b.timesBought - a.timesBought;
        return b.totalDays - a.totalDays;
      });

    const totalAll = sorted.reduce((a, p) => a + p.timesBought, 0);
    const totalDays = sorted.reduce((a, p) => a + p.totalDays, 0);

    let text = claraWrap("Dashboard Premium", "💎") + "\n\n";

    text += claraWrap("STATS", [`│ Total User: *${sorted.length}*`, `│ User Aktif: *${active.length}*`, `│ Total Pembelian: *${totalAll}x*`, `│ Total Hari: *${totalDays} hari*`].join("\n")) + "\n\n";

    // Readmore trick
    const more = String.fromCharCode(8206);
    const readMore = more.repeat(4001);

    text += separator("━", 30) + "\n";
    text += "TOP PREMIUM BUYERS\n";
    text += separator("━", 30) + "\n\n";

    // Show top 10 (visible), rest after readmore
    const top10 = sorted.slice(0, 10);
    const rest = sorted.slice(10);

    let rank = 1;
    for (const p of top10) {
      const status = p.isActive ? "🟢" : "⚫";
      const num = p.number.length > 8
        ? p.number.slice(0, 4) + "..." + p.number.slice(-3)
        : p.number;

      text += `${rank}. ${status} *${p.name}*\n`;
      text += `   ${num} — ${p.timesBought}x beli (${p.totalDays} hari)\n`;
      rank++;
    }

    if (rest.length > 0) {
      text += readMore + "\n";
      for (const p of rest) {
        const status = p.isActive ? "🟢" : "⚫";
        const num = p.number.length > 8
          ? p.number.slice(0, 4) + "..." + p.number.slice(-3)
          : p.number;

        text += `${rank}. ${status} *${p.name}*\n`;
        text += `   ${num} — ${p.timesBought}x beli (${p.totalDays} hari)\n`;
        rank++;
      }
    }

    text += "\n" + separator("━", 30) + "\n";
    text += "🟢 Aktif  ⚫ Expired\n\n";
    text += tipText(`Ketik ${prefix}listprem untuk list premium aktif`);

    await m.reply( text, "dashboardpremium");
  } catch (error) {
    const text =
      claraWrap("Gagal", [`│ Status: *Gagal*`,
        `│ Alasan: *${error.message}*`].join("\n")) +
      "\n" +
      tipText(`Coba lagi nanti atau hubungi owner`);

    await m.reply(claraWrap("dashboardpremium", text));
  }

  return { handled: true };
}

export { pluginConfig as config, handler };
