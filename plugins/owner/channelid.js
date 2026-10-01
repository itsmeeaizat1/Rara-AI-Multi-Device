// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
// .channelid — CONVERT URL/INVITE SALURAN WA → ID NEWSLETTER (120363xxx@newsletter)
// Request owner 19 Sep 2026: "g ada fitur url saluran wa convert jadi id newsletternya".
// Berguna buat: .setchannel manual, target broadcast saluran, integrasi fitur channel lain.
import { raraWrap } from "../../src/lib/rara-menu-style.js";
import { resolveNewsletterJid, normalizeNewsletterMeta } from "../../src/lib/rara-saluran.js";
import config from "../../config.js";

const pluginConfig = {
  name: "channelid",
  alias: ["saluranid", "idsaluran", "newsletterid", "saluraninfo"],
  category: "owner",
  description: "Convert URL saluran WhatsApp jadi ID newsletter (120363xxx@newsletter)",
  usage: ".channelid <url saluran | kode invite | ID@newsletter>",
  example: ".channelid https://whatsapp.com/channel/0029Vb97Nir9RZAWiwelWi29",
  isOwner: true,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 5,
  energi: 0,
  isEnabled: true,
};

// ekstrak kode invite dari berbagai format input
function extractInvite(input) {
  const s = String(input || "").trim();
  // link penuh (boleh pake ?mode= dll)
  let m = /whatsapp\.com\/channel\/([A-Za-z0-9_-]+)/.exec(s);
  if (m) return m[1];
  // link invite variasi
  m = /whatsapp\.com\/invite\/([A-Za-z0-9_-]+)/.exec(s);
  if (m) return m[1];
  // kode polos (mirip format invite channel: 22-32 char alnum)
  if (/^[A-Za-z0-9_-]{18,}$/.test(s)) return s;
  return null;
}

async function handler(m, { sock }) {
  await m.react("🕒");

  const input = (m.args || []).join(" ").trim();

  // tanpa arg → convert saluran config saat ini (buat cek cepat)
  if (!input) {
    await m.react("🐣");
    return m.reply(raraWrap("Saluran ID", [
      "Cara pakai:",
      `Ketik *.channelid <url saluran>* contoh:`,
      `.channelid https://whatsapp.com/channel/0029Vb97Nir9RZAWiwelWi29`,
      "",
      "Input yang diterima:",
      "1. Link saluran WA (whatsapp.com/channel/...)",
      "2. Kode invite polos",
      "3. ID newsletter (validasi + info lengkap)",
      "",
      "Saluran utama bot sekarang:",
      `Link : ${config.saluran?.link || "-"}`,
      `ID config : ${config.saluran?.id || "-"}`,
      `Mau ID numeriknya? Ketik *.channelid cek*`,
    ].join("\n")));
  }

  // mode cepat: resolve saluran config sendiri
  if (["cek", "config", "utama"].includes(input.toLowerCase())) {
    const jid = await resolveNewsletterJid(sock).catch(() => null);
    await m.react("🐣");
    return m.reply(raraWrap("Saluran Utama", [
      `ID : ${jid || "-"}`,
      `Link : ${config.saluran?.link || "-"}`,
      `Nama : ${config.saluran?.name || "-"}`,
    ].join("\n")));
  }

  // input ID newsletter langsung → validasi + info
  if (input.includes("@newsletter")) {
    const jid = input.split(/[\s?]/)[0].trim();
    if (!/^\d+@newsletter$/.test(jid)) {
      await m.react("❌");
      return m.reply(raraWrap("Saluran ID", [
        `Format ID salah: ${jid}`,
        "Format bener: 120363xxx@newsletter (angka + @newsletter)",
      ].join("\n")));
    }
    await m.react("🔍");
    let meta = null;
    try {
      meta = normalizeNewsletterMeta(await sock.newsletterMetadata("jid", jid).catch(() => null));
    } catch {}
    await m.react("🐣");
    return m.reply(raraWrap("Saluran ID", [
      `ID : ${jid}`,
      `Nama : ${meta?.name || "(metadata gak kebaca)"}`,
      `Follower : ${meta?.followers != null ? meta.followers.toLocaleString("id-ID") : "-"}`,
      `Status : ${meta?.state || "-"}`,
      `Verified : ${meta?.verification === "VERIFIED" ? "✅ ya" : "❌ bukan"}`,
      "",
      meta?.id ? "ID valid & aktif ✅" : "ID gak bisa diverifikasi (saluran gak ada / bot gak join)",
    ].join("\n")));
  }

  // URL / kode invite → resolve jadi ID
  const invite = extractInvite(input);
  if (!invite) {
    await m.react("❌");
    return m.reply(raraWrap("Saluran ID", [
      "Input gak dikenali sebagai link/kode saluran.",
      "",
      "Contoh bener:",
      ".channelid https://whatsapp.com/channel/0029Vb97Nir9RZAWiwelWi29",
      ".channelid 0029Vb97Nir9RZAWiwelWi29",
    ].join("\n")));
  }

  await m.react("🔍");
  let meta = null;
  try {
    meta = normalizeNewsletterMeta(await sock.newsletterMetadata("invite", invite).catch(() => null));
  } catch {}

  if (!meta?.id || !/^\d+@newsletter$/.test(meta.id)) {
    await m.react("❌");
    return m.reply(raraWrap("Saluran ID", [
      "Gagal dapat ID dari link/kode tersebut.",
      "Kemungkinan:",
      "1. Link salah / saluran udah dihapus",
      "2. Kode invite gak bener",
      "",
      `Kode yang dicoba: ${invite}`,
    ].join("\n")));
  }

  await m.react("🐣");
  const lines = [
    `ID : ${meta.id}`,
    `Link : https://whatsapp.com/channel/${invite}`,
    `Nama : ${meta.name || "-"}`,
    `Follower : ${meta.followers != null ? meta.followers.toLocaleString("id-ID") : "-"}`,
    `Status : ${meta.state || "-"}`,
    `Verified : ${meta.verification === "VERIFIED" ? "✅ ya" : "❌ bukan"}`,
    "",
    "Mau jadiin saluran utama bot? Ketik:",
    `.setchannel https://whatsapp.com/channel/${invite}`,
  ];
  return m.reply(raraWrap("Saluran ID — Convert URL → Newsletter ID", lines.join("\n")));
}

export { pluginConfig as config, handler };
