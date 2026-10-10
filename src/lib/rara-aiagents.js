// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
// rara-aiagents.js — Katalog 500+ AI Agent Projects (pasang 10 Okt 2026).
// Sumber: github.com/ashishpatel26/500-AI-Agents-Projects (MIT).
// Dataset statis src/data/aiagents.json — 100% lokal, gak nyentuh fitur
// AI agent existing (hiaiagent/autotask/agentloop dll tetap utuh).

import fs from "fs";
import path from "path";

const DATA_FILE = path.join(process.cwd(), "src", "data", "aiagents.json");

let _cache = null;
export function __resetAiagentsForTest() {
  _cache = null;
}

function load() {
  if (_cache) return _cache;
  try {
    _cache = JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
  } catch {
    _cache = { source: "", sections: [], count: 0, entries: [] };
  }
  return _cache;
}

export function getMeta() {
  const d = load();
  return { source: d.source, count: d.count || d.entries.length, sections: d.sections || [] };
}

export function getSectionsWithCount() {
  const d = load();
  const map = {};
  for (const e of d.entries) map[e.section] = (map[e.section] || 0) + 1;
  return (d.sections || []).map((s) => ({ section: s, count: map[s] || 0 }));
}

export function listSection(section, page = 1, perPage = 10) {
  const d = load();
  const sec = String(section || "").toLowerCase();
  if (!(d.sections || []).includes(sec)) return { ok: false, error: "section-unknown" };
  const rows = d.entries.filter((e) => e.section === sec);
  const pages = Math.max(1, Math.ceil(rows.length / perPage));
  const p = Math.max(1, Math.min(pages, parseInt(page, 10) || 1));
  const start = (p - 1) * perPage;
  return { ok: true, page: p, pages, total: rows.length, rows: rows.slice(start, start + perPage) };
}

export function searchAiAgents(query, limit = 8) {
  const d = load();
  const q = String(query || "").toLowerCase().trim();
  if (!q) return [];
  const hits = d.entries.filter((e) =>
    `${e.name} ${e.desc} ${e.industry} ${e.section}`.toLowerCase().includes(q)
  );
  return hits.slice(0, limit);
}

export function getEntry(id) {
  const d = load();
  const n = parseInt(id, 10);
  if (!Number.isFinite(n) || n < 1 || n > d.entries.length) return null;
  return d.entries[n - 1];
}

export function randomEntry() {
  const d = load();
  if (!d.entries.length) return null;
  return d.entries[Math.floor(Math.random() * d.entries.length)];
}
