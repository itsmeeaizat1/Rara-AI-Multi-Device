// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
import { getDatabase } from "../../src/lib/rara-database.js";
import { raraWrap } from "../../src/lib/rara-menu-style.js";

const pluginConfig = {
  name: "logmsg",
  alias: ["logmsg"],
  category: "owner",
  description: "Toggle panel message logging (group only, private never logged)",
  usage: ".logmsg on/off",
  example: ".logmsg on",
  isOwner: true,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 3,
  energi: 0,
  isEnabled: true,
};

async function handler(m, { sock, config: botConfig, args }) {
  const db = getDatabase();

  if (!db.db?.data?.settings) {
    db.db.data.settings = {};
  }
  if (typeof db.db.data.settings.logMessage === "undefined") {
    db.db.data.settings.logMessage = false;
  }

  const arg = (args?.[0] || m.text?.split(/\s+/)?.[1] || "").toLowerCase();

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

  return m.reply(raraWrap("logmsg", result));
}

export { pluginConfig as config, handler };
