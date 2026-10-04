// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
// autoforward.js — Auto-forward pesan berdasarkan keyword ke PM owner
// Integrated with automation hub (checkAutoForward hook)
import { getDatabase } from '../../src/lib/rara-database.js'
import { raraError, raraEmpty, raraGuide, raraNoInput, raraBox, raraWrap } from "../../src/lib/rara-menu-style.js";

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
      if (!keyword) { return m.reply(raraBox("Auto Forward", ["❌ Masukkan keyword!", "---", "Contoh: .autoforward add <keyword>"])) }
      if (cfg.keywords.includes(keyword)) { return m.reply(raraBox("Auto Forward", ["❌ Keyword sudah ada."])) }
      cfg.keywords.push(keyword); save(db);
      return m.reply(raraBox("Auto Forward", ["✅ Keyword ditambah: " + keyword, "Total: " + cfg.keywords.length, "Status: " + (cfg.enabled ? "ON" : "OFF")]))
    }

    if (subCmd === "del") {
      const keyword = args.slice(1).join(" ").toLowerCase().trim()
      cfg.keywords = cfg.keywords.filter(k => k !== keyword); save(db);
      return m.reply(raraWrap("autoforward", "Keyword dihapus: " + keyword + "\nSisa: " + cfg.keywords.length))
    }

    if (subCmd === "on" || subCmd === "off") {
      cfg.enabled = subCmd === "on"; save(db);
      return m.reply(raraWrap("autoforward", "Status: " + (cfg.enabled ? "ON" : "OFF") + "\nScope: " + cfg.scope + "\nKeywords: " + cfg.keywords.length))
    }

    if (subCmd === "scope") {
      const scope = args[1]?.toLowerCase()
      if (scope === "all" || scope === "gc" || scope === "pc") {
        cfg.scope = scope; save(db);
        return m.reply(raraWrap("autoforward", "Scope: " + scope + "\nall=semua, gc=grup, pc=private"))
      }
    }

    // Default: list
    let text = "*Auto Forward*\n\n"
    text += "Status: " + (cfg.enabled ? "ON" : "OFF") + "\n"
    text += "Scope: " + cfg.scope + "\n"
    text += "Forwarded: " + (cfg.forwardedCount || 0) + " pesan\n\n"
    if (cfg.keywords.length) {
      text += "Keywords (" + cfg.keywords.length + "):\n"
      cfg.keywords.forEach((k, i) => { text += (i + 1) + ". " + k + "\n" })
    } else {
      text += "Belum ada keyword.\n.autoforward add <keyword>"
    }
    return m.reply(text)
  } catch (e) {
    console.error("[autoforward] error:", e.message)
    return m.reply(raraWrap("autoforward", "Gagal proses. Coba lagi.", "error"))
  }
}

export { pluginConfig as config, handler }
