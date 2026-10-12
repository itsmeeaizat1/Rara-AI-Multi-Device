// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
// E2E OPENSERP — Google Search asli tanpa API key (owner 12 Okt 2026:
// "cari pengganti GoogleScraper tanpa key" → karust/openserp self-hosted,
// browser-rendered; scrape HTTP langsung udah mati di IP datacenter).
// Jalur: src/lib/rara-websearch.js openserpSearch() → engine .search google.
// Semua HTTP di-inject (offline). LIVE auto-skip kalau container gak ada.
// Jalankan dari repo root: node test/openserp-e2e/e2e.mjs
import { initDatabase } from "../../src/lib/rara-database.js";
import { smallcapsText } from "../../src/lib/styler.js";
import {
  searchWeb, listEngines, openserpSearch, getOpenserpUrl,
  setOpenserpHttp, resetOpenserpHttp,
  setWebSearchHttp, resetWebSearchDeps,
} from "../../src/lib/rara-websearch.js";

await initDatabase("/tmp/openserp-e2e-db.json");

let pass = 0, fail = 0;
const w = (s) => process.stdout.write(s + "\n");
function check(name, ok, extra = "") {
  if (ok) { pass++; w(`  ✔ ${name}`); }
  else { fail++; w(`  ✘ ${name}${extra ? " — " + String(extra).slice(0, 120) : ""}`); }
}

// ── envelope openserp ala openapi asli (results: title/url/snippet) ──
const ENVELOPE = {
  query: { text: "cuaca jakarta" },
  meta: { took_ms: 842, engines_failed: [], version: "2.1" },
  results: [
    { id: "s_1", title: "Cuaca Jakarta Hari Ini - BMKG", url: "https://www.bmkg.go.id/cuaca/jakarta", snippet: "Prakiraan cuaca Jakarta hari ini.", position: { absolute: 1 }, engine: "google" },
    { id: "s_2", title: "  Berita Cuaca Terkini  ", url: " https://www.detik.com/cuaca ", snippet: "  Ringkasan cuaca nasional.  ", engine: "google" },
    { id: "s_3", title: "", url: "https://junk.com/1", snippet: "judul kosong harus dibuang" },
    { id: "s_4", title: "Bukan HTTP", url: "javascript:alert(1)", snippet: "url jahat dibuang" },
    { id: "s_5", title: "Prakiraan Angin & Suhu Nasional", url: "https://cuaca.bmkg.go.id/prakiraan", snippet: "Peta prakiraan interaktif." },
    { id: "s_6", title: "Cuaca Jakarta Hari Ini - BMKG", url: "https://www.bmkg.go.id/cuaca/jakarta", snippet: "duplikat url dibuang" },
  ],
};

const BING_HTML = `<!DOCTYPE html><html><body>
<li class="b_algo"><h2><a href="https://id.wikipedia.org/wiki/Kucing">Kucing - Wikipedia</a></h2>
<div class="b_caption"><p>Kucing adalah hewan mamalia karnivora.</p></div></li>
<li class="b_algo"><h2><a href="https://www.detik.com/berita">Berita detikcom</a></h2>
<div class="b_caption"><p>Portal berita Indonesia.</p></div></li>
</body></html>`;

// ═══ SECTION 1: openserpSearch — parse envelope + bersihin item ═══
w("\n— section 1: openserpSearch parse —");
{
  let capturedUrl = "";
  setOpenserpHttp(async (u) => { capturedUrl = u; return ENVELOPE; });
  const items = await openserpSearch("cuaca jakarta", { limit: 10 });
  check("1a. URL path google/search + query ke-encode", capturedUrl.includes("/google/search?text=cuaca%20jakarta") && capturedUrl.includes("lang=id"), capturedUrl);
  check("1b. 3 item valid (junk: judul kosong + url non-http + duplikat dibuang)", items.length === 3, JSON.stringify(items.map((i) => i.title)));
  check("1c. title & snippet & url di-trim", items[1].title === "Berita Cuaca Terkini" && items[1].snippet === "Ringkasan cuaca nasional." && items[1].url === "https://www.detik.com/cuaca", JSON.stringify(items[1]));
  check("1d. field wajib ada (title/url/snippet)", items[0].url === "https://www.bmkg.go.id/cuaca/jakarta" && items[0].title.includes("BMKG"));
  const lim = await openserpSearch("tes", { limit: 2 });
  check("1e. limit dipatuhi", lim.length === 2, String(lim.length));
  // engine lain lewat jalur sama (path beda)
  await openserpSearch("tes", { engine: "yandex", limit: 5 });
  check("1f. engine yandex → path /yandex/search", capturedUrl.includes("/yandex/search?text=tes"), capturedUrl);
}

// ═══ SECTION 2: searchWeb engine google → hasil OpenSERP ═══
w("\n— section 2: searchWeb google via openserp —");
{
  const r = await searchWeb("cuaca jakarta", { engine: "google" });
  check("2a. sukses → source Google (OpenSERP)", r.source === "Google (OpenSERP)", r.source || r.error);
  check("2b. engine google + TANPA engineNote (bukan fallback)", r.engine === "google" && !r.engineNote);
  check("2c. 3 hasil & bebas junk", (r.items || []).length === 3 && r.items[0].url.startsWith("https://"));
  const r2 = await searchWeb("cuaca jakarta", { engine: "gg" });
  check("2d. alias gg juga lewat openserp", r2.source === "Google (OpenSERP)");
  const r3 = await searchWeb("cuaca jakarta", { engine: "openserp" });
  check("2e. engine openserp = pintu google", r3.source === "Google (OpenSERP)");
}

// ═══ SECTION 3: container mati / 0 hasil → fallback bing (perilaku lama) ═══
w("\n— section 3: fallback bing —");
{
  setOpenserpHttp(async () => { throw new Error("fetch failed: ECONNREFUSED"); });
  setWebSearchHttp(async () => BING_HTML);
  const r = await searchWeb("kucing", { engine: "google" });
  check("3a. openserp mati → hasil bing", r.source === "Bing" && (r.items || []).length >= 1, r.source || r.error);
  check("3b. engineNote google (tanda dialihkan)", r.engineNote === "google");
  check("3c. engine efektif bing", r.engine === "bing");
  // 0 hasil dari openserp → juga fallback
  setOpenserpHttp(async () => ({ query: {}, meta: {}, results: [] }));
  const r2 = await searchWeb("kucing", { engine: "google" });
  check("3d. openserp 0 hasil → bing", r2.source === "Bing");
  // envelope rusak → gak crash, fallback
  setOpenserpHttp(async () => ({ halah: true }));
  const r3 = await searchWeb("kucing", { engine: "google" });
  check("3e. envelope rusak (tanpa results) → bing, gak crash", r3.source === "Bing");
  setOpenserpHttp(async () => null);
  const r4 = await searchWeb("kucing", { engine: "google" });
  check("3f. respon null → bing, gak crash", r4.source === "Bing");
  // bing juga mati → error sibuk yang sama kayak dulu (bukan crash openserp)
  setWebSearchHttp(async () => { throw new Error("HTTP 503"); });
  const r5 = await searchWeb("kucing", { engine: "google" });
  check("3g. semua mati → error rapi 'sibuk'", !!r5.error && /sibuk/i.test(r5.error), JSON.stringify(r5).slice(0, 80));
}

// ═══ SECTION 4: getOpenserpUrl — default + env override ═══
w("\n— section 4: config url —");
{
  delete process.env.OPENSERP_URL;
  check("4a. default 127.0.0.1:7000", getOpenserpUrl() === "http://127.0.0.1:7000", getOpenserpUrl());
  process.env.OPENSERP_URL = "http://172.18.0.1:7000/";
  check("4b. env override + trailing slash dibuang", getOpenserpUrl() === "http://172.18.0.1:7000", getOpenserpUrl());
  delete process.env.OPENSERP_URL;
}

// ═══ SECTION 5: listEngines — entri google baru ═══
w("\n— section 5: listEngines —");
{
  const g = listEngines().find((e) => e.key === "google");
  check("5a. label Google (bukan auto-Bing lama)", g && g.label === "Google", g && g.label);
  check("5b. note nyebut OpenSERP + fallback", g && /openserp/i.test(g.note) && /bing/i.test(g.note), g && g.note);
}

// ═══ SECTION 6: plugin .search — kartu hasil + kartu fallback ═══
w("\n— section 6: plugin handler —");
{
  const { config, handler } = await import("../../plugins/browser/search.js");
  check("6a. pluginConfig utuh (loader-safe)", config.name === "search" && typeof handler === "function");
  check("6b. engine openserp masuk daftar plugin", config.alias.includes("googlesearch"));
  const replies = [], sent = [], reacts = [];
  const mkM = (args) => ({
    args, text: args.join(" "), prefix: ".", command: "search",
    pushName: "Tester", chat: "6291@c.us", sender: "6291",
    reply: async (t) => { replies.push(String(t)); },
    react: async (e) => { reacts.push(e); },
  });
  const sock = { sendMessage: async (chat, payload) => sent.push({ chat, payload }), sendButton: async (chat, a, text, m, btn) => sent.push({ chat, payload: { text }, buttons: btn?.buttons }) };

  // sukses openserp → kartu Google (OpenSERP), tanpa note dialihkan
  setOpenserpHttp(async () => ENVELOPE);
  await handler(mkM(["google", "cuaca", "jakarta"]), { sock });
  const okText = String(sent.at(-1)?.payload?.text || replies[0] || "");
  check("6c. kartu sukses: Mesin Google (OpenSERP)", okText.includes(smallcapsText("Google (OpenSERP)")), okText.slice(0, 90));
  check("6d. kartu sukses: TANPA kata 'dialihkan'", !okText.includes(smallcapsText("dialihkan")));
  const btn = sent.at(-1)?.buttons;
  const rows = btn?.[0] ? JSON.parse(btn[0].buttonParamsJson).sections[0].rows : [];
  check("6e. popup buka halaman: 3 baris hasil", rows.length === 3, String(rows.length));

  // openserp mati → kartu bing + note dialihkan
  setOpenserpHttp(async () => { throw new Error("ECONNREFUSED"); });
  setWebSearchHttp(async () => BING_HTML);
  await handler(mkM(["google", "kucing"]), { sock });
  const fbText = String(sent.at(-1)?.payload?.text || "");
  check("6f. kartu fallback: mesin Bing + openserp mati", fbText.includes(smallcapsText("Bing")) && fbText.includes(smallcapsText("openserp mati")), fbText.slice(0, 90));
}

// ═══ SECTION 7: LIVE (opsional — skip kalau container gak kepasang) ═══
w("\n— section 7: live —");
{
  resetOpenserpHttp(); resetWebSearchDeps();
  try {
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), 2500);
    const res = await fetch(getOpenserpUrl() + "/health", { signal: ctl.signal });
    clearTimeout(timer);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    w("  ⏳ container openserp HIDUP → tes google live…");
    const r = await searchWeb("prakiraan cuaca jakarta", { engine: "google" });
    check("7a. live google via openserp", r.source === "Google (OpenSERP)" && (r.items || []).length > 0, r.source || r.error);
  } catch {
    w("  ⏭ live: SKIP — container openserp belum kepasang (deploy panduan Langkah 18)");
  }
}

resetOpenserpHttp(); resetWebSearchDeps();
w(`\n${pass}/${pass + fail} PASS`);
process.exit(fail ? 1 : 0);
