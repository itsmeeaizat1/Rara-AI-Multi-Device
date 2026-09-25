// Generate src/data/skills-index.json dari skills/<nama>/SKILL.md
// Jalankan: node test/agent-skills-e2e/generate.mjs
// Sumber skill: wshobson/agents (Anthropic Agent Skills spec) — 183 skill.
import { readdirSync, readFileSync, writeFileSync, statSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const SKILLS = join(ROOT, "skills");
const OUT = join(ROOT, "src", "data", "skills-index.json");

function parseFrontmatter(text) {
  const m = text.match(/^---\n([\s\S]*?)\n---\n/);
  const out = {};
  if (!m) return out;
  for (const line of m[1].split("\n")) {
    const kv = line.match(/^([a-zA-Z_]+):\s*(.*)$/);
    if (kv) out[kv[1]] = kv[2].trim();
  }
  return out;
}

const dirs = readdirSync(SKILLS).filter((d) => {
  try { return statSync(join(SKILLS, d)).isDirectory(); } catch { return false; }
});
const idx = [];
for (const d of dirs) {
  const p = join(SKILLS, d, "SKILL.md");
  let text = "";
  try { text = readFileSync(p, "utf-8"); } catch { continue; }
  const fm = parseFrontmatter(text);
  const name = String(fm.name || d).trim();
  const desc = String(fm.description || "").trim();
  idx.push({ n: name, d: desc });
}
idx.sort((a, b) => a.n.localeCompare(b.n));
writeFileSync(OUT, JSON.stringify(idx));
console.log(`OK: ${idx.length} skill → ${OUT}`);
