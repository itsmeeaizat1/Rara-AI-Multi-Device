// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// RPG Contract — Kontrak NPC, selesaikan tugas untuk hadiah
import { claraWrap } from "../../src/lib/nova-menu-style.js";
import { getPlayer, ensurePlayer, addGold, addExp, savePlayer } from "../../src/lib/nova-rpg-service.js";

const pluginConfig = {
  name: "rpgcontract",
  alias: ["contractrpg", "tugasnpc", "misikhusus", "questnpc"],
  category: "rpg",
  description: "RPG Contract — Ambil kontrak dari NPC, selesaikan untuk hadiah besar",
  usage: ".rpgcontract — Lihat kontrak aktif\n.rpgcontract board — Papan kontrak (3 pilihan)\n.rpgcontract take <nomor> — Ambil kontrak\n.rpgcontract complete — Selesaikan kontrak (auto-check)\n.rpgcontract abandon — Buang kontrak",
  example: ".rpgcontract board\n.rpgcontract take 1",
  isOwner: false,
  isPremium: false,
  isGroup: true,
  isPrivate: true,
  cooldown: 5,
  energi: 0,
  isEnabled: true,
};

// NPC contracts
const NPCS = [
  { id: "merchant", name: "Merchant Guild", emoji: "🧑‍💼", type: "collect", desc: "Kumpulkan material" },
  { id: "blacksmith", name: "Blacksmith", emoji: "⚒️", type: "collect", desc: "Butuh ore" },
  { id: "alchemist", name: "Alchemist", emoji: "🧙", type: "collect", desc: "Butuh herba" },
  { id: "knight", name: "Knight Captain", emoji: "🛡️", type: "combat", desc: "Bunuh monster" },
  { id: "hunter", name: "Head Hunter", emoji: "🏹", type: "combat", desc: "Burang binatang" },
  { id: "wizard", name: "Arch Wizard", emoji: "🧙‍♂️", type: "special", desc: "Tugas khusus" },
];

const CONTRACT_TEMPLATES = [
  // Collect contracts
  { npc: "merchant", req: { item: "wood", count: 10 }, reward: { gold: 2000, exp: 100 }, name: "Kayu untuk Kerajaan" },
  { npc: "merchant", req: { item: "rock", count: 15 }, reward: { gold: 3000, exp: 150 }, name: "Batu Konstruksi" },
  { npc: "blacksmith", req: { item: "iron", count: 8 }, reward: { gold: 4000, exp: 200 }, name: "Besi Senjata" },
  { npc: "blacksmith", req: { item: "diamond", count: 3 }, reward: { gold: 10000, exp: 500 }, name: "Berlian Premium" },
  { npc: "alchemist", req: { item: "string", count: 12 }, reward: { gold: 2500, exp: 120 }, name: "Benang Lab" },
  { npc: "alchemist", req: { item: "emerald", count: 5 }, reward: { gold: 8000, exp: 400 }, name: "Zamrud Alkimia" },
  // Combat contracts
  { npc: "knight", req: { item: "exp", count: 500 }, reward: { gold: 5000, exp: 300 }, name: "Latihan Tempur" },
  { npc: "knight", req: { item: "exp", count: 2000 }, reward: { gold: 15000, exp: 1000 }, name: "Bukti Ksatria" },
  { npc: "hunter", req: { item: "gold", count: 3000 }, reward: { gold: 6000, exp: 500 }, name: "Tarif Pemburu" },
  // Special contracts
  { npc: "wizard", req: { item: "diamond", count: 5 }, reward: { gold: 25000, exp: 2000 }, name: "Ritual Penyihir" },
  { npc: "wizard", req: { item: "emerald", count: 10 }, reward: { gold: 30000, exp: 2500 }, name: "Kristal Arcane" },
];

function generateBoard() {
  // Pick 3 random contracts
  const shuffled = [...CONTRACT_TEMPLATES].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, 3);
}

async function handler(m, { conn, text, args, usedPrefix, command }) {
  try {
    const action = args[0]?.toLowerCase();
    const player = ensurePlayer(m);

    if (!action || action === "help") {
      return m.reply(claraWrap("RPG Contract", [
        "KONTRAK NPC",
        "Ambil tugas dari NPC, selesaikan untuk hadiah besar",
        "Hanya 1 kontrak aktif sekaligus",
        "",
        "PERINTAH:",
        usedPrefix + "rpgcontract board - Lihat papan (3 pilihan)",
        usedPrefix + "rpgcontract take <nomor> - Ambil kontrak",
        usedPrefix + "rpgcontract - Lihat kontrak aktif",
        usedPrefix + "rpgcontract complete - Selesaikan (auto-check)",
        usedPrefix + "rpgcontract abandon - Buang kontrak",
        "",
        "Kontrak auto-check: cukup punya item, lalu complete",
      ], "info"));
    }

    if (action === "board") {
      if (player.activeContract) {
        return m.reply(claraWrap("RPG Contract", [
          "Masih ada kontrak aktif!",
          "Selesaikan dulu: " + usedPrefix + "rpgcontract complete",
          "Atau buang: " + usedPrefix + "rpgcontract abandon",
        ], "warn"));
      }

      const board = generateBoard();
      player.contractBoard = board;
      savePlayer(m, player);

      const lines = ["PAPAN KONTRAK", ""];
      board.forEach((contract, i) => {
        const npc = NPCS.find(n => n.id === contract.npc);
        lines.push((i + 1) + ". " + npc.emoji + " " + contract.name);
        lines.push("   NPC: " + npc.name);
        lines.push("   Butuh: " + contract.req.count + " " + contract.req.item);
        lines.push("   Hadiah: " + contract.reward.gold + " gold + " + contract.reward.exp + " exp");
      });
      lines.push("");
      lines.push("Ambil: " + usedPrefix + "rpgcontract take <nomor>");

      return m.reply(claraWrap("RPG Contract", lines, "info"));
    }

    if (action === "take") {
      const num = parseInt(args[1]);
      if (!num || num < 1 || num > 3) {
        return m.reply(claraWrap("RPG Contract", "Nomor tidak valid (1-3)", "warn"));
      }
      if (!player.contractBoard || player.contractBoard.length < num) {
        return m.reply(claraWrap("RPG Contract", "Papan kosong. Ketik " + usedPrefix + "rpgcontract board", "warn"));
      }
      if (player.activeContract) {
        return m.reply(claraWrap("RPG Contract", "Sudah ada kontrak aktif!", "warn"));
      }

      const contract = player.contractBoard[num - 1];
      player.activeContract = { ...contract, takenAt: Date.now() };
      delete player.contractBoard;
      savePlayer(m, player);

      const npc = NPCS.find(n => n.id === contract.npc);
      return m.reply(claraWrap("RPG Contract", [
        "Kontrak diterima!",
        npc.emoji + " " + contract.name,
        "",
        "NPC: " + npc.name,
        "Target: " + contract.req.count + " " + contract.req.item,
        "Hadiah: " + contract.reward.gold + " gold + " + contract.reward.exp + " exp",
        "",
        "Kumpulkan item lalu: " + usedPrefix + "rpgcontract complete",
      ], "info"));
    }

    if (!action || action === "status") {
      if (!player.activeContract) {
        return m.reply(claraWrap("RPG Contract", [
          "Tidak ada kontrak aktif",
          "Lihat papan: " + usedPrefix + "rpgcontract board",
        ], "warn"));
      }

      const c = player.activeContract;
      const npc = NPCS.find(n => n.id === c.npc);
      const current = player[c.req.item] || 0;
      const progress = Math.min(100, Math.round((current / c.req.count) * 100));
      const bar = "█".repeat(Math.round(progress / 10)) + "░".repeat(10 - Math.round(progress / 10));

      return m.reply(claraWrap("RPG Contract", [
        "KONTRAK AKTIF",
        npc.emoji + " " + c.name,
        "NPC: " + npc.name,
        "",
        "Progress: " + current + "/" + c.req.count + " " + c.req.item,
        "[" + bar + "] " + progress + "%",
        "",
        "Hadiah: " + c.reward.gold + " gold + " + c.reward.exp + " exp",
        "",
        current >= c.req.count ? "Siap diselesaikan! Ketik " + usedPrefix + "rpgcontract complete" : "Kumpulkan " + (c.req.count - current) + " lagi",
      ], "info"));
    }

    if (action === "complete") {
      if (!player.activeContract) {
        return m.reply(claraWrap("RPG Contract", "Tidak ada kontrak aktif", "warn"));
      }

      const c = player.activeContract;
      const current = player[c.req.item] || 0;

      if (current < c.req.count) {
        return m.reply(claraWrap("RPG Contract", [
          "Belum cukup!",
          "Butuh: " + c.req.count + " " + c.req.item,
          "Punya: " + current,
          "Kurang: " + (c.req.count - current),
        ], "warn"));
      }

      // Consume items
      player[c.req.item] = current - c.req.count;

      // Give rewards
      addGold(m, c.reward.gold);
      addExp(m, c.reward.exp);

      const npc = NPCS.find(n => n.id === c.npc);
      delete player.activeContract;
      savePlayer(m, player);

      return m.reply(claraWrap("RPG Contract", [
        "KONTRAK SELESAI!",
        npc.emoji + " " + c.name,
        "",
        "Item dikumpulkan: -" + c.req.count + " " + c.req.item,
        "Hadiah: +" + c.reward.gold + " gold",
        "Exp: +" + c.reward.exp,
        "Gold: " + (player.gold || 0),
        "",
        "Ambil kontrak baru: " + usedPrefix + "rpgcontract board",
      ], "info"));
    }

    if (action === "abandon") {
      if (!player.activeContract) {
        return m.reply(claraWrap("RPG Contract", "Tidak ada kontrak aktif", "warn"));
      }
      const name = player.activeContract.name;
      delete player.activeContract;
      savePlayer(m, player);
      return m.reply(claraWrap("RPG Contract", "Kontrak '" + name + "' dibuang.", "warn"));
    }

    return m.reply(claraWrap("RPG Contract", "Perintah: board, take, complete, abandon, status", "warn"));
  } catch (e) {
    console.error("[RpgContract]", e);
    return m.reply(claraWrap("RPG Contract", "Error: " + e.message, "error"));
  }
}

export { pluginConfig as config, handler };
