// nova-askills.js — AGENT SKILLS layer (progressive disclosure, spec Anthropic
// Agent Skills; sumber wshobson/agents (183) + kurasi skills.sh 28 Sep 2026:
// 212 repo official/populer (Anthropic/Vercel/Google/Microsoft/OpenAI/Prisma/
// Supabase/HeyGen/Lark/dll) → 4.727 skill di skills/<nama>/SKILL.md
// + src/data/skills-index.json; duplikat di-dedupe, official menang).
// Cara kerja: index tipis (nama + deskripsi) dipakai nge-match teks tugas →
// top-N skill RELEVAN aja yang isi SKILL.md-nya di-inject ke prompt agent.
// Gak ada match → blok kosong, prompt gak bengkak.
// CATATAN: JANGAN tertukar dengan nova-skills.js (registry tool internal
// .novaagent — translate/wiki/currency, folder src/skills/). Ini dua sistem beda.
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const INDEX_PATH = join(__dirname, "..", "data", "skills-index.json");
const SKILLS_DIR = join(__dirname, "..", "..", "skills");

let _cache = null;
let _override = null;
/** seam e2e — injek index palsu + reset cache */
export function _setSkillsIndexForTest(v) { _override = v; _cache = null; }
/** seam e2e — reset ke index asli */
export function _resetSkillsForTest() { _override = null; _cache = null; }

function idx() {
  if (_override) return _override;
  if (!_cache) _cache = JSON.parse(readFileSync(INDEX_PATH, "utf-8"));
  return _cache;
}

// kata remah (id+en) yang gak boleh jadi sinyal match
const STOP = new Set([
  "yang", "dan", "atau", "buat", "bikin", "bantu", "tolong", "saya", "kamu", "aku",
  "dengan", "untuk", "pada", "biar", "lagi", "nya", "aja", "kok", "gak", "gimana",
  "the", "and", "for", "with", "use", "using", "when", "how", "your", "from", "this",
  "that", "into", "including", "applications", "systems", "management", "patterns",
  "design", "implement", "create", "build", "make", "all", "any",
]);

// sinonim pendek id→istilah skill (biar tugas bahasa Indonesia tetep nyambung)
const SYN = new Map([
  ["kubernetes", "k8s"], ["db", "database"], ["docker", "docker"],
  ["api", "api"], ["login", "auth"], ["autentikasi", "auth"], ["izin", "rbac"],
  ["uang", "cost"], ["biaya", "cost"], ["murah", "cost"], ["uji", "test"],
  ["tes", "test"], ["testing", "test"], ["keamanan", "security"], ["aman", "security"],
  ["grafana", "grafana"], ["monitor", "observability"], ["riwayat", "changelog"],
  ["optimasi", "optimization"], ["query", "queri"], ["kode", "code"],
  ["lamaran", "employment"], ["kontrak", "contract"], ["migrasi", "migration"],
]);

function tokens(s) {
  const out = new Set();
  const push = (raw) => {
    if (!raw || raw.length < 3 || STOP.has(raw)) return;
    let t = raw.replace(/(ing|ed|es|s)$/, "");
    if (SYN.has(t)) t = SYN.get(t);
    else if (SYN.has(raw)) t = SYN.get(raw);
    out.add(t);
    if (t !== raw) out.add(raw);
  };
  for (const raw of String(s).toLowerCase().split(/[^a-z0-9+#.-]+/)) {
    if (!raw) continue;
    push(raw);
    // nama skill pakai tanda hubung ("sql-optimization-patterns") —
    // pecah juga per kata biar "sql" bisa match
    if (raw.includes("-")) for (const part of raw.split("-")) push(part);
  }
  return [...out];
}

/**
 * Match skill buat sebuah teks tugas. Bobot: token sama dengan token NAMA
 * skill = 3, token deskripsi = 1. Threshold default 3.
 * @returns {{name:string, score:number}[]}
 */
export function matchSkills(text, max = 3, minScore = 3) {
  const tt = tokens(text);
  if (!tt.length) return [];
  const ttSet = new Set(tt);
  const scored = [];
  for (const s of idx()) {
    const nameToks = tokens(s.n);
    const descToks = tokens(s.d);
    let score = 0;
    for (const t of ttSet) {
      if (nameToks.includes(t)) score += 3;
      else if (descToks.includes(t)) score += 1;
    }
    if (score >= minScore) scored.push({ name: s.n, score });
  }
  scored.sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));
  return scored.slice(0, max);
}

/**
 * Isi penuh satu SKILL.md (frontmatter distrip). Nama disanitasi
 * [a-z0-9-] — anti path traversal.
 * @returns {string} "" kalau skill gak ada
 */
export function getSkillBody(name, cap = 8000) {
  const n = String(name || "").toLowerCase().replace(/[^a-z0-9-]/g, "");
  if (!n) return "";
  try {
    const text = readFileSync(join(SKILLS_DIR, n, "SKILL.md"), "utf-8");
    const body = text.replace(/^---\n[\s\S]*?\n---\n/, "").trim();
    return body.length > cap ? body.slice(0, cap) + "\n…(dipotong, lihat .skill " + n + ")" : body;
  } catch {
    return "";
  }
}

export function skillCount() { return idx().length; }

/** daftar skill (opsional filter kata ke nama+deskripsi) — urut nama */
export function listSkills(q) {
  const idxAll = idx();
  if (!q) return idxAll;
  const qq = String(q).toLowerCase();
  return idxAll.filter((s) => s.n.includes(qq) || s.d.toLowerCase().includes(qq));
}

export function findSkill(q) {
  const qq = String(q || "").toLowerCase().trim();
  return idx().find((s) => s.n === qq)
    || idx().find((s) => s.n.includes(qq) && qq.length >= 3)
    || null;
}

/**
 * Blok prompt siap-inject buat pintu AI (runAgent / agentloop / autotask).
 * Progressive disclosure: match top-N → inject isi SKILL.md-nya aja.
 * @returns {string} "" kalau gak ada yang nyambung
 */
export function skillsBlock(text, { max = 3, cap = 8000 } = {}) {
  const matched = matchSkills(text, max);
  if (!matched.length) return "";
  const parts = [];
  for (const m of matched) {
    const body = getSkillBody(m.name, cap);
    if (body) parts.push("── ⚙ " + m.name + " ──\n" + body);
  }
  if (!parts.length) return "";
  return "\n\nPANDUAN SPESIALIS (skill terpasang yang nyambung sama tugas ini — ikuti praktik terbaiknya):\n" + parts.join("\n\n");
}
