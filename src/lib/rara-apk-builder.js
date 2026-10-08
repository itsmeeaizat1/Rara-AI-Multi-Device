// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
// src/lib/rara-apk-builder.js — .buildapk (8 Okt 2026)
// Bot nge-drive server "apk-builder" di panel Pterodactyl (egg APK Builder, image apk-builder).
// Alur: ensure builder server ada (auto-create via API, mode receiver) → pastikan nyala →
// kirim job via HTTP API receiver (POST /build zip|repo|url) → poll /status → ambil /download.
// Spec builder (VPS 8GB RAM / 4 core / 60GB disk): 5120 MB RAM, 10240 MB disk, 300% CPU, 1 job.

import axios from "axios";
import fs from "node:fs";
import path from "node:path";
import { getPanel } from "./panel/index.js";
import { PANEL_WATERMARK } from "./panel/description.js";

export const BUILDER_SERVER_NAME = "apk-builder";
export const BUILDER_DOCKER_IMAGE = "apk-builder:latest";
export const BUILDER_EGG_MATCHER = /apk.?builder/i;
export const BUILDER_LIMITS = { memory: 5120, swap: 0, disk: 10240, io: 500, cpu: 300 };
export const USER_COOLDOWN_MS = 15 * 60 * 1000; // 15 menit per user (owner bypass)
export const BUILD_TIMEOUT_MS = 25 * 60 * 1000; // 25 menit max job
export const MAX_ZIP_BYTES = 200 * 1024 * 1024;

const DATA_PATH = path.join(process.cwd(), "data", "apk-builder.json");

// ── store kecil (enabled + lastUse per user) ──
let _storePathForTest = null;
function storePath() { return _storePathForTest || DATA_PATH; }
export function _setBuilderStoreForTest(p) { _storePathForTest = p; }
export function _resetBuilderStoreForTest() { _storePathForTest = null; }
export function readStore() {
  try { return JSON.parse(fs.readFileSync(storePath(), "utf8")); } catch { return {}; }
}
function writeStore(s) { fs.mkdirSync(path.dirname(storePath()), { recursive: true }); fs.writeFileSync(storePath(), JSON.stringify(s, null, 2)); }
export function isBuilderEnabled() { return readStore().enabled !== false; }
export function setBuilderEnabled(v) { const s = readStore(); s.enabled = v; writeStore(s); return v; }
export function userOnCooldown(jid) { const t = readStore().lastUse?.[jid]; return t ? Date.now() - t : null; }
export function markUsed(jid) { const s = readStore(); s.lastUse = s.lastUse || {}; s.lastUse[jid] = Date.now(); writeStore(s); }
export function userCooldownLeft(jid) { const d = userOnCooldown(jid); return d === null || d >= USER_COOLDOWN_MS ? 0 : Math.ceil((USER_COOLDOWN_MS - d) / 60000); }

// ── seams buat e2e: { panel: { get, post }, recv: fetch-like } ──
let _http = null;
export function _setBuilderHttpForTest(h) { _http = h; }
export function _resetBuilderHttpForTest() { _http = null; }

async function panelReq(panelNum, method, urlPath, body) {
  if (_http?.panel) {
    const fn = method === "get" ? _http.panel.get : _http.panel.post;
    return fn(urlPath, body);
  }
  const panel = getPanel(panelNum);
  if (!panel?.domain || !panel?.apikey) throw new Error(`Panel v${panelNum} belum dikonfigurasi (domain + apikey PTLA).`);
  const res = await axios({
    method,
    url: `${panel.domain}/api/application${urlPath}`,
    headers: { Authorization: `Bearer ${panel.apikey}`, Accept: "application/vnd.pterodactyl.v1+json", "Content-Type": "application/json" },
    data: body,
    timeout: 20000,
  });
  return res.data;
}

async function recvFetch(url, opts) {
  if (_http?.recv) return _http.recv(url, opts);
  return fetch(url, { ...opts, signal: AbortSignal.timeout(opts?.timeoutMs || 30000) });
}

// ── temukan / buat server builder ──
export async function findBuilderServer(panelNum) {
  const per = 100; let page = 1;
  while (page <= 20) {
    const d = await panelReq(panelNum, "get", `/servers?per_page=${per}&page=${page}`);
    const list = d.data || [];
    const hit = list.find((s) => (s.attributes?.name || "") === BUILDER_SERVER_NAME);
    if (hit) return hit.attributes;
    if (list.length < per) return null;
    page++;
  }
  return null;
}

async function findBuilderEgg(panelNum) {
  const d = await panelReq(panelNum, "get", "/nests?include=eggs");
  for (const nest of d.data || []) {
    const eggs = nest.relationships?.eggs?.data || [];
    for (const e of eggs) {
      if (BUILDER_EGG_MATCHER.test(e.attributes?.name || "")) {
        return { eggId: parseInt(e.attributes.id), nestId: parseInt(e.attributes.nest || nest.attributes.id) };
      }
    }
  }
  return null;
}

async function findAdminUserId(panelNum) {
  const d = await panelReq(panelNum, "get", "/users?per_page=250");
  const admin = (d.data || []).find((u) => u.attributes?.root_admin === true);
  return admin ? admin.attributes.id : null;
}

export async function ensureBuilderServer(panelNum, location) {
  let srv = await findBuilderServer(panelNum);
  if (!srv) {
    const egg = await findBuilderEgg(panelNum);
    if (!egg) {
      throw new Error("Egg 'APK Builder' belum di-import di panel. Import builder/apk/apk-builder-egg.json (admin → Nests → Import) & build image apk-builder:latest dulu. Lihat panduan VPS-PANEL.md Langkah 17.");
    }
    const adminId = await findAdminUserId(panelNum);
    if (!adminId) throw new Error("Gak nemu user admin di panel buat pemilik server builder.");
    const payload = {
      name: BUILDER_SERVER_NAME,
      description: `Builder APK — RARA AI - MULTI DEVICE | by Aizat`,
      user: adminId,
      egg: egg.eggId,
      docker_image: BUILDER_DOCKER_IMAGE,
      startup: "BUILD_MODE=receiver node /opt/receiver/app/boot.js",
      environment: { BUILD_MODE: "receiver", BUILD_TOKEN: "" },
      limits: { ...BUILDER_LIMITS },
      feature_limits: { databases: 0, allocations: 1, backups: 0 },
      deploy: { locations: [parseInt(location)], dedicated_ip: false, port_range: [] },
      start_on_completion: true,
    };
    if (!location) throw new Error("Config location panel belum di-set — .setpanel v1 location list buat cek.");
    await panelReq(panelNum, "post", "/servers", payload);
    srv = await findBuilderServer(panelNum);
    if (!srv) throw new Error("Server builder ke-buat tapi gak ketemu pas dicek ulang.");
  }
  const withAlloc = await panelReq(panelNum, "get", `/servers/${srv.id}?include=allocations`);
  const a = withAlloc.attributes?.relationships?.allocations?.data || [];
  const primary = a.find((x) => x.attributes?.primary) || a[0];
  if (!primary) throw new Error("Server builder gak punya alokasi port.");
  return {
    id: srv.id,
    name: srv.name,
    url: `http://${primary.attributes.ip}:${primary.attributes.port}`,
  };
}

async function powerSignal(panelNum, serverId, signal) {
  await panelReq(panelNum, "post", `/servers/${serverId}/power`, { signal });
}

async function waitHealthy(url, timeoutMs) {
  const t0 = Date.now();
  while (Date.now() - t0 < timeoutMs) {
    try {
      const r = await recvFetch(`${url}/health`, { timeoutMs: 5000 });
      if (r.ok) return true;
    } catch {}
    await new Promise((r) => setTimeout(r, 3000));
  }
  return false;
}

async function ensureHealthy(panelNum, info) {
  if (await waitHealthy(info.url, 10000)) return;
  try { await powerSignal(panelNum, info.id, "start"); } catch {}
  if (!(await waitHealthy(info.url, 90000))) {
    throw new Error(`Builder gak merespon di ${info.url}. Cek console server 'apk-builder' di panel — image apk-builder:latest udah di-build? (panduan Langkah 17)`);
  }
}

// ── kirim job + tunggu selesai → return {buffer, apkName, seconds, type} ──
export async function runBuildJob(panelNum, job, onStatus) {
  const panel = getPanel(panelNum);
  const info = await ensureBuilderServer(panelNum, panel?.location);
  await ensureHealthy(panelNum, info);
  onStatus?.(`Builder online: ${info.url}`);

  const res = await recvFetch(`${info.url}/build`, {
    method: "POST",
    headers: {
      "Content-Type": job.kind === "zip" ? "application/zip" : "application/json",
      ...(job.token ? { "X-Build-Token": job.token } : {}),
    },
    body: job.kind === "zip" ? job.buffer : JSON.stringify(job.payload || {}),
    timeoutMs: job.kind === "zip" ? Math.min(MAX_ZIP_BYTES, 120000) : 30000,
  });
  const rj = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(rj.error || `builder nolak job (HTTP ${res.status})`);

  const t0 = Date.now();
  let lastState = "building";
  while (Date.now() - t0 < BUILD_TIMEOUT_MS) {
    await new Promise((r) => setTimeout(r, 5000));
    const sr = await recvFetch(`${info.url}/status`, { timeoutMs: 10000 });
    const st = await sr.json();
    if (st.state === "building" && st.state !== lastState) { lastState = st.state; onStatus?.("Build jalan…"); }
    if (st.state === "done") {
      const apk = st.apks?.[0];
      if (!apk) throw new Error("Build selesai tapi gak ada APK.");
      const dl = await recvFetch(`${info.url}/download/0`, { timeoutMs: 120000 });
      if (!dl.ok) throw new Error("Gagal download APK dari builder.");
      const buf = Buffer.from(await dl.arrayBuffer());
      return { buffer: buf, apkName: apk.name, size: buf.length, seconds: st.seconds || 0, type: st.type || "-" };
    }
    if (st.state === "error") throw new Error(st.error || "build gagal");
    if (st.state === "idle") throw new Error("builder balik idle tanpa hasil — cek ulang");
  }
  throw new Error("Timeout 25 menit — build kegedean lama. Proyek terlalu berat / koneksi lambat.");
}

// ── info status buat kartu .buildapk status ──
export async function builderStatus(panelNum) {
  const info = await ensureBuilderServer(panelNum, getPanel(panelNum)?.location);
  let st = null;
  try {
    const r = await recvFetch(`${info.url}/status`, { timeoutMs: 5000 });
    st = await r.json();
  } catch { st = { state: "offline" }; }
  return { info, state: st.state, type: st.type, seconds: st.seconds, apks: st.apks || [], error: st.error, logTail: (st.logTail || "").slice(-600) };
}
