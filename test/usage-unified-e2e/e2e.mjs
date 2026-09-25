// E2E LAYOUT USAGE TERPADU (10 Sep 2026, request owner "terapin ke semua
// usage" — detail tambah di bawah contoh, kayak AI punya model, convert
// punya daftar format). novaGuide + novaNoInput (705+659 plugin) + novaRpgGuide
// + convert formatListText.
// Jalankan dari cwd DIR KOSONG:
//   mkdir -p /tmp/usage-e2e && cd /tmp/usage-e2e && node <repo>/test/usage-unified-e2e/e2e.mjs
import { novaGuide, novaNoInput, novaError, novaEmpty, novaSalah } from "../../src/lib/nova-menu-style.js";
import { novaRpgGuide } from "../../src/lib/nova-games.js";
import { config as convConfig, handler as convHandler } from "../../plugins/convert/convert.js";

let pass = 0, fail = 0;
const w = (s) => process.stdout.write(s + "\n");
const check = (name, ok, extra) => { w((ok ? "  ✅" : "  ❌") + " " + name + (ok ? "" : extra ? ` — ${extra}` : "")); ok ? pass++ : fail++; };
const SC_MAP = { a: 'ᴀ', b: 'ʙ', c: 'ᴄ', d: 'ᴅ', e: 'ᴇ', f: 'ꜰ', g: 'ɢ', h: 'ʜ', i: 'ɪ', j: 'ᴊ', k: 'ᴋ', l: 'ʟ', m: 'ᴍ', n: 'ɴ', o: 'ᴏ', p: 'ᴘ', r: 'ʀ', s: 'ꜱ', t: 'ᴛ', u: 'ᴜ', v: 'ᴠ', w: 'ᴡ', y: 'ʏ', z: 'ᴢ' };
const toSC = (s) => String(s || "").replace(/[a-zA-Z]/g, c => SC_MAP[c.toLowerCase()] || c);

// ─── 1. novaGuide — DESAIN V2 kaomoji (rework 25 Sep) ───
w("\n— novaGuide (V2) —");
{
  const out = novaGuide("Mediafire DL", "Download file dari MediaFire! Kasih linknya ya!", ".mfdl https://www.mediafire.com/file/xxx", "Maksimal 200MB sekali download");
  const lines = out.split("\n");
  check("header 「✧ ᴍᴇᴅɪᴀꜰɪʀᴇ ᴅʟ ✧」", lines[0] === `「✧ ${toSC("mediafire dl")} ✧」`, lines[0]);
  check("kaomoji + nama!! TANPA emoji unicode (revisi owner)", /ᴍᴇᴅɪᴀꜰɪʀᴇ ᴅʟ!!$/.test(lines[1]) && /\(/.test(lines[1]) && !/[😀-🙏🤀-🧿]/u.test(lines[1]), lines[1]);
  check("intro jadi sapaan (smallcaps)", lines[3] === toSC("Download file dari MediaFire! Kasih linknya ya!"), lines[3]);
  const iC = lines.findIndex((l) => l.startsWith(`📍 ${toSC("Contoh")}: `));
  check("📍 ᴄᴏɴᴛᴏʜ: baris sendiri, example VERBATIM (URL gak ke-smallcaps)", lines[5] === `📍 ${toSC("Contoh")}: .mfdl https://www.mediafire.com/file/xxx`, lines[5]);
  check("note: baris sendiri + smallcaps + akhiran ~", lines[6] === `${toSC("Maksimal 200MB sekali download")}~`, lines[6]);
  check("gak ada lagi format lama 'Contoh: ' inline", !out.includes("Contoh: ."));

  const noNote = novaGuide("Tes", "Intro doang", ".tes abc");
  check("tanpa note → baris contoh polos, gak ada baris note/~", noNote.includes(`📍 ${toSC("Contoh")}: .tes abc`) && !noNote.includes("~"), noNote);
  const multi = novaGuide("Welcome", "Atur pesan welcome member baru", ".welcome on", "Tipe:\n1. Welcome biasa\n2. Welcome dengan thumbnail foto profil");
  const ml = multi.split("\n");
  check("note MULTI-BARIS: tiap baris jadi baris sendiri, ke-smallcaps", ml.includes(toSC("Tipe:")) && ml.includes(`1. ${toSC("Welcome biasa")}`) && ml.includes(`${toSC("2. Welcome dengan thumbnail foto profil")}~`), ml.join(" | "));

  const bare = novaGuide("Tes");
  check("tanpa param apapun → gak crash, header + kaomoji doang", bare.startsWith(`「✧ ${toSC("Tes")} ✧」`) && /ᴛᴇꜱ!!$/.test(bare.split("\n")[1] || ""), bare);
}

// ─── 2. novaNoInput — DESAIN V2 kaomoji (rework 25 Sep) ───
w("\n— novaNoInput (V2) —");
{
  const out = novaNoInput("Ttp", "Kirim teks yang mau jadi sticker", ".ttp halo");
  const lines = out.split("\n");
  check("header 「✧ ᴛᴛᴘ ✧」 + kaomoji nama!! tanpa emoji unicode", lines[0] === `「✧ ${toSC("ttp")} ✧」` && /ᴛᴛᴘ!!$/.test(lines[1]) && /\(/.test(lines[1]), lines[0] + " / " + lines[1]);
  check("sapaan random cute (baris 3, tanpa emoji dekoratif)", lines[3] && lines[3].length > 5 && !/[😀-🙏🤀-🧿🫠]/u.test(lines[3]), lines[3]);
  check("📍 ᴄᴀʀᴀ: hint smallcaps baris sendiri", lines[5] === `📍 ${toSC("Cara")}: ${toSC("Kirim teks yang mau jadi sticker")}`, lines[5]);
  check("ᴄᴏɴᴛᴏʜ: verbatim baris sendiri", lines[6] === `${toSC("Contoh")}: .ttp halo`, lines[6]);
  const bare = novaNoInput("Tes");
  check("noInput tanpa hint/example → tetap jalan (header + kaomoji + sapaan)", bare.startsWith(`「✧ ${toSC("Tes")} ✧」`) && /ᴛᴇꜱ!!$/.test(bare.split("\n")[1] || ""), bare);
}

// ─── 3. novaRpgGuide — label section konsisten ───
w("\n— novaRpgGuide —");
{
  const out = novaRpgGuide("Berburu", "Keliling hutan buat berburu hewan", ".berburu", "Cooldown 10 menit");
  check("📝 ᴄᴀʀᴀ ᴘᴀᴋᴀɪ: label ada", out.includes("📝 Cara Pakai:"));
  check("💡 ᴄᴏɴᴛᴏʜ: label ada + example", out.includes("💡 Contoh:") && out.includes(".berburu"));
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
  check("header ᴄᴏɴᴠᴇʀᴛ + 📝 ᴄᴀʀᴀ ᴘᴀᴋᴀɪ: unggah/reply media", r.startsWith(`「 ✦ ${toSC("Convert")} ✦ 」`) && r.includes(`📝 ${toSC("Cara Pakai")}:`) && r.includes("Unggah atau reply media dengan caption .convert <format>"));
  check("💡 ᴄᴏɴᴛᴏʜ: .convert mp3", r.includes(`💡 ${toSC("Contoh")}:`) && r.includes(".convert mp3 (reply video)"));
  check("📋 ꜰᴏʀᴍᴀᴛ ᴛᴇʀꜱᴇᴅɪᴀ: DETAIL di bawah contoh", r.indexOf(`📋 ${toSC("Format Tersedia")}:`) > r.indexOf(`💡 ${toSC("Contoh")}:`));
  check("daftar format: sub ᴀᴜᴅɪᴏ + ᴠɪᴅᴇᴏ + ɢᴀᴍʙᴀʀ + item verbatim", r.includes(`「 ${toSC("Audio")} 」`) && r.includes(`「 ${toSC("Video")} 」`) && r.includes(`「 ${toSC("Gambar")} 」`) && r.includes("mp3 (universal)") && r.includes("mp4 (universal)") && !r.includes("• mp3"));
  check("gak ada bullet • di daftar format", !r.includes("• "));
  check("nama format GAK DOBEL (revisi owner)", !r.includes("mp3 — MP3") && !r.includes("MP3 (universal)") && r.includes("wav (uncompressed)"));
  check("📍 note session 10 menit di bawah format list", r.includes("📍") && r.indexOf("📍") > r.indexOf(`📋 ${toSC("Format Tersedia")}:`));
  check("note session dipecah 2 baris (label: + isi di bawah)", r.includes(toSC("otomatis ke-session 10 menit") + ":") && r.includes(toSC("Tinggal ketik .convert <format>")));
  check("gak ada lagi step bernomor lama", !r.includes("1. Reply media"));
  check("pluginConfig convert utuh", convConfig.name === "convert");
}

// ─── 4b. novaSalah — salah pemakaian versi cute V2, TANPA emoji unicode ───
w("\n— novaSalah (V2 cute) —");
{
  const s1 = novaSalah("Convert", "media ini audio, cuma bisa convert ke format audio");
  const sl = s1.split("\n");
  check("3 baris: kaomoji + pesan + arahan ➤", sl.length === 3, JSON.stringify(sl));
  check("baris 1: (>_<) ʏᴀʜ ᴋᴀᴋ... (tanpa emoji unicode)", sl[0] === `(>_<) ${toSC("yah kak")}...`, sl[0]);
  check("baris 2: pesan custom smallcaps", sl[1] === toSC("media ini audio, cuma bisa convert ke format audio"), sl[1]);
  check("baris 3: ➤ ᴜʟᴀɴɢɪ ᴋᴇᴛɪᴋ .ᴄᴏɴᴠᴇʀᴛ ʏᴀ", sl[2] === `➤ ${toSC("ulangi ketik .convert ya")}`, sl[2]);
  check("BEDA dari usage: gak ada header box 「 + gak ada 📝/💡/📍", !s1.includes("「") && !s1.includes("📝") && !s1.includes("💡") && !s1.includes("📍"));
  const s2 = novaSalah("Convert");
  const s2l = s2.split("\n");
  check("tanpa pesan → tetap jalan (kaomoji + arahan)", s2l.length === 2 && s2l[0] === `(>_<) ${toSC("yah kak")}...` && s2l[1] === `➤ ${toSC("ulangi ketik .convert ya")}`, s2);
}

// ─── 5. novaError / novaEmpty TIDAK berubah (bukan usage) ───
w("\n— error helpers tetap —");
{
  const e = novaError("Convert", "Format gak dikenal");
  check("novaError tetap format ❌ (gak ada cara pakai)", e.includes("❌") && !e.includes("ᴄᴀʀᴀ ᴘᴀᴋᴀɪ"));
  const em = novaEmpty("Convert");
  check("novaEmpty tetap format ❌", em.includes("❌"));
}

w(`\n${pass} PASS / ${fail} FAIL`);
setTimeout(() => process.exit(fail ? 1 : 0), 300);
