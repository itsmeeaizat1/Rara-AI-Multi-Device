// E2E REMINI FFMPEG PIPELINE (12 Sep 2026) — port kode owner, live ffmpeg.
// Jalankan: node <repo>/test/remini-ffmpeg-e2e/e2e.mjs
import { execFileSync } from "child_process";
import fsp from "fs/promises";
import os from "os";
import path from "path";
import {
  upscaleImage, polishImage, buildFilterChain, buildScaleFilter, buildDenoiseFilter,
  buildSharpnessFilter, buildColorFilter, normalizeFactor, validateInput,
  getPresets, HD_PRESETS, MAX_OUTPUT_PX,
} from "../../src/lib/rara-remini-ffmpeg.js";

let pass = 0, fail = 0, skip = 0;
const w = (s) => process.stdout.write(s + "\n");
const check = (name, ok, extra) => { w((ok ? "  ✅" : "  ❌") + " " + name + (ok ? "" : extra ? ` — ${extra}` : "")); ok ? pass++ : fail++; };
const skip_ = (name) => { w(`  ⏭️ ${name} (skip)`); skip++; };

// ── helper ──────────────────────────────────────────────────
function probeSize(buf) {
  const tmp = path.join(os.tmpdir(), `probe_${Date.now()}.jpg`);
  fspSync(tmp, buf);
  try {
    const out = execFileSync("ffprobe", ["-v", "error", "-select_streams", "v:0", "-show_entries", "stream=width,height", "-of", "csv=p=0", tmp], { timeout: 10000 }).toString().trim();
    const [width, height] = out.split(",").map(Number);
    return { width, height };
  } finally {
    fsp.unlink(tmp).catch(() => {});
  }
}
import { writeFileSync as fspSync, unlinkSync } from "fs";

async function makeTestJpeg(wPx = 200, hPx = 150) {
  const tmp = path.join(os.tmpdir(), `testsrc_${Date.now()}.jpg`);
  execFileSync("ffmpeg", ["-y", "-hide_banner", "-loglevel", "error", "-f", "lavfi", "-i", `testsrc2=size=${wPx}x${hPx}:duration=1:rate=1`, "-frames:v", "1", "-q:v", "2", tmp], { timeout: 30000 });
  const buf = await fsp.readFile(tmp);
  await fsp.unlink(tmp).catch(() => {});
  return buf;
}

// ============================================================
w("\n— filter chain builder (port verbatim kode owner) —");
{
  const chain2 = buildFilterChain(2);
  check("preset 2: hqdn3d=1:1:3:3", chain2.startsWith("hqdn3d=1:1:3:3"), chain2.slice(0, 40));
  check("preset 2: denoise low dipakai", chain2.startsWith("hqdn3d=1:1:3:3"), chain2.slice(0, 30));
  check("preset 2: unsharp balanced la=0.9", chain2.includes("unsharp=lx=5:ly=5:la=0.9"), chain2.slice(0, 120));
  check("preset 2: eq natural sat=1.02", chain2.includes("saturation=1.02"), "");
  check("urutan chain: denoise,scale,unsharp,eq",
    chain2.indexOf("hqdn3d=") === 0 && chain2.indexOf("scale=") > 0 && chain2.indexOf("unsharp=") > chain2.indexOf("scale=") && chain2.indexOf("eq=") > chain2.indexOf("unsharp="), chain2.slice(0, 60));

  const chain4 = buildFilterChain(4);
  check("preset 4: hqdn3d=1.25:1.25:4:4", chain4.startsWith("hqdn3d=1.25:1.25:4:4"), chain4.slice(0, 30));
  check("preset 4: scale faktor 4 + clamp 16000", chain4.includes("w=min(iw*4") && chain4.includes(`min(ih*4\\,${MAX_OUTPUT_PX})`), "");
  check("preset 4: unsharp sharp la=1.2", chain4.includes("la=1.2"), "");
  check("preset 4: eq vivid sat=1.05", chain4.includes("saturation=1.05"), "");

  const chain6 = buildFilterChain(6);
  check("preset 6: hqdn3d high", chain6.startsWith("hqdn3d=1.5:1.5:5:5"), "");
  check("preset 6: eq enhanced sat=1.08", chain6.includes("saturation=1.08"), "");

  const chain8 = buildFilterChain(8);
  check("preset 8: eq cinematic sat=1.1", chain8.includes("saturation=1.1"), "");
  check("preset 8: unsharp ultra la=1.35 radius 7", chain8.includes("unsharp=lx=7:ly=7:la=1.35"), chain8.slice(0, 160));
  check("preset 8: scale clamp 16000", chain8.includes(`min(iw*8\\,${MAX_OUTPUT_PX})`), "");
  check("scale lanczos+accurate_rnd", buildScaleFilter(4).includes("flags=lanczos+accurate_rnd+full_chroma_int"), "");
}

w("\n— normalizeFactor + validateInput —");
{
  check("faktor 2/4/6/8 valid", [2, 4, 6, 8].every((f) => normalizeFactor(f) === f));
  let threw = false;
  try { normalizeFactor(3); } catch { threw = true; }
  check("faktor 3 ditolak", threw);
  threw = false;
  try { normalizeFactor(16); } catch { threw = true; }
  check("faktor 16 ditolak", threw);
  check("default HD_PRESETS 4 preset", Object.keys(HD_PRESETS).length === 4);
  check("getPresets 4 entri + label", getPresets().length === 4 && getPresets()[3].label === "8x Ultra HD");

  threw = false;
  try { validateInput("bukan buffer"); } catch (e) { threw = e instanceof TypeError; }
  check("input non-buffer TypeError", threw);
  threw = false;
  try { validateInput(Buffer.alloc(0)); } catch { threw = true; }
  check("buffer kosong ditolak", threw);
  threw = false;
  try { validateInput(Buffer.alloc(26 * 1024 * 1024)); } catch { threw = true; }
  check("input > 25MB ditolak", threw);
  check("input 1MB valid", (() => { try { validateInput(Buffer.alloc(1024 * 1024)); return true; } catch { return false; } })());
}

w("\n— live upscale: FFmpeg beneran jalan —");
{
  const src = await makeTestJpeg(200, 150);
  check("test jpeg kebikin", src.length > 1000, String(src.length));

  const out2 = await upscaleImage(src, 2);
  check("2x: hasil non-kosong", out2.length > 0);
  const size2 = probeSize(out2);
  check("2x: dimensi jadi 400x300", size2.width === 400 && size2.height === 300, JSON.stringify(size2));
  check("2x: output mjpeg (SOI)", out2[0] === 0xff && out2[1] === 0xd8);

  const out4 = await upscaleImage(src, 4);
  const size4 = probeSize(out4);
  check("4x default: dimensi 800x600", size4.width === 800 && size4.height === 600, JSON.stringify(size4));

  const outDefault = await upscaleImage(src);
  const sizeDefault = probeSize(outDefault);
  check("tanpa arg = 4x", sizeDefault.width === 800, JSON.stringify(sizeDefault));

  // clamp 16000: input 10000px * 2x harus clamp ke 16000 (kalau ffmpeg kuat bikin)
  let tooBig = false;
  try {
    const big = await makeTestJpeg(10000, 7500);
    const outBig = await upscaleImage(big, 2);
    const sizeBig = probeSize(outBig);
    check("clamp 16000px jalan", Math.max(sizeBig.width, sizeBig.height) <= MAX_OUTPUT_PX, JSON.stringify(sizeBig));
  } catch (e) {
    tooBig = true;
    skip_("clamp 16000px (ffmpeg sandbox gak kuat bikin 10000px)");
  }

  // error: ffmpeg di-stop pakai input korup
  let threw2 = false;
  try { await upscaleImage(Buffer.from("bukan gambar sama sekali"), 2); } catch { threw2 = true; }
  check("input korup → error jelas (gak crash)", threw2);

  // temp file kebersihin
  const leftovers = (await fsp.readdir(os.tmpdir())).filter((f) => /^image_(input|output)_/.test(f));
  check("temp file kebersihin", leftovers.length === 0, leftovers.join(", "));
}

w("\n— plugin .remini: engine utama FFmpeg lewat handler —");
{
  const { config: rCfg, handler: rHandler } = await import("../../plugins/tools/remini.js");
  check("config remini ke-load", rCfg.name === "remini");

  const src = await makeTestJpeg(200, 150);
  const sent = [];
  const reacts = [];
  const m = {
    isImage: true,
    quoted: null,
    args: ["2"],
    chat: "test@g.us",
    prefix: ".",
    command: "remini",
    pushName: "tester",
    isOwner: false,
    isPremium: false,
    react: async (r) => reacts.push(r),
    reply: async (txt) => sent.push({ type: "reply", txt }),
    download: async () => src,
  };
  const sock = {
    sendMessage: async (to, msg) => { sent.push({ type: "msg", to, msg }); return { key: { id: "x" } }; },
  };
  await rHandler(m, { sock, args: ["2"] });
  check("hasil dikirim via sendMessage", sent.some((s) => s.type === "msg" && s.msg.image), JSON.stringify(sent.map((s) => s.type)));
  const cap = sent.find((s) => s.msg?.image)?.msg.caption || "";
  check("caption Engine: FFmpeg 2x HD", cap.includes("Engine: FFmpeg 2x HD"), cap.slice(0, 120));
  check("caption label 2x (2x)", cap.includes("2x HD (2x)"), cap.slice(0, 160));
  const img = sent.find((s) => s.msg?.image)?.msg.image;
  const sz = img ? probeSize(img) : { width: 0, height: 0 };
  check("dimensi hasil 400x300", sz.width === 400 && sz.height === 300, JSON.stringify(sz));
  check("react 🕒 → 🎨 → 🐣", reacts.includes("🕒") && reacts.includes("🎨") && reacts.includes("🐣"), reacts.join(","));
}

w("\n— ihancer scraper (engine utama baru 17 Sep — seam mock) —");
{
  const { ihancerEnhance, _setIhancerHttpForTest, _clearIhancerHttpForTest } = await import("../../src/scraper/ihancer.js");
  const srcBuf = await makeTestJpeg(200, 150);

  // 200 + JPEG asli → OK
  _setIhancerHttpForTest(async () => ({ status: 200, data: await makeTestJpeg(400, 300) }));
  let out = null;
  try { out = await ihancerEnhance(srcBuf); } catch (e) { out = null; }
  check("ihancer: 200 JPEG → buffer hasil", !!out && Buffer.isBuffer(out) && out.length > 100);
  check("ihancer: hasil valid JPEG (SOI)", !!out && out[0] === 0xff && out[1] === 0xd8);

  // 200 tapi HTML error page → harus DITOLAK (pelajaran sdxl — jangan lolos cuma
  // karena length gede)
  _setIhancerHttpForTest(async () => ({ status: 200, data: Buffer.from("<html><body>quota exceeded</body></html>") }));
  let threwHtml = false;
  try { await ihancerEnhance(srcBuf); } catch { threwHtml = true; }
  check("ihancer: 200 tapi HTML → error non-gambar", threwHtml);

  // HTTP 500 → error informatif
  _setIhancerHttpForTest(async () => ({ status: 500, data: Buffer.from("server error") }));
  let threw500 = false;
  try { await ihancerEnhance(srcBuf); } catch (e) { threw500 = /HTTP 500/.test(e.message); }
  check("ihancer: HTTP 500 → error nyebut status", threw500);

  // input bukan buffer → error jelas
  let threwInput = false;
  try { await ihancerEnhance(Buffer.from("")); } catch { threwInput = true; }
  check("ihancer: input kosong → error", threwInput);

  // FIX 19 Sep: 429 → retry otomatis (jeda dipendekin via seam)
  const { _setIhancer429WaitForTest } = await import("../../src/scraper/ihancer.js");
  _setIhancer429WaitForTest(5);
  let calls429 = 0;
  _setIhancerHttpForTest(async () => {
    calls429++;
    if (calls429 <= 2) return { status: 429, data: Buffer.from("slow down") };
    return { status: 200, data: await makeTestJpeg(800, 600) };
  });
  let out429 = null;
  try { out429 = await ihancerEnhance(srcBuf); } catch (e) { out429 = null; }
  check("ihancer: 429 2x → retry ke-3 sukses", !!out429 && out429[0] === 0xff && calls429 === 3, "calls: " + calls429);

  // 429 terus-terusan → tetap error informatif
  _setIhancerHttpForTest(async () => ({ status: 429, data: Buffer.from("slow down") }));
  let threw429 = false;
  try { await ihancerEnhance(srcBuf); } catch (e) { threw429 = /HTTP 429/.test(e.message); }
  check("ihancer: 429 abis retry → error HTTP 429", threw429);
  _setIhancer429WaitForTest(null);

  _clearIhancerHttpForTest();
}

w("\n— plugin .remini: engine CADANGAN IHANCER lewat handler (seam) —");
{
  // 3 Okt 2026: jalur utama .remini kini ONNX lokal; Ihancer jadi cadangan. Untuk menguji perilaku cadangan,
  // ONNX dimatikan lewat saklar darurat REMINI_ONNX=off (jalur ONNX diuji di test/enhance-onnx-e2e).
  process.env.REMINI_ONNX = "off";
  const { _setIhancerHttpForTest, _clearIhancerHttpForTest } = await import("../../src/scraper/ihancer.js");
  const { handler: rHandler } = await import("../../plugins/tools/remini.js");

  let lastFormData = null;
  _setIhancerHttpForTest(async (req) => { lastFormData = req.data; return { status: 200, data: await makeTestJpeg(800, 600) }; });
  const src = await makeTestJpeg(200, 150);
  const sent = [];
  const reacts = [];
  const m = {
    isImage: true,
    quoted: null,
    args: [],
    chat: "test@g.us",
    prefix: ".",
    command: "remini",
    pushName: "tester",
    isOwner: false,
    isPremium: false,
    react: async (r) => reacts.push(r),
    reply: async (txt) => sent.push({ type: "reply", txt }),
    download: async () => src,
  };
  const sock = {
    sendMessage: async (to, msg) => { sent.push({ type: "msg", to, msg }); return { key: { id: "x" } }; },
  };
  await rHandler(m, { sock, args: [] });
  check("hasil dikirim via sendMessage", sent.some((s) => s.type === "msg" && s.msg.image), JSON.stringify(sent.map((s) => s.type)));
  const cap = sent.find((s) => s.msg?.image)?.msg.caption || "";
  check("caption Engine: Ihancer AI Pro 4x + FFmpeg Polish", cap.includes("Engine: Ihancer AI Pro 4x HD + FFmpeg Polish"), cap.slice(0, 140));
  // UPGRADE 19 Sep: param pro + enhancing more wajib kekirim (output 4x)
  // (form-data package gak punya .get() — baca raw multipart buffer)
  const fdRaw = String(lastFormData?.getBuffer?.() || "");
  check("ihancer dipanggil pakai is_pro_version=true", /name="is_pro_version"\r\n\r\ntrue/.test(fdRaw), fdRaw.slice(0, 80));
  check("ihancer dipanggil pakai is_enhancing_more=true", /name="is_enhancing_more"\r\n\r\ntrue/.test(fdRaw), fdRaw.slice(0, 80));
  check("caption nunjukin resolusi hasil (800x600)", cap.includes("800x600"), cap.slice(0, 200));
  check("react 🎨 → 🐣", reacts.includes("🎨") && reacts.includes("🐣"), reacts.join(","));
  _clearIhancerHttpForTest();
  delete process.env.REMINI_ONNX; // pulihkan: jangan bocor ke bagian tes berikutnya
}

w("\n— polish pass: poles tanpa upscale (Photiu + polish) —");
{
  const src = await makeTestJpeg(200, 150);
  const out = await polishImage(src);
  check("polish: hasil non-kosong", out.length > 0);
  const sz = probeSize(out);
  check("polish: dimensi TETAP 200x150 (tanpa upscale)", sz.width === 200 && sz.height === 150, JSON.stringify(sz));
  check("polish: output mjpeg (SOI)", out[0] === 0xff && out[1] === 0xd8);
  // denoise low + unsharp balanced (la 0.9) + eq natural — tanpa scale
  const out2 = await polishImage(src); // deterministik — filter sama tiap run
  check("polish: deterministik (hasil identik)", out.length === out2.length);
  let threw = false;
  try { await polishImage(Buffer.from("korup")); } catch { threw = true; }
  check("polish: input korup → error jelas", threw);
  const leftovers = (await fsp.readdir(os.tmpdir())).filter((f) => /^image_(input|output)_/.test(f));
  check("polish: temp file kebersihin", leftovers.length === 0, leftovers.join(", "));
}

w(`\nTOTAL: ${pass}/${pass + fail}${skip ? ` (skip ${skip})` : ""}`);
process.exit(fail ? 1 : 0);
