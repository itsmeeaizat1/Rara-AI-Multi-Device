// RARA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import te from '../../src/lib/rara-error.js'
import { raraWrap, raraLine } from "../../src/lib/rara-menu-style.js";
const pluginConfig = {
    name: ['clearchat', 'cc', 'cleangc', 'deletechat', 'delchat'],
    alias: ["clearchat", "cc", "cleangc", "deletechat", "delchat"],
    category: 'group',
    description: 'Membersihkan chat grup',
    usage: '.clearchat',
    example: '.clearchat',
    isOwner: false,
    isPremium: false,
    isGroup: true,
    isPrivate: false,
    isAdmin: true,
    isBotAdmin: true,
    cooldown: 60,
    energi: 0,
    isEnabled: true
}

async function handler(m, { sock }) {
    
    try {
        const now = Math.floor(Date.now() / 1000)
        
        await sock.chatModify({ 
            delete: true, 
            lastMessages: [{ 
                key: m.key, 
                messageTimestamp: m.messageTimestamp || now
            }] 
        }, m.chat)
        
        await m.reply(raraWrap("Clearchat", `chat dibersihkan\n\nChat grup telah dibersihkan oleh @${m.sender.split('@')[0]}`, "success"))
        
    } catch (error) {
        try {
            await sock.chatModify({ 
                clear: { 
                    messages: [{ 
                        id: m.key.id, 
                        fromMe: m.key.fromMe,
                        timestamp: Math.floor(Date.now() / 1000)
                    }] 
                } 
            }, m.chat)
            
            m.reply(raraWrap("Clearchat", `chat dibersihkan\n\nChat grup di wa bot telah dibersihkan oleh @${m.sender.split('@')[0]}\nSilahkan lihat sendiri di wa bot kamu`, "success"))
        } catch (e) {
            m.reply(raraWrap("clearchat", te(m.prefix, m.command, m.pushName), "error"))
        }
    }
}

export { pluginConfig as config, handler }