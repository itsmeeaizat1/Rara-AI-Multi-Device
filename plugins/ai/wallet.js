// RARA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// dompet — Dompet AI (ide fitur no 1, 12 Sep 2026):
//   * .dompet <bahasa natural> → catat pemasukan/pengeluaran (parser lokal,
//     kalau nominal gak ketemu → AI parse), auto kategori + saldo
//   * reply foto struk/nota → AI vision baca transaksi (items + total)
//   * .dompet saldo          → saldo, arus kas bulan ini, progres budget
//   * .dompet log [hari|minggu|bulan]
//   * .dompet laporan [minggu|bulan] → rekap + breakdown kategori + chart PNG + insight AI
//   * .dompet budget <jumlah> → set budget bulanan (warning saat >=80%)
//   * .dompet hapus | .dompet reset | .dompet kategori
// Penyimpanan: user.dompet { budget, entries[] } — saldo selalu dihitung dari
// entries (sum masuk - keluar) biar gak pernah nyelisih.

import { visionScan } from "../../src/lib/rara-vision-chain.js";
import { aiChainChat } from "../../src/lib/rara-ai-fallback.js";
import { raraWrap, raraCaption, tipText, toSC } from "../../src/lib/rara-menu-style.js";
import { getDatabase } from "../../src/lib/rara-database.js";
import { renderChart } from "../tools/chart.js";
import te from "../../src/lib/rara-error.js";

const pluginConfig = {
  name: "dompet",
  alias: ["dompet", "dompetai", "aiwallet"],
  category: "ai",
  description: "Dompet AI — catat pemasukan/pengeluaran via teks natural/foto struk + saldo + budget",
  usage: ".dompet makan siang 25rb\n.dompet (reply foto struk)\n.dompet saldo\n.dompet log | laporan\n.dompet budget 2000000\n.dompet hapus | reset | kategori",
  example: ".dompet gajian 5jt\n.dompet belanja skincare 150rb\n.dompet (reply foto nota)",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 8,
  energi: 1,
  isEnabled: true,
};

const EXPENSE_CATS = ["makan", "transport", "belanja", "hiburan", "tagihan", "kesehatan", "pendidikan", "lainnya"];
const INCOME_CATS = ["gaji", "bonus", "hadiah", "usaha", "lainnya"];

const CAT_KEYWORDS = {
  makan: ["makan", "minum", "kopi", "nasi", "ayam", "soto", "bakso", "warteg", "katering", "sarapan", "brunch", "mie", "seblak", "seblak", "gofood", "grabfood", "jajan", "sushi", "pizza", "burger", "warteg", "bubur", "sate"],
  transport: ["gojek", "grab", "ojol", "bensin", "tol", "parkir", "kereta", "bus", "taksi", "angkot", "krl", "mrt", "pertalite", "pertamax", "solar", "gokid"],
  belanja: ["belanja", "shopee", "tokopedia", "lazada", "tiktok shop", "baju", "sepatu", "skincare", "makeup", "groceries", "indomaret", "alfamart", "sabun", "shampoo", "tas"],
  hiburan: ["nonton", "bioskop", "cgv", "xxi", "cinema", "game", "topup", "ml ", "diamond", "netflix", "spotify", "disney", "steam", "pubg", "genshin", "spotify", "youtube premium", "karaoke"],
  tagihan: ["listrik", "pulsa", "wifi", "internet", "token", "cicilan", "kredit", "bpjs", "iuran", "kontrakan", "sewa", "kos", "kosan", "pdam", "gas", "langganan"],
  kesehatan: ["obat", "dokter", "rumah sakit", "apotek", "vitamin", "klinik", "berobat", "periksa", "lab", "vaksin", "suplemen"],
  pendidikan: ["buku", "kursus", "les", "ukt", "spp", "sekolah", "kuliah", "seminar", "workshop", "atp", "pelatihan"],
  gaji: ["gajian", "gaji", "salary", "upah"],
  bonus: ["bonus", "thr", "insentif", "komisi"],
  hadiah: ["hadiah", "kado", "amplop"],
  usaha: ["usaha", "penjualan", "jual", "untung", "cuan", "omzet", "bagi hasil", "komisi jual"],
};
const INCOME_HINTS = ["gajian", "gaji", "terima", "dapet", "dapat", "bonus", "thr", "hadiah", "kado", "penjualan", "jual", "untung", "cuan", "refund", "transfer masuk", "bagi hasil", "bayaran", "imbal", "salary", "upah"];

// ── Parser nominal lokal ──
function parseAmount(input) {
  const t = String(input || "").toLowerCase().replace(/rp\s?/g, " ").trim();
  let m = t.match(/(\d+(?:[.,]\d+)?)\s*(jt|juta)/);
  if (m) return Math.round(parseFloat(m[1].replace(",", ".")) * 1_000_000);
  m = t.match(/(\d+(?:[.,]\d+)?)\s*(rb|ribu|k)\b/);
  if (m) return Math.round(parseFloat(m[1].replace(",", ".")) * 1000);
  m = t.match(/(\d{1,3}(?:[.,]\d{3})+|\d{4,})/);
  if (m) {
    const raw = m[1];
    if (/[.,]\d{3}(?:[.,]\d{3})*$/.test(raw)) return parseInt(raw.replace(/[.,]/g, ""), 10);
    return parseInt(raw, 10);
  }
  m = t.match(/(\d+)/);
  return m ? parseInt(m[1], 10) : 0;
}

// nama toko/retail → belanja (dicek duluan biar "Indomie" di struk Indomaret gak nyasar ke makan)
const STORE_HINTS = ["indomaret", "alfamart", "shopee", "tokopedia", "lazada", "supermarket", "hypermarket", "carrefour", "giant", "ritel"];

function detectCat(text, type) {
  const t = String(text || "").toLowerCase();
  if (type === "keluar" && STORE_HINTS.some((s) => t.includes(s))) return "belanja";
  // income cats dicek duluan biar "gajian" gak nyasar
  for (const c of ["gaji", "bonus", "hadiah", "usaha", "makan", "transport", "belanja", "hiburan", "tagihan", "kesehatan", "pendidikan"]) {
    for (const kw of CAT_KEYWORDS[c] || []) {
      if (t.includes(kw)) return c;
    }
  }
  return type === "masuk" ? "lainnya" : "lainnya";
}

function detectType(text) {
  const t = String(text || "").toLowerCase();
  return INCOME_HINTS.some((k) => t.includes(k)) ? "masuk" : "keluar";
}

function cleanDesc(text) {
  let d = String(text || "")
    .replace(/\d+(?:[.,]\d+)?\s*(jt|juta|rb|ribu|k)\b/gi, "")
    .replace(/\d{1,3}(?:[.,]\d{3})+/g, "")
    .replace(/\b\d{4,}\b/g, "")
    .replace(/\brp\b/gi, "")
    .replace(/\s+/g, " ").trim();
  return (d || String(text || "").trim()).slice(0, 60);
}

// ── Parser lokal gabungan — null kalau nominal gak ketemu ──
function parseLocal(text) {
  const amount = parseAmount(text);
  if (!amount || amount < 100) return null;
  const type = detectType(text);
  const cat = detectCat(text, type);
  return { type, amount, cat, desc: cleanDesc(text) };
}

// ── Parse JSON dari jawaban AI ──
function parseAiEntry(text) {
  if (!text || typeof text !== "string") return null;
  let raw = text.replace(/```(json)?/gi, "").trim();
  const s = raw.indexOf("{");
  const e = raw.lastIndexOf("}");
  if (s === -1 || e === -1 || e <= s) return null;
  try {
    const obj = JSON.parse(raw.slice(s, e + 1));
    const amount = Math.round(Number(obj.amount));
    const type = obj.type === "masuk" ? "masuk" : "keluar";
    if (!Number.isFinite(amount) || amount < 100) return null;
    const validCats = type === "masuk" ? INCOME_CATS : EXPENSE_CATS;
    const cat = validCats.includes(obj.cat) ? obj.cat : "lainnya";
    const desc = String(obj.desc || "").slice(0, 60) || "transaksi";
    return { type, amount, cat, desc };
  } catch { return null; }
}

function parseAiReceipt(text) {
  if (!text || typeof text !== "string") return null;
  let raw = text.replace(/```(json)?/gi, "").trim();
  const s = raw.indexOf("{");
  const e = raw.lastIndexOf("}");
  if (s === -1 || e === -1 || e <= s) return null;
  try {
    const obj = JSON.parse(raw.slice(s, e + 1));
    const items = Array.isArray(obj.items)
      ? obj.items.filter((x) => x && x.nama).slice(0, 12).map((x) => ({ nama: String(x.nama).slice(0, 40), harga: Math.max(0, Math.round(Number(x.harga) || 0)) }))
      : [];
    const total = Math.round(Number(obj.total));
    if ((!Number.isFinite(total) || total < 100) && !items.length) return null;
    return { items, total: Number.isFinite(total) && total >= 100 ? total : items.reduce((a, x) => a + x.harga, 0), toko: String(obj.toko || "").slice(0, 40) };
  } catch { return null; }
}

// ── Penyimpanan: user.dompet { budget, entries } ──
function getStore(m) {
  const db = getDatabase();
  const user = db.getUser(m.sender) || {};
  const d = user.dompet && typeof user.dompet === "object" ? user.dompet : {};
  return {
    db,
    budget: Number(d.budget) > 0 ? Number(d.budget) : 0,
    entries: Array.isArray(d.entries) ? d.entries : [],
  };
}

function saveStore(m, db, { budget, entries }) {
  db.setUser(m.sender, { dompet: { budget, entries: entries.slice(-500) } });
}

const rp = (n) => `Rp${Math.round(Number(n) || 0).toLocaleString("id-ID")}`;
const dayKey = (ts) => new Date(ts).toISOString().split("T")[0];
const monthKey = (ts) => new Date(ts).toISOString().split("T")[0].slice(0, 7);
const sum = (arr, f) => arr.reduce((a, x) => a + f(x), 0);

function balanceOf(entries) {
  return sum(entries, (e) => (e.type === "masuk" ? e.amount : -e.amount));
}

// ── Seam e2e: parser AI bisa di-inject ──
let parserText = aiChainChat;
let parserVision = visionScan;
export function _setDompetParsersForTest({ text, vision } = {}) {
  parserText = text || aiChainChat;
  parserVision = vision || visionScan;
}

function aiEntryPrompt(text) {
  return `Kamu asisten keuangan pribadi Indonesia. Konversi catatan transaksi berikut jadi data terstruktur.
Catatan: "${text}"

Balas HANYA JSON valid (tanpa penjelasan, tanpa markdown):
{"type":"masuk atau keluar","amount":angka,"cat":"kategori","desc":"deskripsi singkat"}

Aturan:
- type "masuk" kalau uang MASUK/penerimaan (gajian, bonus, hadiah, penjualan, refund, transfer masuk). Selain itu "keluar".
- amount = nominal rupiah dalam angka murni (15rb→15000, 25.000→25000, 2.5jt→2500000).
- cat = pilih SATU: makan, transport, belanja, hiburan, tagihan, kesehatan, pendidikan (untuk keluar) | gaji, bonus, hadiah, usaha, lainnya (untuk masuk) | lainnya kalau gak cocok.
- desc = ringkasan singkat 2-5 kata TANPA nominal.`;
}

function receiptPrompt() {
  return `Kamu asisten keuangan. Baca struk/nota/bukti transaksi di gambar ini.

Balas HANYA JSON valid (tanpa penjelasan, tanpa markdown):
{"items":[{"nama":"nama item","harga":angka}],"total":angka,"toko":"nama toko/vendor"}

Aturan:
- items = daftar barang/jasa + harga per item kalau terbaca di struk. Kalau gak ada rincian, items kosong [].
- total = total nominal transaksi (angka murni rupiah). Kalau gak terbaca, jumlahkan items.
- toko = nama toko/tempat kalau ada, kalau gak ada isi string kosong.
- Kalau gambar BUKAN struk/transaksi, tetap estimasi total nilai belanja yang terlihat (misal foto barang belanjaan).`;
}

async function handler(m, { sock, config: botConfig }) {
  const prefix = botConfig.command?.prefix || ".";
  try {
    const args = m.args || [];
    const sub = (args[0] || "").toLowerCase();
    const store = getStore(m);
    const now = new Date();
    const thisMonth = now.toISOString().split("T")[0].slice(0, 7);
    const today = now.toISOString().split("T")[0];

    // ═══ Subcommand: kategori ═══
    if (sub === "kategori") {
      return m.reply(raraWrap("dompet",
        `🏷 *KATEGORI DOMPET*\n\n📤 Keluar: ${EXPENSE_CATS.join(", ")}\n📥 Masuk: ${INCOME_CATS.join(", ")}\n\n` + tipText(`Kategori dideteksi otomatis dari catatanmu`)));
    }

    // ═══ Subcommand: budget ═══
    if (sub === "budget" || sub === "anggaran") {
      const rawBudget = (args.slice(1).join(" ") || "").trim();
      const n = parseAmount(rawBudget);
      // reset budget sebelum validasi — "0" valid
      if (args[1] && /^\s*0+\s*$/.test(args[1])) {
        saveStore(m, store.db, { budget: 0, entries: store.entries });
        return m.reply(raraWrap("dompet", "✅ Budget bulanan direset — dompet jalan tanpa budget."));
      }
      if (!Number.isFinite(n) || n < 1000 || n > 100_000_000) {
        const spent = sum(store.entries.filter((e) => e.type === "keluar" && monthKey(e.ts) === thisMonth), (e) => e.amount);
        const cur = store.budget ? `${rp(store.budget)}/bulan — terpakai ${rp(spent)}` : "belum diset";
        return m.reply(raraWrap("dompet", `💰 *Budget bulanan*: ${cur}\n\nFormat: ${prefix}dompet budget 2000000\n(1rb - 100jt,reset: ${prefix}dompet budget 0)`, "info"));
      }
      saveStore(m, store.db, { budget: n, entries: store.entries });
      const spent = sum(store.entries.filter((e) => e.type === "keluar" && monthKey(e.ts) === thisMonth), (e) => e.amount);
      const pct = spent ? Math.min(999, Math.round((spent / n) * 100)) : 0;
      return m.reply(raraWrap("dompet", `✅ Budget bulanan disimpan: *${rp(n)}*\n\n📉 Terpakai bulan ini: ${rp(spent)} (${pct}%)`));
    }

    // ═══ Subcommand: saldo ═══
    if (sub === "saldo" || sub === "balance" || sub === "cek") {
      const bal = balanceOf(store.entries);
      const mIn = sum(store.entries.filter((e) => e.type === "masuk" && monthKey(e.ts) === thisMonth), (e) => e.amount);
      const mOut = sum(store.entries.filter((e) => e.type === "keluar" && monthKey(e.ts) === thisMonth), (e) => e.amount);
      const dIn = sum(store.entries.filter((e) => e.type === "masuk" && dayKey(e.ts) === today), (e) => e.amount);
      const dOut = sum(store.entries.filter((e) => e.type === "keluar" && dayKey(e.ts) === today), (e) => e.amount);
      let txt = `👛 *SALDO DOMPET: ${rp(bal)}*\n\n` +
        `📥 Masuk bulan ini: ${rp(mIn)}\n📤 Keluar bulan ini: ${rp(mOut)}`;
      if (store.budget) {
        const pct = Math.min(999, Math.round((mOut / store.budget) * 100));
        txt += `\n🎯 Budget: ${rp(store.budget)} — terpakai ${pct}%` + (pct >= 100 ? " ⚠ HABIS!" : pct >= 80 ? " ⚠ hampir habis!" : "");
      }
      txt += `\n\n📅 *Hari ini:* +${rp(dIn)} / -${rp(dOut)}`;
      return m.reply(raraWrap("dompet", txt));
    }

    // ═══ Subcommand: log ═══
    if (sub === "log" || sub === "riwayat") {
      const range = (args[1] || "").toLowerCase();
      const cutoff =
        range === "bulan" ? 30 : range === "minggu" ? 7 : 1;
      const from = Date.now() - cutoff * 86400_000;
      const list = store.entries.filter((e) => e.ts >= from).slice(-15);
      if (!list.length) {
        return m.reply(raraWrap("dompet", `Belum ada catatan ${cutoff === 1 ? "hari" : cutoff === 7 ? "minggu" : "30 hari"} ini.\n` + tipText(`Coba: ${prefix}dompet makan siang 25rb`)));
      }
      const totIn = sum(list.filter((e) => e.type === "masuk"), (e) => e.amount);
      const totOut = sum(list.filter((e) => e.type === "keluar"), (e) => e.amount);
      const lines = list.map((e, i) =>
        `${i + 1}. ${e.type === "masuk" ? "📥" : "📤"} ${e.desc} — ${rp(e.amount)} *(${e.cat})*`
      ).join("\n");
      return m.reply(raraWrap("dompet",
        `📋 *Log ${cutoff === 1 ? "hari ini" : cutoff === 7 ? "7 hari" : "30 hari"} (${list.length} transaksi)*\n\n${lines}\n\n📥 Masuk: ${rp(totIn)}\n📤 Keluar: ${rp(totOut)}`));
    }

    // ═══ Subcommand: laporan ═══
    if (sub === "laporan" || sub === "rekap") {
      const range = (args[1] || "").toLowerCase() === "bulan" ? 30 : 7;
      const from = Date.now() - range * 86400_000;
      const list = store.entries.filter((e) => e.ts >= from);
      if (!list.length) {
        return m.reply(raraWrap("dompet", `Belum ada transaksi ${range} hari terakhir.\n` + tipText(`Coba: ${prefix}dompet beli kopi 18rb`)));
      }
      const totIn = sum(list.filter((e) => e.type === "masuk"), (e) => e.amount);
      const totOut = sum(list.filter((e) => e.type === "keluar"), (e) => e.amount);

      // breakdown kategori keluar
      const byCat = {};
      for (const e of list.filter((x) => x.type === "keluar")) byCat[e.cat] = (byCat[e.cat] || 0) + e.amount;
      const catLines = Object.entries(byCat).sort((a, b) => b[1] - a[1]).map(([c, v]) => `${c}: ${rp(v)}`).join("\n");

      // chart per hari (pengeluaran)
      const days = {};
      for (let i = range - 1; i >= 0; i--) days[dayKey(Date.now() - i * 86400_000)] = 0;
      for (const e of list.filter((x) => x.type === "keluar")) {
        const k = dayKey(e.ts);
        if (k in days) days[k] += e.amount;
      }
      const dayKeys = Object.keys(days);
      const activeDays = dayKeys.filter((d) => days[d] > 0).length;
      const avg = activeDays ? Math.round(totOut / activeDays) : 0;
      const items = dayKeys.map((d) => ({ label: new Date(d).toLocaleDateString("id-ID", { weekday: "short" }), value: days[d] }));

      // insight AI (degrade silent)
      let insight = "";
      try {
        const topCats = Object.entries(byCat).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([c, v]) => `${c} ${rp(v)}`).join(", ");
        const aiReply = await parserText(`Kamu advisor keuangan pribadi. Rekap keuangan ${range} hari terakhir: masuk ${rp(totIn)}, keluar ${rp(totOut)}, rata-rata keluar ${rp(avg)}/hari, kategori terbesar: ${topCats || "belum ada"}${store.budget ? `, budget bulanan ${rp(store.budget)}` : ""}. Beri SATU insight singkat + praktis (maks 2 kalimat, bahasa Indonesia santai, sebut kategori terbesar kalau relevan). Balas teks polos tanpa format.`).catch(() => null);
        if (aiReply && typeof aiReply === "string" && aiReply.trim()) insight = aiReply.trim().slice(0, 220);
      } catch {}

      const png = await renderChart({
        title: `Pengeluaran ${range} Hari Terakhir`,
        subtitle: `Total ${rp(totOut)} — rata-rata ${rp(avg)}/hari`,
        items,
        money: true,
      });
      await sock.sendMedia(m.chat, png, null, m, { type: "image" });

      let txt = `📊 *Rekap ${range} hari*\n\n📥 Masuk: ${rp(totIn)}\n📤 Keluar: ${rp(totOut)}\n⚖ Selisih: ${rp(totIn - totOut)}\n📅 Hari aktif: ${activeDays}/${range} (avg ${rp(avg)}/hari)\n\n🏷 *Kategori terbesar:*\n${catLines}`;
      if (insight) txt += `\n\n💡 _${insight}_`;
      return m.reply(raraWrap("dompet", txt));
    }

    // ═══ Subcommand: hapus / reset ═══
    if (sub === "hapus" || sub === "undo") {
      if (!store.entries.length) return m.reply(raraWrap("dompet", "Dompet masih kosong, gak ada yang bisa dihapus.", "error"));
      const last = store.entries.pop();
      saveStore(m, store.db, { budget: store.budget, entries: store.entries });
      return m.reply(raraWrap("dompet", `🗑 Transaksi terakhir dihapus: *${last.desc}* (${last.type === "masuk" ? "+" : "-"}${rp(last.amount)})`));
    }
    if (sub === "reset" || sub === "bersih") {
      saveStore(m, store.db, { budget: store.budget, entries: [] });
      return m.reply(raraWrap("dompet", "✅ Semua catatan dompet dibersihin. Budget tetep kepake."));
    }

    // ═══ Entry baru: foto struk (reply/attach) atau teks natural ═══
    const isPhoto = (m.quoted && m.quoted.isImage) || m.isImage;
    const textInput = (m.text || "").trim();
    if (!isPhoto && !textInput) {
      const guide = raraCaption({
        emoji: "👛",
        name: "dompet",
        description: "Dompet AI — catat keuangan via teks natural / foto struk",
        usage: `${prefix}dompet <catatan transaksi>\n${prefix}dompet (reply foto struk)\n${prefix}dompet saldo | log | laporan | budget 2jt | hapus | reset | kategori`,
        example: `${prefix}dompet makan siang 25rb\n${prefix}dompet gajian 5jt\n${prefix}dompet (reply foto nota indomaret)`,
      }) + "\n" + tipText(`Catat kecil-kecil, tabungan gak tersedot`);
      return m.reply(guide, "dompet");
    }

    await m.react("🧠");

    let entry = null;
    let engineUsed = "lokal";
    let receipt = null;

    if (isPhoto) {
      const buffer = m.quoted?.isImage ? await m.quoted.download() : await m.download();
      if (!buffer || !buffer.length) {
        await m.react("❌");
        return m.reply(raraWrap("dompet", "Gagal download gambar. Coba kirim ulang.", "error"));
      }
      const res = await parserVision({
        imageBuffer: buffer,
        question: receiptPrompt(),
        sessionKey: null,
      }).catch((e) => ({ status: false, error: e.message }));
      if (!res?.status) {
        await m.react("❌");
        return m.reply(raraWrap("dompet", res?.error || "Gagal membaca struk", "error"));
      }
      receipt = parseAiReceipt(res.text);
      if (!receipt || !receipt.total) {
        await m.react("❌");
        return m.reply(raraWrap("dompet", "Gak kedeteksi transaksi di gambarnya. Coba foto struk yang lebih jelas.", "error"));
      }
      entry = {
        type: "keluar",
        amount: receipt.total,
        cat: detectCat((receipt.items.map((x) => x.nama).join(" ") + " " + receipt.toko), "keluar"),
        desc: (receipt.toko || receipt.items.slice(0, 2).map((x) => x.nama).join(", ") || "belanja struk").slice(0, 60),
      };
      engineUsed = "vision";
    } else {
      // parser lokal dulu — AI cuma kalau nominal gak ketemu
      entry = parseLocal(textInput);
      if (!entry) {
        const aiReply = await parserText(aiEntryPrompt(textInput)).catch(() => null);
        entry = parseAiEntry(aiReply);
        engineUsed = "ai";
        if (!entry) {
          await m.react("❌");
          return m.reply(raraWrap("dompet", "Gak kedeteksi nominalnya. Tulis nominalnya ya, contoh: *makan siang 25rb* atau *bayar listrik 350rb*.", "error"));
        }
      }
    }

    // simpan + budget warning
    const entries = [...store.entries, { ts: Date.now(), ...entry }];
    saveStore(m, store.db, { budget: store.budget, entries });
    const bal = balanceOf(entries);
    let msg = `${entry.type === "masuk" ? "📥" : "📤"} *${entry.type === "masuk" ? "UANG MASUK" : "UANG KELUAR"} — ${rp(entry.amount)}*\n\n` +
      `📝 ${entry.desc}\n🏷 ${entry.cat}\n👛 Saldo: ${rp(bal)}`;
    if (receipt && receipt.items?.length) {
      msg += `\n\n🧾 *Rincian:*\n` + receipt.items.map((x) => `• ${x.nama} — ${rp(x.harga)}`).join("\n");
    }
    if (entry.type === "keluar" && store.budget) {
      const mOut = sum(entries.filter((e) => e.type === "keluar" && monthKey(e.ts) === thisMonth), (e) => e.amount);
      const pct = Math.round((mOut / store.budget) * 100);
      if (pct >= 100) msg += `\n\n⚠ BUDGET HABIS! Keluar ${rp(mOut)} dari ${rp(store.budget)} (${pct}%)`;
      else if (pct >= 80) msg += `\n\n⚠ Budget terpakai ${pct}% — sisa ${rp(store.budget - mOut)} bulan ini`;
    }
    await m.react("🐣");
    msg += `\n\n⚙ ${toSC("engine")} : ${engineUsed} | ${toSC("cek")} ${prefix}${toSC("dompet saldo")}`;
    return m.reply(msg);
  } catch (err) {
    console.error("dompet error:", err);
    await m.react("❌");
    return m.reply(raraWrap("dompet", te.raraError(err) || "Gagal memproses", "error"));
  }
}

export { pluginConfig as config, handler, parseLocal, parseAmount };
