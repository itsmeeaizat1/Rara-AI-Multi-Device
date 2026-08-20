// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// RPG Tavern — Penginapan, istirahat pulih HP & stamina, dapat buff sementara
import { claraWrap } from "../../src/lib/nova-menu-style.js";
import { getPlayer, ensurePlayer, addGold, addExp, savePlayer } from "../../src/lib/nova-rpg-service.js";

const pluginConfig = {
  name: "rpgtavern",
  alias: ["tavernrpg", "penginapan", "istirahat", "bar", "warungrpg", "nongkrong"],
  category: "rpg",
  description: "RPG Tavern — Istirahat pulih HP & stamina, makan untuk buff",
  usage: ".rpgtavern — Menu tavern\n.rpgtavern rest — Istirahat (gold)\n.rpgtavern drink <menu> — Minum untuk buff\n.rpgtavern feast — Makan besar (party)",
  example: ".rpgtavern rest\n.rpgtavern drink ale",
  isOwner: false,
  isPremium: false,
  isGroup: true,
  isPrivate: true,
  cooldown: 30,
  energi: 0,
  isEnabled: true,
};

const REST_COST = 300;
const REST_HP = 50;
const REST_STAMINA = 30;

const DRINKS = [
  { id: "water", name: "Air Putih", emoji: "💧", price: 50, buff: "none", duration: 0, desc: "Biasa saja" },
  { id: "ale", name: "Ale", emoji: "🍺", price: 200, buff: "atk", duration: 1800, desc: "+10% atk (30 mnt)" },
  { id: "wine", name: "Wine", emoji: "🍷", price: 500, buff: "exp", duration: 1800, desc: "+15% exp (30 mnt)" },
  { id: "elixir", name: "Elixir", emoji: "🧪", price: 2000, buff: "all", duration: 3600, desc: "+10% semua (1 jam)" },
  { id: "coffee", name: "Kopi", emoji: "☕", price: 150, buff: "stamina", duration: 1800, desc: "Stamina tidak turun (30 mnt)" },
];

const FEAST_COST = 3000;
const FEAST_HP = 100;
const FEAST_STAMINA = 50;
const FEAST_EXP = 200;

async function handler(m, { conn, text, args, usedPrefix, command }) {
  try {
    const action = args[0]?.toLowerCase();
    const player = ensurePlayer(m);

    if (!action || action === "help") {
      const lines = [
        "TAVERN RPG — PENGINAPAN",
        "Istirahat, minum, makan untuk pulih & buff",
        "",
        "LAYANAN:",
        "1. Rest — " + REST_COST + " gold",
        "   Pulihkan HP +" + REST_HP + " Stamina +" + REST_STAMINA,
        "",
        "2. Drink — Minuman dengan buff",
        "3. Feast — " + FEAST_COST + " gold",
        "   Full HP + Stamina + " + FEAST_EXP + " exp",
        "",
        "DAFTAR MINUMAN:",
      ];
      DRINKS.forEach(d => {
        lines.push(d.emoji + " " + d.name + " - " + d.price + " gold");
        lines.push("   " + d.desc);
      });
      lines.push("");
      lines.push("PERINTAH:");
      lines.push(usedPrefix + "rpgtavern rest");
      lines.push(usedPrefix + "rpgtavern drink <id>");
      lines.push(usedPrefix + "rpgtavern feast");
      return m.reply(claraWrap("RPG Tavern", lines, "info"));
    }

    if (action === "rest") {
      if ((player.gold || 0) < REST_COST) {
        return m.reply(claraWrap("RPG Tavern", "Gold kurang! Butuh: " + REST_COST, "warn"));
      }

      const hpBefore = player.health || 100;
      const stamBefore = player.stamina || 100;
      const maxHp = 100 + (player.skills?.tank ? 10 * player.skills.tank : 0);
      const maxStam = 100 + (player.skills?.tank ? 10 * Math.max(0, player.skills.tank - 3) : 0);

      addGold(m, -REST_COST);
      player.health = Math.min(maxHp, hpBefore + REST_HP);
      player.stamina = Math.min(maxStam || 100, stamBefore + REST_STAMINA);
      savePlayer(m, player);

      return m.reply(claraWrap("RPG Tavern", [
        "ISTIRAHAT DI TAVERN",
        "Biaya: " + REST_COST + " gold",
        "",
        "HP: " + hpBefore + " -> " + player.health,
        "Stamina: " + stamBefore + " -> " + player.stamina,
        "",
        "Rasanya segar kembali!",
      ], "info"));
    }

    if (action === "drink") {
      const drinkId = args[1]?.toLowerCase();
      const drink = DRINKS.find(d => d.id === drinkId);

      if (!drink) {
        return m.reply(claraWrap("RPG Tavern", [
          "Minuman tidak ditemukan: " + (drinkId || "?"),
          "Tersedia: " + DRINKS.map(d => d.id).join(", "),
        ], "warn"));
      }

      if ((player.gold || 0) < drink.price) {
        return m.reply(claraWrap("RPG Tavern", "Gold kurang! Butuh: " + drink.price, "warn"));
      }

      addGold(m, -drink.price);

      if (drink.buff !== "none" && drink.duration > 0) {
        player.tavernBuff = {
          type: drink.buff,
          expires: Date.now() + drink.duration * 1000,
        };
      }

      // Coffee: restore stamina
      if (drink.buff === "stamina") {
        player.stamina = Math.min(100, (player.stamina || 0) + 30);
      }

      savePlayer(m, player);

      const lines = [
        "MINUM DI TAVERN",
        drink.emoji + " " + drink.name,
        "Biaya: " + drink.price + " gold",
      ];

      if (drink.buff !== "none" && drink.duration > 0) {
        lines.push("Buff: " + drink.desc);
        lines.push("Aktif selama " + Math.round(drink.duration / 60) + " menit");
      } else if (drink.buff === "stamina") {
        lines.push("Stamina +30");
      }

      return m.reply(claraWrap("RPG Tavern", lines, "info"));
    }

    if (action === "feast") {
      if ((player.gold || 0) < FEAST_COST) {
        return m.reply(claraWrap("RPG Tavern", "Gold kurang! Butuh: " + FEAST_COST, "warn"));
      }

      const hpBefore = player.health || 100;
      const stamBefore = player.stamina || 100;

      addGold(m, -FEAST_COST);
      player.health = Math.min(100, hpBefore + FEAST_HP);
      player.stamina = Math.min(100, stamBefore + FEAST_STAMINA);
      addExp(m, FEAST_EXP);
      savePlayer(m, player);

      return m.reply(claraWrap("RPG Tavern", [
        "PESTA BESAR DI TAVERN!",
        "Biaya: " + FEAST_COST + " gold",
        "",
        "HP: " + hpBefore + " -> " + player.health + " (+" + FEAST_HP + ")",
        "Stamina: " + stamBefore + " -> " + player.stamina + " (+" + FEAST_STAMINA + ")",
        "Exp: +" + FEAST_EXP,
        "",
        "Kenyang dan bersemangat!",
      ], "info"));
    }

    return m.reply(claraWrap("RPG Tavern", "Perintah: rest, drink, feast", "warn"));
  } catch (e) {
    console.error("[RpgTavern]", e);
    return m.reply(claraWrap("RPG Tavern", "Error: " + e.message, "error"));
  }
}

export { pluginConfig as config, handler };
