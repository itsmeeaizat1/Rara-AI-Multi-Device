// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA

import { getDatabase } from '../../src/lib/nova-database.js'
import config from '../../config.js'
import fs from 'fs'
import path from 'path'
import { claraWrap, claraLine, novaError, novaEmpty, novaGuide, novaNoInput } from "../../src/lib/nova-menu-style.js";
const pluginConfig = {
    name: "autoreply",
    alias: ["autoreply"],
    category: 'group',
    description: 'Mengatur autoreply/smart triggers per grup',
    usage: '.autoreply on/off/add/del/list/private',
    example: '.autoreply on',
    isOwner: false,
    isPremium: false,
    isGroup: false,
    isPrivate: false,
    cooldown: 5,
    energi: 0,
    isEnabled: true,
    isAdmin: false,
    isBotAdmin: false
}

const AUTOREPLY_MEDIA_DIR = path.join(process.cwd(), "src", "data", 'autoreply_media')

if (!fs.existsSync(AUTOREPLY_MEDIA_DIR)) {
    fs.mkdirSync(AUTOREPLY_MEDIA_DIR, { recursive: true })
}

async function handler(m, { sock }) {
    const db = getDatabase()
    const args = m.args || []
    const action = args[0]?.toLowerCase()
    
    const privateAutoreply = db.setting('autoreplyPrivate') ?? false
    
    if (action === 'private') {
        if (!m.isOwner) {
            return m.reply(novaError("Autoreply", "Fitur autoreply private cuma bisa diatur oleh Owner bot ya!"))
        }
        
        const subAction = args[1]?.toLowerCase()
        
        if (subAction === 'on') {
            db.setting('autoreplyPrivate', true)
            return m.reply(claraWrap("Autoreply", `autoreply private diaktifkan\n\nBot akan merespon otomatis di private chat`, "success"))
        }
        
        if (subAction === 'off') {
            db.setting('autoreplyPrivate', false)
            return m.reply(claraWrap("Autoreply", `autoreply private dinonaktifkan\n\nBot tidak akan merespon otomatis di private chat`, "error"))
        }
        
        const currentStatus = db.setting('autoreplyPrivate') ?? false
        return m.reply(
            `📱 *autoreply private*\n\n` +
            `Status: *${currentStatus ? '✅ AKTIF' : '❌ NONAKTIF'}*\n\n` +
            `*perintah tersedia:*\n` +
            `*${m.prefix}autoreply private on* — Aktifkan private\n` +
            `*${m.prefix}autoreply private off* — Nonaktifkan private`
        )
    }
    
    if (action === 'global') {
        if (!m.isOwner) {
            return m.reply(novaError("Autoreply", "Fitur global autoreply cuma bisa diatur oleh Owner bot ya!"))
        }
        
        const subAction = args[1]?.toLowerCase()
        const globalCustomReplies = db.setting('globalCustomReplies') || []
        
        if (subAction === 'add') {
            const fullBody = m.body || ''
            const pipeIdx = fullBody.indexOf('|')
            if (pipeIdx === -1) {
                return m.reply(novaNoInput("Autoreply Global", `Format salah nih! Gunakan format: trigger|reply\nContoh: ${m.prefix}autoreply global add halo|Hai {name}!`))
            }
            
            const triggerStart = fullBody.toLowerCase().indexOf('global add ') + 'global add '.length
            const triggerEnd = pipeIdx
            const trigger = fullBody.substring(triggerStart, triggerEnd).trim()
            const reply = fullBody.substring(pipeIdx + 1)
            
            if (!trigger.trim() || !reply) {
                return m.reply(novaError("Autoreply Global", "Trigger dan reply tidak boleh kosong ya!"))
            }
            
            const existingIndex = globalCustomReplies.findIndex(r => r.trigger.toLowerCase() === trigger.trim().toLowerCase())
            if (existingIndex !== -1) {
                globalCustomReplies[existingIndex].reply = reply
            } else {
                globalCustomReplies.push({ trigger: trigger.trim().toLowerCase(), reply: reply })
            }
            
            db.setting('globalCustomReplies', globalCustomReplies)
            await db.save()
            return m.reply(
                `✅ *global autoreply ditambahkan*\n\n` +
                `Trigger: *${trigger.trim()}*\n` +
                `Total: *${globalCustomReplies.length}* replies\n\n` +
                `_Aktif di semua grup dan private chat_`
            )
        }
        
        if (subAction === 'del' || subAction === 'rm') {
            const trigger = args.slice(2).join(' ').toLowerCase().trim()
            if (!trigger) {
                return m.reply(novaNoInput("Autoreply Global", "Masukkan trigger yang mau dihapus ya!"))
            }
            
            const index = globalCustomReplies.findIndex(r => r.trigger === trigger)
            if (index === -1) {
                return m.reply(novaEmpty("Autoreply Global", `Trigger "${trigger}" tidak ditemukan!`))
            }
            
            globalCustomReplies.splice(index, 1)
            db.setting('globalCustomReplies', globalCustomReplies)
            await db.save()
            
            return m.reply(claraWrap("Autoreply", `🗑️ global autoreply dihapus\n\nTrigger ${trigger} berhasil dihapus!`, "info"))
        }
        
        if (subAction === 'list' || !subAction) {
            if (globalCustomReplies.length === 0) {
                return m.reply(
                    `📋 *global autoreply*\n\n` +
                    `Status: *❌ TIDAK ADA DATA*\n\n` +
                    `*perintah tersedia:*\n` +
                    `*${m.prefix}autoreply global add <trigger>|<reply>*`
                )
            }
            
            let text = `📋 *global autoreply*\n\n`
            text += `Total: *${globalCustomReplies.length}* replies\n`
            text += `Berlaku di: *Semua Grup & Private Chat*\n\n`
            text += `*daftar trigger:*\n`
            globalCustomReplies.forEach((r, i) => {
                const hasImage = r.image ? '🖼️' : ''
                text += `${i + 1}. *${r.trigger}* ${hasImage}
${r.reply.substring(0, 30)}${r.reply.length > 30 ? '...' : ''}\n\n`
            })
            return m.reply(text.trim())
        }
        
        return m.reply(
            `📱 *global autoreply*\n\n` +
            `\`${m.prefix}autoreply global add trigger|reply\`\n` +
            `\`${m.prefix}autoreply global del trigger\`\n` +
            `\`${m.prefix}autoreply global list\``
        )
    }
    
    if (!m.isGroup) {
        return m.reply(
            `📱 *sistem autoreply*\n\n` +
            `Autoreply Private: *${privateAutoreply ? '✅ AKTIF' : '❌ NONAKTIF'}*\n\n` +
            `*perintah tersedia:*\n` +
            `*${m.prefix}autoreply private on/off* — Toggle private\n` +
            `*${m.prefix}autoreply global add/del/list* — Global triggers\n\n` +
            `_Catatan: Untuk setting autoreply grup, gunakan perintah ini di dalam grup._`
        )
    }
    
    if (!m.isAdmin && !m.isOwner) {
        return m.reply(novaError("Autoreply", "Hanya admin grup atau owner yang bisa mengatur autoreply di grup!"))
    }
    
    const groupData = db.getGroup(m.chat) || {}
    const globalSmartTriggers = db.setting('smartTriggers') ?? config.features?.smartTriggers ?? false
    
    if (!action || action === 'status') {
        const groupStatus = groupData.autoreply
        const effectiveStatus = groupStatus ?? globalSmartTriggers
        const customReplies = groupData.customReplies || []
        
        let text = `🤖 *sistem autoreply grup*\n\n`
        text += `Status Global: *${globalSmartTriggers ? '✅ AKTIF' : '❌ NONAKTIF'}*\n`
        text += `Status Grup Ini: *${groupStatus === undefined ? 'DEFAULT' : (groupStatus ? '✅ AKTIF' : '❌ NONAKTIF')}*\n`
        text += `Status Private: *${privateAutoreply ? '✅ AKTIF' : '❌ NONAKTIF'}*\n`
        text += `Efektif di Grup: *${effectiveStatus ? '✅ AKTIF' : '❌ NONAKTIF'}*\n`
        text += `Total Custom Reply (Grup): *${customReplies.length}*\n\n`
        text += `*manajemen grup:*\n`
        text += `*${m.prefix}autoreply on* — Aktifkan di grup ini\n`
        text += `*${m.prefix}autoreply off* — Nonaktifkan di grup ini\n`
        text += `*${m.prefix}autoreply add <trigger>|<reply>* — Tambah custom reply\n`
        text += `*${m.prefix}autoreply del <trigger>* — Hapus custom reply\n`
        text += `*${m.prefix}autoreply list* — Lihat semua trigger di grup ini\n`
        text += `*${m.prefix}autoreply reset* — Hapus SEMUA custom di grup ini\n\n`
        
        if (m.isOwner) {
            text += `*MANAJEMEN GLOBAL (OWNER):*\n`
            text += `*${m.prefix}autoreply global add <trigger>|<reply>*\n`
            text += `*${m.prefix}autoreply global del <trigger>*\n`
            text += `*${m.prefix}autoreply global list* — Trigger yang berlaku aktif\n`
            text += `*${m.prefix}autoreply private on/off* — Toggle bot reply di DM\n\n`
        }
        
        text += `*cara penambahan gambar:*\n`
        text += `1. Kirim gambar beserta caption: *${m.prefix}autoreply add trigger|reply*\n`
        text += `2. Atau reply gambar dengan: *${m.prefix}autoreply add trigger|reply*\n\n`
        text += `*dapat menggunakan placeholder:*\n`
        text += `{name} • {tag} • {sender} • {botname} • {time} • {date}`
        
        return await m.reply( text, "autoreply")
    }
    
    if (action === 'on') {
        db.setGroup(m.chat, { ...groupData, autoreply: true })
        return m.reply(claraWrap("Autoreply", `autoreply diaktifkan\n\nBot akan merespon otomatis di grup ini`, "success"))
    }
    
    if (action === 'off') {
        db.setGroup(m.chat, { ...groupData, autoreply: false })
        return m.reply(claraWrap("Autoreply", `autoreply dinonaktifkan\n\nBot tidak akan merespon otomatis di grup ini`, "error"))
    }
    
    if (action === 'add') {
        const fullBody = m.body || ''
        const pipeIdx = fullBody.indexOf('|')
        
        if (pipeIdx === -1) {
            return m.reply(
                `❌ *format salah*\n\n` +
                `Gunakan format: *trigger|reply*\n\n` +
                `*text only:*\n` +
                `${m.prefix}ar add halo|Hai {name}! 👋\n\n` +
                `*dengan gambar:*\n` +
                `1. Reply gambar + ${m.prefix}ar add trigger|caption\n` +
                `2. Kirim gambar + caption ${m.prefix}ar add trigger|caption\n\n` +
                `*placeholder:*\n` +
                `{name} - Nama user\n` +
                `{tag} - Tag @user\n` +
                `{sender} - Nomor user\n` +
                `{botname} - Nama bot\n` +
                `{time} - Waktu sekarang\n` +
                `{date} - Tanggal sekarang`
            )
        }
        
        const addIdx = fullBody.toLowerCase().indexOf('add ')
        const triggerStart = addIdx + 'add '.length
        const trigger = fullBody.substring(triggerStart, pipeIdx).trim()
        const reply = fullBody.substring(pipeIdx + 1)
        
        if (!trigger) {
            return m.reply(claraWrap("Autoreply", `gagal\n\nTrigger tidak boleh kosong!`, "error"))
        }
        
        let imageBuffer = null
        let imagePath = null
        
        const hasQuotedImage = m.quoted && (m.quoted.mtype === 'imageMessage' || m.quoted.type === 'image')
        const hasDirectImage = m.mtype === 'imageMessage' || m.type === 'image'
        
        if (hasQuotedImage) {
            try {
                imageBuffer = await m.quoted.download()
            } catch (e) {
                console.error('[Autoreply] Failed to download quoted image:', e.message)
            }
        } else if (hasDirectImage) {
            try {
                imageBuffer = await m.download()
            } catch (e) {
                console.error('[Autoreply] Failed to download direct image:', e.message)
            }
        }
        
        if (imageBuffer) {
            const filename = `${m.chat.replace('@g.us', '')}_${trigger.replace(/[^a-zA-Z0-9]/g, '_')}_${Date.now()}.jpg`
            imagePath = path.join(AUTOREPLY_MEDIA_DIR, filename)
            fs.writeFileSync(imagePath, imageBuffer)
        }
        
        const customReplies = groupData.customReplies || []
        const existingIndex = customReplies.findIndex(r => r.trigger.toLowerCase() === trigger.toLowerCase())
        
        const replyData = {
            trigger: trigger.toLowerCase(),
            reply: reply || '',
            image: imagePath || null,
            createdAt: Date.now()
        }
        
        if (existingIndex !== -1) {
            if (customReplies[existingIndex].image && customReplies[existingIndex].image !== imagePath) {
                try {
                    if (fs.existsSync(customReplies[existingIndex].image)) {
                        fs.unlinkSync(customReplies[existingIndex].image)
                    }
                } catch (e) { console.error('[autoreply.js]:', e.message); }
            }
            customReplies[existingIndex] = replyData
        } else {
            customReplies.push(replyData)
        }
        
        db.setGroup(m.chat, { ...groupData, customReplies })
        let successMsg = `✅ *autoreply ditambahkan*\n\n`
        successMsg += `*detail:*\n`
        successMsg += `Trigger: *${trigger.trim()}*\n`
        if (reply) {
            successMsg += `Reply: ${reply.substring(0, 50)}${reply.length > 50 ? '...' : ''}\n`
        }
        if (imagePath) {
            successMsg += `Image: ✅ Tersimpan\n`
        }
        successMsg += `\nTotal: *${customReplies.length}* replies di grup ini`
        
        return m.reply(successMsg)
    }
    
    if (action === 'del' || action === 'rm' || action === 'remove') {
        const trigger = args.slice(1).join(' ').toLowerCase().trim()
        
        if (!trigger) {
            return m.reply(novaNoInput("Autoreply", `Masukkan trigger yang mau dihapus ya!\nContoh: ${m.prefix}autoreply del halo`))
        }
        
        const customReplies = groupData.customReplies || []
        const index = customReplies.findIndex(r => r.trigger === trigger)
        
        if (index === -1) {
            return m.reply(novaEmpty("Autoreply Global", `Trigger "${trigger}" tidak ditemukan!`))
        }
        
        if (customReplies[index].image) {
            try {
                if (fs.existsSync(customReplies[index].image)) {
                    fs.unlinkSync(customReplies[index].image)
                }
            } catch (e) { console.error('[autoreply.js]:', e.message); }
        }
        
        customReplies.splice(index, 1)
        db.setGroup(m.chat, { ...groupData, customReplies })
        
        return m.reply(
            `🗑️ *autoreply dihapus*\n\n` +
            `Trigger *${trigger}* berhasil dihapus!\n` +
            `Sisa: *${customReplies.length}* replies`
        )
    }
    
    if (action === 'list') {
        const customReplies = groupData.customReplies || []
        
        const defaultTriggers = [
            { trigger: '@mention', reply: '👋 Hai! Ada yang manggil bot?' },
            { trigger: 'p', reply: '💬 Budayakan salam sebelum percakapan!' },
            { trigger: 'bot / nova', reply: '🤖 Bot aktif dan siap!' },
            { trigger: 'assalamualaikum', reply: 'Waalaikumsalam saudaraku' }
        ]
        
        let text = `📋 *daftar autoreply grup*\n\n`
        
        text += `*default triggers:*\n`
        defaultTriggers.forEach((r, i) => {
            text += `*${r.trigger}*\n`
            text += `${r.reply}\n`
        })
        text += `\n`
        
        if (customReplies.length > 0) {
            text += `*custom triggers:*\n`
            customReplies.forEach((r, i) => {
                const hasImage = r.image ? '🖼️' : ''
                text += `*${r.trigger}* ${hasImage}\n`
                if (r.reply) {
                    text += `${r.reply.substring(0, 35)}${r.reply.length > 35 ? '...' : ''}\n`
                }
            })
            text += `\n`
        } else {
            text += `*custom triggers:*\n`
            text += `_Belum ada custom trigger di grup ini_\n\n`
        }
        
        text += `_Catatan: Default triggers bawaan bot tidak bisa di-edit._`
        
        return await m.reply(claraWrap("autoreply", text))
    }
    
    if (action === 'reset' || action === 'clear') {
        const customReplies = groupData.customReplies || []
        for (const r of customReplies) {
            if (r.image) {
                try {
                    if (fs.existsSync(r.image)) fs.unlinkSync(r.image)
                } catch (e) { console.error('[autoreply.js]:', e.message); }
            }
        }
        
        db.setGroup(m.chat, { ...groupData, customReplies: [] })
        return m.reply(claraWrap("Autoreply", `🗑️ autoreply direset\n\nSemua autoreply custom dihapus!`, "info"))
    }
    
    return m.reply(claraWrap("Auto reply", `Action Tidak Valid\n\nGunakan: \`on\`, \`off\`, \`private on/off\`, \`add\`, \`del\`, \`list\`, \`reset\``, "error"))
}

export { pluginConfig as config, handler }