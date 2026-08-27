// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// automod.js — Auto-Moderation System untuk grup
// .automod addgc <groupId> — Tambah grup ke auto-moderation
// .automod delgc <groupId> — Hapus grup dari auto-moderation
// .automod list — Lihat grup yang dimoderasi
// .automod rules <groupId> — Lihat rules per grup
// .automod setrule <groupId> <rule> on/off — Toggle rule
// .automod addword <groupId> <word> — Tambah badword
// .automod delword <groupId> <word> — Hapus badword
// .automod action <groupId> delete/warn/kick — Set action untuk violation
// Rules: antilink, antispam, antibadword, antisticker, antivoice
import { getDatabase } from '../../src/lib/nova-database.js'

const pluginConfig = {
  name: "automod",
  alias: ["automod"],
  category: "owner",
  description: "Auto-moderation grup (anti-link, anti-spam, anti-badword, auto-action)",
  usage: ".automod addgc/delgc/list/setrule/addword/delword/action <args>",
  example: ".automod addgc 120363xxx@g.us",
  isOwner: true,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 3,
  energi: 0,
  isEnabled: true,
}

const MOD_KEY = "automod_config"

const DEFAULT_RULES = {
  antilink: true,
  antispam: true,
  antibadword: false,
  antisticker: false,
  antivoice: false,
}

const DEFAULT_ACTION = "warn"

async function getConfig(db) {
  return await db.get(MOD_KEY) || {
    groups: {},
    globalBadwords: ["spam", "scam", " judi", "casino", "porn"],
    spamThreshold: 5,
    spamWindow: 5000,
  }
}

async function saveConfig(db, cfg) {
  await db.set(MOD_KEY, cfg)
}

function getGroupConfig(cfg, groupId) {
  if (!cfg.groups[groupId]) {
    cfg.groups[groupId] = {
      enabled: true,
      rules: { ...DEFAULT_RULES },
      badwords: [],
      action: DEFAULT_ACTION,
      warnings: {},
      violations: 0,
    }
  }
  return cfg.groups[groupId]
}

async function handler(m, { sock, config: botConfig }) {
  try {
    const db = getDatabase()
    const args = (m.text || "").trim().split(/\s+/)
    const subCmd = args[0]?.toLowerCase() || "list"
    const cfg = await getConfig(db)

    // Sub-command: addgc
    if (subCmd === "addgc") {
      const gid = args[1]
      if (!gid || !gid.includes("@g.us")) {
        await m.react("🐣")
        return m.reply(
          "╭──「 Auto Mod 」\n" +
          "├── Format: .automod addgc <groupId>\n" +
          "├── Contoh: .automod addgc 120363xxx@g.us\n" +
          "╰──────────❀"
        )
      }
      getGroupConfig(cfg, gid)
      cfg.groups[gid].enabled = true
      await saveConfig(db, cfg)
      await m.react("🐣")
      return m.reply(
        "╭──「 Auto Mod 」\n" +
        "├── Grup ditambahkan: " + gid.slice(0, 20) + "...\n" +
        "├── Rules aktif: antilink, antispam\n" +
        "├── Action: warn\n" +
        "╰──────────❀"
      )
    }

    // Sub-command: delgc
    if (subCmd === "delgc") {
      const gid = args[1]
      if (cfg.groups[gid]) {
        delete cfg.groups[gid]
        await saveConfig(db, cfg)
      }
      await m.react("🐣")
      return m.reply(
        "╭──「 Auto Mod 」\n" +
        "├── Grup dihapus: " + (gid || "?").slice(0, 20) + "...\n" +
        "╰──────────❀"
      )
    }

    // Sub-command: setrule
    if (subCmd === "setrule") {
      const gid = args[1]
      const rule = args[2]?.toLowerCase()
      const toggle = args[3]?.toLowerCase()
      if (!cfg.groups[gid] || !DEFAULT_RULES.hasOwnProperty(rule)) {
        await m.react("🐣")
        return m.reply(
          "╭──「 Auto Mod 」\n" +
          "├── Grup belum terdaftar atau rule tidak valid.\n" +
          "├── Rules: antilink, antispam, antibadword, antisticker, antivoice\n" +
          "╰──────────❀"
        )
      }
      cfg.groups[gid].rules[rule] = toggle === "on"
      await saveConfig(db, cfg)
      await m.react("🐣")
      return m.reply(
        "╭──「 Auto Mod 」\n" +
        "├── Rule " + rule + ": " + (toggle === "on" ? "ON" : "OFF") + "\n" +
        "├── Grup: " + gid.slice(0, 20) + "...\n" +
        "╰──────────❀"
      )
    }

    // Sub-command: addword
    if (subCmd === "addword") {
      const gid = args[1]
      const word = args.slice(2).join(" ").toLowerCase().trim()
      if (!cfg.groups[gid] || !word) {
        await m.react("🐣")
        return m.reply(
          "╭──「 Auto Mod 」\n" +
          "├── Format: .automod addword <groupId> <kata>\n" +
          "╰──────────❀"
        )
      }
      cfg.groups[gid].badwords.push(word)
      await saveConfig(db, cfg)
      await m.react("🐣")
      return m.reply(
        "╭──「 Auto Mod 」\n" +
        "├── Badword ditambah: \"" + word + "\"\n" +
        "├── Total badword grup: " + cfg.groups[gid].badwords.length + "\n" +
        "╰──────────❀"
      )
    }

    // Sub-command: delword
    if (subCmd === "delword") {
      const gid = args[1]
      const word = args.slice(2).join(" ").toLowerCase().trim()
      if (cfg.groups[gid]) {
        cfg.groups[gid].badwords = cfg.groups[gid].badwords.filter(w => w !== word)
        await saveConfig(db, cfg)
      }
      await m.react("🐣")
      return m.reply(
        "╭──「 Auto Mod 」\n" +
        "├── Badword dihapus: \"" + word + "\"\n" +
        "╰──────────❀"
      )
    }

    // Sub-command: action
    if (subCmd === "action") {
      const gid = args[1]
      const action = args[2]?.toLowerCase()
      if (!cfg.groups[gid] || !["delete", "warn", "kick"].includes(action)) {
        await m.react("🐣")
        return m.reply(
          "╭──「 Auto Mod 」\n" +
          "├── Format: .automod action <groupId> delete/warn/kick\n" +
          "╰──────────❀"
        )
      }
      cfg.groups[gid].action = action
      await saveConfig(db, cfg)
      await m.react("🐣")
      return m.reply(
        "╭──「 Auto Mod 」\n" +
        "├── Action: " + action + "\n" +
        "├── Grup: " + gid.slice(0, 20) + "...\n" +
        "╰──────────❀"
      )
    }

    // Sub-command: rules
    if (subCmd === "rules") {
      const gid = args[1]
      if (!cfg.groups[gid]) {
        await m.react("🐣")
        return m.reply(
          "╭──「 Auto Mod 」\n" +
          "├── Grup belum terdaftar.\n" +
          "╰──────────❀"
        )
      }
      const g = cfg.groups[gid]
      await m.react("🐣")
      let text = "╭──「 Auto Mod Rules 」\n"
      text += "├── Grup: " + gid.slice(0, 25) + "...\n"
      text += "├── Status: " + (g.enabled ? "ON" : "OFF") + "\n"
      text += "├── Action: " + g.action + "\n"
      text += "├──\n"
      text += "├── Rules:\n"
      Object.entries(g.rules).forEach(([rule, on]) => {
        const icon = on ? "✅" : "❌"
        text += "├── " + icon + " " + rule + "\n"
      })
      text += "├──\n"
      text += "├── Badwords: " + g.badwords.length + " kata\n"
      text += "├── Violations: " + g.violations + "x\n"
      text += "╰──────────❀"
      return m.reply(text)
    }

    // Default: list
    await m.react("🐣")
    const groupIds = Object.keys(cfg.groups)
    if (!groupIds.length) {
      return m.reply(
        "╭──「 Auto Mod 」\n" +
        "├── Belum ada grup terdaftar.\n" +
        "├──\n" +
        "├── Cara pakai:\n" +
        "├── .automod addgc <groupId> — Tambah grup\n" +
        "├── .automod setrule <groupId> antilink on\n" +
        "├── .automod action <groupId> delete/warn/kick\n" +
        "├── .automod addword <groupId> <badword>\n" +
        "╰──────────❀"
      )
    }
    let text = "╭──「 Auto Mod 」\n"
    text += "├── Grup terdaftar: " + groupIds.length + "\n"
    text += "├──\n"
    groupIds.forEach((gid, i) => {
      const g = cfg.groups[gid]
      const activeRules = Object.entries(g.rules).filter(([_, v]) => v).map(([k]) => k).join(", ")
      text += "├── " + (i + 1) + ". " + gid.slice(0, 20) + "...\n"
      text += "├── Rules: " + (activeRules || "none") + "\n"
      text += "├── Action: " + g.action + " | Violations: " + g.violations + "\n"
      if (i < groupIds.length - 1) text += "├──\n"
    })
    text += "╰──────────❀"
    return m.reply(text)
  } catch (e) {
    console.error("[automod] error:", e.message)
    await m.react("🐣")
    return m.reply(
      "╭──「 Error 」\n" +
      "├── " + (e.message || "Terjadi kesalahan") + "\n" +
      "╰──────────❀"
    )
  }
}

export { pluginConfig as config, handler }
