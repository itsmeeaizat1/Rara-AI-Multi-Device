// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// plugins/ai/salaamai.js — AI ISLAMI dari ai.salaam.world (gratis tanpa api key)
// .salaamai <pertanyaan>            — tanya Brother Junaid (default)
// .salaamai <asisten> <pertanyaan>  — junaid | bilkees | khadijah | musa | zahra
// .salaamai list                    — daftar asisten
// .salaamai reset                   — hapus memori obrolan chat ini

import { askSalaam, resolveSalaamAssistant, SALAAM_ASSISTANTS } from "../../src/lib/nova-salaamai.js";
import { claraWrap } from "../../src/lib/nova-menu-style.js";
import te from "../../src/lib/nova-error.js";

const pluginConfig = {
  name: "salaamai",
  alias: ["salaamai", "islamicai", "salaam", "salaamworld", "uaislam"], // aiislam udah ada plugin lain (eQuran)
  category: "ai",
  description: "AI Islami Salaam World — edukasi Islam (fiqih, doa, sejarah, anak)",
  usage: ".salaamai <pertanyaan>\n.salaamai <asisten> <pertanyaan>\n.salaamai list\n.salaamai reset",
  example: ".salaamai apa itu wudhu?\n.salaamai bilkees doa sebelum makan\n.salaamai khadijah siapa nabi pertama?",
  isOwner: false, isPremium: false, isGroup: true, isPrivate: true,
  cooldown: 8, energi: 0, isEnabled: true,
};

// memori obrolan per chat (maks 8 turn, TTL 30 menit)
const sessions = new Map();
const TTL = 30 * 60 * 1000;
function getSession(chat) {
  const s = sessions.get(chat);
  if (s && Date.now() - s.ts < TTL) return s;
  sessions.set(chat, { ts: Date.now(), history: [] });
  return sessions.get(chat);
}
function touch(s) { s.ts = Date.now(); }

const assistantList = (prefix) =>
  SALAAM_ASSISTANTS.map((a) => `• ${a.name} — ${a.desc}\n  ${prefix}salaamai ${a.id} <pertanyaan>`).join("\n\n");

async function handler(m, {}) {
  const args = m.args || [];
  const sub = (args[0] || "").toLowerCase();
  const prefix = m.prefix || ".";

  // ── list ──
  if (sub === "list") {
    return m.reply(claraWrap("salaamai",
      `🕌 ASISTEN ISLAMI SALAAM WORLD\n\n` +
      `${assistantList(prefix)}\n\n` +
      `Gratis tanpa api key • sumber: ai.salaam.world`, "guide"));
  }

  // ── reset memori ──
  if (sub === "reset") {
    sessions.delete(m.chat);
    return m.reply(claraWrap("salaamai", "🧹 Memori obrolan Salaam AI di chat ini udah dihapus.", "ok"));
  }

  // ── help ──
  if (!sub || sub === "help" || sub === "?") {
    return m.reply(claraWrap("salaamai",
      `🕌 SALAAM AI — asisten edukasi Islami (ai.salaam.world)\n\n` +
      `💬 ${prefix}salaamai <pertanyaan>\nAsisten default: Brother Junaid.\n\n` +
      `👤 ${prefix}salaamai <asisten> <pertanyaan>\n${SALAAM_ASSISTANTS.map((a) => a.id).join(" | ")}\n\n` +
      `📋 ${prefix}salaamai list — daftar lengkap asisten\n🧹 ${prefix}salaamai reset — hapus memori obrolan\n\n` +
      `Contoh: ${prefix}salaamai apa itu wudhu?`, "guide"));
  }

  // ── parsing: asisten opsional di token pertama ──
  let assistantId = "junaid";
  let question = m.text?.trim() || "";
  const first = sub;
  if (resolveSalaamAssistant(first) && args.length > 1) {
    assistantId = first;
    question = question.split(/\s+/).slice(1).join(" ");
  }
  // asisten doang tanpa pertanyaan → info asisten itu
  const solo = resolveSalaamAssistant(sub);
  if (solo && args.length === 1) {
    return m.reply(claraWrap("salaamai",
      `👤 ${solo.name}\n\n${solo.desc}\nMaks ${solo.maxLen} karakter/pertanyaan.\n\n` +
      `Contoh: ${prefix}salaamai ${solo.id} <pertanyaan>`, "guide"));
  }
  if (!question) {
    return m.reply(claraWrap("salaamai",
      `💬 Mau nanya apa? Contoh:\n\n${prefix}salaamai apa itu wudhu?\n${prefix}salaamai list — pilih asisten lain`, "guide"));
  }

  await m.react("⏳");
  const sess = getSession(m.chat);

  try {
    const { reply, assistant } = await askSalaam({ question, assistantId, history: sess.history });
    // simpan memori multi-turn
    sess.history.push({ role: "user", content: question.slice(0, 500) });
    sess.history.push({ role: "assistant", content: reply.slice(0, 500) });
    if (sess.history.length > 8) sess.history.splice(0, sess.history.length - 8);
    touch(sess);

    await m.react("🐣");
    return m.reply(claraWrap("salaamai",
      `🕌 ${assistant.name} menjawab:\n\n${reply}\n\n` +
      `📚 sumber: ai.salaam.world • ${prefix}salaamai reset buat mulai topik baru`, "info"));
  } catch (err) {
    console.error("salaamai error:", err.message);
    await m.react("❌");
    const serverDown = /server salaam bermasalah|balasan kosong|start_session/i.test(err?.message || "");
    return m.reply(claraWrap("salaamai", serverDown
      ? `😔 Server Salaam World lagi bermasalah (backend AI-nya down, bukan di sisi kita).\n\n` +
        `Coba lagi nanti ya — atau pake AI biasa: ${prefix}ai / ${prefix}novaai buat pertanyaan agama.`
      : te(prefix, m.command, m.pushName), "error"));
  }
}

export { pluginConfig as config, handler };
