// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
// ============================================================
// 🔹 YOUTUBE AI RICH .youtubeairich — plugin airich ketiga dari nol
//   (recipe engine: cuma nyuplain HTML → sendRichResponse).
// 🔹 Efek: BUKA YOUTUBE di dalam gelembung chat — logo YouTube,
//   search bar dengan animasi ngetik, hasil ASLI YouTube (chromium
//   browserSearchYoutube — judul, channel, views, durasi), thumbnail
//   i.ytimg.com (fallback gradient kalau webview ngeblok jaringan).
// 🔹 PLAYER BENERAN (v2): video PERTAMA dapet src CDN asli (IkyyXD
//   savetube — gak IP-locked, HP user bisa stream langsung) → tap play
//   = VIDEO ASLI MUTER di dalam gelembung. Webview gak dikasih
//   jaringan / error / timeout → otomatis fallback simulasi (progress
//   timer). Video lain (data-i != 0) → simulasi interaktif.
// 🔹 Tanpa JS: daftar video tetep keliatan (progressive enhancement).
// ============================================================
import { raraWrap } from "../../src/lib/rara-menu-style.js";
import { sendRichResponse, notifyRichDownload } from "../../src/lib/rara-airich.js";
import { getApiKey } from "../../src/lib/rara-api-keys.js";

const pluginConfig = {
  name: "youtubeairich",
  alias: ["youtubeairich", "ytairich", "bukayoutube", "yrich"],
  category: "airich",
  description: "YouTube AI Rich ▶️ — buka YouTube langsung di dalam chat (hasil asli)",
  usage: ".youtubeairich [query]",
  example: ".youtubeairich resep rendang",
  isOwner: false, isPremium: false, isGroup: true, isPrivate: true,
  cooldown: 30, energi: 2, isEnabled: true,
};

// ── seams http buat e2e offline ──
const __ytHttp = {};
export function _setYtRichHttpForTest(h) { Object.assign(__ytHttp, h); }
export function _resetYtRichHttpForTest() { for (const k of Object.keys(__ytHttp)) delete __ytHttp[k]; }

// ── escape — semua data dari internet WAJIB di-escape ──
export function esc(s) {
  return String(s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

export function fmtViews(v) {
  const n = Number(v);
  if (!isFinite(n) || n <= 0) return "";
  if (n >= 1e6) return (n / 1e6).toFixed(1).replace(".", ",").replace(",0", "") + " jt x ditonton";
  if (n >= 1e3) return Math.round(n / 1e3) + " rb x ditonton";
  return n + " x ditonton";
}

// ── hasil ASLI YouTube — chromium beneran (pola proven searchyt) ──
export async function ytRichSearch(query) {
  let raw;
  if (__ytHttp.search) raw = await __ytHttp.search(query); // seam e2e
  else {
    const { browserSearchYoutube } = await import("../../src/scraper/rara-yt-browser.js");
    raw = await browserSearchYoutube(query, { limit: 2 });
  }
  if (!Array.isArray(raw) || !raw.length) throw new Error("gak nemu video buat query itu (coba query lain)");
  return raw.map((r) => ({
    title: String(r.title || "").slice(0, 100),
    channel: String(r.author?.name || "-").slice(0, 40),
    views: r.views || 0,
    viewsTxt: fmtViews(r.views),
    ago: String(r.ago || "").slice(0, 30),
    dur: String(r.duration?.timestamp || "").slice(0, 8),
    url: String(r.url || ""),
    thumb: ((/\bv=([\w-]{6,})/.exec(String(r.url || "")) || [])[1] ? "https://i.ytimg.com/vi/" + (/\bv=([\w-]{6,})/.exec(String(r.url || "")) || [])[1] + "/hqdefault.jpg" : ""),
  }));
}

// ── URL video asli (best-effort, JANGAN pernah throw): IkyyXD savetube
//   CDN gak IP-locked → bisa dipakai <video src> langsung di webview HP ──
export async function ytRichVideoUrl(url) {
  try {
    if (__ytHttp.video) return await __ytHttp.video(url); // seam e2e
    const axios = (await import("axios")).default;
    const { data } = await axios.get("https://api.ikyyxd.my.id/download/ytmp4", {
      params: { q: url, apikey: getApiKey("kyzz") }, timeout: 60000,
    });
    const dl = data?.result?.VideoUrl?.url || data?.result?.download_url || data?.result?.url;
    if (data?.status && dl && /^https?:\/\//.test(dl)) return dl;
    return null;
  } catch { return null; }
}

// ── rakit HTML ala YouTube app (dark theme) ──
export function buildYtHtml({ query, results, videoUrl }) {
  const hasQuery = !!query;
  const cards = (results || []).map((r, i) => `
    <div class="vid" data-i="${i}">${videoUrl && i === 0 ? '<span style="position:absolute;margin:8px;background:rgba(255,0,0,.92);color:#fff;font-size:9px;font-weight:700;padding:3px 7px;border-radius:4px;z-index:2">VIDEO ASLI</span>' : ""}
      <div class="thumb">
        ${r.thumb ? `<img src="${esc(r.thumb)}" alt="">` : ""}
        <div class="fallback"><div class="fb-icon"></div></div>
        ${r.dur ? `<span class="dur">${esc(r.dur)}</span>` : ""}
        <div class="pmark"></div>
      </div>
      <div class="vtitle">${esc(r.title)}</div>
      <div class="vmeta">${esc(r.channel)}${r.viewsTxt ? " · " + esc(r.viewsTxt) : ""}${r.ago ? " · " + esc(r.ago) : ""}</div>
    </div>`).join("");

  const dataJs = JSON.stringify(results || []).replace(/</g, "\\u003c");

  return `<!DOCTYPE html>
<html>
<meta charset="utf-8">
<style>
* { box-sizing: border-box; margin: 0; padding: 0; -webkit-tap-highlight-color: transparent; user-select: none; }
html, body { background: #0f0f0f; font-family: arial, sans-serif; width: 100%; height: 100%; }
body { display: flex; align-items: flex-end; }
.card { width: 100%; background: #0f0f0f; border-radius: 22px 22px 0 0; box-shadow: 0 -8px 30px rgba(0,0,0,.5); padding: 12px 14px max(14px, env(safe-area-inset-bottom, 14px)); position: relative; overflow: hidden; }
/* header */
.hdr { display: flex; align-items: center; gap: 10px; padding: 2px 0 10px 0; }
.ytlogo { display: flex; align-items: center; gap: 5px; flex: none; }
.ytlogo .mark { width: 26px; height: 18px; background: #ff0000; border-radius: 5px; position: relative; }
.ytlogo .mark::after { content: ''; position: absolute; inset: 0; margin: auto; width: 0; height: 0; border-left: 8px solid #fff; border-top: 5px solid transparent; border-bottom: 5px solid transparent; left: 2px; }
.ytlogo .word { color: #fff; font-size: 16px; font-weight: 600; letter-spacing: -1px; }
.hq { flex: 1; display: flex; align-items: center; gap: 8px; background: #272727; border: 1px solid #3f3f3f; border-radius: 20px; padding: 9px 14px; min-width: 0; }
.hq .glass { width: 14px; height: 14px; border: 2px solid #aaa; border-radius: 50%; position: relative; flex: none; }
.hq .glass::after { content: ''; position: absolute; width: 6px; height: 2px; background: #aaa; bottom: -2px; right: -4px; transform: rotate(45deg); }
.qtext { font-size: 13px; color: #f1f1f1; white-space: nowrap; overflow: hidden; min-width: 4px; }
.qtext .cursor { display: inline-block; width: 2px; height: 13px; background: #f1f1f1; vertical-align: -2px; animation: blink 1s infinite; }
@keyframes blink { 50% { opacity: 0; } }
.ph { color: #909090; font-size: 12px; }
/* kartu video */
.vid { margin: 12px 0; opacity: 0; animation: pop .3s forwards; }
@keyframes pop { to { opacity: 1; } }
.thumb { position: relative; width: 100%; aspect-ratio: 16/9; border-radius: 12px; overflow: hidden; background: linear-gradient(135deg, #212121, #3d3d3d 60%, #262626); }
.thumb img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }
.fallback { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; }
.fb-icon { width: 0; height: 0; border-left: 22px solid rgba(255,255,255,.85); border-top: 13px solid transparent; border-bottom: 13px solid transparent; margin-left: 6px; }
.dur { position: absolute; right: 6px; bottom: 6px; background: rgba(0,0,0,.8); color: #fff; font-size: 11px; font-weight: 600; padding: 2px 5px; border-radius: 4px; }
.vtitle { color: #f1f1f1; font-size: 14px; font-weight: 500; line-height: 1.4; margin-top: 8px; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.vmeta { color: #aaaaaa; font-size: 12px; margin-top: 4px; line-height: 1.4; }
.hint { text-align: center; color: #909090; font-size: 11px; margin-top: 14px; }
/* halaman watch */
#watch { position: absolute; inset: 0; background: #0f0f0f; display: none; flex-direction: column; padding: 10px 14px max(12px, env(safe-area-inset-bottom, 12px)); z-index: 5; }
#watch.on { display: flex; }
.wnav { display: flex; align-items: center; gap: 10px; margin-bottom: 8px; }
.back { width: 30px; height: 30px; border-radius: 50%; background: #272727; position: relative; flex: none; }
.back::before { content: ''; position: absolute; inset: 0; margin: auto; width: 8px; height: 8px; border-left: 2px solid #f1f1f1; border-bottom: 2px solid #f1f1f1; transform: rotate(45deg) translate(1px, -1px); }
.wnav .t { color: #fff; font-size: 13px; font-weight: 500; white-space: nowrap; overflow: hidden; }
.player { position: relative; width: 100%; aspect-ratio: 16/9; border-radius: 12px; overflow: hidden; background: linear-gradient(135deg, #212121, #3d3d3d 60%, #262626); }
.player img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; opacity: .55; }
.bigplay { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; }
.bigplay .bp { width: 54px; height: 54px; border-radius: 50%; background: rgba(255,0,0,.92); display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 12px rgba(0,0,0,.5); }
.bigplay .bp::after { content: ''; width: 0; height: 0; border-left: 16px solid #fff; border-top: 10px solid transparent; border-bottom: 10px solid transparent; margin-left: 4px; }
.bigplay.playing .bp { display: none; }
.pbar { position: absolute; left: 0; right: 0; bottom: 0; height: 3px; background: rgba(255,255,255,.25); }
.pbar .fill { height: 100%; width: 0%; background: #ff0000; }
.ptime { position: absolute; right: 8px; bottom: 8px; background: rgba(0,0,0,.75); color: #fff; font-size: 10px; font-weight: 600; padding: 2px 6px; border-radius: 4px; display: none; }
.ptime.on { display: block; }
.wtitle { color: #f1f1f1; font-size: 14px; font-weight: 500; line-height: 1.4; margin-top: 10px; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.wmeta { color: #aaaaaa; font-size: 12px; margin-top: 4px; }
.wchips { display: flex; gap: 8px; margin-top: 10px; }
.wchips div { background: #272727; border-radius: 16px; padding: 7px 12px; font-size: 11px; color: #f1f1f1; display: flex; align-items: center; gap: 5px; }
.wchips .ic { font-size: 12px; }
.foot { text-align: center; color: #606060; font-size: 10px; margin-top: 14px; }
</style>
<body>
<div class="card">
  <div class="hdr">
    <div class="ytlogo"><div class="mark"></div><div class="word">YouTube</div></div>
    <div class="hq">
      <div class="glass"></div>
      <div class="qtext" id="q">${hasQuery ? '<span class="cursor"></span>' : '<span class="ph">Ketik: .youtubeairich &lt;query&gt;</span>'}</div>
    </div>
  </div>
  <div id="list">
    ${hasQuery ? cards : '<div class="hint">▶️ Buka YouTube di dalam chat — hasil asli, tap video buat nonton</div>'}
    <div class="hint">${hasQuery ? "Tap video buat buka player ▶" : "AI Rich Response · hasil asli YouTube"}</div>
  </div>
  <div id="watch">
    <div class="wnav"><div class="back" id="back"></div><div class="t" id="wnt"></div></div>
    <div class="player" id="player">
      <img id="wimg" alt="">
      <video id="wvid" playsinline webkit-playsinline preload="metadata" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;display:none;background:#000"></video>
      <div class="bigplay" id="bp"><div class="bp"></div></div>
      <div class="pbar"><div class="fill" id="pfill"></div></div>
      <div class="ptime" id="ptime">0:00 / 0:00</div>
    </div>
    <div class="wtitle" id="wtitle"></div>
    <div class="wmeta" id="wmeta"></div>
    <div class="wchips"><div><span class="ic">👍</span> Suka</div><div><span class="ic">↗</span> Bagikan</div><div><span class="ic">🔔</span> Subscribe</div></div>
  </div>
  <div class="foot">Ditampilkan di dalam chat · AI Rich Response</div>
</div>
<script>
// data video (query & hasil internet udah di-escape \\u003c)
var VIDS = ${dataJs};
var REAL = ${videoUrl ? "1" : "0"};
var REALSRC = ${JSON.stringify(videoUrl || "").replace(/</g, "\\u003c")};
function $(s){ return document.querySelector(s); }
// animasi ngetik query
(function(){
  var full = ${JSON.stringify(query || "").replace(/</g, "\\u003c")};
  if (!full) return;
  var q = $("#q"); q.textContent = ""; var i = 0;
  var cursor = document.createElement("span"); cursor.className = "cursor";
  q.appendChild(cursor);
  var t = setInterval(function(){
    i++; q.textContent = full.slice(0, i); q.appendChild(cursor);
    if (i >= full.length) { clearInterval(t); setTimeout(function(){ cursor.remove(); }, 2200); }
  }, 60);
})();
// progress video asli real-time
(function(){
  var ve = vidEl();
  ve.addEventListener("timeupdate", function(){
    if (!realMode) return;
    if (ve.duration && isFinite(ve.duration)) {
      dur = ve.duration;
      $("#pfill").style.width = Math.min(100, (ve.currentTime / ve.duration) * 100) + "%";
      $("#ptime").textContent = fmt(ve.currentTime) + " / " + fmt(ve.duration);
    }
  });
  ve.addEventListener("ended", function(){ if (realMode) { $("#bp").classList.remove("playing"); $("#pfill").style.width = "100%"; } });
})();
// buang img rusak (webview tanpa jaringan) → gradient fallback kepakai
window.addEventListener("load", function(){
  document.querySelectorAll("#list img").forEach(function(img){
    if (!img.getAttribute("src")) return;
    img.addEventListener("error", function(){ img.remove(); });
    if (img.complete && !img.naturalWidth) img.remove();
  });
});
// player — dua mode: VIDEO ASLI (REAL=1, src CDN) & SIMULASI
var playing = false, cur = 0, timer = null, dur = 0, sec = 0, realMode = false, realTimer = null;
function parseDur(s){ var p = String(s||"").split(":").map(Number); if (p.some(isNaN) || !p.length) return 0;
  var t = 0; for (var i = 0; i < p.length; i++) t = t * 60 + p[i]; return t; }
function fmt(t){ t = Math.floor(t); var m = Math.floor(t/60), s = t % 60; return m + ":" + (s<10?"0":"") + s; }
function stopPlay(){ playing = false; clearInterval(timer); timer = null; }
function stopReal(){ clearTimeout(realTimer); realTimer = null; }
function vidEl(){ return document.getElementById("wvid"); }
// fallback: video asli gak bisa (gak ada jaringan/error/timeout) → simulasi jalan
function toSim(){
  if (!realMode) return;
  realMode = false; stopReal();
  var v = vidEl(); try { v.pause(); v.removeAttribute("src"); v.load(); } catch (e) {}
  v.style.display = "none";
  dur = parseDur(VIDS[cur] && VIDS[cur].dur); sec = 0;
}
function openWatch(i){
  var v = VIDS[i]; if (!v) return; cur = i;
  $("#wnt").textContent = v.title || ""; $("#wimg").src = v.thumb || "";
  $("#wtitle").textContent = v.title || "";
  $("#wmeta").textContent = (v.channel || "") + (v.viewsTxt ? " · " + v.viewsTxt : "") + (v.ago ? " · " + v.ago : "");
  $("#pfill").style.width = "0%"; $("#ptime").classList.remove("on"); $("#bp").classList.remove("playing");
  stopPlay(); stopReal(); sec = 0;
  var ve = vidEl();
  try { ve.pause(); ve.removeAttribute("src"); ve.load(); } catch (e) {}
  ve.style.display = "none";
  // video pertama + ada src asli → mode VIDEO ASLI
  realMode = !!(REAL === 1 && i === 0 && REALSRC);
  if (realMode) {
    ve.src = REALSRC; ve.style.display = "block";
    ve.onerror = function(){ toSim(); };
    // timeout: 12 dtk gak ada metadata (webview gak dikasih jaringan) → sim
    stopReal();
    realTimer = setTimeout(function(){ if (ve.readyState === 0) toSim(); }, 12000);
    ve.addEventListener("loadedmetadata", function(){
      stopReal();
      if (ve.duration && isFinite(ve.duration)) dur = ve.duration;
    });
  } else dur = parseDur(v.dur);
  $("#watch").classList.add("on");
}
function tick(){
  if (!playing) return;
  sec++;
  if (dur > 0 && sec >= dur) { sec = dur; stopPlay(); $("#bp").classList.remove("playing"); }
  if (dur > 0) $("#pfill").style.width = Math.min(100, (sec / dur) * 100) + "%";
  $("#ptime").textContent = dur > 0 ? fmt(sec) + " / " + fmt(dur) : fmt(sec);
}
document.addEventListener("click", function(ev){
  var vid = ev.target.closest ? ev.target.closest(".vid") : null;
  if (vid && !$("#watch").classList.contains("on")) { openWatch(parseInt(vid.getAttribute("data-i"), 10) || 0); return; }
  if (ev.target.closest && ev.target.closest("#back")) { stopPlay(); $("#watch").classList.remove("on"); return; }
  if (ev.target.closest && ev.target.closest("#player")) {
    if (realMode) {
      var ve = vidEl();
      if (ve.paused) {
        ve.play().then(function(){ $("#bp").classList.add("playing"); $("#ptime").classList.add("on"); })
          .catch(function(){ toSim(); playing = true; $("#bp").classList.add("playing"); $("#ptime").classList.add("on"); timer = setInterval(tick, 1000); tick(); });
      } else { ve.pause(); $("#bp").classList.remove("playing"); }
    } else if (!playing) {
      playing = true; $("#bp").classList.add("playing"); $("#ptime").classList.add("on");
      timer = setInterval(tick, 1000); tick();
    } else stopPlay(), $("#bp").classList.remove("playing");
  }
});
</script>
</body>
</html>`;
}

async function handler(m, { sock }) {
  try {
    await m.react("🧠");
    const query = (m.text || "").trim() || null;

    let html;
    let videoUrl = null;
    if (query) {
      const results = await ytRichSearch(query);
      await m.react("🛠️");
      // video asli buat kartu pertama — best-effort (gagal → player simulasi)
      videoUrl = await ytRichVideoUrl(results[0].url);
      html = buildYtHtml({ query, results, videoUrl });
    } else {
      html = buildYtHtml({ query: null, results: [] });
    }

    try {
      await notifyRichDownload(m);
      await sendRichResponse(sock, m.chat, html, {
        title: query ? "YouTube ▶️ " + query : "YouTube ▶️",
        responseId: "8d4a0e62-" + Date.now().toString(16) + "-48d3-9e1a-b7f2c8d94e03",
        botResponseId: "b2e40280-433c-45d8-9c1a-270bec55" + Date.now().toString(16).slice(0, 4),
      });
    } catch (relayErr) {
      // payload + video kegedean ditolak → sekali lagi polos (player simulasi)
      if (videoUrl) {
        const results = await ytRichSearch(query).catch(() => null);
        if (results) await sendRichResponse(sock, m.chat, buildYtHtml({ query, results }), {
          title: query ? "YouTube ▶️ " + query : "YouTube ▶️",
          responseId: "8d4a0e62-" + Date.now().toString(16) + "-48d3-9e1a-b7f2c8d94e03",
          botResponseId: "b2e40280-433c-45d8-9c1a-270bec55" + Date.now().toString(16).slice(0, 4),
        }).catch(() => { throw relayErr; });
      } else throw relayErr;
    }
    await m.react("🐣");
  } catch (err) {
    console.error("youtubeairich error:", err);
    await m.react("❌");
    return m.reply(raraWrap("Youtubeairich", "gagal buka youtube di chat: " + (err?.message || "error"), "error"));
  }
}

export default { pluginConfig, handler, command: "youtubeairich" };
// FIX 17 Sep 2026 (owner: "fitur ai rich knp cmd g bsa diakses"): loader
// nyari named export config + handler — default export doang bikin
// plugin DIAM-DIAM gak diregistrasi sejak awal. Default dipertahankan
// buat e2e (import default).
export { pluginConfig as config, handler };
