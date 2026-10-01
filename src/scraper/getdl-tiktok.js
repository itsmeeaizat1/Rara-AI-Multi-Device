// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
// ============================================================
//  GetDL TikTok Search (ESM scraper)
//  Target  : https://getdl.space (session + search TikTok)
//  Flow    : GET /api/session → sessionId (+ cookie jar wajib,
//            401 kalau tanpa cookie) → POST /api/search/tiktok
//            { query, count, cursor, region, sessionId, sortType }
//  Source  : script CommonJS dari owner (2026-09-06, RestApis
//            api.ikyyxd.my.id), di-port ke ESM.
//  Kenapa  : search TikTok lama (tiktoksearch.js) datanya basi —
//            kadang muncul video 2023. GetDL ngambil data UPTODATE
//            (live test: hasil posted hari ini juga kebaca,
//            createdAt Unix-seconds → 2026-09-06).
//  Live test 2026-09-06: session ✅, search "supra mk4" ✅ 5 hasil
//            relevan, playUrl ✅ langsung ke-download (2MB video/mp4).
// ============================================================

import axios from "axios";
import { wrapper } from "axios-cookiejar-support";
import { CookieJar } from "tough-cookie";

const BASE_URL = "https://getdl.space";

const HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Mobile Safari/537.36",
  "Accept-Language": "id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7",
  Referer: "https://getdl.space/id/search/tiktok",
  Origin: "https://getdl.space",
};

// Cookie jar per-call (fresh session tiap pencarian — session getdl
// sekali pakai per search, gak perlu persist)
function makeClient() {
  const jar = new CookieJar();
  return wrapper(
    axios.create({
      jar,
      withCredentials: true,
      timeout: 15000,
    })
  );
}

/**
 * Cari video TikTok via getdl.space — data up to date.
 * @param {string} query - Keyword pencarian
 * @param {object} [opts]
 * @param {number} [opts.count=10] - Jumlah hasil
 * @param {string} [opts.region="ID"] - Region hasil
 * @returns {Promise<Array<{index:number,title:string,duration:number,playUrl:string,cover:string,createdAt:number}>>}
 */
export async function getdlTikTokSearch(query, opts = {}) {
  const count = opts.count || 10;
  const region = opts.region || "ID";

  if (!query || !query.trim()) {
    throw new Error("Query pencarian tidak boleh kosong");
  }

  const client = makeClient();

  const sessionRes = await client.get(`${BASE_URL}/api/session`, { headers: HEADERS });
  if (!sessionRes.data?.success || !sessionRes.data.sessionId) {
    throw new Error("Gagal inisialisasi session GetDL: " + JSON.stringify(sessionRes.data).slice(0, 120));
  }
  const sessionId = sessionRes.data.sessionId;

  const payload = {
    query: query.trim(),
    count,
    cursor: 0,
    region,
    sessionId,
    sortType: 0,
  };

  const searchRes = await client.post(`${BASE_URL}/api/search/tiktok`, payload, {
    headers: { ...HEADERS, "Content-Type": "application/json" },
  });

  if (searchRes.status !== 200 || !searchRes.data?.success) {
    throw new Error(`GetDL API error (HTTP ${searchRes.status})`);
  }

  const { videos } = searchRes.data.data || {};

  return (videos || []).map((v, i) => ({
    index: i + 1,
    title: v.title || "(tanpa judul)",
    duration: v.duration || 0,
    playUrl: v.playUrl || "",
    cover: v.cover || "",
    // GetDL ngasih Unix-seconds
    createdAt: v.createdAt ? v.createdAt * 1000 : null,
  }));
}
