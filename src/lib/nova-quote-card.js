// NOVA QUOTE CARD — kartu quote estetik canvas untuk keluarga .quotes*
// (6 plugin yang reply-nya cuma teks polos "…").
// Request owner 13 Sep 2026: "fitur yg polos dicek trus di variasi agar
// menarik" — batch 3: quotes jadi KARTU GAMBAR estetik ala quote-post.
// @napi-rs/canvas, 1080x1350, gradient per kategori + orb dekoratif,
// teks auto-wrap + auto-shrink, fail-safe: caller fallback ke teks.
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FONT_DIR = path.resolve(__dirname, "../../assets/fonts");

let _fontsReady = false;
async function _ensureFonts() {
  if (_fontsReady) return;
  const { GlobalFonts } = await import("@napi-rs/canvas");
  GlobalFonts.registerFromPath(path.join(FONT_DIR, "Anton.ttf"), "Anton");
  GlobalFonts.registerFromPath(path.join(FONT_DIR, "Roboto_Medium.ttf"), "Roboto_Medium");
  _fontsReady = true;
}

// Palet per kategori: [atas, bawah] gradient + accent + warna author
const PALETTES = {
  bijak:  { g: ["#1a1a2e", "#16213e"], accent: "#e94560", label: "quotes bijak" },
  bucin:  { g: ["#42275a", "#734b6d"], accent: "#ffd1dc", label: "quotes bucin" },
  galau:  { g: ["#232526", "#414345"], accent: "#a8c0ff", label: "quotes galau" },
  gombal: { g: ["#41295a", "#2f0743"], accent: "#ff9a8b", label: "quotes gombal" },
  anime:  { g: ["#0f2027", "#2c5364"], accent: "#f6d365", label: "quotes anime" },
  chat:   { g: ["#134e5e", "#71b280"], accent: "#ffffff", label: "quotechat" },
};

// Orb dekoratif acak biar tiap kartu beda (seed = random tiap render)
function _orbs(ctx, W, H, accent, seed) {
  let s = seed;
  const rnd = () => { s = (s * 9301 + 49297) % 233280; return s / 233280; };
  for (let i = 0; i < 5; i++) {
    const r = 120 + rnd() * 260;
    const x = rnd() * W;
    const y = rnd() * H;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = i % 2 === 0 ? "rgba(255,255,255,0.045)" : _hexA(accent, 0.07);
    ctx.fill();
  }
}

function _hexA(hex, a) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

// Word-wrap + auto-shrink: cari ukuran font yang muat di kotak teks
function _wrap(ctx, text, maxW, maxLines, fontSizes, fontFamily) {
  for (const size of fontSizes) {
    ctx.font = `${size}px ${fontFamily}`;
    const words = String(text).split(/\s+/);
    const lines = [];
    let cur = "";
    for (const w of words) {
      const test = cur ? cur + " " + w : w;
      if (ctx.measureText(test).width <= maxW || !cur) cur = test;
      else { lines.push(cur); cur = w; }
    }
    if (cur) lines.push(cur);
    if (lines.length <= maxLines) return { lines, size };
  }
  // gak muat juga → potong paling mentok
  ctx.font = `${fontSizes[fontSizes.length - 1]}px ${fontFamily}`;
  const words = String(text).split(/\s+/);
  const lines = [];
  let cur = "";
  for (const w of words) {
    const test = cur ? cur + " " + w : w;
    if (ctx.measureText(test).width <= maxW || !cur) cur = test;
    else { lines.push(cur); cur = w; }
    if (lines.length === maxLines) { lines[maxLines - 1] += "…"; return { lines, size: fontSizes[fontSizes.length - 1] }; }
  }
  if (cur) lines.push(cur);
  return { lines, size: fontSizes[fontSizes.length - 1] };
}

/**
 * Render kartu quote PNG.
 * @param {object} opts { quote, author?, category?, brand? }
 * @returns {Promise<Buffer>} PNG buffer
 */
export async function renderQuoteCard({ quote, author = "", category = "chat", brand = "nova ai" }) {
  await _ensureFonts();
  const { createCanvas } = await import("@napi-rs/canvas");
  const { smallcapsText } = await import("./styler.js");

  const W = 1080, H = 1350;
  const pal = PALETTES[category] || PALETTES.chat;
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext("2d");

  // background gradient vertikal
  const g = ctx.createLinearGradient(0, 0, W * 0.35, H);
  g.addColorStop(0, pal.g[0]);
  g.addColorStop(1, pal.g[1]);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  _orbs(ctx, W, H, pal.accent, Math.floor(Math.random() * 233280) + 1);

  // bingkai tipis
  ctx.strokeStyle = _hexA(pal.accent, 0.35);
  ctx.lineWidth = 3;
  const M = 56;
  ctx.strokeRect(M, M, W - M * 2, H - M * 2);

  // tanda kutip raksasa
  ctx.font = "300px Anton";
  ctx.fillStyle = _hexA(pal.accent, 0.28);
  ctx.textBaseline = "top";
  ctx.fillText("\u201C", M + 28, M + 24);

  // teks quote (auto-wrap + auto-shrink)
  const maxW = W - M * 2 - 100;
  const { lines, size } = _wrap(ctx, quote, maxW, 9, [56, 48, 42, 36], "Roboto_Medium");
  const lineH = Math.round(size * 1.42);
  const blockH = lines.length * lineH;
  let y = (H - blockH) / 2 - 40;
  ctx.font = `${size}px Roboto_Medium`;
  ctx.fillStyle = "#f5f5f7";
  lines.forEach((ln) => {
    ctx.fillText(ln, W / 2 - ctx.measureText(ln).width / 2, y);
    y += lineH;
  });

  // author (kalau ada) + garis aksen
  if (author) {
    ctx.font = "38px Roboto_Medium";
    const a = "— " + author;
    ctx.fillStyle = _hexA(pal.accent, 0.95);
    ctx.fillText(a, W / 2 - ctx.measureText(a).width / 2, y + 34);
  }

  // footer brand smallcaps (aturan smallcaps teks tampilan bot)
  ctx.font = "30px Roboto_Medium";
  const foot = smallcapsText(brand) + "  •  " + smallcapsText(pal.label);
  ctx.fillStyle = "rgba(255,255,255,0.55)";
  ctx.fillText(foot, W / 2 - ctx.measureText(foot).width / 2, H - M - 54);

  return canvas.toBuffer("image/png");
}
