// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { getDatabase } from "../../src/lib/nova-database.js";
import { claraWrap } from "../../src/lib/nova-menu-style.js";

export const cmd = "logmsg";
export const aliases = ["logpesan"];
export const category = "owner";
export const desc = "Toggle panel message logging (group only, private never logged)";
export const owner = true;
export const cooldown = 3;

export async function execute(ctx, args) {
  const { m, sock } = ctx;
  const db = getDatabase();

  if (!db.db?.data?.settings) {
    db.db.data.settings = {};
  }
  if (typeof db.db.data.settings.logMessage === "undefined") {
    db.db.data.settings.logMessage = false;
  }

  const arg = (args[0] || "").toLowerCase();

  let status, text;

  if (arg === "on") {
    db.db.data.settings.logMessage = true;
    db.save();
    status = "ON";
    text = "Panel log akan menampilkan rincian pesan grup";
  } else if (arg === "off") {
    db.db.data.settings.logMessage = false;
    db.save();
    status = "OFF";
    text = "Panel log hanya menampilkan sistem dan ping";
  } else {
    db.db.data.settings.logMessage = !db.db.data.settings.logMessage;
    db.save();
    status = db.db.data.settings.logMessage ? "ON" : "OFF";
    text = db.db.data.settings.logMessage
      ? "Panel log akan menampilkan rincian pesan grup"
      : "Panel log hanya menampilkan sistem dan ping";
  }

  const result =
    `LOG MESSAGE TOGGLE\n\n` +
    `Status: ${status}\n` +
    `Info: ${text}\n\n` +
    `Catatan: Private chat tidak akan pernah di-log, hanya grup yang aktif`;

  return m.reply(claraWrap("logmsg", result));
}
