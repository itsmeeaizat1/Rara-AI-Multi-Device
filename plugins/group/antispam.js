// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import te from "../../src/lib/nova-error.js"
import { claraLine } from "../../src/lib/nova-menu-style.js";

function claraWrap(title, text) {
  const scMap = {a:'ᴀ',b:'ʙ',c:'ᴄ',d:'ᴅ',e:'ᴇ',f:'ꜰ',g:'ɢ',h:'ʜ',i:'ɪ',j:'ᴊ',k:'ᴋ',l:'ʟ',m:'ᴍ',n:'ɴ',o:'ᴏ',p:'ᴘ',r:'ʀ',s:'ꜱ',t:'ᴛ',u:'ᴜ',v:'ᴠ',w:'ᴡ',y:'ʏ',z:'ᴢ'};
  const toSC = (s) => s.replace(/[a-z]/g, c => scMap[c] || c);
  const body = Array.isArray(text) ? text.join("\n") : text;
  // Convert body to small caps tapi skip baris command (.xxx) dan preserve *ʙᴏʟᴅ*
  const scBody = body.split("\n").map(line => {
    if (line.trim().startsWith(".") || line.trim().startsWith("Toggle:")) return line;
    return toSC(line);
  }).join("\n");
  return `${toSC(title)}\n\n${scBody}`;
}
async function formatAndReply( text, cmdName) {
  const scMap = {a:'ᴀ',b:'ʙ',c:'ᴄ',d:'ᴅ',e:'ᴇ',f:'ꜰ',g:'ɢ',h:'ʜ',i:'ɪ',j:'ᴊ',k:'ᴋ',l:'ʟ',m:'ᴍ',n:'ɴ',o:'ᴏ',p:'ᴘ',r:'ʀ',s:'ꜱ',t:'ᴛ',u:'ᴜ',v:'ᴠ',w:'ᴡ',y:'ʏ',z:'ᴢ'};
  const toSC = (s) => s.replace(/[a-z]/g, c => scMap[c] || c);
  // Convert all text to small caps, skip command lines
  text = text.split("\n").map(line => {
    if (line.trim().startsWith(".") || line.trim().startsWith("Toggle:") || line.includes("°˖") || line.includes("⋆｡˚")) return line;
    return toSC(line);
  }).join("\n");
  if (!text.includes("╰────  •  ────")) {
    text = text + "\n\n╰────  •  ────";
  }
  return await m.reply(text);
}



const pluginConfig = {
    name: "antispam",
    alias: ["antispam"],
    category: "group",
    description: "Mengatur fitur perlindungan grup dari pesan spam secara brutal",
    usage: ".antispam <on/off/action/delay>",
    example: ".antispam on\n.antispam warning\n.antispam 2",
    isOwner: false,
    isPremium: false,
    isGroup: true,
    isAdmin: true,
    cooldown: 5,
    energi: 0,
    isEnabled: true
}

const spamTracker = new Map()

async function handler(m, { sock, db }) {
    const args = m.args
    const action = args[0]?.toLowerCase()
    const delayMatch = action?.match(/^(\d+)(s|ms)?$/)
    
    if (!action || (!["on", "off", "warning", "kick", "delete"].includes(action) && !delayMatch)) {
        return m.reply( `🛡️ *ᴀɴᴛɪ ꜱᴘᴀᴍ ɢʀᴏᴜᴘ*\n\n` +
            `Fitur ini melindungi grup dari member yang mengirim pesan berulang-ulang dengan sangat cepat dan brutal sehingga mengganggu kenyamanan member lain\n\n` +
            `*ᴄᴀʀᴀ ᴘᴀᴋᴀɪ:*\n` +
            `\`${m.prefix}antispam on\` (Aktifkan fitur antispam)\n` +
            `\`${m.prefix}antispam off\` (Matikan fitur antispam)\n\n` +
            `*ᴘɪʟɪʜ ᴍᴇᴛᴏᴅᴇ ʜᴜᴋᴜᴍᴀɴ:*\n` +
            `\`${m.prefix}antispam warning\` (Beri teguran keras hingga 3 kali peringatan)\n` +
            `\`${m.prefix}antispam kick\` (Otomatis tendang spammer langsung tanpa ampun)\n` +
            `\`${m.prefix}antispam delete\` (Hapus seluruh pesan spam yang dikirimkan)\n\n` +
            `*Atur Sensitivitas Jeda (Delay):*\n` +
            `\`${m.prefix}antispam 2\` (Set jarak antar pesan maksimal 2 detik)\n` +
            `\`${m.prefix}antispam 1500\` (Set jarak ke 1500 milidetik)`, "antispam")
    }

    const groupData = db.getGroup(m.chat) || {}
    
    if (delayMatch) {
        let delayMs = parseInt(delayMatch[1])
        if (delayMatch[2] === "s" || (delayMs >= 1 && delayMs <= 10)) {
            delayMs = delayMs * 1000
        }
        
        if (delayMs < 500) delayMs = 500
        if (delayMs > 10000) delayMs = 10000
        
        groupData.antispamDelay = delayMs
        db.setGroup(m.chat, groupData)
        
        return m.reply(claraWrap("antispam", `🛡️ *ꜱᴇɴꜱɪᴛɪᴠɪᴛᴀꜱ ᴀɴᴛɪ ꜱᴘᴀᴍ ᴅɪᴘᴇʀʙᴀʀᴜɪ*\n\n` +
            `Jeda Maksimal: *${delayMs} ms* (${(delayMs/1000).toFixed(1)} detik)\n\n` +
            `Sistem kini akan menganggap pesan sebagai spam jika anggota mengirim beberapa pesan dengan jeda di bawah *${(delayMs/1000).toFixed(1)} detik* antar pesannya`))
    }

    if (action === "on" || action === "off") {
        const isEnable = action === "on"
        if (groupData.antispam === isEnable) {
            return m.reply(claraWrap("Antispam", `✅ Fitur antispam sudah ${isEnable ? "aktif" : "nonaktif"} di grup ini, tidak ada perubahan yang dibuat`))
        }
        
        groupData.antispam = isEnable
        db.setGroup(m.chat, groupData)
        
        await m.reply(claraWrap("antispam", `🛡️ *ᴀɴᴛɪ ꜱᴘᴀᴍ ᴅɪᴘᴇʀʙᴀʀᴜɪ*\n\n` +
            `Status: *${isEnable ? "AKTIF ✅" : "NONAKTIF ❌"}*\n\n` +
            `Sistem bot kini akan ${isEnable ? "mengawasi secara ketat" : "berhenti mengawasi"} setiap aktivitas spam atau flood pesan yang dilakukan oleh member di dalam grup ini`))
    } else {
        groupData.antispamAction = action
        db.setGroup(m.chat, groupData)
        
        let textAction = ""
        if (action === "warning") textAction = "Memberikan peringatan keras secara bertahap"
        if (action === "kick") textAction = "Menendang member yang membandel secara otomatis"
        if (action === "delete") textAction = "Menghapus pesan spam yang mengganggu"
        
        await m.reply(claraWrap("antispam", `🛡️ *ᴀᴋꜱɪ ᴀɴᴛɪ ꜱᴘᴀᴍ ᴅɪᴘᴇʀʙᴀʀᴜɪ*\n\n` +
            `Metode Hukuman: *${action.toUpperCase()}*\n\n` +
            `Sistem bot akan langsung mengambil tindakan berupa *${textAction}* apabila ada member yang terdeteksi melakukan pelanggaran berupa tindakan spam brutal`))
    }
}

async function checkSpam(m, sock, db) {
    if (!m.isGroup || m.isAdmin || m.isOwner || m.fromMe) return false
    
    const groupData = db.getGroup(m.chat)
    if (!groupData || !groupData.antispam) return false

    const senderId = m.sender
    const chatKey = `${m.chat}_${senderId}`
    const now = Date.now()
    const delayThreshold = groupData.antispamDelay || 2000

    const userData = spamTracker.get(chatKey) || { count: 0, lastMessage: 0, warnings: 0 }
    
    if (now - userData.lastMessage < delayThreshold) {
        userData.count += 1
    } else {
        if (now - userData.lastMessage > delayThreshold + 1000) {
            userData.count = 1
        } else {
            userData.count = Math.max(1, userData.count - 1)
        }
    }
    
    userData.lastMessage = now
    spamTracker.set(chatKey, userData)

    if (userData.count >= 5) {
        return true
    }
    
    return false
}

async function handleSpamAction(m, sock, db) {
    const groupData = db.getGroup(m.chat)
    const action = groupData.antispamAction || "warning"
    const senderId = m.sender
    const chatKey = `${m.chat}_${senderId}`
    const userData = spamTracker.get(chatKey)

    if (action === "warning") {
        userData.warnings += 1
        spamTracker.set(chatKey, userData)
        
        if (userData.warnings >= 3) {
            await m.reply(claraWrap("antispam", `⚠️ *ᴘᴇʀɪɴɢᴀᴛᴀɴ ꜱᴘᴀᴍ ᴍᴀᴋꜱɪᴍᴀʟ*\n\n` +
                `Teruntuk: @${senderId.split("@")[0]}\n\n` +
                `Kamu telah mendapatkan 3 kali teguran peringatan karena mengirim pesan spam secara berkelanjutan. Harap segera berhenti melakukan spam atau jajaran admin grup dapat mengambil tindakan tegas terhadap pelanggaran ini!`))
            userData.warnings = 0 
            userData.count = 0
            spamTracker.set(chatKey, userData)
        } else {
            await m.reply(claraWrap("antispam", `⚠️ *ᴛᴇɢᴜʀᴀɴ ꜱᴘᴀᴍ ᴛᴇʀᴅᴇᴛᴇᴋꜱɪ*\n\n` +
                `Peringatan ke-${userData.warnings} dari maksimal 3 peringatan\n\n` +
                `Halo @${senderId.split("@")[0]}, tolong jangan melakukan pengiriman pesan berulang-ulang di grup ini secara cepat! Sistem kami mendeteksi aktivitasmu sebagai spam. Mohon hargai kenyamanan member lainnya`))
            userData.count = 0 
            spamTracker.set(chatKey, userData)
        }
    } else if (action === "kick") {
        if (m.isBotAdmin) {
            await m.reply(claraWrap("antispam", `🛑 *ꜱᴘᴀᴍᴍᴇʀ ᴅɪᴋᴇʟᴜᴀʀᴋᴀɴ*\n\n` +
                `Maaf sekali @${senderId.split("@")[0]}, kamu akan dikeluarkan secara paksa oleh sistem karena kamu terdeteksi melakukan aksi spam brutal di grup ini!`))
            await sock.groupParticipantsUpdate(m.chat, [senderId], "remove")
            spamTracker.delete(chatKey)
        } else {
            await m.reply(claraWrap("antispam", `⚠️ *ꜱᴘᴀᴍ ᴛᴇʀᴅᴇᴛᴇᴋꜱɪ*\n\n` +
                `Telah terdeteksi aktivitas spam brutal dari @${senderId.split("@")[0]}, namun sistem bot sayangnya tidak dapat menendang member tersebut karena bot saat ini tidak memiliki akses sebagai admin grup. Tolong jadikan bot admin agar fitur ini bekerja maksimal`))
            userData.count = 0
            spamTracker.set(chatKey, userData)
        }
    } else if (action === "delete") {
        if (m.isBotAdmin) {
            await sock.sendMessage(m.chat, { delete: m.key })
        } else {
            userData.count = 0
            spamTracker.set(chatKey, userData)
        }
    }
}

export { pluginConfig as config, handler, checkSpam, handleSpamAction }
