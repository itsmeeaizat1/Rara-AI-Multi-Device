// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// ═══════════════════════════════════════════════════════════════════════
// CHATREVIVE — fitur grup "deteksi dead chat + revive" (30 Sep 2026)
// Grup sepi > N jam (default 6) → bot kirim 1 pertanyaan/fakta seru
// bikinan AI yang nyambung topik terakhir grup. Bukan template.
// Admin grup & owner yang atur. Sub: on/off/jam/status/tes.
// ═══════════════════════════════════════════════════════════════════════

import {
  claraWrap,
  toSC,
  bracketBox,
  tipText,
} from "../../src/lib/nova-menu-style.js";
import {
  enableChatRevive,
  disableChatRevive,
  setChatReviveThreshold,
  getChatReviveStatus,
  testChatRevive,
} from "../../src/lib/nova-chat-revive.js";

const pluginConfig = {
  name: "chatrevive",
  alias: ["revive", "chatrevive", "bangunkanchat", "antisepei"],
  category: "group",
  description: "Deteksi grup sepi lalu kirim pertanyaan seru bikinan AI yang nyambung topik terakhir",
  usage: ".chatrevive <on/off/jam/status/tes> [jam]",
  example: ".chatrevive jam 3",
  isAdmin: true,      // admin grup / owner doang yang boleh atur
  isGroup: true,      // cuma di grup
  isOwner: false,
  isPremium: false,
  isPrivate: false,
  cooldown: 5,
  energi: 0,
  isEnabled: true,
};

async function handler(m, { sock }) {
  // m.args udah command-stripped dari serialize (pola absenjam) — JANGAN
  // split m.text utuh (args[0] bakal jadi command-nya sendiri).
  const args = m.args || [];
  const action = (args[0] || "").toLowerCase();
  const jid = m.chat;
  const reply = (text) => sock.sendMessage(jid, { text }, { quoted: m });

  if (!action) {
    return reply(bracketBox("🪄", toSC("Chat Revive"), [
      toSC("Nyalain lagi obrolan grup yang sepi"),
      toSC("Pesan dibikin AI, nyambung topik terakhir"),
      "",
      "🧠 " + toSC("Cara pakai: .chatrevive <sub>"),
      "",
      toSC("Sub command:"),
      "• " + toSC("on — nyalain fitur di grup ini"),
      "• " + toSC("off — matiin fitur"),
      "• " + toSC("jam <1-24> — atur batas sepi sebelum revive (default 6)"),
      "• " + toSC("status — lihat kondisi fitur di grup ini"),
      "• " + toSC("tes — coba kirim 1 revive sekarang"),
      "",
      "📍 " + toSC("Contoh: .chatrevive on lalu .chatrevive jam 3"),
      "📍 " + toSC("Maksimal 3 revive per hari per grup, biar gak nyepam"),
      tipText(toSC("Hanya admin grup & owner yang bisa mengatur fitur ini")),
    ]));
  }

  if (action === "on") {
    const r = enableChatRevive(jid);
    return reply(bracketBox("🐣", toSC("Chat Revive Aktif"), [
      toSC("Kalau grup sepi lebih dari") + " " + r.thresholdHours + " " + toSC("jam"),
      toSC("bot kirim 1 pertanyaan seru bikinan AI"),
      toSC("yang nyambung topik terakhir grup"),
      "",
      "📍 " + toSC("Atur batas sepi: .chatrevive jam <1-24>"),
    ]));
  }

  if (action === "off") {
    disableChatRevive(jid);
    return reply(bracketBox("❌", toSC("Chat Revive Mati"), [
      toSC("Fitur revive grup sepi udah dimatiin di grup ini"),
    ]));
  }

  if (action === "jam") {
    const jam = args[1];
    if (!jam) {
      const st = getChatReviveStatus(jid);
      return reply(bracketBox("⏰", toSC("Batas Sepi Saat Ini"), [
        toSC("Grup dianggap sepi setelah") + " " + st.thresholdHours + " " + toSC("jam tanpa obrolan"),
        "",
        "📍 " + toSC("Ubah: .chatrevive jam <1-24>"),
      ]));
    }
    const r = setChatReviveThreshold(jid, jam);
    if (!r.ok) {
      return reply(claraWrap("chatrevive", toSC("Batas sepi harus angka bulat antara 1 sampai 24 jam. Contoh: .chatrevive jam 3")));
    }
    return reply(bracketBox("✅", toSC("Batas Sepi Diubah"), [
      toSC("Grup dianggap sepi setelah") + " " + r.thresholdHours + " " + toSC("jam tanpa obrolan"),
    ]));
  }

  if (action === "status") {
    const st = getChatReviveStatus(jid);
    return reply(bracketBox("🪄", toSC("Status Chat Revive"), [
      toSC("Fitur") + ": " + (st.on ? toSC("aktif ✅") : toSC("mati ❌")),
      toSC("Batas sepi") + ": " + st.thresholdHours + " " + toSC("jam"),
      toSC("Sudah sepi") + ": " + (st.sepiJam === null ? toSC("belum ada aktivitas tercatat") : st.sepiJam + " " + toSC("jam")),
      toSC("Revive hari ini") + ": " + st.todayCount + "/3",
      "📍 " + toSC("Coba langsung: .chatrevive tes"),
    ]));
  }

  if (action === "tes" || action === "now") {
    const r = await testChatRevive(sock, jid);
    if (!r.sent) {
      return reply(claraWrap("chatrevive", toSC("AI-nya lagi gak bisa bikin pesan sekarang. Fitur jalan otomatis kalau grup sepi — coba lagi nanti ya")));
    }
    return; // pesan revive udah kekirim oleh engine, gak perlu bunyi lagi
  }

  // sub gak dikenal → guide jujur
  return reply(bracketBox("🤔", toSC("Sub Tidak Dikenal"), [
    toSC("Sub yang dikenal: on, off, jam, status, tes"),
    "",
    "📍 " + toSC("Lihat semua: .chatrevive"),
  ]));
}

export { pluginConfig as config, handler };
