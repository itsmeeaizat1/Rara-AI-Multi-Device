// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// min1ai — 1min.ai (app.1min.ai) AI multi provider
// STRICT SATU RUTE (owner 11 Sep: satuan gak ada fallback) — 1min.ai down /
// key mati / kredit kurang → error jelas, GAK nyamber ke brand lain.
// Model default: qwen3-vl-8b-thinking (FREE — kata owner "qwen thinking").
// Ganti model: .min1ai model <id> (persist per user, db.setting min1aiModel).
import { novaAiUsage, novaInfoSections, novaGuide, claraWrap } from "../../src/lib/nova-menu-style.js";
import te from "../../src/lib/nova-error.js";
import { min1aiChat, MIN1AI_MODELS, MIN1AI_DEFAULT_MODEL } from "../../src/scraper/min1ai.js";

const pluginConfig = {
  name: "min1ai",
  alias: ["1minai", "minai", "ai1min", "oneminuteai"],
  category: "ai",
  description: "1min.ai — AI multi provider (Qwen Thinking free, GPT-5, Gemini, Grok, DeepSeek)",
  usage: ".min1ai <pertanyaan>\n.min1ai model <nama model>",
  example: ".min1ai apa itu AI?\n.min1ai model gpt-5",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 5,
  energi: 1,
  isEnabled: true,
};

// alias ramah → id model beneran (verified live 11 Sep 2026)
const MODEL_ALIAS = {
  "qwen": "qwen3-vl-8b-thinking",
  "qwen-thinking": "qwen3-vl-8b-thinking",
  "qwen.thinking": "qwen3-vl-8b-thinking",
  "qwen3-thinking": "qwen3-vl-8b-thinking",
  "thinking": "qwen3-vl-8b-thinking",
  "qwen3-vl-8b-thinking": "qwen3-vl-8b-thinking",
  "qwen3-8b": "qwen3-8b",
  "qwen3.8b": "qwen3-8b",
};

// daftar id valid (tanpa suffix "(free)")
const VALID_MODELS = MIN1AI_MODELS.map((s) => String(s).replace(/\s*\(free\)\s*$/i, "").trim());

function normModel(raw) {
  const q = String(raw || "").trim().toLowerCase();
  if (!q) return "";
  return MODEL_ALIAS[q] || q;
}

function getSavedModel(db, sender) {
  try {
    const all = db?.setting?.("min1aiModel") || {};
    return all[sender] || "";
  } catch {
    return "";
  }
}

async function handler(m, { sock, db } = {}) {
  const args = (m.args || []).map(String);
  const first = (args[0] || "").toLowerCase();

  // ── .min1ai model <id> — ganti model persist per user ──
  if (first === "model" || first === "setmodel") {
    const picked = normModel(args[1] || "");
    if (!picked || !VALID_MODELS.includes(picked)) {
      const cur = getSavedModel(db, m.sender) || MIN1AI_DEFAULT_MODEL;
      return m.reply(novaAiUsage("Min1AI", {
        command: "min1ai",
        modelAktif: `${cur} ${cur === MIN1AI_DEFAULT_MODEL ? "(default)" : ""}`.trim(),
        models: MIN1AI_MODELS,
        extra: [
          `📍 Ganti model: ${m.prefix}min1ai model <nama model> — contoh ${m.prefix}min1ai model qwen3-8b`,
        ],
      }));
    }
    try {
      const all = db?.setting?.("min1aiModel") || {};
      all[m.sender] = picked;
      db?.setting?.("min1aiModel", all);
      await m.react("🐣");
      // pola .ai: label smallcaps, VALUE VERBATIM (model ID harus bisa diketik persis)
      const isFree = ["qwen3-vl-8b-thinking", "qwen3-8b"].includes(picked);
      return m.reply(novaInfoSections([
        "Min1AI",
        { label: "Model aktif", value: picked },
        { label: "Biaya", value: isFree ? "free" : "butuh kredit berbayar" },
      ]) + "\nBerhasil kak 🥳");
    } catch (e) {
      await m.react("❌");
      return m.reply(claraWrap("min1ai", e.message || "Gagal simpan model", "error"));
    }
  }

  const prompt = args.join(" ").trim();

  // ── .min1ai doang / salah pemakaian — usage daftar model ──
  if (!prompt) {
    const cur = getSavedModel(db, m.sender) || MIN1AI_DEFAULT_MODEL;
    return m.reply(novaAiUsage("Min1AI", {
      command: "min1ai",
      modelAktif: cur === MIN1AI_DEFAULT_MODEL ? `${cur} — Qwen Thinking (default)` : cur,
      models: MIN1AI_MODELS,
      extra: [
        `📍 Ganti model: ${m.prefix}min1ai model <nama model> — contoh ${m.prefix}min1ai model gpt-5`,
      ],
    }));
  }

  // ── chat — strict 1 rute 1min.ai ──
  const model = getSavedModel(db, m.sender) || MIN1AI_DEFAULT_MODEL;
  try {
    await m.react("🕒");
    const reply = await min1aiChat(prompt, { model });
    try {
      const { appendTurn } = await import("../../src/lib/nova-ai-session.js");
      appendTurn("satuan:" + m.sender, prompt, reply);
    } catch {}
    await m.react("🐣");
    return m.reply(reply.trim() + (model !== MIN1AI_DEFAULT_MODEL ? `\n\n⚙️ Model: ${model}` : ""));
  } catch (err) {
    console.error("min1ai error:", err);
    await m.react("❌");
    return m.reply(claraWrap("min1ai", err.message || te(m.prefix, m.command, m.pushName), "error"));
  }
}

export { pluginConfig as config, handler };
