// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// nova-agent.js — AI AGENT OTONOM MULTI-LANGKAH (request owner 11 Sep 2026:
// "buatkan no 1" — ide fitur paling canggih: agent yang plan + eksekusi +
// verifikasi, bukan 1 tanya 1 jawab).
//
// Alur 5 fase:
//   1. PLAN    — AI bikin rencana: pecah tugas jadi query pencarian (max 3)
//   2. SEARCH  — jalankan tiap query lewat nova-websearch (bing + fallback chain)
//   3. PICK    — AI milih halaman paling relevan dari pool hasil (max 3)
//   4. READ    — buka halaman terpilih, ekstrak isi plain text (cap 3500 char/halaman)
//   5. COMPOSE — AI susun jawaban akhir dari BUKTI nyata + cantumin sumber
//
// AI dipanggil lewat aiChainChat (rantai internal — fitur internal boleh,
// beda sama command satuan yang strict per owner). Semua langkah punya
// fallback degradasi: plan gagal → tugas jadi query; pick gagal → 3 teratas;
// read gagal → pakai snippet pool; compose gagal → digest lokal (tetep ada
// jawaban + sumber, gak perlu batal total).
//
// Seams buat e2e: setAgentDeps({ aiChat, search, preview }).

import { aiChainChat } from "./nova-ai-fallback.js";
import { searchWeb, fetchPagePreview } from "./nova-websearch.js";

const MAX_QUERIES = 3;
const MAX_PICKS = 3;
const POOL_OFFER = 12;
const PAGE_TEXT_CAP = 3500;

let _aiChat = aiChainChat;
let _search = searchWeb;
let _preview = fetchPagePreview;

export function setAgentDeps({ aiChat, search, preview } = {}) {
  if (aiChat) _aiChat = aiChat;
  if (search) _search = search;
  if (preview) _preview = preview;
}
export function resetAgentDeps() {
  _aiChat = aiChainChat;
  _search = searchWeb;
  _preview = fetchPagePreview;
}

// ── util ──
function domainOf(url) {
  try { return new URL(url).hostname.replace(/^www\./, ""); } catch { return String(url); }
}

// JSON extractor lokal — tahan code fence / kalimat pembuka (pola autonovaai)
function parseJsonLocal(raw) {
  if (!raw) return null;
  let s = String(raw).replace(/```json|```/gi, "").trim();
  const a = s.indexOf("{");
  const b = s.lastIndexOf("}");
  if (a === -1 || b <= a) return null;
  try { return JSON.parse(s.slice(a, b + 1)); } catch { return null; }
}

const SYS_PLAN = `Kamu adalah perencana riset. Balas HANYA objek JSON murni tanpa kalimat pembuka/penjelas/markdown. Karakter PERTAMA harus { dan TERAKHIR }.
Format: {"queries": ["query pencarian 1", "query 2", "query 3"], "angle": "sudut pandang singkat"}
Aturan: maksimal ${MAX_QUERIES} query, tiap query pendek dan spesifik (kata kunci ala google, bukan kalimat tanya), bahasa mengikuti tugas user, kalau tugas minta perbandingan/daftar pastikan query nangkep item-itemnya.`;

const SYS_PICK = `Kamu adalah kurator riset. Balas HANYA objek JSON murni. Karakter PERTAMA harus { dan TERAKHIR }.
Format: {"picks": [nomor1, nomor2, nomor3]}
Aturan: pilih ${MAX_PICKS} halaman paling relevan & berbobot buat tugas user (hindari halaman login/agregator kosong), nomor sesuai daftar kandidat.`;

const SYS_ANSWER = `Kamu adalah analis riset. Jawab tugas user berdasarkan BUKTI dari halaman web yang diberikan (ditandai [S1], [S2], dst).
Aturan jawaban: bahasa yang sama dengan tugas user (default Indonesia), terstruktur dan padat (poin/heading boleh), sebut sumber dengan [S1]/[S2] di kalimat yang pakai info itu, jangan mengarang data yang gak ada di bukti, jangan pakai markdown table, akhiri tanpa sapaan basa-basi.`;

/**
 * runAgent — jalankan tugas kompleks multi-langkah.
 * @param {string} task tugas user, mis. "cari hp terbaik di bawah 5 juta, bandingkan, kasih rekomendasi"
 * @param {Object} [opts]
 * @param {(phase:string, info:string) => void} [opts.onPhase] progress callback:
 *        "plan" | "search" (info=query) | "pick" | "read" (info=domain) | "compose"
 * @returns {Promise<{answer, queries, sources, steps, viaLocal}|{error}>}
 */
export async function runAgent(task, { onPhase } = {}) {
  const phase = (p, info) => { try { onPhase?.(p, info); } catch {} };
  const steps = [];

  // ── FASE 1: PLAN — AI pecah tugas jadi query ──
  phase("plan");
  let plan = null;
  try {
    plan = parseJsonLocal(await _aiChat(`Tugas user: ${task}`, { systemPrompt: SYS_PLAN }));
  } catch {}
  const queries = (Array.isArray(plan?.queries) && plan.queries.length
    ? plan.queries.map(String).filter(q => q.trim())
    : [task]).slice(0, MAX_QUERIES);
  steps.push({ phase: "plan", ok: !!plan, queries });

  // ── FASE 2: SEARCH — kumpulkan pool hasil ──
  const pool = [];
  const seen = new Set();
  for (const q of queries) {
    phase("search", q);
    let r = null;
    try { r = await _search(q, { engine: "bing", limit: 8 }); } catch {}
    if (r?.items?.length) {
      for (const it of r.items) {
        const url = String(it?.url || "");
        if (!url || seen.has(url)) continue;
        seen.add(url);
        pool.push({
          title: String(it?.title || "").slice(0, 120),
          url,
          snippet: String(it?.snippet || "").slice(0, 200),
          domain: domainOf(url),
        });
      }
    }
  }
  steps.push({ phase: "search", ok: pool.length > 0, hasil: pool.length });
  if (!pool.length) {
    return { error: "hasil pencarian kosong — semua mesin search sibuk, coba lagi bentar" };
  }

  // ── FASE 3: PICK — AI milih halaman paling relevan ──
  phase("pick");
  const offer = pool.slice(0, POOL_OFFER);
  const listText = offer.map((p, i) => `${i + 1}. [${p.domain}] ${p.title} — ${p.snippet.slice(0, 120)}`).join("\n");
  let pick = null;
  try {
    pick = parseJsonLocal(await _aiChat(`Tugas user: ${task}\n\nKandidat halaman:\n${listText}`, { systemPrompt: SYS_PICK }));
  } catch {}
  let idxs = Array.isArray(pick?.picks) && pick.picks.length
    ? pick.picks.map(n => parseInt(n, 10) - 1).filter(i => Number.isInteger(i) && i >= 0 && i < offer.length)
    : [0, 1, 2];
  if (!idxs.length) idxs = [0];
  idxs = [...new Set(idxs)].slice(0, MAX_PICKS);
  steps.push({ phase: "pick", ok: !!pick, pilihan: idxs.map(i => offer[i].domain) });

  // ── FASE 4: READ — buka halaman terpilih ──
  const reads = [];
  for (const i of idxs) {
    const p = offer[i];
    phase("read", p.domain);
    let pv = null;
    try { pv = await _preview(p.url); } catch {}
    if (pv?.text) {
      reads.push({ ...p, text: String(pv.text).slice(0, PAGE_TEXT_CAP) });
    }
  }
  steps.push({ phase: "read", ok: reads.length > 0, halaman: reads.length });

  // ── FASE 5: COMPOSE — AI susun jawaban dari bukti ──
  phase("compose");
  // bukti: isi halaman yang kebaca; gak ada → snippet pool (bukti tipis tapi tetep dipakai)
  const evidence = (reads.length
    ? reads.map((p, n) => `[S${n + 1} | ${p.domain} | ${p.title}]\n${p.text}`).join("\n\n")
    : offer.map((p, n) => `[S${n + 1} | ${p.domain} | ${p.title}]\n${p.snippet}`).join("\n\n")).slice(0, 12000);
  const sources = (reads.length ? reads : offer.slice(0, MAX_PICKS)).map((p, n) => ({
    tag: `S${n + 1}`, domain: p.domain, url: p.url, title: p.title,
  }));

  let answer = "";
  let viaLocal = false;
  try {
    answer = await _aiChat(`Tugas user: ${task}\n\nBUKTI:\n${evidence}`, { systemPrompt: SYS_ANSWER });
  } catch {}
  if (!answer || !String(answer).trim()) {
    // fallback terakhir: digest lokal dari bukti (tetep informatif + sumber)
    viaLocal = true;
    answer = buildLocalDigest(task, reads.length ? reads : offer.slice(0, MAX_PICKS));
  }
  steps.push({ phase: "compose", ok: !viaLocal, viaLocal });

  return { answer: String(answer).trim(), queries, sources, steps, viaLocal };
}

// digest lokal — dipakai kalau AI compose down: susun ringkasan bukti sendiri
function buildLocalDigest(task, pages) {
  const lines = [`📌 Hasil riset buat: ${task}`, ""];
  for (const p of pages.slice(0, MAX_PICKS)) {
    lines.push(`• ${p.title || p.domain} (${p.domain})`);
    if (p.text) lines.push(`  ${String(p.text).replace(/\s+/g, " ").slice(0, 400)}...`);
    else if (p.snippet) lines.push(`  ${p.snippet}`);
    lines.push(`  🔗 ${p.url}`);
    lines.push("");
  }
  lines.push("_Disusun otomatis dari isi halaman — mode digest (AI penyusun lagi sibuk)._");
  return lines.join("\n");
}
