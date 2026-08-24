// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import axios from "axios";
import te from "../../src/lib/nova-error.js";
import { claraWrap } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "pintereststalk",
  alias: ["pinterestid", "stalkpinterest", "stalkpin"],
  category: "stalker",
  description: "Melihat informasi lengkap akun Pinterest berdasarkan username.",
  usage: ".pintereststalk <username>",
  example: ".pintereststalk dims",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 10,
  energi: 1,
  isEnabled: true,
};

async function handler(m, { sock }) {
  const username = m.text?.trim() || m.args[0];

  if (!username) {
    return m.reply(claraWrap("pintereststalk", "❌ *Waduh, username Pinterest-nya belum dimasukkan!*\n\nKamu harus mengetikkan username Pinterest yang ingin di-stalk. \n\nContoh: `.pintereststalk dims`"));
  }

  await m.react("🕒");

  try {
    const res = await axios.get(`https://api.nexray.eu.cc/stalker/pinterest?username=${encodeURIComponent(username)}`, {
      timeout: 30000,
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"
      }
    });
    
    const data = res.data;

    if (!data.status || !data.result) {
      return m.reply(claraWrap("pintereststalk", `⚠️ *Pencarian Gagal!*\n\nUsername *${username}* tidak ditemukan di Pinterest. Pastikan penulisannya sudah benar ya.`));
    }

    const r = data.result;
    
    let caption = `📌 *ᴘɪɴᴛᴇʀᴇꜱᴛ ꜱᴛᴀʟᴋ - ᴘʀᴏꜰɪʟᴇ ɪɴꜰᴏ* 📌\n\n`;
    caption += `Halo! Ini dia hasil pencarian profil untuk username *@${r.username}*:\n\n`;
    
    caption += `👤 *ɪɴꜰᴏ ᴘʀᴏꜰɪʟ*\n`;
    caption += `  - Nama Lengkap: *${r.full_name || "-"}*\n`;
    caption += `  - Username: @${r.username}\n`;
    caption += `  - Bio: ${r.bio || "-"}\n`;
    caption += `  - Tipe Akun: ${r.account_type || "-"}\n`;
    caption += `  - Akun Dibuat: ${r.created_at || "-"}\n\n`;
    
    caption += `📊 *ꜱᴛᴀᴛɪꜱᴛɪᴋ*\n`;
    caption += `  - Pengikut (Followers): ${r.stats?.followers || 0}\n`;
    caption += `  - Diikuti (Following): ${r.stats?.following || 0}\n`;
    caption += `  - Total Pin: ${r.stats?.pins || 0}\n`;
    caption += `  - Total Board: ${r.stats?.boards || 0}\n\n`;
    
    caption += `🔗 *ʟɪɴᴋ ᴘʀᴏꜰɪʟ*\n`;
    caption += `  - ${r.profile_url}\n\n`;

    caption += `Suka mengumpulkan inspirasi dari Pinterest ya? Pamerin ke temanmu yuk! 🚀`;

    const imageUrl = r.image?.original || r.image?.large || r.image?.medium || r.image?.small;

    if (imageUrl) {
      await sock.sendMessage(m.chat, {
        image: { url: imageUrl },
        caption: caption
      }, { quoted: m });
    } else {
      await m.reply(caption);
    }

    await m.react("🐣");

  } catch (error) {
    console.error("[Pinterest Stalk]", error.message);
    m.reply(claraWrap("pintereststalk", "😔 *ᴛᴇʀᴊᴀᴅɪ ᴍᴀꜱᴀʟᴀʜ ᴅɪ ꜱɪꜱᴛᴇᴍ ᴋᴀᴍɪ.* \n\nSistem gagal menarik data dari server Pinterest. Silakan coba beberapa saat lagi ya."));
  }
}

export { pluginConfig as config, handler };
