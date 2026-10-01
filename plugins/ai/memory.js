// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// ============================================================
// 🔹 MEMORY ENGINE COMMAND — .memory (request owner 12 Sep 2026)
// 🔹 Lihat / cari / tambah / hapus kenangan yang bot simpan tentangmu
// 🔹 Toggle on/off buat auto-extract + auto-recall pas ngobrol .novaai
// 🔹 Kenangan persist di database — aman walau bot restart
// ============================================================
import { novaWrap, novaError } from "../../src/lib/nova-menu-style.js";
import {
  listMemories, addMemory, removeMemory, resetMemories,
  isMemoryOn, toggleMemory, relevantMemories,
} from "../../src/lib/nova-memory.js";

const pluginConfig = {
  name: "memory",
  alias: ["memory"],
  category: "ai",
  description: "Kenangan bot tentangmu — lihat/cari/tambah/hapus + on/off",
  usage: ".memory [cari <q> / add <fakta> / hapus <no> / reset / on / off]",
  example: ".memory",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 3,
  energi: 0,
  isEnabled: true,
};

function fmtAge(ts) {
  const d = Math.floor((Date.now() - Number(ts || 0)) / 86400000);
  if (d <= 0) return "hari ini";
  if (d === 1) return "kemarin";
  if (d < 30) return d + " hari lalu";
  return Math.floor(d / 30) + " bln lalu";
}

function listBox(m, facts, header) {
  const lines = facts.map((f, i) => `${i + 1}. ${f.text} _(${fmtAge(f.ts)})_`);
  return novaWrap(header, [
    `📌 Kenangan bot tentang kamu:`,
    ``,
    ...lines,
    ``,
    `💡 Hapus: ${m.prefix}memory hapus <nomor>`,
  ]);
}

async function handler(m, { sock, db } = {}) {
  const args = (m.args || []).map(String);
  const sub = (args[0] || "").toLowerCase();

  // ── on/off ──
  if (sub === "on" || sub === "off") {
    const now = toggleMemory(db, m.sender, sub === "on");
    await m.react("🐣");
    return m.reply(novaWrap("Memory", [
      `✅ Memori ${now ? "diaktifkan" : "dimatikan"}.`,
      now ? `Bot otomatis inget fakta penting dari obrolan .novaai dan manggilnya balik pas relevan.` : `Bot berhenti nyatet — kenangan lama tetep kesimpen, cuma gak dipake.`,
    ]));
  }

  // ── reset ──
  if (sub === "reset") {
    resetMemories(db, m.sender);
    await m.react("🐣");
    return m.reply(novaWrap("Memory", [`✅ Semua kenangan tentang kamu udah dihapus.`]));
  }

  // ── hapus <no> ──
  if (sub === "hapus" || sub === "del" || sub === "delete") {
    const idx = Number(args[1]);
    if (!idx) return m.reply(novaError("Memory", `Nomor mana yang mau dihapus? Contoh: ${m.prefix}memory hapus 2`));
    const facts = listMemories(db, m.sender);
    const removed = facts[idx - 1];
    if (!removeMemory(db, m.sender, idx)) {
      await m.react("❌");
      return m.reply(novaError("Memory", `Gak ada kenangan nomor ${idx} — total kamu punya ${facts.length}.`));
    }
    await m.react("🐣");
    return m.reply(novaWrap("Memory", [`✅ Dihapus: "${removed.text}"`]));
  }

  // ── add <fakta> ──
  if (sub === "add" || sub === "tambah") {
    const fact = args.slice(1).join(" ").trim();
    if (!fact) return m.reply(novaError("Memory", `Fakta apa yang mau diinget? Contoh: ${m.prefix}memory add aku suka seblak pedas`));
    if (addMemory(db, m.sender, fact, { source: "manual" })) {
      await m.react("🐣");
      return m.reply(novaWrap("Memory", [`✅ Gue catet: "${fact}"`]));
    }
    await m.react("❌");
    return m.reply(novaError("Memory", `Itu udah gue inget / mirip sama yang udah ada — cek ${m.prefix}memory`));
  }

  // ── cari <q> ──
  if (sub === "cari" || sub === "search" || sub === "find") {
    const q = args.slice(1).join(" ").trim();
    if (!q) return m.reply(novaError("Memory", `Cari apa? Contoh: ${m.prefix}memory cari kucing`));
    const facts = listMemories(db, m.sender);
    const rel = relevantMemories(db, m.sender, q, 5);
    if (!rel.length) {
      const shown = Math.min(facts.length, 5);
      return m.reply(novaWrap("Memory", [
        `🔍 Gak nemu kenangan tentang "${q}".`,
        facts.length ? `Kamu punya ${facts.length} kenangan${shown ? " — beberapa terbaru:" : ""}` : "Dan kamu belum punya kenangan tersimpan.",
        ...(shown ? ["", ...facts.slice(-shown).map((f, i) => `• ${f.text}`)] : []),
      ]));
    }
    return m.reply(novaWrap("Memory", [
      `🔍 Kenangan tentang "${q}":`,
      ``,
      ...rel.map((f) => `• ${f.text} _(${fmtAge(f.ts)})_`),
    ]));
  }

  // ── default: list semua ──
  const facts = listMemories(db, m.sender);
  const on = isMemoryOn(db, m.sender);
  if (!facts.length) {
    return m.reply(novaWrap("Memory", [
      `📌 Belum ada kenangan tentang kamu.`,
      ``,
      `Bot otomatis nyatet fakta penting pas kamu ngobrol di .novaai${on ? "" : " (tapi kamu matikan auto-nya — nyalakan: .memory on)"}.`,
      `Tambah manual: ${m.prefix}memory add <fakta>`,
    ]));
  }
  await m.react("🐣");
  return m.reply(listBox(m, facts, "Memory") + `\n_${on ? "✅ Auto-inget AKTIF" : "⏸️ Auto-inget MATI"} — ${on ? "matikan: " + m.prefix + "memory off" : "nyalakan: " + m.prefix + "memory on"}_`);
}

export { pluginConfig as config, handler };
