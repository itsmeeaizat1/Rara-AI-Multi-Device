// RARA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { raraWrap, raraError, raraEmpty, raraGuide, raraNoInput } from "../../src/lib/rara-menu-style.js";
import { getAiGroupAnnounce, buildFallbackAnnounce } from "../../src/lib/rara-group-announce-ai.js";
const pluginConfig = {
    name: "open",
    alias: ["open", "opengc"],
    category: 'group',
    description: 'Membuka grup agar semua member bisa chat',
    usage: '.open <alasan (opsional)>',
    example: '.open sudah selesai',
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
                raraError("Open Group", "Grup sudah dalam keadaan terbuka kok! Semua member sudah bisa kirim pesan.")
            );
            return;
        }
        
        await sock.groupSettingUpdate(m.chat, 'not_announcement');
        
        const senderNum = m.sender.split('@')[0];
        const reason = (m.args?.join(" ") || "").trim();
        await m.react("🕒");
        
        // Pesan digenerate AI — berubah tiap kali grup dibuka kembali.
        // AI mati/timeout → fallback engine (sapaan acak + info lengkap + CTA).
        let successMsg = null;
        try {
            const aiText = await getAiGroupAnnounce('open', {
                groupName: m.groupMetadata?.subject || undefined,
                actorName: m.pushName || undefined,
                reason: reason || undefined,
            });
            if (aiText) successMsg = aiText.replace("@{user}", `@${senderNum}`);
        } catch {}
        
        if (!successMsg) successMsg = buildFallbackAnnounce('open', {
            groupName: m.groupMetadata?.subject || undefined,
            senderNum,
            memberCount: m.groupMetadata?.participants?.length || 0,
            reason: reason || undefined,
        });
        
        await m.react("🐣");
        await m.reply(successMsg, { mentions: [m.sender] });
        
    } catch (error) {
        await m.reply(raraError("Open Group", `Gagal membuka grup: ${error.message}`));
    }
}

export { pluginConfig as config, handler }