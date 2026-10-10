// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
/**
 * Nama Plugin: G4F (Katalog Provider AI Gratis — gpt4free)
 * Fitur: .g4f — katalog provider AI gratis dari github.com/xtekky/gpt4free
 *        (GPLv3): daftar provider working tanpa login, provider perlu akun,
 *        provider audio/TTS, pencarian, ide acak, + panduan self-host API.
 *        FITUR KATALOG SENDIRI — gak menggantikan fitur AI agent existing
 *        (.hiaiagent/.autotask/.agentloop/.aiagents tetap utuh).
 *        100% lokal (dataset statis src/data/g4f.json), tanpa API eksternal.
 */
import {
  getMeta, getStats, listFree, listLogin, listAudio, searchG4f, getByName, randomFree,
} from "../../src/lib/rara-g4f.js";
import { raraWrap } from "../../src/lib/rara-menu-style.js";

const pluginConfig = {
  name: "g4f",
  alias: ["gpt4free", "aifree"],
  category: "ai",
  description: "Katalog provider AI gratis (gpt4free) — list working tanpa login, cari, acak, panduan",
  usage: ".g4f list [hal]\n.g4f login [hal]\n.g4f audio\n.g4f cari <kata>\n.g4f detail <nama>\n.g4f acak\n.g4f panduan",
  example: ".g4f list\n.g4f cari gemini\n.g4f panduan",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 3,
  energi: 1,
  isEnabled: true,
};

function menuCard(prefix) {
  const s = getStats();
  const m = getMeta();
  return raraWrap("G4f Ai Gratis", [
    `🎁 *KATALOG PROVIDER AI GRATIS (${s.total})*`,
    "",
    `✅ Tanpa login (working): ${s.gratis} provider`,
    `🔑 Perlu akun/login (working): ${s.login} provider`,
    `🔊 Audio/TTS: ${s.audio} provider`,
    `📚 Sumber: ${m.source.split(" (")[0]}`,
    "",
    `*PERINTAH*`,
    `ᯓ \`${prefix}g4f list\` — provider gratis siap pakai`,
    `ᯓ \`${prefix}g4f login\` — provider perlu akun`,
    `ᯓ \`${prefix}g4f audio\` — provider suara/TTS`,
    `ᯓ \`${prefix}g4f cari <kata>\` — cari provider`,
    `ᯓ \`${prefix}g4f detail <nama>\` — detail provider`,
    `ᯓ \`${prefix}g4f acak\` — rekomendasi random`,
    `ᯓ \`${prefix}g4f panduan\` — cara jalanin sendiri (self-host)`,
  ]);
}

function rowLine(e) {
  const tag = e.auth ? "🔑" : "✅";
  return `▪ ${tag} *${e.name}* — ${e.url || "(tanpa web)"}`;
}

function listCard(title, res, prefix, sub) {
  const lines = [
    `${title} — total ${res.total} provider`,
    "",
    ...res.rows.map(rowLine),
    "",
    `📄 Halaman ${res.page}/${res.pages}`,
  ];
  if (res.page < res.pages) lines.push(`Next: \`${prefix}g4f ${sub} ${res.page + 1}\``);
  lines.push(`Detail: \`${prefix}g4f detail <nama>\``);
  return raraWrap("G4f Ai Gratis", lines);
}

function detailCard(e) {
  return raraWrap("G4f Ai Gratis", [
    `📌 *${e.name}*`,
    "",
    `▪ *Status:* ${e.working ? "✅ Working" : "❌ Sedang mati"}`,
    `▪ *Login:* ${e.auth ? "🔑 Perlu akun/cookie" : "✅ Gratis tanpa login"}`,
    `▪ *Streaming:* ${e.stream ? "Ya" : "Tidak"}`,
    `▪ *Kategori:* ${e.kategori === "chat" ? "Chat/AI" : e.kategori === "audio" ? "Audio/TTS" : "Chat (perlu login)"}`,
    e.url ? `▪ *Web:* ${e.url}` : "",
    "",
    `_Cara pakai: lihat \`.g4f panduan\` atau kunjungi repo gpt4free_`,
  ].filter(Boolean));
}

function panduanCard(prefix) {
  return raraWrap("G4f Ai Gratis", [
    "🚀 *PANDUAN SELF-HOST GPT4FREE*",
    "",
    "*1. Jalankan server (docker slim)*",
    "```docker run -p 1337:8080 -p 8080:8080 hlohaus789/g4f:latest-slim```",
    "",
    "*2. Dapet API OpenAI-compatible*",
    "▪ Endpoint: `http://localhost:1337/v1`",
    "▪ Swagger UI: `http://localhost:1337/docs`",
    "",
    "*3. Pakai dari kode (format OpenAI)*",
    "```POST http://localhost:1337/v1/chat/completions\n{\"model\": \"gpt-4o-mini\", \"messages\": [...]} ```",
    "",
    `*CATATAN*`,
    "▪ Repo asli: github.com/xtekky/gpt4free (GPLv3)",
    "▪ Bot ini cuma katalog informasi — kode bot tetap MIT",
    `▪ Provider working bisa berubah kapan aja — cek \`${prefix}g4f list\``,
  ]);
}

export async function handler(m, { config: botConfig } = {}) {
  const prefix = botConfig?.command?.prefix || m.prefix || ".";
  const args = m.args || [];
  const sub = String(args[0] || "").toLowerCase();
  const arg = String(args[1] || "").trim();

  if (!sub) return m.reply(menuCard(prefix));

  if (sub === "list" || sub === "gratis" || sub === "free") {
    return m.reply(listCard("✅ PROVIDER GRATIS TANPA LOGIN", listFree(arg || 1, 10), prefix, "list"));
  }

  if (sub === "login" || sub === "akun") {
    return m.reply(listCard("🔑 PROVIDER PERLU LOGIN", listLogin(arg || 1, 10), prefix, "login"));
  }

  if (sub === "audio" || sub === "tts") {
    return m.reply(listCard("🔊 PROVIDER AUDIO/TTS", listAudio(arg || 1, 10), prefix, "audio"));
  }

  if (sub === "cari" || sub === "search") {
    const q = args.slice(1).join(" ").trim();
    if (!q) {
      return m.reply(raraWrap("G4f Ai Gratis", [
        "🔍 *Cari Provider*",
        "",
        `Format: \`${prefix}g4f cari <kata>\``,
        `Contoh: \`${prefix}g4f cari gemini\``,
      ]));
    }
    const hits = searchG4f(q);
    if (!hits.length) {
      return m.reply(raraWrap("G4f Ai Gratis", [
        `🔍 Gak nemu provider buat "${q}".`,
        "",
        `Coba kata lain, atau \`${prefix}g4f list\` buat liat semua.`,
      ]));
    }
    return m.reply(raraWrap("G4f Ai Gratis", [
      `🔍 *${hits.length} HASIL untuk "${q}"*`,
      "",
      ...hits.map(rowLine),
      "",
      `Detail: \`${prefix}g4f detail <nama>\``,
    ]));
  }

  if (sub === "detail") {
    const name = args.slice(1).join(" ");
    const e = getByName(name);
    if (!e) {
      return m.reply(raraWrap("G4f Ai Gratis", [
        "❗ *Provider Gak Ketemu*",
        "",
        `Format: \`${prefix}g4f detail <nama>\` (nama persis dari daftar)`,
        `Contoh: \`${prefix}g4f detail Qwen\``,
      ]));
    }
    return m.reply(detailCard(e));
  }

  if (sub === "acak" || sub === "random") {
    const e = randomFree();
    if (!e) return m.reply(menuCard(prefix));
    return m.reply(detailCard(e));
  }

  if (sub === "panduan" || sub === "cara" || sub === "setup") {
    return m.reply(panduanCard(prefix));
  }

  // fallback: sub dianggap keyword search langsung
  const hits = searchG4f(args.join(" "));
  if (hits.length) {
    return m.reply(raraWrap("G4f Ai Gratis", [
      `🔍 *${hits.length} HASIL untuk "${args.join(" ")}"*`,
      "",
      ...hits.map(rowLine),
      "",
      `Detail: \`${prefix}g4f detail <nama>\``,
    ]));
  }

  await m.react("❓");
  return m.reply(menuCard(prefix));
}

export { pluginConfig as config };
