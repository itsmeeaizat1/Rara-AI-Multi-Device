// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
// rara-enhance-geom.js — geometri murni (tanpa model, tanpa OpenCV) buat enhancer wajah ONNX.
// Semua fungsi di sini deterministik & diuji sendiri di test/enhance-onnx-e2e.
//
// Isi:
//   - estimateSimilarity : transformasi similarity 4-DOF (skala+rotasi+geser) kuadrat-terkecil,
//                          setara cv2.estimateAffinePartial2D (tanpa RANSAC; 5 titik wajah bersih)
//   - invertAffine / applyAffine
//   - scrfdDecode        : decode 9 output SCRFD (strides 8/16/32) → kotak + skor + 5 landmark
//   - nms                : non-maximum suppression IoU
//   - warpAffineRGB      : warp bilinear RGB uint8 (replicate border) — crop wajah & paste-back
//   - boxMask            : mask kotak dengan tepi halus (feather) buat blending

// Template alignment (dari FaceFusion WARP_TEMPLATE_SET) — koordinat ternormalisasi 0..1
export const TEMPLATE_ARCFACE_128 = [
  [0.36167656, 0.40387734],
  [0.63696719, 0.40235469],
  [0.50019687, 0.56044219],
  [0.38710391, 0.72160547],
  [0.61507734, 0.72034453],
];

/**
 * Similarity transform src→dst (kuadrat-terkecil, bentuk tertutup).
 * Model: [x'] = [ a -b ][x] + [tx]
 *        [y']   [ b  a ][y]   [ty]
 * @param {number[][]} src  N titik [x,y]
 * @param {number[][]} dst  N titik [x,y]
 * @returns {number[]} matriks 2x3 baris-mayor [a,-b,tx, b,a,ty]
 */
export function estimateSimilarity(src, dst) {
  const n = src.length;
  if (n < 2 || n !== dst.length) throw new Error("estimateSimilarity: butuh >=2 titik berpasangan");
  let sx = 0, sy = 0, dx = 0, dy = 0;
  for (let i = 0; i < n; i++) { sx += src[i][0]; sy += src[i][1]; dx += dst[i][0]; dy += dst[i][1]; }
  sx /= n; sy /= n; dx /= n; dy /= n;
  let num1 = 0, num2 = 0, den = 0;
  for (let i = 0; i < n; i++) {
    const px = src[i][0] - sx, py = src[i][1] - sy;
    const qx = dst[i][0] - dx, qy = dst[i][1] - dy;
    num1 += px * qx + py * qy;      // → a
    num2 += px * qy - py * qx;      // → b
    den += px * px + py * py;
  }
  if (den < 1e-12) throw new Error("estimateSimilarity: titik sumber degenerate");
  const a = num1 / den, b = num2 / den;
  const tx = dx - (a * sx - b * sy);
  const ty = dy - (b * sx + a * sy);
  return [a, -b, tx, b, a, ty];
}

export function applyAffine(m, x, y) {
  return [m[0] * x + m[1] * y + m[2], m[3] * x + m[4] * y + m[5]];
}

export function invertAffine(m) {
  const det = m[0] * m[4] - m[1] * m[3];
  if (Math.abs(det) < 1e-12) throw new Error("invertAffine: matriks singular");
  const i00 = m[4] / det, i01 = -m[1] / det, i10 = -m[3] / det, i11 = m[0] / det;
  return [i00, i01, -(i00 * m[2] + i01 * m[5]), i10, i11, -(i10 * m[2] + i11 * m[5])];
}

/**
 * Warp RGB uint8 (HxWx3) dengan matriks affine `m` (src→dst), output outW x outH.
 * Bilinear + border REPLICATE. Pemetaan balik dihitung dari invers m.
 */
export function warpAffineRGB(src, srcW, srcH, m, outW, outH) {
  const inv = invertAffine(m);
  const out = Buffer.alloc(outW * outH * 3);
  for (let y = 0; y < outH; y++) {
    for (let x = 0; x < outW; x++) {
      let u = inv[0] * x + inv[1] * y + inv[2];
      let v = inv[3] * x + inv[4] * y + inv[5];
      if (u < 0) u = 0; else if (u > srcW - 1) u = srcW - 1;
      if (v < 0) v = 0; else if (v > srcH - 1) v = srcH - 1;
      const x0 = Math.floor(u), y0 = Math.floor(v);
      const x1 = Math.min(srcW - 1, x0 + 1), y1 = Math.min(srcH - 1, y0 + 1);
      const fx = u - x0, fy = v - y0;
      const o = (y * outW + x) * 3;
      for (let c = 0; c < 3; c++) {
        const p00 = src[(y0 * srcW + x0) * 3 + c], p10 = src[(y0 * srcW + x1) * 3 + c];
        const p01 = src[(y1 * srcW + x0) * 3 + c], p11 = src[(y1 * srcW + x1) * 3 + c];
        out[o + c] = (p00 * (1 - fx) + p10 * fx) * (1 - fy) + (p01 * (1 - fx) + p11 * fx) * fy + 0.5;
      }
    }
  }
  return out;
}

/** Mask kotak 0..1 ukuran size x size: 1 di tengah, turun halus ke 0 di tepi (feather = fraksi tepi). */
export function boxMask(size, feather = 0.15) {
  const m = new Float32Array(size * size);
  const edge = Math.max(1, Math.round(size * feather));
  for (let y = 0; y < size; y++) {
    const ky = Math.min(1, Math.min(y, size - 1 - y) / edge);
    for (let x = 0; x < size; x++) {
      const kx = Math.min(1, Math.min(x, size - 1 - x) / edge);
      m[y * size + x] = Math.min(kx, ky);
    }
  }
  return m;
}

/**
 * Tempel crop wajah hasil enhance ke gambar asli.
 * @param {Buffer} base      RGB asli (W x H), DIMODIFIKASI in-place
 * @param {Buffer} crop      RGB crop wajah hasil model (size x size)
 * @param {Float32Array} mask mask crop (size x size)
 * @param {number[]} m       affine ASLI→CROP (hasil estimateSimilarity)
 * @param {number} strength  0..1 — seberapa kuat hasil model menimpa asli (blend akhir)
 */
export function pasteBack(base, W, H, crop, size, mask, m, strength = 1) {
  const inv = invertAffine(m); // CROP→ASLI tidak kita pakai langsung; kita sampling crop dari koordinat asli via m
  void inv;
  // bounding box area yang tersentuh crop di koordinat asli
  const inv2 = invertAffine(m);
  const corners = [[0, 0], [size, 0], [0, size], [size, size]].map(([x, y]) => applyAffine(inv2, x, y));
  const x1 = Math.max(0, Math.floor(Math.min(...corners.map((c) => c[0]))));
  const y1 = Math.max(0, Math.floor(Math.min(...corners.map((c) => c[1]))));
  const x2 = Math.min(W, Math.ceil(Math.max(...corners.map((c) => c[0]))));
  const y2 = Math.min(H, Math.ceil(Math.max(...corners.map((c) => c[1]))));
  for (let y = y1; y < y2; y++) {
    for (let x = x1; x < x2; x++) {
      const [u, v] = applyAffine(m, x, y); // posisi piksel asli di dalam crop
      if (u < 0 || v < 0 || u > size - 1 || v > size - 1) continue;
      const cx0 = Math.floor(u), cy0 = Math.floor(v);
      const cx1 = Math.min(size - 1, cx0 + 1), cy1 = Math.min(size - 1, cy0 + 1);
      const fx = u - cx0, fy = v - cy0;
      const mk = (mask[cy0 * size + cx0] * (1 - fx) + mask[cy0 * size + cx1] * fx) * (1 - fy)
        + (mask[cy1 * size + cx0] * (1 - fx) + mask[cy1 * size + cx1] * fx) * fy;
      const a = Math.min(1, Math.max(0, mk)) * strength;
      if (a <= 0) continue;
      const o = (y * W + x) * 3;
      for (let c = 0; c < 3; c++) {
        const p = ((crop[(cy0 * size + cx0) * 3 + c] * (1 - fx) + crop[(cy0 * size + cx1) * 3 + c] * fx) * (1 - fy)
          + (crop[(cy1 * size + cx0) * 3 + c] * (1 - fx) + crop[(cy1 * size + cx1) * 3 + c] * fx) * fy);
        base[o + c] = base[o + c] * (1 - a) + p * a + 0.5;
      }
    }
  }
}

/** IoU dua kotak [x1,y1,x2,y2]. */
function iou(a, b) {
  const ix = Math.max(0, Math.min(a[2], b[2]) - Math.max(a[0], b[0]));
  const iy = Math.max(0, Math.min(a[3], b[3]) - Math.max(a[1], b[1]));
  const inter = ix * iy;
  const ua = (a[2] - a[0]) * (a[3] - a[1]) + (b[2] - b[0]) * (b[3] - b[1]) - inter;
  return ua > 0 ? inter / ua : 0;
}

/** NMS: balikin indeks yang dipertahankan, urut skor menurun. */
export function nms(boxes, scores, iouThreshold = 0.4) {
  const order = scores.map((s, i) => i).sort((i, j) => scores[j] - scores[i]);
  const keep = [];
  for (const i of order) {
    if (keep.every((k) => iou(boxes[i], boxes[k]) < iouThreshold)) keep.push(i);
  }
  return keep;
}

/**
 * Decode output SCRFD (format InsightFace, dipakai FaceFusion).
 * @param {Array<{data:Float32Array,dims:number[]}>} outs 9 tensor: [skor x3, kotak x3, landmark x3] per stride 8,16,32
 * @param {number} detW,detH  ukuran kanvas input detektor (mis. 640)
 * @param {number} scoreThreshold
 * @returns {{boxes:number[][], scores:number[], landmarks:number[][][]}} koordinat di ruang kanvas detektor
 */
export function scrfdDecode(outs, detW, detH, scoreThreshold = 0.5) {
  const strides = [8, 16, 32];
  const anchorTotal = 2;
  const boxes = [], scores = [], landmarks = [];
  strides.forEach((stride, idx) => {
    const sc = outs[idx].data, bb = outs[idx + 3].data, lm = outs[idx + 6].data;
    const gw = Math.floor(detW / stride), gh = Math.floor(detH / stride);
    // urutan anchor FaceFusion: for x in cols? → mgrid[:w,:h] lalu stack(y,x): indeks = (row-major di sumbu x dulu)
    // create_static_anchors: x,y = mgrid[:w,:h]; anchors = stack((y,x)) → shape (w,h,2) dgn [y_idx, x_idx]
    // lalu dikali stride dan di-reshape (-1,2), tiap anchor digandakan anchorTotal kali.
    let k = 0;
    for (let xi = 0; xi < gw; xi++) {
      for (let yi = 0; yi < gh; yi++) {
        const ax = yi * stride; // kolom pertama = y_idx*stride (sesuai stack((y,x)))
        const ay = xi * stride;
        for (let a = 0; a < anchorTotal; a++, k++) {
          const s = sc[k];
          if (s < scoreThreshold) continue;
          const d = [bb[k * 4] * stride, bb[k * 4 + 1] * stride, bb[k * 4 + 2] * stride, bb[k * 4 + 3] * stride];
          boxes.push([ax - d[0], ay - d[1], ax + d[2], ay + d[3]]);
          scores.push(s);
          const pts = [];
          for (let p = 0; p < 5; p++) pts.push([ax + lm[k * 10 + p * 2] * stride, ay + lm[k * 10 + p * 2 + 1] * stride]);
          landmarks.push(pts);
        }
      }
    }
  });
  return { boxes, scores, landmarks };
}
