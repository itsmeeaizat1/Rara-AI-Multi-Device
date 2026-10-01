// RARA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// src/lib/rara-web-server.js — RARA LIVE WEB SERVER
//
// Fitur "live HTML di dalam WhatsApp" (request owner 2026-09-07, inspirasi
// video bot scene: buka halaman HTML live di dalam WA, cukup lewat
// websocket Baileys + tombol nativeFlow cta_url).
//
// Server HTTP murni Node (TANPA dependensi baru — gak ada express/ws).
// - GET /        → web/live.html (Rara Live Dashboard)
// - GET /stats   → JSON stat live (uptime, RAM, load, versi, waktu)
// - GET /events  → SSE stream — push stat tiap 2 detik (rasa "websocket live")
//
// Port: env NOVA_WEB_PORT (default 8080). Host publik: env NOVA_WEB_URL
// (override manual, mis. http://1.2.3.4:8080 atau domain+https).
// Kalau port sibuk → warning console aja, bot TIDAK crash.
//
// Di VPS nanti (kalau pakai domain+HTTPS): ntar cukup reverse proxy nginx
// ke port ini — struktur kode gak perlu diubah.

import http from "node:http";
import os from "node:os";
import fs from "node:fs/promises";
import path from "node:path";
import { config } from "../../config.js";

let _server = null;
const SSE_CLIENTS = new Set();

function getStats() {
  const total = os.totalmem() / (1024 * 1024 * 1024);
  const free = os.freemem() / (1024 * 1024 * 1024);
  const used = total - free;
  const load = os.loadavg();
  const cores = os.cpus().length || 1;
  return {
    ok: true,
    version: config.bot?.version || "24.0.0",
    botName: config.bot?.name || "Rara AI",
    uptime: Math.floor(process.uptime()),
    platform: `${os.type()} ${os.release()} • ${cores} core`,
    ramUsed: used.toFixed(1),
    ramTotal: total.toFixed(1),
    ramPct: Math.round((used / total) * 100),
    load1: load[0],
    loadPct: Math.min(100, Math.round((load[0] / cores) * 100)),
    time: Date.now(),
  };
}

// IP publik/utama server — buat URL default yang dibagikan tombol .web live.
function detectHost() {
  const ifaces = os.networkInterfaces();
  for (const name of Object.keys(ifaces)) {
    for (const i of ifaces[name] || []) {
      if (i.family === "IPv4" && !i.internal) return i.address;
    }
  }
  return "127.0.0.1";
}

export function getNovaWebUrl() {
  if (process.env.NOVA_WEB_URL) return process.env.NOVA_WEB_URL.replace(/\/+$/, "");
  const port = Number(process.env.NOVA_WEB_PORT) || 8080;
  return `http://${detectHost()}:${port}`;
}

export function isNovaWebRunning() {
  return !!_server;
}

export function initNovaWebServer(sock) {
  if (_server) return _server;
  const port = Number(process.env.NOVA_WEB_PORT) || 8080;

  _server = http.createServer(async (req, res) => {
    const url = (req.url || "/").split("?")[0];
    try {
      if (url === "/" || url === "/live" || url === "/index.html") {
        const html = await fs.readFile(path.join(process.cwd(), "web", "live.html"), "utf8");
        res.writeHead(200, { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" });
        return res.end(html);
      }
      if (url === "/stats") {
        res.writeHead(200, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" });
        return res.end(JSON.stringify(getStats()));
      }
      if (url === "/events") {
        res.writeHead(200, {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-store",
          Connection: "keep-alive",
        });
        res.write(`data: ${JSON.stringify(getStats())}\n\n`);
        const timer = setInterval(() => {
          try { res.write(`data: ${JSON.stringify(getStats())}\n\n`); } catch {}
        }, 2000);
        SSE_CLIENTS.add(res);
        req.on("close", () => { clearInterval(timer); SSE_CLIENTS.delete(res); });
        return;
      }
      res.writeHead(404, { "Content-Type": "text/plain" });
      return res.end("404 — Rara Live");
    } catch (e) {
      res.writeHead(500, { "Content-Type": "text/plain" });
      return res.end("500 — Rara Live error: " + e.message);
    }
  });

  _server.on("error", (e) => {
    if (e.code === "EADDRINUSE") {
      console.warn(`[rara-web] Port ${port} sibuk — Rara Live web server gak dinyalakan (bot tetap jalan).`);
    } else {
      console.error("[rara-web] Error server:", e.message);
    }
    _server = null;
  });

  _server.listen(port, "0.0.0.0", () => {
    console.log(`[rara-web] Rara Live web server ON → http://0.0.0.0:${port} (${getNovaWebUrl()})`);
  });
  return _server;
}
