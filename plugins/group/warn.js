// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { getDatabase } from '../../src/lib/nova-database.js'
import { getParticipantJid } from '../../src/lib/nova-lid.js'
import te from '../../src/lib/nova-error.js'
import { claraWrap, claraLine } from "../../src/lib/nova-menu-style.js";
const pluginConfig = {
    name: 'warn',
    alias: ["warn"],
    category: 'group',
    description: 'Memberi peringatan kepada member',
    usage: '.warn @user <alasan>',
    example: '.warn @user spam',
    isOwner: false,
    isPremium: false,
    isGroup: true,
    isPrivate: false,
    isAdmin: true,
    cooldown: 5,
    energi: 0,
    isEnabled: true
}

async function handler(m, { sock }) {
    const db = getDatabase()
    
    let groupData = db.getGroup(m.chat) || {}
    let warnings = groupData.warnings || {}
    const maxWarns = groupData.maxWarnings || 3

    const args = m.args
    if (!args[0] && !m.quoted && (!m.mentionedJid || m.mentionedJid.length === 0)) {
        return m.reply(claraWrap("warn", `⚠️ *ꜱɪꜱᴛᴇᴍ ᴡᴀʀɴɪɴɢ ɢʀᴜᴘ*\n\n` +
            `Sistem manajemen pelanggaran untuk member grup.\n` +
            `Batas Warning: *${maxWarns} kali* (Otomatis Kick)\n\n` +
            `*ᴄᴀʀᴀ ᴘᴀᴋᴀɪ:*\n` +
            `*${m.prefix}warn @user <alasan>* — Memberi warning\n` +
            `*${m.prefix}warn max <angka>* — Mengubah batas maksimal warning\n` +
            `*${m.prefix}listwarn* — Melihat daftar member bermasalah\n` +
            `*${m.prefix}resetwarn @user* — Menghapus semua warning member\n\n` +
            `*ᴀʟᴜʀ ᴘᴀᴋᴀɪ:*\n` +
            `1. Saat member melakukan pelanggaran pertama, beri mereka SP1: *${m.prefix}warn @user Spam pesan*\n` +
            `2. Bot akan mencatat "Spam pesan" sebagai warning ke-1 mereka.\n` +
            `3. Jika melanggar lagi, beri peringatan kedua dengan alasan baru: *${m.prefix}warn @user Berkata kasar*\n` +
            `4. Jika total peringatan member mencapai batas maksimal (saat ini *${maxWarns}*), bot akan otomatis MENGELUARKAN (Kick) member tersebut.\n` +
            `5. Riwayat pelanggaran bisa dilihat lengkap dengan mengetik *${m.prefix}listwarn @user*.`))
    }
    if (args[0]?.toLowerCase() === 'max') {
        const newMax = parseInt(args[1])
        if (isNaN(newMax) || newMax < 1 || newMax > 20) {
            return m.reply(claraWrap("warn", `gagal\n\nBatas referensi warning harus berupa angka 1-20.\n💡 Contoh: ${m.prefix}warn max 5`, "error"))
        }
        groupData.maxWarnings = newMax
        db.setGroup(m.chat, groupData)
        return m.reply(claraWrap("Warn", `batas warning diubah\n\nMaksimal warning grup ini telah diupdate menjadi ${newMax} kali.`, "success"))
    }

    let targetUser = null
    if (m.quoted) {
        targetUser = m.quoted.sender
    } else if (m.mentionedJid && m.mentionedJid.length > 0) {
        targetUser = m.mentionedJid[0]
    }
    
    if (!targetUser) {
        await m.reply( `⚠️ *ᴄᴀʀᴀ ᴘᴀᴋᴀɪ*\n\n` +
            `Reply pesan user + \`${m.prefix}warn alasan\`\n` +
            `Atau: \`${m.prefix}warn @user alasan\``, "warn")
        return
    }
    try {
        const groupMeta = m.groupMetadata
        const participant = groupMeta.participants.find(p => getParticipantJid(p) === targetUser)
        if (participant?.admin) {
            await m.reply(claraWrap("warn", `Tidak bisa memberikan warning kepada admin grup.`, "error"))
            return
        }
    } catch (e) { console.error('[warn.js]:', e.message); }
    
    const botJid = sock.user?.id?.split(':')[0] + '@s.whatsapp.net'
    if (targetUser === botJid) {
        await m.reply(claraWrap("Warn", `Gak usah warn aku, aku cuma bot.`, "error"))
        return
    }
    
    const reasonArg = m.quoted ? m.text?.trim() : m.text?.replace(/@\d+/g, '').replace(/^\s*warn\s*/i, '').trim()
    const reason = reasonArg || 'Tidak ada alasan'
    
    let userWarnings = warnings[targetUser] || []
    userWarnings.push({
        reason: reason,
        by: m.sender,
        time: Date.now()
    })
    
    warnings[targetUser] = userWarnings
    db.setGroup(m.chat, { ...groupData, warnings: warnings })
    
    const warnCount = userWarnings.length
    const targetName = targetUser.split('@')[0]
    
    if (warnCount >= maxWarns) {
        try {
            await sock.groupParticipantsUpdate(m.chat, [targetUser], 'remove')
            await m.reply(claraWrap("warn", `🚨 *ᴍᴀx ᴡᴀʀɴɪɴɢ ᴛᴇʀᴄᴀᴘᴀɪ*\n\n` +
                `@${targetName} telah dikeluarkan dari grup karena mencapai batas pelanggaran!\n\n` +
                `*ʀɪɴᴄɪᴀɴ:*\n` +
                `Warning: *${warnCount}/${maxWarns}*\n` +
                `Alasan Terakhir: *${reason}*`))
            delete warnings[targetUser]
            db.setGroup(m.chat, { ...groupData, warnings: warnings })
        } catch (e) {
            m.reply(claraWrap("warn", te(m.prefix, m.command, m.pushName), "error"))
        }
    } else {
        await m.reply(
            `⚠️ *ᴘᴇʀɪɴɢᴀᴛᴀɴ ᴅɪʙᴇʀɪᴋᴀɴ*\n\n` +
            `@${targetName} telah menerima Surat Peringatan (SP${warnCount})!\n\n` +
            `*ʀɪɴᴄɪᴀɴ:*\n` +
            `Warning ke: *${warnCount}/${maxWarns}*\n` +
            `Alasan: *${reason}*\n\n` +
            `_${maxWarns - warnCount} warning lagi = KICK OTOMATIS_`,
            { mentions: [targetUser] }
        )
    }
}

export { pluginConfig as config, handler }