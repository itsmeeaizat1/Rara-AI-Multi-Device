// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
// ============================================================
// 🔹 AI SATUAN RICH (rara-ai-satuan-rich.js) — request owner 21 Sep
//   2026: "aku mau smua ai satuan dibot ini support vision dan browsing".
// 🔹 SATU PINTU: SEMUA plugin AI satuan (kategori ai yang prompt-nya teks —
//   .gita .gpt4o .bard dll, 200-an file) gak perlu diedit satu-satu.
//   Dipanggil dari src/handler.js SEBELUM plugin.handler jalan:
//   1. VISION  — user reply/attach FOTO + perintah AI satuan → foto
//      di-scan visionScan (rantai vision sama kayak .vision/.raraagent)
//      → deskripsi gambar DI-INJECT ke prompt plugin. Satuan yang
//      endpoint-nya text-only jadi "melihat" foto lewat deskripsi.
//   2. BROWSING — flag --search/--cari/--web/--browse/--browsing di prompt
//      → hasil pencarian web (rara-websearch, engine chain sama kayak
//      .raraagent browsing) di-inject sebagai pengetahuan terkini.
//      Mode AUTO (default on) nyala kalau pertanyaan mengandung kata
//      info-terkini (berita/terbaru/hari ini/jadwal/skor/kurs) — matikan
//      lewat .ai-set browsing off.
//   3. CONTEXT REPLY/HISTORI (owner 21 Sep: "bsa baca chat histori jejak
//      misal aku reply pesan user di waktu sebelumnya") — reply pesan lama
//      APAPUN isiannya dibaca: teks pesan → di-inject; foto → vision;
//      sticker → vision; video/audio/dokumen → jenis + caption/nama file;
//      + kalau pertanyaan nyebut "tadi/sebelumnya/riwayat/histori" →
//      jejak beberapa pesan terakhir di chat (sock.store Baileys,
//      in-memory sejak boot) ikut di-inject.
// 🔹 Plugin yang UDAH ngurus media sendiri (nunjuk m.quoted / visionScan /
//   m.download di kodenya — kebaca otomatis loader rara-plugins.js via
//   config._usesQuotedMedia) DIKECUALIKAN — gak dobel proses foto.
//   Plugin owner-only juga dikecualikan (panel/setelan, bukan chat).
// 🔹 Semua kegagalan SENYAP — AI satuan jalan seperti biasa; enrich cuma
//   nambah kalau berhasil.
// ============================================================
import { visionScan } from "./rara-vision-chain.js";
import { searchWeb } from "./rara-websearch.js";
import { getDatabase } from "./rara-database.js";
import { renderChatHistory } from "./rara-chat-log.js";

// ── seams buat e2e offline ──
const __rich = {};
export function _setRichVisionForTest(fn) { __rich.vision = fn; }
export function _setRichSearchForTest(fn) { __rich.search = fn; }
export function _resetRichForTest() { delete __rich.vision; delete __rich.search; }

const SEARCH_FLAGS = ["--browsing", "--browse", "--search", "--cari", "--web"];
// trigger jejak histori chat — cuma kalau user eksplisit nyebut waktu/riwayat,
// biar prompt satuan gak setiap saat dibebani konteks chat
const HISTORY_RE = /(tadi|sebelumnya|sebelum ini|riwayat|histori|kemarin)/i;
const CAP_QUOTED_TEXT = 700;  // isi pesan yang di-reply maks 700 char
const CAP_HISTORY = 900;      // jejak pesan terakhir maks 900 char
const HISTORY_LIMIT = 8;      // maks 8 pesan terakhir
// AUTO-browse cuma buat info yang jelas butuh data terkini — kata umum
// kayak "sekarang/hasil" SENGAJA gak ikut biar gak false-positive ngerusak
// prompt fitur satuan (mis. .math)
const AUTO_BROWSE_RE = /(berita\b|terbaru|hari ini|jadwal|skor|kurs\b|breaking|peringkat terbaru|harga \w+|update terbaru|hari ke-\d+)/i;

const CAP_DESC = 500;    // deskripsi foto maks 500 char (GET URL satuan gak kepanjangan)
const CAP_SEARCH = 1000; // konteks web maks 1000 char
const CAP_TOTAL = 2600;  // total prompt maks — jaga URL param satuan

function cap(s, n) {
  const t = String(s || "").replace(/\s+/g, " ").trim();
  return t.length > n ? t.slice(0, n - 1) + "…" : t;
}

function browseAutoEnabled() {
  try {
    const db = getDatabase();
    return db.setting?.("aiSatuanBrowse") !== false; // default ON
  } catch {
    return true;
  }
}

function isExcluded(cfg) {
  if (!cfg) return true;
  if (cfg.category !== "ai") return true;        // cuma AI satuan
  if (cfg._usesQuotedMedia) return true;        // udah ngurus media sendiri
  if (cfg.isOwner) return true;                 // panel/setelan, bukan chat
  return false;
}

// ── label jenis pesan yang di-reply (bukan teks/foto/sticker) ──
function quotedKindLabel(q) {
  if (q.isVideo) return "video";
  if (q.isAudio) return "pesan suara (voice note/audio)";
  if (q.isDocument) return "dokumen";
  if (q.isViewOnce) return "media sekali-lihat";
  return "media";
}

// ── jejak pesan terakhir di chat — PERSISTEN duluan (rara-chat-log,
//    tetap ada walau bot restart — konfirmasi owner 21 Sep), kalau kosong
//    (mis. histori dihapus) fallback ke store Baileys in-memory sejak boot ──
function buildHistoryBlock(sock, m) {
  try {
    const persist = renderChatHistory(m.chat, HISTORY_LIMIT, CAP_HISTORY);
    if (persist) return persist;
  } catch { /* db gak siap → lanjut fallback */ }
  try {
    const msgs = sock?.store?.messages?.get?.(m.chat);
    if (!msgs) return "";
    const list = typeof msgs.values === "function" ? [...msgs.values()] : Object.values(msgs);
    if (!Array.isArray(list) || !list.length) return "";
    const rows = [];
    for (let i = list.length - 1; i >= 0 && rows.length < HISTORY_LIMIT; i--) {
      const wm = list[i];
      // baca isi teks/caption mentah WA — cukup buat jejak singkat
      const mm = wm?.message || {};
      const type = Object.keys(mm)[0];
      if (!type) continue;
      const body =
        mm.conversation || mm?.extendedTextMessage?.text ||
        mm?.imageMessage?.caption || mm?.videoMessage?.caption ||
        (type === "stickerMessage" ? "(sticker)" : "") || "";
      if (!body) continue;
      const who = (wm.key?.participant || wm.key?.remoteJid || "").split("@")[0];
      rows.push((who ? who + ": " : "") + cap(body, 120));
    }
    if (!rows.length) return "";
    // urut lama → baru (paling bawah = paling baru)
    return "(Jejak pesan terakhir di chat ini, urut lama ke baru:\n" + cap(rows.reverse().join("\n"), CAP_HISTORY) + ")";
  } catch {
    return "";
  }
}

/**
 * Enrich prompt AI satuan (vision + browsing + konteks reply/histori).
 * Mutasi m.args/m.text jadi prompt yang udah diberi konteks. Return info
 * atau null kalau gak ada yang berubah. SEMUA error ditelan — jangan
 * pernah ngerusak fitur asli.
 */
export async function enrichAiSatuan(m, plugin, opts = {}) {
  try {
    const cfg = plugin?.config || plugin;
    if (isExcluded(cfg)) return null;

    const args = Array.isArray(m.args) ? m.args : [];
    let raw = args.join(" ").trim() || String(m.text || "").trim();
    if (!raw) return null;

    const parts = [];
    let usedVision = false;
    let usedSearch = false;

    // ── 1. KONTEKS REPLY (owner 21 Sep: "baca chat histori jejak misal aku
    //    reply pesan user di waktu sebelumnya") — reply pesan lama APA PUN
    //    isiannya dibaca: foto → vision, sticker → vision, teks → di-inject,
    //    media lain → jenis + caption.
    if (m.quoted) {
      const q = m.quoted;
      // caption pesan media (imageMessage/videoMessage/documentMessage → caption)
      const capBody = cap(String(q.body || ""), CAP_QUOTED_TEXT);

      if (q.isImage || q.isSticker) {
        try {
          const buf = await q.download();
          if (buf && buf.length) {
            m.react("🧠").catch(() => {});
            const vision = __rich.vision || visionScan;
            const v = await vision({
              imageBuffer: buf,
              question:
                "Deskripsikan gambar ini secara lengkap dan padat dalam bahasa Indonesia (maksimal 400 karakter): objek, orang/teks yang terbaca, suasana, dan detail penting untuk menjawab pertanyaan tentang gambar ini.",
              sessionKey: "satuan-rich:" + (m.sender || "anon"),
            });
            if (v?.status && v?.text) {
              parts.push(
                "(User mereply " + (q.isSticker ? "sebuah sticker" : "sebuah foto") +
                (capBody ? " dengan caption: \"" + capBody + "\"." : ".") +
                " Deskripsi isinya: " + cap(v.text, CAP_DESC) + ")"
              );
              usedVision = true;
            }
          }
        } catch { /* media gak kebaca → biarkan satuan jalan normal */ }
      } else if (capBody) {
        // pesan teks lama → isi pesannya di-inject, satuan bisa "baca" balik
        parts.push(
          "(User mereply pesan sebelumnya di chat ini yang isinya: \"" + capBody + "\". Pertanyaan user mengacu ke pesan itu.)"
        );
      } else if (q.isMedia || q.isViewOnce) {
        // media non-foto yang gak bisa dibaca isinya → jenisnya tetap dikasih tau
        parts.push(
          "(User mereply " + quotedKindLabel(q) + (capBody ? " dengan caption: \"" + capBody + "\"." : " tanpa caption.") +
          " — jelaskan sebisanya dari jenis medianya dan caption-nya.)"
        );
      }
    }

    // ── 2. BROWSING: flag eksplisit ATAU auto-keyword (bisa dimatikan) ──
    let wantSearch = false;
    let stripped = raw;
    for (const f of SEARCH_FLAGS) {
      if (stripped.includes(f)) {
        wantSearch = true;
        stripped = stripped.split(f).join(" ");
      }
    }
    if (wantSearch) stripped = stripped.replace(/\s+/g, " ").trim();
    if (!wantSearch && browseAutoEnabled() && AUTO_BROWSE_RE.test(stripped)) {
      wantSearch = true;
    }

    if (wantSearch && stripped) {
      try {
        m.react("🔍").catch(() => {});
        const search = __rich.search || searchWeb;
        const s = await search(stripped, { limit: 4 });
        const items = (s?.items || []).slice(0, 4).filter((it) => it?.title || it?.snippet);
        if (items.length) {
          const ctx = items
            .map((it, i) => `${i + 1}. ${cap(it.title || "", 90)} — ${cap(it.snippet || "", 180)}`)
            .join("\n");
          parts.push(
            "(Hasil pencarian web untuk pertanyaan user di bawah — pakai sebagai pengetahuan terkini:\n" +
              cap(ctx, CAP_SEARCH) + ")"
          );
          usedSearch = true;
        }
      } catch { /* search sibuk → satuan jalan tanpa konteks */ }
    }

    // ── 3. JEJAK HISTORI CHAT — cuma kalau pertanyaan eksplisit nyebut
    //    waktu/riwayat (tadi/sebelumnya/riwayat/histori/kemarin) →
    //    beberapa pesan terakhir di chat ikut jadi konteks.
    if (HISTORY_RE.test(stripped)) {
      const hist = buildHistoryBlock(opts.sock, m);
      if (hist) parts.push(hist);
    }

    if (!parts.length) return null;

    const enriched = cap(parts.join("\n\n") + "\n\n" + stripped, CAP_TOTAL);
    m.args = enriched.split(/\s+/).filter(Boolean);
    m.text = enriched;
    return { vision: usedVision, search: usedSearch };
  } catch {
    return null; // jangan pernah ngerusak jalur fitur asli
  }
}

export { SEARCH_FLAGS, AUTO_BROWSE_RE, HISTORY_RE, isExcluded };
