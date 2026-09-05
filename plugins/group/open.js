// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { claraWrap, novaError, novaEmpty, novaGuide, novaNoInput } from "../../src/lib/nova-menu-style.js";
import { getAiGroupAnnounce, buildFallbackAnnounce } from "../../src/lib/nova-group-announce-ai.js";
const pluginConfig = {
    name: "open",
    alias: ["open", "opengc"],
    category: 'group',
    description: 'Membuka grup agar semua member bisa chat',
    usage: '.open',
    example: '.open',
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

async function handler(m, { sock }) {
    try {
        const groupMeta = m.groupMetadata;
        
        if (!groupMeta.announce) {
            await m.reply(
                novaError("Open Group", "Grup sudah dalam keadaan terbuka kok! Semua member sudah bisa kirim pesan.")
            );
            return;
        }
        
        await sock.groupSettingUpdate(m.chat, 'not_announcement');
        
        const senderNum = m.sender.split('@')[0];
        await m.react("🕒");
        
        // Pesan digenerate AI — berubah tiap kali grup dibuka kembali.
        // AI mati/timeout → fallback engine (sapaan acak + info lengkap + CTA).
        let successMsg = null;
        try {
            const aiText = await getAiGroupAnnounce('open', {
                groupName: m.groupMetadata?.subject || undefined,
                actorName: m.pushName || undefined,
            });
            if (aiText) successMsg = aiText.replace("@{user}", `@${senderNum}`);
        } catch {}
        
        if (!successMsg) successMsg = buildFallbackAnnounce('open', {
            groupName: m.groupMetadata?.subject || undefined,
            senderNum,
            memberCount: m.groupMetadata?.participants?.length || 0,
        });
        
        await m.react("🐣");
        await m.reply(successMsg, { mentions: [m.sender] });
        
    } catch (error) {
        await m.reply(novaError("Open Group", `Gagal membuka grup: ${error.message}`));
    }
}

export { pluginConfig as config, handler }