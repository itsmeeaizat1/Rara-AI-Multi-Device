// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
import axios from "axios";
import te from "../../src/lib/rara-error.js";
import { raraError, raraEmpty, raraGuide, raraNoInput, raraWrap } from "../../src/lib/rara-menu-style.js";
import { mediaResultCard, probeBuffer, probeMedia } from "../../src/lib/rara-media-result.js";

// kartu info media (batch stalker) — helper ringkas, best-effort tak pernah ganggu kirim
async function dlCard(type, probe, request) {
  try {
    const info = probe.buffer != null ? await probeBuffer(probe.buffer, { mime: probe.mime }) : await probeMedia(probe.url);
    return mediaResultCard({
      header: Array.isArray(pluginConfig.name) ? pluginConfig.name[0] : pluginConfig.name,
      type, request,
      size: info?.size, mime: info?.mime, width: info?.width, height: info?.height, duration: info?.duration,
    });
  } catch { return null; }
}


const pluginConfig = {
  name: "ffstalk",
  alias: ["ffstalk"],
  category: "stalker",
  description: "Melihat informasi lengkap akun Free Fire berdasarkan ID.",
  usage: ".ffstalk <id>",
  example: ".ffstalk 470699855",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 10,
  energi: 1,
  isEnabled: true,
};

async function handler(m, { sock }) {
  const uid = m.text?.trim() || m.args[0];

  if (!uid) {
    return m.reply(raraWrap("ffstalk", "❌ *Waduh, ID Free Fire-nya belum dimasukkan!*\n\nKamu harus mengetikkan UID pemain Free Fire yang ingin di-stalk. \n\n💡 *Contoh:* `.ffstalk 470699855`"));
  }
  try {
    const res = await axios.get(`https://api.nexray.eu.cc/stalker/freefire?uid=${uid}`, {
      timeout: 30000,
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"
      }
    });
    
    const data = res.data;

    if (!data.status || !data.result) {
      return m.reply(raraWrap("ffstalk", `⚠️ *Pencarian Gagal!*\n\nID *${uid}* tidak ditemukan atau API sedang bermasalah. Pastikan ID yang kamu masukkan sudah benar ya.`));
    }

    const r = data.result;
    
    let caption = `🔥 *free fire stalk - profile info* 🔥\n\n`;
    caption += `Halo! Ini dia hasil pencarian profil untuk UID *${r.uid}*:\n\n`;
    
    caption += `👤 *info dasar*\n`;
    caption += `  - Nama: *${r.name || "-"}*\n`;
    caption += `  - Level: ${r.level || "-"} (EXP: ${r.exp || "-"})\n`;
    caption += `  - Region: ${r.region || "-"}\n`;
    caption += `  - Likes: ${r.likes || "-"} ❤️\n`;
    caption += `  - Credit Score: ${r.credit_score || "-"}\n`;
    caption += `  - Bio: ${r.signature || "-"}\n\n`;
    
    caption += `🏆 *RANKING & AKTIVITAS*\n`;
    caption += `  - BR Rank Point: ${r.br_rank_point || "-"} (Max: ${r.br_max_rank || "-"})\n`;
    caption += `  - CS Rank Point: ${r.cs_rank_point || "-"} (Max: ${r.cs_max_rank || "-"})\n`;
    caption += `  - Season ID: ${r.season_id || "-"}\n`;
    caption += `  - Akun Dibuat: ${r.created_at || "-"}\n`;
    caption += `  - Terakhir Login: ${r.last_login || "-"}\n\n`;
    
    caption += `🛡️ *guild info*\n`;
    caption += `  - Nama Guild: ${r.guild_name && r.guild_name !== "None" ? r.guild_name : "Tidak ada guild"}\n`;
    if (r.guild_name && r.guild_name !== "None") {
      caption += `  - Level Guild: ${r.guild_level || "-"}\n`;
      caption += `  - Anggota: ${r.guild_member || "-"}/${r.guild_capacity || "-"}\n`;
      caption += `  - Ketua Guild: ${r.guild_leader_name || "-"} (UID: ${r.guild_leader_uid || "-"})\n`;
    }
    caption += `\n`;
    
    caption += `🐾 *pet info*\n`;
    caption += `  - Pet Level: ${r.pet_level || "-"}\n`;
    caption += `  - Pet EXP: ${r.pet_exp || "-"}\n\n`;
    
    caption += `🔧 *lainnya*\n`;
    caption += `  - Bahasa: ${r.language ? r.language.replace("Language_", "") : "-"}\n`;
    caption += `  - Mode Favorit: ${r.mode_prefer ? r.mode_prefer.replace("ModePrefer_", "") : "-"}\n\n`;

    caption += `Keren banget kan profilnya? Bagikan ke temanmu yuk! 🚀`;

    const isValidUrl = r.banner_image && (r.banner_image.startsWith("http://") || r.banner_image.startsWith("https://"));

    if (isValidUrl) {
      const card = await dlCard("gambar", { url: r.banner_image }, [["Engine", "API nexray.eu.cc"], ["Target", "UID " + r.uid], ["Judul", String(r.name || "-").slice(0, 40)], ["Level", String(r.level || "-")], ["Region", String(r.region || "-")], ["Likes", String(r.likes || "-")], ["BR Rank", String(r.br_rank_point || "-")], ["Guild", String(r.guild_name && r.guild_name !== "None" ? r.guild_name : "-").slice(0, 40)]]);
      await sock.sendMessage(m.chat, {
        image: { url: r.banner_image },
        caption: card ? `${caption}\n\n${card}` : caption
      }, { quoted: m });
    } else {
      await m.reply(caption);
    }
  } catch (error) {
    console.error("[FFStalk]", error.message);
    m.reply(raraWrap("ffstalk", "😔 *terjadi masalah di sistem kami.* \n\nSistem gagal menarik data dari server Free Fire. Silakan coba beberapa saat lagi ya."));
  }
}

export { pluginConfig as config, handler };
