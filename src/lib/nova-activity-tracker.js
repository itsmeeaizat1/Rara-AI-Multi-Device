// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import fs from "fs";
import path from "path";

const DB_PATH = path.join(process.cwd(), "database", "activity-tracker.json");

/**
 * Ensure database directory exists
 */
function ensureDir() {
  const dir = path.dirname(DB_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

/**
 * Calculate Monday 00:00 WIB (UTC+7) ISO string for the current week
 * @param {Date} [now]
 * @returns {string} ISO date string
 */
export function getCurrentWeekStartWIB(now = new Date()) {
  const wibOffsetMs = 7 * 60 * 60 * 1000;
  const wibTime = new Date(now.getTime() + wibOffsetMs);
  const day = wibTime.getUTCDay(); // 0 = Sun, 1 = Mon, ..., 6 = Sat
  const diffToMonday = day === 0 ? 6 : day - 1;

  wibTime.setUTCHours(0, 0, 0, 0);
  wibTime.setUTCDate(wibTime.getUTCDate() - diffToMonday);

  const realUtc = new Date(wibTime.getTime() - wibOffsetMs);
  return realUtc.toISOString();
}

/**
 * Load JSON database from disk
 * @returns {Object} Database state
 */
function loadDB() {
  try {
    ensureDir();
    if (!fs.existsSync(DB_PATH)) {
      fs.writeFileSync(DB_PATH, JSON.stringify({}, null, 2), "utf8");
      return {};
    }
    const raw = fs.readFileSync(DB_PATH, "utf8");
    return JSON.parse(raw || "{}");
  } catch (err) {
    console.error("[ActivityTracker] Error loading database:", err);
    return {};
  }
}

/**
 * Save JSON database to disk
 * @param {Object} data
 * @returns {boolean} Success
 */
function saveDB(data) {
  try {
    ensureDir();
    fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), "utf8");
    return true;
  } catch (err) {
    console.error("[ActivityTracker] Error saving database:", err);
    return false;
  }
}

/**
 * Check if a group's data requires weekly reset (Monday 00:00 WIB)
 * @param {Object} groupData
 * @returns {boolean} Whether reset occurred
 */
function checkAutoResetGroup(groupData) {
  if (!groupData) return false;
  const currentWeekStart = getCurrentWeekStartWIB();
  if (!groupData.weekStart || new Date(groupData.weekStart) < new Date(currentWeekStart)) {
    groupData.members = {};
    groupData.weekStart = currentWeekStart;
    return true;
  }
  return false;
}

/**
 * Initialize activity tracker database and check weekly resets
 * @returns {Object} Database state
 */
export function initActivityTracker() {
  const db = loadDB();
  let modified = false;

  for (const groupId in db) {
    if (checkAutoResetGroup(db[groupId])) {
      modified = true;
    }
  }

  if (modified) {
    saveDB(db);
  }

  return db;
}

/**
 * Track user activity for a message in a group
 * Points system: 1 point per message, 2 points per command used, 5 points per media shared
 * @param {Object} m - Serialized message object
 * @param {Object} [options] - Optional overrides { groupId, senderJid, name, isCommand, isMedia, points }
 * @returns {Object|null} Member activity record
 */
export function trackActivity(m, options = {}) {
  try {
    const groupId = options.groupId || m?.chat || m?.from;
    if (!groupId) return null;

    // Must be group chat
    const isGroup = typeof m?.isGroup === "boolean" ? m.isGroup : groupId.endsWith("@g.us");
    if (!isGroup) return null;

    const senderJid = options.senderJid || m?.sender || m?.key?.participant;
    if (!senderJid) return null;

    const name = options.name || m?.pushName || m?.name || senderJid.split("@")[0] || "Member";

    const db = loadDB();

    if (!db[groupId]) {
      db[groupId] = {
        groupId,
        weekStart: getCurrentWeekStartWIB(),
        trackingEnabled: true,
        members: {},
      };
    }

    // Check weekly reset for group
    checkAutoResetGroup(db[groupId]);

    if (db[groupId].trackingEnabled === false) {
      return null;
    }

    // Determine activity classification
    const mediaTypes = ["imageMessage", "videoMessage", "audioMessage", "stickerMessage", "documentMessage"];
    const isMedia =
      options.isMedia ??
      Boolean(
        m?.isMedia ||
          mediaTypes.includes(m?.mtype) ||
          m?.message?.imageMessage ||
          m?.message?.videoMessage ||
          m?.message?.audioMessage ||
          m?.message?.stickerMessage ||
          m?.message?.documentMessage
      );

    const textContent = typeof m?.text === "string" ? m.text : typeof m?.body === "string" ? m.body : "";
    const isCommand = options.isCommand ?? Boolean(m?.isCommand || (textContent && /^[.!#/]/.test(textContent.trim())));

    // Calculate points: 1 pt per message, 2 pts per command used, 5 pts per media shared
    let pointsAwarded = options.points;
    if (pointsAwarded === undefined) {
      if (isMedia) {
        pointsAwarded = 5;
      } else if (isCommand) {
        pointsAwarded = 2;
      } else {
        pointsAwarded = 1;
      }
    }

    if (!db[groupId].members) {
      db[groupId].members = {};
    }

    if (!db[groupId].members[senderJid]) {
      db[groupId].members[senderJid] = {
        name,
        messageCount: 0,
        commandCount: 0,
        mediaCount: 0,
        lastActive: 0,
        points: 0,
      };
    }

    const member = db[groupId].members[senderJid];
    if (name && name !== "Member") {
      member.name = name;
    }

    member.messageCount = (member.messageCount || 0) + 1;
    if (isMedia) member.mediaCount = (member.mediaCount || 0) + 1;
    if (isCommand) member.commandCount = (member.commandCount || 0) + 1;
    member.points = (member.points || 0) + pointsAwarded;
    member.lastActive = Date.now();

    saveDB(db);
    return member;
  } catch (err) {
    console.error("[ActivityTracker] Error tracking activity:", err);
    return null;
  }
}

/**
 * Get top leaderboard for a group
 * @param {string} groupId
 * @param {number} [limit=10]
 * @returns {Array<Object>} Sorted list of members with rank
 */
export function getLeaderboard(groupId, limit = 10) {
  const db = loadDB();
  if (!db[groupId]) return [];

  const modified = checkAutoResetGroup(db[groupId]);
  if (modified) saveDB(db);

  const membersObj = db[groupId].members || {};
  const list = Object.entries(membersObj).map(([jid, data]) => ({
    jid,
    name: data.name || jid.split("@")[0],
    messageCount: data.messageCount || 0,
    commandCount: data.commandCount || 0,
    mediaCount: data.mediaCount || 0,
    points: data.points || 0,
    lastActive: data.lastActive || 0,
  }));

  list.sort((a, b) => b.points - a.points || b.messageCount - a.messageCount || b.lastActive - a.lastActive);

  return list.slice(0, limit).map((item, idx) => ({
    ...item,
    rank: idx + 1,
  }));
}

/**
 * Get weekly activity summary stats for a group
 * @param {string} groupId
 * @returns {Object} Stats object
 */
export function getWeeklyStats(groupId) {
  const db = loadDB();
  const currentWeekStart = getCurrentWeekStartWIB();

  if (!db[groupId]) {
    return {
      groupId,
      totalMessages: 0,
      totalPoints: 0,
      totalCommands: 0,
      totalMedia: 0,
      activeMembers: 0,
      totalMembersTracked: 0,
      topMember: null,
      weekStart: currentWeekStart,
      trackingEnabled: true,
    };
  }

  const modified = checkAutoResetGroup(db[groupId]);
  if (modified) saveDB(db);

  const membersObj = db[groupId].members || {};
  const members = Object.entries(membersObj).map(([jid, m]) => ({
    jid,
    ...m,
  }));

  const totalMessages = members.reduce((sum, m) => sum + (m.messageCount || 0), 0);
  const totalPoints = members.reduce((sum, m) => sum + (m.points || 0), 0);
  const totalCommands = members.reduce((sum, m) => sum + (m.commandCount || 0), 0);
  const totalMedia = members.reduce((sum, m) => sum + (m.mediaCount || 0), 0);
  const activeMembers = members.filter((m) => (m.messageCount || 0) > 0).length;

  const sorted = [...members].sort((a, b) => (b.points || 0) - (a.points || 0) || (b.messageCount || 0) - (a.messageCount || 0));
  const topMember = sorted[0] ? { ...sorted[0] } : null;

  return {
    groupId,
    totalMessages,
    totalPoints,
    totalCommands,
    totalMedia,
    activeMembers,
    totalMembersTracked: members.length,
    topMember,
    weekStart: db[groupId].weekStart || currentWeekStart,
    trackingEnabled: db[groupId].trackingEnabled !== false,
  };
}

/**
 * Get user rank and activity stats in a group
 * @param {string} groupId
 * @param {string} jid
 * @returns {Object|null} Rank details or null
 */
export function getRank(groupId, jid) {
  const db = loadDB();
  if (!db[groupId] || !jid) return null;

  const modified = checkAutoResetGroup(db[groupId]);
  if (modified) saveDB(db);

  const membersObj = db[groupId].members || {};
  const list = Object.entries(membersObj).map(([memberJid, data]) => ({
    jid: memberJid,
    name: data.name || memberJid.split("@")[0],
    messageCount: data.messageCount || 0,
    commandCount: data.commandCount || 0,
    mediaCount: data.mediaCount || 0,
    points: data.points || 0,
    lastActive: data.lastActive || 0,
  }));

  list.sort((a, b) => b.points - a.points || b.messageCount - a.messageCount || b.lastActive - a.lastActive);

  const index = list.findIndex((item) => item.jid === jid);
  if (index === -1) return null;

  const rank = index + 1;
  const totalMembers = list.length;
  const topPercentage = Math.round((rank / totalMembers) * 100);

  return {
    rank,
    totalMembers,
    topPercentage,
    memberStats: list[index],
  };
}

/**
 * Reset weekly statistics for a group or all groups
 * @param {string|null} [groupId=null]
 * @returns {boolean} Success
 */
export function resetWeekly(groupId = null) {
  const db = loadDB();
  const currentWeekStart = getCurrentWeekStartWIB();

  if (groupId) {
    if (!db[groupId]) {
      db[groupId] = {
        groupId,
        weekStart: currentWeekStart,
        trackingEnabled: true,
        members: {},
      };
    } else {
      db[groupId].members = {};
      db[groupId].weekStart = currentWeekStart;
    }
  } else {
    for (const id in db) {
      db[id].members = {};
      db[id].weekStart = currentWeekStart;
    }
  }

  saveDB(db);
  return true;
}

/**
 * Get activity tracking status for a group
 * @param {string} groupId
 * @returns {Object} Status object
 */
export function getActivityStatus(groupId) {
  const db = loadDB();
  const currentWeekStart = getCurrentWeekStartWIB();

  if (!db[groupId]) {
    return {
      groupId,
      trackingEnabled: true,
      weekStart: currentWeekStart,
      totalMembers: 0,
      totalMessages: 0,
      totalPoints: 0,
    };
  }

  const modified = checkAutoResetGroup(db[groupId]);
  if (modified) saveDB(db);

  const members = Object.values(db[groupId].members || {});
  const totalMessages = members.reduce((sum, m) => sum + (m.messageCount || 0), 0);
  const totalPoints = members.reduce((sum, m) => sum + (m.points || 0), 0);

  return {
    groupId,
    trackingEnabled: db[groupId].trackingEnabled !== false,
    weekStart: db[groupId].weekStart || currentWeekStart,
    totalMembers: members.length,
    totalMessages,
    totalPoints,
  };
}

/**
 * Set or toggle activity tracking for a group
 * @param {string} groupId
 * @param {boolean} enabled
 * @returns {boolean} New tracking state
 */
export function setActivityTracking(groupId, enabled) {
  const db = loadDB();
  if (!db[groupId]) {
    db[groupId] = {
      groupId,
      weekStart: getCurrentWeekStartWIB(),
      trackingEnabled: Boolean(enabled),
      members: {},
    };
  } else {
    db[groupId].trackingEnabled = Boolean(enabled);
  }
  saveDB(db);
  return db[groupId].trackingEnabled;
}
