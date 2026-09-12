// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// src/lib/nova-codegen.js — generator kode LENGKAP buat agent (.aisuperagent
// tool code/createfile + .novaagent createfile).
// Request owner 12 Sep 2026: "knp agent klo disuruh buat kode (login web
// topup dll) isi kodenya gak lengkap cm singkat" — AKAR: kode digenerate
// SATU SHOT ke model rantai (qwen kecil) yang gampang motong/nyingkat, lalu
// dikirim apa adanya tanpa cek kelengkapan. FIX: (1) prompt generator khusus
// dengan quality bar eksplisit, (2) deteksi kode terpotong
// (looksIncomplete: placeholder elipsis, tag html gak ketutup, bracket gak
// balance, TODO), (3) LOOP AUTO-LANJUT — minta model lanjutin PERSIS dari
// baris terakhir sampai komplet (maks ronde), (4) dedup overlap antar-ronde.

// ekstensi yang dianggap KODE (bakal dicek kelengkapannya)
export const CODE_EXTS = new Set([
  "html", "htm", "css", "js", "ts", "jsx", "tsx", "vue",
  "py", "php", "java", "kt", "c", "cpp", "cs", "go", "rs",
  "sql", "sh", "dart", "swift", "lua", "r", "json", "xml",
]);

const BRACED_EXTS = new Set(["css", "js", "ts", "jsx", "tsx", "vue", "py", "php", "java", "kt", "c", "cpp", "cs", "go", "rs", "sql", "sh", "dart", "swift", "lua", "r", "json"]);

// penanda kasar bahwa kode kepotong / disingkat
const PLACEHOLDER_RE = /(\.\s*\.\s*\.)|(…)|(\bTODO\b)|(\/\/\s*(todo|sisanya|sisa kode|lanjutkan|dst))|(<!--\s*(todo|sisanya|sisa))|(rest of (the )?code)|(kode lengkap\s*\.\.\.)|(\bplaceholder\b)/i;

function balanced(src, open, close) {
  let n = 0;
  for (const ch of src) {
    if (ch === open) n++;
    else if (ch === close) n--;
  }
  return n;
}

/**
 * Deteksi kode terpotong / gak lengkap.
 * @param {string} content — isi kode
 * @param {string} ext — ekstensi file (html/js/py/dll)
 * @returns {boolean} true = kelihatannya belum lengkap
 */
export function looksIncomplete(content, ext = "txt") {
  const t = String(content || "").trim();
  if (!t) return true;
  const lines = t.split("\n");

  // placeholder "..." / TODO / "rest of code" → pasti gak lengkap
  if (PLACEHOLDER_RE.test(t)) return true;

  // baris terakhir nyaris kosong setelah koma/operator terbuka
  const lastLine = (lines.at(-1) || "").trim();
  if (/[{(\[,:+&|]$/.test(lastLine)) return true;

  if (ext === "html" || ext === "htm" || ext === "vue") {
    // html wajib ketutup kalau kebuka
    if (/<html[\s>]/i.test(t) && !/<\/html\s*>/i.test(t)) return true;
    if (/<head[\s>]/i.test(t) && !/<\/head\s*>/i.test(t)) return true;
    if (/<body[\s>]/i.test(t) && !/<\/body\s*>/i.test(t)) return true;
    if (/<script[\s>]/i.test(t) && !/<\/script\s*>/i.test(t)) return true;
    if (/<style[\s>]/i.test(t) && !/<\/style\s*>/i.test(t)) return true;
    return false;
  }

  if (ext === "json") {
    try { JSON.parse(t); return false; } catch { return true; }
  }

  if (BRACED_EXTS.has(ext)) {
    // bracket gak balance = kepotong di tengah blok
    if (balanced(t, "{", "}") !== 0) return true;
    if (balanced(t, "[", "]") !== 0) return true;
    if (balanced(t, "(", ")") !== 0) return true;
    // python pakai indentasi — blok try/def/if/class kebuka gak ditutup:
    // deteksi kasar: baris terakhir indent dalam tanpa pass/return/comment
    if (ext === "py" && /^(\s{4,}\S)/.test(lastLine) && !/(pass|return|raise|#|""")\s*$/.test(lastLine) && lines.length > 4) {
      // gak meyakinkan sendirian — cuma dicurigai kalau juga gak ada baris dedent setelahnya
      const tail = lines.slice(-4).join("\n");
      if (/^\s{4,}\S/m.test(tail) && !/^(\S|\s{0,2}\S)/m.test(tail.split("\n").slice(0, -1).join("\n"))) return true;
    }
    return false;
  }

  return false;
}

// ── prompt generator kualitas tinggi ──
const SYS_CODEGEN_FULL = `Kamu SENIOR FULL-STACK ENGINEER yang jago bikin aplikasi jadi. User minta kode — hasil WAJIB seperti ini:

STANDAR KELULUSAN (gak lolos = ditulis ulang):
- Kode = SATU FILE utuh SIAP JALAN LANGSUNG TANPA EDIT APAPUN.
- Kalau HTML/web: SATU file berisi <!DOCTYPE html> … </html> LENGKAP: <head> dengan meta viewport + title + <style> penuh (layout modern rapi, warna, hover, responsive, terlihat seperti web ASLI yang sudah jadi — bukan draft), <body> berisi SEMUA bagian yang diminta (misal web login topup: header/brand, form login lengkap, metode topup, tombol berfungsi, footer — semua section jadi, bukan cuma kerangka), dan <script> dengan interaksi nyata (validasi input, event klik, pindah section, demo data).
- Halaman web/aplikasi → MINIMAL 150 BARIS. Kode program biasa → semua fungsi TERIMPLEMENTASI PENUH dari import sampai akhir.
- HARAM: "..." atau "…" atau "dst", placeholder, TODO, "// sisanya", cuma kerangka, cuma komentar rencana, lorem minimalis.
- Panjang itu BAGUS — makin lengkap makin bagus, JANGAN disingkat.

FORMAT JAWABAN:
1. SATU kalimat singkat menjelaskan yang kamu bikin.
2. SATU blok kode lengkap di antara triple backtick.
3. "CARA PAKAI:" 2-4 kalimat.`;

const SYS_CODEGEN_CONT = `Kamu melanjutkan kode yang TERPOTONG di tengah. Kamu akan dikasih bagian AKHIR kode yang sudah ada.

ATURAN LANJUTAN (WAJIB):
- LANJUTKAN PERSIS dari karakter/baris terakhir yang dikasih — seolah kamu nulis setengah kalimat lalu lanjut.
- JANGAN ulang bagian awal, JANGAN ulang penjelasan, JANGAN bungkus backtick, JANGAN kasih kalimat pembuka.
- Output HANYA LANJUTAN KODENYA SAJA sampai file BENAR-BENAR SELESAI (html harus sampai </html>, program harus semua fungsi + blok ketutup).
- HARAM "..." / placeholder / TODO.`;

// buang backtick pembungkus kalau model gak nurut
function stripFences(raw) {
  const t = String(raw || "").trim();
  const m = t.match(/```[a-zA-Z0-9+#]*\n([\s\S]*?)```/);
  return (m ? m[1] : t).trim();
}

// buang overlap: kalau lanjutan ngulang baris terakhir kode yang ada
function overlapTrim(cur, cont) {
  let c = String(cont || "").trim();
  if (!c) return "";
  const curLines = cur.split("\n");
  // coba beberapa baris terakhir — cari prefix cont yang sama dengan suffix cur
  for (let k = Math.min(12, curLines.length); k > 0; k--) {
    const suffix = curLines.slice(-k).join("\n");
    if (suffix.trim() && c.startsWith(suffix)) {
      c = c.slice(suffix.length);
      break;
    }
  }
  return c.trim();
}

/**
 * Generate kode LENGKAP — round 1 prompt khusus + loop auto-lanjut kalau
 * kode kepotong (request owner 12 Sep: kode agent harus serba bisa).
 * @param {object} p — { spec, ext, lang, aiChat, onStatus, maxRounds (default 3) }
 * @returns {Promise<{ code: string, explain: string, rounds: number, complete: boolean }>}
 */
export async function generateCompleteCode({ spec, ext = "txt", lang = "", aiChat, onStatus = null, maxRounds = 3 } = {}) {
  if (typeof aiChat !== "function") throw new Error("aiChat wajib diisi (fungsi chat AI)");
  const s = String(spec || "").trim();
  if (!s) throw new Error("spec kosong — jelasin mau bikin kode apa");

  const EXT = { html: "html", htm: "html", css: "css", javascript: "js", js: "js", typescript: "ts", ts: "ts", node: "js", nodejs: "js", python: "py", py: "py", php: "php", java: "java", kotlin: "kt", c: "c", cpp: "cpp", cplusplus: "cpp", csharp: "cs", go: "go", golang: "go", rust: "rs", sql: "sql", bash: "sh", shell: "sh", dart: "dart", swift: "swift", lua: "lua", r: "r" };
  const extFinal = EXT[String(lang || "").toLowerCase().trim()] || String(ext || "").toLowerCase().replace(/[^a-z0-9]/g, "") || "txt";

  // ronde 1 — generator full
  onStatus?.("menyusun kode lengkap");
  const raw1 = String(await aiChat(
    `Permintaan user: ${s}\n\nBahasa/ekstensi: ${lang || extFinal}\n\nBikin KODE LENGKAP siap jalan sesuai permintaan di atas.`,
    { systemPrompt: SYS_CODEGEN_FULL }
  )).trim();
  if (!raw1) throw new Error("AI balas kosong — coba lagi");

  // pisah penjelasan vs kode
  const block = raw1.match(/```[a-zA-Z0-9+#]*\n([\s\S]*?)```/);
  let code = stripFences(raw1);
  let explain = (block ? raw1.replace(/```[\s\S]*?```/g, "") : raw1.replace(/^```[\s\S]*/, "")).trim().slice(0, 600);
  if (!explain) explain = `Kode ${extFinal} untuk: ${s.slice(0, 80)}`;

  // loop auto-lanjut sampai kode keanggap lengkap
  let rounds = 0;
  while (rounds < maxRounds && looksIncomplete(code, extFinal)) {
    rounds++;
    onStatus?.(`melengkapi kode (ronde ${rounds})`);
    let cont = "";
    try {
      cont = String(await aiChat(
        `Kode berikut TERPOTONG. Bagian AKHIR kode yang sudah ada:\n\n${code.slice(-2500)}\n\nLanjutkan PERSIS dari titik terakhir sampai kode SELESAI LENGKAP.`,
        { systemPrompt: SYS_CODEGEN_CONT }
      )).trim();
    } catch { break; }
    const add = overlapTrim(code, stripFences(cont));
    if (!add) break; // model ngasih apa adanya / ulang doang → stop
    code = (code + "\n" + add).trim();
  }

  const complete = !looksIncomplete(code, extFinal);
  return { code, explain, rounds, complete, ext: extFinal };
}
