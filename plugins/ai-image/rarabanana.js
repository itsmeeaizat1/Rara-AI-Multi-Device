// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
import { live3d } from "../../src/scraper/seaart.js";
import { raraError, raraEmpty, raraGuide, raraNoInput, raraWrap, raraLine } from "../../src/lib/rara-menu-style.js";
import { mediaResultCard, probeBuffer, probeMedia } from "../../src/lib/rara-media-result.js";
// kartu info media (batch search) - helper ringkas, best-effort tak pernah ganggu kirim
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
  name: "rarabanana",
  alias: ["rarabanana", "novabanana"],
  category: 'ai image',
  description: "Edit gambar dengan AI menggunakan prompt",
  usage: ".rarabanana <prompt>",
  example: ".rarabanana make it anime style",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 30,
  energi: 1,
  isEnabled: true,
};

async function handler(m, { sock }) {
  const prompt = m.args.join(" ");
  if (!prompt) {
    return m.reply(raraGuide("rarabanana", {
 kaomoji: "(๑˃ᴗ˂)ﻭ",
 sapaan: "edit gambar pakai AI Banana, tinggal bilang mau diubah jadi apa! (≧◡≦) ♡",
      cara: "reply/kirim gambar + caption perintah editnya",
      contoh: `${m.prefix}rarabanana make it anime style`,
      spec: ["⚡ energi 1", "⏱ 30dtk", "💸 gratis"],
    }));
  }

  const isImage = m.isImage || (m.quoted && m.quoted.isImage);
  if (!isImage) {
    return m.reply( raraWrap("Rarabanana", `🍌 *nano banana*\n\nReply atau kirim gambar dengan caption`), { commandName: "rarabanana" });
  }
  try {
  await m.react("🕒");
    let mediaBuffer;
    if (m.isImage && m.download) {
      mediaBuffer = await m.download();
    } else if (m.quoted && m.quoted.isImage && m.quoted.download) {
      mediaBuffer = await m.quoted.download();
    }

    if (!mediaBuffer || !Buffer.isBuffer(mediaBuffer)) {
      return m.reply(raraWrap("Gagal", `Gagal mengunduh gambar`));
    }

    const resultBuffer = await live3d(mediaBuffer, prompt).then(
      (res) => res.image,
    );
    const c = await dlCard("gambar", { buffer: resultBuffer }, [["Prompt", String(prompt).slice(0, 40)], ["Input", "Foto (reply)"], ["Engine", "SeaArt nano-banana"]]);
    await sock.sendMedia(m.chat, resultBuffer, null, m, {
      type: "image",
      caption: c || undefined,
    });
  } catch (error) {
    console.log(error);
    await m.react("🐣");
    m.reply(raraWrap("Rarabanana", `🍀 *Waduhh, sepertinya ini ada kendala*
Silahkan coba lagi nanti, dimohon jangan spam`));
  }
}

export { pluginConfig as config, handler };
