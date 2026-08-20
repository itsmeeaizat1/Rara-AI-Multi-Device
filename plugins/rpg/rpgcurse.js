// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// RPG Curse — Sistem kutukan & berkat, kutuk musuh atau berkat diri
import { claraWrap } from "../../src/lib/nova-menu-style.js";
import { getPlayer, ensurePlayer, addGold, addExp, savePlayer } from "../../src/lib/nova-rpg-service.js";

const pluginConfig = {
  name: "rpgcurse",
  alias: ["curserpg", "kutuk", "kutukanrpg", "berkat", "blessrpg", "kutukrpg"],
  category: "rpg",
  description: "RPG Curse — Kutuk musuh atau berkat diri untuk buff/debuff",
  usage: ".rpgcurse bless — Berkat diri (gold cost)\n.rpgcurse curse @target — Kutuk pemain lain\n.rpgcurse info — Lihat status aktif\n.rpgcurse cleanse — Bersihkan kutukan (gold)",
  example: ".rpgcurse bless\n.rpgcurse curse @user",
  isOwner: false,
  isPremium: false,
  isGroup: true,
  isPrivate: true,
  cooldown: 30,
  energi: 10,
  isEnabled: true,
};

const BLESS_COST = 1000;
const CURSE_COST = 1500;
const CLEANSE_COST = 800;

const BLESSINGS = [
  { id: "fortune", name: "Berkat Rezeki", emoji: "💰", goldBonus: 0.2, expBonus: 0.1, duration: 3600, desc: "+20% gold, +10% exp (1 jam)" },
  { id: "vitality", name: "Berkat Vitalitas", emoji: "💚", goldBonus: 0, expBonus: 0.3, duration: 3600, desc: "+30% exp (1 jam)" },
  { id: "luck", name: "Berkat Keberuntungan", emoji: "🍀", goldBonus: 0.3, expBonus: 0, duration: 3600, desc: "+30% gold (1 jam)" },
  { id: "blessed", name: "Berkat Dewa", emoji: "✨", goldBonus: 0.25, expBonus: 0.25, duration: 1800, desc: "+25% gold & exp (30 menit)" },
];

const CURSES = [
  { id: "misfortune", name: "Kutukan Sial", emoji: "💀", goldPenalty: 0.2, duration: 1800, desc: "-20% gold saat aksi (30 menit)" },
  { id: "weakness", name: "Kutukan Lemah", emoji: "🤢", goldPenalty: 0, expPenalty: 0.3, duration: 1800, desc: "-30% exp saat aksi (30 menit)" },
  { id: "doom", name: "Kutukan Maut", emoji: "☠️", goldPenalty: 0.3, expPenalty: 0.2, duration: 900, desc: "-30% gold & -20% exp (15 menit)" },
];

async function handler(m, { conn, text, args, usedPrefix, command }) {
  try {
    const action = args[0]?.toLowerCase();
    const player = ensurePlayer(m);

    if (!action || action === "help") {
      return m.reply(claraWrap("RPG Curse", [
        "SISTEM KUTUKAN & BERKAT",
        "Berkat diri untuk buff, kutuk musuh untuk debuff",
        "",
        "BERKAT (" + BLESS_COST + " gold):",
        "💰 Fortune - +20% gold, +10% exp (1 jam)",
        "💚 Vitality - +30% exp (1 jam)",
        "🍀 Luck - +30% gold (1 jam)",
        "✨ Blessed - +25% gold & exp (30 mnt)",
        "",
        "KUTUKAN (" + CURSE_COST + " gold):",
        "💀 Misfortune - -20% gold (30 mnt)",
        "🤢 Weakness - -30% exp (30 mnt)",
        "☠️ Doom - -30% gold & -20% exp (15 mnt)",
        "",
        "PERINTAH:",
        usedPrefix + "rpgcurse bless - Berkat diri (random)",
        usedPrefix + "rpgcurse curse @target - Kutuk pemain",
        usedPrefix + "rpgcurse info - Status aktif",
        usedPrefix + "rpgcurse cleanse - Bersihkan (" + CLEANSE_COST + " gold)",
      ], "info"));
    }

    if (action === "info") {
      const lines = ["STATUS BERKAT & KUTUKAN", ""];

      const blessing = player.activeBlessing;
      if (blessing && blessing.expires > Date.now()) {
        const remaining = Math.round((blessing.expires - Date.now()) / 60000);
        lines.push("BERKAT AKTIF:");
        lines.push(blessing.emoji + " " + blessing.name);
        lines.push("Sisa: " + remaining + " menit");
      } else {
        lines.push("Berkat: Tidak ada");
      }

      lines.push("");
      const curse = player.activeCurse;
      if (curse && curse.expires > Date.now()) {
        const remaining = Math.round((curse.expires - Date.now()) / 60000);
        lines.push("KUTUKAN AKTIF:");
        lines.push(curse.emoji + " " + curse.name);
        lines.push("Sisa: " + remaining + " menit");
      } else {
        lines.push("Kutukan: Tidak ada");
      }

      return m.reply(claraWrap("RPG Curse", lines, "info"));
    }

    if (action === "bless") {
      if ((player.gold || 0) < BLESS_COST) {
        return m.reply(claraWrap("RPG Curse", "Gold kurang! Butuh: " + BLESS_COST, "warn"));
      }

      // Random blessing
      const blessing = BLESSINGS[Math.floor(Math.random() * BLESSINGS.length)];
      addGold(m, -BLESS_COST);
      player.activeBlessing = {
        id: blessing.id,
        name: blessing.name,
        emoji: blessing.emoji,
        goldBonus: blessing.goldBonus,
        expBonus: blessing.expBonus,
        expires: Date.now() + blessing.duration * 1000,
      };
      savePlayer(m, player);

      return m.reply(claraWrap("RPG Curse", [
        "BERKAT DIPEROLEH!",
        blessing.emoji + " " + blessing.name,
        blessing.desc,
        "Biaya: " + BLESS_COST + " gold",
        "Durasi: " + Math.round(blessing.duration / 60) + " menit",
      ], "info"));
    }

    if (action === "curse") {
      const target = m.quoted?.sender || (args[1] ? args[1].replace("@", "") + "@s.whatsapp.net" : null);

      if (!target) {
        return m.reply(claraWrap("RPG Curse", [
          "Reply target atau sebut @nama!",
          "Format: " + usedPrefix + "rpgcurse curse @target",
        ], "warn"));
      }

      if (target === m.sender) {
        return m.reply(claraWrap("RPG Curse", "Tidak bisa kutuk diri sendiri!", "warn"));
      }

      if ((player.gold || 0) < CURSE_COST) {
        return m.reply(claraWrap("RPG Curse", "Gold kurang! Butuh: " + CURSE_COST, "warn"));
      }

      // Random curse
      const curse = CURSES[Math.floor(Math.random() * CURSES.length)];
      addGold(m, -CURSE_COST);

      // Apply curse to target
      const targetPlayer = ensurePlayer({ sender: target, key: { remoteJid: m.key.remoteJid } });
      targetPlayer.activeCurse = {
        id: curse.id,
        name: curse.name,
        emoji: curse.emoji,
        goldPenalty: curse.goldPenalty,
        expPenalty: curse.expPenalty || 0,
        expires: Date.now() + curse.duration * 1000,
        cursedBy: m.sender,
      };
      savePlayer({ sender: target, key: { remoteJid: m.key.remoteJid } }, targetPlayer);

      savePlayer(m, player);

      return m.reply(claraWrap("RPG Curse", [
        "KUTUKAN DIKIRIM!",
        curse.emoji + " " + curse.name + " -> @" + target.split("@")[0],
        curse.desc,
        "Biaya: " + CURSE_COST + " gold",
        "Durasi: " + Math.round(curse.duration / 60) + " menit",
      ], "info"));
    }

    if (action === "cleanse") {
      if (!player.activeCurse || player.activeCurse.expires < Date.now()) {
        return m.reply(claraWrap("RPG Curse", "Tidak ada kutukan aktif", "warn"));
      }

      if ((player.gold || 0) < CLEANSE_COST) {
        return m.reply(claraWrap("RPG Curse", "Gold kurang! Butuh: " + CLEANSE_COST, "warn"));
      }

      addGold(m, -CLEANSE_COST);
      const curseName = player.activeCurse.name;
      delete player.activeCurse;
      savePlayer(m, player);

      return m.reply(claraWrap("RPG Curse", [
        "Kutukan " + curseName + " dibersihkan!",
        "Biaya: " + CLEANSE_COST + " gold",
        "Kamu bebas dari kutukan!",
      ], "info"));
    }

    return m.reply(claraWrap("RPG Curse", "Perintah: bless, curse, info, cleanse", "warn"));
  } catch (e) {
    console.error("[RpgCurse]", e);
    return m.reply(claraWrap("RPG Curse", "Error: " + e.message, "error"));
  }
}

export { pluginConfig as config, handler };
