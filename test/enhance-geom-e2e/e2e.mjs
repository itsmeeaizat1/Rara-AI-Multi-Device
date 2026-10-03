// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
// e2e geometri enhancer ONNX: similarity, invers, warp, paste-back, NMS, decode SCRFD.
import * as G from "../../src/lib/rara-enhance-geom.js";
let pass = 0, fail = 0;
const ok = (c, n) => { if (c) { pass++; console.log("  ✓", n); } else { fail++; console.log("  ✗", n); } };
const near = (a, b, e = 1e-6) => Math.abs(a - b) <= e;

console.log("[1] estimateSimilarity: pulihkan transformasi yang DIKETAHUI");
{
  const th = 0.4, s = 2.5, tx = 30, ty = -12;
  const a = s * Math.cos(th), b = s * Math.sin(th);
  const src = [[10, 20], [50, 25], [30, 50], [15, 70], [48, 72]];
  const dst = src.map(([x, y]) => [a * x - b * y + tx, b * x + a * y + ty]);
  const m = G.estimateSimilarity(src, dst);
  ok(near(m[0], a) && near(m[1], -b) && near(m[3], b) && near(m[4], a), "skala+rotasi dipulihkan persis");
  ok(near(m[2], tx, 1e-5) && near(m[5], ty, 1e-5), "translasi dipulihkan persis");
  const noisy = dst.map(([x, y], i) => [x + (i % 2 ? 0.3 : -0.3), y + (i % 2 ? -0.2 : 0.2)]);
  const mn = G.estimateSimilarity(src, noisy);
  const err = src.map(([x, y], i) => { const [px, py] = G.applyAffine(mn, x, y); return Math.hypot(px - noisy[i][0], py - noisy[i][1]); });
  ok(Math.max(...err) < 0.6, "toleran noise kecil (galat maks " + Math.max(...err).toFixed(2) + " px)");
  let thrown = false; try { G.estimateSimilarity([[1, 1], [1, 1]], [[0, 0], [1, 1]]); } catch { thrown = true; }
  ok(thrown, "titik degenerate ditolak jelas");
}

console.log("[2] invertAffine");
{
  const m = [1.3, -0.7, 12, 0.7, 1.3, -5];
  const inv = G.invertAffine(m);
  const [x, y] = G.applyAffine(inv, ...G.applyAffine(m, 17, 33));
  ok(near(x, 17, 1e-9) && near(y, 33, 1e-9), "m lalu invers = identitas");
  let thrown = false; try { G.invertAffine([0, 0, 0, 0, 0, 0]); } catch { thrown = true; }
  ok(thrown, "matriks singular ditolak");
}

console.log("[3] alignment ke template: landmark jatuh di template");
{
  const lm = [[200, 180], [260, 176], [232, 215], [208, 250], [258, 247]];
  const m = G.estimateSimilarity(lm, G.TEMPLATE_ARCFACE_128.map(([x, y]) => [x * 256, y * 256]));
  const d = lm.map(([x, y], i) => { const [px, py] = G.applyAffine(m, x, y); return Math.hypot(px - G.TEMPLATE_ARCFACE_128[i][0] * 256, py - G.TEMPLATE_ARCFACE_128[i][1] * 256); });
  ok(Math.max(...d) < 8, "landmark mendarat dekat template (maks " + Math.max(...d).toFixed(1) + " px)");
}

console.log("[4] warpAffineRGB");
{
  const W = 16, H = 16, src = Buffer.alloc(W * H * 3);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const o = (y * W + x) * 3; src[o] = x * 16; src[o + 1] = y * 16; src[o + 2] = 128; }
  const same = G.warpAffineRGB(src, W, H, [1, 0, 0, 0, 1, 0], W, H);
  ok(Buffer.compare(same, src) === 0, "identitas = gambar sama persis");
  const sh = G.warpAffineRGB(src, W, H, [1, 0, 3, 0, 1, 0], W, H);
  ok(sh[(5 * W + 8) * 3] === src[(5 * W + 5) * 3], "geser +3 px benar");
  const edge = G.warpAffineRGB(src, W, H, [1, 0, 8, 0, 1, 0], W, H);
  ok(edge[(5 * W + 0) * 3] === src[(5 * W + 0) * 3], "border replicate (tepi tidak hitam)");
  const up = G.warpAffineRGB(src, W, H, [2, 0, 0, 0, 2, 0], 32, 32);
  ok(up.length === 32 * 32 * 3 && up[(10 * 32 + 20) * 3] >= 140 && up[(10 * 32 + 20) * 3] <= 180, "upscale 2x bilinear wajar");
}

console.log("[5] boxMask");
{
  const mk = G.boxMask(64, 0.2);
  ok(mk[32 * 64 + 32] === 1, "tengah = 1");
  ok(mk[0] === 0 && mk[63] === 0, "sudut = 0");
  ok(mk[32 * 64 + 2] > 0 && mk[32 * 64 + 2] < 1, "tepi halus (feather)");
  ok(mk.every((v) => v >= 0 && v <= 1), "semua nilai dalam 0..1");
}

console.log("[6] pasteBack: wajah hasil menimpa area yang benar, luar tak berubah");
{
  const W = 100, H = 100, base = Buffer.alloc(W * H * 3, 50);
  const size = 32, crop = Buffer.alloc(size * size * 3, 200);
  const m = [1, 0, -34, 0, 1, -34]; // crop 32x32 menutupi (34..66, 34..66) di gambar asli
  const mask = new Float32Array(size * size).fill(1);
  G.pasteBack(base, W, H, crop, size, mask, m, 1);
  ok(base[(50 * W + 50) * 3] === 200, "tengah area ditimpa hasil model");
  ok(base[(10 * W + 10) * 3] === 50 && base[(90 * W + 90) * 3] === 50, "di luar area TIDAK berubah");
  const b2 = Buffer.alloc(W * H * 3, 50); G.pasteBack(b2, W, H, crop, size, mask, m, 0.5);
  ok(Math.abs(b2[(50 * W + 50) * 3] - 125) <= 1, "strength 0.5 = campuran setengah");
  const b3 = Buffer.alloc(W * H * 3, 50); G.pasteBack(b3, W, H, crop, size, mask, [1, 0, 500, 0, 1, 500], 1);
  ok(b3.every((v) => v === 50), "wajah di luar frame: aman, tanpa crash & tanpa perubahan");
}

console.log("[7] NMS");
{
  const boxes = [[10, 10, 50, 50], [12, 12, 52, 52], [100, 100, 140, 140]];
  const keep = G.nms(boxes, [0.9, 0.8, 0.7], 0.4);
  ok(keep.length === 2 && keep.includes(0) && keep.includes(2) && !keep.includes(1), "kotak tumpang-tindih dibuang, skor tertinggi dipertahankan");
  ok(G.nms([], [], 0.4).length === 0, "input kosong aman");
}

console.log("[8] scrfdDecode: urutan anchor diuji dengan deteksi SINTETIS di posisi yang diketahui");
{
  // Kanvas 64x64, stride 32 → grid 2x2, 2 anchor per sel = 8 anchor. Taruh 1 deteksi di satu anchor tertentu
  // lalu cek kotak keluar di posisi yang sesuai urutan FaceFusion (anchor = mgrid[:w,:h] stack(y,x)).
  const mk = (n) => new Float32Array(n);
  const outs = Array.from({ length: 9 }, (_, i) => ({ data: mk([8 * 1, 8 * 4, 8 * 10, 8 * 1, 8 * 4, 8 * 10, 8 * 1, 8 * 4, 8 * 10][i] * 0 + 0) }));
  // stride 8 → grid 8x8x2=128 ; stride 16 → 4x4x2=32 ; stride 32 → 2x2x2=8
  const N = [128, 32, 8];
  for (let s = 0; s < 3; s++) { outs[s] = { data: mk(N[s]) }; outs[s + 3] = { data: mk(N[s] * 4) }; outs[s + 6] = { data: mk(N[s] * 10) }; }
  // stride 32: aktifkan anchor k=5 → xi = floor(5/ (2*2))=1, yi = floor((5%4)/2)=0 → (ax = yi*32 = 0, ay = xi*32 = 32)
  outs[2].data[5] = 0.99;
  outs[5].data.set([1, 1, 1, 1], 5 * 4); // jarak 1*stride ke tiap sisi
  const r = G.scrfdDecode(outs, 64, 64, 0.5);
  ok(r.boxes.length === 1, "tepat 1 deteksi lolos ambang");
  ok(r.boxes[0][0] === -32 + 0 && r.boxes[0][2] === 32 + 0, "sumbu x kotak = ax(0) ± 32");
  ok(r.boxes[0][1] === 32 - 32 && r.boxes[0][3] === 32 + 32, "sumbu y kotak = ay(32) ± 32");
  const r0 = G.scrfdDecode(outs, 64, 64, 0.995);
  ok(r0.boxes.length === 0, "ambang tinggi → tidak ada deteksi");
  ok(r.landmarks[0].length === 5, "5 landmark per wajah");
}

console.log(`\nTOTAL: ${pass}/${pass + fail}`);
process.exit(fail ? 1 : 0);
