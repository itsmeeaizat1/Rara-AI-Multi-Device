// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// geminiimgv2 — Gemini AI v2 dengan image support
import { claraWrap } from "../../src/lib/nova-menu-style.js";
import te from "../../src/lib/nova-error.js";

const pluginConfig = {
  name: "geminiimgv2", alias: ["geminiimgv2"], aliases: ["geminiimgv2", "geminiaiv2"],
  category: "ai", description: "Gemini AI v2 — chat + image recognition",
  usage: ".geminiimgv2 <pertanyaan> atau reply gambar dengan caption",
  example: ".geminiimgv2 apa itu machine learning",
  isOwner: false, isPremium: false, isGroup: false, isPrivate: false, cooldown: 8, energi: 2, isEnabled: true,
};

async function uploadToTmp(buffer) {
  const form = new FormData();
  form.append("file", new Blob([buffer]), "image.jpg");
  const res = await fetch("https://tmpfiles.org/api/v1/upload", { method: "POST", body: form });
  const data = await res.json();
  return data?.data?.url?.replace("tmpfiles.org/", "tmpfiles.org/dl/") || null;
}

async function handler(m, { sock }) {
  try {
    const text = m.args.join(" ").trim();
    const isImage = m.mtype === "imageMessage" || (m.quoted?.mtype === "imageMessage");
    if (!text && !isImage) return m.reply(claraWrap("geminiimgv2", `Chat atau kirim gambar.\nContoh: ${m.prefix}geminiimgv2 apa itu AI`, "guide"));
    await m.react("🕒");
    if (isImage) {
      const quoted = m.quoted || m;
      const buffer = await quoted.download();
      const imgUrl = await uploadToTmp(buffer);
      if (!imgUrl) return m.reply(claraWrap("geminiimgv2", "Gagal upload gambar.", "error"));
      const res = await fetch(`https://gemini-api-5k0h.onrender.com/gemini/image?q=What%20is%20this%20picture?&url=${encodeURIComponent(imgUrl)}`);
      const data = await res.json();
      await m.reply("🖼️ Deskripsi: " + (data?.content || "Gagal deskripsi gambar."));
    } else {
      const res = await fetch(`https://gemini-api-5k0h.onrender.com/gemini/chat?q=${encodeURIComponent(text)}`);
      const data = await res.json();
      await m.reply(data?.content || "Gagal mendapatkan respons.");
    }
    await m.react("🐣");
  } catch (e) {
    console.error("geminiimgv2 error:", e.message);
    await m.react("❌");
    return m.reply(claraWrap("geminiimgv2", te(m.prefix, m.command, m.pushName), "error"));
  }
}
export { pluginConfig as config, handler };
