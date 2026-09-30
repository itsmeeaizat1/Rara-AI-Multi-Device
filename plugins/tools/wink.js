// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// Plugin .wink — enhance/restorasi foto AI Meitu (port engine lama wink.js, tanpa key)
import crypto from "crypto";
import { novaGuide, novaError, claraWrap } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "wink",
  alias: ["enhanceai", "restoreai"],
  category: "tools",
  description: "Enhance/restorasi foto jadi HD via AI Meitu (reply foto atau kasih URL)",
  usage: ".wink (reply foto) | .wink <url foto>",
  example: ".wink (reply foto lama)",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: true,
  cooldown: 10,
  energi: 0,
  isEnabled: true,
};

const HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  Referer: "https://www.designkit.cn/quality",
  Origin: "https://www.designkit.cn",
};

export async function enhance(imageInput) {
  let buf = null;
  if (typeof imageInput === "string" && imageInput.startsWith("http")) {
    const res = await fetch(imageInput, { signal: AbortSignal.timeout(25000) });
    buf = Buffer.from(await res.arrayBuffer());
  }
  if (!buf && Buffer.isBuffer(imageInput)) buf = imageInput;
  if (!buf) throw new Error("Gagal baca file/URL gambar");

  const policyRes = await fetch("https://strategy.app.meitudata.com/upload/policy?app=xiuxiu-pro&count=1&suffix=jpeg&type=ai_quality", {
    headers: HEADERS, signal: AbortSignal.timeout(15000),
  });
  const policyData = await policyRes.json();
  const qiniu = policyData?.[0]?.qiniu;
  if (!qiniu?.token) throw new Error("Gagal dapat token upload");

  const form = new FormData();
  form.append("token", qiniu.token);
  if (qiniu.key) form.append("key", qiniu.key);
  form.append("file", new Blob([buf], { type: "image/jpeg" }), "image.jpg");
  const upRes = await fetch("https://up-qagw.meitudata.com/", { method: "POST", body: form });
  const upData = await upRes.json();
  const cloudUrl = upData?.data;
  if (!cloudUrl) throw new Error("Gagal upload ke cloud Meitu");

  const gid = "1a08f8" + crypto.randomBytes(6).toString("hex");
  const taskRes = await fetch("https://webapi.designkit.cn/v3/mtlab/image_restoration_async?gid=" + gid, {
    method: "POST",
    headers: { ...HEADERS, "Content-Type": "application/json" },
    body: JSON.stringify({
      parameter: { rsp_media_type: "url", custom_size_flag: 1, create_value: 100, hdr_value: 0, resemblance_value: 80, save_photo_format: 1 },
      media_info_list: [{ media_data: cloudUrl, media_extra: {}, media_profiles: { media_data_type: "url" } }],
      extra: {},
    }),
    signal: AbortSignal.timeout(15000),
  });
  const taskData = await taskRes.json();
  const msgId = taskData?.data?.msg_id || taskData?.msg_id;
  if (!msgId) throw new Error("Gagal bikin tugas AI");

  for (let i = 0; i < 30; i++) {
    await new Promise((r) => setTimeout(r, 1200));
    const qRes = await fetch("https://webapi.designkit.cn/v1/mtlab/query_multi?msg_ids=" + msgId, { headers: HEADERS, signal: AbortSignal.timeout(15000) });
    const qData = await qRes.json();
    const media = qData?.data?.[0]?.media_info_list?.[0];
    if (media?.media_data) {
      return {
        url: media.media_data,
        width: media.media_profiles?.media_data_width || null,
        height: media.media_profiles?.media_data_height || null,
      };
    }
  }
  throw new Error("Proses AI timeout");
}

async function handler(m, { sock, config: botConfig }) {
  const prefix = botConfig.command?.prefix || ".";
  try {
    await m.react("🧠");
    const urlInput = (m.text || "").replace(new RegExp("^" + prefix + "wink\\s*", "i"), "").trim();
    const quoted = m.quoted;
    const mime = quoted?.mimetype || quoted?.mediaType || "";
    if (!mime && !urlInput) {
      await m.react("🐣");
      await m.reply(novaGuide(
        "wink",
        "Enhance/restorasi foto jadi HD pakai AI Meitu (tanpa key, gratis).",
        prefix + "wink (reply foto) — atau " + prefix + "wink <url foto>",
        "Khusus JPG/PNG/WEBP. Hasil dikirim sebagai foto PNG HD."
      ));
      return { handled: true };
    }
    if (mime && !/image\/(jpeg|jpg|png|webp)/i.test(mime)) {
      await m.react("❌");
      await m.reply(novaError("Wink", "Media harus gambar (JPG/PNG/WEBP)"));
      return { handled: true };
    }
    const input = mime ? await quoted.download() : urlInput;
    const result = await enhance(input);
    const res = await fetch(result.url, { signal: AbortSignal.timeout(120000) });
    const buf = Buffer.from(await res.arrayBuffer());
    await m.react("⚡");
    await sock.sendMessage(m.chat, {
      image: buf,
      caption: claraWrap("Wink", "Enhance selesai" + (result.width && result.height ? " (" + result.width + "x" + result.height + ")" : "")),
      mimetype: "image/png",
    }, { quoted: m });
  } catch (error) {
    console.error("[wink]:", error.message);
    await m.react("❌");
    await m.reply(novaError("Wink", "Gagal: " + String(error.message).slice(0, 120)));
  }
  return { handled: true };
}

export { pluginConfig as config, handler }
