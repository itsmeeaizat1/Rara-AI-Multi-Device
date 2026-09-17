// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// ============================================================
// 🔹 GOOGLE AI RICH .googleairich — plugin airich KEDUA & CONTOH
//   pertama cara bikin fitur AI rich DARI NOL pakai engine bersama
//   src/lib/nova-airich.js: plugin cuma nyuplain STRING HTML,
//   engine yang urus certificate + polish bottom sheet + relay.
// 🔹 Efek: pas muncul di chat kayak BUKA GOOGLE di dalam gelembung —
//   homepage Google (logo warna + search bar) → query diketik
//   animasi → halaman hasil ala SERP (hasil ASLI dari DuckDuckGo,
//   judul biru + url hijau + snippet abu).
// 🔹 HTML self-contained: JS cuma animasi (progressive enhancement —
//   kalau webview Meta gak jalanin JS, hasil tetep keliatan via CSS
//   delay-reveal). Tanpa JS pun gak rusak.
// ============================================================
import { claraWrap } from "../../src/lib/nova-menu-style.js";
import { sendRichResponse } from "../../src/lib/nova-airich.js";

const pluginConfig = {
  name: "googleairich",
  alias: ["googleairich", "bukagoogle", "grich"],
  category: "airich",
  description: "Google AI Rich 🔍 — buka Google langsung di dalam chat (hasil asli)",
  usage: ".googleairich [query]",
  example: ".googleairich resep rendang",
  isOwner: false, isPremium: false, isGroup: true, isPrivate: true,
  cooldown: 20, energi: 2, isEnabled: true,
};

// ── seams http buat e2e offline ──
const __gHttp = {};
export function _setGoogleRichHttpForTest(h) { Object.assign(__gHttp, h); }
export function _resetGoogleRichHttpForTest() { for (const k of Object.keys(__gHttp)) delete __gHttp[k]; }

// ── escape — query & hasil dari internet WAJIB di-escape ──
export function esc(s) {
  return String(s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

// ── hasil ASLI dari DuckDuckGo — CHROMIUM BENERAN (DDG blok request
//   axios polos dari IP datacenter → halaman challenge 0 hasil; pola
//   sama kayak .searchsite: browserWebSearch proven live) ──
export async function ddgRichSearch(query) {
  // seam e2e = pengganti browserWebSearch (balikin RAW items — mapping tetep jalan)
  let raw;
  if (__gHttp.ddg) raw = await __gHttp.ddg(query);
  else {
    const { browserWebSearch } = await import("../../src/scraper/nova-web-browser.js");
    raw = await browserWebSearch(query, { limit: 4 });
  }
  if (!Array.isArray(raw) || !raw.length) throw new Error("gak nemu hasil buat query itu (coba query lain)");
  return raw.map((r) => ({
    title: r.title,
    url: r.url,
    snippet: String(r.snippet || "").slice(0, 160),
  }));
}

// ── rakit HTML ala Google — SERP beneran, bukan gambar ──
export function buildGoogleHtml({ query, results }) {
  const hasQuery = !!query;
  const resultCards = (results || []).map((r, idx) => `
    <div class="res" style="animation-delay:${(idx * 0.25 + 0.4).toFixed(2)}s">
      <div class="res-url">${esc(r.url)}</div>
      <div class="res-title">${esc(r.title)}</div>
      <div class="res-snip">${esc(r.snippet || "")}</div>
    </div>`).join("");

  return `<!DOCTYPE html>
<html>
<meta charset="utf-8">
<style>
* { box-sizing: border-box; margin: 0; padding: 0; -webkit-tap-highlight-color: transparent; user-select: none; }
html, body { background: #fff; font-family: arial, sans-serif; width: 100%; height: 100%; }
body { display: flex; align-items: flex-end; }
.card { width: 100%; background: #fff; border-radius: 22px 22px 0 0; box-shadow: 0 -8px 30px rgba(0,0,0,.25); padding: 14px 16px max(14px, env(safe-area-inset-bottom, 14px)); overflow: hidden; }
/* logo google warna klasik */
.logo { text-align: center; font-size: 30px; font-weight: 700; letter-spacing: -1px; margin: ${hasQuery ? "6px 0 10px" : "26px 0 22px"}; }
.logo .g1 { color: #4285F4; } .logo .g2 { color: #EA4335; } .logo .g3 { color: #FBBC05; } .logo .g4 { color: #4285F4; } .logo .g5 { color: #34A853; } .logo .g6 { color: #EA4335; }
/* search bar */
.bar { display: flex; align-items: center; gap: 10px; border: 1px solid #dfe1e5; border-radius: 24px; padding: 14px 18px; box-shadow: 0 1px 6px rgba(32,33,36,.14); }
.bar .glass { width: 18px; height: 18px; border: 2px solid #9aa0a6; border-radius: 50%; position: relative; flex: none; }
.bar .glass::after { content: ''; position: absolute; width: 7px; height: 2px; background: #9aa0a6; bottom: -2px; right: -4px; transform: rotate(45deg); }
.q { font-size: 16px; color: #202124; min-width: 4px; white-space: nowrap; overflow: hidden; max-width: 100%; line-height: 1.3; }
.q .cursor { display: inline-block; width: 2px; height: 16px; background: #202124; vertical-align: -2px; animation: blink 1s infinite; }
@keyframes blink { 50% { opacity: 0; } }
.ph { color: #9aa0a6; font-size: 14px; }
/* tombol klasik google */
.btns { display: ${hasQuery ? "none" : "flex"}; gap: 12px; justify-content: center; margin: 28px 0 8px; }
.btns div { font-size: 13px; color: #3c4043; border: 1px solid #dfe1e5; border-radius: 5px; padding: 10px 16px; background: #f8f9fa; }
.foot { text-align: center; color: #70757a; font-size: 11px; margin-top: ${hasQuery ? "14px" : "20px"}; }
/* SERP hasil */
.res { opacity: 0; animation: pop .35s forwards; padding: 14px 2px 16px 2px; border-bottom: 1px solid #f1f3f4; }
@keyframes pop { to { opacity: 1; } }
.res-url { font-size: 11px; color: #202124; opacity: .75; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; margin-bottom: 4px; }
.res-title { font-size: 16px; color: #1a0dab; line-height: 1.4; margin: 0 0 6px 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.res-snip { font-size: 13px; color: #4d5156; line-height: 1.6; max-height: 5em; overflow: hidden; }
.meta { color: #70757a; font-size: 11px; margin: 10px 0 4px; }
.hint { text-align: center; color: #70757a; font-size: 12px; margin-top: 12px; }
</style>
<body>
<div class="card">
  <div class="logo"><span class="g1">G</span><span class="g2">o</span><span class="g3">o</span><span class="g4">g</span><span class="g5">l</span><span class="g6">e</span></div>
  <div class="bar">
    <div class="glass"></div>
    <div class="q" id="q">${hasQuery ? '<span class="cursor"></span>' : '<span class="ph">Ketik lewat command: .googleairich &lt;query&gt;</span>'}</div>
  </div>
  <div class="btns"><div>Telusuri dengan Google</div><div>Saya Merasa Beruntung</div></div>
  ${hasQuery ? `<div class="meta">Sekitar ${(results.length * 137)} hasil (0,42 detik)</div>${resultCards}` : '<div class="hint">AI Rich Response · hasil asli DuckDuckGo</div>'}
  <div class="foot">Ditampilkan di dalam chat · AI Rich Response</div>
</div>
<script>
// animasi ngetik — progressive enhancement (gak jalan pun tampilan tetep utuh)
(function(){
  var full = ${JSON.stringify(query || "").replace(/</g, '\\u003c').replace(/>/g, '\\u003e')};
  if (!full) return;
  var q = document.getElementById('q');
  var i = 0;
  q.textContent = '';
  var cursor = document.createElement('span'); cursor.className = 'cursor';
  q.appendChild(cursor);
  var t = setInterval(function(){
    i++;
    q.textContent = full.slice(0, i);
    q.appendChild(cursor);
    if (i >= full.length) { clearInterval(t); setTimeout(function(){ cursor.remove(); }, 2200); }
  }, 60);
})();
</script>
</body>
</html>`;
}

async function handler(m, { sock }) {
  try {
    await m.react("🧠");
    const query = (m.text || "").trim() || null;

    let html;
    if (query) {
      const results = await ddgRichSearch(query);
      await m.react("🛠️");
      html = buildGoogleHtml({ query, results });
    } else {
      html = buildGoogleHtml({ query: null, results: [] });
    }

    await sendRichResponse(sock, m.chat, html, {
      title: query ? `Google 🔍 ${query}` : "Google 🔍",
      responseId: "7c3f9d51-" + Date.now().toString(16) + "-48d3-9e1a-b7f2c8d94e02",
      botResponseId: "b2e40280-433c-45d8-9c1a-270bec55" + Date.now().toString(16).slice(0, 4),
    });
    await m.react("🐣");
  } catch (err) {
    console.error("googleairich error:", err);
    await m.react("❌");
    return m.reply(claraWrap("Googleairich", "gagal buka google di chat: " + (err?.message || "error"), "error"));
  }
}

export default { pluginConfig, handler, command: "googleairich" };
// FIX 17 Sep 2026 (owner: "fitur ai rich knp cmd g bsa diakses"): loader
// nyari named export config + handler — default export doang bikin
// plugin DIAM-DIAM gak diregistrasi sejak awal. Default dipertahankan
// buat e2e (import default).
export { pluginConfig as config, handler };
