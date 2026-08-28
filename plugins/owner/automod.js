// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// automod.js — Group Auto-Moderation (integrated with automation hub)
import { getDatabase } from '../../src/lib/nova-database.js'

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
    cfg.groups[gid] = { enabled: true, rules: { ...DEFAULT_RULES }, badwords: [], action: "warn", warnings: {}, violations: 0 }
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
      if (!gid?.includes("@g.us")) { await m.react("🐣"); return m.reply("╭──「 Auto Mod 」\n│ Format: .automod addgc <groupId>\n╰──────────❀") }
      ensureGroup(cfg, gid); save(db); await m.react("🐣")
      return m.reply("╭──「 Auto Mod 」\n│ Grup ditambah: " + gid.slice(0, 20) + "...\n│ Rules: antilink, antispam\n│ Action: warn\n╰──────────❀")
    }

    if (subCmd === "delgc") {
      const gid = args[1]
      if (cfg.groups[gid]) { delete cfg.groups[gid]; save(db) }
      await m.react("🐣")
      return m.reply("╭──「 Auto Mod 」\n│ Grup dihapus: " + (gid || "?").slice(0, 20) + "...\n╰──────────❀")
    }

    if (subCmd === "setrule") {
      const gid = args[1], rule = args[2]?.toLowerCase(), toggle = args[3]?.toLowerCase()
      if (!cfg.groups[gid] || !DEFAULT_RULES.hasOwnProperty(rule)) { await m.react("🐣")
        return m.reply("╭──「 Auto Mod 」\n│ Grup belum terdaftar atau rule invalid.\n│ Rules: antilink, antispam, antibadword, antisticker, antivoice\n╰──────────❀") }
      cfg.groups[gid].rules[rule] = toggle === "on"; save(db); await m.react("🐣")
      return m.reply("╭──「 Auto Mod 」\n" + rule + ": " + (toggle === "on" ? "ON" : "OFF") + "\n│ Grup: " + gid.slice(0, 20) + "...\n╰──────────❀")
    }

    if (subCmd === "addword") {
      const gid = args[1], word = args.slice(2).join(" ").toLowerCase().trim()
      if (!cfg.groups[gid] || !word) { await m.react("🐣"); return m.reply("╭──「 Auto Mod 」\n│ .automod addword <groupId> <kata>\n╰──────────❀") }
      cfg.groups[gid].badwords.push(word); save(db); await m.react("🐣")
      return m.reply("╭──「 Auto Mod 」\n│ Badword: \"" + word + "\" ditambah\n│ Total: " + cfg.groups[gid].badwords.length + "\n╰──────────❀")
    }

    if (subCmd === "delword") {
      const gid = args[1], word = args.slice(2).join(" ").toLowerCase().trim()
      if (cfg.groups[gid]) { cfg.groups[gid].badwords = cfg.groups[gid].badwords.filter(w => w !== word); save(db) }
      await m.react("🐣")
      return m.reply("╭──「 Auto Mod 」\n│ Badword dihapus: \"" + word + "\"\n╰──────────❀")
    }

    if (subCmd === "action") {
      const gid = args[1], action = args[2]?.toLowerCase()
      if (!cfg.groups[gid] || !["delete", "warn", "kick"].includes(action)) { await m.react("🐣")
        return m.reply("╭──「 Auto Mod 」\n│ .automod action <groupId> delete/warn/kick\n╰──────────❀") }
      cfg.groups[gid].action = action; save(db); await m.react("🐣")
      return m.reply("╭──「 Auto Mod 」\n│ Action: " + action + "\n│ Grup: " + gid.slice(0, 20) + "...\n╰──────────❀")
    }

    if (subCmd === "rules") {
      const gid = args[1]
      if (!cfg.groups[gid]) { await m.react("🐣"); return m.reply("╭──「 Auto Mod 」\n│ Grup belum terdaftar.\n╰──────────❀") }
      const g = cfg.groups[gid]; await m.react("🐣")
      let text = "╭──「 Auto Mod Rules 」\n│ Grup: " + gid.slice(0, 25) + "...\n│ Status: " + (g.enabled ? "ON" : "OFF") + "\n│ Action: " + g.action + "\n│\n│ Rules:\n"
      Object.entries(g.rules).forEach(([rule, on]) => { text += "" + (on ? "✅" : "❌") + " " + rule + "\n" })
      text += "│\n│ Badwords: " + g.badwords.length + " | Violations: " + g.violations + "\n╰──────────❀"
      return m.reply(text)
    }

    // Default: list
    await m.react("🐣")
    const gids = Object.keys(cfg.groups)
    if (!gids.length) {
      return m.reply("╭──「 Auto Mod 」\n│ Belum ada grup terdaftar.\n│\n│ .automod addgc <groupId>\n│ .automod setrule <groupId> antilink on\n│ .automod action <groupId> delete/warn/kick\n│ .automod addword <groupId> <badword>\n╰──────────❀")
    }
    let text = "╭──「 Auto Mod 」\n│ Grup terdaftar: " + gids.length + "\n│\n"
    gids.forEach((gid, i) => {
      const g = cfg.groups[gid]
      const active = Object.entries(g.rules).filter(([_, v]) => v).map(([k]) => k).join(", ")
      text += "" + (i + 1) + ". " + gid.slice(0, 20) + "...\n"
      text += "│ Rules: " + (active || "none") + " | Action: " + g.action + "\n"
      if (i < gids.length - 1) text += "│\n"
    })
    text += "╰──────────❀"
    return m.reply(text)
  } catch (e) {
    console.error("[automod] error:", e.message)
    await m.react("🐣")
    return m.reply("╭──「 Error 」\n" + (e.message || "Terjadi kesalahan") + "\n╰──────────❀")
  }
}

export { pluginConfig as config, handler }
