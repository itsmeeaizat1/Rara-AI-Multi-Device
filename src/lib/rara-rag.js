// RARA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// Engine RAG dokumen: ingest PDF/DOCX/TXT → chunk → BM25 lokal → jawab pakai konteks via AI.
// Tanpa embedding API: BM25 (retrieval klasik) — gratis, offline, gak butuh key.
import fs from "fs";
import path from "path";
import crypto from "crypto";
import { callAI } from "./rara-ai-service.js";

const RAG_DIR = path.resolve("data/rag");
const MAX_DOCS_PER_USER = 10;
const MAX_CHUNKS_PER_DOC = 400;
const MAX_CHUNK_CHARS = 4000;

const STOPWORDS = new Set(("yang dan di ke dari untuk dengan pada adalah ini itu atau juga akan tidak bisa dalam ada sebuah agar bahwa oleh kalau jika sudah belum saja hanya masih " +
  "the a an is are of to in for on at or and if it as be by we you i he she they with this that from").split(/\s+/));

export function tokenize(text) {
  return String(text || "").toLowerCase().replace(/[^a-z0-9\u00c0-\u024f\s]/g, " ").split(/\s+/).filter((w) => w.length > 1 && !STOPWORDS.has(w));
}

export function chunkText(text, size = 1200, overlap = 150) {
  const clean = String(text || "").replace(/[ \t]+/g, " ").trim();
  if (!clean) return [];
  const step = Math.max(200, size - overlap);
  const chunks = [];
  for (let i = 0; i < clean.length; i += step) {
    const piece = clean.slice(i, i + size).trim();
    if (piece) chunks.push(piece);
    if (i + size >= clean.length) break;
  }
  return chunks;
}

export async function extractDocText(fileName, buffer) {
  const lower = String(fileName || "").toLowerCase();
  if (lower.endsWith(".pdf")) {
    const mod = await import("pdf-parse");
    const pdfParse = mod.default || mod;
    const parsed = await pdfParse(buffer);
    return { ok: true, text: parsed.text || "", info: (parsed.numpages || 0) + " halaman" };
  }
  if (lower.endsWith(".docx")) {
    const mammoth = await import("mammoth");
    const res = await mammoth.extractRawText({ buffer });
    return { ok: true, text: res.value || "" };
  }
  if (/\.(txt|md|csv|json)$/.test(lower)) {
    return { ok: true, text: buffer.toString("utf8") };
  }
  return { ok: false, error: "format belum didukung (PDF, DOCX, TXT, MD, CSV, JSON) — kirim salah satu dari itu" };
}

function ensureDir() { if (!fs.existsSync(RAG_DIR)) fs.mkdirSync(RAG_DIR, { recursive: true }); }

export function saveDoc({ name, from, text }) {
  const chunks = chunkText(text).slice(0, MAX_CHUNKS_PER_DOC);
  if (!chunks.length) return { ok: false, error: "dokumen kosong / teksnya gak bisa dibaca" };
  const id = "doc-" + crypto.randomBytes(4).toString("hex");
  ensureDir();
  const rec = { id, name: String(name || "dokumen").slice(0, 80), from: from || "", created: new Date().toISOString(), chunks };
  fs.writeFileSync(path.join(RAG_DIR, id + ".json"), JSON.stringify(rec));
  return { ok: true, id, name: rec.name, chunks: chunks.length };
}

export function listDocs(from) {
  ensureDir();
  const out = [];
  for (const f of fs.readdirSync(RAG_DIR)) {
    if (!f.endsWith(".json")) continue;
    try {
      const rec = JSON.parse(fs.readFileSync(path.join(RAG_DIR, f), "utf8"));
      if (from && rec.from !== from) continue;
      out.push({ id: rec.id, name: rec.name, created: rec.created, chunks: rec.chunks.length });
    } catch {}
  }
  out.sort((a, b) => String(b.created || "").localeCompare(String(a.created || "")));
  return out;
}

export function getDoc(id, from) {
  if (!id || !/^doc-[a-f0-9]+$/.test(id)) return null;
  const p = path.join(RAG_DIR, id + ".json");
  if (!fs.existsSync(p)) return null;
  try {
    const rec = JSON.parse(fs.readFileSync(p, "utf8"));
    if (from && rec.from !== from) return null;
    return rec;
  } catch { return null; }
}

export function deleteDoc(id, from) {
  const rec = getDoc(id, from);
  if (!rec) return { ok: false, error: "dokumen gak ketemu (cek .rag list)" };
  fs.unlinkSync(path.join(RAG_DIR, id + ".json"));
  return { ok: true, name: rec.name };
}

export function countDocs(from) { return listDocs(from).length; }
export const ragLimits = { MAX_DOCS_PER_USER, MAX_CHUNKS_PER_DOC, MAX_CHUNK_CHARS };

export function bm25Rank(queryTokens, docs) {
  const N = docs.length;
  if (!N || !queryTokens.length) return [];
  const df = new Map();
  let lenSum = 0;
  for (const d of docs) {
    lenSum += d.tokens.length;
    const seen = new Set(d.tokens);
    for (const t of seen) df.set(t, (df.get(t) || 0) + 1);
  }
  const avgLen = lenSum / N;
  const k1 = 1.2, b = 0.75;
  const scored = docs.map((d) => {
    const tf = new Map();
    for (const t of d.tokens) tf.set(t, (tf.get(t) || 0) + 1);
    let s = 0;
    for (const t of queryTokens) {
      const f = tf.get(t) || 0;
      if (!f) continue;
      const dft = df.get(t) || 0;
      const idf = Math.log(1 + (N - dft + 0.5) / (dft + 0.5));
      s += (idf * (f * (k1 + 1))) / (f + k1 * (1 - b + (b * d.tokens.length) / avgLen));
    }
    return { ref: d, score: s };
  });
  scored.sort((a, b2) => b2.score - a.score);
  return scored;
}

export function searchDocs(query, from, topK = 5) {
  const qTokens = tokenize(query);
  if (!qTokens.length) return { ok: false, error: "pertanyaannya gak kebaca, coba kata kunci lain" };
  const metas = listDocs(from);
  if (!metas.length) return { ok: false, error: "belum ada dokumen. Tambahin dulu: .rag add <nama> (reply dokumen)" };
  const corpus = [];
  for (const meta of metas) {
    const rec = getDoc(meta.id, from);
    if (!rec) continue;
    rec.chunks.forEach((c, idx) => corpus.push({ docId: rec.id, docName: rec.name, idx, text: c, tokens: tokenize(c) }));
  }
  if (!corpus.length) return { ok: false, error: "dokumen gak bisa dibaca" };
  const ranked = bm25Rank(qTokens, corpus).filter((r) => r.score > 0).slice(0, topK);
  if (!ranked.length) return { ok: false, error: "gak nemu potongan relevan — coba kata kunci lain" };
  return { ok: true, qTokens, results: ranked.map((r) => ({ doc: r.ref.docName, docId: r.ref.docId, idx: r.ref.idx, text: r.ref.text, score: r.score })) };
}

export async function askRag(query, from) {
  const search = searchDocs(query, from);
  if (!search.ok) return search;
  const ctx = search.results
    .map((r, i) => "【" + (i + 1) + "】 dari dokumen \"" + r.doc + "\":\n" + r.text.slice(0, MAX_CHUNK_CHARS))
    .join("\n\n");
  const prompt = "Kamu Rara, asisten WhatsApp. Jawab pertanyaan pengguna HANYA berdasarkan potongan dokumen di bawah ini. Kalau jawabannya gak ada di konteks, bilang jujur gak ketemu di dokumen. Jawab ringkas dan sopan pakai bahasa Indonesia.\n\n=== KONTEKS DOKUMEN ===\n" + ctx + "\n=== AKHIR KONTEKS ===\n\nPertanyaan pengguna: " + query;
  const raw = await callAI({ messages: [{ role: "user", content: prompt }] });
  const answer = typeof raw === "string" ? raw : (raw && (raw.content || raw.text || raw.result || raw.answer)) || "";
  return { ok: true, answer: String(answer).trim(), sources: [...new Set(search.results.map((r) => r.doc))] };
}
