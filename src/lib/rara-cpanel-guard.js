// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
// rara-cpanel-guard.js — Resource Guard cpanel (owner 7 Okt 2026):
// "fitur protectnya meliputi limit cpu klo melebihi cpu panel dimatikan,
// limit disk, limit ram, dan fitur protect lainnya" — monitor tiap server
// panel yang dibuat bot (panelClientKeys) via Client API; yang nekat batas
// → dimatikan otomatis + notif owner DM + saluran (klo toggle saluran aktif).
// Threshold 0 = mati. Aksi default "kill" (hentikan paksa) — bisa "stop".
// Pola monitor: ala rara-rain-notify (setSock + syncGuardMonitor, timer unref).
import axios from "axios";
import { getDatabase } from "./rara-database.js";
import { logger } from "./rara-logger.js";

const DEFAULTS = {
  enabled: false,
  cpuMax: 0,        // % cpu_absolute — 0 = gak dicek
  ramMax: 0,       // % dari limit RAM — 0 = gak dicek
  diskMax: 0,      // % dari limit disk — 0 = gak dicek
  action: "kill",  // "kill" | "stop"
  intervalMenit: 5,
  lastRun: 0,
};
const COOLDOWN_MS = 30 * 60 * 1000; // anti-spam notif per server

let _sock = null;
let timer = null;

export function setGuardSock(sock) {
  if (sock) _sock = sock;
}

function getSettings() {
  try {
    const db = getDatabase();
    const cur = db.setting("cpanelGuard") || {};
    return { ...DEFAULTS, ...(typeof cur === "object" ? cur : {}) };
  } catch {
    return { ...DEFAULTS };
  }
}

function saveSettings(st) {
  try {
    const db = getDatabase();
    db.setting("cpanelGuard", st);
    db.save();
  } catch (e) {
    logger.error?.("cpanel-guard", "gagal simpan settings: " + (e?.message || e));
  }
}

export function setGuardField(key, value) {
  const st = getSettings();
  st[key] = value;
  saveSettings(st);
  return st;
}

export function getGuardStatus() {
  const st = getSettings();
  return { ...st, running: !!timer };
}

function getCooldowns() {
  try {
    const db = getDatabase();
    return db.setting("cpanelGuardCooldown") || {};
  } catch { return {}; }
}
function saveCooldowns(map) {
  try {
    const db = getDatabase();
    db.setting("cpanelGuardCooldown", map);
    db.save();
  } catch {}
}

// ───────────────────────── util format ─────────────────────────
export function formatBytes(n) {
  const v = Number(n) || 0;
  if (v >= 1024 ** 3) return (v / 1024 ** 3).toFixed(2) + " GB";
  if (v >= 1024 ** 2) return (v / 1024 ** 2).toFixed(1) + " MB";
  return Math.round(v / 1024) + " KB";
}

function pct(used, limit) {
  if (!limit) return 0;
  return (Number(used) / (Number(limit) || 1)) * 100;
}

// ───────────────────────── cek per server ─────────────────────────
// result: { violation: null | "cpu"|"ram"|"disk", cpu, ramPct, diskPct, state, name, limits }
export async function checkServer(target, st) {
  const base = String(target.domain || "").replace(/\/+$/, "");
  const headers = {
    Authorization: `Bearer ${target.ptlc}`,
    "Content-Type": "application/json",
    Accept: "application/json",
  };
  const res = await axios.get(`${base}/api/client/servers/${target.serverId}/resources`, { headers, timeout: 10000 });
  const attr = res.data?.attributes || res.data?.data?.attributes || {};
  const stats = attr.resource_stats || attr.resources || attr;
  const state = attr.current_state || attr.status || "";

  // detail server: nama + limits (RAM MB / disk MB / cpu %)
  let name = target.serverLabel || target.serverId;
  let limits = { memory: 0, disk: 0, cpu: 0 };
  try {
    const det = await axios.get(`${base}/api/client/servers/${target.serverId}`, { headers, timeout: 10000 });
    const d = det.data?.attributes || det.data?.data?.attributes || {};
    if (d.name) name = d.name;
    limits = d.limits || limits;
  } catch {}

  const cpu = Number(stats.cpu_absolute ?? stats.cpu ?? 0);
  const memBytes = Number(stats.memory_bytes ?? stats.memory ?? 0);
  const diskBytes = Number(stats.disk_bytes ?? stats.disk ?? 0);
  const ramPct = limits.memory ? pct(memBytes, Number(limits.memory) * 1024 * 1024) : 0;
  const diskPct = limits.disk ? pct(diskBytes, Number(limits.disk) * 1024 * 1024) : 0;

  let violation = null;
  if (state === "running") {
    if (st.cpuMax > 0 && cpu > st.cpuMax) violation = "cpu";
    else if (st.ramMax > 0 && limits.memory && ramPct > st.ramMax) violation = "ram";
    else if (st.diskMax > 0 && limits.disk && diskPct > st.diskMax) violation = "disk";
  }
  return { violation, cpu, ramPct, diskPct, memBytes, diskBytes, state, name, limits };
}

async function powerOff(target, action) {
  const base = String(target.domain || "").replace(/\/+$/, "");
  await axios.post(
    `${base}/api/client/servers/${target.serverId}/power`,
    { signal: action === "stop" ? "stop" : "kill" },
    { headers: { Authorization: `Bearer ${target.ptlc}`, "Content-Type": "application/json", Accept: "application/json" }, timeout: 10000 }
  );
}

const VIOLATION_LABEL = { cpu: "CPU", ram: "RAM", disk: "Disk" };

// ───────────────────────── run satu putaran ─────────────────────────
export async function runGuardCheck(sockArg, opts = {}) {
  const sock = sockArg || _sock;
  const st = getSettings();
  // guard mati → gak ada aksi otomatis (cek manual owner bisa bypass via ignoreEnabled)
  if (!st.enabled && !opts.ignoreEnabled) {
    return { checked: 0, violations: [], errors: 0, skipped: 0, disabled: true };
  }
  let targets = {};
  try {
    const db = getDatabase();
    targets = db.setting("panelClientKeys") || {};
  } catch {}
  const entries = Object.entries(targets).filter(([, v]) => v?.ptlc && v?.domain && v?.serverId);
  const results = { checked: 0, violations: [], errors: 0, skipped: 0 };
  st.lastRun = Date.now();
  saveSettings(st);

  const cooldowns = getCooldowns();
  for (const [sender, target] of entries) {
    const key = sender + "_" + target.serverId;
    // cooldown: barusan dimatikan → skip (anti dobel kill + spam notif)
    if (cooldowns[key] && Date.now() - cooldowns[key] < COOLDOWN_MS) { results.skipped++; continue; }
    let info;
    try {
      info = await checkServer(target, st);
      results.checked++;
    } catch (e) {
      results.errors++;
      logger.error?.("cpanel-guard", "cek " + key + " gagal: " + (e?.message || e));
      continue;
    }
    if (!info.violation) continue;

    // nekat batas → matikan
    try {
      await powerOff(target, st.action);
    } catch (e) {
      logger.error?.("cpanel-guard", "matikan " + key + " gagal: " + (e?.message || e));
      continue;
    }
    cooldowns[key] = Date.now();
    saveCooldowns(cooldowns);

    const meteran = [];
    if (info.violation === "cpu") meteran.push(`⚙️ CPU: ${info.cpu.toFixed(0)}% (batas ${st.cpuMax}%)`);
    if (info.violation === "ram") meteran.push(`💾 RAM: ${info.ramPct.toFixed(0)}% (${formatBytes(info.memBytes)} / ${info.limits.memory} MB, batas ${st.ramMax}%)`);
    if (info.violation === "disk") meteran.push(`📁 Disk: ${info.diskPct.toFixed(0)}% (${formatBytes(info.diskBytes)} / ${info.limits.disk} MB, batas ${st.diskMax}%)`);

    const num = String(sender).replace(/@s\.whatsapp\.net$/, "");
    results.violations.push({ sender, serverId: target.serverId, name: info.name, username: target.username, kind: info.violation, meteran });

    // ── notif owner DM (anti-throw) ──
    if (sock) {
      try {
        const { default: config } = await import("../../config.js");
        const owners = config?.owner?.number || [];
        const txt = `「 ✦ Server Dimatikan Otomatis ✦ 」

🖥 Server: ${info.name}
📱 Nomor: ${num}
🏷 Username: ${target.username || "-"}
${VIOLATION_LABEL[info.violation] || "Resource"} melebihi batas guard:
${meteran.join("\n")}

Aksi: server dimatikan (${st.action === "stop" ? "stop" : "kill"}).
Cek setting: .cpanelprotect settings
Nyalain manual: .cpanelprotect guard off (kalau mau lepas proteksi)`;
        for (const o of owners) {
          try { await sock.sendMessage(o.includes("@") ? o : o + "@s.whatsapp.net", { text: txt }); } catch {}
        }
      } catch {}

      // ── notif saluran (klo toggle saluranGuard aktif) ──
      try {
        const { notifyServerGuardOff } = await import("./rara-saluran-broadcast.js");
        await notifyServerGuardOff(sock, {
          phoneNumber: num,
          username: target.username || "-",
          server: info.name,
          serverId: target.serverId,
          kind: VIOLATION_LABEL[info.violation] || "Resource",
          meter: meteran.join(" • "),
          action: st.action === "stop" ? "Stop" : "Kill",
        });
      } catch {}
    }
  }
  return results;
}

// ───────────────────────── monitor timer ─────────────────────────
export function syncGuardMonitor() {
  const st = getSettings();
  const aktif = st.enabled && (st.cpuMax > 0 || st.ramMax > 0 || st.diskMax > 0);
  if (aktif && !timer) startTimer();
  if (!aktif && timer) stopGuardMonitor();
  return { started: !!timer, needLimit: st.enabled && !aktif };
}

function startTimer() {
  const st = getSettings();
  const menit = Math.max(1, Number(st.intervalMenit) || DEFAULTS.intervalMenit);
  timer = setInterval(() => {
    runGuardCheck().catch((e) => logger.error?.("cpanel-guard", "runGuardCheck: " + (e?.message || e)));
  }, menit * 60000);
  if (typeof timer.unref === "function") timer.unref();
  logger.info?.("cpanel-guard", "monitor JALAN — cek tiap " + menit + " mnt");
}

export function stopGuardMonitor() {
  if (timer) { clearInterval(timer); timer = null; }
}

export function _setTimerForTest(t) { timer = t; } // seam e2e
export function _isRunning() { return !!timer; }
