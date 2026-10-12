// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
/**
 * Nama Plugin: Ai Agent Native (.aiagent)
 * Fitur: AI agent TOOL-CALL NATIVE (request owner 12 Okt 2026: "buat ai agent
 *        ada tool call gt dan edit file gt") — beda sama .aisuperagent yang
 *        tool-call-nya berbasis teks: yang ini pakai parameter `tools` resmi
 *        OpenAI chat/completions → model bales tool_calls terstruktur →
 *        bot eksekusi BENERAN (baca file, edit file, tulis file, shell) di
 *        container/VPS bot.
 *
 * PROVIDER (free tier HARIAN, key via .setkey):
 *   • githubmodels — GitHub Models (models.github.ai) — gratis 150 req/hari,
 *     key = GitHub PAT (Settings → Developer settings → Models). Model default
 *     openai/gpt-4o, override .setkey githubmodels_model <model>
 *   • groq — Groq API resmi (console.groq.com) — free tier permanen, model
 *     default llama-3.3-70b-versatile, override .setkey groq_model <model>
 *
 * KEAMANAN: isOwner (tool nulis/edit/shell bahaya), path disandbox ke folder
 * bot, shell denylist + timeout, loop max 8 langkah + timeout total —
 * pesan acak/non-teks dibales kartu usage, gak pernah throw (QA v1 gerbang 2+4).
 */
import {
  runNativeAgent,
  listNativeProviders,
  NATIVE_AGENT_META,
} from "../../src/lib/rara-agent-native.js";
import {
  raraWrap, raraGuide, raraError,
} from "../../src/lib/rara-menu-style.js";

const pluginConfig = {
  name: "aiagent",
  alias: ["aiagent", "agentnative"],
  category: "ai agent",
  description: "AI Agent tool-call native — baca/edit/tulis file & shell beneran, otak GitHub Models/Groq (free tier harian)",
  usage: ".aiagent <tugas>",
  example: ".aiagent baca package.json, sebutin versi baileys yang dipakai\n.aiagent edit file test/hello.txt ganti kata dunia jadi rara\n.aiagent provider — lihat provider & status key",
  isOwner: true,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 15,
  energi: 2,
  isEnabled: true,
};

function usageCard(prefix, providers) {
  const provLines = (providers || []).length
    ? providers.map((p) => `▪ ${p.hasKey ? "🟢" : "🔴"} *${p.label}*${p.hasKey ? "" : " — belum di-set"}`).join("\n")
    : "🔴 Belum ada provider yang punya key";
  const lines = [
    `🤖 *AI AGENT TOOL-CALL NATIVE*`,
    `Agent beneran: baca file, edit file, tulis file, jalanin shell — eksekusi di folder bot.`,
    "",
    `*PERINTAH*`,
    `ᯓ \`${prefix}aiagent <tugas>\` — kasih tugas ke agent`,
    `ᯓ \`${prefix}aiagent provider\` — status provider & key`,
    "",
    `*OTAK (free tier harian)*`,
    provLines,
    "",
    `*SET KEY*`,
    `ᯓ \`${prefix}setkey githubmodels <PAT GitHub>\``,
    `ᯓ \`${prefix}setkey groq <key console.groq.com>\``,
    "",
    `Contoh tugas: "baca package.json sebutin versi baileys", "edit test/hello.txt ganti dunia jadi rara".`,
    "",
    `Bahaya (nulis/edit/shell) cuma jalan buat owner — command ini owner-only.`,
  ];
  return raraWrap("Ai Agent", lines.join("\n"));
}

function stepsCard(prefix, result, ms) {
  const icon = (s) => (s.ok ? "✅" : "❌");
  const stepLines = (result.steps || [])
    .map((s) => `▪ ${icon(s)} *${s.tool}*${s.note ? " — " + s.note : ""}`)
    .join("\n");
  const lines = [
    `🤖 *HASIL AGENT*`,
    "",
    String(result.answer || "").slice(0, 3500),
  ];
  if (stepLines) {
    lines.push("", `*JEJAK LANGKAH (${(result.steps || []).length})*`, stepLines);
  }
  lines.push(
    "",
    `▪ Otak: *${result.provider || "?"}* (${result.model || "?"})${result.maxed ? " — batas langkah" : ""}`,
    `▪ Waktu: ${ms ? Math.round(ms / 100) / 10 : "?"} dtk`,
    "",
    `Ulangi: \`${prefix}aiagent <tugas>\``
  );
  return raraWrap("Ai Agent", lines.join("\n"));
}

async function handler(m, { sock, config: botConfig } = {}) {
  const prefix = botConfig?.command?.prefix || m.prefix || ".";
  try {
    const args = m.args || [];
    const task = (args || []).join(" ").trim();

    // sub: provider — status key (tanpa jalanin agent)
    if (task.toLowerCase() === "provider" || task.toLowerCase() === "providers") {
      const provs = listNativeProviders();
      const lines = [
        `🔌 *PROVIDER OTAK AGENT*`,
        "",
        ...Object.entries(NATIVE_AGENT_META.providers).map(([id, d]) => {
          const on = provs.find((p) => p.id === id);
          return [
            `▪ ${on ? "🟢" : "🔴"} *${d.label}*`,
            `  ᯓ Model: \`${on?.model || d.defaultModel}\``,
            `  ᯓ Key: \`${prefix}setkey ${id} <key>\`${on ? " (aktif)" : ""}`,
            `  ᯓ Model override: \`${prefix}setkey ${d.modelKey} <model>\``,
            `  ᯓ Daftar key: ${d.signup}`,
          ].join("\n");
        }),
      ].join("\n");
      return m.reply(raraWrap("Ai Agent", lines));
    }

    // tanpa tugas → kartu usage (gerbang 4: input kosong/non-teks juga nyasar sini)
    if (!task) {
      await m.react?.("❓");
      return m.reply(usageCard(prefix, listNativeProviders()));
    }

    // cek provider sebelum mulai (biar pesan jelas, gak nunggu timeout)
    const provs = listNativeProviders();
    if (!provs.length) {
      await m.react?.("🔌");
      return m.reply(raraWrap("Ai Agent", [
        `🔌 *BELUM ADA OTAK AGENT*`,
        "",
        `Agent butuh key salah satu provider (gratis):`,
        `ᯓ \`${prefix}setkey githubmodels <PAT GitHub>\` — GitHub Models, 150 req/hari`,
        `ᯓ \`${prefix}setkey groq <key>\` — Groq, free tier permanen`,
        "",
        `Detail daftar key: \`${prefix}aiagent provider\``,
      ].join("\n")));
    }

    await m.react?.("⏳");

    const result = await runNativeAgent({
      task,
      allowWrite: true,   // isOwner gate udah di level loader (isOwner: true)
      allowShell: true,
    });

    if (!result.ok) {
      await m.react?.("❌");
      if (result.error === "all-providers-failed") {
        return m.reply(raraError("Ai Agent", `Semua provider gagal: ${result.detail || result.error}`));
      }
      if (result.error === "no-provider") {
        return m.reply(usageCard(prefix, listNativeProviders()));
      }
      return m.reply(raraError("Ai Agent", `Agent gagal: ${result.error || "tidak diketahui"}`));
    }

    await m.react?.("✅");
    return m.reply(stepsCard(prefix, result, result.elapsedMs));
  } catch (e) {
    await m.react?.("❌").catch?.(() => {});
    return m.reply(raraError("Ai Agent", e?.message || "error gak diketahui"));
  }
}

export default { config: pluginConfig, handler };
export { pluginConfig as config, handler };
