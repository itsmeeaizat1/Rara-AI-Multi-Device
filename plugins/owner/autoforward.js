// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// autoforward.js — Auto-forward pesan berdasarkan keyword ke PM owner
// Integrated with automation hub (checkAutoForward hook)
import { getDatabase } from '../../src/lib/nova-database.js'

const pluginConfig = {
  name: "autoforward",
  alias: ["autoforward"],
  category: "owner",
  description: "Auto-forward pesan match keyword ke PM owner",
  usage: ".autoforward add/del/list/on/off/scope <arg>",
  example: ".autoforward add beli premium",
  isOwner: true,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 3,
  energi: 0,
  isEnabled: true,
}

function getCfg(db) {
  if (!db.db.data.automation) db.db.data.automation = {}
  if (!db.db.data.automation.autoforward) {
    db.db.data.automation.autoforward = { enabled: false, keywords: [], scope: "all", forwardedCount: 0 }
  }
  return db.db.data.automation.autoforward
}

function save(db) { db.markDirty("settings"); db.db.write?.() }

async function handler(m, { sock }) {
  try {
    const db = getDatabase()
    const args = (m.text || "").trim().split(/\s+/)
    const subCmd = args[0]?.toLowerCase() || "list"
    const cfg = getCfg(db)

    if (subCmd === "add") {
      const keyword = args.slice(1).join(" ").toLowerCase().trim()
      if (!keyword) { await m.react("🐣"); return m.reply("╭──「 Auto Forward 」\n├── Masukkan keyword!\n├── .autoforward add <keyword>\n╰──────────❀") }
      if (cfg.keywords.includes(keyword)) { await m.react("🐣"); return m.reply("╭──「 Auto Forward 」\n├── Keyword sudah ada.\n╰──────────❀") }
      cfg.keywords.push(keyword); save(db); await m.react("🐣")
      return m.reply("╭──「 Auto Forward 」\n├── Keyword ditambah: \"" + keyword + "\"\n├── Total: " + cfg.keywords.length + "\n├── Status: " + (cfg.enabled ? "ON" : "OFF") + "\n╰──────────❀")
    }

    if (subCmd === "del") {
      const keyword = args.slice(1).join(" ").toLowerCase().trim()
      cfg.keywords = cfg.keywords.filter(k => k !== keyword); save(db); await m.react("🐣")
      return m.reply("╭──「 Auto Forward 」\n├── Keyword dihapus: \"" + keyword + "\"\n├── Sisa: " + cfg.keywords.length + "\n╰──────────❀")
    }

    if (subCmd === "on" || subCmd === "off") {
      cfg.enabled = subCmd === "on"; save(db); await m.react("🐣")
      return m.reply("╭──「 Auto Forward 」\n├── Status: " + (cfg.enabled ? "ON" : "OFF") + "\n├── Scope: " + cfg.scope + "\n├── Keywords: " + cfg.keywords.length + "\n╰──────────❀")
    }

    if (subCmd === "scope") {
      const scope = args[1]?.toLowerCase()
      if (scope === "all" || scope === "gc" || scope === "pc") {
        cfg.scope = scope; save(db); await m.react("🐣")
        return m.reply("╭──「 Auto Forward 」\n├── Scope: " + scope + "\n├── all=semua, gc=grup, pc=private\n╰──────────❀")
      }
    }

    // Default: list
    await m.react("🐣")
    let text = "╭──「 Auto Forward 」\n"
    text += "├── Status: " + (cfg.enabled ? "ON" : "OFF") + "\n"
    text += "├── Scope: " + cfg.scope + "\n"
    text += "├── Forwarded: " + (cfg.forwardedCount || 0) + " pesan\n"
    text += "├──\n"
    if (cfg.keywords.length) {
      text += "├── Keywords (" + cfg.keywords.length + "):\n"
      cfg.keywords.forEach((k, i) => { text += "├── " + (i + 1) + ". " + k + "\n" })
    } else {
      text += "├── Belum ada keyword.\n"
      text += "├── .autoforward add <keyword>\n"
    }
    text += "╰──────────❀"
    return m.reply(text)
  } catch (e) {
    console.error("[autoforward] error:", e.message)
    await m.react("🐣")
    return m.reply("╭──「 Error 」\n├── " + (e.message || "Terjadi kesalahan") + "\n╰──────────❀")
  }
}

export { pluginConfig as config, handler }
