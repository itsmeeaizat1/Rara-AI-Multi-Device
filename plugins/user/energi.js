// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
import { raraWrap } from "../../src/lib/rara-menu-style.js";
import { runLiveTicker } from "../../src/lib/rara-countdown.js";
import { computeNextResetTs, buildLimitCard } from "../../src/lib/rara-limit-card.js";

import { getDatabase } from '../../src/lib/rara-database.js'
import config from '../../config.js'
const pluginConfig = {
    name: "energi",
    alias: ["energi"],
    category: 'user',
    description: 'Cek energi user',
    usage: '.energi [@user]',
    example: '.energi',
    isOwner: false,
    isPremium: false,
    isGroup: false,
    isPrivate: false,
    cooldown: 3,
    energi: 0,
    isEnabled: true
}

function formatNumber(num) {
    if (num === -1) return '∞ Unlimited'
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.')
}

async function handler(m, { sock }) {
    const db = getDatabase()
    
    let targetJid = m.sender
    let targetName = m.pushName || 'Kamu'
    
    if (m.quoted) {
        targetJid = m.quoted.sender
        targetName = m.quoted.pushName || targetJid.split('@')[0]
    } else if (m.mentionedJid?.length) {
        targetJid = m.mentionedJid[0]
        targetName = targetJid.split('@')[0]
    }
    
    const user = db.getUser(targetJid) || db.setUser(targetJid)
    const isOwner = config.owner?.number?.includes(targetJid.replace(/[^0-9]/g, '')) || config.isOwner?.(targetJid)

    const dbToggle = db.setting('energi')
    const energiEnabled = dbToggle !== undefined ? dbToggle : (config.energi?.enabled !== false)

    let finalEnergi
    if (!energiEnabled || isOwner) {
        finalEnergi = -1
    } else if (user.isPremium) {
        finalEnergi = user.energi ?? config.energi?.premium ?? 100
    } else {
        finalEnergi = user.energi ?? config.energi?.default ?? 25
    }

    const isUnlimited = finalEnergi === -1
    const energiDisplay = formatNumber(finalEnergi)
    
    const isSelf = targetJid === m.sender
    
    let userStatus = 'Free'
    if (isOwner) userStatus = 'Owner'
    else if (user.isPremium) userStatus = 'Premium'
    if (!energiEnabled) userStatus += ' (Energi OFF)'
    
    // 🕒 PENGHITUNG (13 Sep 2026): meter terpakai + countdown live ke reset
    // (limit akses fitur di-reset scheduler dailyLimitReset jam resetHour WIB)
    const resetHour = config.scheduler?.resetHour ?? 0
    const resetMinute = config.scheduler?.resetMinute ?? 0
    const resetTime = `${String(resetHour).padStart(2, '0')}:${String(resetMinute).padStart(2, '0')}`

    // total harian pakai konvensi yang sama kayak .mylimit biar gak beda cerita
    const hariIni = new Date().toLocaleDateString('en-US', { timeZone: 'Asia/Jakarta', weekday: 'long' })
    const isWeekend = hariIni === 'Saturday' || hariIni === 'Sunday'
    const baseLimit = user.isPremium ? (config.energi?.premium ?? 1000) : (config.energi?.default ?? 300)
    const weekendBonus = isWeekend && !user.isPremium && !isOwner && energiEnabled ? baseLimit : 0
    const totalLimit = baseLimit + weekendBonus
    const terpakai = finalEnergi === -1 ? null : Math.max(0, totalLimit - finalEnergi)

    const cardCtx = {
        title: 'Energi',
        name: targetName,
        status: userStatus,
        sisa: energiDisplay,
        terpakai,
        total: terpakai !== null ? totalLimit : null,
        resetTime,
        extra: [
            !energiEnabled ? '🔌 Sistem energi dinonaktifkan — semua command gratis' : '',
            weekendBonus > 0 ? `🎁 Bonus weekend: *+${formatNumber(weekendBonus)} limit*` : '',
        ],
        footer: isSelf && !isUnlimited && finalEnergi < 10
            ? '⚠️ Energi hampir habis! Gunakan `.buyenergi` untuk beli'
            : 'Detail lengkap limit: `.mylimit`',
        isUnlimited: isUnlimited || !energiEnabled,
    }

    if (cardCtx.isUnlimited) {
        // unlimited / energi OFF → gak ada reset yang dihitung, kartu statis
        return m.reply(buildLimitCard({ ...cardCtx, remainingMs: -1 }))
    }

    const targetTs = computeNextResetTs(resetHour, resetMinute)
    // fire-and-forget: gak nahan command/react 🐣
    runLiveTicker({
        sock,
        chat: m.chat,
        m,
        initialCard: buildLimitCard({ ...cardCtx, remainingMs: targetTs - Date.now() }),
        tickCard: (st) => buildLimitCard({ ...cardCtx, remainingMs: st.remainingMs }),
        finalCard: (st) => buildLimitCard({ ...cardCtx, remainingMs: st.remainingMs }),
        mode: 'down',
        targetTs,
    }).catch(() => {})
    return
}

export { pluginConfig as config, handler }