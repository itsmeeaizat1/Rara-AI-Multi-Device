// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// nova-ai-router.js — NOVA ROUTER (rancangan arsitektur 9router)
//
// 4 pilar desain yang diadopsi dari 9router (github.com/decolua/9router):
//   1. KEY POOLING  — banyak apikey per provider, diputar round-robin;
//                     key kena 429/401 → langsung pindah key berikutnya.
//   2. HEALTH TRACKING + CIRCUIT BREAKER — 2x gagal berturut-turut →
//                     provider di-"open" (di-skip) selama 5 menit, auto pulih.
//   3. PRIORITAS FREE-TIER — provider free (gak butuh key) tetap dilayani;
//                     urutan ngikutin "chain" di apikeys.json.
//   4. TRANSPARANSI ROUTING — tiap panggilan balik: provider mana yang jawab,
//                     latency, dan jejak attempt (sukses/gagal/skip).
//
// Registry provider: src/lib/apikey/ai-chain.js (getAiChain) — single source of truth.
// Health file      : src/data/ai-router-health.json (gitignored, auto-create).

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { getAiChain, readAiProvidersConfig } from "./apikey/ai-chain.js";

const HEALTH_FILE = path.join(
  path.dirname(path.dirname(fileURLToPath(import.meta.url))),
  "data",
  "ai-router-health.json",
);

const CIRCUIT_FAIL_THRESHOLD = 2; //  2x gagal berturut → circuit open
const CIRCUIT_OPEN_MS = 5 * 60 * 1000; //  open selama 5 menit
const HISTORY_TURN_LIMIT = 12;

// ────────────────────────────── health store ──────────────────────────────

let _health = null;
let _healthLoadedAt = 0;

function blankHealth() {
  return { providers: {}, pools: {}, day: { key: "", totalReq: 0 } };
}

function todayKey() {
  const d = new Date(Date.now() + 7 * 3600e3); // WIB
  return d.toISOString().slice(0, 10);
}

function loadHealth() {
  if (_health && Date.now() - _healthLoadedAt < 3000) return _health;
  try {
    _health = JSON.parse(fs.readFileSync(HEALTH_FILE, "utf8"));
  } catch {
    _health = blankHealth();
  }
  if (!_health.providers) _health.providers = {};
  if (!_health.pools) _health.pools = {};
  if (!_health.day) _health.day = { key: "", totalReq: 0 };
  // ganti hari → reset counter harian
  const tk = todayKey();
  if (_health.day.key !== tk) {
    _health.day = { key: tk, totalReq: 0 };
    for (const h of Object.values(_health.providers)) h.reqToday = 0;
  }
  _healthLoadedAt = Date.now();
  return _health;
}

function saveHealth() {
  try {
    fs.mkdirSync(path.dirname(HEALTH_FILE), { recursive: true });
    fs.writeFileSync(HEALTH_FILE, JSON.stringify(_health, null, 2));
  } catch (e) {
    console.error("[nova-router] gagal simpan health:", e.message);
  }
}

function providerHealth(name) {
  const h = loadHealth();
  if (!h.providers[name]) {
    h.providers[name] = {
      fails: 0,
      openUntil: 0,
      lastError: "",
      lastLatencyMs: 0,
      lastSuccessAt: 0,
      reqToday: 0,
    };
  }
  return h.providers[name];
}

// ────────────────────────────── key pooling ──────────────────────────────

function pickKey(provider) {
  // POOL (9router "account pooling"): aiMultiprovider.pools.<name> = [key, key, ...]
  const cfg = readAiProvidersConfig();
  const pool = Array.isArray(cfg.pools?.[provider.name]) ? cfg.pools[provider.name].filter(Boolean) : [];
  if (pool.length) {
    const h = loadHealth();
    if (!h.pools[provider.name]) h.pools[provider.name] = { index: 0 };
    const idx = h.pools[provider.name].index % pool.length;
    return { key: pool[idx], pooled: true, poolSize: pool.length };
  }
  return { key: provider.key?.() || "", pooled: false, poolSize: 0 };
}

function rotatePool(providerName) {
  const h = loadHealth();
  if (!h.pools[providerName]) h.pools[providerName] = { index: 0 };
  const cfg = readAiProvidersConfig();
  const size = (cfg.pools?.[providerName] || []).filter(Boolean).length;
  if (size > 0) h.pools[providerName].index = (h.pools[providerName].index + 1) % size;
}

// ─────────────────────────── circuit breaker ───────────────────────────

function isCircuitOpen(name) {
  const h = providerHealth(name);
  return !!(h.openUntil && Date.now() < h.openUntil);
}

function markSuccess(name, ms) {
  const h = providerHealth(name);
  h.fails = 0;
  h.openUntil = 0;
  h.lastLatencyMs = ms;
  h.lastSuccessAt = Date.now();
  h.reqToday = (h.reqToday || 0) + 1;
  loadHealth().day.totalReq += 1;
  saveHealth();
}

function markFail(name, error) {
  const h = providerHealth(name);
  h.fails = (h.fails || 0) + 1;
  h.lastError = String(error?.message || error || "unknown").slice(0, 120);
  if (h.fails >= CIRCUIT_FAIL_THRESHOLD) {
    h.openUntil = Date.now() + CIRCUIT_OPEN_MS;
    console.log(`[nova-router] ⏸ circuit OPEN: ${name} skip ${CIRCUIT_OPEN_MS / 60000} menit`);
  }
  saveHealth();
}

// ──────────────────────── panggil 1 provider ────────────────────────
// Semantik pemanggilan sama dengan askAI() (src/lib/aiagent.js) — jangan
// double-implementasi di tempat lain; kalo format call berubah, ubah dua-duanya.

async function callProvider(p, { system, user, history }) {
  const histTrimmed = Array.isArray(history) ? history.slice(-HISTORY_TURN_LIMIT) : [];
  const histAsText = histTrimmed.length
    ? histTrimmed.map((h) => `${h.role === "user" ? "User" : "Asisten"}: ${h.content}`).join("\n") + "\n"
    : "";
  const { key } = pickKey(p);

  let text;
  if (p.method === "get") {
    const fullPrompt = `${system}\n\n${histAsText}User: ${user}`;
    const tp = p.textParam || "text";
    const url = key
      ? `${p.url}?apikey=${encodeURIComponent(key)}&${tp}=${encodeURIComponent(fullPrompt)}`
      : `${p.url}?${tp}=${encodeURIComponent(fullPrompt)}`;
    const res = await fetch(url, { headers: p.headers(key) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    text = data.result || data?.result?.reply || "";
  } else if (p.format === "anthropic") {
    const res = await fetch(p.url, {
      method: "POST",
      headers: p.headers(key),
      body: JSON.stringify({
        model: p.model,
        system,
        max_tokens: 2048,
        temperature: 0.1,
        messages: [
          ...histTrimmed.map((h) => ({ role: h.role === "assistant" ? "assistant" : "user", content: h.content })),
          { role: "user", content: user },
        ],
      }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    text = data?.content?.[0]?.text || "";
  } else {
    const res = await fetch(p.url, {
      method: "POST",
      headers: p.headers(key),
      body: JSON.stringify({
        model: p.model,
        messages: [
          { role: "system", content: system },
          ...histTrimmed.map((h) => ({ role: h.role === "assistant" ? "assistant" : "user", content: h.content })),
          { role: "user", content: user },
        ],
        temperature: 0.1,
        max_tokens: 2048,
      }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    text = data.choices?.[0]?.message?.content || "";
  }

  text = String(text).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "").trim();
  if (!text) throw new Error("balasan kosong");
  return text;
}

// ────────────────────────────── ROUTER UTAMA ──────────────────────────────

/**
 * Chat via Nova Router (rancangan 9router).
 * Iterasi chain sesuai prioritas, skip circuit-open, rotate key pool,
 * catat health & latency. Balikin hasil + jejak routing transparan.
 *
 * @returns {{ text, provider, model, latencyMs, attempts: Array }}
 */
export async function routerChat({ system, user, history = [], forcedProvider = null } = {}) {
  const chain = getAiChain();
  if (!chain.length) throw new Error("Rantai provider kosong — cek apikeys.json (aiMultiprovider.chain)");
  const sys = String(system || "Kamu adalah asisten AI yang membantu.");
  const attempts = [];

  const targets = forcedProvider
    ? chain.filter((p) => p.name === forcedProvider)
    : chain;

  if (forcedProvider && !targets.length) {
    throw new Error(`Provider "${forcedProvider}" gak ada di chain — cek .ai9 list`);
  }

  for (const p of targets) {
    const forced = !!forcedProvider;

    // skip: keyless non-free (belum diisi owner)
    const keyInfo = pickKey(p);
    if (!keyInfo.key && !p.free) {
      attempts.push({ provider: p.name, skipped: "no-key" });
      continue;
    }
    // skip: circuit open (kecuali dipaksa owner)
    if (!forced && isCircuitOpen(p.name)) {
      attempts.push({ provider: p.name, skipped: "cooldown" });
      continue;
    }

    const t0 = Date.now();
    try {
      const text = await callProvider(p, { system: sys, user, history });
      const ms = Date.now() - t0;
      markSuccess(p.name, ms);
      attempts.push({ provider: p.name, ok: true, ms });
      console.log(`[nova-router] ✅ ${p.name} jawab dalam ${ms}ms`);
      return { text, provider: p.name, model: p.model || "-", latencyMs: ms, attempts };
    } catch (e) {
      markFail(p.name, e);
      if (keyInfo.pooled) rotatePool(p.name); // key kena masalah → ganti kunci
      attempts.push({ provider: p.name, error: String(e.message || e).slice(0, 80), ms: Date.now() - t0 });
      console.log(`[nova-router] ❌ ${p.name} gagal: ${e.message} → lanjut...`);
    }
  }

  const done = attempts.filter((a) => !a.skipped).map((a) => `${a.provider}${a.ok ? "✓" : `(${a.error})`}`);
  throw new Error(`Semua provider gagal. Jejak: ${done.join(" → ") || "tidak ada yang dicoba"}`);
}

/** Snapshot health buat dashboard .ai9 status */
export function getRouterStatus() {
  const chain = getAiChain();
  loadHealth();
  const cfg = readAiProvidersConfig();
  return {
    day: { ..._health.day },
    providers: chain.map((p) => {
      const h = providerHealth(p.name);
      const pool = Array.isArray(cfg.pools?.[p.name]) ? cfg.pools[p.name].filter(Boolean).length : 0;
      const status = isCircuitOpen(p.name)
        ? "cooldown"
        : h.lastSuccessAt
          ? "ok"
          : h.fails > 0
            ? "fail"
            : "idle";
      return {
        name: p.name,
        free: !!p.free,
        hasKey: !!(p.key?.() || pool > 0),
        pool,
        status,
        latency: h.lastLatencyMs,
        reqToday: h.reqToday || 0,
        lastError: h.lastError,
        cooldownLeft: h.openUntil > Date.now() ? Math.ceil((h.openUntil - Date.now()) / 60000) : 0,
      };
    }),
  };
}

/** reset health 1 provider (dipakai .ai9 reset) */
export function resetProviderHealth(name) {
  const h = loadHealth();
  delete h.providers[name];
  h.pools[name] = { index: 0 };
  saveHealth();
}
