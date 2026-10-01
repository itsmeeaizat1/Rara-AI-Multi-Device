// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
/**
 * .skill — AGENT SKILLS BROWSER (owner-only).
 *
 * Registry 4.727 skill (wshobson/agents + kurasi skills.sh: 212 repo
 * official/populer, dedupe) di skills/<nama>/SKILL.md — di-inject OTOMATIS ke pintu
 * AI (.raraagent/.aisuperagent/.agentloop/.autotask) lewat rara-askills.js
 * skillsBlock (progressive disclosure: cuma skill yang nyambung sama tugas
 * yang isinya dimuat). Plugin ini buat lihat/mastuin isinya manual.
 *
 * Commands (owner-only):
 *   .skill                    — kartu usage
 *   .skill list [kata]        — daftar semua skill / filter kata
 *   .skill <nama>             — isi SKILL.md skill itu
 *   .skill match <tugas>      — preview skill apa yang ke-inject buat tugas itu
 *   .skill count              — jumlah skill terpasang
 */
import { raraGuide, raraError } from "../../src/lib/rara-menu-style.js";
import { splitChatChunks } from "../../src/lib/aiagent.js";
import { matchSkills, getSkillBody, findSkill, listSkills, skillCount } from "../../src/lib/rara-askills.js";
import config from "../../config.js";

const pluginConfig = {
  name: "skill",
  alias: ["skill", "skills", "agenskill", "agentskill"],
  category: "ai agent",
  description: "Browser ribuan skill agent (wshobson + kurasi skills.sh) — lihat daftar, isi, dan preview match",
  usage: ".skill <list|nama|match|count>",
  example: ".skill list\n.skill e2e-testing-patterns\n.skill match bikin e2e test checkout",
  isOwner: true,
  isPremium: false,
};

async function handler(m, { sock }) {
  const args = String(m.text || "").trim().split(/\s+/).slice(1).filter(Boolean);
  const sub = (args[0] || "").toLowerCase();

  // ── tanpa subcommand → usage ──
  if (!sub) {
    return m.reply(raraGuide(
      pluginConfig.name,
      `${skillCount()} skill terpasang — AI otomatis pakai yang nyambung sama tugasmu`,
      ".skill list [kata] · .skill <nama> · .skill match <tugas> · .skill count",
      `skill dari wshobson/agents + kurasi skills.sh (212 repo official/populer, dedupe), otomatis di-inject ke .raraagent/.aisuperagent/.agentloop/.autotask`,
    ));
  }

  // ── .skill list [kata] ──
  if (sub === "list" || sub === "daftar") {
    const q = (args[1] || "").toLowerCase();
    const filtered = listSkills(q);
    if (!filtered.length) {
      return m.reply(raraError(pluginConfig.name, `gak ada skill yang cocok dengan "${q}"`));
    }
    // plafon tampilan — registry gede, gak mungkin dump ribuan baris
    const MAX_TAMPIL = 60;
    const shown = filtered.slice(0, MAX_TAMPIL);
    const lines = [
      `「 ✦ ${filtered.length} SKILL${q ? ` COCOK "${q}"` : ""} ✦ 」`,
      "",
      ...shown.map((s, i) => `${i + 1}. ${s.n}`),
      "",
    ];
    if (filtered.length > MAX_TAMPIL) {
      lines.push(`⋯ +${filtered.length - MAX_TAMPIL} lainnya — rapikan dengan .skill list <kata>`);
    }
    lines.push(`Lihat isi: .skill <nama> — total ${skillCount()} skill terpasang`);
    for (const chunk of splitChatChunks(lines.join("\n"))) {
      await m.reply(chunk);
    }
    return;
  }

  // ── .skill match <tugas> — preview progressive disclosure ──
  if (sub === "match" || sub === "cek") {
    const q = args.slice(1).join(" ");
    if (!q) {
      return m.reply(raraGuide(
        pluginConfig.name,
        "lihat skill apa aja yang bakal di-inject buat sebuah tugas",
        ".skill match <tugas>",
        `kata kunci tugas dicocokin ke nama + deskripsi skill — top 3 yang nyambung yang dimuat`,
      ));
    }
    const matched = matchSkills(q, 3);
    if (!matched.length) {
      return m.reply(`「 ✦ SKILL MATCH ✦ 」\n\nTugas: "${q}"\n\nGak ada skill yang nyambung — agent jalan tanpa panduan spesialis.`);
    }
    const lines = [
      `「 ✦ SKILL MATCH ✦ 」`,
      ``,
      `Tugas: "${q}"`,
      ``,
      ...matched.map((x) => `• ${x.name} (skor ${x.score})`),
      ``,
      `Skill ini otomatis di-inject ke prompt agent saat tugas dijalankan. Isi: .skill <nama>`,
    ];
    return m.reply(lines.join("\n"));
  }

  // ── .skill count ──
  if (sub === "count" || sub === "total") {
    return m.reply(`「 ✦ AGENT SKILLS ✦ 」\n\n⚡ Total skill terpasang: ${skillCount()}\n📡 Sumber: wshobson/agents (anthropic agent skills spec)\n🤖 Auto-inject: .raraagent · .aisuperagent · .agentloop · .autotask`);
  }

  // ── .skill <nama> ──
  const q = args.join(" ").toLowerCase();
  const s = findSkill(q);
  if (!s) {
    return m.reply(`「 ✦ SKILL TIDAK ADA ✦ 」\n\nSkill "${q}" gak ketemu — ketik .skill list buat lihat semua (${skillCount()} skill).`);
  }
  const body = getSkillBody(s.n, 12000);
  if (!body) {
    return m.reply(`「 ✦ SKILL TIDAK ADA ✦ 」\n\nFile skill "${s.n}" gak bisa dibaca — cek folder skills/ di repo.`);
  }
  const lines = [
    `「 ✦ ${s.n.toUpperCase()} ✦ 」`,
    ``,
    `${s.d}`,
    ``,
    body,
  ];
  for (const chunk of splitChatChunks(lines.join("\n"))) {
    await m.reply(chunk);
  }
}

export { pluginConfig as config, handler };
