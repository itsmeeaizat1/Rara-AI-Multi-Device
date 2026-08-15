// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { sendReplyWithNav } from "../../src/lib/nova-nav-buttons.js";
import { getDatabase } from '../../src/lib/nova-database.js'
import { claraWrap, claraLine } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "custompayment",
  alias: ["custompayment", "setpay2", "paymentcustom"],
  category: 'owner',
  description: 'Atur teks custom untuk .payment dengan placeholder',
  usage: '.custompayment <teks> / .custompayment reset',
  isOwner: true,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 5,
  energi: 0,
  isEnabled: true
}

async function handler(m, { sock }) {
  const db = getDatabase()
  const input = m.text?.trim()
  const current = db.setting('customPaymentText') || ''

  if (!input) {
    return sendReplyWithNav(sock, m, `📝 *CUSTOM PAYMENT TEXT*\n\n` +
      `Teks saat ini:\n${current || '_(belum diatur, pakai default)_'}\n\n` +
      `*PLACEHOLDER YANG TERSEDIA:*\n` +
      `• \`{botname}\` — Nama bot\n` +
      `• \`{owner}\` — Nama owner\n` +
      `• \`{methods}\` — Daftar e-wallet\n` +
      `• \`{banks}\` — Daftar bank\n` +
      `• \`{qris}\` — Status QRIS\n\n` +
      `*CONTOH:*\n` +
      `> \`${m.prefix}custompayment Halo! Bayar ke {methods}\`\n\n` +
      `> \`${m.prefix}custompayment reset\` — Kembalikan ke default`, "custompayment")
  }

  if (input.toLowerCase() === 'reset') {
    db.setting('customPaymentText', '')
    return m.reply(claraWrap("Custompayment", '✅ Teks custom payment direset ke default.'))
  }

  db.setting('customPaymentText', input)
  { const __navText = `✅ Teks custom payment disimpan!\n\nPreview:\n${input}`; return await m.reply(__navText); }
}

export { pluginConfig as config, handler }
