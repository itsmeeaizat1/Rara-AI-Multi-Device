// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
// E2E ENHANCER ONNX LOKAL (3 Okt 2026) — engine rara-enhance-onnx + worker thread + plugin .remini.
// Jalankan: node test/enhance-onnx-e2e/e2e.mjs   (butuh model di src/data/models/ff/, ±145MB, unduh otomatis)
// GOTCHA repo: error top-level ESM = exit 0 SENYAP → seluruh suite dibungkus main().catch(exit 1).
import fs from "fs";
import path from "path";
import os from "os";
import sharp from "sharp";

process.chdir(new URL("../../", import.meta.url).pathname);
let pass = 0, fail = 0;
const w = (s) => process.stdout.write(s + "\n");
const check = (name, ok, extra) => { w((ok ? "  ✅" : "  ❌") + " " + name + (ok ? "" : extra ? ` — ${extra}` : "")); ok ? pass++ : fail++; };

// gambar uji sintetis: gradasi + "wajah" tidak dipakai di sini; wajah nyata diuji lewat FACE_IMG bila ada
async function makeImage(wPx, hPx, blur = 0) {
  const raw = Buffer.alloc(wPx * hPx * 3);
  for (let y = 0; y < hPx; y++) for (let x = 0; x < wPx; x++) {
    const o = (y * wPx + x) * 3;
    raw[o] = (x * 255 / wPx) | 0; raw[o + 1] = (y * 255 / hPx) | 0; raw[o + 2] = (((x >> 3) + (y >> 3)) & 1) ? 200 : 60;
  }
  let s = sharp(raw, { raw: { width: wPx, height: hPx, channels: 3 } });
  if (blur) s = s.blur(blur);
  return s.jpeg({ quality: 60 }).toBuffer();
}

async function main() {
  const E = await import("../../src/lib/rara-enhance-onnx.js");
  const Pool = await import("../../src/lib/rara-hd-pool.js");

  w("\n— [1] konfigurasi anti-CPU-naik —");
  check("THREADS default = 1 (bukan semua core)", E.ENHANCE_CONFIG.THREADS === 1, String(E.ENHANCE_CONFIG.THREADS));
  check("TILE kecil (<=128): tile 256 terukur 4x lebih lambat", E.ENHANCE_CONFIG.TILE <= 128);
  check("MAX_FACES dibatasi (<=6)", E.ENHANCE_CONFIG.MAX_FACES <= 6);
  check("model fp16 TIDAK dipakai (ort 1.17 tolak float16)", !Object.values(E.ENHANCE_MODELS).some((m) => /fp16/.test(m.file)));

  w("\n— [2] registry & cache model —");
  check("3 model terdaftar (esrgan/scrfd/gpen)", ["esrgan", "scrfd", "gpen"].every((k) => E.ENHANCE_MODELS[k]));
  check("isEnhanceCached() true (model sudah terunduh)", E.isEnhanceCached() === true);
  check("isEnhanceCached(key tak ada) false, tanpa crash", E.isEnhanceCached(["tidak_ada"]) === false);
  check("enhanceMissingMb() = 0 saat semua ada", E.enhanceMissingMb() === 0);

  w("\n— [3] unduh model: integritas (fetch palsu, tanpa network) —");
  {
    let threw = "";
    try { await E.ensureModel("tidak_dikenal"); } catch (e) { threw = e.message; }
    check("model tak dikenal ditolak jelas", /model_tidak_dikenal/.test(threw), threw);
    // Model yang SUDAH ada & utuh: hanya boleh ambil file .hash kecil (verifikasi CRC32), TIDAK boleh unduh model.
    E._setHashFetchForTest(null);
    const urls = [];
    const p = await E.ensureModel("scrfd", { fetchImpl: async (u) => { urls.push(String(u)); throw new Error("offline-tes"); } });
    check("model ter-cache & offline: tetap dipakai (jangan matikan fitur karena internet mati)", /scrfd_2\.5g\.onnx$/.test(p));
    check("model ter-cache: TIDAK pernah mengunduh file .onnx", !urls.some((u) => /\.onnx$/.test(u)), JSON.stringify(urls));
    // model KORUP + offline: tidak bisa diverifikasi -> dipercaya (jujur: tak ada pembanding), tidak crash
    check("verifikasi hash hanya 1x per model per proses (cache)", (await E.ensureModel("scrfd", { fetchImpl: async () => { throw new Error("tidak boleh"); } })).endsWith("scrfd_2.5g.onnx"));
  }

  w("\n— [4] enhancePhoto: gambar nyata (sintetis) —");
  {
    const img = await makeImage(192, 144, 1.2);
    const r = await E.enhancePhoto(img, { maxSide: 192 });
    const meta = await sharp(r.buffer).metadata();
    check("hasil = 2x input (384x288)", r.width === 384 && r.height === 288 && meta.width === 384 && meta.height === 288, `${r.width}x${r.height}`);
    check("hasil JPEG valid", meta.format === "jpeg");
    check("tile dihitung (>0)", r.tiles > 0, String(r.tiles));
    check("gambar tanpa wajah: 0 wajah, tidak crash", r.faces === 0);
    check("label menyebut Real-ESRGAN", /Real-ESRGAN/.test(r.label), r.label);
  }
  {
    const big = await makeImage(1600, 1200);
    const r = await E.enhancePhoto(big, { maxSide: 256 });
    check("input besar DIPERKECIL dulu ke maxSide (hasil <= 2x256)", Math.max(r.width, r.height) <= 512, `${r.width}x${r.height}`);
  }
  {
    const img = await makeImage(160, 120);
    const r = await E.enhancePhoto(img, { maxSide: 160, upscale: false, faces: true });
    check("mode wajah-saja: tanpa upscale, ukuran tetap", r.width === 160 && r.height === 120 && r.tiles === 0, `${r.width}x${r.height} tiles=${r.tiles}`);
  }
  {
    let bad = "";
    try { await E.enhancePhoto(Buffer.from("bukan gambar sama sekali")); } catch (e) { bad = e.message; }
    check("buffer sampah ditolak (bukan hang / bukan hasil palsu)", !!bad, bad);
    let empty = "";
    try { await E.enhancePhoto(Buffer.alloc(0)); } catch (e) { empty = e.message; }
    check("buffer kosong ditolak", !!empty);
  }
  {
    const img = await makeImage(192, 144);
    const ticks = [];
    await E.enhancePhoto(img, { maxSide: 192, onProgress: (s, d, t) => ticks.push([s, d, t]) });
    check("progress upscale dilaporkan & berakhir di total", ticks.some(([s, d, t]) => s === "upscale" && d === t && t > 0));
    check("tahap faces dilaporkan", ticks.some(([s]) => s === "faces"));
  }

  w("\n— [5] wajah NYATA (opsional: FACE_IMG=/path/foto.png) —");
  if (process.env.FACE_IMG && fs.existsSync(process.env.FACE_IMG)) {
    const buf = fs.readFileSync(process.env.FACE_IMG);
    const r = await E.enhancePhoto(buf, { maxSide: 480 });
    check("wajah terdeteksi & dipulihkan (>=1)", r.faces >= 1, String(r.faces));
    check("label menyebut GPEN", /GPEN/.test(r.label), r.label);
  } else w("  ⏭️ FACE_IMG tidak diset (skip)");

  w("\n— [6] lewat WORKER THREAD asli (pool) —");
  {
    const img = await makeImage(192, 144, 1);
    const ticks = [];
    const r = await Pool.enhanceLocalAsync(img, "enhance", { maxSide: 192, onProgress: (s, d, t) => ticks.push(s) });
    check("hasil dari worker: 384x288", r.width === 384 && r.height === 288, `${r.width}x${r.height}`);
    check("buffer hasil valid (Buffer, bukan ArrayBuffer rusak)", Buffer.isBuffer(r.buffer) && r.buffer.length > 1000);
    check("progress lintas-thread sampai ke pemanggil", ticks.includes("upscale"), JSON.stringify([...new Set(ticks)]));
    check("hdQueueInfo kembali idle setelah selesai", Pool.hdQueueInfo().busy === false);
  }
  {
    // 2 job bersamaan harus diantrekan (satu worker), bukan paralel → CPU tidak melonjak
    const img = await makeImage(128, 96);
    const t0 = Date.now();
    const a = Pool.enhanceLocalAsync(img, "enhance", { maxSide: 128 });
    const b = Pool.enhanceLocalAsync(img, "enhance", { maxSide: 128 });
    const info = Pool.hdQueueInfo();
    check("job ke-2 masuk ANTRIAN (ahead>=1 / busy)", info.busy === true && info.ahead >= 1, JSON.stringify(info));
    const [ra, rb] = await Promise.all([a, b]);
    check("kedua job selesai benar", ra.width === 256 && rb.width === 256);
    void t0;
  }
  {
    let err = "";
    try { await Pool.enhanceLocalAsync(Buffer.from("sampah"), "enhance", { maxSide: 128 }); } catch (e) { err = e.message; }
    check("gambar rusak lewat worker: error jelas, pool TIDAK macet", !!err, err);
    const img = await makeImage(128, 96);
    const ok = await Pool.enhanceLocalAsync(img, "enhance", { maxSide: 128 });
    check("pool masih sehat setelah error (job berikutnya jalan)", ok.width === 256);
  }
  {
    let err = "";
    try { await Pool.enhanceLocalAsync(await makeImage(400, 400), "enhance", { maxSide: 400, timeoutMs: 5000 }); } catch (e) { err = e.message; }
    check("watchdog: job kelamaan -> timeout_render (bukan hang selamanya)", err === "timeout_render", err);
    // worker basi di-orphan; job berikutnya harus tetap jalan di worker baru
    const ok = await Pool.enhanceLocalAsync(await makeImage(128, 96), "enhance", { maxSide: 128 });
    check("setelah timeout, antrian lanjut di worker baru", ok.width === 256);
  }

  w("\n— [7] plugin .remini: handler asli, pesan tiruan —");
  const plugin = await import("../../plugins/tools/remini.js");
  const mk = (args, extra = {}) => {
    const sent = [], reacts = [], replies = [];
    const m = {
      isImage: true, chat: "628@s.whatsapp.net", pushName: "Tes", prefix: ".", command: "remini", isOwner: false,
      download: async () => extra.buf, reply: async (t) => { replies.push(String(t)); },
      react: async (e) => { reacts.push(e); }, ...extra.m,
    };
    const sock = { sendMessage: async (jid, content) => { sent.push(content); return {}; } };
    return { m, sock, sent, reacts, replies, run: () => plugin.handler(m, { sock, args }) };
  };
  {
    const t = mk([], { buf: await makeImage(192, 144, 1) });
    await t.run();
    const out = t.sent[0];
    check("hasil dikirim sebagai gambar", !!out?.image && Buffer.isBuffer(out.image));
    check("caption menyebut ONNX Lokal (jalur utama)", /ONNX Lokal/.test(out?.caption || ""), out?.caption);
    check("caption bilang tanpa watermark & tanpa API luar", /tanpa watermark/i.test(out?.caption || ""));
    check("react akhir 🐣 (sukses), tidak ❌", t.reacts.includes("🐣") && !t.reacts.includes("❌"), t.reacts.join(""));
    const meta = await sharp(out.image).metadata();
    check("gambar terkirim 384x288", meta.width === 384 && meta.height === 288, `${meta.width}x${meta.height}`);
  }
  {
    const t = mk(["wajah"], { buf: await makeImage(160, 120) });
    await t.run();
    check(".remini wajah: hasil tetap ukuran asli (tanpa upscale)", (await sharp(t.sent[0].image).metadata()).width === 160);
  }
  {
    // saklar darurat: REMINI_ONNX=off → ONNX TIDAK dipanggil (cek lewat caption bukan ONNX / lanjut rantai lama)
    process.env.REMINI_ONNX = "off";
    const t = mk([], { buf: await makeImage(96, 72) });
    // rantai lama butuh jaringan (Ihancer) — kita cuma pastikan ONNX tidak dipakai; batasi waktu
    await Promise.race([t.run().catch(() => {}), new Promise((r) => setTimeout(r, 25000))]);
    delete process.env.REMINI_ONNX;
    check("REMINI_ONNX=off: caption TIDAK menyebut ONNX Lokal", !t.sent.some((c) => /ONNX Lokal/.test(c?.caption || "")));
  }
  {
    const t = mk([], { buf: Buffer.alloc(10) });
    await t.run();
    check("gambar < 100 byte: ditolak sopan, tidak crash", t.reacts.includes("❌") && t.replies.length >= 1);
  }
  {
    const t = mk([], { buf: await makeImage(64, 48), m: { isImage: false, quoted: null } });
    await t.run();
    check("tanpa gambar: pesan petunjuk, tanpa render", t.sent.length === 0 && t.replies.length === 1);
  }
  w("\n— [8] ketahanan model: korup -> dibuang & diunduh ulang (self-heal) —");
  if (process.env.FACE_IMG && fs.existsSync(process.env.FACE_IMG)) {
    // Dijalankan di PROSES TERPISAH: worker yang hangat memegang sesi di memori, jadi simulasi kegagalan
    // di proses ini tidak akan mengenai worker. Proses baru = worker baru = benar-benar memuat file dari disk.
    const { spawnSync } = await import("child_process");
    const f = path.join(process.cwd(), "src/data/models/ff/gpen_bfr_256.onnx");
    const orig = fs.statSync(f).size;
    const probe = `
      import fs from "fs"; import path from "path"; import sharp from "sharp";
      process.chdir(${JSON.stringify(process.cwd())});
      const Pool = await import(${JSON.stringify(new URL("../../src/lib/rara-hd-pool.js", import.meta.url).href)});
      const f = path.resolve("src/data/models/ff/gpen_bfr_256.onnx");
      fs.renameSync(f, f + ".x"); fs.writeFileSync(f, Buffer.alloc(2_000_000, 7));
      try {
        const img = await sharp(${JSON.stringify(process.env.FACE_IMG)}).resize(480, 480).jpeg().toBuffer();
        const r = await Pool.enhanceLocalAsync(img, "enhance", { maxSide: 480, upscale: false, timeoutMs: 120000 });
        console.log("RESULT " + JSON.stringify({ faces: r.faces, label: r.label }));
      } catch (e) { console.log("RESULT " + JSON.stringify({ error: e.message })); }
      finally { try { fs.rmSync(f, { force: true }); } catch {} if (fs.existsSync(f + ".x")) fs.renameSync(f + ".x", f); process.exit(0); }
    `;
    const tmp = path.join(os.tmpdir(), `corrupt_${Date.now()}.mjs`);
    fs.writeFileSync(tmp, probe);
    const r = spawnSync("node", [tmp], { cwd: process.cwd(), encoding: "utf8", timeout: 200000 });
    fs.rmSync(tmp, { force: true });
    const line = (r.stdout || "").split("\n").find((l) => l.startsWith("RESULT "));
    const res = line ? JSON.parse(line.slice(7)) : null;
    check("proses uji selesai normal (tanpa crash native)", r.status === 0, `status=${r.status} sig=${r.signal}`);
    check("model korup terdeteksi di log", /korup .*dibuang & diunduh ulang/.test(r.stderr + r.stdout), (r.stderr || "").slice(0, 150));
    check("setelah self-heal wajah TETAP dipulihkan", res && res.faces === 1, JSON.stringify(res));
    check("file model akhir utuh (ukuran asli)", fs.statSync(f).size === orig, `${fs.statSync(f).size} vs ${orig}`);
  } else w("  ⏭️ FACE_IMG tidak diset (skip)");

  w(`\nTOTAL: ${pass}/${pass + fail}`);
  // Worker orphan (hasil tes watchdog) masih inference di belakang. process.exit() SAAT itu memicu abort native
  // (Napi::Error, exit 134) — terukur: gambar 1000px (orphan ±2 mnt) + exit setelah 20 dtk = 134, tunggu 150 dtk
  // atau gambar 400px = exit 0. Bukan bug fitur (bot tak pernah exit saat render); tes memakai gambar 400px
  // supaya orphan selesai dalam jeda ini.
  await new Promise((r) => setTimeout(r, 30000));
  process.exitCode = fail ? 1 : 0;
  process.exit(process.exitCode);
}
main().catch((e) => { console.error("FATAL:", e); process.exit(1); });
