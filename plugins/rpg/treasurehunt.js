import { getDatabase } from "../../src/lib/nova-database.js";
import { getCash, spendCash, formatRp } from "../../src/lib/nova-rpg-service.js";
import { novaRpgBox } from "../../src/lib/nova-games.js";
import { shapeTreasure } from "../../src/lib/nova-rpg-shapes.js";

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

// ─── KHAS TREASUREHUNT: 🗝️ Artefak Kuno & 🧭 Kompas Detektor ───
const TOOL = {
  name: "🧭 Kompas Detektor", dbKey: "treasureTool",
  ARTIFACT_CHANCE: 30,        // % per harta ketemu
  artifactCost: (lv) => 2 * (lv + 1),
  rpCost: (lv) => 50000 * (lv + 1),
  zonkDown: (lv) => 2 * lv,   // peluang zonk −2% per level
  zonkMax: (lv) => Math.max(6, 20 - 2 * lv),
};
const getTool = (jid) => (getDatabase().getPlayerData(jid, TOOL.dbKey) || { level: 0, spent: 0, artifacts: 0 });

async function handler(m, { sock }) {
  await m.react("🕒");
  try {
    const db = await getDatabase();
    const sender = m.sender;
    const input = (m.args.join(" ") || "").toLowerCase().trim();
    const tool = getTool(sender);
    const lv = tool.level || 0;

    // ── subcommand khas treasurehunt: kompas status & upgrade ──
    if (input === "kompas" || input === "status") {
      return m.reply(novaRpgBox("treasurehunt",
        `🧭 KOMPAS DETECTOR KAMU

` +
        `Level : *Lv.${lv}*
💨 Peluang zonk : −${TOOL.zonkDown(lv)}% (zonk maks ${TOOL.zonkMax(lv)}%)
🗝️ Artefak Kuno : ${tool.artifacts || 0}x
💵 Uang : ${formatRp(getCash(m))}

` +
        `💡 Upgrade ke Lv.${lv + 1}: ${TOOL.artifactCost(lv)}x Artefak + ${formatRp(TOOL.rpCost(lv))}
Ketik: .treasurehunt upgrade`));
    }

    if (input === "upgrade") {
      const needArt = TOOL.artifactCost(lv);
      const needRp = TOOL.rpCost(lv);
      if ((tool.artifacts || 0) < needArt) {
        return m.reply(novaRpgBox("treasurehunt",
          `🗝️ Upgrade Kompas ke Lv.${lv + 1} butuh:

• Artefak Kuno : ${needArt}x (punya ${tool.artifacts || 0}x)
• Biaya : ${formatRp(needRp)}

💡 Artefak didapat dari .treasurehunt sendiri — 30% tiap harta ketemu, peti legendaris dijamin +2!`, "warn"));
      }
      if (!spendCash(m, needRp)) {
        return m.reply(novaRpgBox("treasurehunt", `💵 Upgrade butuh *${formatRp(needRp)}*.
Uang kamu: ${formatRp(getCash(m))}
💡 Kerja dulu: .nguli kerja / .kerja`, "warn"));
      }
      const fresh = getTool(sender);
      fresh.artifacts = (fresh.artifacts || 0) - needArt;
      fresh.level = (fresh.level || 0) + 1;
      fresh.spent = (fresh.spent || 0) + needRp;
      getDatabase().setPlayerData(sender, TOOL.dbKey, fresh);
      await m.react("🐣");
      return m.reply(novaRpgBox("treasurehunt",
        `🧭 KOMPAS UPGRADED!

Level : Lv.${lv} → Lv.${lv + 1}
💨 Peluang zonk : −${TOOL.zonkDown(lv + 1)}% (zonk maks ${TOOL.zonkMax(lv + 1)}%)

🗝️ Material : −${needArt} Artefak Kuno
💵 Biaya : ${formatRp(needRp)}`, "success"));
    }

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
      return m.reply(novaRpgBox("treasurehunt", listMsg));
    }

    const loc = LOCATIONS.find(l => l.id === input || l.aliases.includes(input));
    if (!loc) {
      await m.react("❌");
      return m.reply(novaRpgBox("treasurehunt", `Lokasi "*${input}*" tidak ditemukan.\n\nKetik *${m.prefix}treasurehunt list* untuk melihat daftar lokasi.`, "error"));
    }

    const profile = await db.getPlayerData?.(sender, "profile") || { gold: 1000, energi: 100 };
    const currentEnergi = profile.energi !== undefined ? profile.energi : 100;

    if (currentEnergi < loc.cost && !m.isOwner) {
      await m.react("❌");
      return m.reply(novaRpgBox("treasurehunt", `Energi kamu tidak cukup! Membutuhkan *${loc.cost} Energi*, kamu hanya memiliki *${currentEnergi} Energi*.`, "error"));
    }

    if (!m.isOwner) {
      profile.energi = currentEnergi - loc.cost;
    }

    // Animasi khas treasurehunt: PETA MENDEKAT (grid, 📍 → ❌)
    await shapeTreasure(m, sock, loc.name);

    const roll = Math.floor(Math.random() * 100) + 1;
    const zonkMax = TOOL.zonkMax(lv);

    const inventory = await db.getPlayerData?.(sender, "inventory") || { items: {} };
    if (!inventory.items) inventory.items = {};

    let resultFlavor = "";
    let resultLines = [];
    if (roll <= zonkMax) {
      resultFlavor = "💨 *ZONK!*";
      resultLines = [
        "Zonk! Tidak menemukan apa-apa...",
        "Kamu hanya mendapatkan tanah dan batu tak berharga.",
      ];
    } else if (roll <= zonkMax + 4) {
      const legGold = Math.floor(Math.random() * 15000) + 10000;
      profile.gold = (profile.gold || 0) + legGold;
      inventory.items["Peti Harta Legendaris"] = (inventory.items["Peti Harta Legendaris"] || 0) + 1;
      // 🗝️ Artefak Kuno — peti legendaris DIJAMIN +2
      const freshT = getTool(sender);
      freshT.artifacts = (freshT.artifacts || 0) + 2;
      getDatabase().setPlayerData(sender, TOOL.dbKey, freshT);
      resultFlavor = "👑 HARTA LEGENDARIS!";
      resultLines = [
        "Kamu menemukan Peti Emas Kuno Berkilau!",
        `👑 Temuan : Peti Harta Legendaris x1`,
        `💰 Gold : +${legGold.toLocaleString()}`,
        `💵 Uang : Rp ${getCash(m)}`,
        `🗝️ Artefak Kuno : +2x (total ${freshT.artifacts}x)`,
      ];
    } else {
      const goldReward = Math.floor(Math.random() * (loc.maxGold - loc.minGold + 1)) + loc.minGold;
      const itemReward = loc.items[Math.floor(Math.random() * loc.items.length)];
      profile.gold = (profile.gold || 0) + goldReward;
      inventory.items[itemReward] = (inventory.items[itemReward] || 0) + 1;
      // 🗝️ Artefak Kuno — 30% tiap harta ketemu
      let artGain = 0;
      if (Math.random() * 100 < TOOL.ARTIFACT_CHANCE) {
        artGain = 1;
        const freshT = getTool(sender);
        freshT.artifacts = (freshT.artifacts || 0) + 1;
        getDatabase().setPlayerData(sender, TOOL.dbKey, freshT);
      }
      resultFlavor = "🎁 HARTA DITEMUKAN!";
      resultLines = [
        `📦 Temuan : ${itemReward} x1`,
        `💰 Gold : +${goldReward.toLocaleString()}`,
        `💵 Uang : Rp ${getCash(m)}`,
        ...(artGain ? [`🗝️ Artefak Kuno : +1x (total ${getTool(sender).artifacts}x)`] : []),
      ];
    }

    await db.setPlayerData?.(sender, "profile", profile);
    await db.setPlayerData?.(sender, "inventory", inventory);

    await m.react("🐣");
    return m.reply(novaRpgBox("treasurehunt",
      `${resultFlavor}\n\n` +
      `📍 ${loc.name} — ${loc.digText}\n\n` +
      `${resultLines.join("\n")}\n\n` +
      `⚡ Sisa energi : ${profile.energi}\n💰 Total gold : ${(profile.gold || 0).toLocaleString()}\n` +
      (lv ? `🧭 Kompas : Lv.${lv} (zonk −${TOOL.zonkDown(lv)}%)` : `💡 Kompas bisa diupgrade: .treasurehunt kompas`)));
  } catch (err) {
    console.error("treasurehunt error:", err);
    await m.react("❌");
    return m.reply(novaRpgBox("treasurehunt", err.message || "Terjadi kesalahan sistem.", "error"));
  }
}

export { pluginConfig, pluginConfig as config, handler };
