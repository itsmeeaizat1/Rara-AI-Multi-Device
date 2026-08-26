// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { getDatabase } from "../../src/lib/nova-database.js";
import { claraWrap } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "automilestone",
  alias: ["automilestone"],
  category: "future",
  description: "Auto announce milestone grup (member, pesan, online)",
  usage: ".automilestone <command>",
  example: ".automilestone add member 100",
  isOwner: false,
  isPremium: false,
  isGroup: true,
  isPrivate: false,
  cooldown: 10,
  energi: 0,
  isEnabled: true,
};

function getConfig(db, gid) {
  const all = db.setting("automilestone") || {};
  if (!all[gid]) {
    all[gid] = { enabled: false, milestones: [], achieved: [] };
    db.setting("automilestone", all);
  }
  return all[gid];
}

function saveConfig(db, gid, data) {
  const all = db.setting("automilestone") || {};
  all[gid] = data;
  db.setting("automilestone", all);
  db.save();
}

const TYPES = {
  member: { label: "Member", unit: "member" },
  messages: { label: "Total Pesan", unit: "pesan" },
  online: { label: "Member Online", unit: "online" },
};

async function handler(m, { sock, db, config: botConfig }) {
  const prefix = botConfig.command?.prefix || ".";
  const args = (m.text || "").trim().split(/\s+/);
  const sub = (args[1] || "").toLowerCase();
  const gid = m.chat;
  const cfg = getConfig(db, gid);

  if (sub === "on" || sub === "enable") {
    if (!m.isOwner) {
      await m.reply(claraWrap("Auto Milestone", "Khusus owner."));
      return { handled: true };
    }
    cfg.enabled = true;
    saveConfig(db, gid, cfg);
    await m.reply(claraWrap("Auto Milestone", "AKTIF!\nBot akan announce saat milestone tercapai."));
    return { handled: true };
  }

  if (sub === "off" || sub === "disable") {
    if (!m.isOwner) {
      await m.reply(claraWrap("Auto Milestone", "Khusus owner."));
      return { handled: true };
    }
    cfg.enabled = false;
    saveConfig(db, gid, cfg);
    await m.reply(claraWrap("Auto Milestone", "Dimatikan."));
    return { handled: true };
  }

  if (sub === "add" || sub === "tambah") {
    if (!m.isOwner) {
      await m.reply(claraWrap("Auto Milestone", "Khusus owner."));
      return { handled: true };
    }
    const type = (args[2] || "").toLowerCase();
    const value = parseInt(args[3] || "0", 10);
    if (!TYPES[type] || !value) {
      await m.reply(claraWrap("Auto Milestone", "Format: " + prefix + "automilestone add <type> <value>\nType: " + Object.keys(TYPES).join(", ") + "\nContoh: " + prefix + "automilestone add member 100"));
      return { handled: true };
    }
    cfg.milestones.push({ type, value, id: Date.now() });
    saveConfig(db, gid, cfg);
    await m.reply(claraWrap("Auto Milestone", "Milestone ditambah: " + TYPES[type].label + " " + value + "\nBot akan announce saat tercapai."));
    return { handled: true };
  }

  if (sub === "del" || sub === "hapus") {
    if (!m.isOwner) {
      await m.reply(claraWrap("Auto Milestone", "Khusus owner."));
      return { handled: true };
    }
    const idx = parseInt(args[2] || "0", 10) - 1;
    if (isNaN(idx) || idx < 0 || idx >= cfg.milestones.length) {
      await m.reply(claraWrap("Auto Milestone", "Nomor tidak valid."));
      return { handled: true };
    }
    const removed = cfg.milestones.splice(idx, 1)[0];
    saveConfig(db, gid, cfg);
    await m.reply(claraWrap("Auto Milestone", "Milestone dihapus: " + TYPES[removed.type].label + " " + removed.value));
    return { handled: true };
  }

  if (sub === "list" || sub === "cek" || !sub) {
    if (cfg.milestones.length === 0) {
      await m.reply(claraWrap("Auto Milestone", [
        "Belum ada milestone.",
        "",
        prefix + "automilestone add <type> <value>",
        "Type: " + Object.keys(TYPES).join(", "),
      ].join("\n")));
      return { handled: true };
    }
    const list = cfg.milestones.map((ms, i) => {
      const done = cfg.achieved.includes(ms.id);
      return (i + 1) + ". " + TYPES[ms.type].label + " " + ms.value + (done ? " (tercapai)" : "");
    }).join("\n");
    await m.reply(claraWrap("Auto Milestone", [
      "Status: " + (cfg.enabled ? "AKTIF" : "MATI"),
      "Tercapai: " + cfg.achieved.length + "/" + cfg.milestones.length,
      "",
      list,
    ].join("\n")));
    return { handled: true };
  }

  if (sub === "reset") {
    if (!m.isOwner) {
      await m.reply(claraWrap("Auto Milestone", "Khusus owner."));
      return { handled: true };
    }
    cfg.achieved = [];
    saveConfig(db, gid, cfg);
    await m.reply(claraWrap("Auto Milestone", "Achieved direset."));
    return { handled: true };
  }

  await m.reply(claraWrap("Auto Milestone", [
    "AUTO MILESTONE",
    "",
    prefix + "automilestone on/off",
    prefix + "automilestone add <type> <value>",
    prefix + "automilestone del <nomor>",
    prefix + "automilestone list",
    prefix + "automilestone reset",
    "",
    "Type: member, messages, online",
  ].join("\n")));
  return { handled: true };
}

export { pluginConfig as config, handler, getConfig, saveConfig, TYPES };
