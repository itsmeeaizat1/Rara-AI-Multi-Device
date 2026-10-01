// RARA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// lib/rara-autorole.js — Engine Auto Role Assignment (ESM)
// Track poin per chat, auto-upgrade role, leaderboard, manual override

import fs from "fs";

const DB = "./src/database/group/autorole.json";

// ===== DEFINISI ROLE =====
export const ROLES = {
  new:     { emoji: "🐣", name: "New Member",    level: 0 },
  active:  { emoji: "⚡", name: "Active Member",  level: 1 },
  star:    { emoji: "🌟", name: "Star Member",   level: 2 },
  vip:     { emoji: "👑", name: "VIP Member",    level: 3 },
  admin:   { emoji: "🥳", name: "Admin",         level: 4 },
  banned:  { emoji: "🚫", name: "Banned",        level: -1 },
};

// Syarat naik role (kumulatif: vip > star > active)
const REQUIREMENTS = {
  active: { chats: 50,  days: 3,  points: 100 },
  star:   { chats: 200, days: 7,  points: 500 },
  vip:    { chats: 500, days: 30, points: 1500 },
};

// Mapping input → role key (buat .setrole)
const ROLE_ALIASES = {
  new: "new", baby: "new", member: "new", memberbaru: "new", "🐣": "new",
  active: "active", aktif: "active", "⚡": "active",
  star: "star", bintang: "star", "🌟": "star",
  vip: "vip", "👑": "vip",
  admin: "admin", administrator: "admin", adm: "admin", "🥳": "admin",
  banned: "banned", ban: "banned", "🚫": "banned",
};

// ===== DATABASE =====
function loadDB() {
  try { return JSON.parse(fs.readFileSync(DB, "utf8")); }
  catch { return { toggles: {}, groups: {} }; }
}

function saveDB(data) {
  fs.mkdirSync("./src/data", { recursive: true });
  fs.writeFileSync(DB, JSON.stringify(data, null, 2));
}

// ===== TOGGLE =====
export function isEnabled(groupId) {
  const db = loadDB();
  return db.toggles?.[groupId] === true;
}

export function toggle(groupId, state) {
  const db = loadDB();
  if (!db.toggles) db.toggles = {};
  db.toggles[groupId] = state;
  saveDB(db);
}

// ===== USER =====
export function getUser(groupId, userId) {
  const db = loadDB();
  if (!db.groups) db.groups = {};
  if (!db.groups[groupId]) db.groups[groupId] = {};
  if (!db.groups[groupId][userId]) {
    db.groups[groupId][userId] = {
      points: 0,
      chats: 0,
      joinDate: new Date().toISOString().split("T")[0],
      role: "new",
      manualRole: false,
    };
    saveDB(db);
  }
  return db.groups[groupId][userId];
}

function updateUser(groupId, userId, patch) {
  const db = loadDB();
  if (!db.groups) db.groups = {};
  if (!db.groups[groupId]) db.groups[groupId] = {};
  if (!db.groups[groupId][userId]) {
    db.groups[groupId][userId] = {
      points: 0, chats: 0,
      joinDate: new Date().toISOString().split("T")[0],
      role: "new", manualRole: false,
    };
  }
  Object.assign(db.groups[groupId][userId], patch);
  saveDB(db);
  return db.groups[groupId][userId];
}

function getDays(joinDate) {
  const ms = Date.now() - new Date(joinDate + "T00:00:00+07:00").getTime();
  return Math.max(0, Math.floor(ms / 86400000));
}

// ===== AUTO POINT + UPGRADE CHECK =====
export async function addChat(sock, groupId, userId, pushName) {
  if (!isEnabled(groupId)) return;
  const user = getUser(groupId, userId);
  if (user.role === "banned") return;

  updateUser(groupId, userId, {
    points: user.points + 1,
    chats: user.chats + 1,
  });

  // Cek upgrade (hanya untuk role auto, bukan manual)
  if (user.manualRole || user.role === "admin") return;

  const days = getDays(user.joinDate);
  const fresh = getUser(groupId, userId); // re-read setelah update
  let newRole = "new";

  if (fresh.chats >= REQUIREMENTS.vip.chats && days >= REQUIREMENTS.vip.days && fresh.points >= REQUIREMENTS.vip.points) {
    newRole = "vip";
  } else if (fresh.chats >= REQUIREMENTS.star.chats && days >= REQUIREMENTS.star.days && fresh.points >= REQUIREMENTS.star.points) {
    newRole = "star";
  } else if (fresh.chats >= REQUIREMENTS.active.chats && days >= REQUIREMENTS.active.days && fresh.points >= REQUIREMENTS.active.points) {
    newRole = "active";
  }

  if (ROLES[newRole].level > ROLES[user.role]?.level) {
    updateUser(groupId, userId, { role: newRole });
    // Kirim notifikasi ke grup
    const r = ROLES[newRole];
    const text =
      `「 ✦ Role Up ✦ 」\n` +
      `🎉 Selamat @${userId.split("@")[0]} naik ke\n` +
      `${r.emoji} ${r.name}!\n`;
    try {
      await sock.sendMessage(groupId, {
        text,
        mentions: [userId],
      });
    } catch (e) {
      console.log("[AutoRole] gagal kirim notifikasi:", e.message);
    }
  }
}

// ===== MANUAL ADD POINTS =====
export function addPoints(groupId, userId, amount) {
  const user = getUser(groupId, userId);
  const newPoints = Math.max(0, user.points + amount);
  updateUser(groupId, userId, { points: newPoints });
  return newPoints;
}

// ===== MANUAL SET ROLE =====
export function setManualRole(groupId, userId, roleKey) {
  if (!ROLES[roleKey]) return null;
  getUser(groupId, userId);
  updateUser(groupId, userId, {
    role: roleKey,
    manualRole: roleKey === "admin" || roleKey === "banned",
  });
  return ROLES[roleKey];
}

// ===== LEADERBOARD =====
export function getLeaderboard(groupId, limit = 10) {
  const db = loadDB();
  const group = db.groups?.[groupId] || {};
  return Object.entries(group)
    .filter(([jid, u]) => u.role !== "banned")
    .map(([jid, u]) => ({ jid, ...u }))
    .sort((a, b) => b.points - a.points)
    .slice(0, limit);
}

// ===== ROLE INFO =====
export function getRoleInfo(roleKey) {
  return ROLES[roleKey] || null;
}

export function resolveRole(input) {
  return ROLE_ALIASES[String(input).toLowerCase().trim()] || null;
}

// ===== FORMAT HELPER =====
export function formatProfile(user, pushName, userId) {
  const r = ROLES[user.role] || ROLES.new;
  const days = getDays(user.joinDate);
  return [
    `• Nama : ${pushName || userId.split("@")[0]}`,
    `• Role : ${r.emoji} ${r.name}`,
    `• Poin : ${user.points}`,
    `• Chat : ${user.chats}`,
    `• Join : ${user.joinDate} (${days} hari)`,
  ];
}
