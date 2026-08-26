// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { claraWrap } from "../../src/lib/nova-menu-style.js";
import { getDatabase } from '../../src/lib/nova-database.js'
const pluginConfig = {
    name: 'jadwalgroup',
    alias: ["jadwalgroup", 'schedulegroup', 'jdwlgrup', 'autoopenclose'],
    category: 'group',
    description: 'Jadwal buka/tutup grup otomatis',
    usage: '.jadwalgroup <open/close> <HH:MM>',
    example: '.jadwalgroup open 06:00',
    isOwner: false,
    isPremium: false,
    isGroup: true,
    isPrivate: false,
    cooldown: 5,
    energi: 0,
    isEnabled: true,
    isAdmin: true,
    isBotAdmin: true
};

function parseTime(timeStr) {
    if (!timeStr || typeof timeStr !== 'string') return null;
    
    const cleaned = timeStr.trim().replace(/\s+/g, '');
    const match = cleaned.match(/^(\d{1,2}):(\d{2})$/);
    if (!match) return null;
    
    const hours = parseInt(match[1]);
    const minutes = parseInt(match[2]);
    
    if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;
    
    return { hours, minutes };
}

function formatTime(hours, minutes) {
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
}

async function handler(m, { sock, db }) {
    const args = m.args || []
    const action = args[0]?.toLowerCase();
    
    let time = args[1];
    if (args.length >= 4 && args[2] === ':') {
        time = `${args[1]}:${args[3]}`;
    } else if (args.length >= 2) {
        time = args.slice(1).join('').replace(/\s+/g, '');
    }
    
    if (!action) {
        const group = db.getGroup(m.chat) || {};
        const openTime = group.scheduleOpen || null;
        const closeTime = group.scheduleClose || null;
        
        let scheduleInfo = `⏰ *ᴊᴀᴅᴡᴀʟ ɢʀᴜᴘ*

「 📋 *ꜱᴛᴀᴛᴜꜱ*
🔓 Open: *${openTime || 'Tidak aktif'}*
🔒 Close: *${closeTime || 'Tidak aktif'}*

*ᴄᴀʀᴀ ᴘᴇɴɢɢᴜɴᴀᴀɴ:*
\`.jadwalgroup open 06:00\`
\`.jadwalgroup close 22:00\`
\`.jadwalgroup hapus open\`
\`.jadwalgroup hapus close\``;
        
        await m.reply( scheduleInfo, "jadwalgroup");
        return;
    }
    
    if (action === 'hapus' || action === 'delete' || action === 'remove') {
        const type = args[1]?.toLowerCase();
        
        if (type !== 'open' && type !== 'close') {
            await m.reply(`⚠️ *ᴠᴀʟɪᴅᴀꜱɪ ɢᴀɢᴀʟ*\n\n` +
                `Gunakan: \`.jadwalgroup hapus open\`\n` +
                `atau: \`.jadwalgroup hapus close\``);
            return;
        }
        
        const group = db.getGroup(m.chat) || {};
        
        if (type === 'open') {
            delete group.scheduleOpen;
            db.setGroup(m.chat, group);
            
            await m.reply(claraWrap("jadwalgroup", `✅ *ʙᴇʀʜᴀꜱɪʟ*\n\n` +
                `Jadwal *ʙᴜᴋᴀ ɢʀᴜᴘ* otomatis telah dihapus.`));
        } else {
            delete group.scheduleClose;
            db.setGroup(m.chat, group);
            
            await m.reply(claraWrap("jadwalgroup", `✅ *ʙᴇʀʜᴀꜱɪʟ*\n\n` +
                `Jadwal *ᴛᴜᴛᴜᴘ ɢʀᴜᴘ* otomatis telah dihapus.`));
        }
        return;
    }
    
    if (action !== 'open' && action !== 'close') {
        await m.reply(`⚠️ *ᴠᴀʟɪᴅᴀꜱɪ ɢᴀɢᴀʟ*\n\n` +
            `Action harus \`open\` atau \`close\`!\n\n` +
            `*ᴄᴏɴᴛᴏʜ:*\n` +
            `\`.jadwalgroup open 06:00\`\n` +
            `\`.jadwalgroup close 22:00\``);
        return;
    }
    
    if (!time) {
        await m.reply( `⚠️ *ᴠᴀʟɪᴅᴀꜱɪ ɢᴀɢᴀʟ*\n\n` +
            `Waktu harus diisi!\n\n` +
            `*ꜰᴏʀᴍᴀᴛ:* \`HH:MM\` (24 jam)\n` +
            `*ᴄᴏɴᴛᴏʜ:* \`.jadwalgroup ${action} 08:00\``, "jadwalgroup");
        return;
    }
    
    const parsed = parseTime(time);
    if (!parsed) {
        await m.reply( `⚠️ *ᴠᴀʟɪᴅᴀꜱɪ ɢᴀɢᴀʟ*\n\n` +
            `Format waktu tidak valid!\n\n` +
            `*ꜰᴏʀᴍᴀᴛ:* \`HH:MM\` (24 jam)\n` +
            `*ᴄᴏɴᴛᴏʜ:* \`06:00\`, \`22:30\`, \`08:15\``, "jadwalgroup");
        return;
    }
    
    const group = db.getGroup(m.chat) || {};
    const formattedTime = formatTime(parsed.hours, parsed.minutes);
    
    if (action === 'open') {
        group.scheduleOpen = formattedTime;
    } else {
        group.scheduleClose = formattedTime;
    }
    
    db.setGroup(m.chat, group);
    
    const actionText = action === 'open' ? 'BUKA' : 'TUTUP';
    const emoji = action === 'open' ? '🔓' : '🔒';
    
    const successMsg = `✅ *ᴊᴀᴅᴡᴀʟ ᴅɪꜱɪᴍᴘᴀɴ*

╭┈┈⬡「 ⏰ *ꜱᴇᴛᴛɪɴɢ*
┃ ㊗ ${emoji} Aksi: *${actionText}*
┃ ㊗ ⏱️ Waktu: *${formattedTime} WIB*
┃ ㊗ 📡 sTatus: *🟢 Aktif*
╰┈┈⬡

│ ❏ _Grup akan otomatis ${action === 'open' ? 'dibuka' : 'ditutup'}_
│ ❏ _setiap hari pada jam *${formattedTime}* WIB._`;
    
    await m.reply(successMsg);
}

export { pluginConfig as config, handler }