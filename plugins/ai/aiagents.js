// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
/**
 * Nama Plugin: Aiagents (Katalog 500+ AI Agent Projects)
 * Fitur: .aiagents — browse/search katalog 134 proyek AI agent terkurasi
 *        (sumber: github.com/ashishpatel26/500-AI-Agents-Projects, MIT).
 *        FITUR BARU SENDIRI — gak menggantikan fitur AI agent existing
 *        (.hiaiagent/.autotask/.agentloop dll tetap utuh).
 *        100% lokal (dataset statis), tanpa API eksternal.
 */
import {
  getMeta, getSectionsWithCount, listSection, searchAiAgents, getEntry, randomEntry,
} from "../../src/lib/rara-aiagents.js";
import { raraWrap } from "../../src/lib/rara-menu-style.js";

const pluginConfig = {
  name: "aiagents",
  alias: ["aiagent500", "katalogai"],
  category: "ai",
  description: "Katalog 500+ proyek AI agent — browse per framework/industri, cari, ide acak",
  usage: ".aiagents <industri|crewai|autogen|agno|langgraph|starter> [hal]\n.aiagents cari <kata>\n.aiagents acak\n.aiagents detail <no>",
  example: ".aiagents crewai\n.aiagents cari trading\n.aiagents acak",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 3,
  energi: 1,
  isEnabled: true,
};

const SECTION_LABEL = {
  industri: "🏭 Industri (27 kategori industri)",
  crewai: "🤝 CrewAI (role-based team)",
  autogen: "🔧 AutoGen (code & research)",
  agno: "⚡ Agno (agent ringan)",
  langgraph: "🗺️ LangGraph (workflow stateful)",
  starter: "🚀 Starter (22 agent jadi siap jalan)",
};

function menuCard(prefix) {
  const meta = getMeta();
  const secs = getSectionsWithCount()
    .map((s) => `ᯓ \`${prefix}aiagents ${s.section}\` — ${s.count} proyek`)
    .join("\n");
  return raraWrap("Ai Agents", [
    `📚 *KATALOG ${meta.count} PROYEK AI AGENT*`,
    "",
    `Sumber terkurasi: ${meta.source}`,
    "",
    `*BROWSE PER SEKSI*`,
    secs,
    "",
    `*LAINNYA*`,
    `ᯓ \`${prefix}aiagents <seksi> <hal>\` — halaman berikutnya`,
    `ᯓ \`${prefix}aiagents cari <kata>\` — cari proyek`,
    `ᯓ \`${prefix}aiagents acak\` — ide proyek random`,
    `ᯓ \`${prefix}aiagents detail <no>\` — detail + link repo`,
    "",
    "_katalog referensi aja — fitur AI agent bot tetap yang lama_",
  ]);
}

function entryLine(e) {
  return `▪ ${e.id}. ${e.name} — ${e.industry}`;
}

function detailCard(e) {
  return raraWrap("Ai Agents", [
    `📌 *${e.name}*`,
    "",
    `🏭 Kategori: ${e.industry}`,
    `🗂️ Seksi: ${e.section}`,
    "",
    `📝 ${e.desc || "Tanpa deskripsi."}`,
    "",
    e.link ? `🔗 Repo: ${e.link}` : "_link repo gak tersedia di katalog_",
  ]);
}

export async function handler(m, { sock, config: botConfig } = {}) {
  const prefix = botConfig?.command?.prefix || m.prefix || ".";
  const args = m.args || [];
  const sub = String(args[0] || "").toLowerCase();
  const arg = String(args[1] || "").trim();

  // ── menu utama ──
  if (!sub) {
    return m.reply(menuCard(prefix));
  }

  // ── cari ──
  if (sub === "cari" || sub === "search") {
    const q = args.slice(1).join(" ").trim();
    if (!q) {
      return m.reply(raraWrap("Ai Agents", [
        "🔍 *Cari Proyek*",
        "",
        `Format: \`${prefix}aiagents cari <kata kunci>\``,
        `Contoh: \`${prefix}aiagents cari trading\``,
      ]));
    }
    const hits = searchAiAgents(q);
    if (!hits.length) {
      return m.reply(raraWrap("Ai Agents", [
        `🔍 Gak nemu proyek buat "${q}".`,
        "",
        `Coba kata lain, atau \`${prefix}aiagents acak\` buat ide random.`,
      ]));
    }
    return m.reply(raraWrap("Ai Agents", [
      `🔍 *${hits.length} HASIL untuk "${q}"*`,
      "",
      ...hits.map(entryLine),
      "",
      `Detail: \`${prefix}aiagents detail <no>\``,
    ]));
  }

  // ── acak ──
  if (sub === "acak" || sub === "random" || sub === "ide") {
    const e = randomEntry();
    if (!e) return m.reply(menuCard(prefix));
    return m.reply(detailCard(e));
  }

  // ── detail ──
  if (sub === "detail" || sub === "no") {
    const e = getEntry(arg);
    if (!e) {
      return m.reply(raraWrap("Ai Agents", [
        "❗ *Nomor Gak Valid*",
        "",
        `Format: \`${prefix}aiagents detail <no>\` (lihat nomor dari daftar)`,
        `Contoh: \`${prefix}aiagents detail 5\``,
      ]));
    }
    return m.reply(detailCard(e));
  }

  // ── browse seksi (dengan/nomor halaman) ──
  const secLabel = SECTION_LABEL[sub];
  if (secLabel) {
    const res = listSection(sub, arg || 1, 10);
    if (!res.ok) return m.reply(menuCard(prefix));
    const lines = [
      `${secLabel}`,
      "",
      ...res.rows.map(entryLine),
      "",
      `📄 Halaman ${res.page}/${res.pages} — total ${res.total} proyek`,
    ];
    if (res.page < res.pages) lines.push(`Next: \`${prefix}aiagents ${sub} ${res.page + 1}\``);
    lines.push(`Detail: \`${prefix}aiagents detail <no>\``);
    return m.reply(raraWrap("Ai Agents", lines));
  }

  // ── sub gak dikenal → anggap keyword search langsung ──
  const hits = searchAiAgents(args.join(" "));
  if (hits.length) {
    return m.reply(raraWrap("Ai Agents", [
      `🔍 *${hits.length} HASIL untuk "${args.join(" ")}"*`,
      "",
      ...hits.map(entryLine),
      "",
      `Detail: \`${prefix}aiagents detail <no>\``,
    ]));
  }

  await m.react("❓");
  return m.reply(menuCard(prefix));
}

export { pluginConfig as config };
