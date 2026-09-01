// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// farmrpg.js — Farming system (plant, grow, harvest, sell)
import { getDatabase } from "../../src/lib/nova-database.js";
import { claraWrap } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "farmrpg",
  alias: ["farmrpg", "farm", "kebun", "tanam"],
  category: "rpg",
  description: "Farming system — tanam, panen, jual hasil tani",
  usage: ".farmrpg (cek kebun)\n.farmrpg plant <crop> (tanam)\n.farmrpg harvest (panen)\n.farmrpg shop (beli benih)",
  example: ".farmrpg plant wortel",
  isOwner: false, isPremium: false, isGroup: false, isPrivate: false,
  cooldown: 5, energi: 1, isEnabled: true,
};

const CROPS = [
  { name: "Wortel", emoji: "🥕", seedCost: 50, sellPrice: 150, growTime: 5 * 60 * 1000 },
  { name: "Kentang", emoji: "🥔", seedCost: 80, sellPrice: 250, growTime: 10 * 60 * 1000 },
  { name: "Tomat", emoji: "🍅", seedCost: 70, sellPrice: 280, growTime: 15 * 60 * 1000 },
  { name: "Cabai", emoji: "🌶️", seedCost: 200, sellPrice: 800, growTime: 60 * 60 * 1000 },
  { name: "Jagung", emoji: "🌽", seedCost: 100, sellPrice: 450, growTime: 30 * 60 * 1000 },
  { name: "Padi", emoji: "🌾", seedCost: 300, sellPrice: 1500, growTime: 120 * 60 * 1000 },
];

const MAX_PLOTS = 6;

async function getData(db, sender) {
  return await db.getPlayerData?.(sender, "farm") || { plots: [], harvested: [], totalGold: 0 };
}
async function saveData(db, sender, data) {
  await db.setPlayerData?.(sender, "farm", data);
}

async function handler(m, { sock }) {
  try {
    const subCmd = (m.args[0] || "").toLowerCase();
    const db = await getDatabase();
    const data = await getData(db, m.sender);

    if (subCmd === "shop" || subCmd === "toko") {
      let msg = `╭─「 ғᴀʀᴍ sʜᴏᴘ 」\n`;
      CROPS.forEach(c => {
        const mins = c.growTime / 60000;
        msg += `│ ${c.emoji} ${c.name} — Benih: ${c.seedCost}g | Jual: ${c.sellPrice}g | Tumbuh: ${mins >= 60 ? Math.floor(mins/60)+'j' : mins+'m'}\n`;
      });
      msg += `│\n`;
      msg += `│ ${m.prefix}farmrpg plant <crop>\n`;
      msg += `╰──────────`;
      return m.reply(msg);
    }

    if (subCmd === "plant" || subCmd === "tanam") {
      const cropName = m.args.slice(1).join(" ").trim().toLowerCase();
      const crop = CROPS.find(c => c.name.toLowerCase() === cropName);
      if (!crop) {
        return m.reply(claraWrap("farmrpg", `Tanaman tidak ditemukan. Lihat: ${m.prefix}farmrpg shop`, "error"));
      }

      const emptyPlots = MAX_PLOTS - (data.plots?.length || 0);
      if (emptyPlots <= 0) {
        return m.reply(claraWrap("farmrpg", "Kebun penuh! Panen dulu.", "error"));
      }

      try {
        const gold = await db.getGold?.(m.sender) || 0;
        if (gold < crop.seedCost) return m.reply(claraWrap("farmrpg", `Gold kurang! Butuh ${crop.seedCost}g.`, "error"));
        await db.minGold?.(m.sender, crop.seedCost);
      } catch {}

      if (!data.plots) data.plots = [];
      data.plots.push({ crop: crop.name, emoji: crop.emoji, planted: Date.now(), growTime: crop.growTime });
      await saveData(db, m.sender, data);

      await m.react("🐣");
      const mins = crop.growTime / 60000;
      return m.reply(claraWrap("farmrpg", `${crop.emoji} Berhasil tanam *${crop.name}*!\nSiap panen dalam ${mins >= 60 ? Math.floor(mins/60)+'j ' : ''}${mins % 60}m`));
    }

    if (subCmd === "harvest" || subCmd === "panen") {
      if (!data.plots || data.plots.length === 0) {
        return m.reply(claraWrap("farmrpg", "Tidak ada tanaman untuk dipanen.", "error"));
      }

      const now = Date.now();
      const ready = [];
      const stillGrowing = [];
      data.plots = data.plots.filter(p => {
        if (now - p.planted >= p.growTime) { ready.push(p); return false; }
        stillGrowing.push(p); return true;
      });

      if (ready.length === 0) {
        const next = stillGrowing[0];
        const remaining = Math.ceil((next.growTime - (now - next.planted)) / 60000);
        return m.reply(claraWrap("farmrpg", `Belum ada yang siap panen. Terdekat: *${next.emoji} ${next.crop}* dalam ${remaining}m.`));
      }

      if (!data.harvested) data.harvested = [];
      let totalValue = 0;
      let harvestedList = [];
      ready.forEach(r => {
        const crop = CROPS.find(c => c.name === r.crop);
        if (crop) {
          data.harvested.push({ name: crop.name, emoji: crop.emoji, sellPrice: crop.sellPrice });
          totalValue += crop.sellPrice;
          harvestedList.push(`${crop.emoji} ${crop.name}`);
        }
      });
      await saveData(db, m.sender, data);

      await m.react("🐣");
      let msg = `╭─「 ᴘᴀɴᴇɴ ʙᴇʀʜᴀsɪʟ 」\n`;
      msg += `│ ${harvestedList.join(", ")}\n`;
      msg += `│ Total: *${ready.length}* tanaman | *${totalValue}g* nilai\n`;
      msg += `│\n`;
      msg += `│ Jual: ${m.prefix}farmrpg sell\n`;
      msg += `╰──────────`;
      return m.reply(msg);
    }

    if (subCmd === "sell" || subCmd === "jual") {
      if (!data.harvested || data.harvested.length === 0) {
        return m.reply(claraWrap("farmrpg", "Tidak ada hasil panen untuk dijual.", "error"));
      }
      const totalGold = data.harvested.reduce((s, h) => s + (h.sellPrice || 0), 0);
      try { await db.addGold?.(m.sender, totalGold); } catch {}
      const count = data.harvested.length;
      data.harvested = [];
      await saveData(db, m.sender, data);
      await m.react("🐣");
      return m.reply(claraWrap("farmrpg", `💰 Jual ${count} hasil panen = *+${totalGold} gold*!`));
    }

    // VIEW FARM (default)
    const now = Date.now();
    let msg = `╭─「 ᴋᴇʙᴜɴ 」\n`;
    msg += `│ Plot: *${data.plots?.length || 0}/${MAX_PLOTS}*\n`;
    msg += `│\n`;
    if (data.plots && data.plots.length > 0) {
      data.plots.forEach((p, i) => {
        const elapsed = now - p.planted;
        const isReady = elapsed >= p.growTime;
        const remaining = Math.max(0, Math.ceil((p.growTime - elapsed) / 60000));
        msg += `│ ${i + 1}. ${p.emoji} ${p.crop} ${isReady ? "✅ SIAP!" : `⏳ ${remaining}m`}\n`;
      });
    } else {
      msg += `│ (Kebun kosong)\n`;
    }
    if (data.harvested?.length > 0) {
      msg += `│\n`;
      msg += `│ Hasil panen: *${data.harvested.length}* item\n`;
      msg += `│ ${m.prefix}farmrpg sell - jual hasil\n`;
    }
    msg += `│\n`;
    msg += `│ ${m.prefix}farmrpg shop - beli benih\n`;
    msg += `│ ${m.prefix}farmrpg plant <crop> - tanam\n`;
    msg += `╰──────────`;
    return m.reply(msg);
  } catch (err) {
    console.error("farmrpg error:", err);
    await m.react("❌");
    return m.reply(claraWrap("farmrpg", err.message || "Error", "error"));
  }
}

export { pluginConfig as config, handler };
