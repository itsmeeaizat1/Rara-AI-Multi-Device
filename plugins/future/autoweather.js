// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { getDatabase } from "../../src/lib/nova-database.js";
import { claraWrap } from "../../src/lib/nova-menu-style.js";
import axios from "axios";

const pluginConfig = {
  name: "autoweather",
  alias: ["autoweather", "weatheralert", "cuacaalert"],
  category: "future",
  description: "Auto alert peringatan cuaca ekstrem dari BMKG",
  usage: ".autoweather <command>",
  example: ".autoweather on",
  isOwner: false,
  isPremium: false,
  isGroup: true,
  isPrivate: false,
  cooldown: 15,
  energi: 0,
  isEnabled: true,
};

const BMKG_WARN_URL = "https://warningbmkg.mgo.id/api/v1/warning/active";

function getConfig(db, gid) {
  const all = db.setting("autoweather") || {};
  if (!all[gid]) {
    all[gid] = { enabled: false, region: "all", lastAlert: 0, alertCount: 0 };
    db.setting("autoweather", all);
  }
  return all[gid];
}

function saveConfig(db, gid, data) {
  const all = db.setting("autoweather") || {};
  all[gid] = data;
  db.setting("autoweather", all);
  db.save();
}

async function checkBMKG() {
  try {
    const res = await axios.get(BMKG_WARN_URL, { timeout: 10000, headers: { "User-Agent": "Mozilla/5.0" } });
    return res.data?.data || res.data?.result || res.data || null;
  } catch {
    return null;
  }
}

async function handler(m, { sock, db, config: botConfig }) {
  const prefix = botConfig.command?.prefix || ".";
  const args = (m.text || "").trim().split(/\s+/);
  const sub = (args[1] || "").toLowerCase();
  const gid = m.chat;
  const cfg = getConfig(db, gid);

  if (sub === "on" || sub === "enable") {
    if (!m.isOwner) {
      await m.reply(claraWrap("Auto Weather", "Khusus owner."));
      return { handled: true };
    }
    const region = args[2] || cfg.region;
    cfg.enabled = true;
    cfg.region = region;
    saveConfig(db, gid, cfg);
    await m.reply(claraWrap("Auto Weather", "AKTIF!\nRegion: " + region + "\nBot alert kalau ada peringatan cuaca ekstrem BMKG."));
    return { handled: true };
  }

  if (sub === "off" || sub === "disable") {
    if (!m.isOwner) {
      await m.reply(claraWrap("Auto Weather", "Khusus owner."));
      return { handled: true };
    }
    cfg.enabled = false;
    saveConfig(db, gid, cfg);
    await m.reply(claraWrap("Auto Weather", "Dimatikan."));
    return { handled: true };
  }

  if (sub === "cek" || sub === "check") {
    await m.react("🐣");
    const data = await checkBMKG();
    await m.react("✅");
    if (!data) {
      await m.reply(claraWrap("Auto Weather", "Gagal fetch BMKG. Coba lagi nanti."));
      return { handled: true };
    }
    const warnings = Array.isArray(data) ? data : (data?.warnings || data?.list || []);
    if (warnings.length === 0) {
      await m.reply(claraWrap("Auto Weather", "Tidak ada peringatan cuaca ekstrem saat ini."));
      return { handled: true };
    }
    const list = warnings.slice(0, 5).map((w, i) => {
      const area = w.area || w.region || w.propinsi || "Tidak diketahui";
      const level = w.level || w.warningLevel || w.category || "-";
      const desc = w.description || w.warning || w.info || "-";
      return (i + 1) + ". " + area + " [" + level + "]\n   " + String(desc).slice(0, 100);
    }).join("\n\n");
    await m.reply(claraWrap("Auto Weather Alert", "Peringatan BMKG (" + warnings.length + "):\n\n" + list));
    return { handled: true };
  }

  if (sub === "region") {
    if (!m.isOwner) {
      await m.reply(claraWrap("Auto Weather", "Khusus owner."));
      return { handled: true };
    }
    const region = args.slice(2).join(" ").trim();
    if (!region) {
      await m.reply(claraWrap("Auto Weather", "Format: " + prefix + "autoweather region <nama provinsi/all>\nContoh: " + prefix + "autoweather region Jawa Barat"));
      return { handled: true };
    }
    cfg.region = region;
    saveConfig(db, gid, cfg);
    await m.reply(claraWrap("Auto Weather", "Region diset: " + region));
    return { handled: true };
  }

  if (sub === "status" || sub === "cek" || !sub) {
    await m.reply(claraWrap("Auto Weather", [
      "Status: " + (cfg.enabled ? "AKTIF" : "MATI"),
      "Region: " + cfg.region,
      "Total alert: " + cfg.alertCount,
      "Terakhir: " + (cfg.lastAlert ? new Date(cfg.lastAlert).toLocaleString("id-ID") : "belum pernah"),
    ].join("\n")));
    return { handled: true };
  }

  await m.reply(claraWrap("Auto Weather", [
    "AUTO WEATHER ALERT",
    "",
    prefix + "autoweather on [region] - aktifkan",
    prefix + "autoweather off - matikan",
    prefix + "autoweather cek - cek peringatan sekarang",
    prefix + "autoweather region <provinsi/all>",
    prefix + "autoweather status",
    "",
    "Hanya kirim alert kalau ada peringatan ekstrem BMKG.",
  ].join("\n")));
  return { handled: true };
}

export { pluginConfig as config, handler, getConfig, saveConfig, checkBMKG };
