// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
// ============================================================
// 🔹 TELPON — Voice Agent (request owner 12 Sep 2026, ide fitur no 2)
// 🔹 .telpon on → semua VN kamu dijawab pakai suara (STT → AI → TTS)
// 🔹 .telpon <teks> → jawab satu kali pakai VN
// 🔹 .telpon suara <nama> → ganti voice (Gadis/Ardi/Siti/dll)
// ============================================================
import { raraWrap } from "../../src/lib/rara-menu-style.js";
import {
  isTelponOn, setTelponMode, getTelponVoice, setTelponVoice,
  telponSpeak, handleTelponVn,
} from "../../src/lib/rara-telpon.js";
import { HAIDAR_VOICES } from "../../src/scraper/haidar-ai.js";

const pluginConfig = {
  name: "telpon",
  alias: ["telpon"],
  category: "ai",
  description: "Voice agent — ngobrol pakai suara ala telepon",
  usage: ".telpon on/off\n.telpon <teks> — sekali tanya, dijawab VN\n.telpon suara <nama> — ganti voice",
  example: ".telpon on\n.telpon apa kabar?",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 5,
  energi: 1,
  isEnabled: true,
};

async function handler(m, { sock, db, config } = {}) {
  const args = (m.args || []).map(String);
  const sub = (args[0] || "").toLowerCase();
  const on = isTelponOn(db, m.chat);
  const voice = getTelponVoice(db, m.sender);

  // ── on / off ──
  if (sub === "on" || sub === "off") {
    if (sub === "on" && on) {
      return m.reply(raraWrap("Telpon", [`📞 Mode telepon udah AKTIF di chat ini.`]));
    }
    setTelponMode(db, m.chat, sub === "on");
    await m.react("🐣");
    if (sub === "on") {
      return m.reply(raraWrap("Telpon", [
        `📞 Mode telepon AKTIF!`,
        ``,
        `Kirim voice note apa aja — aku dengerin terus jawab pakai suara. Otaknya sama kayak .raraagent: inget obrolan + kenangan kamu.`,
        `Matikan: ${m.prefix}telpon off`,
      ]));
    }
    return m.reply(raraWrap("Telpon", [`📴 Mode telepon mati. Ngobrol lagi: ${m.prefix}telpon on`]));
  }

  // ── suara <nama> ──
  if (sub === "suara" || sub === "voice") {
    const picked = (args[1] || "").replace(/^./, (c) => c.toUpperCase());
    if (!picked || !HAIDAR_VOICES.includes(picked)) {
      return m.reply(raraWrap("Telpon", [
        `🎤 Voice kamu sekarang: ${voice}`,
        ``,
        `Pilihan voice:`,
        HAIDAR_VOICES.slice(0, 18).map((v) => `• ${v}`).join("\n"),
        ``,
        `Ganti: ${m.prefix}telpon suara <nama> — contoh ${m.prefix}telpon suara Ardi`,
      ]));
    }
    setTelponVoice(db, m.sender, picked);
    await m.react("🐣");
    return m.reply(raraWrap("Telpon", [`✅ Voice diganti jadi ${picked}.`]));
  }

  // ── teks → dijawab VN (one-shot) ──
  const text = (args || []).join(" ").trim();
  if (text) {
    return telponSpeak(m, sock, db, config, text);
  }

  // ── VN reply-quotan → langsung diproses (tanpa nyalain mode) ──
  if (m.quoted?.isAudio) {
    return handleTelponVn(m, sock, db, config);
  }

  // ── default: status + panduan ──
  return m.reply(raraWrap("Telpon", [
    `📞 Voice agent — ngobrol pakai suara ala telepon.`,
    ``,
    `Status chat ini: ${on ? "🟢 AKTIF — semua VN dijawab suara" : "🔴 mati"}`,
    `Voice kamu: ${voice}`,
    ``,
    `• ${m.prefix}telpon on — nyalain mode telepon (VN → dijawab VN)`,
    `• ${m.prefix}telpon <teks> — sekali tanya, dijawab VN`,
    `• reply VN + ${m.prefix}telpon — transkrip & jawab VN itu`,
    `• ${m.prefix}telpon suara <nama> — ganti voice`,
  ]));
}

export { pluginConfig as config, handler };
