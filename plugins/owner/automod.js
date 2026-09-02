// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// automod.js — Group Auto-Moderation (integrated with automation hub)
import { getDatabase } from '../../src/lib/nova-database.js'
import { novaError, novaEmpty, novaGuide, novaNoInput, novaBox } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "automod",
  alias: ["automod"],
  category: "owner",
  description: "Auto-moderation grup (anti-link, anti-spam, anti-badword)",
  usage: ".automod addgc/delgc/list/setrule/addword/delword/action/rules <args>",
  example: ".automod addgc 120363xxx@g.us",
  isOwner: true,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 3,
  energi: 0,
  isEnabled: true,
}

const DEFAULT_RULES = { antilink: true, antispam: true, antibadword: false, antisticker: false, antivoice: false }
const DEFAULT_BADWORDS = ["spam", "scam", " judi", "casino", "porn"]

function getCfg(db) {
  if (!db.db.data.automation) db.db.data.automation = {}
  if (!db.db.data.automation.automod) {
    db.db.data.automation.automod = { groups: {}, globalBadwords: DEFAULT_BADWORDS }
  }
  return db.db.data.automation.automod
}

function save(db) { db.markDirty("settings"); db.db.write?.() }

function ensureGroup(cfg, gid) {
  if (!cfg.groups[gid]) {
    cfg.groups[gid] = { enabled: false, rules: { ...DEFAULT_RULES }, badwords: [], action: "warn", warnings: {}, violations: 0 }
  }
  return cfg.groups[gid]
}

async function handler(m, { sock }) {
  try {
    const db = getDatabase()
    const args = (m.text || "").trim().split(/\s+/)
    const subCmd = args[0]?.toLowerCase() || "list"
    const cfg = getCfg(db)

    if (subCmd === "addgc") {
      const gid = args[1]
      if (!gid?.includes("@g.us")) { return m.reply(novaBox("Auto Mod", ["❌ Format: .automod addgc <groupId>"])) }
      ensureGroup(cfg, gid); save(db);
      return m.reply(novaBox("Auto Mod", ["✅ Grup ditambah: " + gid.slice(0, 20) + "...", "Rules: antilink, antispam", "Action: warn"]))
    }

    if (subCmd === "delgc") {
      const gid = args[1]
      if (cfg.groups[gid]) { delete cfg.groups[gid]; save(db) }
      return m.reply(novaBox("Auto Mod", ["✅ Grup dihapus: " + (gid || "?").slice(0, 20) + "..."]))
    }

    if (subCmd === "setrule") {
      const gid = args[1], rule = args[2]?.toLowerCase(), toggle = args[3]?.toLowerCase()
      if (!cfg.groups[gid] || !DEFAULT_RULES.hasOwnProperty(rule)) {
        return m.reply("❌ Grup belum terdaftar atau rule invalid.\nRules: antilink, antispam, antibadword, antisticker, antivoice") }
      cfg.groups[gid].rules[rule] = toggle === "on"; save(db);
      return m.reply("✅ " + rule + ": " + (toggle === "on" ? "ON" : "OFF") + "\nGrup: " + gid.slice(0, 20) + "...")
    }

    if (subCmd === "addword") {
      const gid = args[1], word = args.slice(2).join(" ").toLowerCase().trim()
      if (!cfg.groups[gid] || !word) { return m.reply("❌ Format: .automod addword <groupId> <kata>") }
      cfg.groups[gid].badwords.push(word); save(db);
      return m.reply("✅ Badword: \"" + word + "\" ditambah\nTotal: " + cfg.groups[gid].badwords.length)
    }

    if (subCmd === "delword") {
      const gid = args[1], word = args.slice(2).join(" ").toLowerCase().trim()
      if (cfg.groups[gid]) { cfg.groups[gid].badwords = cfg.groups[gid].badwords.filter(w => w !== word); save(db) }
      return m.reply("✅ Badword dihapus: \"" + word + "\"")
    }

    if (subCmd === "on" || subCmd === "off") {
      const gid = args[1] || (m.isGroup ? m.chat : "")
      if (!gid?.includes("@g.us")) { return m.reply("❌ Gunakan di grup atau: .automod " + subCmd + " <groupId>") }
      ensureGroup(cfg, gid); cfg.groups[gid].enabled = subCmd === "on"; save(db)
      return m.reply("✅ Status: " + (subCmd === "on" ? "ON" : "OFF") + "\nGrup: " + gid.slice(0, 20) + "...")
    }

    if (subCmd === "action") {
      const gid = args[1], action = args[2]?.toLowerCase()
      if (!cfg.groups[gid] || !["delete", "warn", "kick"].includes(action)) {
        return m.reply("❌ Format: .automod action <groupId> delete/warn/kick") }
      cfg.groups[gid].action = action; save(db);
      return m.reply("✅ Action: " + action + "\nGrup: " + gid.slice(0, 20) + "...")
    }

    if (subCmd === "rules") {
      const gid = args[1]
      if (!cfg.groups[gid]) { return m.reply("❌ Grup belum terdaftar.") }
      const g = cfg.groups[gid];
      let text = "*Auto Mod Rules*\n\nGrup: " + gid.slice(0, 25) + "...\nStatus: " + (g.enabled ? "ON" : "OFF") + "\nAction: " + g.action + "\n\nRules:\n"
      Object.entries(g.rules).forEach(([rule, on]) => { text += (on ? "✅ " : "❌ ") + rule + "\n" })
      text += "\nBadwords: " + g.badwords.length + " | Violations: " + g.violations
      return m.reply(text)
    }

    // Default: list
    const gids = Object.keys(cfg.groups)
    if (!gids.length) {
      return m.reply("Belum ada grup terdaftar.\n\n.automod addgc <groupId>\n.automod setrule <groupId> antilink on\n.automod action <groupId> delete/warn/kick\n.automod addword <groupId> <badword>")
    }
    let text = "*Auto Mod*\n\nGrup terdaftar: " + gids.length + "\n\n"
    gids.forEach((gid, i) => {
      const g = cfg.groups[gid]
      const active = Object.entries(g.rules).filter(([_, v]) => v).map(([k]) => k).join(", ")
      text += (i + 1) + ". " + gid.slice(0, 20) + "...\n"
      text += "Rules: " + (active || "none") + " | Action: " + g.action + "\n\n"
    })
    return m.reply(text.trim())
  } catch (e) {
    console.error("[automod] error:", e.message)
    return m.reply("❌ " + (e.message || "Ada error nih"))
  }
}

export { pluginConfig as config, handler }
