// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { claraWrap } from "../../src/lib/nova-menu-style.js";
import { AIRich } from "../../src/lib/nova-builder.js"
import { performance } from "perf_hooks"
import os from "os"
import { getAssetBuffer } from "../../src/lib/nova-asset-manager.js"
import config from "../../config.js"
import te from "../../src/lib/nova-error.js"
import { ImageUploadService } from "node-upload-images"
import fs from "node-webpmux/io.js"
import fss from "fs"

const pluginConfig = {
  name: "ping",
  alias: ["ping"],
  category: "main",
  description: "Cek performa dan status sistem bot secara real-time",
  usage: ".ping",
  example: ".ping",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 5,
  energi: 0,
  isEnabled: true,
}

const fmtUp = (s) => {
  s = Number(s)
  const d = Math.floor(s / 86400),
    h = Math.floor((s % 86400) / 3600),
    m = Math.floor((s % 3600) / 60),
    sc = Math.floor(s % 60)
  if (d > 0) return `${d}d ${h}h ${m}m`
  if (h > 0) return `${h}h ${m}m ${sc}s`
  return `${m}m ${sc}s`
}

const fmtSize = (b) => {
  if (!b || b === 0) return "0 B"
  const u = ["B", "KB", "MB", "GB", "TB"]
  const i = Math.floor(Math.log(b) / Math.log(1024))
  return (b / Math.pow(1024, i)).toFixed(2) + " " + u[i]
}

async function handler(m, { sock }) {
  try {
    const tStart = performance.now()

    const botName = config.bot?.name || "Nova-AI"

    // CPU Info
    const cpus = os.cpus()
    const cpuModel = cpus[0]?.model || "Unknown CPU"
    const cpuSpeed = cpus[0]?.speed || 0
    const cpuCores = cpus.length

    // Memory Info
    const totalMem = os.totalmem()
    const freeMem = os.freemem()
    const usedMem = totalMem - freeMem
    const memPct = ((usedMem / totalMem) * 100).toFixed(1)

    // Node Info
    const memoryUsage = process.memoryUsage()

    // Uptime
    const uptimeBot = fmtUp(process.uptime())
    const uptimeOS = fmtUp(os.uptime())

    // OS Load
    const loadAvg = os.loadavg()
    const load1m = loadAvg[0].toFixed(2)
    const load5m = loadAvg[1].toFixed(2)
    const load15m = loadAvg[2].toFixed(2)

    const builder = new AIRich(sock)

    const uploader = new ImageUploadService("pixhost.to")
    const uploadResult = await uploader.uploadFromBinary(fss.readFileSync(config.assets["nova2"]), "image.jpg")

    builder.addProduct({
      title: "Ping",
      brand: config.bot.name,
      price: 'Informasi tentang spesifikasi sistem',
      sale_price: '',
      product_url: config.info.website,
      icon_url: "https://static.nike.com/a/images/t_PDP_1280_v1/f_auto,q_auto:eco/additional_image_1.png",
      image_url: uploadResult.directLink
    })

    const tEnd = performance.now()
    const execTime = (tEnd - tStart).toFixed(2)

    const serverDetails =
      `🏓 *ᴘᴏɴɢ!* (${execTime}ms)\n\n` +
      `Berikut adalah detail spesifikasi dan performa server secara lengkap:\n\n` +

      `🖥️ *ɪɴꜰᴏʀᴍᴀꜱɪ ꜱɪꜱᴛᴇᴍ*\n` +
      `*OS:* ${os.type()} (${os.release()})\n` +
      `*ᴘʟᴀᴛꜰᴏʀᴍ:* ${os.platform()} (${os.arch()})\n` +
      `*ʜᴏꜱᴛɴᴀᴍᴇ:* ${os.hostname()}\n` +
      `*ɴᴏᴅᴇᴊꜱ:* ${process.version}\n` +
      `*Engine V8:* ${process.versions.v8}\n\n` +

      `💻 *ɪɴꜰᴏʀᴍᴀꜱɪ ᴄᴘᴜ*\n` +
      `*ᴍᴏᴅᴇʟ:* ${cpuModel.trim()}\n` +
      `*ᴄᴏʀᴇꜱ:* ${cpuCores} Core(s)\n` +
      `*ꜱᴘᴇᴇᴅ:* ${cpuSpeed} MHz\n` +
      `*ʟᴏᴀᴅ ᴀᴠɢ:* ${load1m} (1m), ${load5m} (5m), ${load15m} (15m)\n\n` +

      `🧠 *ᴄᴀʀᴀ ᴘᴀᴋᴀɪ ᴍᴇᴍᴏʀɪ*\n` +
      `*ᴛᴏᴛᴀʟ ʀᴀᴍ:* ${fmtSize(totalMem)}\n` +
      `*ᴅɪᴘᴀᴋᴀɪ:* ${fmtSize(usedMem)} (${memPct}%)\n` +
      `*ꜱɪꜱᴀ ʙᴇʙᴀꜱ:* ${fmtSize(freeMem)}\n\n` +

      `📦 *ᴍᴇᴍᴏʀɪ ɴᴏᴅᴇᴊꜱ*\n` +
      `*ʀꜱꜱ:* ${fmtSize(memoryUsage.rss)}\n` +
      `*ʜᴇᴀᴘ ᴛᴏᴛᴀʟ:* ${fmtSize(memoryUsage.heapTotal)}\n` +
      `*ʜᴇᴀᴘ ᴜꜱᴇᴅ:* ${fmtSize(memoryUsage.heapUsed)}\n` +
      `*ᴇxᴛᴇʀɴᴀʟ:* ${fmtSize(memoryUsage.external)}\n\n` +

      `⏱️ *WAKTU AKTIF (UPTIME)*\n` +
      `*ᴜᴘᴛɪᴍᴇ ꜱᴇʀᴠᴇʀ:* ${uptimeOS}\n` +
      `*ᴜᴘᴛɪᴍᴇ ʙᴏᴛ:* ${uptimeBot}\n\n` +

      `Sistem berjalan stabil dan menyelesaikan kalkulasi dalam waktu eksekusi *${execTime}ms*.`

    builder.addText(serverDetails)

    await builder.send(m.chat, { quoted: m })
  } catch (error) {
    console.log(error)
    m.reply(claraWrap("ping", te(m.prefix, m.command, m.pushName), "error"))}
}

export { pluginConfig as config, handler }
