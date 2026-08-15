// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { sendReplyWithNav } from "../../src/lib/nova-nav-buttons.js";
import { claraWrap } from "../../src/lib/nova-menu-style.js";
import config from '../../config.js'
import { getDatabase } from '../../src/lib/nova-database.js'

const pluginConfig = {
  name: 'payment',
  alias: ['pay', 'qris'],
  category: 'owner',
  description: 'Menampilkan info payment',
  usage: '.payment',
  isOwner: true,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 5,
  energi: 0,
  isEnabled: true
}

function getPaymentData() {
  const db = getDatabase()
  const stored = db.setting('tokoPayment')
  if (stored) return stored
  return config.payment || {}
}

function buildPaymentText(paymentCfg, customText, botName, ownerName) {
  const methods = (paymentCfg.methods || []).filter(m => m.number)
  const banks = (paymentCfg.banks || []).filter(b => b.number)
  const cash = paymentCfg.cash || { enabled: false, info: '' }

  if (customText) {
    return customText
      .replace(/\{botname\}/gi, botName)
      .replace(/\{owner\}/gi, ownerName)
      .replace(/\{cash\}/gi, cash.enabled ? (cash.info || 'Tersedia') : 'Tidak tersedia')
      .replace(/\{methods\}/gi, methods.map(m => `${m.name}: ${m.number} (${m.holder || m.name})`).join('\n'))
      .replace(/\{banks\}/gi, banks.map(b => `${b.name}: ${b.number} (${b.holder || b.name})`).join('\n'))
      .replace(/\{qris\}/gi, paymentCfg.qrisUrl ? 'Tersedia' : 'Belum diatur')
  }

  let text = `*P A Y M E N T*\n`
  text += `━━━━━━━━━━━━━━━━━━\n\n`

  if (cash.enabled) {
    text += `*Cash / COD:*\n`
    text += `${cash.info || 'Tersedia'}\n\n`
  }

  if (methods.length > 0) {
    text += `*E-Wallet:*\n`
    for (const m of methods) {
      text += `${m.name}: ${m.number}\n`
      if (m.holder) text += `a/n: ${m.holder}\n`
    }
    text += `\n`
  }

  if (banks.length > 0) {
    text += `*Bank Transfer:*\n`
    for (const b of banks) {
      text += `${b.name}: ${b.number}\n`
      if (b.holder) text += `a/n: ${b.holder}\n`
    }
    text += `\n`
  }

  if (paymentCfg.qrisUrl) {
    text += `*QRIS:* Tersedia (lihat gambar)\n\n`
  }

  text += `━━━━━━━━━━━━━━━━━━\n`
  text += `${botName}`

  return text
}

async function handler(m, { sock }) {
  const db = getDatabase()
  const paymentCfg = getPaymentData()
  const customText = db.setting('customPaymentText') || paymentCfg.customText || ''
  const botName = config.bot?.name || 'Bot'
  const ownerName = config.owner?.name || 'Owner'

  const text = buildPaymentText(paymentCfg, customText, botName, ownerName)

  if (paymentCfg.qrisUrl) {
    try {
      await sock.sendMessage(m.chat, {
        image: { url: paymentCfg.qrisUrl },
        caption: text
      }, { quoted: m })
      return
    } catch {}
  }

  await m.reply(claraWrap("payment", text))
}

export { pluginConfig as config, handler }
