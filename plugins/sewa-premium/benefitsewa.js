// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// plugins/sewa-premium/benefitsewa.js — Kartu manfaat sewa bot (pasangan .benefitpremium)
// Harga live dari src/lib/sewa/sewa.js (ikutin override .setsewa otomatis)
import config from '../../config.js'
import { sewaPrice } from '../../src/lib/sewa/sewa.js'
import { claraWrap } from '../../src/lib/nova-menu-style.js'

const pluginConfig = {
  name: 'benefitsewa',
  alias: ["benefitsewa"],
  category: 'sewa premium',
  description: 'Lihat penjelasan dan daftar keuntungan sewa bot',
  usage: '.benefitsewa',
  isOwner: false,
  isGroup: false,
  isEnabled: true
}

async function handler(m) {
  const prefix = config.command?.prefix || '.'

  const message =
    `🏠 *Apa Itu Sewa?*\n\n` +
    `Sewa adalah *ɴʏᴇᴡᴀ ʙᴏᴛ* supaya bot masuk dan aktif di grup kamu selama durasi sewa. Semua member di grup bisa pakai fitur bot rame-rame tanpa limit per-orang.\n\n` +
    `` +
    `\`\`\`Bot aktif 24 jam di grup kamu\`\`\`\n` +
    `\`\`\`1200+ command dipakai rame-rame\`\`\`\n` +
    `\`\`\`Game & RPG economy lengkap\`\`\`\n` +
    `\`\`\`AI Chat multi-provider\`\`\`\n` +
    `\`\`\`Download YT, TikTok, IG, Facebook\`\`\`\n` +
    `\`\`\`Group moderation (antilink, antitoxic)\`\`\`\n` +
    `\`\`\`Gratis update selama sewa aktif\`\`\`\n` +
    `\`\`\`Bot gak akan keluar dari grup\`\`\`\n` +
    `---\n` +
    `` +
    `\`🎁 Bonus Sewa:\`\n` +
    `• Gratis setup & konfigurasi awal\n` +
    `• Support via WhatsApp 24/7\n` +
    `• Garansi kalau bot down (di-restart)\n` +
    `• Bisa pindah grup (1x gratis per bulan)\n` +
    `---\n` +
    `` +
    `\`💰 Paket Harga:\`\n` +
    `• Mingguan: ${sewaPrice.weekly}\n` +
    `• Bulanan: ${sewaPrice.monthly}\n` +
    `• Tahunan: ${sewaPrice.yearly}\n` +
    `• Lifetime: ${sewaPrice.lifetime}\n` +
    `---\n` +
    `` +
    `\`📝 Cara Sewa:\`\n` +
    `• \`\`\`${prefix}buysewa [durasi] [link-grup]\`\`\`\n` +
    `• \`\`\`${prefix}daftarsewa\`\`\` di private chat\n` +
    `• Contoh: .buysewa 30d https://chat.whatsapp.com/xxx\n` +
    `---\n\n` +
    `Mau sewa? bayar langsung via .buysewa atau hubungi owner\n${config.owner.number.map(num => `- wa.me/${num}`).join('\n')}`

  await m.reply(claraWrap("benefitsewa", message))
}

export { pluginConfig as config, handler }
