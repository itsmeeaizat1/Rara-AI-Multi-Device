// RARA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { getDatabase } from "../../src/lib/rara-database.js";
import {  raraWrap, raraLine, raraCaption } from "../../src/lib/rara-menu-style.js";

const pluginConfig = {
    name: "setaudioallmenu",
    alias: ["setaudioallmenu"],
    category: "owner",
    description: "Mengatur gaya audio untuk All Menu",
    usage: ".setaudioallmenu <1-4>",
    example: ".setaudioallmenu 1",
    isOwner: true,
    isPremium: false,
    isGroup: false,
    isPrivate: false,
    cooldown: 0,
    energi: 0,
    isEnabled: true
};

async function handler(m, { sock }) {
    const db = getDatabase();
    const args = m.text?.trim();

    if (!args) {
        return await m.reply(raraCaption({
  emoji: "🎵",
  name: "setaudioallmenu",
  description: "Mengatur gaya audio untuk All Menu",
  usage: `${m.prefix}setaudioallmenu <1-4>`,
  example: `${m.prefix}setaudioallmenu 1`,
}));
    }

    const newStyle = parseInt(args);
    if (isNaN(newStyle) || newStyle < 1 || newStyle > 4) {
        return m.reply(raraWrap("setaudioallmenu", `❌ *GAGAL*\n\nPilihan varian audio harus berupa angka 1 sampai 4.\n💡 *Contoh:* *${m.prefix}setaudioallmenu 2*`));
    }
    db.setting("allmenuAudioStyle", newStyle);
    await m.reply(raraWrap("Setaudioallmenu", `✅ *BERHASIL*\n\nGaya audio All Menu telah sukses diubah menjadi *Varian ${newStyle}*. Silakan tes dengan mengetik *${m.prefix}allmenu*.`));
}

export { pluginConfig as config, handler };
