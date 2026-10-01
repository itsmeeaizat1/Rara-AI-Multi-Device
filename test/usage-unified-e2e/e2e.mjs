// E2E LAYOUT USAGE TERPADU (10 Sep 2026, request owner "terapin ke semua
// usage" — detail tambah di bawah contoh, kayak AI punya model, convert
// punya daftar format). raraGuide + raraNoInput (705+659 plugin) + raraRpgGuide
// + convert formatListText.
// Jalankan dari cwd DIR KOSONG:
//   mkdir -p /tmp/usage-e2e && cd /tmp/usage-e2e && node <repo>/test/usage-unified-e2e/e2e.mjs
import { raraGuide, raraNoInput, raraError, raraEmpty, raraSalah } from "../../src/lib/rara-menu-style.js";
import { raraRpgGuide } from "../../src/lib/rara-games.js";
import { config as convConfig, handler as convHandler } from "../../plugins/convert/convert.js";

let pass = 0, fail = 0;
const w = (s) => process.stdout.write(s + "\n");
const check = (name, ok, extra) => { w((ok ? "  ✅" : "  ❌") + " " + name + (ok ? "" : extra ? ` — ${extra}` : "")); ok ? pass++ : fail++; };
const SC_MAP = { a: 'a', b: 'b', c: 'c', d: 'd', e: 'e', f: 'f', g: 'g', h: 'h', i: 'i', j: 'j', k: 'k', l: 'l', m: 'm', n: 'n', o: 'o', p: 'p', r: 'r', s: 's', t: 't', u: 'u', v: 'v', w: 'w', y: 'y', z: 'z' };
// UPDATE 1 Okt: teks bot kini plain — toSC lokal jadi passthrough
const toSC = (s) => String(s ?? "");

// ─── 1. raraGuide — DESAIN V2 kaomoji (rework 25 Sep) ───
w("\n— raraGuide (V2) —");
{
  const out = raraGuide("Mediafire DL", "Download file dari MediaFire! Kasih linknya ya!", ".mfdl https://www.mediafire.com/file/xxx", "Maksimal 200MB sekali download");
  const lines = out.split("\n");
  check("header 「✧ mediafire dl ✧」", lines[0] === `୨୧ ✧ ${toSC("mediafire dl")} ✧ ୨୧`, lines[0]);
  check("kaomoji + nama!! TANPA emoji unicode (revisi owner)", /mediafire dl!!$/.test(lines[1]) && /\(/.test(lines[1]) && !/[😀-🙏🤀-🧿]/u.test(lines[1]), lines[1]);
  // FIX BASI (2 Okt, guard lebar 1 Okt): intro/note di-scWrap multi-baris
  // → rekonstruksi join spasi antara blok, bukan asumsi 1 baris per field.
  const iC = lines.findIndex((l) => l.startsWith(`📍 ${toSC("Contoh")}: `));
  const introJoined = lines.slice(3, iC).filter((l) => l.trim()).join(" ");
  check("intro jadi sapaan (rewrap utuh)", introJoined === toSC("Download file dari MediaFire! Kasih linknya ya!"), introJoined);
  check("📍 contoh: baris sendiri, example VERBATIM (URL gak ke-smallcaps)", lines[iC] === `📍 ${toSC("Contoh")}: .mfdl https://www.mediafire.com/file/xxx`, lines[iC]);
  const noteJoined = lines.slice(iC + 1).filter((l) => l.trim() && !l.startsWith("──")).map((l) => l.replace(/~$/, "")).join(" ");
  check("note: baris sendiri + akhiran ~ (rewrap utuh)", noteJoined === toSC("Maksimal 200MB sekali download") && out.includes("download~"), noteJoined);
  check("gak ada lagi format lama 'Contoh: ' inline (baris tanpa 📍)", !out.split("\n").some((l) => l.startsWith("Contoh: .")));

  const noNote = raraGuide("Tes", "Intro doang", ".tes abc");
  check("tanpa note → baris contoh polos, gak ada baris note/~", noNote.includes(`📍 ${toSC("Contoh")}: .tes abc`) && !noNote.includes("~"), noNote);
  const multi = raraGuide("Welcome", "Atur pesan welcome member baru", ".welcome on", "Tipe:\n1. Welcome biasa\n2. Welcome dengan thumbnail foto profil");
  const ml = multi.split("\n");
  // FIX BASI (2 Okt, guard lebar 1 Okt): baris note panjang ke-wrap ≤30 →
  // cek per-kalimat via rekonstruksi join, akhiran ~ di baris terakhir.
  const iMTipe = ml.findIndex((l) => l === toSC("Tipe:"));
  const lastNote = ml[ml.length - 1];
  check("note MULTI-BARIS: tiap baris jadi baris sendiri (rewrap utuh)", iMTipe > -1 && ml.includes(`1. ${toSC("Welcome biasa")}`) && ml.slice(iMTipe + 2).filter((l) => l.trim()).map((l) => l.replace(/~$/, "")).join(" ") === toSC("2. Welcome dengan thumbnail foto profil") && lastNote.endsWith("profil~"), ml.join(" | "));

  const bare = raraGuide("Tes");
  check("tanpa param apapun → gak crash, header + kaomoji doang", bare.startsWith(`୨୧ ✧ ${toSC("tes")} ✧ ୨୧`) && /tes!!$/.test(bare.split("\n")[1] || ""), bare);
}

// ─── 2. raraNoInput — DESAIN V2 kaomoji (rework 25 Sep) ───
w("\n— raraNoInput (V2) —");
{
  const out = raraNoInput("Ttp", "Kirim teks yang mau jadi sticker", ".ttp halo");
  const lines = out.split("\n");
  check("header 「✧ ttp ✧」 + kaomoji nama!! tanpa emoji unicode", lines[0] === `୨୧ ✧ ${toSC("ttp")} ✧ ୨୧` && /ttp!!$/.test(lines[1]) && /\(/.test(lines[1]), lines[0] + " / " + lines[1]);
  check("sapaan random cute (baris 3, tanpa emoji dekoratif)", lines[3] && lines[3].length > 5 && !/[😀-🙏🤀-🧿🫠]/u.test(lines[3]), lines[3]);
  check("📍 cara: hint smallcaps baris sendiri", lines[5] === `📍 ${toSC("Cara")}: ${toSC("Kirim teks yang mau jadi sticker")}`, lines[5]);
  check("contoh: verbatim baris sendiri", lines[6] === `${toSC("Contoh")}: .ttp halo`, lines[6]);
  const bare = raraNoInput("Tes");
  check("noInput tanpa hint/example → tetap jalan (header + kaomoji + sapaan)", bare.startsWith(`୨୧ ✧ ${toSC("tes")} ✧ ୨୧`) && /tes!!$/.test(bare.split("\n")[1] || ""), bare);
}

// ─── 3. raraRpgGuide — label section konsisten ───
w("\n— raraRpgGuide —");
{
  const out = raraRpgGuide("Berburu", "Keliling hutan buat berburu hewan", ".berburu", "Cooldown 10 menit");
  check("📝 cara pakai: label ada", out.includes("📝 Cara Pakai:"));
  check("💡 contoh: label ada + example", out.includes("💡 Contoh:") && out.includes(".berburu"));
  check("📍 note detail di bawah contoh", out.indexOf("📍") > out.indexOf("💡 Contoh:"));
}

// ─── 4. convert — 📋 daftar format jadi detail di bawah contoh ───
w("\n— convert format list —");
{
  const replies = [];
  const m = { args: [], text: ".convert", command: "convert", chat: "x@g.us", sender: "u@s", prefix: ".",
    reply: async (t) => { replies.push(String(t)); return {}; }, react: async () => true };
  await convHandler(m, { sock: null });
  const r = replies[0];
  check(".convert no-arg → reply 1 pesan", replies.length === 1 && !!r);
  check("header convert + 📝 cara pakai: unggah/reply media", r.startsWith(`「 ✦ ${toSC("Convert")} ✦ 」`) && r.includes(`📝 ${toSC("Cara Pakai")}:`) && r.includes("Unggah atau reply media dengan caption .convert <format>"));
  check("💡 contoh: .convert mp3", r.includes(`💡 ${toSC("Contoh")}:`) && r.includes(".convert mp3 (reply video)"));
  check("📋 format tersedia: DETAIL di bawah contoh", r.indexOf(`📋 ${toSC("Format Tersedia")}:`) > r.indexOf(`💡 ${toSC("Contoh")}:`));
  check("daftar format: sub audio + video + gambar + item verbatim", r.includes(`「 ${toSC("Audio")} 」`) && r.includes(`「 ${toSC("Video")} 」`) && r.includes(`「 ${toSC("Gambar")} 」`) && r.includes("mp3 (universal)") && r.includes("mp4 (universal)") && !r.includes("• mp3"));
  check("gak ada bullet • di daftar format", !r.includes("• "));
  check("nama format GAK DOBEL (revisi owner)", !r.includes("mp3 — MP3") && !r.includes("MP3 (universal)") && r.includes("wav (uncompressed)"));
  check("📍 note session 10 menit di bawah format list", r.includes("📍") && r.indexOf("📍") > r.indexOf(`📋 ${toSC("Format Tersedia")}:`));
  check("note session dipecah 2 baris (label: + isi di bawah)", r.includes(toSC("otomatis ke-session 10 menit") + ":") && r.includes(toSC("Tinggal ketik .convert <format>")));
  check("gak ada lagi step bernomor lama", !r.includes("1. Reply media"));
  check("pluginConfig convert utuh", convConfig.name === "convert");
}

// ─── 4b. raraSalah — salah pemakaian versi cute V2, TANPA emoji unicode ───
w("\n— raraSalah (V2 cute) —");
{
  const s1 = raraSalah("Convert", "media ini audio, cuma bisa convert ke format audio");
  const sl = s1.split("\n");
  check("3 baris: kaomoji + pesan + arahan ➤", sl.length === 3, JSON.stringify(sl));
  check("baris 1: (>_<) yah kak... (tanpa emoji unicode)", sl[0] === `(>_<) ${toSC("yah kak")}...`, sl[0]);
  check("baris 2: pesan custom smallcaps", sl[1] === toSC("media ini audio, cuma bisa convert ke format audio"), sl[1]);
  check("baris 3: ➤ ulangi ketik .convert ya", sl[2] === `➤ ${toSC("ulangi ketik .convert ya")}`, sl[2]);
  check("BEDA dari usage: gak ada header box 「 + gak ada 📝/💡/📍", !s1.includes("「") && !s1.includes("📝") && !s1.includes("💡") && !s1.includes("📍"));
  const s2 = raraSalah("Convert");
  const s2l = s2.split("\n");
  check("tanpa pesan → tetap jalan (kaomoji + arahan)", s2l.length === 2 && s2l[0] === `(>_<) ${toSC("yah kak")}...` && s2l[1] === `➤ ${toSC("ulangi ketik .convert ya")}`, s2);
}

// ─── 5. raraError / raraEmpty TIDAK berubah (bukan usage) ───
w("\n— error helpers tetap —");
{
  const e = raraError("Convert", "Format gak dikenal");
  // DESAIN CUTE (2 Okt): kaomoji ganti ❌/✅ polos
  check("raraError cute: header ribbon + kaomoji susah (gak ada ❌/cara pakai)", e.startsWith(`୨୧ ✧ ${toSC("convert")} ✧ ୨୧`) && /\(.*\)/.test(e) && !e.includes("❌") && !e.includes("cara pakai"), e.split("\n")[0]);
  const em = raraEmpty("Convert");
  check("raraEmpty cute: header ribbon + kaomoji datar (gak ada ❌)", em.startsWith(`୨୧ ✧ ${toSC("convert")} ✧ ୨୧`) && /\(.*\)/.test(em) && !em.includes("❌"), em.split("\n")[0]);
}

w(`\n${pass} PASS / ${fail} FAIL`);
setTimeout(() => process.exit(fail ? 1 : 0), 300);
