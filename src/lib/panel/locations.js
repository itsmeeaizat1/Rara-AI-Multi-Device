// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
// src/lib/panel/locations.js — LOCATION MISMATCH HELPER (8 Okt 2026)
// Insiden: node pindah location / panel punya banyak location (us.nyc.lvl3, sg-01, ...)
// → config bot (ptero-panels.json location) nyasar → create kena
// "No nodes satisfying the requirements" dari panel.
// Helper ini nangkep error itu, narik daftar location LIVE dari API panel,
// nunjukin location mana yang PUNYA node, + arahan .setpanel v1 location <id>.

import axios from "axios";

// panel balasin 400/422: "No nodes satisfying the requirements" (deploy location kosong).
export function isLocationMismatchError(msg) {
  const s = String(msg || "").toLowerCase();
  return /no nodes.*satisf/.test(s) || /no nodes (are )?availab/.test(s) || /requested location/.test(s);
}

// narik location + node dari panel (seam buat test).
let _fetcher = null;
export function _setLocationsFetcherForTest(fn) { _fetcher = fn; }
export function _resetLocationsFetcherForTest() { _fetcher = null; }

async function fetchLocationsFromPanel(domain, apikey) {
  if (_fetcher) return _fetcher(domain, apikey);
  const H = { Authorization: `Bearer ${apikey}`, Accept: "application/vnd.pterodactyl.v1+json" };
  const [locRes, nodeRes] = await Promise.all([
    axios.get(`${domain}/api/application/locations?per_page=250`, { headers: H, timeout: 10000 }),
    axios.get(`${domain}/api/application/nodes?per_page=250`, { headers: H, timeout: 10000 }),
  ]);
  const nodes = (nodeRes.data?.data || []).map((n) => n.attributes);
  return (locRes.data?.data || []).map((l) => {
    const a = l.attributes || {};
    const nodeOnLoc = nodes.find((n) => n.location_id === a.id);
    return { id: a.id, short: a.short || "-", long: a.long || "", node: nodeOnLoc ? nodeOnLoc.name : null };
  });
}

// Kartu bantuan pas location config salah. Return string, atau null kalau
// panel gak bisa dihubungi / bukan error location (anti-throw, best-effort).
export async function buildLocationMismatchHelp({ domain, apikey, location }) {
  let locs;
  try {
    locs = await fetchLocationsFromPanel(domain, apikey);
  } catch {
    return null;
  }
  if (!Array.isArray(locs) || locs.length === 0) return null;
  // location yang punya node diduluan biar saran langsung keliatan
  locs.sort((a, b) => (b.node ? 1 : 0) - (a.node ? 1 : 0) || a.id - b.id);
  const withNode = locs.filter((l) => l.node);
  const lines = locs.map((l) => {
    const name = [l.short, l.long && l.long !== "Default" ? `(${l.long})` : ""].filter(Boolean).join(" ");
    return `• ID ${l.id} — ${name} ${l.node ? `✅ node: ${l.node}` : "⛔ belum ada node"}`;
  });
  const cur = location ?? "(belum di-set)";
  if (withNode.length === 0) {
    return `⚠️ LOCATION PANEL SALAH\n\nConfig bot sekarang: *location ${cur}*\nPanel gak nemu node di location itu, dan SEMUA location di panel belum punya node.\n\nDaftar location:\n${lines.join("\n")}\n\nFix: bikin/pindahkan node dulu di admin panel (Locations & Nodes), baru set config.`;
  }
  const saran = withNode[0];
  return `⚠️ LOCATION PANEL SALAH\n\nConfig bot sekarang: *location ${cur}*\nPanel gak nemu node di location itu (node pindah/lokasi baru?).\n\nDaftar location di panel:\n${lines.join("\n")}\n\nFix (owner):\n\`.setpanel v1 location ${saran.id}\`\nLangsung aktif tanpa restart, coba create lagi.`;
}
