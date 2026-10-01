// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
import { getDatabase } from "../../src/lib/rara-database.js";
import { raraWrap } from "../../src/lib/rara-menu-style.js";

const pluginConfig = {
  name: "togglejoinreq",
  alias: ["togglejoinreq"],
  category: "owner",
  description: "Toggle on/off notifikasi member request join grup",
  usage: ".togglejoinreq (lihat status) / .togglejoinreq owner / .togglejoinreq admin / .togglejoinreq all on/off",
  example: ".togglejoinreq\n.togglejoinreq owner\n.togglejoinreq admin on",
  isOwner: true,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 3,
  energi: 0,
  isEnabled: true,
};

const TOGGLE_KEYS = {
  notifyOwner: "joinReqNotifyOwner",
  notifyAdmin: "joinReqNotifyAdmin",
};

function isEnabled(key) {
  try {
    const db = getDatabase();
    return db.setting(key) === true;
  } catch {
    return false;
  }
}

function setEnabled(key, val) {
  try {
    const db = getDatabase();
    db.setSetting(key, val);
    db.save();
  } catch (e) {
    console.error("togglejoinreq setEnabled error:", e.message);
  }
}

async function handler(m, { sock, config: botConfig }) {
  const prefix = botConfig.command?.prefix || ".";
  const args = m.args || [];
  const subCmd = args[0]?.toLowerCase();

  if (!subCmd || subCmd === "status" || subCmd === "cek") {
    const ownerOn = isEnabled(TOGGLE_KEYS.notifyOwner);
    const adminOn = isEnabled(TOGGLE_KEYS.notifyAdmin);

    let text = "NOTIFIKASI MEMBER JOIN REQUEST\n\n";
    text += "1. Notify Owner: " + (ownerOn ? "*ON*" : "*OFF*") + "\n";
    text += "   Kirim notifikasi ke DM owner saat ada yang request join\n\n";
    text += "2. Notify Admin Grup: " + (adminOn ? "*ON*" : "*OFF*") + "\n";
    text += "   Kirim notifikasi ke DM admin grup saat ada yang request join\n\n";
    text += "Cara pakai:\n";
    text += prefix + "togglejoinreq owner — toggle on/off\n";
    text += prefix + "togglejoinreq admin — toggle on/off\n";
    text += prefix + "togglejoinreq all on — nyalain semua\n";
    text += prefix + "togglejoinreq all off — matikan semua";

    return await m.reply( text, "togglejoinreq");
  }

  if (subCmd === "all") {
    const action = args[1]?.toLowerCase();
    if (action === "on") {
      setEnabled(TOGGLE_KEYS.notifyOwner, true);
      setEnabled(TOGGLE_KEYS.notifyAdmin, true);
      return m.reply(raraWrap("togglejoinreq", "Semua notifikasi join request *DINYALAKAN*\n\n1. Notify Owner: *ON*\n2. Notify Admin Grup: *ON*"));
    } else if (action === "off") {
      setEnabled(TOGGLE_KEYS.notifyOwner, false);
      setEnabled(TOGGLE_KEYS.notifyAdmin, false);
      return m.reply(raraWrap("togglejoinreq", "Semua notifikasi join request *DIMATIKAN*\n\n1. Notify Owner: *OFF*\n2. Notify Admin Grup: *OFF*"));
    }
    return m.reply(raraWrap("Usage", "Format: " + prefix + "togglejoinreq all on/off"));
  }

  if (subCmd === "owner") {
    const current = isEnabled(TOGGLE_KEYS.notifyOwner);
    setEnabled(TOGGLE_KEYS.notifyOwner, !current);
    const status = !current ? "ON" : "OFF";
    return m.reply(
      "Notify Owner: *" + status + "*\n\n" +
      (!current
        ? "Notifikasi request join grup bakal dikirim ke DM owner."
        : "Notifikasi request join grup ke owner dimatikan.")
    );
  }

  if (subCmd === "admin") {
    const current = isEnabled(TOGGLE_KEYS.notifyAdmin);
    setEnabled(TOGGLE_KEYS.notifyAdmin, !current);
    const status = !current ? "ON" : "OFF";
    return m.reply(
      "Notify Admin Grup: *" + status + "*\n\n" +
      (!current
        ? "Notifikasi request join grup bakal dikirim ke DM admin grup."
        : "Notifikasi request join grup ke admin dimatikan.")
    );
  }

  return m.reply(
    "Event tidak dikenal.\n\nPilihan: owner, admin, all\n💡 *Contoh:* " + prefix + "togglejoinreq owner"
  );
}

export { pluginConfig as config, handler };
