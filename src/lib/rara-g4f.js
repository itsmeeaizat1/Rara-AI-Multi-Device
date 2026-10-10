// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
// rara-g4f.js — Katalog provider AI gratis dari gpt4free (pasang 10 Okt 2026).
// Sumber: github.com/xtekky/gpt4free (GPLv3 — di sini CUMA katalog informasi
// provider, bukan menyalin kode GPL; repo bot tetap MIT).
// Dataset statis src/data/g4f.json — gak nyentuh fitur AI agent existing
// (hiaiagent/autotask/agentloop/aiagents tetap utuh).

import fs from "fs";
import path from "path";

const DATA_FILE = path.join(process.cwd(), "src", "data", "g4f.json");

let _cache = null;
export function __resetG4fForTest() {
  _cache = null;
}

function load() {
  if (_cache) return _cache;
  try {
    _cache = JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
  } catch {
    _cache = { source: "", count: 0, entries: [] };
  }
  return _cache;
}

export function getMeta() {
  const d = load();
  return { source: d.source, commit: d.commit, count: d.count || d.entries.length };
}

export function getStats() {
  const d = load();
  const by = (k, v) => d.entries.filter((e) => e.kategori === k && e.working && (v === undefined ? true : e.auth === v)).length;
  return {
    total: d.entries.length,
    gratis: d.entries.filter((e) => !e.auth && e.working).length,
    login: d.entries.filter((e) => e.auth && e.working).length,
    audio: d.entries.filter((e) => e.kategori === "audio" && e.working).length,
  };
}

export function listFree(page = 1, perPage = 10) {
  const d = load();
  const rows = d.entries.filter((e) => !e.auth && e.working);
  return paginate(rows, page, perPage);
}

export function listLogin(page = 1, perPage = 10) {
  const d = load();
  const rows = d.entries.filter((e) => e.auth && e.working);
  return paginate(rows, page, perPage);
}

export function listAudio(page = 1, perPage = 10) {
  const d = load();
  const rows = d.entries.filter((e) => e.kategori === "audio");
  return paginate(rows, page, perPage);
}

function paginate(rows, page, perPage) {
  const pages = Math.max(1, Math.ceil(rows.length / perPage));
  const p = Math.max(1, Math.min(pages, parseInt(page, 10) || 1));
  const start = (p - 1) * perPage;
  return { page: p, pages, total: rows.length, rows: rows.slice(start, start + perPage) };
}

export function searchG4f(query, limit = 8) {
  const d = load();
  const q = String(query || "").toLowerCase().trim();
  if (!q) return [];
  return d.entries
    .filter((e) => `${e.name} ${e.url} ${e.kategori}`.toLowerCase().includes(q))
    .slice(0, limit);
}

export function getByName(name) {
  const d = load();
  const q = String(name || "").toLowerCase().trim();
  return d.entries.find((e) => e.name.toLowerCase() === q) || null;
}

export function randomFree() {
  const d = load();
  const rows = d.entries.filter((e) => !e.auth && e.working && e.url);
  if (!rows.length) return null;
  return rows[Math.floor(Math.random() * rows.length)];
}
