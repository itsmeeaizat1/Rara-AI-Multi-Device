// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
/**
 * Nama Plugin: Kalkulator Zakat
 * Fitur: .zakat — hitung zakat penghasilan / maal / emas / fidyah
 *        dengan harga emas LIVE (gold-api.com + kurs USD open.er-api.com)
 *        → nisab real-time, status wajib/belum, jumlah zakat.
 */
import { getDatabase } from "../../src/lib/nova-database.js";
import { claraWrap, tipText } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "zakat",
  alias: ["zakat", "kalkulatorzakat", "hitungzakat"],
  category: "islami",
  description: "Kalkulator zakat penghasilan/maal/emas/fidyah + harga emas live untuk nisab",
  usage: ".zakat <penghasilan|maal|emas|fidyah> <jumlah>",
  example: ".zakat penghasilan 5jt\n.zakat maal 150jt\n.zakat emas 90\n.zakat fidyah 30",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 10,
  energi: 1,
  isEnabled: true,
};

const NISAB_GRAM = 85; // gram emas (standar zakat maal/penghasilan)
const FIDYAH_PER_HARI = 60000; // standar makan pokok per hari (bisa beda daerah)
const FALLBACK_HARGA_EMAS_PER_GRAM = 1900000; // fallback kalau API down

// ── cache harga emas 1 jam ──
let _hargaCache = null; // { ts, perGram }
export async function getHargaEmasPerGram() {
  if (_hargaCache && Date.now() - _hargaCache.ts < 60 * 60 * 1000) {
    return { perGram: _hargaCache.perGram, live: _hargaCache.live };
  }
  try {
    const [gold, kurs] = await Promise.all([
      fetch("https://api.gold-api.com/price/XAU", { signal: AbortSignal.timeout(8000) }).then((r) => r.json()),
      fetch("https://open.er-api.com/v6/latest/USD", { signal: AbortSignal.timeout(8000) }).then((r) => r.json()),
    ]);
    const usdPerOunce = Number(gold?.price);
    const usdToIdr = Number(kurs?.rates?.IDR);
    if (!usdPerOunce || !usdToIdr) throw new Error("data kurs/emas kosong");
    const perGram = (usdPerOunce / 31.1035) * usdToIdr;
    _hargaCache = { ts: Date.now(), perGram, live: true };
    return { perGram, live: true };
  } catch (e) {
    console.error("[zakat] harga emas live gagal:", e.message);
    _hargaCache = { ts: Date.now(), perGram: FALLBACK_HARGA_EMAS_PER_GRAM, live: false };
    return { perGram: FALLBACK_HARGA_EMAS_PER_GRAM, live: false };
  }
}
export function _setZakatHargaCacheForTest(cache) { _hargaCache = cache; }
export function _resetZakatHargaCacheForTest() { _hargaCache = null; }

/** parse rupiah fleksibel: "5jt", "5.5 juta", "500rb", "150 m", "5000000", "5.000.000" */
export function parseRp(text) {
  const t = String(text || "").toLowerCase().replace(/\s+/g, "");
  if (!t) return NaN;
  const m = t.match(/^(\d+(?:[.,]\d+)?)\s*(jt|juta|m|milyar|miliar|rb|ribu|k)?$/);
  if (!m) {
    // plain digits dengan pemisah titik: "5.000.000"
    const digits = t.replace(/[^\d]/g, "");
    return digits ? Number(digits) : NaN;
  }
  let n = Number(m[1].replace(",", "."));
  if (!Number.isFinite(n)) return NaN;
  const unit = m[2];
  if (unit === "rb" || unit === "ribu" || unit === "k") n *= 1e3;
  else if (unit === "jt" || unit === "juta") n *= 1e6;
  else if (unit === "m" || unit === "milyar" || unit === "miliar") n *= 1e9;
  return n;
}

const rp = (n) => "Rp " + Math.round(n).toLocaleString("id-ID");

async function handler(m, { sock, config: botConfig }) {
  const prefix = botConfig?.command?.prefix || m.prefix || ".";
  const sub = (m.args?.[0] || "").toLowerCase();
  const arg = (m.args?.[1] || "").trim();

  // ── menu / harga emas live ──
  if (!sub || sub === "info" || sub === "menu") {
    const { perGram, live } = await getHargaEmasPerGram();
    const nisab = perGram * NISAB_GRAM;
    return m.reply(claraWrap("Zakat", [
      "🕌 *Kalkulator Zakat*",
      "",
      `💰 Harga emas: ${rp(perGram)}/gram ${live ? "_(live)_" : "_(estimasi — API down)_"}`,
      `⚖️ Nisab (85 gr emas): *${rp(nisab)}*`,
      "",
      "Cara pakai:",
      `${prefix}zakat penghasilan 5jt — zakat dari gaji/omzet bulanan`,
      `${prefix}zakat maal 150jt — zakat dari harta yang udah setahun`,
      `${prefix}zakat emas 90 — zakat dari emas tabungan (gram)`,
      `${prefix}zakat fidyah 30 — fidyah puasa Ramadhan (hari)`,
    ].join("\n")) + "\n" + tipText("Harga emas live update tiap 1 jam"));
  }

  await m.react("🧠");
  try {
    const { perGram, live } = await getHargaEmasPerGram();
    const nisab = perGram * NISAB_GRAM;
    const noteLive = live ? "" : "\n⚠️ _API harga emas down — pakai estimasi Rp 1,9jt/gr_";

    // ── penghasilan ──
    if (sub === "penghasilan" || sub === "gaji") {
      const income = parseRp(arg);
      if (!Number.isFinite(income) || income <= 0) {
        await m.react("❌");
        return m.reply(claraWrap("Zakat", `Format: ${prefix}zakat penghasilan 5jt (gaji/omzet per bulan)`));
      }
      const nisabBulanan = nisab / 12;
      const wajib = income >= nisabBulanan;
      await m.react("🐣");
      return m.reply(claraWrap("Zakat", [
        "💼 *Zakat Penghasilan*",
        "",
        `💵 Penghasilan/bulan: ${rp(income)}`,
        `⚖️ Nisab bulanan (85gr emas ÷ 12): ${rp(nisabBulanan)}`,
        "",
        wajib
          ? `✅ *WAJIB ZAKAT* — penghasilan di atas nisab\n\n Zakat dibayar: *${rp(income * 0.025)}* (2,5% dari penghasilan) per bulan`
          : `🟢 Belum wajib zakat — penghasilan di bawah nisab bulanan\n\n Jangka buat balik: penghasilan naik ≥ ${rp(nisabBulanan)}`,
        noteLive,
      ].join("\n")));
    }

    // ── maal ──
    if (sub === "maal" || sub === "harta") {
      const harta = parseRp(arg);
      if (!Number.isFinite(harta) || harta <= 0) {
        await m.react("❌");
        return m.reply(claraWrap("Zakat", `Format: ${prefix}zakat maal 150jt (total tabungan/aset bersih yang udah dimiliki 1 tahun)`));
      }
      const wajib = harta >= nisab;
      await m.react("🐣");
      return m.reply(claraWrap("Zakat", [
        "🏦 *Zakat Maal (Harta)*",
        "",
        `💼 Total harta bersih: ${rp(harta)}`,
        `⚖️ Nisab (85gr emas): ${rp(nisab)}`,
        "",
        wajib
          ? `✅ *WAJIB ZAKAT* — harta di atas nisab & udah setahun\n\n Zakat dibayar: *${rp(harta * 0.025)}* (2,5% dari harta)`
          : `🟢 Belum wajib — harta belum nyampe nisab`,
        noteLive,
      ].join("\n")));
    }

    // ── emas ──
    if (sub === "emas") {
      const gram = Number(String(arg).replace(/[^\d.,]/g, "").replace(",", "."));
      if (!Number.isFinite(gram) || gram <= 0) {
        await m.react("❌");
        return m.reply(claraWrap("Zakat", `Format: ${prefix}zakat emas 90 (jumlah gram emas yang kamu simpan)`));
      }
      const nilai = gram * perGram;
      const wajib = gram >= NISAB_GRAM;
      await m.react("🐣");
      return m.reply(claraWrap("Zakat", [
        "🪙 *Zakat Emas*",
        "",
        `🪙 Emas: ${gram} gram ≈ ${rp(nilai)}`,
        `⚖️ Nisab: ${NISAB_GRAM} gram`,
        "",
        wajib
          ? `✅ *WAJIB ZAKAT* — emas ≥ nisab (85 gr)\n\n Zakat dibayar: *${rp(nilai * 0.025)}* (2,5%) — boleh dari emasnya langsung (${(gram * 0.025).toFixed(3)} gr) atau nilai uangnya`
          : `🟢 Belum wajib — emas belum nyampe 85 gr`,
        noteLive,
      ].join("\n")));
    }

    // ── fidyah ──
    if (sub === "fidyah") {
      const hari = parseInt(String(arg).replace(/\D/g, ""), 10);
      if (!Number.isFinite(hari) || hari <= 0) {
        await m.react("❌");
        return m.reply(claraWrap("Zakat", `Format: ${prefix}zakat fidyah 30 (jumlah hari yang gak bisa puasa)`));
      }
      await m.react("🐣");
      return m.reply(claraWrap("Zakat", [
        "🍚 *Fidyah Puasa*",
        "",
        `📅 Hari yang ditinggalkan: ${hari} hari`,
        `🍚 Fidyah: ${rp(FIDYAH_PER_HARI)}/hari (standar 1 makan pokok)`,
        "",
        `💰 Total fidyah: *${rp(FIDYAH_PER_HARI * hari)}*`,
        "",
        "_Catatan: besaran fidyah bisa beda antara daerah/kebijakan ormas Islam — ikuti ketentuan setempat._",
      ].join("\n")));
    }

    await m.react("❌");
    return m.reply(claraWrap("Zakat", `Subcommand gak dikenal: "${sub}".\n\nKetik ${prefix}zakat buat lihat menu.`));
  } catch (e) {
    console.error("[zakat]", e.message || e);
    await m.react("❌");
    await m.reply(claraWrap("Zakat", "❌ Gagal hitung zakat — coba lagi bentar lagi ya."));
  }
}

export { pluginConfig as config, handler };
