import { normalizeNewsletterMeta } from "../../src/lib/nova-saluran.js";
// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { novaWrap, toSC } from "../../src/lib/nova-menu-style.js";
import config from "../../config.js";

const pluginConfig = {
  name: "cekidch",
  alias: ["cekidch", "idch"],
  category: "tools",
  description: "Cek ID dan info channel WhatsApp dari link",
  usage: ".cekidch <link channel>",
  example: ".cekidch https://whatsapp.com/channel/xxxxx",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 5,
  energi: 0,
  isEnabled: true,
}

function formatDate(timestamp) {
  if (!timestamp) return "—";
  const ts = typeof timestamp === "number" && timestamp < 1e12 ? timestamp * 1000 : timestamp;
  const d = new Date(ts);
  if (isNaN(d.getTime())) return "—";
  const pad = n => String(n).padStart(2, "0");
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function formatSubs(count) {
  if (!count || count === 0) return "0";
  if (count >= 1_000_000) return (count / 1_000_000).toFixed(1).replace(/\.0$/, "") + "M";
  if (count >= 1_000) return (count / 1_000).toFixed(1).replace(/\.0$/, "") + "K";
  return String(count);
}

async function handler(m, { sock, args }) {
  const text = (m.text || "").trim();

  if (!text) {
    await m.reply(novaWrap("Cek ID Channel", [
      `📌 ${toSC("Cara Pakai")}:`,
      "",
      "`.cekidch https://whatsapp.com/channel/xxxxx`",
      "",
      `💡 ${toSC("Kirim link channel WhatsApp untuk cek info & ID")}`,
    ], "info"));
    return;
  }

  if (!text.includes("https://whatsapp.com/channel/")) {
    await m.reply(novaWrap("Cek ID Channel", "❌ Link tidak valid. Pastikan link dimulai dengan https://whatsapp.com/channel/", "error"));
    return;
  }

  // Extract invite code dari link
  const result = text.split("https://whatsapp.com/channel/")[1].trim();

  try {
    await m.react("🕒");
    const res = normalizeNewsletterMeta(await sock.newsletterMetadata("invite", result));

    if (!res || !res.id) {
      await m.react("🐣");
      await m.reply(novaWrap("Cek ID Channel", "❌ Channel tidak ditemukan. Pastikan link valid dan channel masih aktif.", "error"));
      return;
    }

    const chId = res.id;
    const chName = res.name || "Unknown";
    const chSubs = formatSubs(res.followers ?? 0);
    const chVerified = res.verification === "VERIFIED" ? "Terverifikasi" : "Tidak";
    const chCreated = formatDate(res.creation_time);
    const chDesc = res.description || "—";
    const chPicUrl = res.picture?.url || "";

    // Format text dengan smallcaps
    const lines = [
      `🆔 ${toSC("ID")}: \`${chId}\``,
      `🗒️ ${toSC("Nama")}: ${toSC(chName)}`,
      `👥 ${toSC("Pengikut")}: ${chSubs}`,
      `✅ ${toSC("Verifikasi")}: ${toSC(chVerified)}`,
      `📅 ${toSC("Dibuat")}: ${toSC(chCreated)}`,
    ];

    if (chDesc && chDesc !== "—") {
      const descPreview = chDesc.length > 100 ? chDesc.slice(0, 100) + "..." : chDesc;
      lines.push(`📝 ${toSC("Deskripsi")}: ${toSC(descPreview)}`);
    }

    const infoText = novaWrap(`📢 ${toSC("Channel Info")}`, lines, "success");

    // Kirim dengan tombol copy ID + buka channel
    const buttons = [
      {
        name: "cta_copy",
        buttonParamsJson: JSON.stringify({
          display_text: toSC("Salin ID Channel"),
          copy_code: chId,
        }),
      },
      {
        name: "cta_url",
        buttonParamsJson: JSON.stringify({
          display_text: toSC("Buka Channel"),
          url: text,
        }),
      },
    ];

    await sock.sendButton(m.chat, chPicUrl || null, infoText, m, {
      buttons,
      footer: config.bot?.name || "Nova-AI",
    });
  } catch (e) {
    await m.react("❌");
    console.error("[cekidch] Error:", e.message);
    await m.reply(novaWrap("Cek ID Channel", "❌ Terjadi kesalahan saat mengambil info channel. Coba lagi nanti.", "error"));
  }
}

export { pluginConfig as config, handler };
