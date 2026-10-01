// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
import axios from "axios";
import te from "../../src/lib/rara-error.js";
import { raraError, raraEmpty, raraGuide, raraNoInput, raraWrap } from "../../src/lib/rara-menu-style.js";

const pluginConfig = {
  name: "pintereststalk",
  alias: ["pintereststalk"],
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
    return m.reply(raraWrap("pintereststalk", "❌ *Waduh, username Pinterest-nya belum dimasukkan!*\n\nKamu harus mengetikkan username Pinterest yang ingin di-stalk. \n\n💡 *Contoh:* `.pintereststalk dims`"));
  }
  try {
    const res = await axios.get(`https://api.nexray.eu.cc/stalker/pinterest?username=${encodeURIComponent(username)}`, {
      timeout: 30000,
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"
      }
    });
    
    const data = res.data;

    if (!data.status || !data.result) {
      return m.reply(raraWrap("pintereststalk", `⚠️ *Pencarian Gagal!*\n\nUsername *${username}* tidak ditemukan di Pinterest. Pastikan penulisannya sudah benar ya.`));
    }

    const r = data.result;
    
    let caption = `📌 *pinterest stalk - profile info* 📌\n\n`;
    caption += `Halo! Ini dia hasil pencarian profil untuk username *@${r.username}*:\n\n`;
    
    caption += `👤 *info profil*\n`;
    caption += `  - Nama Lengkap: *${r.full_name || "-"}*\n`;
    caption += `  - Username: @${r.username}\n`;
    caption += `  - Bio: ${r.bio || "-"}\n`;
    caption += `  - Tipe Akun: ${r.account_type || "-"}\n`;
    caption += `  - Akun Dibuat: ${r.created_at || "-"}\n\n`;
    
    caption += `📊 *statistik*\n`;
    caption += `  - Pengikut (Followers): ${r.stats?.followers || 0}\n`;
    caption += `  - Diikuti (Following): ${r.stats?.following || 0}\n`;
    caption += `  - Total Pin: ${r.stats?.pins || 0}\n`;
    caption += `  - Total Board: ${r.stats?.boards || 0}\n\n`;
    
    caption += `🔗 *link profil*\n`;
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
  } catch (error) {
    console.error("[Pinterest Stalk]", error.message);
    m.reply(raraWrap("pintereststalk", "😔 *terjadi masalah di sistem kami.* \n\nSistem gagal menarik data dari server Pinterest. Silakan coba beberapa saat lagi ya."));
  }
}

export { pluginConfig as config, handler };
