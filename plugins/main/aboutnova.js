import {  claraWrap } from "../../src/lib/nova-menu-style.js";
import { sendReplyWithNav } from "../../src/lib/nova-nav-buttons.js";
import config from '../../config.js'
import { saluranCtx } from '../../src/lib/nova-context.js'
import fs from 'fs'
import path from 'path'

const pluginConfig = {
  name: "aboutnova",
  alias: ["aboutnova", "about2", "infonova"],
  category: 'main',
  description: 'Tentang Nova AI Bot & creator',
  usage: '.aboutnova',
  example: '.aboutnova',
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 10,
  energi: 0,
  isEnabled: true
}

function countPlugins() {
  try {
    const pluginsDir = path.resolve(process.cwd(), 'plugins')
    let total = 0
    let categories = 0
    const cats = fs.readdirSync(pluginsDir, { withFileTypes: true })
      .filter(d => d.isDirectory())
    for (const cat of cats) {
      const files = fs.readdirSync(path.join(pluginsDir, cat.name))
        .filter(f => f.endsWith('.js'))
      if (files.length > 0) {
        total += files.length
        categories++
      }
    }
    return { total, categories }
  } catch {
    return { total: 1000, categories: 35 }
  }
}

async function handler(m, { sock }) {
  const botName = config.bot?.name || 'Nova AI'
  const botVersion = config.bot?.version || '20.0.0'
  const developer = config.bot?.developer || 'Aizat'
  const { total, categories } = countPlugins()

  const text =
    `TENTANG NOVA AI\n\n` +
    `Nova AI WhatsApp Bot Multi Device\n` +
    `Versi: ${botVersion}\n\n` +
    `CREATOR\n` +
    `Nama: Aizat\n` +
    `Role: Developer & Owner\n` +
    `GitHub: itsmeeaizat\n` +
    `Repo: Nova-Ai-Whatsapp-Bot-Multi-Device\n\n` +
    `SCRIPT INFO\n` +
    `Dibuat oleh: Aizat\n` +
    `Bahasa: JavaScript (Node.js)\n` +
    `Library: Baileys (WhatsApp Web API)\n` +
    `Platform: Pterodactyl / Koyeb\n` +
    `Compatibility: Node.js 20-22\n\n` +
    `STATISTIK BOT\n` +
    `Total plugin: ${total}\n` +
    `Total kategori: ${categories}\n` +
    `Total command: 3300+\n` +
    `RPG modules: 112\n` +
    `AI models: 34 (OpenAI, Gemini, Anthropic)\n\n` +
    `FITUR UTAMA\n\n` +
    `1. Jadibot (Multi Device)\n` +
    `   Pairing Code & QR, akses 3-mode\n` +
    `   (all/premium/specific users)\n\n` +
    `2. AI Integration (Tio AI)\n` +
    `   34 model, 3 format API\n` +
    `   AI grup participation (aigrup)\n\n` +
    `3. RPG System\n` +
    `   112 modul: adventure, hunting,\n` +
    `   mining, economy, inventory, leveling\n\n` +
    `4. Sistem Sewa Bot\n` +
    `   Pendaftaran step-by-step\n` +
    `   (nama, umur, asal, grup, durasi)\n` +
    `   Auto-join, auto-expired, notifikasi\n\n` +
    `5. Moderasi Grup\n` +
    `   Anti-18+, Anti-Judi, Anti-Bucin,\n` +
    `   Anti-Kasar, Anti-Keributan\n` +
    `   3x warn system, auto-kick\n\n` +
    `6. Saluran WA Broadcast\n` +
    `   Notifikasi otomatis ke saluran resmi\n` +
    `   (daftarsewa, jadibot, ban, block, sewa)\n\n` +
    `7. Auto Features (Default OFF)\n` +
    `   Adzan 3-layer (reminder, adzan, iqamah)\n` +
    `   Weather 4-cycle broadcast\n` +
    `   Auto-loker 4 source\n` +
    `   Auto-typing, auto-read\n\n` +
    `8. Group Protection\n` +
    `   Antilink, antibot, antilink WA\n` +
    `   Welcome/goodbye 5 variasi random\n\n` +
    `9. Media & Tools\n` +
    `   Download, convert, sticker\n` +
    `   Canvas, ephoto, search\n` +
    `   Stalker, primbon, religi\n\n` +
    `10. Games & Fun\n` +
    `    Trivia, math, tebak gambar\n` +
    `    Dan 50+ game lainnya\n\n` +
    `FITUR BARU DI VERSI 20.0.0

+ Sistem Sewa Bot Step-by-Step
  Daftar sewa dengan data diri lengkap
  (nama, umur, asal, link grup, durasi)
  Auto-join grup, auto-expired, notifikasi

+ Saluran WA Broadcast Terpusat
  8 event broadcast ke saluran resmi
  (daftarsewa, approve, reject, expired,
  jadibot, ban, block, kick)
  Command .setsaluran untuk konfigurasi

+ Plugin About Nova (.aboutnova)
  Info creator, script, statistik, fitur

+ Sistem Moderasi Grup (5 plugin)
  Anti-18+, Anti-Judi, Anti-Bucin,
  Anti-Kasar, Anti-Keributan
  3x warn system, auto-kick, default off

+ Tio AI Integration (AIO)
  34 model, 3 format API
  (OpenAI, Gemini, Anthropic)
  AI grup participation (.aigrup)

+ Adzan 3-Layer Notification
  Reminder 15 menit, adzan + audio, iqamah
  Audio via Vocaroo, default off

+ Weather 4-Cycle Auto-Broadcast
  Pagi, siang, sore, malam
  Data realtime Open-Meteo, default off

+ Auto-Loker 4 Source
  Remotive, Arbeitnow, The Muse, Jobicy
  Thumbnail + logo perusahaan, default off

+ Jadibot 3-Mode Access Control
  All users / Premium only / Specific

+ 6 Variasi Welcome & Goodbye
  Random template, box-style Clara-MD

+ RPG System (112 modul)
  Adventure, hunting, mining, economy,
  inventory, leveling, dan lainnya

+ Group Protection
  Antilink, antibot, antilink WA
  Welcome/goodbye 5 variasi random

+ 1000+ Plugin, 3300+ Command
  34 kategori, Node.js 20-22 compatible

SPECIAL THANKS\n` +
    `Kepada semua user Nova AI\n` +
    `yang sudah support dan menggunakan bot ini\n\n` +
    `Ketik .menu untuk lihat semua command\n` +
    `Ketik .owner untuk kontak owner\n` +
    `Ketik .donasi untuk support developer`

  const _lines = text.split("\n").filter(l => l.trim());
  await m.reply(claraWrap("aboutnova", claraWrap(_lines)))
}

export { pluginConfig as config, handler }
