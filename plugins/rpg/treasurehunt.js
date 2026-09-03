import { getDatabase } from "../../src/lib/nova-database.js";
import { claraWrap } from "../../src/lib/nova-menu-style.js";
import { animTreasure } from "../../src/lib/nova-rpg-anim.js";

const pluginConfig = {
  name: "treasurehunt",
  alias: ["treasurehunt", "berburuharta", "digtreasure", "harta", "pantai", "beach"],
  category: "rpg",
  description: "Berburu harta karun dengan menggali di 10 lokasi berbeda untuk mendapatkan reward acak",
  usage: ".treasurehunt list\n.treasurehunt <nama_lokasi>",
  example: ".treasurehunt pantai",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 10,
  energi: 0,
  isEnabled: true,
};

const LOCATIONS = [
  { id: "pantai", name: "Pantai", aliases: ["pantai", "beach"], cost: 10, minGold: 200, maxGold: 800, items: ["Mutiara", "Kerang", "Koin Kuno"], digText: "Kamu menggali pasir pantai yang basah di bawah terik matahari..." },
  { id: "gua", name: "Gua", aliases: ["gua", "cave"], cost: 15, minGold: 500, maxGold: 1500, items: ["Ore Emas", "Kristal", "Berlian"], digText: "Kamu menancapkan cangkulmu ke tanah berbatu di dalam gua yang gelap..." },
  { id: "hutan", name: "Hutan", aliases: ["hutan", "forest"], cost: 12, minGold: 300, maxGold: 1000, items: ["Buah Ajaib", "Kayu Langka", "Herbal"], digText: "Kamu menyibak semak-semak dan menggali tanah subur di bawah naungan pohon..." },
  { id: "gunung", name: "Gunung", aliases: ["gunung", "mountain"], cost: 18, minGold: 700, maxGold: 2000, items: ["Mithril", "Jade", "Batu Meteor"], digText: "Kamu mendaki tebing curam dan menggali di antara celah bebatuan gunung..." },
  { id: "laut_dalam", name: "Laut Dalam", aliases: ["laut", "lautdalam", "sea"], cost: 25, minGold: 1000, maxGold: 3000, items: ["Peti Karam", "Mutiara Hitam", "Mahkota Laut"], digText: "Kamu menyelam ke dasar laut dalam dan menggali di antara terumbu karang..." },
  { id: "kuil_reruntuhan", name: "Kuil Reruntuhan", aliases: ["kuil", "kuilreruntuhan", "temple"], cost: 30, minGold: 1500, maxGold: 4000, items: ["Relik Kuno", "Jimat Sihir", "Artefak Emas"], digText: "Kamu membersihkan debu kuno dan menggali lantai batu kuil reruntuhan..." },
  { id: "padang_pasir", name: "Padang Pasir", aliases: ["padangpasir", "pasir", "desert"], cost: 15, minGold: 400, maxGold: 1200, items: ["Kristal Gurun", "Fosil Kuno", "Lampu Ajaib"], digText: "Kamu menggali padang pasir panas di bawah gulungan angin gurun..." },
  { id: "rawa", name: "Rawa", aliases: ["rawa", "swamp"], cost: 14, minGold: 350, maxGold: 1100, items: ["Teratai Hitam", "Jamur Mistik", "Botol Racun"], digText: "Kamu menerobos lumpur pekat dan menggali di sekitar Rawa Mistik..." },
  { id: "pohon_tua", name: "Pohon Tua", aliases: ["pohontua", "tree"], cost: 20, minGold: 800, maxGold: 2500, items: ["Getah Suci", "Daun Emas", "Apel Keabadian"], digText: "Kamu menggali di antara akar raksasa Pohon Tua yang berusia ribuan tahun..." },
  { id: "sungai", name: "Sungai", aliases: ["sungai", "river"], cost: 10, minGold: 200, maxGold: 700, items: ["Serpihan Emas", "Batu Licin", "Koin Perak"], digText: "Kamu menyaring kerikil dan pasir di aliran sungai yang jernih..." }
];

async function handler(m, { sock }) {
  await m.react("🕒");
    await animTreasure(m, sock);
  try {
    const db = await getDatabase();
    const sender = m.sender;
    const input = (m.args.join(" ") || "").toLowerCase().trim();

    if (!input || input === "list") {
      let listMsg = "";
      listMsg += `Pilih lokasi berburu harta karun:

`;
      LOCATIONS.forEach((loc, idx) => {
        listMsg += `${idx + 1}. *${loc.name}*\n`;
        listMsg += `⚡ Biaya: *${loc.cost} Energi*\n`;
        listMsg += `💰 Potensi: *${loc.minGold} - ${loc.maxGold} Gold*\n`;
      });
      listMsg += `💡 *Penggunaan:* ${m.prefix}treasurehunt <nama_lokasi>\n`;
      listMsg += `📝 *Contoh:* ${m.prefix}treasurehunt pantai\n`;
            await m.react("🐣");
      return m.reply(listMsg);
    }

    const loc = LOCATIONS.find(l => l.id === input || l.aliases.includes(input));
    if (!loc) {
      await m.react("❌");
      return m.reply(claraWrap("treasurehunt", `Lokasi "*${input}*" tidak ditemukan.\n\nKetik *${m.prefix}treasurehunt list* untuk melihat daftar lokasi.`, "error"));
    }

    const profile = await db.getPlayerData?.(sender, "profile") || { gold: 1000, energi: 100 };
    const currentEnergi = profile.energi !== undefined ? profile.energi : 100;

    if (currentEnergi < loc.cost && !m.isOwner) {
      await m.react("❌");
      return m.reply(claraWrap("treasurehunt", `Energi kamu tidak cukup! Membutuhkan *${loc.cost} Energi*, kamu hanya memiliki *${currentEnergi} Energi*.`, "error"));
    }

    if (!m.isOwner) {
      profile.energi = currentEnergi - loc.cost;
    }

    const roll = Math.floor(Math.random() * 100) + 1;
    let msg = "";
    msg += `📍 Lokasi: *${loc.name}*\n`;
    msg += `⛏️ *Penggalian:* ${loc.digText}

`;

    const inventory = await db.getPlayerData?.(sender, "inventory") || { items: {} };
    if (!inventory.items) inventory.items = {};

    if (roll <= 20) {
      msg += `❌ *Hasil:* Zonk! Tidak menemukan apa-apa...\n`;
      msg += `💨 Kamu hanya mendapatkan tanah dan batu tak berharga.\n`;
    } else if (roll <= 24) {
      const legGold = Math.floor(Math.random() * 15000) + 10000;
      profile.gold = (profile.gold || 0) + legGold;
      inventory.items["Peti Harta Legendaris"] = (inventory.items["Peti Harta Legendaris"] || 0) + 1;
      msg += `✨ *HARTA LEGENDARIS!* ✨\n`;
      msg += `👑 Kamu menemukan Peti Emas Kuno Berkilau!\n`;
      msg += `💰 Gold: *+${legGold.toLocaleString()} Gold*\n`;
      msg += `📦 Item: *Peti Harta Legendaris x1*\n`;
    } else {
      const goldReward = Math.floor(Math.random() * (loc.maxGold - loc.minGold + 1)) + loc.minGold;
      const itemReward = loc.items[Math.floor(Math.random() * loc.items.length)];
      profile.gold = (profile.gold || 0) + goldReward;
      inventory.items[itemReward] = (inventory.items[itemReward] || 0) + 1;
      msg += `🎁 *Hasil Temuan:* Berhasil!\n`;
      msg += `💰 Gold: *+${goldReward.toLocaleString()} Gold*\n`;
      msg += `📦 Item: *${itemReward} x1*\n`;
    }

    msg += `⚡ Sisa Energi: *${profile.energi}*\n`;
    msg += `💰 Total Gold: *${(profile.gold || 0).toLocaleString()}*\n`;
    
    await db.setPlayerData?.(sender, "profile", profile);
    await db.setPlayerData?.(sender, "inventory", inventory);

    await m.react("🐣");
    return m.reply(msg);
  } catch (err) {
    console.error("treasurehunt error:", err);
    await m.react("❌");
    return m.reply(claraWrap("treasurehunt", err.message || "Terjadi kesalahan sistem.", "error"));
  }
}

export { pluginConfig, pluginConfig as config, handler };
