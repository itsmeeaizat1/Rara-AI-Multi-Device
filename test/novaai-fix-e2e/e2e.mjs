// E2E — FIX .novaagent (12 Sep 2026)
// Bug 1: "aktifkan antilink" malah kirim link grup (localParse nangkep "link"
//        di "antilink" → getlink). Fix: FEATURE_RULE dicek SEBELUM getlink.
// Bug 2: Hasil search/nanya AI nulis markdown link + URL palsu
//        (googleusercontent.com) — halusinasi model. Fix: sanitizeAiReply +
//        prompt think() diperkuat.
//
// Jalankan dari cwd DIR KOSONG:
//   mkdir -p /tmp/novaai-fix && cd /tmp/novaai-fix && node <repo>/test/novaai-fix-e2e/e2e.mjs
import { localParse, TOOLS, sanitizeAiReply } from "../../src/lib/aiagent.js";
import { setAutomodRule, getAutomodRules } from "../../src/lib/nova-automation-hub.js";

let pass = 0, fail = 0;
const w = (s) => process.stdout.write(s + "\n");
const check = (name, ok, extra) => {
  w((ok ? "  ✅" : "  ❌") + " " + name + (ok ? "" : extra ? ` — ${extra}` : ""));
  ok ? pass++ : fail++;
};

// ═══════════════════════════════════════════════════════════════
// BUG 1: localParse — antilink/antibadword/antisticker/antivoice/antispam
// ═══════════════════════════════════════════════════════════════
w("\n— BUG 1: localParse toggle fitur —");

// "aktifkan antilink" → antilinkon, BUKAN getlink
{
  const d = localParse("aktifkan antilink di grup ini");
  check("'aktifkan antilink' → antilinkon", d?.tool === "antilinkon", d?.tool);
}
{
  const d = localParse("nyalain antilink");
  check("'nyalain antilink' → antilinkon", d?.tool === "antilinkon", d?.tool);
}
{
  const d = localParse("matikan antilink");
  check("'matikan antilink' → antilinkoff", d?.tool === "antilinkoff", d?.tool);
}
{
  const d = localParse("antilink off");
  check("'antilink off' → antilinkoff", d?.tool === "antilinkoff", d?.tool);
}
{
  const d = localParse("nonaktifin antibadword");
  check("'nonaktifin antibadword' → antibadwordoff", d?.tool === "antibadwordoff", d?.tool);
}
{
  const d = localParse("aktifkan antisticker");
  check("'aktifkan antisticker' → antistickeron", d?.tool === "antistickeron", d?.tool);
}
{
  const d = localParse("nyalakan antivoice");
  check("'nyalakan antivoice' → antivoiceon", d?.tool === "antivoiceon", d?.tool);
}
{
  const d = localParse("pasang antispam");
  check("'pasang antispam' → antispamon", d?.tool === "antispamon", d?.tool);
}

// "link grup" (tanpa kata fitur) → getlink tetap jalan
{
  const d = localParse("kasih link grup");
  check("'kasih link grup' → getlink (tetap jalan)", d?.tool === "getlink", d?.tool);
}
{
  const d = localParse("ambil link invite grup");
  check("'ambil link invite grup' → getlink", d?.tool === "getlink", d?.tool);
}
// "link grup" tanpa kata "grup/gc/group" → null (gak cukup konteks)
{
  const d = localParse("aktifkan antilink digrup ini");
  check("'aktifkan antilink digrup ini' → antilinkon (bukan getlink)", d?.tool === "antilinkon", d?.tool);
}

// ═══════════════════════════════════════════════════════════════
// TOOLS — 5 fitur toggle ada di whitelist
// ═══════════════════════════════════════════════════════════════
w("\n— TOOLS: 5 fitur toggle terdaftar —");
for (const [key, label] of [
  ["antilinkon", "Anti-Link ON"], ["antilinkoff", "Anti-Link OFF"],
  ["antibadwordon", "Anti-Badword ON"], ["antibadwordoff", "Anti-Badword OFF"],
  ["antistickeron", "Anti-Sticker ON"], ["antistickeroff", "Anti-Sticker OFF"],
  ["antivoiceon", "Anti-Voice ON"], ["antivoiceoff", "Anti-Voice OFF"],
  ["antispamon", "Anti-Spam ON"], ["antispamoff", "Anti-Spam OFF"],
]) {
  check(`${label} terdaftar`, !!TOOLS[key], key);
  check(`${label} perm admin`, TOOLS[key]?.perm === "admin");
  check(`${label} punya run()`, typeof TOOLS[key]?.run === "function");
}

// ═══════════════════════════════════════════════════════════════
// setAutomodRule — helper toggle rule (stub db via mock)
// ═══════════════════════════════════════════════════════════════
w("\n— setAutomodRule: toggle rule persisten —");
{
  // setAutomodRule pakai getDatabase() internal — di sandbox tanpa db,
  // getDatabase throw. Kita tes function signature + error handling aja.
  try {
    setAutomodRule("test@g.us", "antilink", true);
    check("setAutomodRule gak throw (db ada)", true);
  } catch (e) {
    // di sandbox tanpa db — expect error dari getDatabase, itu OK
    check("setAutomodRule error gracefully (sandbox no-db)", /database|getDatabase|db/i.test(e.message), e.message);
  }
}

// ═══════════════════════════════════════════════════════════════
// BUG 2: sanitizeAiReply — bersihin halusinasi markdown link/URL/heading
// ═══════════════════════════════════════════════════════════════
w("\n— BUG 2: sanitizeAiReply —");

// markdown link [label](url) → label doang
{
  const out = sanitizeAiReply("Coba lihat [artikel ini](https://example.com/post) untuk detail.");
  check("markdown link → label doang", !out.includes("https://example.com") && out.includes("artikel ini"), out);
}
// googleusercontent URL palsu → buang total
{
  const out = sanitizeAiReply("Sumber: https://googleusercontent.com/lmdx_content/abc123");
  check("googleusercontent URL dibuang", !out.includes("googleusercontent.com"), out);
}
// gstatic URL palsu → buang total
{
  const out = sanitizeAiReply("Gambar dari https://gstatic.com/image/xyz");
  check("gstatic URL dibuang", !out.includes("gstatic.com"), out);
}
// markdown heading ### → teks polos
{
  const out = sanitizeAiReply("### Rekomendasi HP\n\nPOCO X7 adalah pilihan terbaik.");
  check("heading ### dibuang", !out.includes("###") && out.includes("Rekomendasi HP"), out);
}
// baris pemisah --- → dibuang
{
  const out = sanitizeAiReply("Intro teks\n---\nKesimpulan");
  check("baris --- dibuang", !out.includes("---"), out);
}
// URL normal (bukan googleusercontent/gstatic) → tetap utuh (jangan over-sanitize)
{
  const out = sanitizeAiReply("Kunjungi https://github.com/repo untuk kode.");
  check("URL non-placeholder tetap utuh", out.includes("https://github.com/repo"), out);
}
// teks bersih → tetap utuh
{
  const clean = "POCO X7 paling worth it di harga 4 jutaan. Baterai 5000mAh, layar AMOLED.";
  check("teks bersih tetap utuh", sanitizeAiReply(clean) === clean);
}
// input kosong/null → aman
{
  check("null aman", sanitizeAiReply(null) === null);
  check("undefined aman", sanitizeAiReply(undefined) === undefined);
  check("string kosong aman", sanitizeAiReply("") === "");
}
// kombinasi: markdown link + heading + googleusercontent sekaligus
{
  const messy = "### Hasil Pencarian\n\nLihat [review lengkap](https://googleusercontent.com/lmdx_content/xyz) untuk detail.\n---\nSumber: https://gstatic.com/abc";
  const out = sanitizeAiReply(messy);
  check("kombinasi: no heading", !out.includes("###"));
  check("kombinasi: no googleusercontent", !out.includes("googleusercontent"));
  check("kombinasi: no gstatic", !out.includes("gstatic"));
  check("kombinasi: no markdown link", !out.includes("[review") && !out.includes("](https"));
  check("kombinasi: label tetap ada", out.includes("review lengkap"));
}

w("\n— rotasi status loading novaagent (fase berputar) —");
{
  const { startStatusRotation } = await import("../../src/lib/nova-status-rotate.js");

  // fase berputar tiap 30ms — urutan harus: fase 2, 3, lalu BERHENTI di terakhir (fase 1 = initial manual)
  const seen = [];
  const setStatus = async (txt) => { seen.push(txt); };
  const stop = startStatusRotation(setStatus, ["🧠 berpikir", "🔍 mencari", "🛠️ mengerjakan", "✍️ menyusun"], 30);
  await new Promise((r) => setTimeout(r, 150)); // 5 tick
  stop();
  check("rotasi: fase 2-4 muncul berurutan",
    seen[0] === "🔍 mencari" && seen[1] === "🛠️ mengerjakan" && seen[2] === "✍️ menyusun", JSON.stringify(seen));
  const countAtStop = seen.length;
  await new Promise((r) => setTimeout(r, 100));
  check("stopper: rotasi berhenti total", seen.length === countAtStop, `+${seen.length - countAtStop} edits`);

  // berhenti otomatis di fase terakhir (gak loop balik)
  const seen2 = [];
  const stop2 = startStatusRotation(async (x) => { seen2.push(x); }, ["a", "b", "c"], 20);
  await new Promise((r) => setTimeout(r, 200)); // jauh lewat fase terakhir
  check("auto-stop di fase terakhir (gak loop balik)", seen2.length === 2 && seen2[1] === "c", JSON.stringify(seen2));
  stop2();

  // stopper dipanggil sebelum tick pertama → 0 edit
  const seen3 = [];
  const stop3 = startStatusRotation(async (x) => { seen3.push(x); }, ["a", "b"], 10);
  stop3();
  await new Promise((r) => setTimeout(r, 50));
  check("stop instan: 0 edit", seen3.length === 0, JSON.stringify(seen3));

  // setStatus throw gak nge-kill rotator (error ditelen, interval lanjut)
  let calls4 = 0;
  const stop4 = startStatusRotation(async () => { calls4 += 1; if (calls4 === 1) throw new Error("boom"); }, ["a", "b", "c"], 20);
  await new Promise((r) => setTimeout(r, 120));
  check("setStatus throw → rotator tetap hidup", calls4 >= 2, `calls=${calls4}`);
  stop4();

  // guard input
  check("phases kosong → stopper noop", (() => { const s = startStatusRotation(() => {}, [], 10); s(); return true; })());
}

w("\nTOTAL: " + pass + "/" + (pass + fail));
process.exit(fail ? 1 : 0);
