// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// RPG Capture the Flag — PvP rebut bendera, attack vs defend
import { claraWrap } from "../../src/lib/nova-menu-style.js";
import { getPlayer, ensurePlayer, addGold, addExp, savePlayer } from "../../src/lib/nova-rpg-service.js";

const pluginConfig = {
  name: "rpgcapturetheflag",
  alias: ["ctfrpg", "rpgctf", "rebutbendera", "captureflag", "rpgrebutbendera"],
  category: "rpg",
  description: "RPG Capture the Flag — PvP rebut bendera untuk gold",
  usage: ".rpgcapturetheflag challenge @target — Tantang pemain\n.rpgcapturetheflag info — Statistik",
  example: ".rpgcapturetheflag challenge @user",
  isOwner: false,
  isPremium: false,
  isGroup: true,
  isPrivate: true,
  cooldown: 30,
  energi: 15,
  isEnabled: true,
};

const ENTRY_COST = 1000;
const STAMINA_COST = 20;

async function handler(m, { conn, text, args, usedPrefix, command }) {
  try {
    const action = args[0]?.toLowerCase();
    const player = ensurePlayer(m);

    if (!action || action === "help") {
      return m.reply(claraWrap("RPG CTF", [
        "CAPTURE THE FLAG",
        "Tantang pemain lain, rebut bendera!",
        "Biaya: " + ENTRY_COST + " gold | Stamina: -" + STAMINA_COST,
        "",
        "Aturan:",
        "1. Tantang @target, keduanya bayar entry",
        "2. Power = level x 20 + random",
        "3. Yang menang dapat gold + bendera",
        "4. Yang kalah kehilangan entry fee",
        "",
        "PERINTAH:",
        usedPrefix + "rpgcapturetheflag challenge @target",
        usedPrefix + "rpgcapturetheflag info - Statistik",
      ], "info"));
    }

    if (action === "info") {
      const stats = player.ctfStats || {};
      const lines = [
        "STATISTIK CTF",
        "Match: " + (stats.matches || 0),
        "Menang: " + (stats.wins || 0),
        "Kalah: " + (stats.losses || 0),
        "Bendera: " + (stats.flags || 0),
        "Win rate: " + (stats.matches ? Math.round((stats.wins / stats.matches) * 100) : 0) + "%",
        "Total gold: " + (stats.totalGold || 0),
      ];
      return m.reply(claraWrap("RPG CTF", lines, "info"));
    }

    if (action === "challenge") {
      const target = m.quoted?.sender || (args[1] ? args[1].replace("@", "") + "@s.whatsapp.net" : null);

      if (!target) {
        return m.reply(claraWrap("RPG CTF", "Reply atau @mention target!", "warn"));
      }

      if (target === m.sender) {
        return m.reply(claraWrap("RPG CTF", "Tidak bisa tantang diri sendiri!", "warn"));
      }

      // Check challenger
      if ((player.gold || 0) < ENTRY_COST) {
        return m.reply(claraWrap("RPG CTF", "Gold kurang! Butuh: " + ENTRY_COST, "warn"));
      }
      if ((player.stamina || 100) < STAMINA_COST) {
        return m.reply(claraWrap("RPG CTF", "Stamina kurang! Butuh: " + STAMINA_COST, "warn"));
      }

      // Check target
      const targetPlayer = ensurePlayer({ sender: target, key: { remoteJid: m.key.remoteJid } });
      if ((targetPlayer.gold || 0) < ENTRY_COST) {
        return m.reply(claraWrap("RPG CTF", [
          "Target tidak punya cukup gold untuk entry!",
          "Butuh: " + ENTRY_COST + " gold",
        ], "warn"));
      }

      // Deduct entry from both
      addGold(m, -ENTRY_COST);
      const targetObj = { sender: target, key: { remoteJid: m.key.remoteJid } };
      addGold(targetObj, -ENTRY_COST);

      // Calculate power
      const attackerPower = (player.level || 1) * 20 + Math.random() * 50 + (player.skills?.warrior || 0) * 10;
      const defenderPower = (targetPlayer.level || 1) * 20 + Math.random() * 50 + (targetPlayer.skills?.tank || 0) * 10;

      // Deduct stamina
      player.stamina = Math.max(0, (player.stamina || 100) - STAMINA_COST);
      targetPlayer.stamina = Math.max(0, (targetPlayer.stamina || 100) - STAMINA_COST);

      const pot = ENTRY_COST * 2; // winner takes all

      // Stats
      if (!player.ctfStats) player.ctfStats = {};
      player.ctfStats.matches = (player.ctfStats.matches || 0) + 1;

      if (!targetPlayer.ctfStats) targetPlayer.ctfStats = {};
      targetPlayer.ctfStats.matches = (targetPlayer.ctfStats.matches || 0) + 1;

      const lines = [
        "CAPTURE THE FLAG!",
        "Attacker: " + (m.pushName || "Player") + " (Power: " + Math.round(attackerPower) + ")",
        "Defender: @" + target.split("@")[0] + " (Power: " + Math.round(defenderPower) + ")",
        "Pot: " + pot + " gold",
        "",
      ];

      if (attackerPower > defenderPower) {
        // Attacker wins
        addGold(m, pot);
        addExp(m, 200);
        player.ctfStats.wins = (player.ctfStats.wins || 0) + 1;
        player.ctfStats.flags = (player.ctfStats.flags || 0) + 1;
        player.ctfStats.totalGold = (player.ctfStats.totalGold || 0) + pot;
        targetPlayer.ctfStats.losses = (targetPlayer.ctfStats.losses || 0) + 1;

        lines.push("ATTACKER MENANG! BENDERA DIRAMPAS!");
        lines.push("+" + pot + " gold + 200 exp");
      } else if (defenderPower > attackerPower) {
        // Defender wins
        addGold(targetObj, pot);
        addExp(targetObj, 200);
        targetPlayer.ctfStats.wins = (targetPlayer.ctfStats.wins || 0) + 1;
        targetPlayer.ctfStats.flags = (targetPlayer.ctfStats.flags || 0) + 1;
        targetPlayer.ctfStats.totalGold = (targetPlayer.ctfStats.totalGold || 0) + pot;
        player.ctfStats.losses = (player.ctfStats.losses || 0) + 1;

        lines.push("DEFENDER MENAHAN BENDERA!");
        lines.push("@" + target.split("@")[0] + " +" + pot + " gold + 200 exp");
      } else {
        // Draw - return entry fees
        addGold(m, ENTRY_COST);
        addGold(targetObj, ENTRY_COST);
        lines.push("SERI! Entry dikembalikan ke kedua pemain");
      }

      savePlayer(m, player);
      savePlayer(targetObj, targetPlayer);

      lines.push("");
      lines.push("Stamina: " + (player.stamina || 0) + "/100");
      lines.push("Gold: " + (player.gold || 0));

      return m.reply(claraWrap("RPG CTF", lines, attackerPower > defenderPower ? "info" : "warn"));
    }

    return m.reply(claraWrap("RPG CTF", "Perintah: challenge, info", "warn"));
  } catch (e) {
    console.error("[RpgCTF]", e);
    return m.reply(claraWrap("RPG CTF", "Error: " + e.message, "error"));
  }
}

export { pluginConfig as config, handler };
