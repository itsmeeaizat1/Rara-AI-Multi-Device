// E2E LAYOUT USAGE TERPADU (10 Sep 2026, request owner "terapin ke semua
// usage" — detail tambah di bawah contoh, kayak AI punya model, convert
// punya daftar format). novaGuide + novaNoInput (705+659 plugin) + novaRpgGuide
// + convert formatListText.
// Jalankan dari cwd DIR KOSONG:
//   mkdir -p /tmp/usage-e2e && cd /tmp/usage-e2e && node <repo>/test/usage-unified-e2e/e2e.mjs
import { novaGuide, novaNoInput, novaError, novaEmpty } from "../../src/lib/nova-menu-style.js";
import { novaRpgGuide } from "../../src/lib/nova-games.js";
import { config as convConfig, handler as convHandler } from "../../plugins/convert/convert.js";

let pass = 0, fail = 0;
const w = (s) => process.stdout.write(s + "\n");
const check = (name, ok, extra) => { w((ok ? "  ✅" : "  ❌") + " " + name + (ok ? "" : extra ? ` — ${extra}` : "")); ok ? pass++ : fail++; };
const SC_MAP = { a: 'ᴀ', b: 'ʙ', c: 'ᴄ', d: 'ᴅ', e: 'ᴇ', f: 'ꜰ', g: 'ɢ', h: 'ʜ', i: 'ɪ', j: 'ᴊ', k: 'ᴋ', l: 'ʟ', m: 'ᴍ', n: 'ɴ', o: 'ᴏ', p: 'ᴘ', r: 'ʀ', s: 'ꜱ', t: 'ᴛ', u: 'ᴜ', v: 'ᴠ', w: 'ᴡ', y: 'ʏ', z: 'ᴢ' };
const toSC = (s) => String(s || "").replace(/[a-zA-Z]/g, c => SC_MAP[c.toLowerCase()] || c);

// ─── 1. novaGuide — layout section baru ───
w("\n— novaGuide —");
{
  const out = novaGuide("Mediafire DL", "Download file dari MediaFire! Kasih linknya ya!", ".mfdl https://www.mediafire.com/file/xxx", "Maksimal 200MB sekali download");
  const lines = out.split("\n");
  check("header 「 ✦ ᴍᴇᴅɪᴀꜰɪʀᴇ ᴅʟ ✦ 」", lines[0] === `「 ✦ ${toSC("MEDIAFIRE DL")} ✦ 」`, lines[0]);
  check("📝 ᴄᴀʀᴀ ᴘᴀᴋᴀɪ: + intro smallcaps", lines[1] === `📝 ${toSC("Cara Pakai")}:` && lines[2] === toSC("Download file dari MediaFire! Kasih linknya ya!"), lines[1] + " / " + lines[2]);
  const iC = lines.indexOf(`💡 ${toSC("Contoh")}:`);
  check("💡 ᴄᴏɴᴛᴏʜ: section + example VERBATIM (URL gak ke-smallcaps)", iC > -1 && lines[iC + 1] === ".mfdl https://www.mediafire.com/file/xxx");
  const iN = lines.indexOf((lines.find(l => l.startsWith("⚠ ")) || ""));
  check("⚠ note jadi DETAIL di bawah contoh", iN > iC && iN > -1 && lines[iN].includes(toSC("Maksimal 200MB sekali download")), String(iN) + "/" + String(iC));
  check("gak ada lagi format lama 'Contoh: ' inline", !out.includes("Contoh: ."));

  const noNote = novaGuide("Tes", "Intro doang", ".tes abc");
  check("tanpa note → section ⚠ gak muncul", !noNote.includes("⚠"));
  const bare = novaGuide("Tes");
  check("tanpa param apapun → gak crash, cuma header", bare === `「 ✦ ${toSC("TES")} ✦ 」`);
}

// ─── 2. novaNoInput — layout section baru ───
w("\n— novaNoInput —");
{
  const out = novaNoInput("Ttp", "Kirim teks yang mau jadi sticker", ".ttp halo");
  const lines = out.split("\n");
  check("header + ⚠ sapaan random tetap", lines[0] === `「 ✦ ${toSC("TTP")} ✦ 」` && lines[1].startsWith("⚠ "));
  check("📝 ᴄᴀʀᴀ ᴘᴀᴋᴀɪ: hint smallcaps", lines[3] === `📝 ${toSC("Cara Pakai")}:` && lines[4] === toSC("Kirim teks yang mau jadi sticker"), lines[3]);
  const iC = lines.indexOf(`💡 ${toSC("Contoh")}:`);
  check("💡 ᴄᴏɴᴛᴏʜ: example verbatim", iC > -1 && lines[iC + 1] === ".ttp halo");
  const bare = novaNoInput("Tes");
  check("noInput tanpa hint/example → tetap jalan (header+⚠ doang)", bare.startsWith(`「 ✦ ${toSC("TES")} ✦ 」`) && bare.includes("⚠"));
}

// ─── 3. novaRpgGuide — label section konsisten ───
w("\n— novaRpgGuide —");
{
  const out = novaRpgGuide("Berburu", "Keliling hutan buat berburu hewan", ".berburu", "Cooldown 10 menit");
  check("📝 ᴄᴀʀᴀ ᴘᴀᴋᴀɪ: label ada", out.includes("📝 Cara Pakai:"));
  check("💡 ᴄᴏɴᴛᴏʜ: label ada + example", out.includes("💡 Contoh:") && out.includes(".berburu"));
  check("⚠ note detail di bawah contoh", out.indexOf("⚠") > out.indexOf("💡 Contoh:"));
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
  check("header ᴄᴏɴᴠᴇʀᴛ + 📝 ᴄᴀʀᴀ ᴘᴀᴋᴀɪ: 3 langkah", r.startsWith(`「 ✦ ${toSC("Convert")} ✦ 」`) && r.includes(`📝 ${toSC("Cara Pakai")}:`) && r.includes("1. Reply media"));
  check("💡 ᴄᴏɴᴛᴏʜ: .convert mp3", r.includes(`💡 ${toSC("Contoh")}:`) && r.includes(".convert mp3 (reply video)"));
  check("📋 ꜰᴏʀᴍᴀᴛ ᴛᴇʀꜱᴇᴅɪᴀ: DETAIL di bawah contoh", r.indexOf(`📋 ${toSC("Format Tersedia")}:`) > r.indexOf(`💡 ${toSC("Contoh")}:`));
  check("daftar format: sub ᴀᴜᴅɪᴏ + ᴠɪᴅᴇᴏ + ɢᴀᴍʙᴀʀ + item verbatim", r.includes(`「 ${toSC("Audio")} 」`) && r.includes(`「 ${toSC("Video")} 」`) && r.includes(`「 ${toSC("Gambar")} 」`) && r.includes("• mp3 — MP3 (universal)") && r.includes("• mp4 — MP4 (universal)"));
  check("pluginConfig convert utuh", convConfig.name === "convert");
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
