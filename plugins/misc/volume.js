// RARA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// volume.js — Adjust audio volume
import te from "../../src/lib/rara-error.js";
import { raraWrap } from "../../src/lib/rara-menu-style.js";

const pluginConfig = {
  name: "volume",
  alias: ["volume", "vol"],
  category: "misc",
  description: "Ubah volume audio (reply audio)",
  usage: ".volume <1-100> (reply audio)",
  example: ".volume 50",
  isOwner: false, isPremium: false, isGroup: false, isPrivate: false,
  cooldown: 10, energi: 3, isEnabled: true,
};

async function handler(m, { sock }) {
  try {
    const from = m.key.remoteJid;
    const quoted = m.quoted;
    if (!quoted || quoted.mtype !== "audioMessage") {
      return m.reply(raraWrap("volume", "Reply audio yang ingin diubah volumenya!", "guide"));
    }
    const vol = parseInt(m.args?.[0]) || 50;
    if (vol < 1 || vol > 100) return m.reply(raraWrap("volume", "Volume harus 1-100!", "guide"));

    await m.react("🕒");
    const buffer = await quoted.download();
    if (!buffer) return m.reply(raraWrap("volume", "Gagal mengunduh audio!", "error"));

    // Use ffmpeg to change volume
    const { execSync } = await import("child_process");
    const fs = await import("fs");
    const tmpIn = `/tmp/vol_in_${Date.now()}.mp3`;
    const tmpOut = `/tmp/vol_out_${Date.now()}.mp3`;
    fs.writeFileSync(tmpIn, buffer);
    execSync(`ffmpeg -i ${tmpIn} -filter:a "volume=${vol / 100}" ${tmpOut} -y`);

    const outBuf = fs.readFileSync(tmpOut);
    fs.unlinkSync(tmpIn);
    fs.unlinkSync(tmpOut);

    await sock.sendMessage(from, {
      audio: outBuf,
      mimetype: "audio/mpeg",
      ptt: quoted.message?.audioMessage?.ptt || false,
    }, { quoted: m });
    await m.react("🐣");
  } catch (err) {
    console.error("volume error:", err);
    await m.react("❌");
    return m.reply(raraWrap("volume", te(m.prefix, m.command, m.pushName), "error"));
  }
}

export { pluginConfig as config, handler };
