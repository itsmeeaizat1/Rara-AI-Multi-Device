// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
// E2E UNDUH MODEL .remini (3 Okt 2026, owner: "pas unduh model ai kok g keunduh pdhal katanya otomatis").
// Akar: unduhan lazy di worker (batas 6 menit berbagi dgn render), buffer penuh di RAM (+228MB), kegagalan ditelan senyap.
// Isolasi: cwd = folder sementara (MODEL_DIR dihitung dari cwd) -> model asli tidak tersentuh. TANPA jaringan.
// GOTCHA repo: error top-level ESM = exit 0 SENYAP -> seluruh suite dibungkus main().catch(exit 1).
import fs from "fs";
import os from "os";
import path from "path";
import zlib from "zlib";

const REPO = new URL("../../", import.meta.url).pathname;
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), "remini-dl-"));
process.chdir(TMP);
let pass = 0, fail = 0;
const w = (s) => process.stdout.write(s + "\n");
const check = (n, ok, x) => { w((ok ? "  ✅" : "  ❌") + " " + n + (ok ? "" : x !== undefined ? ` — ${String(x).slice(0, 200)}` : "")); ok ? pass++ : fail++; };

const crcHex = (b) => { let c = 0xffffffff; const t = []; for (let n = 0; n < 256; n++) { let v = n; for (let k = 0; k < 8; k++) v = v & 1 ? 0xedb88320 ^ (v >>> 1) : v >>> 1; t[n] = v >>> 0; } for (let i = 0; i < b.length; i++) c = t[(c ^ b[i]) & 0xff] ^ (c >>> 8); return ((c ^ 0xffffffff) >>> 0).toString(16).padStart(8, "0"); };
const BODY = Buffer.alloc(1_500_000); for (let i = 0; i < BODY.length; i++) BODY[i] = (i * 31 + 7) & 255;
const GOOD = crcHex(BODY);

// Response tiruan BERBENTUK STREAM (getReader) seperti fetch asli; chunk kecil supaya jalur streaming benar2 dipakai
function streamRes(buf, { chunk = 64 * 1024, failAt = -1, headers = {} } = {}) {
  let off = 0;
  return { ok: true, status: 200, headers: { get: (k) => headers[k.toLowerCase()] ?? null },
    body: { getReader: () => ({ read: async () => {
      if (failAt >= 0 && off >= failAt) throw new Error("terminated: other side closed");
      if (off >= buf.length) return { done: true };
      const v = buf.subarray(off, off + chunk); off += chunk; return { done: false, value: new Uint8Array(v) };
    } }) } };
}
const hashRes = (h) => ({ ok: true, status: 200, text: async () => h });
const router = (file, { dataRes, hash = GOOD, hashOk = true } = {}) => async (u) => String(u).endsWith(".hash") ? (hashOk ? hashRes(hash) : { ok: false, status: 404, text: async () => "" }) : dataRes();

async function main() {
  const E = await import(REPO + "src/lib/rara-enhance-onnx.js");
  const MODEL = path.join(TMP, "src", "data", "models", "ff");

  w("\n— [1] unduh STREAMING: file benar, CRC lolos, tanpa buffer penuh —");
  {
    const ticks = [];
    const p = await E.ensureModel("scrfd", { fetchImpl: router("scrfd", { dataRes: () => streamRes(BODY, { headers: { "content-length": String(BODY.length) } }) }), onProgress: (x) => ticks.push(x) });
    const got = fs.readFileSync(p);
    check("file tertulis di folder model & byte identik dgn sumber", Buffer.compare(got, BODY) === 0 && p.startsWith(MODEL), p);
    check("progres dipanggil berkali2 (streaming per potongan)", ticks.length > 5, ticks.length);
    check("progres monoton naik & berakhir = ukuran total", ticks.every((t, i) => i === 0 || t.done >= ticks[i - 1].done) && ticks.at(-1).done === BODY.length && ticks.at(-1).total === BODY.length);
    check("label model ikut di progres (buat log)", ticks[0].label === E.ENHANCE_MODELS.scrfd.label);
    check("tidak ada sisa .part", !fs.existsSync(p + ".part"));
  }

  w("\n— [2] jalur mock tanpa body stream (arrayBuffer) tetap jalan —");
  {
    fs.rmSync(path.join(MODEL, "scrfd_2.5g.onnx"), { force: true }); E._setHashFetchForTest(null);
    const ab = () => ({ ok: true, status: 200, headers: { get: () => null }, arrayBuffer: async () => BODY.buffer.slice(BODY.byteOffset, BODY.byteOffset + BODY.length) });
    const p = await E.ensureModel("scrfd", { fetchImpl: router("scrfd", { dataRes: ab }) });
    check("fallback arrayBuffer menghasilkan file identik", Buffer.compare(fs.readFileSync(p), BODY) === 0);
  }

  w("\n— [3] KEGAGALAN: melempar jelas, file rusak TIDAK tersimpan —");
  {
    const dest = path.join(MODEL, "scrfd_2.5g.onnx");
    const clean = () => { fs.rmSync(dest, { force: true }); fs.rmSync(dest + ".part", { force: true }); E._setHashFetchForTest(null); };
    clean();
    let e1; try { await E.ensureModel("scrfd", { fetchImpl: router("scrfd", { dataRes: () => streamRes(BODY, { failAt: 300_000 }) }) }); } catch (e) { e1 = e; }
    check("koneksi putus di tengah -> melempar", !!e1 && /terminated/.test(e1.message), e1 && e1.message);
    check("putus di tengah -> TIDAK ada file model & TIDAK ada .part", !fs.existsSync(dest) && !fs.existsSync(dest + ".part"));
    check("isEnhanceCached(['scrfd']) tetap false setelah gagal (akan diunduh ulang)", E.isEnhanceCached(["scrfd"]) === false);
    clean();
    let e2; try { await E.ensureModel("scrfd", { fetchImpl: router("scrfd", { dataRes: () => streamRes(BODY), hash: "deadbeef" }) }); } catch (e) { e2 = e; }
    check("CRC tidak cocok -> model_korup", !!e2 && /^model_korup:/.test(e2.message), e2 && e2.message);
    check("CRC salah -> file TIDAK dipasang (cegah model korup permanen)", !fs.existsSync(dest) && !fs.existsSync(dest + ".part"));
    clean();
    let e3; try { await E.ensureModel("scrfd", { fetchImpl: router("scrfd", { dataRes: () => streamRes(Buffer.from("<html>blocked</html>")) }) }); } catch (e) { e3 = e; }
    check("balasan HTML kecil -> unduh_model_terlalu_kecil", !!e3 && /terlalu_kecil/.test(e3.message), e3 && e3.message);
    clean();
    let e4; try { await E.ensureModel("scrfd", { fetchImpl: async (u) => String(u).endsWith(".hash") ? hashRes(GOOD) : { ok: false, status: 403 } }); } catch (e) { e4 = e; }
    check("HTTP 403 -> unduh_model_gagal:...:HTTP_403", !!e4 && /HTTP_403/.test(e4.message), e4 && e4.message);
    clean();
    const good = await E.ensureModel("scrfd", { fetchImpl: router("scrfd", { dataRes: () => streamRes(BODY) }) });
    check("setelah gagal, percobaan berikutnya BERHASIL (tidak macet selamanya)", fs.existsSync(good));
  }

  w("\n— [4] describeDownloadError: alasan ramah user, kode teknis tidak bocor —");
  {
    const d = E.describeDownloadError;
    check("403 -> IP VPS diblokir", /403/.test(d(new Error("unduh_model_gagal:x:HTTP_403"))) && /diblokir/.test(d(new Error("unduh_model_gagal:x:HTTP_403"))));
    check("429 -> dibatasi", /429/.test(d(new Error("unduh_model_gagal:x:HTTP_429"))));
    check("503 -> server bermasalah", /5xx/.test(d(new Error("unduh_model_gagal:x:HTTP_503"))));
    check("404 -> file tidak ditemukan", /404/.test(d(new Error("unduh_model_gagal:x:HTTP_404"))));
    check("HTML kecil -> kemungkinan diblokir jaringan", /diblokir jaringan/.test(d(new Error("unduh_model_terlalu_kecil:x:8192B"))));
    check("CRC -> file rusak", /rusak/.test(d(new Error("model_korup:x:crc_a_harusnya_b"))));
    check("abort/timeout -> koneksi lambat", /lambat/.test(d(new Error("This operation was aborted"))));
    check("DNS/koneksi -> tidak bisa menjangkau huggingface.co", /huggingface\.co/.test(d(new Error("fetch failed"))) && /huggingface\.co/.test(d(Object.assign(new Error("getaddrinfo ENOTFOUND huggingface.co")))));
    check("disk penuh -> ENOSPC", /disk/.test(d(new Error("ENOSPC: no space left on device"))));
    check("izin -> EACCES", /izin/.test(d(new Error("EACCES: permission denied"))));
    check("error asing -> tetap string, tidak crash", typeof d(new Error("aneh")) === "string" && typeof d(undefined) === "string" && typeof d(null) === "string");
  }

  w("\n— [5] prefetchEnhanceModels: berurutan, hanya yang kurang, progres beranotasi —");
  {
    for (const f of fs.readdirSync(MODEL)) fs.rmSync(path.join(MODEL, f), { force: true }); E._setHashFetchForTest(null);
    const seen = [], urls = [];
    const fetchImpl = async (u) => { urls.push(String(u)); return String(u).endsWith(".hash") ? hashRes(GOOD) : streamRes(BODY); };
    const n = await E.prefetchEnhanceModels({ fetchImpl, onProgress: (x) => seen.push(x) });
    check("mengunduh ketiga model (n=3)", n === 3, n);
    check("ketiga file ada & isEnhanceCached() true", E.isEnhanceCached() === true);
    check("anotasi index/count benar (1/3..3/3)", seen[0].index === 1 && seen[0].count === 3 && seen.at(-1).index === 3 && seen.at(-1).count === 3, JSON.stringify([seen[0], seen.at(-1)]));
    const dataUrls = urls.filter((u) => u.endsWith(".onnx"));
    check("URL sumber = facefusion/models-3.0.0 (tiga file berbeda)", dataUrls.length === 3 && new Set(dataUrls).size === 3 && dataUrls.every((u) => u.includes("huggingface.co/facefusion/models-3.0.0/resolve/main/")), dataUrls.join(","));
    const urls2 = []; const n2 = await E.prefetchEnhanceModels({ fetchImpl: async (u) => { urls2.push(u); throw new Error("tidak boleh dipanggil"); } });
    check("semua sudah ada -> 0 unduhan & 0 request jaringan", n2 === 0 && urls2.length === 0, `${n2}/${urls2.length}`);
    // sebagian ada: hapus 1 -> hanya 1 diunduh
    fs.rmSync(path.join(MODEL, E.ENHANCE_MODELS.gpen.file), { force: true });
    const u3 = []; const n3 = await E.prefetchEnhanceModels({ fetchImpl: async (u) => { u3.push(String(u)); return String(u).endsWith(".hash") ? hashRes(GOOD) : streamRes(BODY); } });
    check("hanya model yang HILANG diunduh (gpen saja)", n3 === 1 && u3.some((u) => u.includes("gpen_bfr_256.onnx")) && !u3.some((u) => u.includes("scrfd") || u.includes("real_esrgan")), u3.join(","));
    // gagal di tengah urutan: error dilempar, model yang sudah selesai TETAP ada
    for (const f of fs.readdirSync(MODEL)) fs.rmSync(path.join(MODEL, f), { force: true }); E._setHashFetchForTest(null);
    let cnt = 0; let err; try { await E.prefetchEnhanceModels({ fetchImpl: async (u) => { if (String(u).endsWith(".hash")) return hashRes(GOOD); cnt++; return cnt === 2 ? { ok: false, status: 429 } : streamRes(BODY); } }); } catch (e) { err = e; }
    check("gagal di model ke-2 -> melempar error HTTP_429", !!err && /HTTP_429/.test(err.message), err && err.message);
    check("model ke-1 yang sudah selesai TIDAK hilang (tidak unduh ulang kelak)", E.isEnhanceCached(["esrgan"]) === true && E.isEnhanceCached(["scrfd"]) === false);
  }

  w("\n— [6] PLUGIN .remini ASLI: unduh gagal -> user DIBERI TAHU (bukan senyap) —");
  {
    for (const f of fs.readdirSync(MODEL)) fs.rmSync(path.join(MODEL, f), { force: true }); E._setHashFetchForTest(null);
    const realFetch = globalThis.fetch;
    globalThis.fetch = async (u) => String(u).includes("huggingface.co") ? { ok: false, status: 403, text: async () => "", headers: { get: () => null } } : realFetch(u);
    const errs = []; const origErr = console.error; console.error = (...a) => errs.push(a.join(" "));
    try {
      const plug = await import(REPO + "plugins/tools/remini.js");
      const replies = [], reacts = [];
      const m = { isOwner: true, isImage: true, chat: "c@s.whatsapp.net", sender: "a@s.whatsapp.net", args: [], text: ".remini", key: { id: "K" },
        react: async (e) => { reacts.push(e); }, reply: async (t) => { replies.push(String(t)); return {}; },
        download: async () => Buffer.alloc(10) };
      // onnxEnhance tidak diekspor: jalankan lewat subperintah owner yang memakai prefetch yang sama
      await plug.handler({ ...m, isImage: false }, { sock: {}, args: ["model", "unduh"] });
      const all = replies.join("\n");
      check(".remini model unduh (gagal 403) -> balasan menyebut alasan jelas", /Gagal mengunduh/.test(all) && /403/.test(all) && /diblokir/.test(all), all.slice(0, 200));
      check("reaksi ❌ dipakai (bukan senyap)", reacts.includes("❌"), reacts.join(","));
      check("kode teknis ikut (buat owner debug)", /HTTP_403/.test(all));
      check("kegagalan tercatat di log server", errs.some((e) => /GAGAL/.test(e)), errs.join("|").slice(0, 150));
      replies.length = 0;
      await plug.handler({ ...m, isImage: false }, { sock: {}, args: ["model"] });
      const st = replies.join("\n");
      check(".remini model (status) -> daftar 3 model BELUM ada + petunjuk unduh", /BELUM ada/.test(st) && /Real-ESRGAN/.test(st) && /GPEN/.test(st) && /SCRFD/.test(st) && /\.remini model unduh/.test(st), st.slice(0, 200));
      replies.length = 0;
      await plug.handler({ ...m, isOwner: false, isImage: false }, { sock: {}, args: ["model", "unduh"] });
      check("BUKAN owner -> ditolak, TIDAK mengunduh apa pun", /khusus owner/.test(replies.join("")) && !E.isEnhanceCached(["scrfd"]));
      // sekarang unduhan berhasil
      globalThis.fetch = async (u) => String(u).endsWith(".hash") ? hashRes(GOOD) : streamRes(BODY);
      replies.length = 0; reacts.length = 0;
      await plug.handler({ ...m, isImage: false }, { sock: {}, args: ["model", "unduh"] });
      check(".remini model unduh (sukses) -> balasan Selesai 3 model", /Selesai: 3 model/.test(replies.join("")), replies.join("|").slice(0, 160));
      check("reaksi ✅ saat sukses & semua model cached", reacts.includes("✅") && E.isEnhanceCached() === true);
      replies.length = 0;
      await plug.handler({ ...m, isImage: false }, { sock: {}, args: ["model", "unduh"] });
      check("dipanggil lagi saat semua siap -> 'tidak ada yang perlu diunduh'", /tidak ada yang perlu diunduh/.test(replies.join("")));
      replies.length = 0;
      await plug.handler({ ...m, isImage: false }, { sock: {}, args: ["model"] });
      check("status setelah unduh -> 'Semua model siap'", /Semua model siap/.test(replies.join("")) && !/BELUM ada/.test(replies.join("")));
    } finally { globalThis.fetch = realFetch; console.error = origErr; }
  }

  w("\n— [7] kontrak plugin: usage menyebut subperintah, tidak mengubah rantai lama —");
  {
    const src = fs.readFileSync(REPO + "plugins/tools/remini.js", "utf8");
    const plug = await import(REPO + "plugins/tools/remini.js");
    check("usage menyebut .remini model & .remini model unduh", /\.remini model/.test(plug.config.usage) && /model unduh/.test(plug.config.usage));
    check("rantai cadangan tetap ada (Ihancer/Photiu/FFmpeg/Swin)", ["ihancerEnhance", "photiuUpscale", "ffmpegPipeline", "swinFallback", "sharpLastResort"].every((k) => src.includes(k)));
    check("kegagalan unduh melempar ulang -> catch(eo) lama yang melanjutkan ke cadangan", /throw e; \/\/ lanjut ke engine cadangan/.test(src));
    check("pra-unduh dipanggil SEBELUM enhanceLocalAsync (di luar worker)", src.indexOf("prefetchEnhanceModels({") > 0 && src.indexOf("prefetchEnhanceModels({") < src.indexOf("return enhanceLocalAsync(mediaBuffer"));
    check("tanpa pesan progres edit-in-place (aturan: loading = reaksi emoji)", !/sendMessage\([^)]*edit:/.test(src.slice(src.indexOf("PRA-UNDUH"), src.indexOf("return enhanceLocalAsync(mediaBuffer"))));
  }

  w(`\n${pass} PASS / ${fail} FAIL`);
  process.exit(fail ? 1 : 0);
}
main().catch((e) => { console.error("SUITE CRASH:", e && e.stack || e); process.exit(1); });
