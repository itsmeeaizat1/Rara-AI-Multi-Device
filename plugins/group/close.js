// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { novaError, novaEmpty, novaGuide, novaNoInput, claraWrap } from "../../src/lib/nova-menu-style.js";
import { getAiGroupAnnounce, buildFallbackAnnounce } from "../../src/lib/nova-group-announce-ai.js";
const pluginConfig = {
    name: 'close',
    alias: ["close"],
    category: 'group',
    description: 'Menutup grup agar hanya admin yang bisa chat',
    usage: '.close <alasan (opsional)>',
    example: '.close spam link terus',
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
        
        if (groupMeta.announce) {
            await m.reply(claraWrap("Validasi Gagal", ["Grup sudah dalam keadaan `tertutup`.", "Hanya admin yang bisa mengirim pesan."].join("\n")));
            return;
        }
        
        await sock.groupSettingUpdate(m.chat, 'announcement');
        
        const senderNum = m.sender.split('@')[0];
        const reason = (m.args?.join(" ") || "").trim();
        await m.react("🕒");
        
        // Pesan digenerate AI — berubah tiap kali grup ditutup.
        // AI mati/timeout → fallback engine (sapaan acak + info lengkap + CTA).
        let successMsg = null;
        try {
            const aiText = await getAiGroupAnnounce('close', {
                groupName: m.groupMetadata?.subject || undefined,
                actorName: m.pushName || undefined,
                reason: reason || undefined,
            });
            if (aiText) successMsg = aiText.replace("@{user}", `@${senderNum}`);
        } catch {}
        
        if (!successMsg) successMsg = buildFallbackAnnounce('close', {
            groupName: m.groupMetadata?.subject || undefined,
            senderNum,
            memberCount: m.groupMetadata?.participants?.length || 0,
            reason: reason || undefined,
        });
        
        await m.react("🐣");
        await m.reply(successMsg, { mentions: [m.sender] });
        
    } catch (error) {
        await m.reply(claraWrap("Error", ["Gagal menutup grup.", `_${error.message}_`].join("\n")));
    }
}

export { pluginConfig as config, handler }