// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// RPG Core Service — rebuilt from scratch
import { getDatabase } from "./nova-database.js";

// ═══════════════════════════════════════
// PLAYER MANAGEMENT
// ═══════════════════════════════════════

export function getPlayer(m) {
  try {
    const db = getDatabase();
    const sender = m.sender || (m.key?.participant || m.key?.remoteJid || "");
    if (!sender) return null;
    if (!db.users) db.users = {};
    if (!db.users[sender]) return null;
    return db.users[sender].rpg || null;
  } catch {
    return null;
  }
}

export function ensurePlayer(m, pushName = "Player") {
  try {
    const db = getDatabase();
    const sender = m.sender || (m.key?.participant || m.key?.remoteJid || "");
    if (!sender) return null;
    if (!db.users) db.users = {};
    if (!db.users[sender]) {
      db.users[sender] = { name: pushName, number: sender };
    }
    if (!db.users[sender].rpg) {
      db.users[sender].rpg = {
        level: 1,
        exp: 0,
        expNext: 100,
        gold: 0,
        hp: 100,
        maxHp: 100,
        atk: 10,
        def: 5,
        stamina: 100,
        maxStamina: 100,
        inventory: {},
        lastDaily: null,
        lastWork: null,
        lastHunt: null,
        lastMine: null,
        lastFish: null,
        lastAdventure: null,
        coupleId: null,
        coupleName: null,
        married: false,
        marriedId: null,
        marriedName: null,
        marriedDate: null,
        anniversary: null,
        matchScore: 0,
        wins: 0,
        losses: 0
      };
      db.markDirty("users");
    }
    return db.users[sender].rpg;
  } catch {
    return null;
  }
}

export function savePlayer(m, data) {
  try {
    const db = getDatabase();
    const sender = m.sender || (m.key?.participant || m.key?.remoteJid || "");
    if (!sender || !db.users || !db.users[sender]) return false;
    db.users[sender].rpg = { ...db.users[sender].rpg, ...data };
    db.markDirty("users");
    return true;
  } catch {
    return false;
  }
}

// ═══════════════════════════════════════
// EXP & LEVEL
// ═══════════════════════════════════════

export function addExp(m, amount) {
  try {
    const player = ensurePlayer(m);
    if (!player) return { leveledUp: false };
    const db = getDatabase();
    const sender = m.sender || (m.key?.participant || m.key?.remoteJid || "");
    player.exp += amount;
    let leveledUp = false;
    while (player.exp >= player.expNext) {
      player.exp -= player.expNext;
      player.level += 1;
      player.expNext = Math.floor(player.expNext * 1.5);
      player.maxHp += 20;
      player.hp = player.maxHp;
      player.atk += 3;
      player.def += 2;
      player.maxStamina += 10;
      player.stamina = player.maxStamina;
      leveledUp = true;
    }
    db.users[sender].rpg = player;
    db.markDirty("users");
    return { leveledUp, newLevel: player.level };
  } catch {
    return { leveledUp: false };
  }
}

export function addGold(m, amount) {
  try {
    const player = ensurePlayer(m);
    if (!player) return false;
    const db = getDatabase();
    const sender = m.sender || (m.key?.participant || m.key?.remoteJid || "");
    player.gold = Math.max(0, player.gold + amount);
    db.users[sender].rpg = player;
    db.markDirty("users");
    return true;
  } catch {
    return false;
  }
}

// ═══════════════════════════════════════
// STAMINA
// ═══════════════════════════════════════

export function useStamina(m, amount) {
  try {
    const player = ensurePlayer(m);
    if (!player) return false;
    if (player.stamina < amount) return false;
    const db = getDatabase();
    const sender = m.sender || (m.key?.participant || m.key?.remoteJid || "");
    player.stamina -= amount;
    db.users[sender].rpg = player;
    db.markDirty("users");
    return true;
  } catch {
    return false;
  }
}

export function regenStamina(m, amount = 10) {
  try {
    const player = ensurePlayer(m);
    if (!player) return;
    const db = getDatabase();
    const sender = m.sender || (m.key?.participant || m.key?.remoteJid || "");
    player.stamina = Math.min(player.maxStamina, player.stamina + amount);
    db.users[sender].rpg = player;
    db.markDirty("users");
  } catch {}
}

// ═══════════════════════════════════════
// COOLDOWN CHECK
// ═══════════════════════════════════════

export function checkCooldown(m, field, cooldownMs) {
  try {
    const player = ensurePlayer(m);
    if (!player) return { ready: true };
    const last = player[field];
    if (!last) return { ready: true };
    const elapsed = Date.now() - last;
    if (elapsed >= cooldownMs) return { ready: true };
    const remaining = cooldownMs - elapsed;
    const mins = Math.floor(remaining / 60000);
    const secs = Math.floor((remaining % 60000) / 1000);
    return { ready: false, mins, secs };
  } catch {
    return { ready: true };
  }
}

export function setCooldown(m, field) {
  try {
    const player = ensurePlayer(m);
    if (!player) return;
    const db = getDatabase();
    const sender = m.sender || (m.key?.participant || m.key?.remoteJid || "");
    player[field] = Date.now();
    db.users[sender].rpg = player;
    db.markDirty("users");
  } catch {}
}

// ═══════════════════════════════════════
// INVENTORY
// ═══════════════════════════════════════

export function addItem(m, itemId, quantity = 1) {
  try {
    const player = ensurePlayer(m);
    if (!player) return false;
    const db = getDatabase();
    const sender = m.sender || (m.key?.participant || m.key?.remoteJid || "");
    if (!player.inventory) player.inventory = {};
    player.inventory[itemId] = (player.inventory[itemId] || 0) + quantity;
    db.users[sender].rpg = player;
    db.markDirty("users");
    return true;
  } catch {
    return false;
  }
}

export function removeItem(m, itemId, quantity = 1) {
  try {
    const player = ensurePlayer(m);
    if (!player) return false;
    const db = getDatabase();
    const sender = m.sender || (m.key?.participant || m.key?.remoteJid || "");
    if (!player.inventory || !player.inventory[itemId]) return false;
    player.inventory[itemId] -= quantity;
    if (player.inventory[itemId] <= 0) delete player.inventory[itemId];
    db.users[sender].rpg = player;
    db.markDirty("users");
    return true;
  } catch {
    return false;
  }
}

// ═══════════════════════════════════════
// COUPLE / CINTA SYSTEM
// ═══════════════════════════════════════

export function setCouple(m, targetSender, targetName) {
  try {
    const db = getDatabase();
    const sender = m.sender || (m.key?.participant || m.key?.remoteJid || "");
    if (!sender || !db.users?.[sender]) return false;
    db.users[sender].rpg = db.users[sender].rpg || {};
    db.users[sender].rpg.coupleId = targetSender;
    db.users[sender].rpg.coupleName = targetName;
    if (targetSender && db.users[targetSender]) {
      db.users[targetSender].rpg = db.users[targetSender].rpg || {};
      db.users[targetSender].rpg.coupleId = sender;
      db.users[targetSender].rpg.coupleName = db.users[sender].name || "Player";
    }
    db.markDirty("users");
    return true;
  } catch {
    return false;
  }
}

export function removeCouple(m) {
  try {
    const db = getDatabase();
    const sender = m.sender || (m.key?.participant || m.key?.remoteJid || "");
    if (!sender || !db.users?.[sender]) return false;
    const partnerId = db.users[sender].rpg?.coupleId;
    db.users[sender].rpg.coupleId = null;
    db.users[sender].rpg.coupleName = null;
    db.users[sender].rpg.married = false;
    db.users[sender].rpg.marriedId = null;
    db.users[sender].rpg.marriedName = null;
    if (partnerId && db.users[partnerId]?.rpg) {
      db.users[partnerId].rpg.coupleId = null;
      db.users[partnerId].rpg.coupleName = null;
      db.users[partnerId].rpg.married = false;
      db.users[partnerId].rpg.marriedId = null;
      db.users[partnerId].rpg.marriedName = null;
    }
    db.markDirty("users");
    return true;
  } catch {
    return false;
  }
}

export function setMarriage(m, targetSender, targetName) {
  try {
    const db = getDatabase();
    const sender = m.sender || (m.key?.participant || m.key?.remoteJid || "");
    if (!sender || !db.users?.[sender]) return false;
    db.users[sender].rpg = db.users[sender].rpg || {};
    db.users[sender].rpg.married = true;
    db.users[sender].rpg.marriedId = targetSender;
    db.users[sender].rpg.marriedName = targetName;
    db.users[sender].rpg.marriedDate = new Date().toISOString();
    if (targetSender && db.users[targetSender]) {
      db.users[targetSender].rpg = db.users[targetSender].rpg || {};
      db.users[targetSender].rpg.married = true;
      db.users[targetSender].rpg.marriedId = sender;
      db.users[targetSender].rpg.marriedName = db.users[sender].name || "Player";
      db.users[targetSender].rpg.marriedDate = new Date().toISOString();
    }
    db.markDirty("users");
    return true;
  } catch {
    return false;
  }
}

// ═══════════════════════════════════════
// LEADERBOARD
// ═══════════════════════════════════════

export function getLeaderboard(type = "level", limit = 10) {
  try {
    const db = getDatabase();
    if (!db.users) return [];
    const players = [];
    for (const [sender, userData] of Object.entries(db.users)) {
      if (!userData.rpg) continue;
      const rpg = userData.rpg;
      if (type === "level") {
        players.push({ sender, name: userData.name || "Player", level: rpg.level || 1, exp: rpg.exp || 0, gold: rpg.gold || 0 });
      } else if (type === "couple") {
        if (!rpg.coupleId) continue;
        const score = rpg.matchScore || 0;
        players.push({
          sender,
          name: userData.name || "Player",
          coupleName: rpg.coupleName || "Unknown",
          married: rpg.married || false,
          score
        });
      }
    }
    if (type === "level") {
      players.sort((a, b) => (b.level - a.level) || (b.exp - a.exp));
    } else if (type === "couple") {
      players.sort((a, b) => b.score - a.score);
    }
    return players.slice(0, limit);
  } catch {
    return [];
  }
}

// ═══════════════════════════════════════
// FORMAT HELPERS
// ═══════════════════════════════════════

export function formatTime(ms) {
  try {
    const mins = Math.floor(ms / 60000);
    const secs = Math.floor((ms % 60000) / 1000);
    if (mins > 0) return `${mins}m ${secs}s`;
    return `${secs}s`;
  } catch {
    return "0s";
  }
}

export function getPlayerInfo(m) {
  try {
    const player = ensurePlayer(m);
    if (!player) return "Player tidak ditemukan";
    const expPercent = Math.floor((player.exp / player.expNext) * 100);
    const hpPercent = Math.floor((player.hp / player.maxHp) * 100);
    const stamPercent = Math.floor((player.stamina / player.maxStamina) * 100);
    const bar = (percent) => {
      const filled = Math.floor(percent / 10);
      return "█".repeat(filled) + "░".repeat(10 - filled);
    };
    return `❀°˖ 𝗥𝗣𝗚 𝗣𝗿𝗼𝗳𝗶𝗹𝗲 ˖°❀

┊ ➶ 𝗡𝗮𝗺𝗮: ${m.pushName || "Player"}
┊ ➶ 𝗟𝗲𝘃𝗲𝗹: ${player.level}
┊ ➶ 𝗘𝗫𝗽: ${player.exp}/${player.expNext} (${expPercent}%)
┊ ➶ ${bar(expPercent)}

┊ ➶ 𝗛𝗩: ${player.hp}/${player.maxHp} (${hpPercent}%)
┊ ➶ ${bar(hpPercent)}

┊ ➶ 𝗦𝘁𝗮𝗺𝗶𝗻𝗮: ${player.stamina}/${player.maxStamina} (${stamPercent}%)
┊ ➶ ${bar(stamPercent)}

┊ ➶ 𝗔𝘁𝗮𝗸: ${player.atk} | 𝗗𝗲𝗳: ${player.def}
┊ ➶ 𝗚𝗼𝗹𝗱: ${player.gold.toLocaleString()}

┊ ➶ 𝗖𝗼𝘂𝗽𝗹𝗲: ${player.coupleName || "Belum ada"}
┊ ➶ 𝗦𝘁𝗮𝘁𝘂𝘀: ${player.married ? "Menikah 💍" : (player.coupleId ? "Berpacaran ❤️" : "Lajang")}
${player.married ? `┊ ➶ 𝗣𝗮𝘀𝗮𝗻𝗴𝗮𝗻: ${player.marriedName}\n┊ ➶ 𝗧𝗮𝗵𝘂𝗻 𝗜𝗻𝘁𝗶: ${new Date(player.marriedDate).toLocaleDateString("id-ID")}` : ""}

❀⋆｡˚ Nova AI WhatsApp Bot ˚｡⋆❀`;
  } catch {
    return "Error: tidak bisa load profil RPG";
  }
}
