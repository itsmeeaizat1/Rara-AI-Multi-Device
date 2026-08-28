// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { claraWrap, novaError, novaEmpty, novaGuide, novaNoInput } from "../../src/lib/nova-menu-style.js";
import { getDatabase } from '../../src/lib/nova-database.js'
const pluginConfig = {
    name: 'jadwalgroup',
    alias: ["jadwalgroup"],
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
    const pfx = m.prefix || ".";
    
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
        
        return m.reply(novaGuide("Jadwal Grup", `Jadwal Otomatis Grup Saat Ini:\n🔓 Open: ${openTime || 'Tidak aktif'}\n🔒 Close: ${closeTime || 'Tidak aktif'}`, `${pfx}jadwalgroup open 06:00\n${pfx}jadwalgroup close 22:00\n${pfx}jadwalgroup hapus open`));
    }
    
    if (action === 'hapus' || action === 'delete' || action === 'remove') {
        const type = args[1]?.toLowerCase();
        
        if (type !== 'open' && type !== 'close') {
            return m.reply(novaGuide("Hapus Jadwal Grup", "Pilih tipe jadwal yang ingin dihapus (open atau close)!", `${pfx}jadwalgroup hapus open\n${pfx}jadwalgroup hapus close`));
        }
        
        const group = db.getGroup(m.chat) || {};
        
        if (type === 'open') {
            delete group.scheduleOpen;
            db.setGroup(m.chat, group);
            
            await m.reply(claraWrap("jadwalgroup", `✅ *BERHASIL*\n\nJadwal *BUKA GRUP* otomatis telah dihapus.`));
        } else {
            delete group.scheduleClose;
            db.setGroup(m.chat, group);
            
            await m.reply(claraWrap("jadwalgroup", `✅ *BERHASIL*\n\nJadwal *TUTUP GRUP* otomatis telah dihapus.`));
        }
        return;
    }
    
    if (action !== 'open' && action !== 'close') {
        return m.reply(novaGuide("Jadwal Grup", "Aksi harus berupa 'open' atau 'close'!", `${pfx}jadwalgroup open 06:00\n${pfx}jadwalgroup close 22:00`));
    }
    
    if (!time) {
        return m.reply(novaNoInput("Jadwal Grup", `Jam belum diisi! Gunakan format HH:MM (24 Jam).\nContoh: \`${pfx}jadwalgroup ${action} 08:00\``));
    }
    
    const parsed = parseTime(time);
    if (!parsed) {
        return m.reply(novaError("Jadwal Grup", "Format waktu tidak valid! Gunakan format 24 jam (HH:MM), contoh: 06:00 atau 22:30."));
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
    
    const successMsg = `✅ *JADWAL DISIMPAN*

╭──「 ⏰ *SETTING*
│ ${emoji} Aksi: *${actionText}*
│ ⏱️ Waktu: *${formattedTime} WIB*
│ 📡 Status: *🟢 Aktif*
╰──────────❀

│ _Grup akan otomatis ${action === 'open' ? 'dibuka' : 'ditutup'}_
│ _setiap hari pada jam *${formattedTime}* WIB._`;
    
    await m.reply(successMsg);
}

export { pluginConfig as config, handler }