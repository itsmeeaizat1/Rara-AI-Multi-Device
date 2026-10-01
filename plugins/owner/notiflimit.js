// RARA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { getDatabase } from "../../src/lib/rara-database.js";
import { raraWrap } from "../../src/lib/rara-menu-style.js";

const pluginConfig = {
    name: "notiflimit",
    alias: ["notiflimit"],
    category: "owner",
    description: "Mengaktifkan atau mematikan notifikasi potong limit secara global.",
    usage: ".notiflimit",
    example: ".notiflimit",
    isOwner: true,
    isPremium: false,
    isGroup: false,
    isPrivate: false,
    cooldown: 0,
    energi: 0,
    isEnabled: true,
};

async function handler(m, { sock }) {
    const db = getDatabase();

    const currentStatus = db.setting("notiflimit") ?? false;
    db.setting("notiflimit", !currentStatus);

    const newStatus = db.setting("notiflimit") ? "AKTIF ✅" : "MATI ❌";

    await m.reply(raraWrap("NOTIFIKASI LIMIT (GLOBAL)", `Status saat ini: *${newStatus}*\n\nKetika aktif, bot akan selalu memberitahu sisa limit SEMUA PENGGUNA setiap kali ada pemotongan saat menggunakan fitur bot.`));
}

export { pluginConfig as config, handler };
