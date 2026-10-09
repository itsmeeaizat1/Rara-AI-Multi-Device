// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
/**
 * .autoapicheck — Auto API Health Monitor
 *
 * Fitur automation "bot masa depan":
 * - Cek kesehatan API endpoint secara berkala (ping HTTP)
 * - Deteksi API yang mati/down otomatis
 * - Notifikasi owner kalau ada API yang down
 * - Auto-switch ke backup API kalau tersedia
 * - Summary report status semua API
 *
 * Commands:
 *   .autoapicheck                — Lihat status semua API + toggle status
 *   .autoapicheck on/off         — Aktifkan/matikan monitoring
 *   .autoapicheck now            — Cek semua API sekarang
 *   .autoapicheck interval <menit> — Set interval cek (default: 30 menit)
 *   .autoapicheck add <nama> <url> [backup_url] [kategori] — Tambah API ke monitor
 *   .autoapicheck del <nama>     — Hapus API dari monitor
 *   .autoapicheck notify on/off  — Toggle notifikasi owner saat API down
 *   .autoapicheck list           — Lihat daftar API yang dimonitor
 */

import { raraError, raraEmpty, raraGuide, raraNoInput, raraWrap } from "../../src/lib/rara-menu-style.js";
import { getDatabase } from "../../src/lib/rara-database.js";
import config from "../../config.js";
import te from "../../src/lib/rara-error.js";
import { getTioEndpoint, getTioBase } from "../../src/lib/config/env-loader.js";

const pluginConfig = {
  name: "autoapicheck",
  alias: ["autoapicheck", "apimonitor", "apiscan", "apisurgeon"],
  category: "owner",
  description: "Auto API Health Monitor — cek API down otomatis + notifikasi owner",
  usage: ".autoapicheck <on/off/now/interval/add/del/notify/list>",
  example: ".autoapicheck now",
  isOwner: true,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 3,
  energi: 0,
  isEnabled: true,
};

// ============================================================
// API REGISTRY — Daftar API yang dimonitor
// ============================================================
const DEFAULT_APIS = [
  { name: "siputzx", url: "https://api.siputzx.my.id/api/", category: "primary", backup: null },
  { name: "velyn", url: "https://velyn.me/api/", category: "primary", backup: null },
  { name: "nexray", url: "https://api.nexray-web.my.id/api/", category: "primary", backup: null },
  { name: "api-faa", url: "https://api-faa.my.id/api/health", category: "primary", backup: null },
  { name: "zenzapis", url: "https://zenzapis.cloud", category: "primary", backup: null },

  { name: "tio-ai", url: getTioBase() + "/v1/models", category: "ai", backup: null },
  { name: "xemoz-deepseek", url: "https://api-xemoz-official.my.id/api/ai/deepseek-v3", category: "ai", backup: getTioEndpoint() },
  { name: "xemoz-gpt5", url: "https://api-xemoz-official.my.id/api/ai/gpt-5", category: "ai", backup: null },

  { name: "fastdl-yt", url: "https://api-wh.fastdl.app/api/ytdl?url=test", category: "download", backup: null },
  { name: "cobalt", url: "https://api.cobalt.tools/api/json", category: "download", backup: null },

  { name: "aladhan", url: "https://api.aladhan.com/v1/status", category: "islami", backup: null },
  { name: "alquran-cloud", url: "https://api.alquran.cloud/v1/status", category: "islami", backup: null },

  { name: "bmkg", url: "https://data.bmkg.go.id/DataMKG/TEWS/autogempa.json", category: "info", backup: null },
  { name: "cnn-news", url: "https://api-xemoz-official.my.id/api/news/news-cnn", category: "info", backup: null },

  { name: "anabot", url: "https://anabot.my.id/api/tools/izen", category: "stalker", backup: null },

  { name: "brat-faa", url: "https://api-faa.my.id/faa/brat", category: "maker", backup: null },
  { name: "dicebear", url: "https://api.dicebear.com/7.x/fun/svg", category: "maker", backup: null },

  { name: "tinyurl", url: "https://tinyurl.com/api-create.php?url=https://example.com", category: "tools", backup: "https://is.gd/create.php?format=simple&url=https://example.com" },
  { name: "1pt-co", url: "https://api.1pt.co/add", category: "tools", backup: null },

  { name: "hadith-galih", url: "https://api-hadith-api.vercel.app", category: "islami", backup: null },
  { name: "anilist", url: "https://graphql.anilist.co", category: "search", backup: null },
];

// ============================================================
// MONITOR STATE
// ============================================================
let monitorInterval = null;
let lastCheckResults = {};
let isChecking = false;

// ============================================================
// HELPERS
// ============================================================

function getSettings() {
  const db = getDatabase();
  return {
    enabled: db.setting("apicheck_enabled") || false,
    intervalMin: db.setting("apicheck_interval") || 30,
    notifyOwner: db.setting("apicheck_notify") !== false,
  };
}

function getCustomApis() {
  const db = getDatabase();
  return db.setting("apicheck_custom") || [];
}

function getAllApis() {
  return [...DEFAULT_APIS, ...getCustomApis()];
}

async function pingApi(url, timeoutMs = 8000) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const start = Date.now();
    const res = await fetch(url, {
      method: "GET",
      signal: controller.signal,
      headers: { "User-Agent": "RaraBot/22.0.0" },
    });
    const elapsed = Date.now() - start;
    clearTimeout(timeout);
    return {
      ok: res.ok || res.status < 500,
      status: res.status,
      latency: elapsed,
    };
  } catch (err) {
    clearTimeout(timeout);
    const isTimeout = err.name === "AbortError";
    return {
      ok: false,
      status: isTimeout ? "TIMEOUT" : "ERR",
      latency: isTimeout ? timeoutMs : 0,
      error: err.message?.slice(0, 80) || "Unknown error",
    };
  }
}

async function checkAllApis() {
  if (isChecking) return { results: lastCheckResults, downApis: [] };
  isChecking = true;

  const apis = getAllApis();
  const results = {};
  const downApis = [];

  const batchSize = 5;
  for (let i = 0; i < apis.length; i += batchSize) {
    const batch = apis.slice(i, i + batchSize);
    const batchResults = await Promise.all(
      batch.map(async (api) => {
        const result = await pingApi(api.url);
        return { api, result };
      })
    );

    for (const { api, result } of batchResults) {
      results[api.name] = {
        name: api.name,
        category: api.category,
        url: api.url,
        ok: result.ok,
        status: result.status,
        latency: result.latency,
        error: result.error || null,
        hasBackup: !!api.backup,
        backupUrl: api.backup || null,
        checkedAt: Date.now(),
      };

      if (!result.ok) {
        downApis.push(results[api.name]);
        if (api.backup) {
          const backupResult = await pingApi(api.backup);
          results[api.name].backupOk = backupResult.ok;
          results[api.name].backupLatency = backupResult.latency;
        }
      }
    }
  }

  lastCheckResults = results;
  isChecking = false;
  return { results, downApis };
}

async function notifyOwnerDown(downApis, sock) {
  const settings = getSettings();
  if (!settings.notifyOwner || downApis.length === 0) return;

  const ownerNums = (config.owner?.number || []).map((n) => `${n}@s.whatsapp.net`);
  if (ownerNums.length === 0) return;

  const lines = downApis.map((api) => {
    let line = `${api.name} (${api.category}) — ${api.status}`;
    if (api.error) line += ` | ${api.error}`;
    if (api.hasBackup) {
      line += api.backupOk ? " | Backup: OK" : " | Backup: DOWN";
    }
    return line;
  });

  const msg = raraWrap("API Health Alert", [
    `🚨 *${downApis.length} API DOWN*`,
    `━━━━━━━━━━━━━━`,
    `*Waktu: ${new Date().toLocaleString("id-ID", { timeZone: "Asia/Jakarta" })}*`,
    ``,
    ...lines,
    ``,
    `*Gunakan .autoapicheck now untuk re-check*`,
  ]);

  for (const num of ownerNums) {
    try {
      await sock.sendMessage(num, { text: msg });
    } catch {}
  }
}

function startMonitor(sock) {
  const settings = getSettings();
  if (monitorInterval) clearInterval(monitorInterval);
  if (!settings.enabled) return;

  const intervalMs = settings.intervalMin * 60 * 1000;
  monitorInterval = setInterval(async () => {
    try {
      const { downApis } = await checkAllApis();
      if (downApis.length > 0) {
        await notifyOwnerDown(downApis, sock);
      }
    } catch (err) {
      console.error("autoapicheck monitor error:", err);
    }
  }, intervalMs);

  console.log(`[autoapicheck] Monitor started — interval: ${settings.intervalMin}min`);
}

function stopMonitor() {
  if (monitorInterval) {
    clearInterval(monitorInterval);
    monitorInterval = null;
  }
}

export { startMonitor, stopMonitor, checkAllApis };

// ============================================================
// HANDLER
// ============================================================
async function handler(m, { sock, config: botConfig }) {
  const prefix = botConfig.command?.prefix || ".";
  const args = m.args || [];
  const subCmd = (args[0] || "").toLowerCase();
  const settings = getSettings();

  // .autoapicheck (no args) — status dashboard
  if (!subCmd || subCmd === "status" || subCmd === "cek") {
    const apis = getAllApis();
    const total = apis.length;
    const checked = Object.keys(lastCheckResults).length;
    const upCount = checked > 0 ? Object.values(lastCheckResults).filter((r) => r.ok).length : 0;
    const downCount = checked > 0 ? checked - upCount : 0;

    const lines = [
      `🩺 *STATUS*`,
      `━━━━━━━━━━━━━━`,
      `▪ *Monitoring:* ${settings.enabled ? "✅ AKTIF" : "❌ MATI"}`,
      `▪ *Interval:* ${settings.intervalMin} menit`,
      `▪ *Notify Owner:* ${settings.notifyOwner ? "ON" : "OFF"}`,
      `▪ *Total API:* ${total}`,
    ];

    if (checked > 0) {
      const categories = {};
      for (const r of Object.values(lastCheckResults)) {
        if (!categories[r.category]) categories[r.category] = { up: 0, down: 0 };
        if (r.ok) categories[r.category].up++;
        else categories[r.category].down++;
      }
      lines.push(``, `📊 *CEK TERAKHIR:* ${upCount} OK / ${downCount} DOWN`, `━━━━━━━━━━━━━━`);
      for (const [cat, counts] of Object.entries(categories)) {
        const status = counts.down > 0 ? `${counts.up}/${counts.up + counts.down}` : "OK";
        lines.push(`▪ *${cat}:* ${status}`);
      }
    } else {
      lines.push(`▪ *Cek terakhir:* belum pernah`);
    }

    lines.push(``, `*Ketik .autoapicheck now untuk cek sekarang*`);

    await m.reply(raraWrap("API Health Monitor", lines));
    return;
  }

  // .autoapicheck on
  if (subCmd === "on") {
    const db = getDatabase();
    db.setting("apicheck_enabled", true);
    startMonitor(sock);
    await m.reply(raraWrap("API Health Monitor", [
      `✅ *MONITORING: AKTIF*`,
      `━━━━━━━━━━━━━━`,
      `▪ *Interval:* ${settings.intervalMin} menit`,
      `▪ *Notify:* ${settings.notifyOwner ? "ON" : "OFF"}`,
      ``,
      `*Bot akan cek API setiap ${settings.intervalMin} menit*`,
      `Owner akan dinotifikasi jika ada API down`,
    ]));
    return;
  }

  // .autoapicheck off
  if (subCmd === "off") {
    const db = getDatabase();
    db.setting("apicheck_enabled", false);
    stopMonitor();
    await m.reply(raraWrap("API Health Monitor", [
      `❌ *MONITORING: MATI*`,
      `━━━━━━━━━━━━━━`,
      `*API tidak akan dicek otomatis*`,
    ]));
    return;
  }

  // .autoapicheck now — cek semua API sekarang
  if (subCmd === "now") {
    await m.react("🕒");

    const apis = getAllApis();
    await m.reply(raraWrap("API Health Check", [
      `🕒 *Mengecek ${apis.length} API endpoints...*`,
      `*Mohon tunggu*`,
    ]));

    const { results, downApis } = await checkAllApis();
    await m.react("🐣");

    const lines = [];
    const categories = {};

    for (const api of apis) {
      const r = results[api.name];
      if (!r) continue;
      if (!categories[r.category]) categories[r.category] = [];
      const statusIcon = r.ok ? "OK" : "DOWN";
      const latency = r.ok ? `${r.latency}ms` : (r.error || r.status);
      let line = `${api.name}: ${statusIcon}`;
      if (r.ok) line += ` (${latency})`;
      else {
        line += ` (${latency})`;
        if (r.hasBackup) {
          line += r.backupOk ? " | Backup OK" : " | Backup DOWN";
        }
      }
      categories[r.category].push(line);
    }

    const total = apis.length;
    const upN = Object.values(results).filter((r) => r.ok).length;
    const downN = total - upN;
    lines.push(`📊 *HASIL: ${upN} OK / ${downN} DOWN / ${total} TOTAL*`, `━━━━━━━━━━━━━━`);
    lines.push(``);

    for (const [cat, apiLines] of Object.entries(categories)) {
      lines.push(`▪ *${cat.toUpperCase()}:*`);
      for (const line of apiLines) {
        lines.push(`▪ ${line}`);
      }
      lines.push(``);
    }

    if (downN > 0) {
      lines.push(`❗ *${downN} API down! Owner akan dinotifikasi*`);
    } else {
      lines.push(`✅ *Semua API sehat!*`);
    }

    await m.reply(raraWrap("API Health Report", lines));

    // Notify owner kalau ada yang down dan command dijalankan bukan owner
    if (downApis.length > 0) {
      await notifyOwnerDown(downApis, sock);
    }
    return;
  }

  // .autoapicheck interval <menit>
  if (subCmd === "interval") {
    const minutes = parseInt(args[1]);
    if (!minutes || minutes < 5) {
      return m.reply(raraError("autoapicheck", "Interval minimal 5 menit", `.autoapicheck interval 30`));
    }
    if (minutes > 1440) {
      return m.reply(raraError("autoapicheck", "Interval maksimal 1440 menit (24 jam)", `.autoapicheck interval 30`));
    }
    const db = getDatabase();
    db.setting("apicheck_interval", minutes);

    if (settings.enabled) {
      stopMonitor();
      startMonitor(sock);
    }

    await m.reply(raraWrap("API Health Monitor", [
      `⚙️ *INTERVAL: ${minutes} MENIT*`,
      `━━━━━━━━━━━━━━`,
      settings.enabled ? `*Monitor direstart dengan interval baru*` : `*Aktifkan dengan .autoapicheck on*`,
    ]));
    return;
  }

  // .autoapicheck add <nama> <url> [backup_url] [kategori]
  if (subCmd === "add") {
    const name = args[1]?.toLowerCase();
    const url = args[2];
    const backup = args[3] || null;
    const category = args[4] || "custom";

    if (!name || !url) {
      return m.reply(raraError("autoapicheck", "Format: .autoapicheck add <nama> <url> [backup_url] [kategori]", `.autoapicheck add myapi https://api.example.com https://backup.example.com primary`));
    }

    try {
      new URL(url);
    } catch {
      return m.reply(raraError("autoapicheck", "URL tidak valid", `.autoapicheck add ${name} <url_valid>`));
    }

    const db = getDatabase();
    const custom = db.setting("apicheck_custom") || [];

    if (custom.some((a) => a.name === name) || DEFAULT_APIS.some((a) => a.name === name)) {
      return m.reply(raraError("autoapicheck", `API "${name}" sudah ada`, `.autoapicheck list`));
    }

    custom.push({ name, url, backup, category });
    db.setting("apicheck_custom", custom);

    await m.reply(raraWrap("API Health Monitor", [
      `✅ *API DITAMBAHKAN: ${name}*`,
      `━━━━━━━━━━━━━━`,
      `▪ *URL:* ${url}`,
      `▪ *Backup:* ${backup || "tidak ada"}`,
      `▪ *Category:* ${category}`,
    ]));
    return;
  }

  // .autoapicheck del <nama>
  if (subCmd === "del" || subCmd === "delete" || subCmd === "remove") {
    const name = args[1]?.toLowerCase();
    if (!name) {
      return m.reply(raraError("autoapicheck", "Format: .autoapicheck del <nama>", `.autoapicheck del myapi`));
    }

    const db = getDatabase();
    const custom = db.setting("apicheck_custom") || [];
    const filtered = custom.filter((a) => a.name !== name);

    if (filtered.length === custom.length) {
      if (DEFAULT_APIS.some((a) => a.name === name)) {
        return m.reply(raraError("autoapicheck", `API "${name}" adalah default, tidak bisa dihapus`, `Hanya custom API yang bisa dihapus`));
      }
      return m.reply(raraError("autoapicheck", `API "${name}" tidak ditemukan`, `.autoapicheck list`));
    }

    db.setting("apicheck_custom", filtered);
    await m.reply(raraWrap("API Health Monitor", [
      `🗑️ *API DIHAPUS: ${name}*`,
    ]));
    return;
  }

  // .autoapicheck notify on/off
  if (subCmd === "notify") {
    const action = args[1]?.toLowerCase();
    if (action !== "on" && action !== "off") {
      return m.reply(raraError("autoapicheck", "Format: .autoapicheck notify on/off", `.autoapicheck notify on`));
    }
    const db = getDatabase();
    db.setting("apicheck_notify", action === "on");
    await m.reply(raraWrap("API Health Monitor", [
      `🔔 *NOTIFY OWNER: ${action === "on" ? "ON" : "OFF"}*`,
      `━━━━━━━━━━━━━━`,
      action === "on" ? `*Owner akan dinotifikasi saat API down*` : `*Notifikasi dimatikan*`,
    ]));
    return;
  }

  // .autoapicheck list — daftar semua API yang dimonitor
  if (subCmd === "list") {
    const apis = getAllApis();
    const lines = [`📋 *TOTAL: ${apis.length} API*`, `━━━━━━━━━━━━━━`];

    const categories = {};
    for (const api of apis) {
      if (!categories[api.category]) categories[api.category] = [];
      categories[api.category].push(api);
    }

    for (const [cat, apiList] of Object.entries(categories)) {
      lines.push(`▪ *${cat.toUpperCase()} (${apiList.length}):*`);
      for (const api of apiList) {
        const lastResult = lastCheckResults[api.name];
        const status = lastResult ? (lastResult.ok ? "✅ OK" : "❌ DOWN") : "➖ belum dicek";
        const backup = api.backup ? " +backup" : "";
        lines.push(`▪ ${api.name}: ${status}${backup}`);
      }
      lines.push(``);
    }

    lines.push(`*Custom API:* .autoapicheck add/del`);
    await m.reply(raraWrap("API Monitor List", lines));
    return;
  }

  // Unknown subcommand
  return m.reply(raraError("autoapicheck", te(m.prefix, m.command, m.pushName), ".autoapicheck now"));
}

export { pluginConfig, handler, pluginConfig as config };
