// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import fs from "fs"
import path from "path"
import axios from "axios"
import { getDatabase } from "../../src/lib/nova-database.js"
import config from "../../config.js"
import { sendReplyWithNav } from "../../src/lib/nova-nav-buttons.js"
import {
  getCachedJid,
  isLid,
  isLidConverted,
  lidToJid,
} from "../../src/lib/nova-lid.js"

const pluginConfig = {
  name: "daftarotomatis",
  alias: ["daftarcaptcha", "daftarauto", "autodaftar"],
  category: "user",
  description: "Daftar otomatis dengan verifikasi captcha (API online / canvas lokal)",
  usage: ".daftarotomatis",
  example: ".daftarotomatis",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 10,
  energi: 0,
  isEnabled: true,
  skipRegistration: true,
}

if (!global.captchaSessions) global.captchaSessions = {}

const CAPTCHA_TTL = 180000
const MAX_ATTEMPTS = 3
const DEFAULT_REWARDS = { koin: 30000, energi: 300, exp: 300000 }

// Random bonus untuk first-time registration
function generateRandomBonus() {
  return {
    koin: Math.floor(Math.random() * 4) * 10000 + 10000,
    energi: Math.floor(Math.random() * 4) * 50 + 50,
    exp: Math.floor(Math.random() * 4) * 100000 + 100000,
  };
}
const CAPTCHA_API_TIMEOUT = 8000

// Daftar API captcha online (dicoba berurutan)
const CAPTCHA_APIS = [
  {
    name: "no-api",
    url: "https://api.no-api.com/captcha",
    type: "image",
    parseResponse: null
  },
  {
    name: "no-api-json",
    url: "https://api.no-api.com/captcha?format=json",
    type: "json",
    parseResponse: function(data) {
      if (data && data.image && data.code) {
        return { imageUrl: data.image, answer: String(data.code).toLowerCase() }
      }
      return null
    }
  },
  {
    name: "textcaptcha",
    url: "https://textcaptcha.com/api.json",
    type: "json-text",
    parseResponse: function(data) {
      if (data && data.question && data.answer) {
        return { textCaptcha: data.question, answer: String(data.answer).toLowerCase() }
      }
      return null
    }
  }
]

function getRegistrationContextInfo() {
  const saluranId = config.saluran?.id || "120363400911374213@newsletter"
  const saluranName = config.saluran?.name || config.bot?.name || "Nova-AI"
  return {
    forwardingScore: 9999,
    isForwarded: true,
    forwardedNewsletterMessageInfo: {
      newsletterJid: saluranId,
      newsletterName: saluranName,
      serverMessageId: 128,
    },
  }
}

function getRewards() {
  return config.registration?.rewards || DEFAULT_REWARDS
}

function getSessionKey(jid) {
  let normalized = String(jid || "").trim()
  if (!normalized) return ""
  if (isLid(normalized) || isLidConverted(normalized)) {
    normalized = getCachedJid(normalized) || lidToJid(normalized) || normalized
  }
  return normalized.replace(/[^0-9]/g, "") || normalized.toLowerCase()
}

// === LAYER 1: Online API Captcha ===
async function fetchOnlineCaptcha() {
  for (const api of CAPTCHA_APIS) {
    try {
      const response = await axios.get(api.url, {
        timeout: CAPTCHA_API_TIMEOUT,
        responseType: api.type === "image" ? "arraybuffer" : "json",
        maxRedirects: 5,
        headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" }
      })

      if (response.status !== 200) continue

      if (api.type === "image" && response.data) {
        // API returns raw image - generate our own code since we don't know the answer
        // This won't work for verification, skip image-only APIs without answer
        continue
      }

      if (api.type === "json" && api.parseResponse) {
        const parsed = api.parseResponse(response.data)
        if (parsed && parsed.imageUrl && parsed.answer) {
          // Download the captcha image
          const imgRes = await axios.get(parsed.imageUrl, {
            timeout: CAPTCHA_API_TIMEOUT,
            responseType: "arraybuffer"
          })
          if (imgRes.status === 200 && imgRes.data) {
            return {
              type: "image",
              imageBuffer: Buffer.from(imgRes.data),
              answer: parsed.answer,
              source: api.name
            }
        }
      }
      }

      if (api.type === "json-text" && api.parseResponse) {
        const parsed = api.parseResponse(response.data)
        if (parsed && parsed.textCaptcha && parsed.answer) {
          return {
            type: "text-api",
            textCaptcha: parsed.textCaptcha,
            answer: parsed.answer,
            source: api.name
          }
        }
      }
    } catch (e) {
      console.log("[Captcha] API " + api.name + " failed: " + e.message)
      continue
    }
  }

  return null
}

// === LAYER 2: Local Canvas Captcha ===
async function generateCanvasCaptcha() {
  try {
    const { createCanvas } = await import("@napi-rs/canvas")

    const width = 300
    const height = 100
    const canvas = createCanvas(width, height)
    const ctx = canvas.getContext("2d")

    // Background
    const bgColors = ["#f0f0f0", "#e8e8e8", "#f5f5dc", "#e0e0e0", "#d0d0d0"]
    ctx.fillStyle = bgColors[Math.floor(Math.random() * bgColors.length)]
    ctx.fillRect(0, 0, width, height)

    // Noise lines
    const lineColors = ["#aaa", "#bbb", "#999", "#ccc", "#888"]
    for (var i = 0; i < 8; i++) {
      ctx.strokeStyle = lineColors[Math.floor(Math.random() * lineColors.length)]
      ctx.lineWidth = Math.random() * 2 + 0.5
      ctx.beginPath()
      ctx.moveTo(Math.random() * width, Math.random() * height)
      ctx.lineTo(Math.random() * width, Math.random() * height)
      ctx.stroke()
    }

    // Noise dots
    for (var d = 0; d < 60; d++) {
      ctx.fillStyle = "rgba(" + Math.floor(Math.random()*150) + "," + Math.floor(Math.random()*150) + "," + Math.floor(Math.random()*150) + ",0.5)"
      ctx.beginPath()
      ctx.arc(Math.random() * width, Math.random() * height, Math.random() * 2, 0, Math.PI * 2)
      ctx.fill()
    }

    // Generate random text
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
    let code = ""
    const textColors = ["#d32f2f", "#1976d2", "#388e3c", "#7b1fa2", "#e64a19", "#0097a7"]
    const fontSize = 36

    for (var c = 0; c < 5; c++) {
      var char = chars[Math.floor(Math.random() * chars.length)]
      code += char

      var x = 40 + c * 48 + Math.random() * 10
      var y = 60 + Math.random() * 15
      var angle = (Math.random() - 0.5) * 0.8

      ctx.save()
      ctx.translate(x, y)
      ctx.rotate(angle)
      ctx.font = "bold " + fontSize + "px Arial"
      ctx.fillStyle = textColors[Math.floor(Math.random() * textColors.length)]
      ctx.fillText(char, 0, 0)
      ctx.restore()
    }

    // Extra noise over text
    for (var n = 0; n < 4; n++) {
      ctx.strokeStyle = "rgba(" + Math.floor(Math.random()*100) + "," + Math.floor(Math.random()*100) + "," + Math.floor(Math.random()*100) + ",0.3)"
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.arc(Math.random() * width, Math.random() * height, Math.random() * 30 + 10, 0, Math.PI * 2)
      ctx.stroke()
    }

    const buffer = canvas.toBuffer("image/png")

    return {
      type: "image",
      imageBuffer: buffer,
      answer: code.toLowerCase(),
      source: "canvas-local"
    }
  } catch (e) {
    console.error("[Captcha] Canvas error:", e.message)
    return null
  }
}

// === LAYER 3: Math Captcha (last resort) ===
function generateMathCaptcha() {
  var ops = ["+", "-", "x"]
  var op = ops[Math.floor(Math.random() * ops.length)]
  var a, b, answer

  if (op === "+") {
    a = Math.floor(Math.random() * 20) + 1
    b = Math.floor(Math.random() * 20) + 1
    answer = a + b
  } else if (op === "-") {
    a = Math.floor(Math.random() * 20) + 10
    b = Math.floor(Math.random() * (a - 1)) + 1
    answer = a - b
  } else {
    a = Math.floor(Math.random() * 9) + 2
    b = Math.floor(Math.random() * 9) + 2
    answer = a * b
  }

  return {
    type: "math",
    display: a + " " + (op === "x" ? "x" : op) + " " + b,
    question: "Berapa hasil dari " + a + " " + (op === "x" ? "x" : op) + " " + b + " ?",
    answer: String(answer),
    source: "math-local"
  }
}

// === Main captcha generator: API -> Canvas -> Math ===
async function generateCaptcha() {
  // Layer 1: Try online API
  console.log("[Captcha] Trying online API...")
  var online = await fetchOnlineCaptcha()
  if (online) {
    console.log("[Captcha] Using online API: " + online.source)
    return online
  }

  // Layer 2: Try local canvas
  console.log("[Captcha] API failed, trying canvas...")
  var canvas = await generateCanvasCaptcha()
  if (canvas) {
    console.log("[Captcha] Using canvas local")
    return canvas
  }

  // Layer 3: Math fallback
  console.log("[Captcha] Canvas failed, using math")
  return generateMathCaptcha()
}

function createCaptchaSession(jid, chatJid, name, age, gender) {
  var key = getSessionKey(jid)
  if (global.captchaSessions[key]?.timeout) {
    clearTimeout(global.captchaSessions[key].timeout)
  }

  var session = {
    step: "captcha",
    name: name || null,
    age: age || null,
    gender: gender || null,
    chatJid: chatJid,
    captcha: null,
    attempts: 0,
    promptId: null,
    startedAt: Date.now(),
    timeout: setTimeout(function() {
      if (global.captchaSessions[key]) delete global.captchaSessions[key]
    }, CAPTCHA_TTL),
  }

  global.captchaSessions[key] = session
  return session
}

function getCaptchaSession(jid) {
  var key = getSessionKey(jid)
  var session = global.captchaSessions[key]
  if (!session) return null
  if (Date.now() - session.startedAt > CAPTCHA_TTL) {
    if (session.timeout) clearTimeout(session.timeout)
    delete global.captchaSessions[key]
    return null
  }
  return session
}

function clearCaptchaSession(jid) {
  var key = getSessionKey(jid)
  var session = global.captchaSessions[key]
  if (session?.timeout) clearTimeout(session.timeout)
  delete global.captchaSessions[key]
}

function buildUserDataBlock(name, age, gender) {
  return (
    "╔┈┈「 \U0001F4CB DATA 」\n" +
    "╜┈❏ Nama: *" + (name || "-") + "*\n" +
    "╜┈❏ Umur: *" + (age ? age + " tahun" : "-") + "*\n" +
    "╜┈❏ Gender: *" + (gender || "-") + "*\n" +
    "╚┈┈❖"
  )
}

function buildSuccessRewardBlock(alreadyClaimed, randomBonus) {
  var rewards = getRewards()
  if (alreadyClaimed) {
    return "╭┈┈「 \U0001F381 BONUS 」\n╜┈❏ Bonus daftar sudah pernah diklaim\n╜┈❏ Tidak ada reward tambahan\n╚┈┈❕"
  }
  var msg =
    "╭┈┈「 \U0001F381 REWARDS 」\n" +
    "╜┈❏ \U0001F4B0 +" + rewards.koin.toLocaleString("id-ID") + " Koin\n" +
    "╜┈❏ ⚡ +" + rewards.energi + " Energi\n" +
    "╜┈❏ ⭐ +" + rewards.exp.toLocaleString("id-ID") + " EXP\n" +
    "╚┈┈❕"
  if (randomBonus) {
    msg +=
      "\n╭┈┈「 \U0001F3B2 RANDOM BONUS 」\n" +
      "╜┈❏ \U0001F4B0 +" + randomBonus.koin.toLocaleString("id-ID") + " Koin\n" +
      "╜┈❏ ⚡ +" + randomBonus.energi + " Energi\n" +
      "╜┈❏ ⭐ +" + randomBonus.exp.toLocaleString("id-ID") + " EXP\n" +
      "╚┈┈❕"
  }
  return msg
}

async function handler(m, { sock }) {
  var db = getDatabase()
  var user = db.getUser(m.sender)

  if (user?.isRegistered) {
    return m.reply(
      "✅ Kamu sudah terdaftar!\n\n" +
      buildUserDataBlock(user.regName, user.regAge, user.regGender, user.regSerial) +
      "\n\n> Untuk unregister: `" + m.prefix + "unreg`"
    )
  }

  if (m.isGroup) {
    return m.reply(
      "╔┈┈「 \U0001F916 DAFTAR OTOMATIS 」\n" +
      "╜┈❏ Verifikasi captcha dilakukan via DM (private chat)\n\n" +
      "╜┈❏ *Langkah:*\n" +
      "╜┈ > 1. Chat langsung ke nomor bot\n" +
      "╜┈ > 2. Ketik `" + m.prefix + "daftarotomatis`\n" +
      "╜┈ > 3. Jawab captcha yang dikirim bot\n" +
      "╜┈ > 4. Isi data diri (nama, umur, gender)\n\n" +
      "╚┈┈❖"
    )
  }

  if (getCaptchaSession(m.sender)) {
    return m.reply(
      "\U0001F4DD Masih ada sesi captcha aktif!\n\n" +
      "> Reply pesan captcha bot untuk menjawab\n" +
      "> Atau ketik: `" + m.prefix + "bataldaftar` untuk batal"
    )
  }

  // Parse optional quick args
  var text = m.text ? m.text.trim() : ""
  var presetName = null, presetAge = null, presetGender = null

  if (text && text.includes(",")) {
    var parts = text.split(",").map(function(s) { return s.trim() })
    if (parts[0] && parts[0].length >= 2) presetName = parts[0]
    if (parts[1] && /^\d+$/.test(parts[1])) {
      var a = Number(parts[1])
      if (a >= 1 && a <= 100) presetAge = a
    }
    if (parts[2]) {
      var g = parts[2].toLowerCase()
      if (/^(laki[-\s]?laki|cowok?|cowo|l|male|pria)$/.test(g)) presetGender = "Laki-laki"
      else if (/^(perempuan|cewek?|cewe|p|female|wanita)$/.test(g)) presetGender = "Perempuan"
    }
  }

  await m.react("🕐")

  // Generate captcha (API -> Canvas -> Math)
  var captcha = await generateCaptcha()

  var session = createCaptchaSession(m.sender, m.chat, presetName, presetAge, presetGender)
  session.captcha = captcha

  var sourceLabel = {
    "canvas-local": "Canvas Lokal",
    "math-local": "Math Lokal"
  }
  var sourceName = sourceLabel[captcha.source] || captcha.source

  // Send captcha based on type
  if (captcha.type === "image" && captcha.imageBuffer) {
    // Image captcha (API or Canvas)
    var caption = "╔┈┈「 \U0001F512 CAPTCHA VERIFICATION 」\n\n"
    caption += "╜┈❏ Jawab captcha pada gambar di atas\n\n"
    caption += "╜┈❏ *Reply gambar ini dengan jawaban kamu*\n"
    caption += "╜┈❏ Waktu: 3 menit\n"
    caption += "╜┈❏ Maksimal salah: " + MAX_ATTEMPTS + "x\n"
    caption += "╜┈❏ Batal: reply `batal`\n"
    caption += "╜┈┈ Source: " + sourceName + "\n"
    caption += "╚┈┈❖"

    var sent = await sock.sendMessage(m.chat, {
      image: captcha.imageBuffer,
      caption: caption,
      contextInfo: getRegistrationContextInfo(),
    }, { quoted: m })

    session.promptId = sent?.key?.id || null
  } else if (captcha.type === "text-api") {
    // Text captcha from API
    var msg = "╔┈┈「 \U0001F512 CAPTCHA VERIFICATION 」\n\n"
    msg += "╜┈❏ " + captcha.textCaptcha + "\n\n"
    msg += "╜┈❏ *Reply pesan ini dengan jawaban kamu*\n"
    msg += "╜┈❏ Waktu: 3 menit\n"
    msg += "╜┈❏ Maksimal salah: " + MAX_ATTEMPTS + "x\n"
    msg += "╜┈❏ Batal: reply `batal`\n"
    msg += "╜┈┈ Source: " + sourceName + "\n"
    msg += "╚┈┈❖"

    var sent = await sock.sendMessage(m.chat, {
      text: msg,
      contextInfo: getRegistrationContextInfo(),
    }, { quoted: m })

    session.promptId = sent?.key?.id || null
  } else {
    // Math captcha (last resort)
    var msg2 = "╔┈┈「 \U0001F512 CAPTCHA VERIFICATION 」\n\n"
    msg2 += "╜┈❏ Jawab pertanyaan berikut:\n\n"
    msg2 += "╜┈❏ *" + captcha.display + "*\n\n"
    msg2 += "╜┈❏ " + captcha.question + "\n\n"
    msg2 += "╜┈❏ *Reply pesan ini dengan jawaban kamu*\n"
    msg2 += "╜┈❏ Waktu: 3 menit\n"
    msg2 += "╜┈❏ Maksimal salah: " + MAX_ATTEMPTS + "x\n"
    msg2 += "╜┈❏ Batal: reply `batal`\n"
    msg2 += "╜┈┈ Source: " + sourceName + "\n"
    msg2 += "╚┈┈❖"

    var sent = await sock.sendMessage(m.chat, {
      text: msg2,
      contextInfo: getRegistrationContextInfo(),
    }, { quoted: m })

    session.promptId = sent?.key?.id || null
  }

}

async function captchaAnswerHandler(m, sock) {
  if (!m.body) return false
  if (m.isCommand) {
    var cmd = String(m.command || "").toLowerCase()
    if (["daftarotomatis", "daftarcaptcha", "daftarauto", "autodaftar", "bataldaftar"].includes(cmd)) return false
  }

  var session = getCaptchaSession(m.sender)
  if (!session) return false
  if (m.chat !== session.chatJid) return false

  var text = m.body.trim()
  var lowText = text.toLowerCase()

  // Cancel
  if (["batal", "cancel", "batalkan"].includes(lowText)) {
    clearCaptchaSession(m.sender)
    await m.reply("❌ Pendaftaran dibatalkan.\n\n> Mulai lagi dengan: `" + m.prefix + "daftarotomatis`")
    return true
  }

  // Step 1: Verify captcha
  if (session.step === "captcha") {
    var userAnswer = text.trim().toLowerCase()
    var correctAnswer = session.captcha.answer.toLowerCase()

    if (userAnswer !== correctAnswer) {
      session.attempts++

      if (session.attempts >= MAX_ATTEMPTS) {
        clearCaptchaSession(m.sender)
        await m.reply(
          "❌ *Captcha salah " + MAX_ATTEMPTS + "x!*\n\n" +
          "> Sesi dibatalkan.\n> Coba lagi: `" + m.prefix + "daftarotomatis`"
        )
        return true
      }

      var remaining = MAX_ATTEMPTS - session.attempts
      await m.reply("❌ *Jawaban salah!*\n\n> Sisa percobaan: " + remaining + "x\n> Reply pesan captcha untuk mencoba lagi")
      return true
    }

    // Captcha correct! Check preset data
    if (session.name && session.age) {
      var db = getDatabase()
      var currentUser = db.getUser(m.sender) || {}
      var rewards = getRewards()
      var alreadyClaimed = Boolean(currentUser.hasClaimedRegisterReward)
      var now = new Date().toISOString()
      var regCount = Number(currentUser.registrationCount || 0) + 1
      var serial = currentUser.regSerial || generateSerialNumber()

      db.setUser(m.sender, {
        isRegistered: true,
        regName: session.name,
        regAge: session.age,
        regGender: session.gender || "Tidak disebutkan",
        regSerial: serial,
        registeredAt: currentUser.registeredAt || now,
        lastRegisteredAt: now,
        registrationCount: regCount,
        hasClaimedRegisterReward: true,
        unregisteredAt: null,
      })

      var randomBonus = null
      if (!alreadyClaimed) {
        randomBonus = generateRandomBonus()
        db.updateKoin(m.sender, rewards.koin + randomBonus.koin)
        db.updateEnergi(m.sender, rewards.energi + randomBonus.energi)
        db.updateExp(m.sender, rewards.exp + randomBonus.exp)
      }
      await db.save()
      clearCaptchaSession(m.sender)

      await sock.sendMessage(m.chat, {
        text: "\U0001F389 *Pendaftaran Berhasil!*\n\nSelamat datang, *" + session.name + "*!\n\n" +
          buildUserDataBlock(session.name, session.age, session.gender || "Tidak disebutkan", serial) +
          "\n\n" + buildSuccessRewardBlock(alreadyClaimed, randomBonus) + "\n\n\U0001F680 Sekarang kamu sudah siap menggunakan bot!",
        contextInfo: getRegistrationContextInfo(),
      }, { quoted: m })
      return true
    }

    // Ask for name
    session.step = "name"
    await sock.sendMessage(m.chat, {
      text: "✅ *Captcha benar!*\n\n╔┈┈「 \U0001F4DD LANJUTKAN 」\n╜┈❏ *Pertanyaan 1/3*\n╜┈❏ Siapa nama kamu?\n\n╜┈❏ Reply pesan ini dengan nama kamu\n╜┈❏ Batal: reply `batal`\n╚┈┈❖",
      contextInfo: getRegistrationContextInfo(),
    }, { quoted: m })
    return true
  }

  // Step: Name
  if (session.step === "name") {
    var name = String(text || "").replace(/\s+/g, " ").trim()
    if (name.length < 2 || name.length > 30) {
      await m.reply(claraWrap("daftarotomatis", "❌ Nama harus 2-30 karakter!"))
      return true
    }
    session.name = name
    session.step = "age"
    await sock.sendMessage(m.chat, {
      text: "╔┈┈「 \U0001F4DD LANJUTKAN 」\n╜┈❏ Halo *" + name + "* ✋\n\n╜┈❏ *Pertanyaan 2/3*\n╜┈❏ Berapa umurmu?\n\n╜┈❏ Umur: 1-100 tahun\n╜┈❏ Reply dengan angka\n╚┈┈❖",
      contextInfo: getRegistrationContextInfo(),
    }, { quoted: m })
    return true
  }

  // Step: Age
  if (session.step === "age") {
    var age = Number(text)
    if (!/^\d+$/.test(text) || Number.isNaN(age) || age < 1 || age > 100) {
      await m.reply(claraWrap("daftarotomatis", "❌ Umur tidak valid! Masukkan angka 1-100."))
      return true
    }
    session.age = age
    session.step = "gender"
    await sock.sendMessage(m.chat, {
      text: "╔┈┈「 \U0001F4DD LANJUTKAN 」\n╜┈❏ *Pertanyaan 3/3*\n╜┈❏ Kamu cowo atau cewe?\n\n╜┈❏ *Cowo / Cowok / Laki-laki / L*\n╜┈❏ *Cewe / Cewek / Perempuan / P*\n\n╜┈❏ Reply pesan ini dengan jawabanmu\n╚┈┈❖",
      contextInfo: getRegistrationContextInfo(),
    }, { quoted: m })
    return true
  }

  // Step: Gender -> Complete
  if (session.step === "gender") {
    var gender = null
    var low = text.toLowerCase().trim()
    if (/^(laki[-\s]?laki|cowok?|cowo|l|male|pria)$/.test(low)) gender = "Laki-laki"
    else if (/^(perempuan|cewek?|cewe|p|female|wanita)$/.test(low)) gender = "Perempuan"

    if (!gender) {
      await m.reply(claraWrap("daftarotomatis", "❌ Gender tidak valid!\n\n> *Cowo / Cowok / Laki-laki / L*\n> *Cewe / Cewek / Perempuan / P*"))
      return true
    }

    var db = getDatabase()
    var currentUser = db.getUser(m.sender) || {}
    var rewards = getRewards()
    var alreadyClaimed = Boolean(currentUser.hasClaimedRegisterReward)
    var now = new Date().toISOString()
    var regCount = Number(currentUser.registrationCount || 0) + 1
    var serial = currentUser.regSerial || generateSerialNumber()

    db.setUser(m.sender, {
      isRegistered: true,
      regName: session.name,
      regAge: session.age,
      regGender: gender,
      regSerial: serial,
      registeredAt: currentUser.registeredAt || now,
      lastRegisteredAt: now,
      registrationCount: regCount,
      hasClaimedRegisterReward: true,
      unregisteredAt: null,
    })

    var randomBonus = null
    if (!alreadyClaimed) {
      randomBonus = generateRandomBonus()
      db.updateKoin(m.sender, rewards.koin + randomBonus.koin)
      db.updateEnergi(m.sender, rewards.energi + randomBonus.energi)
      db.updateExp(m.sender, rewards.exp + randomBonus.exp)
    }
    await db.save()
    clearCaptchaSession(m.sender)

    await sock.sendMessage(m.chat, {
      text: "\U0001F389 *Pendaftaran Berhasil!*\n\nSelamat datang, *" + session.name + "*!\n\n" +
        buildUserDataBlock(session.name, session.age, gender, serial) +
        "\n\n" + buildSuccessRewardBlock(alreadyClaimed, randomBonus) + "\n\n\U0001F680 Sekarang kamu sudah siap menggunakan bot!",
      contextInfo: getRegistrationContextInfo(),
    }, { quoted: m })
    return true
  }

  return false
}

export { pluginConfig as config, handler, captchaAnswerHandler, clearCaptchaSession }
