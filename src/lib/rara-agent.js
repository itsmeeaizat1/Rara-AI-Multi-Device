// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
// rara-agent.js — AI AGENT OTONOM MULTI-LANGKAH (request owner 11 Sep 2026:
// "buatkan no 1" — ide fitur paling canggih + revisi "biar ai agentnya bisa
// browsing dan automation kayak kick org cm dari nama, tutup grup dll").
//
// TIGA MODE — dipilih AI saat fase PLAN (serba bisa):
// TIGA MODE — dipilih AI saat fase PLAN (request owner 11 Sep 2026: "hrs serba
// bisa agar berbeda dr bot lain bsa apa aja perintahkan fitur, cmd, buat fitur,
// pasang fitur, scan gambar, generate gambar, nggobrol pakai vn, inget jejak
// histori aktivitas, ingat percakapan sblmnya"):
//  • mode "research" — browsing/riset web: plan → search → pick → read → compose
//  • mode "act"      — otomasi WhatsApp grup (kick dari NAMA, tutup grup, dll):
//                      plan → act (eksekusi via callback plugin) → laporan.
//    Executor + gate admin ada di plugin (agent.js) — lib cuma orkestrasi,
//    biar tetap gampang di-e2e (seam `act`).
//
// Alur research 5 fase:
//   1. PLAN    — AI bikin rencana: pecah tugas jadi query pencarian (max 3)
//   2. SEARCH  — jalankan tiap query lewat rara-websearch (bing + fallback chain)
//   3. PICK    — AI milih halaman paling relevan dari pool hasil (max 3)
//   4. READ    — buka halaman terpilih, ekstrak isi plain text (cap 3500 char/halaman)
//   5. COMPOSE — AI susun jawaban akhir dari BUKTI nyata + cantumin sumber
//
// AI dipanggil lewat aiChainChat (rantai internal — fitur internal boleh,
// beda sama command satuan yang strict per owner). Semua langkah punya
// fallback degradasi: plan gagal → tugas jadi query; pick gagal → 3 teratas;
// read gagal → pakai snippet pool; compose gagal → digest lokal (tetep ada
// jawaban + sumber, gak perlu batal total).
//
// Seams buat e2e: setAgentDeps({ aiChat, search, preview }).

import fs from "fs";
import { stripMarkdownTables } from "./rara-md-table.js";
import path from "path";
import { fileURLToPath } from "url";
import { execFileSync } from "child_process";
import { aiChainChat } from "./rara-ai-fallback.js";
import { searchWeb, fetchPagePreview } from "./rara-websearch.js";

const __libFilename = fileURLToPath(import.meta.url);
const REPO_ROOT = path.resolve(path.dirname(__libFilename), "..", "..");

const MAX_QUERIES = 3;
const MAX_PICKS = 3;
const POOL_OFFER = 12;
// 🔹 FIX OWNER 17 Sep 2026 ("informasinya pendek kyk singkat gak lengkap"):
// halaman dibaca lebih DALAM (3500 → 10000 char) + bukti ke compose
// dilipatgandakan — jawaban riset harus Lengkap, bukan ringkasan tipis.
const PAGE_TEXT_CAP = 10000;

let _aiChat = aiChainChat;
let _search = searchWeb;
let _preview = fetchPagePreview;
let _browserSearch; // undefined = pakai chromium asli; null = DISABLED (e2e)

export function setAgentDeps({ aiChat, search, preview, browserSearch } = {}) {
  if (aiChat) _aiChat = aiChat;
  if (search) _search = search;
  if (preview) _preview = preview;
  if (browserSearch !== undefined) _browserSearch = browserSearch;
}
export function resetAgentDeps() {
  _aiChat = aiChainChat;
  _search = searchWeb;
  _preview = fetchPagePreview;
  _browserSearch = undefined; // undefined = pakai chromium asli
}

// 🔹 FALLBACK CHROMIUM (owner report 17 Sep: berita "saya tidak tahu" —
// semua engine scrape balikin SERP sampah dari IP datacenter → pool kosong
// → error "mesin search sibuk". Chromium html.duckduckgo.com lolos blokir).
async function _browserSearchRun(query, limit) {
  // 🔹 semantik seam: function = mock; null = DISABLED (e2e biar gak
  // launch browser asli); undefined = chromium asli
  if (typeof _browserSearch === "function") return _browserSearch(query, { limit });
  if (_browserSearch === null) return null;
  try {
    const { browserWebSearch } = await import("../scraper/rara-web-browser.js");
    return await browserWebSearch(query, { limit });
  } catch { return null; }
}

// 🔹 UPGRADE 30 Sep 2026 (owner: "klo dia ga tau dia nyari browsing lewat
// puppeteer") — BUKA HALAMAN via chromium beneran (browserPageFacts) buat
// fallback baca halaman yang ngeblok fetch biasa / butuh JS. Semantik seam
// sama _browserSearch: function = mock; null = DISABLED; undefined = asli.
let _browserFacts;
export function setBrowserFacts(fn) { _browserFacts = fn; }
export function _resetBrowserFacts() { _browserFacts = undefined; }
export async function _browserFactsRun(url) {
  if (typeof _browserFacts === "function") return _browserFacts(url);
  if (_browserFacts === null) return null;
  try {
    const { browserPageFacts } = await import("../scraper/rara-web-browser.js");
    return await browserPageFacts(url);
  } catch { return null; }
}

// ── util ──
function domainOf(url) {
  try { return new URL(url).hostname.replace(/^www\./, ""); } catch { return String(url); }
}

// JSON extractor lokal — tahan code fence / kalimat pembuka (pola autonovaai)
function parseJsonLocal(raw) {
  if (!raw) return null;
  let s = String(raw).replace(/```json|```/gi, "").trim();
  const a = s.indexOf("{");
  const b = s.lastIndexOf("}");
  if (a === -1 || b <= a) return null;
  try { return JSON.parse(s.slice(a, b + 1)); } catch { return null; }
}

const MAX_ACTS = 3;
const ACT_ACTIONS = [
  "kick", "add", "promote", "demote", "open", "close", "lockedit", "unlockedit",
  "rename", "desc", "tagall", "link", "leave",
  "antilink", "antibadword", "antisticker", "antivoice", "antispam", // toggle fitur automod grup
];
// kata kunci fitur automod — dipakai buat DUA hal: (1) local detector fallback,
// (2) filter keamanan buat action "link" (cegah LLM ke-confuse "antilink"
// jadi "ambil link grup" — bug nyata dilaporkan owner 12 Sep 2026)
const FEATURE_TOGGLE_WORDS = /\b(antilink|antibadword|antisticker|antivoice|antispam)\b/i;
const MAX_TOOLS = 4;
const TOOL_LIST = [
  "command", // jalanin command bot lain (sticker, quotes, dll)
  "image",   // generate gambar (callImageGen)
  "editimage", // EDIT gambar yang di-reply/attach (ganti baju, face swap, umur, rambut, gender, bg, hapus objek — nano-banana chain)
  "download", // unduh file dari URL (apk/zip/dll) + kirim dokumen
  "vision",  // scan gambar yang di-reply/attach (visionScan)
  "activity",// statistik aktivitas grup (activity tracker)
  "memory",  // ingat percakapan agent sebelumnya
  "create",  // BUAT FITUR BARU + pasang (owner only — codegen + hot-load)
  "code",    // BIKIN KODE PROGRAM (html/js/python/dll) + kirim file
  "skill",   // SKILL BUILT-IN + PACK (kbbi/gempa/hoki/lirik/calc/translate/kurs/qr/wiki/cuaca/dll)
  "mcp",     // TOOL SERVER MCP (context7/deepwiki/mslearn/gitmcp — sesuai server terpasang)
  "createfile", // bikin file teks dari konten (txt/md/json/dll) + kirim dokumen
  "browse",  // buka link & baca isi halaman web (quick read)
  "ytsearch", // CARI VIDEO YOUTUBE — browser beneran + thumbnail preview (request owner 14 Sep)
];

export const SYS_PLAN = `Kamu adalah perencana aksi AI agent. Balas HANYA objek JSON murni tanpa kalimat pembuka/penjelas/markdown. Karakter PERTAMA harus { dan TERAKHIR }.

ATURAN PRIORITAS TUGAS INFORMASI (request owner 12 Sep — WAJIB ikuti urutan ini):
1. JAWAB SENDIRI DULU — pertanyaan pengetahuan umum yang kamu udah tahu ("siapa prabowo", "apa itu fotosintesis", "ibu kota jepang", matematika, sejarah, definisi, resep dasar, konsultasi) → mode persona, jawab pakai kecerdasanmu sendiri TANPA research/tool/skill/mcp.
2. BROWSING KALAU PERLU — info yang butuh data TERBARU/realtime yang kamu gak mungkin tahu (berita hari ini, harga sekarang, event mendatang, update terbaru, "berapa sekarang") ATAU kamu GAK YAKIN jawabannya → mode research.
3. SKILL/MCP = SENJATA TERAKHIR — cuma dipakai kalau kamu bingun/butuh data SPESIFIK yang emang domain tool-nya: arti kata resmi → skill kbbi; gempa terkini → skill gempa; dokumentasi library coding → mcp deepwiki/context7; docs Microsoft → mcp mslearn. JANGAN pernah pilih skill/mcp buat pertanyaan pengetahuan umum yang kamu sendiri bisa jawab.

Pilih SALAH SATU mode:

1. Riset/browsing web (info BUTUH data terbaru dari internet: berita, harga sekarang, event, update terkini — BUKAN buat pertanyaan pengetahuan umum yang kamu udah tahu jawabannya):
{"mode": "research", "queries": ["query 1", "query 2", "angle": "sudut pandang singkat"}
Maksimal ${MAX_QUERIES} query — pendek, spesifik, kata kunci ala google (bukan kalimat tanya), bahasa ikut tugas user.

2. AKSI WhatsApp grup (tugas meminta otomasi grup: kick member, tutup grup, ubah nama grup, dll):
{"mode": "act", "actions": [{"action": "kick", "target": "nama persis yang ditulis user", "value": null}]}
Action valid: kick (keluarkan member), add (tambah member), promote (jadikan admin), demote (turunkan admin), open (buka grup — semua member bisa chat), close (tutup grup — cuma admin bisa chat), lockedit (kunci edit info grup), unlockedit (buka edit info grup), rename (ubah nama grup, value = nama baru), desc (ubah deskripsi grup, value = deskripsi baru), tagall (tag semua member), leave (BOT keluar dari grup — OWNER ONLY, target = nama grup persis yang ditulis user, contoh "keluar dari grup cari teman sejati", bisa dikirim dari DM owner), link (KHUSUS user MINTA/LIHAT/AMBIL link undangan grup — bukan nama fitur), antilink (nyala/matiin filter anti-link, value "on"/"off"), antibadword (nyala/matiin filter kata kasar, value "on"/"off"), antisticker (nyala/matiin blokir sticker, value "on"/"off"), antivoice (nyala/matiin blokir voice note, value "on"/"off"), antispam (nyala/matiin filter spam, value "on"/"off").
PENTING: kalau user minta "aktifkan/nyalain/matiin antilink" (atau antibadword/antisticker/antivoice/antispam) itu MENYALAKAN FITUR MODERASI, action-nya "antilink" dst dengan value on/off — BUKAN action "link" (action "link" HANYA kalau user eksplisit minta link undangan grup, kata "link" berdiri sendiri, bukan bagian dari nama fitur "antilink").
Maksimal ${MAX_ACTS} action. Target = nama orang persis seperti ditulis user (atau nomor 62xxx kalau user kasih nomor); action yang gak butuh target isi null. Rename/desc/antilink/antibadword/antisticker/antivoice/antispam isi value.

3. TOOLS serba bisa (tugas minta AI ngerjain pakai kemampuan bot: bikin gambar, EDIT gambar (ganti baju/wajah/umur/rambut/gender/background/hapus objek), scan gambar, jalanin fitur/command bot, cek aktivitas grup, inget percakapan, bikin fitur baru):
{"mode": "tools", "tools": [{"tool": "command", "cmd": "sticker", "args": "kucing"}, {"tool": "image", "prompt": "kucing astronot di bulan"}, {"tool": "editimage", "prompt": "ganti baju jadi formal", "mode": "clothes"}, {"tool": "vision", "question": "apa yang ada di gambar ini?"}, {"tool": "activity", "query": "siapa paling aktif"}, {"tool": "memory", "query": "tadi nanya apa"}, {"tool": "download", "url": "https://situs.com/app.apk"}, {"tool": "code", "spec": "halaman html toko kue dengan kartu produk", "lang": "html", "name": "tokokue"}, {"tool": "skill", "skill": "kbbi", "args": "makan"}, {"tool": "mcp", "server": "deepwiki", "mcpTool": "ask_question", "data": {"repoName": "facebook/react", "question": "apa itu React"}}, {"tool": "createfile", "name": "catatan", "content": "isi file persis yang diminta user", "data": null}, {"tool": "browse", "url": "https://situs.com/artikel"}, {"tool": "ytsearch", "query": "bot alya md", "download": false}, {"tool": "create", "name": "namafitur", "spec": "deskripsi lengkap fitur baru yang diminta user"}], "voice": false}
Tool valid: command (jalanin command bot lain, cmd TANPA titik + args), image (generate gambar dari prompt), editimage (EDIT gambar yang di-reply/attach — ganti baju, ganti background, hapus objek, ubah umur, ganti rambut, ganti gender — isi "prompt" = deskripsi edit, "mode" = clothes/bg/remove/age/hair/gender), vision (analisis gambar yang user reply/attach), activity (statistik aktivitas grup), memory (ingat riwayat percakapan agent di chat), download (UNDUH FILE dari link URL langsung — apk/zip/mp3/pdf/dll — user kasih link .apk/.zip → isi "url"; link wajib LANGSUNG ke file, bukan halaman web), code (BIKIN KODE PROGRAM apa pun — html/css/javascript/python/php/dll — user minta kode/program/aplikasi/web/script/login page/dll → isi "spec" = detail lengkap SEakan user ngomong ke programmer: semua section/fitur/tampilan yang diminta (misal "web login topup: form login, pilihan paket, tombol topup, footer"), "lang" = bahasa pemrograman, "name" = nama file singkat tanpa spasi; kode FULL dibikin generator khusus + dilengkapi otomatis kalau kepotong, hasil = FILE siap jalan langsung dibuka), skill (PAKAI SKILL BUILT-IN — arti kata, cek gempa, nomor hoki, lirik lagu, kalkulator, translate, kurs, qr code, wikipedia, cuaca, dll — isi "skill" = nama skill persis dari daftar TOOLBOX yang tersedia, "args" = string/objek argumen skill), mcp (PANGGIL TOOL SERVER MCP — dokumentasi library/repo GitHub/docs Microsoft — isi "server" + "mcpTool" persis dari daftar TOOLBOX yang tersedia, "data" = args objek), createfile (BIKIN FILE TEKS dari konten yang diminta user — KHUSUS file teks (txt/md/json/csv/dll) → isi "name" = nama file, "content" = isi file PERSIS seakan-akan file sudah jadi final — JANGAN pernah disingkat/elipsis/placeholder; KALAU USER MINTA KODE PROGRAM/aplikasi/web/script → WAJIB pakai tool code BUKAN createfile), browse (BUKA LINK & BACA ISI halaman web → isi "url"; user suruh "buka link ini/baca halaman ini" → isi url, hasil dibaca langsung), ytsearch (CARI VIDEO YOUTUBE → isi "query" = judul/topik video, "download" = true HANYA kalau user eksplisit minta UNDUH/PUTAR/NONTON videonya — default false cukup kirim thumbnail preview + deskripsi + link; user suruh "carikan/cairkan video X di youtube" → isi query + download false), create (BUAT FITUR BARU + pasang otomatis — hanya owner). Maksimal ${MAX_TOOLS} tool. "voice": true kalau user minta dijawab pakai voice note (vn/suara).
ATURAN HAK AKSES (owner 25 Sep): tool command jalan ATAS NAMA user yang manggil. Command owner/premium/partner-only di luar hak user DITOLAK executor dengan pesan jelas — sampaikan penolakan itu apa adanya ke user (JANGAN janjiin sukses), jangan diulangin nyoba command yang sama.
TOOLBOX TERSEDIA (skill + server MCP terpasang di bot ini — cuma boleh pakai yang di daftar):
{{TOOLBOX}}
4. PERSONA/ngobrol (JALUR UTAMA buat pertanyaan informasi yang kamu udah tahu — user minta BERMAIN PERAN jadi orang lain, ngobrol santai, bantuin tugas, atau TANYA APA PUN yang bisa kamu jawab dari pengetahuanmu sendiri TANPA browsing: "jadi anak kecil", "jadi pacarku", "pura-pura jadi dokter", "temenin ngobrol", "bantuin tugas matematika ini", "cerita dong", konsultasi, motivasi, curhat):
{"mode": "persona", "persona": "deskripsi persona LENGKAP — siapa, umur, sifat, gaya bahasa (contoh: anak laki-laki umur 5 tahun cerewet sok jagoan) — isi null kalau tanpa peran khusus", "voice": false}
Kalau riwayat percakapan masih dalam persona yang sama → LANJUT persona yang sama. Bikin kode program → pakai tools mode dengan tool code. Tugas butuh info dari internet → research.

Kalau kamu TAHU jawabannya → persona (jawab sendiri). Kalau butuh data TERBARU atau gak yakin → research. Kalau ragu → research. skill/mcp cuma kalau data emang domain tool-nya (lihat ATURAN PRIORITAS).`;

// persona prompt — request owner 11 Sep: "klo disuruh profesi jd anak kecil
// atau pacar dia persona berubah sesuai yg diinginkan user" — agent in-character.
// 🔹 UPGRADE NATURAL 29 Sep (owner: "tanpa ada paksaan system prompt biar ai
// jawab senatural dr pusatnya") — diktat gaya DIBUANG TOTAL (WAJIB 1-6 baris,
// bahasa santai, contoh rasa, ajakan ngobrol). Yang tersisa cuma batasan FAKTA:
// jalur ini tanpa internet (anti-halusinasi link) + persona itu permintaan
// eksplisit user (fitur bermain peran, bukan paksaan sistem).
const personaPrompt = (persona) => {
  // 🔹 FIX 29 Sep (owner report: tiap balasan selalu dibuka "HAI! 😊" +
  // ditutup template rocket-emoji berulang kayak reset percakapan tiap giliran,
  // padahal ini fitur AUTO-CHAT yang harus keliatan LANJUT ngobrol biasa) —
  // larangan sapaan-template berlaku di SEMUA cabang, ada persona maupun default.
  const antiGreeting = `Ini SAMBUNGAN percakapan yang sedang berjalan, BUKAN sapaan pembuka — jangan mulai balasan dengan sapaan template ("Hai!"/"Halo!" + emoji senyum, dst) atau ditutup kalimat penutup template ("aku siap bantu apa pun 🚀✨" dst) seolah tiap giliran adalah awal obrolan baru. Langsung ke inti jawaban seperti orang yang lanjut chat biasa. TAPI kalau pesan TERBARU dari user cuma sapaan singkat/basa-basi polos ("hai", "halo", "p", "test", "woi", dst) TANPA pertanyaan atau topik baru, itu BUKAN perintah buat ngelanjutin bahas topik lama di riwayat — balas sapaan itu secukupnya & natural (boleh singgung dikit riwayat kalau pas, atau tanya kabar/mau ngomongin apa), JANGAN langsung nyemplung jawab panjang soal topik lama yang gak lagi ditanya.`;
  return persona
    ? `Kamu bermain peran sebagai: ${persona}.
Jawab in-character sesuai karakter itu dan konsisten sepanjang percakapan. Jangan nyebut dirimu AI/bot/program kecuali user beneran nanya. Kamu tidak punya akses internet di jalur ini — jangan mencantumkan link/sumber web apa pun. ${antiGreeting} Selain itu tidak ada aturan gaya — bicara sepenuhnya dengan suara alamimu sendiri.`
    : `Kamu tidak punya akses internet di jalur ini — jangan mencantumkan link/sumber web apa pun (itu pasti halusinasi). ${antiGreeting} Selain itu TIDAK ADA aturan gaya, nada, panjang, atau bahasa wajib — jawab pertanyaan/tugas user sepenuhnya dengan suara alamimu sendiri.`;
};
const SYS_PICK = `Kamu adalah kurator riset. Balas HANYA objek JSON murni. Karakter PERTAMA harus { dan TERAKHIR }.
Format: {"picks": [nomor1, nomor2, nomor3]}
Aturan: pilih ${MAX_PICKS} halaman paling relevan & berbobot buat tugas user (hindari halaman login/agregator kosong), nomor sesuai daftar kandidat.`;

const SYS_ANSWER = `Kamu adalah analis riset. Jawab tugas user berdasarkan BUKTI dari halaman web yang diberikan (ditandai [S1], [S2], dst).
Aturan jawaban: bahasa yang sama dengan tugas user (default Indonesia). Jawab LENGKAP dan BERBOBOT — keluarkan SEMUA informasi penting dari bukti (fakta, angka, kronologi, nama, kutipan relevan), JANGAN diringkas jadi 2-3 baris tipis; kalau buktinya banyak, jawaban boleh panjang (poin/heading boleh). Sebut sumber dengan [S1]/[S2] di kalimat yang pakai info itu, jangan mengarang data yang gak ada di bukti, jangan pakai markdown table, jangan mulai dengan sapaan template ("Hai!"/"Halo!" + emoji) seolah ini obrolan baru, akhiri tanpa sapaan basa-basi.`;

// deteksi aksi lokal — fallback kalau LLM plan down (biar "tutup grup" dll
// tetep jalan tanpa AI) — heuristik kata kunci Indonesia
export function detectActLocal(task) {
  const raw = String(task);
  const s = raw.toLowerCase();
  const acts = [];
  const targetAfter = (re) => {
    // match di teks ASLI biar kapitalisasi nama kejaga, flag case-insensitive
    const m = raw.match(new RegExp(re.source, "i"));
    return m ? m[1].replace(/\b(yang|itu|dong|ya|pls|please|nih|dari grup|keluar)\b/gi, "").trim() : null;
  };
  // ── LEAVE GROUP (owner only) — "keluar dari grup X" / "keluarin bot dari
  // grup X" / "leave grup X". Bisa TANPA nama ("keluar dari grup ini") kalau
  // perintah dikirim dari dalam grup itu. DETEKSI PERTAMA biar gak ketabrak
  // regex kick (yang juga kenal "keluarkan/keluarin").
  let leaveName = null;
  // antara kata kerja & "grup" CUMA boleh ada perantara bot/aku/dari —
  // "keluarkan BUDI dari grup ini" tetap kick orang (bukan leave).
  const leaveM = raw.match(/\b(?:keluar(?:in|kan)?|leave|out)\b(?:\s+(?:bot|aku|saya))*(?:\s+dari)?\s+(?:grup|group|gc)\b\s*(.+)?/i);
  if (leaveM) {
    leaveName = (leaveM[1] || "")
      .replace(/\b(yang|itu|ini|dong|ya|pls|please|sekarang|gih|deh|aj[ai]?)\b/gi, "")
      .replace(/\b(bot|aku|dari)\b/gi, "")
      .trim() || null;
    acts.push({ action: "leave", target: leaveName });
  }
  if (!leaveM && /\b(kick|keluarkan|keluarin|buang|usir|tendang|kicking)\b/.test(s))
    acts.push({ action: "kick", target: targetAfter(/\b(?:kick|keluarkan|keluarin|buang|usir|tendang|kicking)\s+(?:orang\s+)?(?:yang\s+)?(?:bernama\s+)?([a-z0-9 @_]{2,40})/) });
  if (/\b(promote|promotein|jadikan admin|jadiin admin)\b/.test(s)) acts.push({ action: "promote", target: targetAfter(/(?:promote|jadikan admin|jadiin admin)\s+(?:orang\s+)?(?:yang\s+)?(?:bernama\s+)?([a-z0-9 @_]{2,40})/) });
  if (/\b(demote|demotein|turunkan admin|lepas admin)\b/.test(s)) acts.push({ action: "demote", target: targetAfter(/(?:demote|turunkan admin|lepas admin)\s+(?:orang\s+)?(?:yang\s+)?(?:bernama\s+)?([a-z0-9 @_]{2,40})/) });
  if (/\btutup\s+(?:grup|group|gc)\b/.test(s)) acts.push({ action: "close" });
  if (/\bbuka\s+(?:grup|group|gc)\b/.test(s) && !/link|tautan/.test(s)) acts.push({ action: "open" });
  if (/\b(kunci|lock)\s+(?:edit|info)\b/.test(s)) acts.push({ action: "lockedit" });
  if (/\b(buka kunci|unlock)\s+(?:edit|info)\b/.test(s)) acts.push({ action: "unlockedit" });
  if (/\b(ubah|ganti|rename)\s+nama\s+(?:grup|group)/.test(s))
    acts.push({ action: "rename", value: (s.match(/(?:jadi|menjadi|:|-)\s*(.+)$/) || [])[1] || null });
  if (/\b(ubah|ganti)\s+(?:deskripsi|desc)\s+(?:grup|group)/.test(s))
    acts.push({ action: "desc", value: (s.match(/(?:jadi|menjadi|:|-)\s*(.+)$/) || [])[1] || null });
  if (/\btag\s?all|tag\s+semua\b/.test(s)) acts.push({ action: "tagall" });
  // "link" HANYA kalau eksplisit minta link undangan — jangan sampe ketangkep
  // kata di dalam nama fitur "antilink" (FEATURE_TOGGLE_WORDS cek di bawah)
  if (/\blink\s+(?:grup|group|invite|undangan)\b|\binvite\b|\btautan\s+(?:grup|undangan)\b/.test(s) && !FEATURE_TOGGLE_WORDS.test(s))
    acts.push({ action: "link" });
  // toggle fitur automod: antilink/antibadword/antisticker/antivoice/antispam
  const FEATURES = ["antilink", "antibadword", "antisticker", "antivoice", "antispam"];
  for (const feat of FEATURES) {
    const featRe = new RegExp(`\\b${feat}\\b`, "i");
    if (!featRe.test(s)) continue;
    const onRe = /\b(aktifkan|aktifin|nyalain|nyalakan|hidupkan|pasang|setel|set)\b/i;
    const offRe = /\b(matikan|matiin|nonaktifkan|nonaktifin|hapus|lepas|cabut)\b/i;
    if (offRe.test(s)) acts.push({ action: feat, value: "off" });
    else if (onRe.test(s) || /\bon\b/.test(s)) acts.push({ action: feat, value: "on" });
  }
  // "keluarkan/keluarin bot dari grup X" — regex kick nyasar nangkep;
  // kalau ada action leave, kick yang targetnya "bot" dibuang.
  const hasLeave = acts.some((a) => a.action === "leave");
  const filtered = hasLeave
    ? acts.filter((a) => !(a.action === "kick" && /\b(bot|aku|saya|diri sendiri)\b/i.test(String(a.target || ""))))
    : acts;
  return filtered.map(a => ({ action: a.action, target: a.target || null, value: a.value || null })).slice(0, MAX_ACTS);
}

/**
 * runAgent — jalankan tugas kompleks multi-langkah.
 * @param {string} task tugas user, mis. "cari hp terbaik di bawah 5 juta, bandingkan, kasih rekomendasi"
 * @param {Object} [opts]
 * @param {(phase:string, info:string) => void} [opts.onPhase] progress callback:
 *        "plan" | "act" (info=action) | "search" (info=query) | "pick" | "read" (info=domain) | "compose"
 * @param {(action:{action,target,value}, ctx:any) => Promise<{ok:boolean,msg:string}>} [opts.act]
 *        executor aksi grup — wajib buat mode act (gate admin + resolve nama ada di plugin)
 * @param {Object.<string, Function>} [opts.execTools] executor per-tool mode tools
 *        ({tool, ...payload}, ctx) => {ok, msg, evidence?} — implementasi di plugin
 * @param {string[]} [opts.history] riwayat percakapan agent di chat ini (biar ingat konteks)
 * @param {string} [opts.memBlock] blok memori user (rara-memory.js memoryBlock) — di-inject ke prompt
 * @param {Object} [opts.context] info grup (isGroup/isAdmin/isOwner/isBotAdmin/chat/sender) — dikirim ke LLM plan + executor
 * @returns {Promise<{mode,answer,queries,sources,steps,results,viaLocal,voice}|{error}>}
 */
export async function runAgent(task, { onPhase, act, execTools, history, context, toolbox, memBlock, skillBlock, ai } = {}) {
  // 🔹 override AI per-call (mis. .9router ag → model 9router lokal) — tanpa sentuh deps global
  const aiChat = ai || _aiChat;
  const phase = (p, info) => { try { onPhase?.(p, info); } catch {} };
  const steps = [];
  // 🔹 MEMORY LAYER (upgrade #2 "bot masa depan", owner 25 Sep 2026): blok
  // fakta durabel tentang user (rara-memory.js memoryBlock) — dikirim pemanggil,
  // di-inject ke prompt planner + persona + compose biar agent inget user
  // antar sesi. Kosong kalau memory off / user belum punya fakta.
  const mem = typeof memBlock === "string" ? memBlock : "";
  // 🔹 SKILL LAYER (owner 25 Sep 2026, "183 skill sekaligus"): panduan
  // spesialis dari skills/ (wshobson/agents, progressive disclosure —
  // rara-askills.js skillsBlock match tugas → inject isi SKILL.md relevan
  // aja). Kosong kalau gak ada yang nyambung.
  const skl = typeof skillBlock === "string" ? skillBlock : "";

  // ── FASE 1: PLAN — AI milih mode (research/act) + susun rencana ──
  phase("plan");
  let plan = null;
  const ctxLine = context
    ? `\nKonteks: ${context.isGroup === false ? "chat pribadi (BUKAN grup)" : "di grup"}${context.isAdmin ? ", user admin grup" : context.isOwner ? ", user owner bot" : ", user bukan admin"}${context.isBotAdmin ? ", bot admin grup" : ", bot bukan admin grup"}${context.mediaAttached ? ", user reply/attach gambar (bisa dipakai tool vision)" : ""}.`
    : "";
  const histLine = Array.isArray(history) && history.length
    ? `\nRiwayat percakapan agent di chat ini (ingat konteks ini):\n${history.slice(-5).join("\n")}`
    : "";
  // toolbox dinamis — daftar skill + tool MCP yang ke-install di bot ini
  // (request owner 12 Sep: ".aisuperagent upgrade ... dilengkapi mcp, skills
  // dan tool tambahan kyk raraagent") — planner cuma boleh milih yang ada
  const toolboxStr = String(toolbox || "").trim();
  const sysPlan = toolboxStr ? SYS_PLAN.replace("{{TOOLBOX}}", toolboxStr) : SYS_PLAN.replace("TOOLBOX TERSEDIA (skill + server MCP terpasang di bot ini — cuma boleh pakai yang di daftar):\n{{TOOLBOX}}", "(tool skill/mcp gak terpasang di bot ini)");
  try {
    plan = parseJsonLocal(await aiChat(`Tugas user: ${task}${ctxLine}${histLine}${mem}${skl}`, { systemPrompt: sysPlan }));
  } catch {}
  // NORMALISASI FORMAT FLAT (ketahuan live 12 Sep): model kadang jawab
  // {"mode":"skill","skill":"kbbi","args":"makan"} LANGSUNG di level atas
  // (tanpa array "tools") — tanpa normalisasi ini jatuh nyasar ke research.
  // Wrap jadi {"mode":"tools","tools":[{tool:"skill",...}]} biar jalan bener.
  if (plan && !Array.isArray(plan.tools) && plan.mode && TOOL_LIST.includes(String(plan.mode).toLowerCase().trim())) {
    const flatTool = String(plan.mode).toLowerCase().trim();
    plan = { ...plan, mode: "tools", voice: !!plan.voice, tools: [{ ...plan, tool: flatTool }] };
  }

  // normalisasi rencana act (dari LLM atau deteksi lokal)
  let actions = null;
  if (Array.isArray(plan?.actions) && plan.actions.length) {
    actions = plan.actions
      .map(a => ({ action: String(a?.action || "").toLowerCase().trim(), target: a?.target ? String(a.target).trim() : null, value: a?.value ? String(a.value).trim() : null }))
      .filter(a => ACT_ACTIONS.includes(a.action))
      .slice(0, MAX_ACTS);
    // 🛡️ SAFETY FILTER — bug nyata dilaporkan owner 12 Sep 2026: minta
    // "aktifkan antilink" malah dijawab kirim LINK GRUP (LLM ke-confuse
    // substring "link" di "antilink" jadi action "link"). Buang action
    // "link" kalau tugas ngomongin fitur antilink/antibadword/dst — biar
    // fallback lokal di bawah yang ambil alih dengan action yang benar.
    actions = actions.filter(a => a.action !== "link" || !FEATURE_TOGGLE_WORDS.test(task));
  }

  // fallback: LLM plan gagal → deteksi lokal; LLM jawab act tapi gak ada action valid → deteksi lokal juga
  if (!actions || !actions.length) {
    if (plan?.mode !== "research") {
      const local = detectActLocal(task);
      if (local.length && typeof act === "function") actions = local;
    }
  }

  // ── MODE TOOLS — serba bisa: command bot, gambar, vision, aktivitas, memory, buat fitur ──
  if (Array.isArray(plan?.tools) && plan.tools.length && execTools && Object.keys(execTools).length) {
    const tools = plan.tools
      .map(x => {
        const tool = String(x?.tool || "").toLowerCase().trim();
        return {
          tool,
          cmd: x?.cmd ? String(x.cmd).replace(/^[.\/#!]/, "").toLowerCase() : null,
          args: x?.args != null ? String(x.args) : null,
          prompt: x?.prompt != null ? String(x.prompt) : null,
          question: x?.question != null ? String(x.question) : null,
          query: x?.query != null ? String(x.query) : null,
          name: x?.name ? String(x.name).toLowerCase().replace(/[^a-z0-9.]/g, "").slice(0, 24) : null, // titik dipertahanin — "loginweb.html" (createfile/code nama file + ext)
          spec: x?.spec != null ? String(x.spec) : null,
          url: x?.url != null ? String(x.url).trim() : null,
          lang: x?.lang != null ? String(x.lang).toLowerCase().trim() : null,
          skill: x?.skill != null ? String(x.skill).toLowerCase().trim() : null,
          server: x?.server != null ? String(x.server).toLowerCase().trim() : null,
          mcpTool: x?.mcpTool ? String(x.mcpTool).trim() : (x?.mcp_tool ? String(x.mcp_tool).trim() : null),
          content: x?.content != null ? String(x.content) : null,
          // data = args RAW (objek/apa pun) — JANGAN di-String() (skill/mcp
          // butuh objek args utuh; String({}) = "[object Object]")
          data: x?.data !== undefined ? x.data : (x?.args !== undefined && typeof x.args === "object" ? x.args : null),
        };
      })
      .filter(x => TOOL_LIST.includes(x.tool) && execTools[x.tool])
      .slice(0, MAX_TOOLS);
    if (tools.length) {
      steps.push({ phase: "plan", mode: "tools", ok: true, tools: tools.map(x => x.tool) });
      const results = [];
      const evidences = [];
      for (const tl of tools) {
        phase("tool", tl.tool + (tl.prompt ? ": " + tl.prompt.slice(0, 40) : tl.cmd ? ": ." + tl.cmd : ""));
        let r = null;
        try { r = await execTools[tl.tool](tl, context || {}); } catch (e) { r = { ok: false, msg: `Gagal: ${e?.message || "error eksekusi"}` }; }
        const row = { tool: tl.tool, ok: !!r?.ok, msg: String(r?.msg || (r?.ok ? "Berhasil" : "Gagal")) };
        results.push(row);
        if (r?.evidence) evidences.push(String(r.evidence));
      }
      steps.push({ phase: "tools", ok: results.some(r => r.ok), jumlah: results.length });

      // evidence (vision/activity/memory) → compose jawaban natural; selebihnya laporan per tool
      let answer = "";
      let viaLocal = false;
      if (evidences.length) {
        phase("compose");
        try {
          answer = await aiChat(`Tugas user: ${task}${mem}${skl}\n\nBUKTI/HASIL TOOLS:\n${evidences.join("\n\n").slice(0, 24000)}`, { systemPrompt: SYS_ANSWER });
        } catch {}
        if (!answer || !String(answer).trim()) {
          viaLocal = true;
          answer = evidences.join("\n\n");
        }
      }
      const report = results.map(r => `${r.ok ? "✅" : "❌"} ${r.msg}`).join("\n");
      answer = (evidences.length ? String(answer).trim() : "") || report;
      if (evidences.length && report) answer += `\n\n${report}`;
      return { mode: "tools", answer: stripMarkdownTables(answer), results, evidences: evidences.length, steps, voice: !!plan.voice, viaLocal, queries: [], sources: [] };
    }
  }

  // ── MODE ACT — otomasi grup (request owner: "kick org cm dari nama, tutup grup dll") ──
  if (actions && actions.length && typeof act === "function") {
    steps.push({ phase: "plan", mode: "act", ok: true, actions });
    const results = [];
    for (const a of actions) {
      phase("act", a.action + (a.target ? ": " + a.target : ""));
      let r = null;
      try { r = await act(a, context || {}); } catch (e) { r = { ok: false, msg: `Gagal: ${e?.message || "error eksekusi"}` }; }
      results.push({ action: a.action, target: a.target || null, ok: !!r?.ok, msg: String(r?.msg || (r?.ok ? "Berhasil" : "Gagal")) });
    }
    const answer = results.map(r => `${r.ok ? "✅" : "❌"} ${r.msg}`).join("\n");
    steps.push({ phase: "act", ok: results.some(r => r.ok), aksi: results.length });
    return { mode: "act", answer: stripMarkdownTables(answer), results, steps, voice: !!plan?.voice, queries: [], sources: [] };
  }

  // ── MODE PERSONA — chat/bermain peran (request owner 11 Sep: "klo disuruh
  // profesi jd anak kecil atau pacar dia persona berubah sesuai yg diinginkan
  // user") — in-character, inget konteks, tanpa browsing.
  if (plan?.mode === "persona") {
    const persona = String(plan.persona || plan.role || "").trim();
    steps.push({ phase: "plan", mode: "persona", ok: true, persona: persona || null });
    phase("compose");
    const histBlock = Array.isArray(history) && history.length
      ? "\n\nRiwayat percakapan sebelumnya (jaga konsistensi konteks/peran):\n" + history.slice(-5).join("\n")
      : "";
    let answer = "";
    try {
      // 🔹 FIX 30 Sep (owner report: AI autoflow "kyk ngbaca index atau log,
      // bukan ngbaca yg ada di chat") — skl (PANDUAN SPESIALIS, isi dokumen
      // skill utuh ribuan baris) WAJIB GAK masuk ke jawaban PERSONA: kata
      // sepele kayak "index"/"log"/"error" di chat santai bikin skillsBlock
      // nyuntik dokumen spesialis gak nyambung, lalu model DAUR ULANG isi
      // dokumen itu alih-alih isi percakapan. Persona = jawab dari
      // kecerdasan + memori + riwayat chat. skl tetep kepakai di plan/tools/
      // research (memang konteks tugas).
      answer = await aiChat(`Tugas/pesan user: ${task}${histBlock}${mem}`, { systemPrompt: personaPrompt(persona) });
    } catch {}
    if (!answer || !String(answer).trim()) {
      return { error: "AI-nya lagi sibuk, coba lagi bentar ya 🙏" };
    }
    return { mode: "persona", persona: persona || null, answer: stripMarkdownTables(String(answer).trim()), sources: [], queries: [], steps, voice: !!plan.voice, viaLocal: false };
  }

  // ── MODE RESEARCH — browsing/riset web (alur 5 fase) ──
  const queries = (Array.isArray(plan?.queries) && plan.queries.length
    ? plan.queries.map(String).filter(q => q.trim())
    : [task]).slice(0, MAX_QUERIES);
  steps.push({ phase: "plan", mode: "research", ok: !!plan, queries });

  // ── FASE 2: SEARCH — kumpulkan pool hasil ──
  const pool = [];
  const seen = new Set();
  for (const q of queries) {
    phase("search", q);
    let r = null;
    try { r = await _search(q, { engine: "bing", limit: 8 }); } catch {}
    // lowRelevance = SERP sampah semua engine (guard relevansi websearch) →
    // jangan masukin ke pool — agent mending jawab dari pengetahuan model
    // + jujur "gak nemu di web" daripada baca halaman nyasar (bug 12 Sep)
    if (r?.items?.length && !r.lowRelevance) {
      for (const it of r.items) {
        const url = String(it?.url || "");
        if (!url || seen.has(url)) continue;
        seen.add(url);
        pool.push({
          title: String(it?.title || "").slice(0, 120),
          url,
          snippet: String(it?.snippet || "").slice(0, 200),
          domain: domainOf(url),
        });
      }
    }
  }
  // 🔹 FALLBACK: pool kosong (engine scrape sampah/down semua) → CHROMIUM
  // nyoba query pertama & kedua sebelum nyerah (owner 17 Sep report
  // "carikan berita makanan mbg beracun" dijawab gak tahu sama sekali).
  if (!pool.length) {
    for (const q of queries.slice(0, 2)) {
      phase("search", q + " (browser)");
      let items = null;
      try {
        items = await Promise.race([
          _browserSearchRun(q, 8),
          new Promise((resolve) => setTimeout(() => resolve(null), 30000)),
        ]);
      } catch {}
      for (const it of items || []) {
        const url = String(it?.url || "");
        if (!url || seen.has(url)) continue;
        seen.add(url);
        pool.push({
          title: String(it?.title || "").slice(0, 120),
          url,
          snippet: String(it?.snippet || "").slice(0, 200),
          domain: domainOf(url),
        });
      }
      if (pool.length >= 6) break;
    }
  }
  steps.push({ phase: "search", ok: pool.length > 0, hasil: pool.length });
  if (!pool.length) {
    // 🔹 UPGRADE 30 Sep (owner: "biar gak kaku — pakai kecerdasan dia dulu,
    // jangan nyerah") — pool kosong SETELAH chromium fallback ≠ error mentah:
    // agent jawab dari pengetahuan internal model + catatan jujur. Research
    // boleh gagal, jawaban tetep ada.
    phase("compose");
    let kbAnswer = "";
    try {
      kbAnswer = await aiChat(`Tugas user: ${task}${mem}${skl}\n\nPENCARIAN WEB GAGAL SEMUA (semua mesin search + chromium tidak menemukan hasil). Jawab tugas ini dari PENGETAHUANMU SENDIRI sebaik mungkin. Di akhir jawaban WAJIB tambahkan SATU kalimat catatan jujur bahwa info ini berasal dari pengetahuan internal (bukan hasil pencarian web terkini) jadi kemungkinan tidak paling baru. JANGAN bilang tidak bisa/tidak tahu mentah-mentah.`, { systemPrompt: SYS_ANSWER });
    } catch {}
    kbAnswer = String(kbAnswer || "").trim();
    steps.push({ phase: "compose", ok: !!kbAnswer, viaKnowledge: true, halaman: 0 });
    if (!kbAnswer) {
      return { error: "hasil pencarian kosong — semua mesin search sibuk, coba lagi bentar" };
    }
    return {
      mode: "research",
      answer: stripMarkdownTables(kbAnswer),
      queries,
      sources: [],
      steps,
      voice: !!plan?.voice,
      viaKnowledge: true,
    };
  }

  // ── FASE 3: PICK — AI milih halaman paling relevan ──
  phase("pick");
  const offer = pool.slice(0, POOL_OFFER);
  const listText = offer.map((p, i) => `${i + 1}. [${p.domain}] ${p.title} — ${p.snippet.slice(0, 120)}`).join("\n");
  let pick = null;
  try {
    pick = parseJsonLocal(await aiChat(`Tugas user: ${task}\n\nKandidat halaman:\n${listText}`, { systemPrompt: SYS_PICK }));
  } catch {}
  let idxs = Array.isArray(pick?.picks) && pick.picks.length
    ? pick.picks.map(n => parseInt(n, 10) - 1).filter(i => Number.isInteger(i) && i >= 0 && i < offer.length)
    // 🔹 FIX 25 Sep (bug tersembunyi, ketemu pas e2e memory layer): fallback
    // [0,1,2] WAJIB di-clamp ke jumlah kandidat — pool 1-2 item bikin
    // offer[1].domain TypeError & agent mati di fase pick
    : [0, 1, 2].filter(i => i < offer.length);
  if (!idxs.length) idxs = [0];
  idxs = [...new Set(idxs)].slice(0, MAX_PICKS);
  steps.push({ phase: "pick", ok: !!pick, pilihan: idxs.map(i => offer[i].domain) });

  // ── FASE 4: READ — buka halaman terpilih ──
  const reads = [];
  for (const i of idxs) {
    const p = offer[i];
    phase("read", p.domain);
    let pv = null;
    try { pv = await _preview(p.url); } catch {}
    // 🔹 UPGRADE 30 Sep: halaman ngeblok fetch biasa / butuh JS → BUKA
    // BENERAN via chromium (browserPageFacts) — jangan nyerah cuma gara2
    // axios diblokir halamannya (pola fallback _browserSearchRun)
    if (!pv?.text) {
      try {
        const facts = await Promise.race([
          _browserFactsRun(p.url),
          new Promise((resolve) => setTimeout(() => resolve(null), 20000)),
        ]);
        if (facts?.text) pv = { title: facts.title, description: facts.description, text: facts.text };
      } catch {}
    }
    if (pv?.text) {
      reads.push({ ...p, text: String(pv.text).slice(0, PAGE_TEXT_CAP) });
    }
  }
  steps.push({ phase: "read", ok: reads.length > 0, halaman: reads.length });

  // ── FASE 5: COMPOSE — AI susun jawaban dari bukti ──
  phase("compose");
  // bukti: isi halaman yang kebaca; gak ada → snippet pool (bukti tipis tapi tetep dipakai)
  const evidence = (reads.length
    ? reads.map((p, n) => `[S${n + 1} | ${p.domain} | ${p.title}]\n${p.text}`).join("\n\n")
    : offer.map((p, n) => `[S${n + 1} | ${p.domain} | ${p.title}]\n${p.snippet}`).join("\n\n")).slice(0, 24000);
  const sources = (reads.length ? reads : offer.slice(0, MAX_PICKS)).map((p, n) => ({
    tag: `S${n + 1}`, domain: p.domain, url: p.url, title: p.title,
  }));

  let answer = "";
  let viaLocal = false;
  try {
    answer = await aiChat(`Tugas user: ${task}${mem}${skl}\n\nBUKTI:\n${evidence}`, { systemPrompt: SYS_ANSWER });
  } catch {}
  if (!answer || !String(answer).trim()) {
    // fallback terakhir: digest lokal dari bukti (tetep informatif + sumber)
    viaLocal = true;
    answer = buildLocalDigest(task, reads.length ? reads : offer.slice(0, MAX_PICKS));
  }
  steps.push({ phase: "compose", ok: !viaLocal, viaLocal });

  return { mode: "research", answer: stripMarkdownTables(String(answer).trim()), queries, sources, steps, voice: !!plan?.voice, viaLocal };
}

// ═══════════════════════════════════════════════════════════════
// BUAT FITUR BARU — codegen plugin + pasang (request owner:
// "buat fitur, pasang fitur"). Dipanggil tool `create` (owner only).
// LLM nulis isi handler → dibungkus template plugin → node --check →
// disimpan ke plugins/custom/<name>.js (auto ke-scan loader sebagai
// kategori custom). Retry 1x kalau kode ditolak/syntax error.
// ═══════════════════════════════════════════════════════════════

const SYS_CODEGEN = `Kamu generator plugin bot WhatsApp (Node ESM). User mau fitur baru bernama command .{{NAME}}.
Balas HANYA isi fungsi handler (JavaScript murni, TANPA import/export/pluginConfig/markdown fence/komentar pembuka):
- isi body fungsi: async function handler(m, { sock }) { ... } — TULIS CUMA ISI DALAM KURUNG KURAWAL, tanpa "async function handler" dan tanpa kurung kurawal luar.
- m = pesan user: m.args (array kata setelah command), m.reply(teks), m.react("emoji"), m.prefix, m.pushName (nama user), m.chat (jid), m.sender (jid), m.isGroup, m.text.
- sock = koneksi WhatsApp: sock.sendMessage(jid, { text / image: {url} / audio: buffer ... }, { quoted: m }).
- DILARANG: fs, child_process, require, process.exit, eval, fetch ke API eksternal, operasi file/jaringan. Fitur harus self-contained (logika lokal: generator acak, kalkulasi, format pesan, interaksi user, menyimpan ke m.reply saja).
- Bahasa Indonesia untuk semua teks ke user. Pakai template literal/emoji sesuai tema.
- Awali dengan validasi input: if (!m.args.length) return m.reply("cara pakai ...").
Spesifikasi fitur user: "{{SPEC}}"`;

const CODE_BLOCKLIST = /child_process|require\(|process\.exit|eval\(|fs\.(write|unlink|rm|read)|\.writeFile|node-fetch|axios|import\s|export\s|__dirname/gi;

function wrapPluginCode(name, desc, body) {
  const d = new Date().toISOString().slice(0, 10);
  return `// RARA AI - MULTI DEVICE — plugin dibuat otomatis oleh AI Agent (.agent create)
// Fitur: ${desc} | dibuat ${d}
// Template agent — self-contained, murni logika lokal, tanpa akses sistem.
import { raraWrap } from "../../src/lib/rara-menu-style.js";

const pluginConfig = {
  name: "${name}",
  alias: ["${name}"],
  category: "custom",
  description: ${JSON.stringify(desc.slice(0, 120))},
  usage: ".${name} <input>",
  example: ".${name}",
  isOwner: false, isPremium: false, isGroup: false, isPrivate: false,
  cooldown: 5, energi: 1, isEnabled: true,
};

async function handler(m, { sock }) {
${body}
}

export { pluginConfig as config, handler };
`;
}

/**
 * generatePlugin — bikin file plugin baru hasil codegen AI.
 * @param {{name:string, spec:string, targetDir?:string}} param
 * @returns {Promise<{path:string, code:string, attempts:number}>} throw kalau gagal 2x
 */
export async function generatePlugin({ name, spec, targetDir } = {}) {
  const nm = String(name || "").toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 20);
  if (nm.length < 3) throw new Error("nama fitur minimal 3 huruf/angka");
  const sp = String(spec || "").trim();
  if (!sp) throw new Error("spesifikasi fitur kosong");
  const dir = targetDir || path.join(REPO_ROOT, "plugins", "custom");
  fs.mkdirSync(dir, { recursive: true });
  const filePath = path.join(dir, `${nm}.js`);
  if (fs.existsSync(filePath)) throw new Error(`fitur .${nm} udah ada — hapus dulu atau pilih nama lain`);

  let lastErr = "";
  for (let attempt = 1; attempt <= 2; attempt++) {
    let body = "";
    try {
      const raw = await _aiChat(
        SYS_CODEGEN.replace(/\{\{NAME\}\}/g, nm).replace(/\{\{SPEC\}\}/g, sp.slice(0, 1000)),
        { systemPrompt: "Kamu code generator. Balas HANYA kode, tanpa penjelasan." },
      );
      body = String(raw || "")
        .replace(/```[a-z]*|```/gi, "")
        .replace(/^[\s\S]*?(?=\n|\S)/, (s) => s) // keep as-is
        .trim();
      // buang pembuka/penutup function kalau LLM tetap nulis
      body = body
        .replace(/^\s*(async\s+)?function\s+handler\s*\([^)]*\)\s*\{?/i, "")
        .replace(/\}\s*$/, "")
        .trim();
    } catch (e) {
      lastErr = `AI codegen gagal: ${e?.message || e}`;
      continue;
    }
    // blocklist keamanan — fitur hasil codegen gak boleh sentuh sistem
    if (CODE_BLOCKLIST.test(body)) {
      lastErr = "kode ngandung operasi terlarang (fs/jaringan/child_process)";
      continue;
    }
    const code = wrapPluginCode(nm, sp, body);
    try {
      // syntax check dulu SEBELUM nulis — file sementara di dir target
      const tmp = path.join(dir, `._chk_${nm}_${Date.now()}.js`);
      fs.writeFileSync(tmp, code);
      try {
        execFileSync("node", ["--check", tmp], { timeout: 15000 });
      } finally {
        try { fs.unlinkSync(tmp); } catch {}
      }
      fs.writeFileSync(filePath, code);
      return { path: filePath, code, attempts: attempt };
    } catch (e) {
      lastErr = `syntax error: ${String(e?.stderr || e?.message || e).slice(0, 200)}`;
    }
  }
  throw new Error(`gagal bikin fitur .${nm} — ${lastErr}`);
}

// digest lokal — dipakai kalau AI compose down: susun ringkasan bukti sendiri
function buildLocalDigest(task, pages) {
  const lines = [`📌 Hasil riset buat: ${task}`, ""];
  for (const p of pages.slice(0, MAX_PICKS)) {
    lines.push(`• ${p.title || p.domain} (${p.domain})`);
    if (p.text) lines.push(`  ${String(p.text).replace(/\s+/g, " ").slice(0, 400)}...`);
    else if (p.snippet) lines.push(`  ${p.snippet}`);
    lines.push(`  🔗 ${p.url}`);
    lines.push("");
  }
  lines.push("_Disusun otomatis dari isi halaman — mode digest (AI penyusun lagi sibuk)._");
  return lines.join("\n");
}
