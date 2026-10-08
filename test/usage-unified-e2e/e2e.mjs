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
  // 3 Okt (revisi owner): balik desain lama — 『 *Nama* 』 + 📝 Cara Pakai + 💡 Contoh + 📍 catatan, tanpa kaomoji.
  check("header 『 *Mediafire Dl* 』", lines[0] === `『 *Mediafire Dl* 』`, lines[0]);
  check("TANPA kaomoji / ୨୧ / nama!!", !/୨୧/.test(out) && !/!!/.test(out) && !/\(\S+\)/.test(lines[1]), lines[1]);
  const iCt0 = lines.findIndex((l) => l === `💡 ${toSC("Contoh")}:`);
  const introRe = lines.slice(2, iCt0).filter((l) => l.trim()).join(" ");
  check("📝 Cara Pakai: label lalu intro di bawahnya (ter-wrap <=30, rewrap utuh)", lines[1] === `📝 ${toSC("Cara Pakai")}:` && introRe === toSC("Download file dari MediaFire! Kasih linknya ya!") && lines.slice(2, iCt0).every((l) => [...l].length <= 30), lines[1] + " | " + introRe);
  const iC = lines.findIndex((l) => l === `💡 ${toSC("Contoh")}:`);
  check("💡 Contoh: label ada", iC > -1, lines.join(" | "));
  check("contoh VERBATIM di baris sendiri (URL gak ke-smallcaps)", lines[iC + 1] === ".mfdl https://www.mediafire.com/file/xxx", lines[iC + 1]);
  const noteRe = lines.slice(iC + 3).filter((l) => l.trim()).join(" ").replace(/^📍\s*/, "");
  check("📍 catatan di bawah contoh (ter-wrap <=30, rewrap utuh)", lines[iC + 3].startsWith("📍 ") && noteRe === toSC("Maksimal 200MB sekali download"), lines.slice(iC + 3).join(" | "));
  check("gak ada akhiran ~ dan divider cute", !out.includes("~") && !out.includes("⋆"));

  const noNote = raraGuide("Tes", "Intro doang", ".tes abc");
  check("tanpa note → cuma Cara Pakai + Contoh, gak ada 📍", noNote.includes(`💡 ${toSC("Contoh")}:\n.tes abc`) && !noNote.includes("📍"), noNote);
  const multi = raraGuide("Welcome", "Atur pesan welcome member baru", ".welcome on", "Tipe:\n1. Welcome biasa\n2. Welcome dengan thumbnail foto profil");
  const ml = multi.split("\n");
  const iN = ml.findIndex((l) => l.startsWith("📍"));
  check("note MULTI-BARIS: baris pertama 📍, sisanya baris sendiri", iN > -1 && ml[iN] === `📍 ${toSC("Tipe:")}` && ml.includes(`1. ${toSC("Welcome biasa")}`) && ml.some((l) => l.startsWith(`2. ${toSC("Welcome dengan thumbnail")}`)), ml.slice(iN).join(" | "));

  const bare = raraGuide("Tes");
  check("tanpa param apapun → gak crash, header doang", bare === `『 *Tes* 』`, bare);
}

// ─── 2. raraNoInput — desain lama (3 Okt) ───
w("\n— raraNoInput (desain lama) —");
{
  const out = raraNoInput("Ttp", "Kirim teks yang mau jadi sticker", ".ttp halo");
  const lines = out.split("\n");
  check("header 『 *Ttp* 』 tanpa kaomoji", lines[0] === `『 *Ttp* 』` && !/୨୧/.test(out) && !/ttp!!/.test(out), lines[0]);
  check("baris 2 = ⚠ sapaan noInput", lines[1].startsWith("⚠ ") && lines[1].length > 5, lines[1]);
  check("📝 Cara Pakai: hint di baris sendiri", lines[3] === `📝 ${toSC("Cara Pakai")}:` && lines[4] === toSC("Kirim teks yang mau jadi sticker"), lines[3] + " | " + lines[4]);
  check("💡 Contoh: verbatim baris sendiri", lines[6] === `💡 ${toSC("Contoh")}:` && lines[7] === ".ttp halo", lines[6] + " | " + lines[7]);
  const bare = raraNoInput("Tes");
  check("noInput tanpa hint/example → tetap jalan (header + ⚠)", bare.startsWith(`『 *Tes* 』`) && (bare.split("\n")[1] || "").startsWith("⚠ "), bare);
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
  check("header convert + 📝 cara pakai: unggah/reply media", r.startsWith(`『 *Convert* 』`) && r.includes(`📝 ${toSC("Cara Pakai")}:`) && r.includes("Unggah atau reply media dengan caption .convert <format>"));
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

// ─── 4b. raraSalah — salah pemakaian desain lama, 2 baris ───
w("\n— raraSalah (desain lama) —");
{
  const s1 = raraSalah("Convert", "media ini audio, cuma bisa convert ke format audio");
  const sl = s1.split("\n");
  check("2 baris: ❗ pesan + arahan", sl.length === 2, JSON.stringify(sl));
  check("baris 1: ❗ Cara pemakaian salah — pesan custom", sl[0] === `❗ ${toSC("Cara pemakaian salah")} — ${toSC("media ini audio, cuma bisa convert ke format audio")}`, sl[0]);
  check("baris 2: Ketik .convert buat lihat cara pemakaian", sl[1] === toSC("Ketik .convert buat lihat cara pemakaian"), sl[1]);
  check("BEDA dari usage: gak ada header box 「 + gak ada 📝/💡/📍 + tanpa kaomoji", !s1.includes("「") && !s1.includes("📝") && !s1.includes("💡") && !s1.includes("📍") && !s1.includes("(>_<)"));
  const s2 = raraSalah("Convert");
  const s2l = s2.split("\n");
  check("tanpa pesan → tetap jalan (❗ + arahan)", s2l.length === 2 && s2l[0] === `❗ ${toSC("Cara pemakaian salah")}` && s2l[1] === toSC("Ketik .convert buat lihat cara pemakaian"), s2);
}

// ─── 5. raraError / raraEmpty — desain lama (3 Okt) ───
w("\n— error helpers (desain lama) —");
{
  const e = raraError("Convert", "Format gak dikenal");
  check("raraError: 『 *Convert* 』 + ❌ detail (tanpa kaomoji)", e.startsWith(`『 *Convert* 』`) && e.includes(`❌ ${toSC("Format gak dikenal")}`) && !/୨୧/.test(e), e.split("\n").slice(0, 2).join(" | "));
  const em = raraEmpty("Convert");
  check("raraEmpty: 『 *Convert* 』 + ❌ (tanpa kaomoji)", em.startsWith(`『 *Convert* 』`) && em.includes("❌") && !/୨୧/.test(em), em.split("\n")[0]);
}

w(`\n${pass} PASS / ${fail} FAIL`);
setTimeout(() => process.exit(fail ? 1 : 0), 300);
