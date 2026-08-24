// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { claraWrap } from "../../src/lib/nova-menu-style.js";

// ── Format Rupiah ────────────────────────────────────────────────
function rp(n) {
  return "Rp " + Math.round(n).toLocaleString("id-ID");
}

// ── PPh 21 (monthly, simplified) ────────────────────────────────
// Bruto monthly → net monthly tax
function calcPPh21(gajiBruto, statusKawin = false, jmlTanggungan = 0) {
  const ptkpSetahun = {
    tk0: 54000000, tk1: 58500000, tk2: 63000000, tk3: 67500000,
    k0: 58500000, k1: 63000000, k2: 67500000, k3: 72000000,
  };
  const key = (statusKawin ? "k" : "tk") + Math.min(jmlTanggungan, 3);
  const ptkp = ptkpSetahun[key] || 54000000;

  const brutoSetahun = gajiBruto * 12;
  // Biaya jabatan: 5% max 500rb/bln = 6jt/thn
  const biayaJabatan = Math.min(brutoSetahun * 0.05, 6000000);
  const nettoSetahun = brutoSetahun - biayaJabatan;
  const pkp = Math.max(nettoSetahun - ptkp, 0);

  // Pasal 17 UU HPP (tarif progresif)
  let pphSetahun = 0;
  let sisa = pkp;
  const tarif = [
    { limit: 60000000, rate: 0.05 },
    { limit: 190000000, rate: 0.15 },
    { limit: 250000000, rate: 0.25 },
    { limit: 450000000, rate: 0.30 },
    { limit: Infinity, rate: 0.35 },
  ];
  let prevLimit = 0;
  for (const t of tarif) {
    const taxable = Math.min(sisa, t.limit - prevLimit);
    if (taxable <= 0) break;
    pphSetahun += taxable * t.rate;
    sisa -= taxable;
    prevLimit = t.limit;
  }

  const pphBulanan = pphSetahun / 12;
  return { pphBulanan, pphSetahun, ptkp, pkp, nettoSetahun, biayaJabatan };
}

// ── BPJS Kesehatan & Ketenagakerjaan ─────────────────────────────
function calcBPJS(gajiBruto) {
  // Kesehatan: 5% total (4% perusahaan, 1% karyawan), max gaji 12jt (cap)
  const gajiCapKes = Math.min(gajiBruto, 12000000);
  const bpjsKesKaryawan = gajiCapKes * 0.01;
  const bpjsKesPerusahaan = gajiCapKes * 0.04;

  // Ketenagakerjaan: JKK 0.24% (perusahaan), JKM 0.3% (perusahaan), JHT 5.7% (3.7% perusahaan, 2% karyawan), JPN 3% (2% perusahaan, 1% karyawan)
  // Cap JPN: max gaji 10.547.400
  const gajiCapJPN = Math.min(gajiBruto, 10547400);
  const jhtKaryawan = gajiBruto * 0.02;
  const jpnKaryawan = gajiCapJPN * 0.01;
  const totalKaryawan = bpjsKesKaryawan + jhtKaryawan + jpnKaryawan;

  return {
    kesehatanKaryawan: bpjsKesKaryawan,
    jhtKaryawan,
    jpnKaryawan,
    totalKaryawan,
    kesehatanPerusahaan: bpjsKesPerusahaan,
  };
}

// ── THR (1x gaji, prorata jika <12 bulan) ────────────────────────
function calcTHR(gajiBruto, masaKerjaBulan = 12) {
  if (masaKerjaBulan >= 12) return gajiBruto;
  return (masaKerjaBulan / 12) * gajiBruto;
}

// ── Lembur ─────────────────────────────────────────────────────
// UU Ketenagakerjaan: 1.5x untuk jam pertama, 2x untuk jam berikutnya (hari kerja)
function calcLembur(upahPerJam, jumlahJam, jenisHari = "kerja") {
  if (jenisHari === "kerja") {
    if (jumlahJam <= 1) return upahPerJam * 1.5 * jumlahJam;
    return (upahPerJam * 1.5) + (upahPerJam * 2 * (jumlahJam - 1));
  } else if (jenisHari === "libur") {
    // Hari libur: 2x semua jam (first 7), 3x after
    if (jumlahJam <= 7) return upahPerJam * 2 * jumlahJam;
    return (upahPerJam * 2 * 7) + (upahPerJam * 3 * (jumlahJam - 7));
  } else if (jenisHari === "liburnasional") {
    // Hari libur nasional: 3x semua jam (first 8), 4x after
    if (jumlahJam <= 8) return upahPerJam * 3 * jumlahJam;
    return (upahPerJam * 3 * 8) + (upahPerJam * 4 * (jumlahJam - 8));
  }
  return 0;
}

// ── Take Home Pay ───────────────────────────────────────────────
function calcTakeHome(gajiBruto, statusKawin = false, jmlTanggungan = 0) {
  const pph = calcPPh21(gajiBruto, statusKawin, jmlTanggungan);
  const bpjs = calcBPJS(gajiBruto);
  const totalPotongan = pph.pphBulanan + bpjs.totalKaryawan;
  const takeHome = gajiBruto - totalPotongan;

  return { pph, bpjs, totalPotongan, takeHome, gajiBruto };
}

// ── Main handler ────────────────────────────────────────────────
async function handler(m, { sock, config: botConfig, text: args }) {
  const prefix = botConfig?.command?.prefix || ".";
  const parts = (args || "").trim().toLowerCase().split(/\s+/);
  const cmd = parts[0] || "";

  if (!cmd || cmd === "help" || cmd === "menu") {
    const help = claraWrap("Kalkulatur", [
      `  ┊  ➶ Kalkulator Kantoran`,
      ``,
      `  ┊  ➶ *Mode:*`,
      `  ${prefix}kalkulatur pph21 <gaji> [k/tk] [tanggungan]`,
      `  ${prefix}kalkulatur thr <gaji> [masa kerja bulan]`,
      `  ${prefix}kalkulatur lembur <upah/jam> <jam> [kerja/libur/liburnasional]`,
      `  ${prefix}kalkulatur bpjs <gaji>`,
      `  ${prefix}kalkulatur thp <gaji> [k/tk] [tanggungan]`,
      `  ${prefix}kalkulatur takehome <gaji> [k/tk] [tanggungan]`,
      ``,
      `  ┊  ➶ *Keterangan:*`,
      `  k = kawin, tk = belum kawin`,
      `  tanggungan = 0-3 (anak/dependen)`,
      `  thp = take home pay (gaji - PPh21 - BPJS)`,
      ``,
      `  ┊  ➶ *Contoh:*`,
      `  ${prefix}kalkulatur pph21 10000000 k 1`,
      `  ${prefix}kalkulatur thr 5000000 6`,
      `  ${prefix}kalkulatur lembur 30000 4 kerja`,
      `  ${prefix}kalkulatur thp 8000000 tk 0`,
    ].join("\n"));
    return m.reply( help, "kalkulatur");
  }

  await m.react("🐣");

  try {
    let result = "";

    if (cmd === "pph21" || cmd === "pph") {
      const gaji = parseFloat(parts[1]) || 0;
      if (!gaji) return m.reply(claraWrap("Kalkulatur", `Format: ${prefix}kalkulatur pph21 <gaji> [k/tk] [tanggungan]`));

      const kawin = parts[2] === "k";
      const tanggungan = parseInt(parts[3]) || 0;
      const r = calcPPh21(gaji, kawin, tanggungan);

      result = claraWrap("PPh 21 Bulanan", [
        `  ┊  ➶ Gaji Bruto: ${rp(gaji)}/bln`,
        `  ┊  ➶ Status: ${kawin ? "Kawin" : "Tidak Kawin"} (${tanggungan} tanggungan)`,
        `  ┊  ➶ Biaya Jabatan (5%): ${rp(r.biayaJabatan)}/thn`,
        `  ┊  ➶ Penghasilan Netto: ${rp(r.nettoSetahun)}/thn`,
        `  ┊  ➶ PTKP: ${rp(r.ptkp)}/thn`,
        `  ┊  ➶ PKP: ${rp(r.pkp)}/thn`,
        ``,
        `  ┊  ➶ *PPh 21: ${rp(r.pphBulanan)}/bln*`,
        `  ┊  ➶ PPh 21 Setahun: ${rp(r.pphSetahun)}/thn`,
      ].join("\n"));
    }

    else if (cmd === "thr") {
      const gaji = parseFloat(parts[1]) || 0;
      if (!gaji) return m.reply(claraWrap("Kalkulatur", `Format: ${prefix}kalkulatur thr <gaji> [masa kerja bulan]`));

      const masaKerja = parseInt(parts[2]) || 12;
      const thr = calcTHR(gaji, masaKerja);

      result = claraWrap("THR", [
        `  ┊  ➶ Gaji Pokok: ${rp(gaji)}`,
        `  ┊  ➶ Masa Kerja: ${masaKerja} bulan`,
        `  ┊  ➶ Prorata: ${masaKerja >= 12 ? "Tidak (full)" : `${masaKerja}/12`}`,
        ``,
        `  ┊  ➶ *THR: ${rp(thr)}*`,
      ].join("\n"));
    }

    else if (cmd === "lembur" || cmd === "overtime" || cmd === "ot") {
      const upahPerJam = parseFloat(parts[1]) || 0;
      const jam = parseFloat(parts[2]) || 0;
      if (!upahPerJam || !jam) return m.reply(claraWrap("Kalkulatur", `Format: ${prefix}kalkulatur lembur <upah/jam> <jam> [kerja/libur/liburnasional]`));

      const jenis = parts[3] || "kerja";
      const upah = calcLembur(upahPerJam, jam, jenis);

      result = claraWrap("Lembur", [
        `  ┊  ➶ Upah/Jam: ${rp(upahPerJam)}`,
        `  ┊  ➶ Jumlah Jam: ${jam} jam`,
        `  ┊  ➶ Jenis Hari: ${jenis}`,
        ``,
        `  ┊  ➶ *Upah Lembur: ${rp(upah)}*`,
      ].join("\n"));
    }

    else if (cmd === "bpjs") {
      const gaji = parseFloat(parts[1]) || 0;
      if (!gaji) return m.reply(claraWrap("Kalkulatur", `Format: ${prefix}kalkulatur bpjs <gaji>`));

      const r = calcBPJS(gaji);

      result = claraWrap("BPJS", [
        `  ┊  ➶ Gaji: ${rp(gaji)}`,
        ``,
        `  ┊  ➶ Potongan Karyawan:`,
        `  Kesehatan (1%): ${rp(r.kesehatanKaryawan)}`,
        `  JHT (2%): ${rp(r.jhtKaryawan)}`,
        `  JPN (1%): ${rp(r.jpnKaryawan)}`,
        `  *Total: ${rp(r.totalKaryawan)}/bln*`,
        ``,
        `  ┊  ➶ Perusahaan:`,
        `  Kesehatan (4%): ${rp(r.kesehatanPerusahaan)}`,
      ].join("\n"));
    }

    else if (cmd === "thp" || cmd === "takehome" || cmd === "take-home") {
      const gaji = parseFloat(parts[1]) || 0;
      if (!gaji) return m.reply(claraWrap("Kalkulatur", `Format: ${prefix}kalkulatur thp <gaji> [k/tk] [tanggungan]`));

      const kawin = parts[2] === "k";
      const tanggungan = parseInt(parts[3]) || 0;
      const r = calcTakeHome(gaji, kawin, tanggungan);

      result = claraWrap("Take Home Pay", [
        `  ┊  ➶ Gaji Bruto: ${rp(r.gajiBruto)}`,
        `  ┊  ➶ Status: ${kawin ? "Kawin" : "Tidak Kawin"} (${tanggungan} tanggungan)`,
        ``,
        `  ┊  ➶ Potongan:`,
        `  PPh 21: ${rp(r.pph.pphBulanan)}`,
        `  BPJS Kesehatan: ${rp(r.bpjs.kesehatanKaryawan)}`,
        `  BPJS JHT: ${rp(r.bpjs.jhtKaryawan)}`,
        `  BPJS JPN: ${rp(r.bpjs.jpnKaryawan)}`,
        `  *Total Potongan: ${rp(r.totalPotongan)}*`,
        ``,
        `  ┊  ➶ *Take Home Pay: ${rp(r.takeHome)}/bln*`,
      ].join("\n"));
    }

    else {
      result = claraWrap("Kalkulatur", `Mode tidak dikenal. Ketik ${prefix}kalkulatur untuk daftar mode.`);
    }

    await m.reply(result);
    await m.react("✅");
  } catch (error) {
    m.reply(claraWrap("Kalkulatur", `❌ Error: ${error.message}`));
    await m.react("✅");
  }

  return { handled: true };
}

const pluginConfig = {
  name: "kalkulatur",
  alias: ["kalkulatur", "kalkantor", "hitunggaji"],
  category: "tools",
  description: "Kalkulator kantoran: PPh21, THR, BPJS, lembur, take-home pay",
  usage: ".kalkulatur <mode> <args>",
  example: ".kalkulatur pph21 10000000 k 1",
  isOwner: false,
  isPremium: false,
  isGroup: true,
  isPrivate: true,
  cooldown: 3,
  energi: 0,
  isEnabled: true,
};

export { handler, pluginConfig, pluginConfig as default };
