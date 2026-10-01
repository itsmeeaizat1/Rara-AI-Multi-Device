// RARA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// spybelanja — Shopping Spy AI (ide fitur no 6, 12 Sep 2026):
//   * reply screenshot produk Shopee/Tokopedia/marketplace → AI baca
//     nama produk + harga + toko + rating, terus nyari harga pasar di web
//     (rara-websearch), bandingin + verdict WORTH IT atau gak
//   * .spybelanja <nama produk> → mode teks: nyari harga pasar + verdict
//   * degrade: search gagal → verdict dari pengetahuan AI + catatan;
//     AI gagal → digest lokal (list hasil search)

import { visionScan } from "../../src/lib/rara-vision-chain.js";
import { aiChainChat } from "../../src/lib/rara-ai-fallback.js";
import { raraWrap, raraCaption, tipText, toSC } from "../../src/lib/rara-menu-style.js";
import { searchWeb } from "../../src/lib/rara-websearch.js";
import te from "../../src/lib/rara-error.js";

const pluginConfig = {
  name: "spybelanja",
  alias: ["spybelanja", "shopspy", "belanjaai"],
  category: "ai",
  description: "Shopping Spy AI — cek harga produk dari screenshot/nama, bandingin harga pasar + verdict",
  usage: ".spybelanja (reply screenshot produk)\n.spybelanja <nama produk>",
  example: ".spybelanja (reply screenshot shopee)\n.spybelanja minyak goreng 2 liter",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 8,
  energi: 1,
  isEnabled: true,
};

// ── Prompt vision: baca screenshot produk ──
function productPrompt() {
  return `Baca screenshot produk/marketplace di gambar ini (Shopee, Tokopedia, Lazada, TikTok Shop, dll).

Balas HANYA JSON valid (tanpa penjelasan, tanpa markdown):
{"produk":"nama lengkap produk","harga":angka,"toko":"nama toko/brand penjual","rating":angka,"ulasan":angka,"catatan":"detail singkat"}

Aturan:
- produk = nama produk lengkap sesuai yang tertulis (maksimal 80 karakter).
- harga = harga dalam angka rupiah murni (Rp149.000 → 149000). Kalau gak ada, isi 0.
- toko = nama toko penjual, kalau gak ada isi string kosong.
- rating = rating bintang (contoh 4.9), kalau gak ada isi 0.
- ulasan = jumlah ulasan/terjual dalam angka, kalau gak ada isi 0.
- catatan = varian/gratis ongkir/diskan info penting lain, maksimal 1 kalimat, kalau gak ada isi string kosong.
- Kalau gambar BUKAN screenshot produk/marketplace, isi produk "BUKAN_PRODUK" dan sisanya kosong.`;
}

// ── Parse JSON dari jawaban AI ──
function parseJson(raw, { needProduct = true } = {}) {
  if (!raw || typeof raw !== "string") return null;
  const txt = raw.replace(/```(json)?/gi, "");
  const a = txt.indexOf("{");
  const b = txt.lastIndexOf("}");
  if (a === -1 || b === -1 || b <= a) return null;
  try {
    const obj = JSON.parse(txt.slice(a, b + 1));
    const produk = String(obj.produk || "").trim().slice(0, 80);
    if (needProduct && (!produk || produk.toUpperCase() === "BUKAN_PRODUK")) return null;
    return {
      produk: produk || "",
      harga: Math.max(0, Math.round(Number(obj.harga) || 0)),
      toko: String(obj.toko || "").slice(0, 40),
      rating: Math.max(0, Number(obj.rating) || 0),
      ulasan: Math.max(0, Math.round(Number(obj.ulasan) || 0)),
      catatan: String(obj.catatan || "").slice(0, 120),
      isProduct: produk.toUpperCase() !== "BUKAN_PRODUK",
    };
  } catch { return null; }
}

// ── Prompt verdict: bandingin harga ──
function verdictPrompt({ produk, hargaSatu, toko, hasil }) {
  const pasar = hasil.map((h, i) => `[${i + 1}] ${h.title} — ${(h.snippet || "").slice(0, 140)}`).join("\n");
  return `Kamu Shopping Spy — analis harga belanja Indonesia. Analisis harga untuk: "${produk}"
${hargaSatu ? `Harga di screenshot (${toko || "toko"}): Rp${hargaSatu.toLocaleString("id-ID")}\n` : "Harga acuan: belum ada (pembeli cuma nanya harga pasar).\n"}
Hasil pencarian harga di web:
${pasar || "(data pencarian kosong)"}

Balas HANYA JSON valid (tanpa penjelasan, tanpa markdown):
{"hargaMin":angka,"hargaMax":angka,"verdict":"WORTH IT / MURAH / WAJAR / MAHAL / TUNGGU DISKON","analisis":"analisis perbandingan harga","tips":"saran belanja","alternatif":"alternatif lebih hemat"}

Aturan:
- hargaMin & hargaMax = range harga pasar realistis untuk produk itu (angka rupiah murni) berdasarkan hasil pencarian + pengetahuan harga pasaran Indonesia. Kalau data minim, estimasi wajar.
- verdict: WORTH IT (harga ≤ pasar), MURAH (jauh di bawah pasar), WAJAR (pas), MAHAL (di atas pasar), TUNGGU DISKON (harga pas-pasan, lebih baik nunggu momen diskon).
- analisis maksimal 3 kalimat: bandingin harga screenshot vs pasar, sebut rentang harganya.
- tips maksimal 2 kalimat (voucher/cashback/flash sale/toko lain).
- alternatif = produk serupa yang lebih hemat (1 frasa singkat), kalau gak ada isi "gak ada, produk ini udah oke".`;
}

function parseVerdict(raw) {
  if (!raw || typeof raw !== "string") return null;
  const txt = raw.replace(/```(json)?/gi, "");
  const a = txt.indexOf("{");
  const b = txt.lastIndexOf("}");
  if (a === -1 || b === -1 || b <= a) return null;
  try {
    const obj = JSON.parse(txt.slice(a, b + 1));
    const VERDICTS = ["WORTH IT", "MURAH", "WAJAR", "MAHAL", "TUNGGU DISKON"];
    const verdict = VERDICTS.includes(String(obj.verdict || "").toUpperCase()) ? String(obj.verdict).toUpperCase() : "WAJAR";
    const hargaMin = Math.max(0, Math.round(Number(obj.hargaMin) || 0));
    const hargaMax = Math.max(hargaMin, Math.round(Number(obj.hargaMax) || 0));
    return {
      hargaMin, hargaMax, verdict,
      analisis: String(obj.analisis || "").slice(0, 400),
      tips: String(obj.tips || "").slice(0, 240),
      alternatif: String(obj.alternatif || "").slice(0, 120),
    };
  } catch { return null; }
}

const rp = (n) => `Rp${Math.round(Number(n) || 0).toLocaleString("id-ID")}`;
const verdictEmoji = { "WORTH IT": "✅", MURAH: "🎉", WAJAR: "⚖", MAHAL: "⚠", "TUNGGU DISKON": "🕒" };

// ── Seam e2e ──
let depVision = visionScan;
let depAi = aiChainChat;
let depSearch = searchWeb;
export function _setSpyDepsForTest({ vision, ai, search } = {}) {
  depVision = vision || visionScan;
  depAi = ai || aiChainChat;
  depSearch = search || searchWeb;
}

async function handler(m, { sock, config: botConfig }) {
  const prefix = botConfig.command?.prefix || ".";
  try {
    const isPhoto = (m.quoted && m.quoted.isImage) || m.isImage;
    const textInput = (m.text || "").trim();
    if (!isPhoto && !textInput) {
      const guide = raraCaption({
        emoji: "🛒",
        name: "spybelanja",
        description: "Shopping Spy AI — cek harga & verdict sebelum checkout",
        usage: `${prefix}spybelanja (reply screenshot produk)\n${prefix}spybelanja <nama produk>`,
        example: `${prefix}spybelanja (reply screenshot shopee)\n${prefix}spybelanja minyak goreng 2 liter`,
      }) + "\n" + tipText(`Jangan checkout dulu — spy dulu, hemat kelakuan`);
      return m.reply(guide, "spybelanja");
    }

    await m.react("🧠");

    // ── 1. baca produk (foto atau teks) ──
    let product = null;
    if (isPhoto) {
      const buffer = m.quoted?.isImage ? await m.quoted.download() : await m.download();
      if (!buffer || !buffer.length) {
        await m.react("❌");
        return m.reply(raraWrap("spybelanja", "Gagal download gambar. Coba kirim ulang.", "error"));
      }
      const res = await depVision({ imageBuffer: buffer, question: productPrompt(), sessionKey: null })
        .catch((e) => ({ status: false, error: e.message }));
      if (!res?.status) {
        await m.react("❌");
        return m.reply(raraWrap("spybelanja", res?.error || "Gagal membaca gambar", "error"));
      }
      const parsed = parseJson(res.text);
      if (!parsed || !parsed.isProduct) {
        await m.react("❌");
        return m.reply(raraWrap("spybelanja", "Gak kedeteksi produk marketplace di gambarnya. Screenshot halaman produk Shopee/Tokopedia ya.", "error"));
      }
      product = { ...parsed, fromPhoto: true };
    } else {
      product = { produk: textInput.slice(0, 80), harga: 0, toko: "", rating: 0, ulasan: 0, catatan: "", fromPhoto: false };
    }

    await m.react("🔍");

    // ── 2. nyari harga pasar ──
    let hasil = [];
    let searchNote = "";
    try {
      const q = `harga ${product.produk}`;
      const r = await depSearch(q, { limit: 10 });
      if (r?.items?.length) hasil = r.items.slice(0, 10).map((x) => ({ title: String(x.title || "").slice(0, 90), snippet: String(x.snippet || x.desc || "").slice(0, 160), url: x.url }));
      else searchNote = r?.error || "";
    } catch (e) { searchNote = e.message; }

    // ── 3. verdict AI ──
    await m.react("🧠");
    let verdict = null;
    try {
      verdict = parseVerdict(await depAi(verdictPrompt({ produk: product.produk, hargaSatu: product.harga, toko: product.toko, hasil })));
    } catch {}

    await m.react("🐣");

    // ── 4. susun kartu ──
    let msg = `🛒 *SHOPPING SPY — ${product.produk}*\n\n`;
    if (product.fromPhoto) {
      msg += `📸 *Dari screenshot:*\n` +
        `💰 Harga: ${product.harga ? rp(product.harga) : "-"}\n` +
        `🏪 Toko: ${product.toko || "-"}\n` +
        `⭐ Rating: ${product.rating || "-"}${product.ulasan ? ` (${product.ulasan.toLocaleString("id-ID")} ulasan/terjual)` : ""}\n`;
      if (product.catatan) msg += `📝 ${product.catatan}\n`;
      msg += `\n`;
    }
    if (verdict) {
      msg += `🌐 *Harga pasar:* ${verdict.hargaMin ? `${rp(verdict.hargaMin)} - ${rp(verdict.hargaMax)}` : "estimasi AI"}\n` +
        `${verdictEmoji[verdict.verdict] || "⚖"} *VERDICT: ${verdict.verdict}*\n\n` +
        `💬 ${verdict.analisis}\n`;
      if (verdict.tips) msg += `\n💡 ${verdict.tips}\n`;
      if (verdict.alternatif && !/gak ada/.test(verdict.alternatif.toLowerCase())) msg += `🔁 Alternatif hemat: ${verdict.alternatif}\n`;
      if (!hasil.length) msg += `\n⚠ ${toSC("harga pasar gak keverifikasi dari pencarian — estimasi murni dari AI")}\n`;
    } else if (hasil.length) {
      // AI gagal → digest lokal
      msg += `🌐 *Harga pasar dari pencarian:*\n` + hasil.slice(0, 5).map((h, i) => `${i + 1}. ${h.title}\n   ${(h.snippet || "").slice(0, 90)}`).join("\n") + `\n\n⚖ Belum bisa verdict final — data mentah di atas, cek sendiri ya.`;
    } else {
      await m.react("❌");
      return m.reply(raraWrap("spybelanja", "Pencarian harga dan AI-nya lagi sibuk barengan. Coba lagi bentar ya.", "error"));
    }
    if (hasil.length) {
      msg += `\n📎 ${toSC("sumber")}: ${hasil.length} ${toSC("hasil pencarian")}${searchNote ? ` (${toSC("sebagian engine gagal")})` : ""}`;
    }
    return m.reply(msg);
  } catch (err) {
    console.error("spybelanja error:", err);
    await m.react("❌");
    return m.reply(raraWrap("spybelanja", te.raraError(err) || "Gagal memproses", "error"));
  }
}

export { pluginConfig as config, handler, parseJson, parseVerdict };
