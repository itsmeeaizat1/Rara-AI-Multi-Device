// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// ============================================================
// 🔹 GOOGLE MAPS BROWSER SEARCH + SCREENSHOT — chromium buka Google
// Maps hasil pencarian tempat (cafe, resto, minimarket, dll) untuk
// request owner 24 Sep 2026: "klo misal search cafe indonesia di web
// hasil ketemu ke screenshot dikirim ke chat" (pilihan jalur 2: tanpa
// API key SerpApi, pakai puppeteer chromium yang udah ada di VPS).
// Data + gambar ASLI hasil browsing, bukan tebakan AI:
//   • mapsScreenshotSearch(query) → buka
//     google.com/maps/search/<query>?hl=id → tunggu panel hasil
//     render → SCREENSHOT viewport (panel hasil + peta) + ekstrak
//     list tempat (nama, rating, jumlah review, kategori/alamat,
//     jam buka, URL halaman place) dari DOM → { image, places }
//   • mapsPlaceDetail(url) → buka halaman place → SCREENSHOT +
//     ekstrak isi detail (nama, rating, kategori, alamat, telp,
//     website, jam, teks ulasan) → { image, detail, text }
//   • registerMapsChoice/takeMapsChoice — sesi per-chat TTL 20 mnt:
//     balas nomor hasil → buka halaman place nomor itu.
// Browser numpang instance bersama getBrowser() (nova-yt-browser)
// — gak launch baru tiap pencarian, auto-close 90 dtk idle.
// ============================================================

import { getBrowser } from "./nova-yt-browser.js";

const DESKTOP_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

// ── SEAM TEST ─────────────────────────────────────────────────
// semantik: function = mock penuh; null = DISABLED (e2e gak boleh
// launch browser asli); undefined = chromium asli
let _mapsBrowserForTest;
export function _setMapsBrowserForTest(fn) { _mapsBrowserForTest = fn; }
export function _resetMapsBrowserForTest() { _mapsBrowserForTest = undefined; }
// seam khusus mapsPlaceDetail (terpisah dari search)
let _mapsDetailForTest;
export function _setMapsDetailForTest(fn) { _mapsDetailForTest = fn; }
export function _resetMapsDetailForTest() { _mapsDetailForTest = undefined; }

// ── SESI PILIHAN PER-CHAT (balas nomor → buka place) ──────────
const MAPS_TTL_MS = 20 * 60 * 1000; // 20 menit
const mapsSessions = new Map(); // chat → { ts, items: [{name, url}] }

export function registerMapsChoice(chat, items) {
  mapsSessions.set(chat, { ts: Date.now(), items: items.filter((i) => i?.url) });
}
export function takeMapsChoice(chat, n) {
  const s = mapsSessions.get(chat);
  if (!s) return null;
  if (Date.now() - s.ts > MAPS_TTL_MS) { mapsSessions.delete(chat); return null; }
  const idx = n - 1;
  if (!Number.isInteger(n) || idx < 0 || idx >= s.items.length) return null;
  return s.items[idx];
}
export function getMapsSession(chat) {
  const s = mapsSessions.get(chat);
  return s && Date.now() - s.ts <= MAPS_TTL_MS ? s : null;
}
export function clearMapsChoice(chat) { mapsSessions.delete(chat); }
export function _clearMapsSessionsForTest() { mapsSessions.clear(); }

// ── parse koordinat dari URL place Google Maps ────────────────
// format di URL kartu hasil: "!8m2!3d-6.2244444!4d106.8411111"
// (3d = latitude, 4d = longitude) → buat pin lokasi native WhatsApp.
// Fallback: pola "@-6.22,106.84" / "?q=-6.22,106.84".
export function parseMapCoords(url) {
  const s = decodeURIComponent(String(url || ""));
  let m = s.match(/!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/);
  if (!m) m = s.match(/[@?&q=](-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/);
  if (!m) return null;
  const lat = Number(m[1]), lng = Number(m[2]);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;
  return { lat, lng };
}

// ── consent Google (kadang muncul di IP Eropa) → Accept all ──
async function dismissConsent(page) {
  try {
    if (!page.url().includes("consent.google")) return;
    const accept = await page.$('button:has-text("Accept all"), button:has-text("Terima semua"), #dialog button:first-of-type, form[action*="consent"] button');
    if (accept) { await accept.click({ timeout: 3000 }).catch(() => {}); await new Promise((r) => setTimeout(r, 1200)); }
  } catch {}
}

// ── ekstrak list tempat dari DOM panel hasil ─────────────────
// selector Maps ganti kelas sering — pakai beberapa fallback:
// kartu hasil = .Nv2PK (desktop) / [role="feed"] anak-anak
async function extractPlaces(page, limit) {
  return Promise.race([
    page.evaluate((max) => {
      const clean = (t) => (t || "").replace(/\s+/g, " ").trim();
      const out = [];
      // kartu hasil pencarian Maps
      let cards = [...document.querySelectorAll("div.Nv2PK")];
      if (!cards.length) {
        const feed = document.querySelector('[role="feed"]');
        if (feed) cards = [...feed.children].map((c) => c.firstElementChild || c).filter(Boolean);
      }
      for (const card of cards) {
        if (out.length >= max) break;
        const name = clean(card.querySelector(".qBF1Pd, a[data-value='Website'], h3")?.textContent);
        if (!name) continue;
        // .W4Efsd di kartu: [0]=blok rating "4,4(5.896)" · [1]=kategori·
        // alamat+deskripsi (gabung) · [2]=kategori·alamat BERSIH ·
        // [3]=deskripsi · [4]=jam buka ("Buka · Tutup pukul 22.00").
        const w4 = [...card.querySelectorAll(".W4Efsd")].map((e) => clean(e.textContent)).filter(Boolean);
        // rating + review: parse dari teks gabung blok rating (paling stabil,
        // format "4,4(5.896)" atau "4,4" polos) atau aria-label "4,4 bintang …"
        const ratingRaw = w4.find((t) => /^\d+([.,]\d+)?\s*\(?\d/.test(t))
          || clean(card.querySelector(".MW4etd")?.textContent) || "";
        const rating = (ratingRaw.match(/^(\d+([.,]\d+)?)/) || [])[1] || "";
        const reviews = (ratingRaw.match(/\(([\d.,\s]+)\)/) || [])[1] || "";
        // meta = kategori·alamat: kandidat yang ada "·", BUKAN blok rating dan
        // BUKAN baris jam buka → ambil terpendek (versi bersih, bukan gabungan)
        const hours = w4.find((t) => /^(buka|open|dibuka|tutup|closed)/i.test(t)) || "";
        const rest = w4.filter((t) => t !== ratingRaw && t !== hours);
        const dots = rest.filter((t) => t.includes("·"));
        const meta = dots.length ? dots.sort((a, b) => a.length - b.length)[0] : (rest[0] || "");
        // URL halaman place — link di kartu (href absolut di DOM)
        const url = card.querySelector('a[href*="/maps/place/"]')?.href || "";
        out.push({ name, rating, reviews, meta, hours, url });
      }
      return out;
    }, limit),
    new Promise((_, rej) => setTimeout(() => rej(new Error("ekstraksi DOM timeout")), 12000)),
  ]);
}

// ── API UTAMA 1: SEARCH + SCREENSHOT ──────────────────────────
export async function mapsScreenshotSearch(query, { limit = 8, timeoutMs = 40000 } = {}) {
  if (typeof _mapsBrowserForTest === "function") return _mapsBrowserForTest(query, { limit, timeoutMs });
  if (_mapsBrowserForTest === null) throw new Error("chromium disabled");

  const q = String(query || "").trim();
  if (!q) throw new Error("query kosong");

  const browser = await getBrowser();
  const page = await browser.newPage();
  try {
    await page.setUserAgent(DESKTOP_UA);
    await page.setViewport({ width: 1280, height: 900 });
    await page.setExtraHTTPHeaders({ "Accept-Language": "id-ID,id;q=0.9,en;q=0.8" });
    await page.goto(
      `https://www.google.com/maps/search/${encodeURIComponent(q)}?hl=id&gl=id`,
      { waitUntil: "domcontentloaded", timeout: 30000 },
    );
    await dismissConsent(page);

    // tunggu panel hasil render (feed/kartu) — atau timeout lanjut aja
    await Promise.race([
      page.waitForSelector('div.Nv2PK, [role="feed"]', { timeout: 20000 }),
      new Promise((r) => setTimeout(r, 20000)),
    ]);
    await new Promise((r) => setTimeout(r, 1500)); // kasih waktu marker/tile peta muncul

    let places = [];
    try { places = await extractPlaces(page, limit); } catch { places = []; } // screenshot tetap jalan walau DOM beda

    const image = await page.screenshot({ type: "jpeg", quality: 85, fullPage: false });
    return { image: Buffer.from(image), places };
  } finally {
    await page.close().catch(() => {});
  }
}

// ── API UTAMA 2: DETAIL PLACE + SCREENSHOT ─────────────────────
// buka halaman place (URL dari kartu hasil) → screenshot panel
// detail + ekstrak isi: nama, rating, kategori, alamat, telp,
// website, jam buka, dan teks ulasan (kalau ke-render).
export async function mapsPlaceDetail(url, { maxReviews = 5, timeoutMs = 40000 } = {}) {
  if (typeof _mapsDetailForTest === "function") return _mapsDetailForTest(url, { maxReviews, timeoutMs });
  if (_mapsDetailForTest === null) throw new Error("chromium disabled");

  if (!/^https:\/\/(www\.)?google\.[a-z.]+\/maps\/place\//.test(String(url))) {
    throw new Error("URL place Maps gak valid");
  }

  const browser = await getBrowser();
  const page = await browser.newPage();
  try {
    await page.setUserAgent(DESKTOP_UA);
    await page.setViewport({ width: 1280, height: 900 });
    await page.setExtraHTTPHeaders({ "Accept-Language": "id-ID,id;q=0.9,en;q=0.8" });
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });
    await dismissConsent(page);

    // tunggu judul place render — panel detail siap
    await Promise.race([
      page.waitForSelector("h1", { timeout: 20000 }),
      new Promise((r) => setTimeout(r, 20000)),
    ]);
    await new Promise((r) => setTimeout(r, 1500)); // rating/jam lazy-render

    // [1] SCREENSHOT OVERVIEW duluan — panel tempat (nama, rating, alamat,
    // jam, peta) dalam keadaan default, sebelum tab ulasan dibuka
    const image = await page.screenshot({ type: "jpeg", quality: 85, fullPage: false });

    // [2] ekstrak info terstruktur dari panel overview
    const detail = await Promise.race([
      page.evaluate((maxRev) => {
        const clean = (t) => (t || "").replace(/\s+/g, " ").trim();
        const pick = (sel) => clean(document.querySelector(sel)?.textContent);
        // strip prefix aria-label "Alamat: " / "Telepon: " dsb.
        const label = (sel) => {
          const el = document.querySelector(sel);
          if (!el) return "";
          const a = el.getAttribute("aria-label") || "";
          const m = a.match(/^[A-Z][\w\s]+?:\s*(.+)$/);
          return clean(m ? m[1] : el.textContent);
        };
        const ratingBlock = clean(document.querySelector(".F7nice")?.textContent);
        const rating = (ratingBlock.match(/^(\d+([.,]\d+)?)/) || [])[1] || "";
        const reviews = (ratingBlock.match(/\(([\d.,\s]+)\)/) || [])[1] || "";
        // ulasan — kartu ulasan di panel place
        const reviewsList = [...document.querySelectorAll('div[data-review-id][role="article"], div.jftiief')].slice(0, maxRev).map((r) => {
          const txt = clean(r.querySelector("div.MyEned, .wiI7pd")?.textContent);
          const author = clean(r.querySelector('div[data-author-name], .d4r55')?.textContent);
          const stars = (r.querySelector('span[role="img"][aria-label]')?.getAttribute("aria-label") || "").trim();
          return txt ? { author, stars, text: txt.slice(0, 600) } : null;
        }).filter(Boolean);
        return {
          name: pick("h1"),
          rating, reviews,
          category: clean(document.querySelector('button[jsaction*="category"], button.DkEaL')?.textContent),
          address: label('button[data-item-id="address"]'),
          phone: label('button[data-item-id^="phone"]'),
          website: pick('a[data-item-id="authority"]'),
          // jam buka: aria-label polos "Buka 24 jam" / "Buka ⋅ Tutup pukul
          // 22.00" — baris tabel ("Rabu,Buka 24 jam, Salin…") ada koma → skip;
          // blok popular times ("Jam ramai…") gak diawali "Buka" → skip
          hours: (() => {
            const cands = [...document.querySelectorAll('[aria-label]')]
              .map((e) => clean(e.getAttribute("aria-label")))
              .filter((a) => /^(buka|dibuka|tutup)/i.test(a) && !a.includes(","));
            // prioritaskan yang informatif: "Buka 24 jam" / "Buka ⋅ Tutup
            // pukul 22.00" — label polos "Tutup"/"Buka" cuma status singkat
            return cands.find((a) => /24 jam|pukul/i.test(a)) || cands[0] || "";
          })(),
          reviewsList,
          rawText: clean(document.querySelector('[role="main"]')?.textContent).slice(0, 12000),
        };
      }, maxReviews),
      new Promise((_, rej) => setTimeout(() => rej(new Error("ekstraksi detail timeout")), 12000)),
    ]).catch(() => null);

    // [3] klik tab "Ulasan" → kartu ulasan ke-render (lazy-load, cuma
    // muncul setelah tab diklik) → ekstrak teks ulasannya
    try {
      const clicked = await page.evaluate(() => {
        const btn = [...document.querySelectorAll("button")].find((e) => {
          const t = (e.textContent || "").replace(/\s+/g, " ").trim();
          const a = e.getAttribute("aria-label") || "";
          return t === "Ulasan" || /^ulasan untuk/i.test(a) || /^reviews for/i.test(a);
        });
        if (btn) { btn.click(); return true; }
        return false;
      });
      if (clicked) {
        await new Promise((r) => setTimeout(r, 2000));
        // scroll panel ulasan 2 ronde biar kartu berikutnya ke-render
        // (virtual list Maps cuma render yang keliatan)
        try {
          for (let round = 0; round < 2; round++) {
            await page.evaluate(() => {
              document.querySelectorAll("div").forEach((d) => {
                if (d.scrollHeight > d.clientHeight + 100) { try { d.scrollTop += 3000; } catch {} }
              });
            });
            await new Promise((r) => setTimeout(r, 1800));
          }
        } catch {}
      }
    } catch {}

    let reviewsList = [];
    try {
      reviewsList = await page.evaluate((maxRev) => {
        const clean = (t) => (t || "").replace(/\s+/g, " ").trim();
        const cards = [...document.querySelectorAll('div.jftiief, [data-review-id], div[role="article"]')].slice(0, maxRev);
        const seen = new Set();
        const out = [];
        for (const r of cards) {
          const txt = clean(r.querySelector(".MyEned, .wiI7pd")?.textContent);
          if (!txt || seen.has(txt)) continue; // kartu dobel (hidden+visible) → sekali aja
          seen.add(txt);
          const author = clean(r.querySelector(".d4r55, div[data-author-name]")?.textContent);
          const stars = (r.querySelector('span[role="img"][aria-label]')?.getAttribute("aria-label") || "").trim();
          out.push({ author, stars, text: txt.slice(0, 600) });
          if (out.length >= maxRev) break;
        }
        return out;
      }, maxReviews);
    } catch { reviewsList = []; }

    if (detail && Array.isArray(reviewsList)) detail.reviewsList = reviewsList;
    return { image: Buffer.from(image), detail };
  } finally {
    await page.close().catch(() => {});
  }
}
