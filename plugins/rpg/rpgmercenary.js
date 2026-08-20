// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// RPG Mercenary — Rekrut tentara bayaran untuk bonus tempur
import { claraWrap } from "../../src/lib/nova-menu-style.js";
import { getPlayer, ensurePlayer, addGold, addExp, savePlayer } from "../../src/lib/nova-rpg-service.js";

const pluginConfig = {
  name: "rpgmercenary",
  alias: ["mercenaryrpg", "tentarabayaran", "pasukan", "rekrut", "mercenar"],
  category: "rpg",
  description: "RPG Mercenary — Rekrut tentara bayaran untuk bonus tempur",
  usage: ".rpgmercenary list — Daftar tentara\n.rpgmercenary hire <id> — Rekrut\n.rpgmercenary squad — Lihat pasukan\n.rpgmercenary dismiss <id> — Pecat\n.rpgmercenary deploy — Pasang untuk misi",
  example: ".rpgmercenary hire knight\n.rpgmercenary squad",
  isOwner: false,
  isPremium: false,
  isGroup: true,
  isPrivate: true,
  cooldown: 5,
  energi: 0,
  isEnabled: true,
};

const MERCENARIES = [
  { id: "squire", name: "Squire", emoji: "🛡️", price: 2000, atk: 5, def: 3, upkeep: 50, desc: "Prajurit pemula" },
  { id: "archer", name: "Archer", emoji: "🏹", price: 3500, atk: 10, def: 2, upkeep: 80, desc: "Peneman jitu" },
  { id: "knight", name: "Knight", emoji: "⚔️", price: 8000, atk: 15, def: 10, upkeep: 150, desc: "Ksatria berpengalaman" },
  { id: "berserker", name: "Berserker", emoji: "🪓", price: 12000, atk: 25, def: 5, upkeep: 200, desc: "Pendekar amukan" },
  { id: "paladin", name: "Paladin", emoji: "✝️", price: 18000, atk: 20, def: 20, upkeep: 300, desc: "Ksatria suci" },
  { id: "assassin", name: "Assassin", emoji: "🗡️", price: 15000, atk: 30, def: 3, upkeep: 250, desc: "Pembunuh bayaran" },
  { id: "mage", name: "Battle Mage", emoji: "🔮", price: 20000, atk: 35, def: 8, upkeep: 350, desc: "Penyihir tempur" },
  { id: "dragon", name: "Dragon Knight", emoji: "🐉", price: 50000, atk: 50, def: 30, upkeep: 500, desc: "Legendaris" },
];

const MAX_SQUAD = 4;

async function handler(m, { conn, text, args, usedPrefix, command }) {
  try {
    const action = args[0]?.toLowerCase();
    const player = ensurePlayer(m);

    if (!action || action === "help") {
      return m.reply(claraWrap("RPG Mercenary", [
        "TENTARA BAYARAN",
        "Rekrut pasukan untuk bonus attack & defense",
        "Max squad: " + MAX_SQUAD + " tentara",
        "",
        "DAFTAR MERCENARY:",
      ].concat(MERCENARIES.map(merc => {
        const owned = player.mercenaries?.[merc.id] ? " [DIREKRUT]" : "";
        return merc.emoji + " " + merc.name + " - " + merc.price + " gold" + owned + "\n   ATK:" + merc.atk + " DEF:" + merc.def + " Upkeep:" + merc.upkeep + "/hari";
      })).concat([
        "",
        "PERINTAH:",
        usedPrefix + "rpgmercenary hire <id> - Rekrut",
        usedPrefix + "rpgmercenary squad - Lihat pasukan",
        usedPrefix + "rpgmercenary dismiss <id> - Pecat",
        usedPrefix + "rpgmercenary deploy - Pasang untuk misi",
      ]), "info"));
    }

    if (action === "list") {
      const lines = ["DAFTAR MERCENARY:", ""];
      MERCENARIES.forEach(merc => {
        const owned = player.mercenaries?.[merc.id] ? " [DIREKRUT]" : "";
        lines.push(merc.emoji + " " + merc.name + " (" + merc.id + ")" + owned);
        lines.push("   " + merc.price + " gold | ATK:" + merc.atk + " DEF:" + merc.def);
        lines.push("   Upkeep: " + merc.upkeep + " gold/hari | " + merc.desc);
      });
      return m.reply(claraWrap("RPG Mercenary", lines, "info"));
    }

    if (action === "hire") {
      const mercId = args[1]?.toLowerCase();
      const merc = MERCENARIES.find(x => x.id === mercId);

      if (!merc) {
        return m.reply(claraWrap("RPG Mercenary", "ID tidak ditemukan: " + (mercId || "?"), "warn"));
      }

      if (player.mercenaries?.[merc.id]) {
        return m.reply(claraWrap("RPG Mercenary", merc.name + " sudah direkrut!", "warn"));
      }

      const squadSize = player.mercenaries ? Object.keys(player.mercenaries).length : 0;
      if (squadSize >= MAX_SQUAD) {
        return m.reply(claraWrap("RPG Mercenary", "Squad penuh! Max " + MAX_SQUAD + ". Pecat dulu.", "warn"));
      }

      if ((player.gold || 0) < merc.price) {
        return m.reply(claraWrap("RPG Mercenary", "Gold kurang! Butuh: " + merc.price + " | Punya: " + (player.gold || 0), "warn"));
      }

      addGold(m, -merc.price);
      if (!player.mercenaries) player.mercenaries = {};
      player.mercenaries[merc.id] = {
        name: merc.name,
        emoji: merc.emoji,
        atk: merc.atk,
        def: merc.def,
        upkeep: merc.upkeep,
        hiredAt: Date.now(),
      };
      savePlayer(m, player);

      return m.reply(claraWrap("RPG Mercenary", [
        "BERHASIL REKRUT!",
        merc.emoji + " " + merc.name,
        "ATK: +" + merc.atk + " | DEF: +" + merc.def,
        "Biaya: " + merc.price + " gold | Upkeep: " + merc.upkeep + "/hari",
        "",
        "Squad: " + (squadSize + 1) + "/" + MAX_SQUAD,
      ], "info"));
    }

    if (action === "squad") {
      if (!player.mercenaries || Object.keys(player.mercenaries).length === 0) {
        return m.reply(claraWrap("RPG Mercenary", "Squad kosong! Ketik " + usedPrefix + "rpgmercenary hire <id>", "warn"));
      }

      const lines = ["PASUKAN MERCENARY", ""];
      let totalAtk = 0, totalDef = 0, totalUpkeep = 0;
      let count = 0;

      Object.entries(player.mercenaries).forEach(([id, merc]) => {
        count++;
        totalAtk += merc.atk || 0;
        totalDef += merc.def || 0;
        totalUpkeep += merc.upkeep || 0;
        lines.push(count + ". " + merc.emoji + " " + merc.name);
        lines.push("   ATK:" + merc.atk + " DEF:" + merc.def + " Upkeep:" + merc.upkeep + "/hari");
      });

      lines.push("");
      lines.push("Total: " + count + "/" + MAX_SQUAD);
      lines.push("Bonus ATK: +" + totalAtk + " | Bonus DEF: +" + totalDef);
      lines.push("Upkeep total: " + totalUpkeep + " gold/hari");

      const deployed = player.deployedMercs ? "Aktif" : "Tidak aktif";
      lines.push("Status deploy: " + deployed);

      return m.reply(claraWrap("RPG Mercenary", lines, "info"));
    }

    if (action === "dismiss") {
      const mercId = args[1]?.toLowerCase();
      if (!player.mercenaries?.[mercId]) {
        return m.reply(claraWrap("RPG Mercenary", "Tidak ada mercenary ini di squad", "warn"));
      }

      const merc = player.mercenaries[mercId];
      const refund = Math.round(MERCENARIES.find(m => m.id === mercId)?.price * 0.3) || 0;
      if (refund > 0) addGold(m, refund);
      delete player.mercenaries[mercId];
      savePlayer(m, player);

      return m.reply(claraWrap("RPG Mercenary", [
        merc.emoji + " " + merc.name + " diberhentikan",
        "Refund: " + refund + " gold (30%)",
      ], "info"));
    }

    if (action === "deploy") {
      if (!player.mercenaries || Object.keys(player.mercenaries).length === 0) {
        return m.reply(claraWrap("RPG Mercenary", "Squad kosong! Rekrut dulu", "warn"));
      }

      player.deployedMercs = !player.deployedMercs;
      savePlayer(m, player);

      const status = player.deployedMercs ? "AKTIF" : "NONAKTIF";
      return m.reply(claraWrap("RPG Mercenary", [
        "Deploy " + status,
        player.deployedMercs ? "Bonus squad aktif untuk hunt/battle/boss" : "Bonus squad dimatikan",
      ], "info"));
    }

    return m.reply(claraWrap("RPG Mercenary", "Perintah: list, hire, squad, dismiss, deploy", "warn"));
  } catch (e) {
    console.error("[RpgMercenary]", e);
    return m.reply(claraWrap("RPG Mercenary", "Error: " + e.message, "error"));
  }
}

export { pluginConfig as config, handler };
