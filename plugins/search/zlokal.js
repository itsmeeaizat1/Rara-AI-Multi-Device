// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
// ═════════════════════════════════════════════
// 🔹 .zlokal suite — API Lokal Indonesia (live verified 15 Sep 2026):
//   .zkodepos <daerah> | reply lokasi → detect GPS — kodepos.vercel.app
//   .zwilayah <jenis> <nama> — idn-area (provinsi/kab/kota/kec/kel/pulau)
//   .zklasemen <liga|list> — football-standings (ESPN) — versi atas .jadwalbola
//   .zkatanime <kata> — quotes anime EN/ID
//   .zpuasa [DD-MM-YYYY] — jadwal puasa sunnah
//   .zsekolah <nama> — data sekolah se-Indonesia
//   .zpesantren <prov>|<kab> — pesantren + NSPP
//   .zbasa <kata> — kamus undak usuk basa Sunda
//   .zquran <surah> [ayat] — versi atas .alquran (quran-api-id)
// ═════════════════════════════════════════════

import {
  lokKodepos, lokKodeposDetect, lokProvinces, lokArea, lokLeagues, lokKlasemen,
  lokKatanime, lokPuasa, lokSekolah, lokPesantrenProv, lokPesantrenKab, lokPesantren,
  lokBasa, lokQuran, lokQuranList,
} from "../../src/scraper/lokalapi.js";
import { raraWrap } from "../../src/lib/rara-menu-style.js";

const pluginConfig = {
  name: "zlokal",
  alias: ["zkodepos", "carikodepos", "zwilayah", "zklasemen", "klasemen", "zkatanime", "katanime",
    "zpuasa", "puasasunnah", "zsekolah", "carisekolah", "zpesantren", "caripesantren",
    "zbasa", "basasunda", "undakusukbasa", "zquran", "quranid"],
  category: "search",
  description: "Suite API lokal Indonesia — kodepos, wilayah, klasemen, katanime, puasa, sekolah, pesantren, basa sunda, quran",
  usage: ".zlokal — daftar | .zkodepos menteng | .zklasemen eng.1 | .zkatanime luffy | .zpuasa | .zsekolah sman 1 | .zbasa makan | .zquran 112 1",
  example: ".zklasemen eng.1",
  isOwner: false, isPremium: false, isGroup: true, isPrivate: true,
  cooldown: 10, energi: 1, isEnabled: true,
};

const v = (x) => (x === null || x === undefined || x === "") ? null : String(x).trim();
const short = (s, n = 70) => { const t = String(s || "").replace(/\s+/g, " ").trim(); return t.length > n ? t.slice(0, n) + "…" : t; };
const LIGA_POPULER = {
  "epl": "eng.1", "premier": "eng.1", "inggris": "eng.1", "eng.1": "eng.1",
  "laliga": "esp.1", "spanyol": "esp.1", "esp.1": "esp.1",
  "seriea": "ita.1", "italia": "ita.1", "ita.1": "ita.1",
  "bundesliga": "ger.1", "jerman": "ger.1", "ger.1": "ger.1",
  "ligue1": "fra.1", "prancis": "fra.1", "fra.1": "fra.1",
  "eredivisie": "ned.1", "belanda": "ned.1", "ned.1": "ned.1",
  "brasil": "bra.1", "bra.1": "bra.1", "argentina": "arg.1", "usa": "usa.1",
  "mls": "usa.1", "meksiko": "mex.1", "turki": "tur.1", "arab": "sau.1",
};

function usageCard() {
  return raraWrap("zlokal", [
    "🇮🇩 API LOKAL INDONESIA:",
    "",
    "▸ .zkodepos <daerah> — cari kode pos (reply lokasi = detect GPS)",
    "▸ .zwilayah <jenis> <nama> — provinsi/kabupaten/kota/kecamatan/kelurahan/pulau",
    "▸ .zklasemen <liga|list> — klasemen liga dunia",
    "▸ .zkatanime <kata> — quotes anime",
    "▸ .zpuasa [tanggal] — jadwal puasa sunnah",
    "▸ .zsekolah <nama> — cari sekolah SD/SMP/SMA/SMK",
    "▸ .zpesantren <prov>[|<kab>] — data pesantren",
    "▸ .zbasa <kata> — kamus basa Sunda",
    "▸ .zquran <surah> [ayat] — al-quran + transliterasi",
  ].join("\n"));
}

async function handler(m, { sock }) {
  try {
    const command = String(m.command || "").toLowerCase();
    const args = (m.args || []).map(String);
    const text = (m.text || args.join(" ") || "").trim();

    if (command === "zlokal") return m.reply(usageCard());
    // reply lokasi WA gak butuh text (zkodepos detect GPS)
    const q0 = m.quoted || m.quote;
    const loc0 = q0?.locationMessage || q0?.message?.locationMessage || q0?.msg?.locationMessage;
    const hasQuotedLoc = (command === "zkodepos" || command === "carikodepos") && loc0 && loc0.degreesLatitude !== undefined;
    const textOptional = (command === "zpuasa" || command === "puasasunnah"); // default hari ini
    if (!text && !hasQuotedLoc && !textOptional) {
      await m.react("❌");
      const u = {
        zkodepos: "nama daerah/kelurahan — contoh: .zkodepos menteng (atau reply pesan lokasi)",
        carikodepos: "nama daerah", zwilayah: "jenis + nama — contoh: .zwilayah kabupaten bandung",
        zklasemen: "liga — epl/laliga/seriea/bundesliga/ligue1/eredivisie/brasil — .zklasemen list buat daftar",
        klasemen: "liga", zkatanime: "kata/karakter/anime", katanime: "kata/karakter/anime",
        zpuasa: "tanggal opsional DD-MM-YYYY", puasasunnah: "tanggal opsional",
        zsekolah: "nama sekolah", carisekolah: "nama sekolah",
        zpesantren: "nama provinsi — contoh: .zpesantren jawa barat", caripesantren: "nama provinsi",
        zbasa: "kata — contoh: .zbasa makan", basasunda: "kata", undakusukbasa: "kata",
        zquran: "nomor surah 1-114 [nomor ayat]", quranid: "nomor surah [ayat]",
      };
      return m.reply(raraWrap("zlokal", `Query kosong — kirim ${u[command] || "query-nya"}`));
    }

    await m.react("🧠");

    if (command === "zkodepos" || command === "carikodepos") {
      // reply pesan lokasi WA → detect GPS
      const q = m.quoted || m.quote;
      const loc = q?.locationMessage || q?.message?.locationMessage || q?.msg?.locationMessage;
      if (loc && loc.degreesLatitude !== undefined) {
        const r = await lokKodeposDetect(loc.degreesLatitude, loc.degreesLongitude);
        if (!r.ok) { await m.react("❌"); return m.reply(raraWrap("zlokal", `Detect bermasalah: ${r.error}`)); }
        const d = r.detail;
        const lines = [`✅ KODE POS DARI LOKASI GPS`, "", `📮 ${d.code}`, `🏘️ ${v(d.village) || "-"}, ${v(d.district) || ""}`, `🏙️ ${v(d.regency) || "-"}, ${v(d.province) || ""}`];
        return m.reply(raraWrap("zlokal", lines.join("\n")));
      }
      const r = await lokKodepos(text);
      if (!r.ok) { await m.react("❌"); return m.reply(raraWrap("zlokal", `Kodepos bermasalah: ${r.error}`)); }
      const lines = [`✅ KODE POS "${text}"` , ""];
      r.list.slice(0, 8).forEach((k, i) => {
        lines.push(`${i + 1}. 📮 ${k.code} — ${v(k.village) || "-"}`);
        lines.push(`   ${short([k.district, k.regency, k.province].filter(Boolean).join(", "), 75)}`);
      });
      return m.reply(raraWrap("zlokal", lines.join("\n")));
    }

    if (command === "zwilayah") {
      const parts = text.split(/\s+/);
      const jenis = parts[0].toLowerCase();
      if (jenis === "provinsi" || jenis === "provinces") {
        const r = await lokProvinces();
        if (!r.ok) { await m.react("❌"); return m.reply(raraWrap("zlokal", `Wilayah bermasalah: ${r.error}`)); }
        const lines = ["✅ PROVINSI INDONESIA (38)", ""];
        lines.push(r.list.map((p) => `${p.code}. ${p.name}`).join(", ").replace(/, /g, ", ").split("").slice(0, 1400).join("") + "…");
        lines.push("", "Cari detail: .zwilayah kabupaten bandung | .zwilayah pulau jawa");
        return m.reply(raraWrap("zlokal", lines.join("\n")));
      }
      const r = await lokArea(jenis, parts.slice(1).join(" "));
      if (!r.ok) { await m.react("❌"); return m.reply(raraWrap("zlokal", `Wilayah bermasalah: ${r.error}`)); }
      const label = { regencies: "KABUPATEN/KOTA", districts: "KECAMATAN", villages: "KELURAHAN/DESA", islands: "PULAU" }[r.kind];
      const lines = [`✅ ${label} — ${parts.slice(1).join(" ")} (${r.list.length})`, ""];
      r.list.slice(0, 12).forEach((x, i) => {
        const extra = [x.provinceCode && `prov ${x.provinceCode}`, x.regencyCode && `kab ${x.regencyCode}`, x.districtCode && `kec ${x.districtCode}`, v(x.latitude) && `${Number(x.latitude).toFixed(2)}, ${Number(x.longitude || 0).toFixed(2)}`].filter(Boolean);
        lines.push(`${i + 1}. 📍 ${x.name} [${x.code}]${extra.length ? " · " + extra.join(" · ") : ""}`);
      });
      return m.reply(raraWrap("zlokal", lines.join("\n")));
    }

    if (command === "zklasemen" || command === "klasemen") {
      if (text.toLowerCase() === "list") {
        const r = await lokLeagues();
        if (!r.ok) { await m.react("❌"); return m.reply(raraWrap("zlokal", `Klasemen bermasalah: ${r.error}`)); }
        const lines = ["✅ DAFTAR LIGA (populer):", ""];
        lines.push("▸ epl / inggris → eng.1", "▸ laliga / spanyol → esp.1", "▸ seriea / italia → ita.1", "▸ bundesliga / jerman → ger.1", "▸ ligue1 / prancis → fra.1", "▸ eredivisie / belanda → ned.1", "▸ brasil → bra.1", "▸ mls / usa → usa.1", "", `Total liga tersedia: ${r.list.length} — .zklasemen <id>`);
        return m.reply(raraWrap("zlokal", lines.join("\n")));
      }
      const id = LIGA_POPULER[text.toLowerCase()] || text.toLowerCase();
      const r = await lokKlasemen(id);
      if (!r.ok) { await m.react("❌"); return m.reply(raraWrap("zlokal", `Klasemen bermasalah: ${r.error}`)); }
      const lines = [`✅ KLAS EMEN ${r.liga.toUpperCase()} ${v(r.musim) ? r.musim : ""}`, "", "No  Tim                  M  M  S  K  GD  Poin"];
      r.table.slice(0, 20).forEach((x, i) => {
        lines.push(`${String(i + 1).padStart(2)}  ${short(x.tim, 20).padEnd(20)} ${String(x.main).padStart(2)} ${String(x.m).padStart(2)} ${String(x.s).padStart(2)} ${String(x.k).padStart(2)} ${String(x.gd).padStart(3)} ${String(x.poin).padStart(4)}`);
      });
      return m.reply(raraWrap("zlokal", lines.join("\n")));
    }

    if (command === "zkatanime" || command === "katanime") {
      const r = await lokKatanime(text);
      if (!r.ok) { await m.react("❌"); return m.reply(raraWrap("zlokal", `Katanime bermasalah: ${r.error}`)); }
      const lines = ["✅ KATANIME", ""];
      r.list.slice(0, 5).forEach((x, i) => {
        lines.push(`${i + 1}. 💬 "${short(x.indo || x.english, 110)}"`);
        lines.push(`   🈶 ${short(x.english, 90)}`);
        lines.push(`   👤 ${v(x.character) || "-"} · ${v(x.anime) || "-"}`);
      });
      return m.reply(raraWrap("zlokal", lines.join("\n")));
    }

    if (command === "zpuasa" || command === "puasasunnah") {
      const r = await lokPuasa(text.replace(/\s+/g, ""));
      if (!r.ok) { await m.react("❌"); return m.reply(raraWrap("zlokal", `Puasa bermasalah: ${r.error}`)); }
      const lines = [`✅ JADWAL PUASA SUNNAH — ${r.tanggal}`, ""];
      r.list.forEach((x) => {
        lines.push(`🌙 ${v(x.category?.name) || "Puasa"} — ${v(x.type?.name) || "-"}`);
        if (v(x.human_date)) lines.push(`   📅 ${x.human_date}`);
      });
      if (!r.list.length) lines.push("Tidak ada — hari itu bukan puasa sunnah");
      return m.reply(raraWrap("zlokal", lines.join("\n")));
    }

    if (command === "zsekolah" || command === "carisekolah") {
      const r = await lokSekolah(text);
      if (!r.ok) { await m.react("❌"); return m.reply(raraWrap("zlokal", `Sekolah bermasalah: ${r.error}`)); }
      const lines = [`✅ SEKOLAH — ${r.list.length} ketemu`, ""];
      r.list.slice(0, 6).forEach((x, i) => {
        lines.push(`${i + 1}. 🏫 ${short(x.sekolah, 70)} (NPSN ${v(x.npsn) || "-"})`);
        lines.push(`   ${v(x.bentuk) || ""} ${x.status === "N" ? "Negeri" : "Swasta"} · ${short(x.kecamatan, 30)}, ${short(x.kabupaten_kota, 30)}`);
        if (v(x.alamat_jalan)) lines.push(`   ${short(x.alamat_jalan, 80)}`);
      });
      return m.reply(raraWrap("zlokal", lines.join("\n")));
    }

    if (command === "zpesantren" || command === "caripesantren") {
      const [provPart, kabPart] = text.split("|").map((s) => (s || "").trim());
      if (!provPart) { await m.react("❌"); return m.reply(raraWrap("zlokal", "Kirim nama provinsi — contoh: .zpesantren jawa barat | kota bandung")); }
      const provs = await lokPesantrenProv();
      if (!provs.ok) { await m.react("❌"); return m.reply(raraWrap("zlokal", `Pesantren bermasalah: ${provs.error}`)); }
      const prov = provs.list.find((p) => p.nama.toLowerCase().includes(provPart.toLowerCase()) || provPart.toLowerCase().includes(p.nama.toLowerCase().replace(/^prov\.|^provinsi\s+/i, "")));
      if (!prov) { await m.react("❌"); return m.reply(raraWrap("zlokal", `Provinsi "${provPart}" gak ketemu — cek .zpesantren <nama provinsi>`)); }
      if (!kabPart) {
        const r = await lokPesantrenKab(prov.id, prov.nama);
        if (!r.ok) { await m.react("❌"); return m.reply(raraWrap("zlokal", `Pesantren bermasalah: ${r.error}`)); }
        const lines = [`✅ PESANTREN — ${r.provinsi}`, `Kabupaten/kota (${r.list.length}):`, ""];
        lines.push(r.list.slice(0, 25).map((k) => `${k.id} · ${k.nama}`).join("\n"));
        lines.push("", `Lanjut: .zpesantren ${prov.nama.split(" ").slice(-1)[0].toLowerCase()} | <nama kab>`);
        return m.reply(raraWrap("zlokal", lines.join("\n")));
      }
      const kabs = await lokPesantrenKab(prov.id, prov.nama);
      if (!kabs.ok) { await m.react("❌"); return m.reply(raraWrap("zlokal", `Pesantren bermasalah: ${kabs.error}`)); }
      const kab = kabs.list.find((k) => k.nama.toLowerCase().includes(kabPart.toLowerCase()));
      if (!kab) { await m.react("❌"); return m.reply(raraWrap("zlokal", `Kabupaten "${kabPart}" gak ketemu di ${prov.nama}`)); }
      const r = await lokPesantren(kab.id, kab.nama);
      if (!r.ok) { await m.react("❌"); return m.reply(raraWrap("zlokal", `Pesantren bermasalah: ${r.error}`)); }
      const lines = [`✅ PESANTREN ${r.kabupaten} — ${r.list.length} pesantren`, ""];
      r.list.slice(0, 10).forEach((p, i) => {
        lines.push(`${i + 1}. 🕌 ${short(p.nama, 65)}`);
        lines.push(`   NSPP ${v(p.nspp) || "-"} · ${short(p.alamat, 70)}`);
      });
      return m.reply(raraWrap("zlokal", lines.join("\n")));
    }

    if (command === "zbasa" || command === "basasunda" || command === "undakusukbasa") {
      const r = await lokBasa(text);
      if (!r.ok) { await m.react("❌"); return m.reply(raraWrap("zlokal", `Basa bermasalah: ${r.error}`)); }
      const lines = ["✅ UNDAK USUK BASA SUNDA", ""];
      r.words.slice(0, 8).forEach((w, i) => {
        lines.push(`${i + 1}. 👤 sorangan: ${v(w.sorangan) || "-"} · batur: ${v(w.batur) || "-"}`);
        if (v(w.loma)) lines.push(`   loma: ${w.loma} · 🇮🇩 ${v(w.bindo) || "-"} · 🇬🇧 ${v(w.english) || "-"}`);
      });
      return m.reply(raraWrap("zlokal", lines.join("\n")));
    }

    if (command === "zquran" || command === "quranid") {
      if (text.toLowerCase() === "list") {
        const r = await lokQuranList();
        if (!r.ok) { await m.react("❌"); return m.reply(raraWrap("zlokal", `Quran bermasalah: ${r.error}`)); }
        const lines = ["✅ DAFTAR SURAH (114):", "", r.list.slice(0, 114).map((s) => `${s.number}. ${s.name?.transliteration?.id || s.name?.short}`).join(", ")];
        return m.reply(raraWrap("zlokal", lines.join("\n")));
      }
      const parts = text.split(/\s+/).filter(Boolean);
      const r = await lokQuran(parts[0], parts[1]);
      if (!r.ok) { await m.react("❌"); return m.reply(raraWrap("zlokal", `Quran bermasalah: ${r.error}`)); }
      if (r.mode === "ayah") {
        const a = r.ayah;
        const lines = [
          `✅ QURAN — QS ${a.surah?.name?.transliteration?.id || ""} ayat ${a.number?.inSurah || "?"}`,
          "",
          `🅰️ ${a.text?.arab || ""}`,
          `📖 ${a.text?.transliteration?.en || a.text?.transliteration?.id || ""}`,
          `🇮🇩 ${a.translation?.id || ""}`,
          "",
          `📜 juz ${a.meta?.juz} · hal ${a.meta?.page}` + (v(a.audio?.[Object.keys(a.audio || {})[0]]) ? ` · audio: ${Object.values(a.audio)[0]}` : ""),
        ];
        return m.reply(raraWrap("zlokal", lines.join("\n")));
      }
      const s = r.surah;
      const lines = [
        `✅ QS ${s.number}. ${s.name?.transliteration?.id || ""} (${s.name?.short || ""})`,
        `Arti: ${s.name?.translation?.id || "-"} · ${s.revelation?.id || ""} · ${s.numberOfVerses} ayat`,
      ];
      return m.reply(raraWrap("zlokal", lines.join("\n")));
    }

    await m.react("🐣");
  } catch (e) {
    try { await m.react("❌"); } catch {}
    await m.reply(raraWrap("zlokal", `fitur error: ${e?.message || e}`));
  }
}

export default { pluginConfig, handler, command: pluginConfig.name };
export { pluginConfig as config, handler };
