// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { novaError, novaEmpty, novaGuide, novaNoInput, claraWrap } from "../../src/lib/nova-menu-style.js";
const pluginConfig = {
    name: 'pin',
    alias: ["pin"],
    category: 'group',
    description: 'Pin pesan penting di grup',
    usage: '.pin (reply pesan)',
    example: '.pin',
    isOwner: false,
    isPremium: false,
    isGroup: true,
    isPrivate: false,
    cooldown: 10,
    energi: 0,
    isEnabled: true,
    isAdmin: true,
    isBotAdmin: true
};

async function handler(m, { sock, args }) {
    if (!m.quoted || !m.quoted.key || !m.quoted.key.id) {
        await m.reply(novaGuide('Pin', 'Reply pesan yang mau di-pin dulu!', '.pin (reply pesan)'));
        return;
    }
    
    let duration = 86400;
    if (args && args.length > 0 && args[0]) {
        const hours = parseInt(args[0]);
        if (!isNaN(hours) && hours >= 1 && hours <= 720) {
            duration = hours * 3600;
        }
    }
    
    try {
        const pinKey = {
            remoteJid: m.chat,
            fromMe: m.quoted.key.fromMe || false,
            id: m.quoted.key.id,
            participant: m.quoted.key.participant || m.quoted.sender
        };
        
        await sock.sendMessage(m.chat, {
            pin: pinKey,
            type: 1,
            time: duration
        });
        
        const durationText = duration >= 86400 
            ? `${Math.floor(duration / 86400)} hari` 
            : `${Math.floor(duration / 3600)} jam`;
        
        const successMsg = `✅ Success pin pesan ini`;
        await m.reply(claraWrap("pin", successMsg))
        
    } catch (error) {
        await m.reply(novaError('Pin', 'Gagal pin pesan nih'));
    }
}

export { pluginConfig as config, handler }
