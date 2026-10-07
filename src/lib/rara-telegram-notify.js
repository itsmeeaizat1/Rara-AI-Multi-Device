// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
// rara-telegram-notify — forward notif bot (event saluran: ban/sewa/premium/server
// dll) ke GRUP & CHANNEL Telegram. Target di-set dari chat via
// .bridge notif group <id> / .bridge notif channel <id> — jadi urutan setup dari
// chat cukup: .setkey telegram <token> → .bridge ownerid add telegram <id> →
// .bridge notif group <id> → .bridge notif channel <id> → .bridge on telegram.
// Notif TG ngikutin toggle .autobroadcastchannel (sama kayak saluran WA).
import { getDatabase } from "./rara-database.js";

const TARGET_KEYS = { group: "tgNotifyGroup", channel: "tgNotifyChannel" };

// seam e2e: function = mock, null = disabled
let _sendForTest = undefined;
export function _setTgNotifySendForTest(fn) { _sendForTest = fn; }
export function _resetTgNotifySendForTest() { _sendForTest = undefined; }

export function getTgNotifyTargets() {
  try {
    const db = getDatabase();
    return {
      group: String(db.setting("tgNotifyGroup") || ""),
      channel: String(db.setting("tgNotifyChannel") || ""),
    };
  } catch {
    return { group: "", channel: "" };
  }
}

// kind: "group" | "channel" — id Telegram (angka, boleh pakai minus -100…).
// id kosong / "off" → target dihapus.
export function setTgNotifyTarget(kind, id) {
  if (!TARGET_KEYS[kind]) throw new Error("kind harus group atau channel");
  const db = getDatabase();
  const val = String(id || "").trim();
  if (!val || val.toLowerCase() === "off") {
    db.setting(TARGET_KEYS[kind], "");
    db.save();
    return { kind, cleared: true };
  }
  if (!/^-?\d+$/.test(val)) throw new Error("ID Telegram harus angka (contoh -1001234567890)");
  db.setting(TARGET_KEYS[kind], val);
  db.save();
  return { kind, id: val };
}

// Kirim text ke semua target TG yang di-set — anti-throw, jalan cuma kalau
// bridge telegram nyala (client hidup). Return ringkasan hasil.
export async function broadcastToTelegramTargets(text) {
  const body = String(text || "").trim();
  if (!body) return { sent: false, reason: "Pesan kosong" };
  if (_sendForTest === null) return { sent: false, reason: "Disabled (test)" };
  if (typeof _sendForTest === "function") {
    await _sendForTest(body);
    return { sent: true, test: true };
  }
  const targets = getTgNotifyTargets();
  const ids = [targets.group, targets.channel].filter(Boolean);
  if (!ids.length) return { sent: false, reason: "Target belum di-set (.bridge notif group/channel <id>)" };
  let client = null;
  try {
    const mgr = await import("./rarabridge/manager.js");
    client = (mgr.getTelegramClient && mgr.getTelegramClient()) || null;
  } catch {}
  if (!client) return { sent: false, reason: "Bridge telegram belum ON (.bridge on telegram)" };
  const sentTo = [];
  const failed = [];
  for (const id of ids) {
    try {
      await client.sendMessage(id, body);
      sentTo.push(id);
    } catch (e) {
      failed.push(`${id}: ${e?.message || e}`);
    }
  }
  return { sent: sentTo.length > 0, sentTo, failed };
}
