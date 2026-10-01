// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
import { getDatabase } from "./rara-database.js";

const db = getDatabase();

export function getTopByField(field = "exp", limit = 10) {
  const users = db.getAllUsers();
  return Object.entries(users)
    .map(([jid, user]) => {
      const rpg = user?.rpg || {};
      return {
        id: jid,
        name: rpg?.name || user?.name || "Player",
        level: rpg?.level || 1,
        gold: rpg?.gold || 0,
        exp: rpg?.exp || 0,
        wins: rpg?.wins || 0,
        losses: rpg?.losses || 0,
      };
    })
    .filter((u) => (u[field] || 0) > 0)
    .sort((a, b) => (b[field] || 0) - (a[field] || 0))
    .slice(0, limit);
}
