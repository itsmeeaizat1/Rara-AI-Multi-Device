// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
// rara-welcome-canvas.js — kartu canvas WELCOME/GOODBYE ditanam di PREVIEW
// (request owner 16 Sep 2026): digambar canvas → thumbnail → externalAdReply,
// BUKAN media langsung → gak bisa disimpan ke galeri.
//
// Welcome : "Selamat datang" + nama grup + foto user (circle) + nama user
//           + "member ke-X" + total member
// Goodbye : "Selamat tinggal" + foto profil yg keluar (circle) + nama user
//           + pesan apresiasi random buatan AI (fallback template)

import config from "../../config.js";

let _canvasLib = null;
async function _canvasKit() {
  if (_canvasLib) return _canvasLib;
  const mod = await import("@napi-rs/canvas");
  _canvasLib = { createCanvas: mod.createCanvas, loadImage: mod.loadImage };
  return _canvasLib;
}
/** seam test: inject kit canvas (atau null = pakai real) */
export function _setWelcomeCanvasKitForTest(kit) {
  _canvasLib = kit || null;
}

let _aiOverride = null;
/** seam test: inject fungsi apresiasi AI deterministik */
export function _setWelcomeCardAiForTest(fn) {
  _aiOverride = fn || null;
}

const APRESIASI_TEMPLATE = [
  "Terima kasih atas kehadiran dan ceritanya di sini.",
  "Semoga perjalanan selanjutnya lebih baik lagi.",
  "Kami menghargai setiap momen yang sudah dibagikan.",
  "Sampai jumpa lagi suatu hari nanti, semoga baik-baik saja.",
  "Semoga apa yang dicari cepat ditemukan di luar sana.",
];

/**
 * makeApresiasi — pesan apresiasi perpisahan buatan AI (rantai rara),
 * maks 20 dtk, gagal/lambat → null (pemanggil pakai template random).
 */
export async function makeApresiasi(name, groupName) {
  if (typeof _aiOverride === "function") {
    const v = await _aiOverride(name, groupName);
    return v ? String(v).slice(0, 110) : null;
  }
  try {
    const { aiChainChat } = await import("./rara-ai-fallback.js");
    const txt = await Promise.race([
      aiChainChat(
        `Buat SATU kalimat apresiasi singkat (maksimal 12 kata) untuk member bernama "${name}" yang keluar dari grup "${groupName}". ` +
          `Sopan, hangat, mengapresiasi kehadirannya. Tanpa emoji, tanpa tanda kutip. Balas HANYA kalimatnya.`,
        { persona: "Rara AI" },
      ),
      new Promise((_, rej) => setTimeout(() => rej(new Error("ai slow")), 20000)),
    ]);
    const clean = String(txt || "").split("\n")[0].replace(/["'`]/g, "").trim().slice(0, 90);
    if (clean) return clean;
  } catch (e) {
    console.error("welcome-canvas apresiasi ai error:", e.message);
  }
  return null;
}

/** apresiasi final: AI duluan, fallback template random (dipakai plugin + test) */
export async function apresiasiOrTemplate(name, groupName) {
  return (await makeApresiasi(name, groupName)) ||
    APRESIASI_TEMPLATE[Math.floor(Math.random() * APRESIASI_TEMPLATE.length)];
}

/** validasi buffer gambar via magic byte — loadImage @napi-rs native
 * SEGFAULT (bukan throw) kalau dikasih buffer bukan gambar, jadi WAJIB dicek */
function _looksLikeImage(buf) {
  if (!buf || buf.length < 12) return false;
  const b = buf;
  const png = b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47;
  const jpg = b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff;
  const gif = b[0] === 0x47 && b[1] === 0x49 && b[2] === 0x46;
  const webp = b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46
    && b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50;
  const bmp = b[0] === 0x42 && b[1] === 0x4d;
  return !!(png || jpg || gif || webp || bmp);
}

/** wrap teks ke baris-baris maks maxWidth */
function wrapText(ctx, text, maxWidth, maxLines = 2) {
  const words = String(text || "").split(/\s+/);
  const lines = [];
  let cur = "";
  for (const w of words) {
    const test = cur ? cur + " " + w : w;
    if (ctx.measureText(test).width <= maxWidth || !cur) cur = test;
    else { lines.push(cur); cur = w; if (lines.length >= maxLines) break; }
  }
  if (cur && lines.length < maxLines) lines.push(cur);
  return lines;
}

/**
 * _drawBase — background gradient + dekorasi lingkaran (tanpa network,
 * murni canvas → cepat & gak bisa gagal load di VPS/test)
 */
// REVISI 9 Okt (owner): desain ulang gaya promo telegram — clean, rata kiri,
// badge pill, teks Indonesia Title Case ("Selamat Datang!", BUKAN ALL CAPS).
function _roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function _glow(ctx, cx, cy, r, color) {
  const rg = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
  rg.addColorStop(0, color);
  rg.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = rg;
  ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
}

function _drawBase(ctx, width, height, glowTop, glowBottom) {
  // bg deep navy → indigo (vibe kartu promo telegram)
  const g = ctx.createLinearGradient(0, 0, width, height);
  g.addColorStop(0, "#0b1220");
  g.addColorStop(0.55, "#111a33");
  g.addColorStop(1, "#172554");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, width, height);
  // glow lembut sudut (halus, gak norak)
  _glow(ctx, width - 90, 80, 230, glowTop);
  _glow(ctx, 60, height - 50, 210, glowBottom);
}

// badge pill kiri-atas: "MEMBER BARU" / "MEMBER KELUAR"
function _drawBadge(ctx, text, accent) {
  ctx.font = "bold 17px sans-serif";
  const tw = ctx.measureText(text).width;
  const w = tw + 44, h = 38, x = 40, y = 34, r = 19;
  _roundRect(ctx, x, y, w, h, r);
  ctx.fillStyle = "rgba(255, 255, 255, 0.08)";
  ctx.fill();
  ctx.strokeStyle = accent + "66";
  ctx.lineWidth = 1.5;
  _roundRect(ctx, x, y, w, h, r);
  ctx.stroke();
  // titik aksen kecil di dalam pill (accent label)
  ctx.fillStyle = accent;
  ctx.beginPath(); ctx.arc(x + 22, y + h / 2, 4, 0, Math.PI * 2); ctx.fill();
  ctx.textAlign = "left"; ctx.textBaseline = "middle";
  ctx.fillStyle = "#ffffff";
  ctx.fillText(text, x + 34, y + h / 2 + 1);
}

// judul Indonesia Title Case + subtitle grup + garis aksen pendek
function _drawHeading(ctx, title, subtitle, accent, subColor) {
  ctx.textAlign = "left"; ctx.textBaseline = "alphabetic";
  ctx.shadowColor = "rgba(0, 0, 0, 0.7)";
  ctx.shadowBlur = 6;
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 46px sans-serif";
  ctx.fillText(title, 40, 156);
  ctx.shadowBlur = 0;
  ctx.fillStyle = subColor;
  ctx.font = "italic 22px sans-serif";
  ctx.fillText(subtitle, 40, 196);
  const ga = ctx.createLinearGradient(40, 0, 260, 0);
  ga.addColorStop(0, accent);
  ga.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = ga;
  ctx.fillRect(40, 212, 220, 3);
}

function _drawWatermark(ctx, width, height) {
  ctx.textAlign = "left"; ctx.textBaseline = "alphabetic";
  ctx.fillStyle = "rgba(255, 255, 255, 0.35)";
  ctx.font = "12px sans-serif";
  ctx.fillText("RARA AI - MULTI DEVICE", 40, height - 18);
  ctx.textAlign = "right";
  ctx.fillStyle = "rgba(255, 255, 255, 0.22)";
  ctx.fillText("Aizat", width - 40, height - 18);
  ctx.textAlign = "left";
}

/**
 * _drawAvatar — foto profil CIRCLE (request owner): clip lingkaran, cover-fit.
 * ppBuffer null / rusak → avatar inisial nama (tetap keren, gak pernah gagal).
 */
async function _drawAvatar(ctx, loadImage, ppBuffer, cx, cy, r, name) {
  // lingkaran dasar gradient + inisial (fallback bawaan)
  const g = ctx.createLinearGradient(cx - r, cy - r, cx + r, cy + r);
  g.addColorStop(0, "#00f2ff");
  g.addColorStop(1, "#7b2ff7");
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#0b0b1a";
  ctx.font = `italic bold ${Math.round(r * 0.85)}px sans-serif`;
  ctx.textAlign = "center"; ctx.textBaseline = "middle";
  const initial = String(name || "?").trim().charAt(0).toUpperCase() || "?";
  ctx.fillText(initial, cx, cy + 2);

  if (ppBuffer && _looksLikeImage(ppBuffer)) {
    try {
      const img = await loadImage(ppBuffer);
      ctx.save();
      ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.clip();
      const ratio = Math.max((r * 2) / img.width, (r * 2) / img.height);
      const dw = img.width * ratio, dh = img.height * ratio;
      ctx.drawImage(img, cx - dw / 2, cy - dh / 2, dw, dh);
      ctx.restore();
    } catch (e) {
      console.error("welcome-canvas pp load error:", e.message);
    }
  }
  // ring putih + glow cyan
  ctx.strokeStyle = "rgba(255,255,255,0.9)";
  ctx.lineWidth = 5;
  ctx.beginPath(); ctx.arc(cx, cy, r + 4, 0, Math.PI * 2); ctx.stroke();
  ctx.strokeStyle = "rgba(0,242,255,0.35)";
  ctx.lineWidth = 3;
  ctx.beginPath(); ctx.arc(cx, cy, r + 9, 0, Math.PI * 2); ctx.stroke();
  ctx.textAlign = "left"; ctx.textBaseline = "alphabetic";
}

/**
 * generateWelcomeCard — kartu promo telegram (revisi owner 9 Okt 2026):
 * "Selamat Datang!" Title Case (bukan ALL CAPS), badge pill MEMBER BARU,
 * rata kiri, foto circle + nama + member ke-X + total member. 800x450 PNG.
 */
export async function generateWelcomeCard({ groupName, ppBuffer, name, memberKe, totalMember }) {
  const { createCanvas, loadImage } = await _canvasKit();
  const width = 800, height = 450;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext("2d");
  const accent = "#22d3ee";
  _drawBase(ctx, width, height, "rgba(34, 211, 238, 0.20)", "rgba(59, 130, 246, 0.14)");
  _drawBadge(ctx, "MEMBER BARU", accent);
  _drawHeading(ctx, "Selamat Datang!", "di " + String(groupName || "Grup").slice(0, 40), accent, "#7dd3fc");

  // profil kiri + info kanan (rata kiri, terstruktur ala kartu promo)
  await _drawAvatar(ctx, loadImage, ppBuffer, 116, 322, 62, name);
  ctx.textAlign = "left"; ctx.textBaseline = "middle";
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 30px sans-serif";
  ctx.fillText(String(name || "Member Baru").slice(0, 26), 214, 306);
  ctx.fillStyle = "rgba(255, 255, 255, 0.78)";
  ctx.font = "20px sans-serif";
  ctx.fillText(
    `Member ke-${memberKe ?? "-"}  •  Total ${totalMember ?? "-"} member`,
    214, 342,
  );
  ctx.textBaseline = "alphabetic";
  _drawWatermark(ctx, width, height);
  return canvas.toBuffer("image/png");
}

/**
 * generateGoodbyeCard — kartu promo telegram (revisi owner 9 Okt 2026):
 * "Sampai Jumpa!" Title Case, badge pill MEMBER KELUAR, rata kiri, foto
 * circle + nama + pesan apresiasi AI. 800x450 PNG buffer.
 */
export async function generateGoodbyeCard({ groupName, ppBuffer, name, apresiasi }) {
  const { createCanvas, loadImage } = await _canvasKit();
  const width = 800, height = 450;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext("2d");
  const accent = "#fb7185";
  _drawBase(ctx, width, height, "rgba(251, 113, 133, 0.18)", "rgba(168, 85, 247, 0.12)");
  _drawBadge(ctx, "MEMBER KELUAR", accent);
  _drawHeading(ctx, "Sampai Jumpa!", "dari " + String(groupName || "Grup").slice(0, 40), accent, "#fda4af");

  // profil kiri + nama & pesan apresiasi kanan
  await _drawAvatar(ctx, loadImage, ppBuffer, 116, 322, 62, name);
  ctx.textAlign = "left"; ctx.textBaseline = "middle";
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 30px sans-serif";
  ctx.fillText(String(name || "Member").slice(0, 26), 214, 296);
  ctx.fillStyle = "rgba(255, 255, 255, 0.72)";
  ctx.font = "italic 19px sans-serif";
  const lines = wrapText(ctx, apresiasi, 540, 2);
  lines.forEach((ln, i) => ctx.fillText(ln, 214, 336 + i * 26));
  ctx.textBaseline = "alphabetic";
  _drawWatermark(ctx, width, height);
  return canvas.toBuffer("image/png");
}
