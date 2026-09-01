// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// nikparser2.js — NIK Parser v2 (siputzx API)
import axios from "axios";
import { claraWrap } from "../../src/lib/nova-menu-style.js";

const PROVINSI = {
  11: "Aceh", 12: "Sumatera Utara", 13: "Sumatera Barat", 14: "Riau",
  15: "Jambi", 16: "Sumatera Selatan", 17: "Bengkulu", 18: "Lampung",
  19: "Kepulauan Bangka Belitung", 21: "Kepulauan Riau",
  31: "DKI Jakarta", 32: "Jawa Barat", 33: "Jawa Tengah",
  34: "DI Yogyakarta", 35: "Jawa Timur", 36: "Banten",
  51: "Bali", 52: "Nusa Tenggara Barat", 53: "Nusa Tenggara Timur",
  61: "Kalimantan Barat", 62: "Kalimantan Tengah", 63: "Kalimantan Selatan",
  64: "Kalimantan Timur", 65: "Kalimantan Utara",
  71: "Sulawesi Utara", 72: "Sulawesi Tengah", 73: "Sulawesi Selatan",
  74: "Sulawesi Tenggara", 75: "Gorontalo", 76: "Sulawesi Barat",
  81: "Maluku", 82: "Maluku Utara", 91: "Papua", 92: "Papua Barat",
};

const BULAN = {
  "01": "Januari", "02": "Februari", "03": "Maret", "04": "April",
  "05": "Mei", "06": "Juni", "07": "Juli", "08": "Agustus",
  "09": "September", "10": "Oktober", "11": "November", "12": "Desember",
};

const pluginConfig = {
  name: "nikparser2",
  alias: ["nikparser2", "nikparse2", "nikcheck2"],
  category: "tools",
  description: "Parse dan validasi NIK KTP v2 (siputzx API)",
  usage: ".nikparser2 <16 digit NIK>",
  example: ".nikparser2 3517072109020003",
  isOwner: false, isPremium: false, isGroup: false, isPrivate: false,
  cooldown: 10, energi: 1, isEnabled: true,
};

async function handler(m, { sock }) {
  try {
    const nik = m.text?.replace(/\D/g, "");
    if (!nik || nik.length !== 16) {
      return m.reply(claraWrap("nikparser2", `NIK harus 16 digit angka.\n\nContoh: ${m.prefix}nikparser2 3517072109020003`, "guide"));
    }

    await m.react("🕒");

    // Coba API siputzx
    let r = null;
    try {
      const { data } = await axios.get(`https://api.siputzx.my.id/api/tools/nik-checker?nik=${nik}`, {
        timeout: 15000, headers: { "User-Agent": "Mozilla/5.0" },
      });
      if (data && (data.status || data.success) && (data.data || data.result)) {
        r = data.data || data.result;
      }
    } catch (e) {
      console.error("nikparser2 siputzx:", e.message);
    }

    // Fallback: parse manual dari NIK
    if (!r) {
      const provCode = nik.slice(0, 2);
      const kabCode = nik.slice(0, 4);
      const tgl = parseInt(nik.slice(6, 8));
      const bln = nik.slice(8, 10);
      const thn = nik.slice(10, 12);
      const gender = tgl > 40 ? "Perempuan" : "Laki-laki";
      const realTgl = tgl > 40 ? tgl - 40 : tgl;
      const fullYear = parseInt(thn) > 50 ? `19${thn}` : `20${thn}`;

      r = {
        nik,
        provinsi: PROVINSI[provCode] || "Tidak diketahui",
        kabupaten: `Kode ${kabCode}`,
        tanggal_lahir: `${realTgl} ${BULAN[bln] || bln} ${fullYear}`,
        jenis_kelamin: gender,
        pas_foto: "Tidak tersedia",
      };
    }

    await m.react("🐣");
    let msg = "";
    msg += `NIK: *${r.nik || nik}*\n`;
    msg += `Provinsi: *${r.provinsi || r.province || "-"}*\n`;
    if (r.kabupaten || r.kota) msg += `Kab/Kota: *${r.kabupaten || r.kota}*\n`;
    if (r.kecamatan) msg += `Kecamatan: *${r.kecamatan}*\n`;
    if (r.kelurahan || r.desa) msg += `Kel/Desa: *${r.kelurahan || r.desa}*\n`;
    if (r.tanggal_lahir || r.tglLahir) msg += `Tgl Lahir: *${r.tanggal_lahir || r.tglLahir}*\n`;
    if (r.jenis_kelamin || r.gender) msg += `Gender: *${r.jenis_kelamin || r.gender}*\n`;
    if (r.pas_foto || r.foto) msg += `Foto: Tersedia ✅\n`;
        return m.reply(msg);
  } catch (err) {
    console.error("nikparser2 error:", err);
    await m.react("❌");
    return m.reply(claraWrap("nikparser2", err.message || "Error", "error"));
  }
}

export { pluginConfig as config, handler };
