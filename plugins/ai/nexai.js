// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// nexai — NexAI multi-provider (apinex.bond) — request owner 12 Sep 2026:
// "tmbah ai multi provider baru nexai, jd pas ketik cmd .nexai mncul list
// model yg tersedia ada model free jg defaultnya glm".
// DEFAULT = free/glm-5.3-flash (GLM zero-cost, jalan tanpa saldo).
// .nexai list = daftar model LIVE dari katalog publik APInex (free ditandain).
// .nexai model <id|alias> = ganti model persist per user (pola min1aiModel).
// STRICT SATU RUTE (pola satuan owner): down → error jelas, gak nyamber.
import { novaWrap, novaAiUsage, novaInfoSections } from "../../src/lib/nova-menu-style.js";
import { clearSession as clearAiSession } from "../../src/lib/nova-ai-session.js";
import {
  nexaiChat, nexaiModels, normNexaiModel,
  NEXAI_DEFAULT_MODEL, NEXAI_MODEL_ALIAS, NEXAI_FALLBACK_MODELS,
} from "../../src/scraper/nexai.js";

const pluginConfig = {
  name: "nexai",
  alias: ["nexai"],
  category: "ai",
  description: "NexAI APInex — multi-provider AI, model free tersedia, default GLM",
  usage: ".nexai <pesan>\n.nexai list — daftar model\n.nexai model <nama> — ganti model\n.nexai reset — mulai obrolan baru",
  example: ".nexai halo, siapa kamu?\n.nexai list\n.nexai model glm",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 5,
  energi: 1,
  isEnabled: true,
};

// ── model persist per sender (pola min1aiModel) ──
function getSavedModel(db, sender) {
  try {
    const all = db?.setting?.("nexaiModel") || {};
    return all[sender] || "";
  } catch {
    return "";
  }
}

function saveModel(db, sender, model) {
  try {
    const all = db?.setting?.("nexaiModel") || {};
    all[sender] = model;
    db?.setting?.("nexaiModel", all);
  } catch {}
}

function resetSession(sender) {
  try { clearAiSession("satuan:" + sender); } catch {}
}

// ── daftar model jadi baris menu — GRATIS duluan, terus per provider ──
function modelLines(models, activeModel) {
  const lines = [];
  const free = models.filter((m) => m.free);
  const paid = models.filter((m) => !m.free);
  if (free.length) {
    lines.push({ sub: "Gratis (Zero-Cost)" });
    for (const m of free) {
      const mark = m.id === activeModel ? " ✔" : "";
      lines.push(` ${m.id} — ${m.name} · ${m.contextWindow}${m.health !== "live" ? ` · ${m.health}` : ""}${mark}`);
    }
  }
  if (paid.length) {
    lines.push({ sub: "Berbayar" });
    for (const m of paid) {
      const price = `$${m.dollarsPer1M}/1M`;
      const mark = m.id === activeModel ? " ✔" : "";
      lines.push(` ${m.id} — ${m.name} · ${m.contextWindow} · ${price}${mark}`);
    }
  }
  return lines;
}

async function handler(m, { sock, db } = {}) {
  const args = (m.args || []).map(String);
  const first = (args[0] || "").toLowerCase();

  // ── .nexai reset — hapus sesi obrolan ──
  if (first === "reset" || first === "hapus" || first === "clear") {
    resetSession(m.sender);
    await m.react("🐣");
    return m.reply(novaInfoSections(["NexAI", { label: "Sesi", value: "baru dimulai" }]) + "\nBerhasil kak 🥳");
  }

  // ── .nexai model <id|alias> — ganti model persist per user ──
  if (first === "model" || first === "setmodel") {
    const picked = normNexaiModel(args[1] || "");
    if (!picked) {
      const cur = getSavedModel(db, m.sender) || NEXAI_DEFAULT_MODEL;
      const { models } = await nexaiModels();
      return m.reply(novaAiUsage("NexAI", {
        prefix: m.prefix,
        command: "nexai",
        modelAktif: `${cur}${cur === NEXAI_DEFAULT_MODEL ? " (default)" : ""}`,
        models: modelLines(models, cur),
        extra: [
          `📍 Ganti model: ${m.prefix}nexai model <nama> — contoh ${m.prefix}nexai model glm`,
          "📍 Alias singkat: glm, luna, qwen, deepseek, muse, gemini, opus, grok, kimi",
          "📍 Tanda ✔ = model yang kamu pakai sekarang",
        ],
      }));
    }
    const { models } = await nexaiModels();
    const known = models.some((m) => m.id === picked) || NEXAI_FALLBACK_MODELS.some((m) => m.id === picked);
    if (!known) {
      await m.react("❌");
      return m.reply(novaWrap("nexai", `model "${picked}" gak ada di APInex — ketik ${m.prefix}nexai list buat daftar model`, "error"));
    }
    saveModel(db, m.sender, picked);
    await m.react("🐣");
    const isFree = picked.startsWith("free/");
    return m.reply(novaInfoSections([
      "NexAI",
      { label: "Model aktif", value: picked },
      { label: "Biaya", value: isFree ? "free (zero-cost)" : "butuh saldo APInex" },
    ]) + "\nBerhasil kak 🥳");
  }

  const prompt = args.join(" ").trim();

  // ── .nexai doang / .nexai list — daftar model live ──
  if (!prompt || first === "list" || first === "modelnya") {
    const cur = getSavedModel(db, m.sender) || NEXAI_DEFAULT_MODEL;
    const { models, live } = await nexaiModels();
    return m.reply(novaAiUsage("NexAI", {
      prefix: m.prefix,
      command: "nexai",
      modelAktif: `${cur}${cur === NEXAI_DEFAULT_MODEL ? " (default)" : ""}`,
      models: modelLines(models, cur),
      extra: [
        `📍 Chat: ${m.prefix}nexai <pesan> — contoh ${m.prefix}nexai halo, siapa kamu?`,
        `📍 Ganti model: ${m.prefix}nexai model <nama> — contoh ${m.prefix}nexai model glm`,
        "📍 Model free/ = gratis zero-cost, sisanya butuh saldo APInex",
        `📍 Sumber: apinex.bond${live ? " (live)" : " (cache lokal — API katalog lagi down)"}`,
      ],
    }));
  }

  // ── chat — strict 1 rute NexAI ──
  const model = getSavedModel(db, m.sender) || NEXAI_DEFAULT_MODEL;
  try {
    await m.react("🕒");
    const reply = await nexaiChat(prompt, { model, timeoutMs: 60000 }); // glm flash kadang cold start
    try {
      const { appendTurn } = await import("../../src/lib/nova-ai-session.js");
      appendTurn("satuan:" + m.sender, prompt, reply);
    } catch {}
    await m.react("🐣");
    return m.reply(reply.trim() + (model !== NEXAI_DEFAULT_MODEL ? `\n\n⚙️ Model: ${model}` : ""));
  } catch (err) {
    console.error("[NexAI]", err.message || err);
    await m.react("❌");
    return m.reply(novaWrap("nexai", err.message || "NexAI lagi gangguan, coba lagi ya", "error"));
  }
}

export { pluginConfig as config, handler };
