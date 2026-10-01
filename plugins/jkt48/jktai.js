// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// ═════════════════════════════════════════════
// 🔹 .jktai — chat AI persona member JKT48 (18 member) dari zelapi.eu.cc
// 🔹 Kategori khusus JKT48 (folder plugins/jkt48/) — request owner 15 Sep 2026.
// 🔹 .jktai (list) | .jktai <member> <pesan>
// 🔹 STRICT SATUAN: endpoint mati → error asli, gak nyolong fallback.
// ═════════════════════════════════════════════

import { jktAiChat, findJktaiMember, ZEL_JKTAI_MEMBERS, _setZelJktHttpForTest, _setZelJktKeyForTest } from "../../src/scraper/zeljkt.js";
import { novaWrap } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "jktai",
  alias: ["jkt48ai", "aijkt48", "aijkt"],
  category: "jkt48",
  description: "Chat AI persona member JKT48 (18 member) — zelapi",
  usage: ".jktai — daftar member\n.jktai <member> <pesan>",
  example: ".jktai marsha halo marsha apa kabar?",
  isOwner: false, isPremium: false, isGroup: false, isPrivate: false,
  cooldown: 15, energi: 1, isEnabled: true,
};

function memberListText(prefix) {
  const grid = ZEL_JKTAI_MEMBERS.map((m) => m.name).join(" · ");
  return `💬 Chat AI persona member JKT48 — 18 member!\n\n${grid}\n\nCara pakai: ${prefix}jktai <member> <pesan>\nContoh: ${prefix}jktai freya rekomendasi lagu apa buat hari ini?`;
}

async function handler(m, { sock }) {
  try {
    const args = (m.args || []).map(String);
    const prefix = m.prefix || ".";
    const q0 = (args[0] || "").toLowerCase();

    // tanpa argumen ATAU arg pertama "list" → daftar member
    if (!args.length || q0 === "list") {
      return m.reply(novaWrap("jktai", memberListText(prefix)));
    }

    // .jktai <member> <pesan>
    const member = findJktaiMember(args[0]);
    if (!member) {
      return m.reply(novaWrap("jktai",
        `Member "${args[0]}" gak ada — ketik ${prefix}jktai buat daftar 18 member.`, "error"));
    }
    const text = args.slice(1).join(" ").trim();
    if (!text) {
      return m.reply(novaWrap("jktai",
        `Kirim pesannya juga 🙂\n\nContoh: ${prefix}jktai ${member.slug} apa rencana kamu hari ini?`));
    }

    await m.react("🧠");
    const r = await jktAiChat(member, text);
    if (!r.ok) {
      await m.react("❌");
      const map = {
        API_KEY: "API key zelapi belum diisi — isi apikeys.json (zelapi) di server.",
        TEXT_KOSONG: "Pesan kosong.",
      };
      return m.reply(novaWrap("jktai", map[r.error] || `Endpoint JKT48 AI error: ${r.error}`, "error"));
    }
    await m.react("🐣");
    return m.reply(novaWrap("jktai", `*${member.name}* 🌸\n\n${r.reply}`));
  } catch (err) {
    await m.react("❌");
    return m.reply(novaWrap("jktai", "gagal proses: " + (err?.message || "error"), "error"));
  }
}

export { pluginConfig as config, handler, _setZelJktHttpForTest, _setZelJktKeyForTest };
export default { pluginConfig, handler, command: pluginConfig.name };
