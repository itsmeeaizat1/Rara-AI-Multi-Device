// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// autoforward.js — Auto-forward pesan berdasarkan keyword ke PM owner
// .autoforward add <keyword> — Tambah keyword untuk di-watch
// .autoforward del <keyword> — Hapus keyword
// .autoforward list — Lihat semua keyword
// .autoforward on/off — Toggle
// .autoforward scope all/gc/pc — Set scope forward
import { getDatabase } from '../../src/lib/nova-database.js'
import config from '../../config.js'

const pluginConfig = {
  name: "autoforward",
  alias: ["autoforward"],
  category: "owner",
  description: "Auto-forward pesan yang match keyword tertentu ke PM owner",
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

const FORWARD_KEY = "autoforward_config"

async function getConfig(db) {
  return await db.get(FORWARD_KEY) || {
    enabled: false,
    keywords: [],
    scope: "all",
    forwardedCount: 0,
  }
}

async function saveConfig(db, cfg) {
  await db.set(FORWARD_KEY, cfg)
}

async function handler(m, { sock, config: botConfig }) {
  try {
    const db = getDatabase()
    const args = (m.text || "").trim().split(/\s+/)
    const subCmd = args[0]?.toLowerCase() || "list"
    const cfg = await getConfig(db)
    const ownerJid = botConfig.owner?.[0] || config.owner?.[0] || ""

    // Sub-command: add
    if (subCmd === "add") {
      const keyword = args.slice(1).join(" ").toLowerCase().trim()
      if (!keyword) {
        await m.react("🐣")
        return m.reply(
          "╭──「 Auto Forward 」\n" +
          "├── Masukkan keyword!\n" +
          "├── .autoforward add <keyword>\n" +
          "╰──────────❀"
        )
      }
      if (cfg.keywords.includes(keyword)) {
        await m.react("🐣")
        return m.reply(
          "╭──「 Auto Forward 」\n" +
          "├── Keyword \"" + keyword + "\" sudah ada.\n" +
          "╰──────────❀"
        )
      }
      cfg.keywords.push(keyword)
      await saveConfig(db, cfg)
      await m.react("🐣")
      return m.reply(
        "╭──「 Auto Forward 」\n" +
        "├── Keyword ditambah: \"" + keyword + "\"\n" +
        "├── Total keyword: " + cfg.keywords.length + "\n" +
        "├── Status: " + (cfg.enabled ? "ON" : "OFF") + "\n" +
        "╰──────────❀"
      )
    }

    // Sub-command: del
    if (subCmd === "del") {
      const keyword = args.slice(1).join(" ").toLowerCase().trim()
      cfg.keywords = cfg.keywords.filter(k => k !== keyword)
      await saveConfig(db, cfg)
      await m.react("🐣")
      return m.reply(
        "╭──「 Auto Forward 」\n" +
        "├── Keyword dihapus: \"" + keyword + "\"\n" +
        "├── Sisa keyword: " + cfg.keywords.length + "\n" +
        "╰──────────❀"
      )
    }

    // Sub-command: on/off
    if (subCmd === "on" || subCmd === "off") {
      cfg.enabled = subCmd === "on"
      await saveConfig(db, cfg)
      await m.react("🐣")
      return m.reply(
        "╭──「 Auto Forward 」\n" +
        "├── Status: " + (cfg.enabled ? "ON" : "OFF") + "\n" +
        "├── Scope: " + cfg.scope + "\n" +
        "├── Keywords: " + cfg.keywords.length + "\n" +
        "╰──────────❀"
      )
    }

    // Sub-command: scope
    if (subCmd === "scope") {
      const scope = args[1]?.toLowerCase()
      if (scope === "all" || scope === "gc" || scope === "pc") {
        cfg.scope = scope
        await saveConfig(db, cfg)
        await m.react("🐣")
        return m.reply(
          "╭──「 Auto Forward 」\n" +
          "├── Scope: " + scope + "\n" +
          "├── all = semua chat, gc = grup only, pc = private only\n" +
          "╰──────────❀"
        )
      }
    }

    // Default: list
    await m.react("🐣")
    let text = "╭──「 Auto Forward 」\n"
    text += "├── Status: " + (cfg.enabled ? "ON" : "OFF") + "\n"
    text += "├── Scope: " + cfg.scope + "\n"
    text += "├── Forwarded: " + cfg.forwardedCount + " pesan\n"
    text += "├──\n"

    if (cfg.keywords.length) {
      text += "├── Keywords (" + cfg.keywords.length + "):\n"
      cfg.keywords.forEach((k, i) => {
        text += "├── " + (i + 1) + ". " + k + "\n"
      })
    } else {
      text += "├── Belum ada keyword. Tambah dengan:\n"
      text += "├── .autoforward add <keyword>\n"
    }

    text += "╰──────────❀"
    return m.reply(text)
  } catch (e) {
    console.error("[autoforward] error:", e.message)
    await m.react("🐣")
    return m.reply(
      "╭──「 Error 」\n" +
      "├── " + (e.message || "Terjadi kesalahan") + "\n" +
      "╰──────────❀"
    )
  }
}

export { pluginConfig as config, handler }
