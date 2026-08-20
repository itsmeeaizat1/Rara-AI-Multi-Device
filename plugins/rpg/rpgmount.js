// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// RPG Mount — Sistem tunggangan, beli & pakai untuk bonus speed/stamina
import { claraWrap } from "../../src/lib/nova-menu-style.js";
import { getPlayer, ensurePlayer, addGold, savePlayer } from "../../src/lib/nova-rpg-service.js";

const pluginConfig = {
  name: "rpgmount",
  alias: ["mountrpg", "tunggangan", "kendarpg", "naikkuda", "tunggang"],
  category: "rpg",
  description: "RPG Mount — Beli & pakai tunggangan untuk bonus aksi",
  usage: ".rpgmount list — Daftar tunggangan\n.rpgmount buy <nama> — Beli\n.rpgmount equip <nama> — Pakai\n.rpgmount unequip — Lepas\n.rpgmount info — Info mount aktif",
  example: ".rpgmount buy horse\n.rpgmount equip horse",
  isOwner: false,
  isPremium: false,
  isGroup: true,
  isPrivate: true,
  cooldown: 5,
  energi: 0,
  isEnabled: true,
};

const MOUNTS = [
  { id: "horse", name: "Kuda", emoji: "🐴", price: 3000, speedBonus: 10, staminaBonus: 5, desc: "Tunggangan dasar, cocok pemula" },
  { id: "wolf", name: "Serigala", emoji: "🐺", price: 8000, speedBonus: 20, staminaBonus: 10, desc: "Cepat & tangkas di hutan" },
  { id: "bear", name: "Beruang", emoji: "🐻", price: 12000, speedBonus: 5, staminaBonus: 30, desc: "Kuat, bonus stamina besar" },
  { id: "tiger", name: "Harimau", emoji: "🐯", price: 18000, speedBonus: 25, staminaBonus: 15, desc: "Predator cepat & gagah" },
  { id: "dragon", name: "Naga", emoji: "🐉", price: 50000, speedBonus: 40, staminaBonus: 40, desc: "Tunggangan legendaris!" },
  { id: "unicorn", name: "Unicorn", emoji: "🦄", price: 45000, speedBonus: 35, staminaBonus: 35, desc: "Mistis & langka" },
  { id: "griffin", name: "Griffin", emoji: "🦅", price: 35000, speedBonus: 30, staminaBonus: 25, desc: "Setengah elang setengah singa" },
];

async function handler(m, { conn, text, args, usedPrefix, command }) {
  try {
    const action = args[0]?.toLowerCase();
    const player = ensurePlayer(m);

    if (!action || action === "list" || action === "help") {
      const lines = [
        "RPG MOUNT — TUNGGANGAN",
        "Beli & pakai tunggangan untuk bonus",
        "",
        "DAFTAR TUNGGANGAN:",
      ];
      MOUNTS.forEach((mount) => {
        const owned = player.mounts?.[mount.id] ? " [DIMILIKI]" : "";
        const active = player.activeMount === mount.id ? " [AKTIF]" : "";
        lines.push(mount.emoji + " " + mount.name + " - " + mount.price + " gold" + owned + active);
        lines.push("   Speed: +" + mount.speedBonus + " | Stamina: +" + mount.staminaBonus);
        lines.push("   " + mount.desc);
      });
      lines.push("");
      lines.push("PERINTAH:");
      lines.push(usedPrefix + "rpgmount buy <nama> - Beli");
      lines.push(usedPrefix + "rpgmount equip <nama> - Pasang");
      lines.push(usedPrefix + "rpgmount unequip - Lepas");
      lines.push(usedPrefix + "rpgmount info - Info mount aktif");
      return m.reply(claraWrap("RPG Mount", lines, "info"));
    }

    if (action === "buy") {
      const mountId = args[1]?.toLowerCase();
      const mount = MOUNTS.find(x => x.id === mountId);

      if (!mount) {
        return m.reply(claraWrap("RPG Mount", "Tunggangan tidak ditemukan: " + (mountId || "?"), "warn"));
      }

      if (player.mounts?.[mount.id]) {
        return m.reply(claraWrap("RPG Mount", mount.name + " sudah dimiliki!", "warn"));
      }

      if ((player.gold || 0) < mount.price) {
        return m.reply(claraWrap("RPG Mount", [
          "Gold tidak cukup!",
          "Butuh: " + mount.price + " | Punya: " + (player.gold || 0),
        ], "warn"));
      }

      addGold(m, -mount.price);
      if (!player.mounts) player.mounts = {};
      player.mounts[mount.id] = { name: mount.name, emoji: mount.emoji, bought: Date.now() };
      savePlayer(m, player);

      return m.reply(claraWrap("RPG Mount", [
        "Berhasil beli " + mount.emoji + " " + mount.name + "!",
        "Harga: " + mount.price + " gold",
        "Speed: +" + mount.speedBonus + " | Stamina: +" + mount.staminaBonus,
        "",
        "Pasang: " + usedPrefix + "rpgmount equip " + mount.id,
      ], "info"));
    }

    if (action === "equip") {
      const mountId = args[1]?.toLowerCase();
      const mount = MOUNTS.find(x => x.id === mountId);

      if (!mount) {
        return m.reply(claraWrap("RPG Mount", "Tunggangan tidak ditemukan", "warn"));
      }

      if (!player.mounts?.[mount.id]) {
        return m.reply(claraWrap("RPG Mount", "Belum punya " + mount.name + ". Beli dulu!", "warn"));
      }

      player.activeMount = mount.id;
      savePlayer(m, player);

      return m.reply(claraWrap("RPG Mount", [
        mount.emoji + " " + mount.name + " sekarang aktif!",
        "Speed: +" + mount.speedBonus + " | Stamina: +" + mount.staminaBonus,
        "Bonus aktif untuk hunt, mine, adventure",
      ], "info"));
    }

    if (action === "unequip") {
      if (!player.activeMount) {
        return m.reply(claraWrap("RPG Mount", "Tidak ada mount aktif", "warn"));
      }
      const oldMount = MOUNTS.find(x => x.id === player.activeMount);
      player.activeMount = null;
      savePlayer(m, player);
      return m.reply(claraWrap("RPG Mount", (oldMount?.name || "Mount") + " dilepas", "info"));
    }

    if (action === "info") {
      if (!player.activeMount) {
        return m.reply(claraWrap("RPG Mount", "Tidak ada mount aktif. Ketik .rpgmount list", "warn"));
      }
      const mount = MOUNTS.find(x => x.id === player.activeMount);
      if (!mount) return m.reply(claraWrap("RPG Mount", "Data mount tidak ditemukan", "warn"));

      return m.reply(claraWrap("RPG Mount", [
        "MOUNT AKTIF",
        mount.emoji + " " + mount.name,
        "Speed: +" + mount.speedBonus,
        "Stamina: +" + mount.staminaBonus,
        mount.desc,
        "",
        "Lepas: " + usedPrefix + "rpgmount unequip",
      ], "info"));
    }

    return m.reply(claraWrap("RPG Mount", "Perintah tidak dikenali. Ketik .rpgmount list", "warn"));
  } catch (e) {
    console.error("[RpgMount]", e);
    return m.reply(claraWrap("RPG Mount", "Error: " + e.message, "error"));
  }
}

export { pluginConfig as config, handler };
