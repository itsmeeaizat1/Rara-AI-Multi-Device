// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// ============================================================
// 🔹 YOUTUBE SEARCH ENGINE BERSAMA — dipakai DUA agent:
//   • .novaagent  (src/lib/aiagent.js — TOOLS.searchyt)
//   • .aisuperagent (plugins/ai-agent/agent.js — deteksi lokal + tool ytsearch)
// 🔹 Request owner 14 Sep 2026: ".aisuperagent juga di-upgrade — agent itu
// novaagent sama aisuperagent bermasalah ngbug" — akarnya sama: request
// "cairkan/carikan X di youtube" gak pernah ke-detect, jatuh ke planner AI
// yang milih tool salah / jawab halusinasi. Fix: logic cari YouTube
// (browser beneran + thumbnail preview + mode unduh) dipindah ke lib
// bersama ini supaya dua agent tinggal manggil.
// 🔹 Revisi owner 14 Sep (kedua): kartu doang gak cukup — AI-nya juga
// 🔹 NARASI ALIVE: ngjelasin apa yang dia temuin dengan bahasa ngomong
//   natural (contoh owner: "aku yg aku temukan bot alya script md dgn 1000
//   fitur bla bla bla dia ngmong gt ngjelasin hsil pencariannnya jga").
// 🔹 Perilaku (revisi owner): hasil cari = THUMBNAL cuplikan preview +
// deskripsi plain text + link; video cuma DIUNDUH kalau eksplisit
// (unduh/download/dl/putar/nonton).
// ============================================================

// ── seam dep buat e2e offline (browserSearch / yts / thumbGet /
// httpGetText / httpGet / downloadVideoYtDlp / ikyyGet / ytdlFn /
// toWhatsAppVideo) ──
const __ytDeps = {};
export function _setYtSearchDepsForTest(d) { Object.assign(__ytDeps, d); }
export function _resetYtSearchDepsForTest() { for (const k of Object.keys(__ytDeps)) delete __ytDeps[k]; }

// 🔹 DETEKSI INTENT — dipakai localParse .novaagent + handler .aisuperagent.
// t = teks ternormalisasi, original = teks asli. Return {query, download}
// atau null kalau bukan request cari video YouTube.
export function detectYtSearchIntent(t, original) {
  t = String(t || "");
  original = String(original || t);
  // kata cari ATAU unduh/putar/nonton + konteks youtube/yt/video
  if (!/\b(carikan|cairkan|carikn|cariin|cari|crikin|cruisinkan|search|nyari(kan)?|putar(kan|in)?|mainkan|tonton(kan|in)?|nonton(kan|in)?|nton(in)?|play|playin|lihat(kan|in)?|unduh(kan|in)?|download|donlot|donlod|dl)\b/.test(t)) return null;
  if (!/\b(youtube|yt|video)\b/.test(t)) return null;
  // request owner 14 Sep: hasil cari = preview (thumbnail + deskripsi);
  // video cuma diunduh kalau eksplisit minta unduh/putar/nonton
  const wantDownload = /\b(unduhkan|unduhin|unduh|download|downlod|donlot|donlod|dl|putarkan|putarin|putar|mainkan|tontonkan|tontonin|tonton|nontonkan|nontonin|nonton|ntonin|nton|playin|play)\b/.test(t);
  const q = original
    .replace(/\b(tolong|please|dong|ya|yah|deh|sih|min|coba|kak|bang|bantu|bantu cari|bantu unduh)\b/gi, " ")
    .replace(/\b(unduhkan|unduhin|unduh|download|downlod|donlot|donlod|dl|carikan|cairkan|carikn|cariin|cari|crikin|cruisinkan|search|nyarikan|nyari|putarkan|putarin|putar|mainkan|tontonkan|tontonin|tonton|nontonkan|nontonin|nonton|ntonin|nton|playin|play|lihatkan|lihatin|lihat|kan)\b/gi, " ")
    .replace(/\b(di|ke|dari|ini|itu)\b/gi, " ")
    .replace(/\b(youtube|yt|videonya|video)\b/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
  return { query: q || "tutorial menarik", download: wantDownload };
}

// 🔹 NARASI ALIVE — revisi owner 14 Sep 2026: "tp aku mau g hnya thumbnaik
// dan deskripsi dr video tp ai ngjelasin apa yg dia cr jd kyk hidup — dia
// ngmong gt ngjelasin hsil pencariannnya jga" — AI ngerangkum hasil
// pencarian NYATA (judul/channel/durasi/views/deskripsi/video lain) jadi
// bahasa NGOMONG natural kaya lagi cerita ke teman. Semua fakta HARUS dari
// data hasil pencarian — prompt-nya ngelarang ngarang di luar data.
// Narasi GAGAL → skip senyap (kartu thumbnail/deskripsi udah lengkap).
async function narrateSearchResult(sock, m, { query, videos, main, likes, mode, failed, deps = {} }) {
  const D = deps;
  try {
    const chat = D.aiChat || (await import("./nova-ai-fallback.js")).aiChainChat;
    const mk = (x) => ({
      judul: x.title || "-",
      channel: x.author?.name || "-",
      durasi: x.duration?.timestamp || "-",
      views: x.views || 0,
      likes: x.likes || 0,
      tanggal: x.ago || "-",
      deskripsi: (x.description || "").slice(0, 800),
    });
    const data = (videos || []).map(mk);
    // hasil utama = hasil yang udah di-enrich BROWSER WATCH PAGE (judul,
    // views persis, likes, deskripsi full) — bukan versi list-page
    if (data[0]) data[0] = { ...data[0], ...mk(main || videos?.[0] || {}), likes: likes || data[0].likes };
    const statusKirim = mode === "unduh"
      ? (failed ? "video utamanya GAGAL diunduh tapi link-nya udah dikirim" : "video utamanya udah diunduh & dikirim jadi file video")
      : "video utamanya udah dikirim jadi thumbnail preview + deskripsi lengkap";
    const contohGaya = "Ini dia yang kamu cari — aku nemu video bot Alya script MD yang katanya bawa 1000 fitur lebih! Buatannya DARK SHADOW, durasi 4:50, baru sebulan di-upload dan keliatannya ngebahas deploy dari nol sampe jalan. Ada juga video lain yang mirip kalau yang ini kurang nyaman diliat.";
    const prompt = [
      "SYSTEM: Kamu Nova — asisten WhatsApp bot yang baru selesai nyariin video YouTube buat user. User nyari: '" + query + "'. " + statusKirim + ". Sekarang JELASIN hasil pencariannya ke user dengan bahasa NGOMONG natural kaya lagi cerita ke teman — hidup, santai, bahasa gaul Indonesia. Contoh gaya (JANGAN disalin, ini cuma gaya): '" + contohGaya + "'",
      "",
      "DATA HASIL PENCARIAN ASLI (JANGAN NGARANG di luar data ini — semua fakta yang kamu sebut HARUS dari sini; urutan pertama = hasil utama):",
      JSON.stringify(data, null, 1),
      "",
      "ATURAN:",
      "- 2-4 kalimat, maksimal 450 karakter.",
      "- Sebutin data kunci hasil utama (judul/channel/durasi/views/deskripsi) secara natural — BUKAN daftar kaku, JANGAN ulangin semua field.",
      "- Bahasa ngomong santai kaya orang — JANGAN markdown, JANGAN link, JANGAN bullet, JANGAN awali dengan 'Oke' atau 'Nah'.",
      "- Kalau videonya BELUM diunduh → tutup dengan ajakan natural (misal nawarin unduh videonya). Kalau udah diunduh → cukup komentar singkat soal videonya.",
      "- LANGSUNG isi jawaban tanpa pembuka 'Jawaban:' — murni narasimu.",
    ].join("\n");
    let out = String((await chat(prompt, { timeoutMs: 45000 })) || "").trim();
    out = out.replace(/^jawaban[:]\s*/i, "").trim();
    if (out && out.length > 10) {
      try { await sock.sendMessage(m.chat, { text: out }, { quoted: m }); } catch {}
    }
  } catch (e) {
    console.error("[ytsearch] narasi AI gagal (skip — kartu tetap lengkap):", e.message);
  }
}

// 🔹 CARI + KIRIM — browser beneran duluan (chromium, nova-yt-browser.js)
// → fallback yt-search; lalu MODE PENCARIAN (default) = thumbnail preview
// + caption plain text, MODE UNDUH (wantDownload) = video hasil unduhan.
export async function searchYoutubeAndSend(sock, m, { query, wantDownload = false, deps = {} } = {}) {
  const D = { ...__ytDeps, ...deps }; // deps yang dioper caller menang
  query = String(query || "").trim();
  if (!query) throw new Error("mau cari video apa? kasih judul/topiknya — contoh: carikan video bot alya md di youtube");

  // ── CARI: BROWSER BENERAN duluan (request owner 14 Sep 2026: "klo
  // disuruh cari jgn pakai kecerdasan ai tp agent mencari pakai browser
  // beneran seperti umumnya di ai superagent") — chromium headless buka
  // halaman hasil YouTube, ekstrak dari DOM. Kalau chromium gak ada /
  // crash / timeout → fallback yt-search (tetap hasil ASLI YouTube,
  // bukan AI). Keduanya GAK pakai kecerdasan AI sama sekali.
  let videos = [];
  let via = "";
  const browserSearch = D.browserSearch
    || (await import("../scraper/nova-yt-browser.js")).browserSearchYoutube;
  try {
    const raw = await browserSearch(query, { limit: 5 });
    videos = (raw || []).filter(v => v?.url && v?.title).slice(0, 5);
    if (videos.length) via = "browser";
  } catch (e) { console.error("[ytsearch] browser error:", e.message); }
  if (!videos.length) {
    // fallback terakhir yt-search — kadang ke-block YouTube (redirect
    // 302 consent/bot-check) → bungkus error biar pesannya jelas
    try {
      const yts = D.yts || (await import("yt-search")).default;
      const search = await yts(query);
      videos = (search?.videos || []).filter(v => v?.url).slice(0, 5);
      if (videos.length) via = "yt-search";
    } catch (e) {
      console.error("[ytsearch] yt-search fallback gagal:", String(e?.message || e));
    }
  }
  if (!videos.length) {
    throw new Error(
      "gak nemu video di YouTube buat: " + query +
      " (server YouTube lagi rewel ngeblokir pencarian — tunggu bentar terus coba lagi, atau ketik .playvideo <link>)",
    );
  }
  const v = videos[0];
  const fmtViews = (n) => !n ? "0" : n >= 1e6 ? (n / 1e6).toFixed(1) + " jt" : n >= 1e3 ? (n / 1e3).toFixed(1) + " rb" : String(n);

  // ── ENRICHMENT WATCH PAGE VIA BROWSER BENERAN (revisi owner 14 Sep:
  // "klo bsa sih jgn ngandelin yg lokal tp pakai puppeteer chromium dia
  // buka web youtube biar bsa cri info lngkapnya sebebas agentnya gt") —
  // browser BUKA HALAMAN VIDEO-nya langsung dan sedot info LENGKAP dari
  // DOM: deskripsi FULL, views persis, tanggal upload, jumlah like,
  // + daftar video terkait dari kolom related. Gagal → data list-page
  // tetap dipakai (jangan mati).
  let likes = 0;
  let related = videos.slice(1, 4);
  try {
    const browseWatch = D.browseWatch
      || (await import("../scraper/nova-yt-browser.js")).browserYtWatchInfo;
    const w = await browseWatch(v.url);
    if (w && typeof w === "object") {
      if (w.title) v.title = w.title;
      if (w.author?.name) v.author = { name: w.author.name };
      if (w.views) v.views = w.views;
      if (w.ago) v.ago = w.ago;
      if (w.description) v.description = w.description;
      if (w.duration?.timestamp) v.duration = { timestamp: w.duration.timestamp };
      if (w.likes) likes = Math.round(w.likes);
      if (Array.isArray(w.related) && w.related.length) related = w.related.slice(0, 3);
    }
  } catch (e) { console.error("[ytsearch] enrichment watch page gagal (lanjut data list-page):", e.message); }

  // deskripsi: jalur browser hasil list-page gak bawa deskripsi → ambil
  // shortDescription dari watch page (data ASLI YouTube, tetap bukan AI)
  let desc = (v.description || "").replace(/\s+/g, " ").trim();
  // fallback TERAKHIR: shortDescription via fetch HTML — cuma kalau
  // browser watch page gak nemu deskripsi (JANGAN nge-overwrite hasil
  // browser yang lebih lengkap)
  if (!desc) {
    try {
      const getText = D.httpGetText || (async (u) => {
        const axios = (await import("axios")).default;
        return (await axios.get(u, { timeout: 15000 })).data;
      });
      const html = String(await getText(v.url)) || "";
      const dm = html.match(/"shortDescription":"((?:[^"\\]|\\.)*)"/);
      if (dm) desc = (JSON.parse('"' + dm[1] + '"') || "").replace(/\s+/g, " ").trim();
    } catch (e) { console.error("[ytsearch] desc fetch error:", e.message); }
  }
  desc = desc.slice(0, 400);

  // kartu info: hasil utama + deskripsi plain text + daftar video lain
  const lines = [
    "🎬 *YouTube — " + query + "*", "",
    "🔍 _dicari via: " + (via === "browser" ? "browser beneran (chromium)" : "youtube engine") + "_", "",
    "📺 *" + v.title + "*",
    "👤 " + (v.author?.name || "-"),
    "⏱️ " + (v.duration?.timestamp || "-") + " • 👁️ " + fmtViews(v.views) + " penonton" + (likes ? " • 👍 " + fmtViews(likes) : ""),
    "📅 " + (v.ago || "-"),
  ];
  if (desc) lines.push("", "📝 " + desc);
  lines.push("", "🔗 " + v.url, "",
    related.length ? "👀 Video lain yang mirip:" : "");
  for (const x of related) {
    lines.push("• " + x.title + (x.duration?.timestamp ? " (" + x.duration.timestamp + ")" : "") + " → " + x.url);
  }
  const cardText = lines.filter(Boolean).join("\n");

  // ── MODE PENCARIAN (default, request owner 14 Sep): THUMBNAIL
  // cuplikan preview + deskripsi plain text — TANPA unduh video ──
  if (!wantDownload) {
    lines.push("", "💡 Mau ditonton? ketik: *.novaagent unduh video " + query + "* — atau *.playvideo* " + v.url);
    const previewText = lines.filter(Boolean).join("\n");
    // thumbnail resmi YouTube dari video id (i.ytimg.com) — cuplikan
    // preview beneran dari videonya, bukan hasil AI
    const videoId = (String(v.url).match(/(?:v=|youtu\.be\/|shorts\/|embed\/)([\w-]{11})/) || [])[1];
    let thumb = null;
    if (videoId) {
      const getBuf = D.thumbGet || (async (u) => {
        const axios = (await import("axios")).default;
        const { data } = await axios.get(u, { responseType: "arraybuffer", timeout: 15000 });
        return data;
      });
      // maxresdefault (HD) duluan; kalau 404/placeholder kecil → hqdefault
      for (const q of ["maxresdefault", "hqdefault"]) {
        try {
          const buf = Buffer.from((await getBuf("https://i.ytimg.com/vi/" + videoId + "/" + q + ".jpg")) || Buffer.alloc(0));
          if (buf.length > 3000) { thumb = buf; break; }
        } catch { /* coba kualitas berikutnya */ }
      }
    }
    if (thumb) {
      await sock.sendMessage(m.chat, { image: thumb, caption: previewText }, { quoted: m });
    } else {
      // thumbnail gagal diambil → kartu teks polos tetap lengkap
      await sock.sendMessage(m.chat, { text: previewText }, { quoted: m });
    }
    // 🔹 narasi alive — AI ngjelasin hasil pencariannya kayak ngomong
    // (revisi owner 14 Sep: kartu doang kurang — agent harus kerasa hidup)
    await narrateSearchResult(sock, m, { query, videos, main: v, likes, mode: "preview", deps: D });
    return { via, mode: "preview" };
  }

  // ── MODE UNDUH (eksplisit): kartu info + VIDEO hasil unduhan ──
  try {
    await sock.sendMessage(m.chat, { text: cardText }, { quoted: m });
  } catch { /* kartu gagal kirim → lanjut video, jangan mati */ }

  let buffer = null;
  // Try 1: yt-dlp / cobalt (nova-ytdlp) — dukung pilihan resolusi persis
  try {
    const downloadVideoYtDlp = D.downloadVideoYtDlp
      || (await import("../scraper/nova-ytdlp.js")).downloadVideo;
    const result = await downloadVideoYtDlp(v.url, "480");
    if (result?.buffer?.length > 10000) buffer = result.buffer;
  } catch (e) { console.error("[ytsearch] nova-ytdlp error:", e.message); }
  // Try 2: IkyyXD ytmp4
  if (!buffer) {
    try {
      const get = D.ikyyGet || (async (url, opts) => {
        const axios = (await import("axios")).default;
        return axios.get(url, opts);
      });
      const { data } = await get("https://api.ikyyxd.my.id/download/ytmp4", {
        params: { q: v.url, apikey: "kyzz" },
        timeout: 60000,
      });
      const dl = data?.result?.VideoUrl?.url || data?.result?.download_url || data?.result?.url;
      if (data?.status && dl) {
        const { data: buf } = await get(dl, { responseType: "arraybuffer", timeout: 120000 });
        if (buf && buf.length > 10000) buffer = Buffer.from(buf);
      }
    } catch (e) { console.error("[ytsearch] IkyyXD ytmp4 error:", e.message); }
  }
  // Try 3: ytdl.js mp4
  if (!buffer) {
    try {
      const ytdlFn = D.ytdlFn || (await import("../scraper/ytdl.js")).ytdl;
      const result = await ytdlFn(v.url, "mp4");
      if (result?.status && result?.dl) {
        const get = D.httpGet || (async (url, opts) => {
          const axios = (await import("axios")).default;
          return axios.get(url, opts);
        });
        const { data: buf } = await get(result.dl, { responseType: "arraybuffer", timeout: 120000 });
        if (buf && buf.length > 10000) buffer = Buffer.from(buf);
      }
    } catch (e) { console.error("[ytsearch] ytdl.js error:", e.message); }
  }
  if (!buffer || buffer.length < 10000) {
    // unduh kandas → kartu info udah terkirim di atas, kasih info jujur + link
    await sock.sendMessage(m.chat, {
      text: "⚠️ Videonya gagal diunduh (server YouTube sedang rewel) — tapi link video-nya udah aku kirim di atas, bisa langsung ditonton / dipakai *.playvideo* " + v.url,
    }, { quoted: m });
    await narrateSearchResult(sock, m, { query, videos, main: v, likes, mode: "unduh", failed: true, deps: D });
    return { via, mode: "unduh", failed: true };
  }
  // pastikan H.264+AAC (sumber kadang kasih AV1/VP9 yang gagal diputar di WA)
  try {
    const toWhatsAppVideo = D.toWhatsAppVideo
      || (await import("./nova-ffmpeg.js")).toWhatsAppVideo;
    buffer = await toWhatsAppVideo(buffer, { maxHeight: 480 });
  } catch { /* konversi gagal → kirim buffer apa adanya, WA biasanya tetap keputar */ }
  await sock.sendMessage(m.chat, {
    video: buffer,
    caption: "🎬 *" + v.title + "*\n👤 " + (v.author?.name || "-") + " • ⏱️ " + (v.duration?.timestamp || "-") + "\n🔗 " + v.url + "\n\n_(video hasil pencarian: " + query + ")_",
  }, { quoted: m });
  await narrateSearchResult(sock, m, { query, videos, main: v, likes, mode: "unduh", deps: D });
  return { via, mode: "unduh" };
}
