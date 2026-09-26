// E2E — altftools native port (.jwt/.textrepeat/.slugify/.textcount/.textfreq/.textreverse)
// Sumber ide: altftool.com (13.947 tool browser) — di-port NATIVE offline, gak pake API situs itu.
import fs from "node:fs";
fs.rmSync(new URL("./e2e-db.json", import.meta.url), { recursive: true, force: true });
const { initDatabase } = await import("../../src/lib/nova-database.js");
await initDatabase(new URL("./e2e-db.json", import.meta.url).pathname);

const from = async (p) => await import("../../plugins/tools/" + p + ".js");
const jwtP = await from("ftooljwt");
const repP = await from("ftooltextrepeat");
const slugP = await from("ftoolslugify");
const cntP = await from("ftooltextcount");
const frqP = await from("ftooltextfreq");
const revP = await from("ftooltextreverse");
const romP = await from("ftoolroman");
const rotP = await from("ftoolrot13");
const tsP = await from("ftooltimestamp");
const uidP = await from("ftooluuid");
const hexP = await from("ftooltexthex");
const urlP = await from("ftoolurlcode");
const b32P = await from("ftoolbase32");
const ascP = await from("ftoolasciitext");
const nwP = await from("ftoolnumberwords");
const durP = await from("ftooldurasi");
const stP = await from("ftoolstriptags");
const ddP = await from("ftooldeduplines");
const slP = await from("ftoolsortlines");
const ntP = await from("ftoolnato");
const erP = await from("ftoolemojiremove");
const rpP = await from("ftoolreplace");
const { fromSC } = await import("../../src/lib/styler.js");
const sc = (s) => fromSC(String(s || "")).toLowerCase();

let pass = 0, fail = 0;
const w = (s) => process.stdout.write(s + "\n");
const t = (name, ok, extra) => { w((ok ? "✅ " : "❌ ") + name + (ok ? "" : " — " + (extra || ""))); ok ? pass++ : fail++; };

function mkM(text, command) {
  const o = {
    command: command || "x", prefix: ".", chat: "1203630@g.us",
    text, replyed: [], reacts: [], sends: [],
    reply: async (s) => { o.replyed.push(String(s)); return o; },
    react: async (e) => { o.reacts.push(e); return o; },
  };
  o.sock = { sendMessage: async (c, x) => { o.sends.push(x); return { key: { id: "x" } }; } };
  return o;
}
const run = (plug, m) => plug.handler(m, { sock: m.sock, config: { command: { prefix: "." } } });
const last = (m) => sc(m.replyed[m.replyed.length - 1] || "");
const has = (m, ...kws) => { const L = last(m); return kws.every((k) => L.includes(sc(k))); };

// ═══ 1. REGISTRY ═══
w("\n— registry —");
const plugs = [["ftooljwt", jwtP], ["textrepeat", repP], ["slugify", slugP], ["textcount", cntP], ["textfreq", frqP], ["textreverse", revP]];
t("  6 plugin config utuh: tools + enabled + cd 3",
  plugs.every(([, p]) => p.config.category === "tools" && p.config.isEnabled === true && p.config.cooldown === 3 && p.config.name.startsWith("ftool")),
  plugs.map(([, p]) => p.config.cooldown).join(","));
t("  6 handler exported", plugs.every(([, p]) => typeof p.handler === "function"));
const plugs2 = [["roman", romP], ["rot13", rotP], ["timestamp", tsP], ["uuid", uidP], ["texthex", hexP], ["urlcode", urlP]];
t("  batch 2: 6 plugin tools + enabled + cd 3", plugs2.every(([, p]) => p.config.category === "tools" && p.config.isEnabled === true && p.config.cooldown === 3 && p.config.name.startsWith("ftool")));
t("  batch 2: 6 handler exported", plugs2.every(([, p]) => typeof p.handler === "function"));
const plugs3 = [["ftoolbase32", b32P], ["ftoolasciitext", ascP], ["ftoolnumberwords", nwP], ["ftooldurasi", durP], ["ftoolstriptags", stP], ["ftooldeduplines", ddP], ["ftoolsortlines", slP], ["ftoolnato", ntP], ["ftoolemojiremove", erP], ["ftoolreplace", rpP]];
t("  batch 3: 10 plugin ftool prefix + tools + cd 3", plugs3.every(([, p]) => p.config.name.startsWith("ftool") && p.config.category === "tools" && p.config.isEnabled === true && p.config.cooldown === 3));
t("  batch 3: 10 handler exported", plugs3.every(([, p]) => typeof p.handler === "function"));

// ═══ 2. JWT ═══
w("\n— .jwt —");
const b64u = (o) => Buffer.from(JSON.stringify(o)).toString("base64url");
const nowSec = Math.floor(Date.now() / 1000);
const tokOk = `${b64u({ alg: "HS256", typ: "JWT" })}.${b64u({ sub: "123", name: "Aizat", iat: nowSec, exp: nowSec + 3600 })}.SflKxwRJ`;
{
  const m = mkM(tokOk, "ftooljwt"); await run(jwtP, m);
  t("  token valid: alg HS256 + nama + AKTIF", has(m, "HS256", "Aizat", "AKTIF") && m.reacts.includes("🐣"), last(m).substring(0, 120));
}
{
  const tokExp = `${b64u({ alg: "HS256" })}.${b64u({ sub: "x", exp: nowSec - 100 })}.sig`;
  const m = mkM(tokExp, "ftooljwt"); await run(jwtP, m);
  t("  token kadaluarsa: status KADALUARSA", has(m, "KADALUARSA"), last(m).substring(0, 160));
}
{
  const m = mkM("bukan.jwt.tokennnn.", "ftooljwt"); await run(jwtP, m);
  // bagian ke-3 kosong? "bukan.jwt.tokennnn." split → ["bukan","jwt","tokennnn",""] 4 part → salah
  t("  format salah (4 bagian) → pesan salah cmd", m.reacts.includes("❌") && last(m).length > 0);
}
{
  const m = mkM("abc.def", "ftooljwt"); await run(jwtP, m);
  t("  2 bagian → format gak valid", has(m, "gak valid") && m.reacts.includes("❌"), last(m).substring(0, 120));
}
{
  const m = mkM("", "ftooljwt"); await run(jwtP, m);
  t("  tanpa token → kartu usage", last(m).includes(sc("ftooljwt")) && m.reacts.includes("🕒"));
}

// ═══ 3. TEXTREPEAT ═══
w("\n— .textrepeat —");
{
  const m = mkM("5|halo", "ftooltextrepeat"); await run(repP, m);
  const count = (last(m).match(/halo/g) || []).length;
  t("  5|halo → halo muncul 5x + 🐣", count === 5 && m.reacts.includes("🐣"), "count=" + count);
}
{
  const m = mkM("50|x", "ftooltextrepeat"); await run(repP, m);
  t("  50x dibatasi jadi 20x (note cap muncul)", has(m, "jumlah 50 dibatasi jadi 20x"), last(m).substring(0, 160));
}
{
  const m = mkM("0|abc", "ftooltextrepeat"); await run(repP, m);
  t("  0x → pesan salah cmd + ❌", m.reacts.includes("❌") && last(m).length > 0);
}
{
  const m = mkM("3", "ftooltextrepeat"); await run(repP, m);
  t("  tanpa pipe → kartu usage", m.reacts.includes("🕒") && last(m).includes(sc("ftooltextrepeat")));
}

// ═══ 4. SLUGIFY ═══
w("\n— .slugify —");
{
  const m = mkM("Halo Dunia Baru 2026!", "ftoolslugify"); await run(slugP, m);
  t("  'Halo Dunia Baru 2026!' → halo-dunia-baru-2026", has(m, "halo-dunia-baru-2026") && m.reacts.includes("🐣"), last(m).substring(0, 120));
}
{
  const m = mkM("!!! ??? ---", "ftoolslugify"); await run(slugP, m);
  t("  teks tanpa alfanumerik → pesan salah + ❌", m.reacts.includes("❌") && last(m).length > 0);
}
{
  const m = mkM("  Café ÜNICODE  ", "ftoolslugify"); await run(slugP, m);
  t("  aksen unicode diratakan: cafe-unicode", has(m, "cafe-unicode"));
}

// ═══ 5. TEXTCOUNT ═══
w("\n— .textcount —");
{
  const m = mkM("Halo dunia. Ini tes!", "ftooltextcount"); await run(cntP, m);
  t("  'Halo dunia. Ini tes!' → 4 kata, 2 kalimat", has(m, "kata: 4", "kalimat: 2") && m.reacts.includes("🐣"), last(m).substring(0, 160));
}
{
  const m = mkM("satu", "ftooltextcount"); await run(cntP, m);
  t("  1 kata → 1 kalimat, estimasi baca muncul", has(m, "kata: 1", "kalimat: 1", "estimasi baca"));
}
{
  const m = mkM("", "ftooltextcount"); await run(cntP, m);
  t("  tanpa teks → kartu usage", last(m).includes(sc("ftooltextcount")));
}

// ═══ 6. TEXTFREQ ═══
w("\n— .textfreq —");
{
  const m = mkM("aku belajar karena aku suka ai dan aku suka belajar", "ftooltextfreq"); await run(frqP, m);
  t("  aku ×3 teratas + belajar ×2", has(m, "aku ×3", "belajar ×2", "total kata: 10") && m.reacts.includes("🐣"), last(m).substring(0, 160));
}
{
  const m = mkM("!!! ...", "ftooltextfreq"); await run(frqP, m);
  t("  tanpa kata → error jujur + ❌", m.reacts.includes("❌") && has(m, "error"));
}

// ═══ 7. TEXTREVERSE ═══
w("\n— .textreverse —");
{
  const m = mkM("halo dunia", "ftooltextreverse"); await run(revP, m);
  t("  'halo dunia' → 'ainud olah'", has(m, "ainud olah") && m.reacts.includes("🐣"), last(m).substring(0, 120));
}
{
  const m = mkM("a🙂b", "ftooltextreverse"); await run(revP, m);
  t("  emoji utuh dibalik: b🙂a", has(m, "b🙂a"));
}
{
  const m = mkM("", "ftooltextreverse"); await run(revP, m);
  t("  tanpa teks → kartu usage", last(m).includes(sc("ftooltextreverse")));
}

// ═══ 8. ROMAN ═══
w("\n— .roman —");
{
  const m = mkM("2026", "ftoolroman"); await run(romP, m);
  t("  2026 → MMXXVI", has(m, "MMXXVI") && m.reacts.includes("🐣"), last(m).substring(0, 120));
}
{
  const m = mkM("MMXXVI", "ftoolroman"); await run(romP, m);
  t("  MMXXVI → 2026", has(m, "2026"));
}
{
  const m = mkM("3999", "ftoolroman"); await run(romP, m);
  t("  3999 → MMMCMXCIX (batas atas)", has(m, "MMMCMXCIX"));
}
{
  const m = mkM("4000", "ftoolroman"); await run(romP, m);
  t("  4000 → di luar rentang + ❌", m.reacts.includes("❌") && last(m).length > 0);
}
{
  const m = mkM("IIII", "ftoolroman"); await run(romP, m);
  t("  IIII (format gak valid) → ditolak + ❌", m.reacts.includes("❌"));
}
{
  const m = mkM("", "ftoolroman"); await run(romP, m);
  t("  tanpa input → kartu usage", last(m).includes(sc("ftoolroman")));
}

// ═══ 9. ROT13 ═══
w("\n— .rot13 —");
{
  const m = mkM("halo dunia", "ftoolrot13"); await run(rotP, m);
  t("  'halo dunia' → 'unyb qhavn'", has(m, "unyb qhavn") && m.reacts.includes("🐣"), last(m).substring(0, 120));
}
{
  const m2 = mkM("unyb qhavn", "ftoolrot13"); await run(rotP, m2);
  t("  symmetric: rot13(rot13(x)) = x", has(m2, "halo dunia"));
}
{
  const m = mkM("A🙂B 123", "ftoolrot13"); await run(rotP, m);
  t("  besar tetap besar + emoji/angka gak disentuh", has(m, "N🙂O 123"));
}

// ═══ 10. TIMESTAMP ═══
w("\n— .timestamp —");
{
  const m = mkM("1727300000", "ftooltimestamp"); await run(tsP, m);
  t("  angka → tanggal WIB + relatif", has(m, "2024") && (has(m, "yang lalu") || has(m, "ke depan")) && m.reacts.includes("🐣"), last(m).substring(0, 200));
}
{
  const m = mkM("", "ftooltimestamp"); await run(tsP, m);
  t("  tanpa arg → waktu sekarang", has(m, "waktu sekarang") && last(m).match(/\d{10}/));
}
{
  const m = mkM("2026-09-26", "ftooltimestamp"); await run(tsP, m);
  t("  yyyy-mm-dd (00:00 WIB) → 1790355600", has(m, "1790355600"), last(m).substring(0, 200));
}
{
  const m = mkM("26-09-2026 14:30", "ftooltimestamp"); await run(tsP, m);
  t("  dd-mm-yyyy HH:mm → 1790407800", has(m, "1790407800"), last(m).substring(0, 200));
}
{
  const m = mkM("bukan-tanggal", "ftooltimestamp"); await run(tsP, m);
  t("  format aneh → pesan salah + ❌", m.reacts.includes("❌") && last(m).length > 0);
}

// ═══ 11. UUID ═══
w("\n— .uuid —");
{
  const m = mkM("", "ftooluuid"); await run(uidP, m);
  t("  default 1 uuid v4 valid", last(m).match(/[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/) && m.reacts.includes("🐣"));
}
{
  const m = mkM("5", "ftooluuid"); await run(uidP, m);
  t("  .uuid 5 → 5 uuid", (last(m).match(/[0-9a-f]{8}-/g) || []).length === 5);
}
{
  const m = mkM("0", "ftooluuid"); await run(uidP, m);
  t("  0 → pesan salah + ❌", m.reacts.includes("❌"));
}

// ═══ 12. TEXTHEX ═══
w("\n— .texthex —");
{
  const m = mkM("enc halo", "ftooltexthex"); await run(hexP, m);
  t("  enc halo → 68616c6f", has(m, "68616c6f") && m.reacts.includes("🐣"), last(m).substring(0, 120));
}
{
  const m = mkM("dec 68616c6f", "ftooltexthex"); await run(hexP, m);
  t("  dec 68616c6f → halo", has(m, "halo"));
}
{
  const m = mkM("dec xyz", "ftooltexthex"); await run(hexP, m);
  t("  hex gak valid → ditolak + ❌", m.reacts.includes("❌"));
}
{
  const m = mkM("dec 686", "ftooltexthex"); await run(hexP, m);
  t("  hex ganjil → ditolak + ❌", m.reacts.includes("❌"));
}

// ═══ 13. URLCODE ═══
w("\n— .urlcode —");
{
  const m = mkM("enc halo dunia? 1=2", "ftoolurlcode"); await run(urlP, m);
  t("  enc → halo%20dunia%3F%201%3D2", has(m, "halo%20dunia%3F%201%3D2") && m.reacts.includes("🐣"), last(m).substring(0, 120));
}
{
  const m = mkM("dec halo%20dunia", "ftoolurlcode"); await run(urlP, m);
  t("  dec → halo dunia", has(m, "halo dunia"));
}
{
  const m = mkM("dec %zz", "ftoolurlcode"); await run(urlP, m);
  t("  % gak valid → ditolak + ❌", m.reacts.includes("❌"));
}

// ═══ 14. BASE32 ═══
w("\n— .ftoolbase32 —");
{
  const m = mkM("enc foobar", "ftoolbase32"); await run(b32P, m);
  t("  enc foobar → MZXW6YTBOI====== (RFC 4648)", has(m, "MZXW6YTBOI======") && m.reacts.includes("🐣"), last(m).substring(0, 120));
}
{
  const m = mkM("enc f", "ftoolbase32"); await run(b32P, m);
  t("  enc f → MY======", has(m, "MY======"));
}
{
  const m = mkM("dec MZXW6YTBOI", "ftoolbase32"); await run(b32P, m);
  t("  dec MZXW6YTBOI → foobar", has(m, "foobar"));
}
{
  const m = mkM("dec bukan-base32-1!", "ftoolbase32"); await run(b32P, m);
  t("  dec invalid → pesan salah + ❌", m.reacts.includes("❌"));
}
{
  const m = mkM("", "ftoolbase32"); await run(b32P, m);
  t("  tanpa arg → kartu usage", last(m).includes(sc("ftoolbase32")));
}

// ═══ 15. ASCIITEXT ═══
w("\n— .ftoolasciitext —");
{
  const m = mkM("enc abc", "ftoolasciitext"); await run(ascP, m);
  t("  enc abc → 97 98 99", has(m, "97 98 99") && m.reacts.includes("🐣"), last(m).substring(0, 120));
}
{
  const m = mkM("dec 104 97 108 111", "ftoolasciitext"); await run(ascP, m);
  t("  dec 104 97 108 111 → halo", has(m, "halo"));
}
{
  const m = mkM("dec 104,97", "ftoolasciitext"); await run(ascP, m);
  t("  dec pakai koma juga bisa → ha", has(m, "ha"));
}
{
  const m = mkM("dec xyz", "ftoolasciitext"); await run(ascP, m);
  t("  dec bukan angka → pesan salah + ❌", m.reacts.includes("❌"));
}

// ═══ 16. NUMBERWORDS ═══
w("\n— .ftoolnumberwords —");
{
  const m = mkM("2026", "ftoolnumberwords"); await run(nwP, m);
  t("  2026 → dua ribu dua puluh enam", has(m, "dua ribu dua puluh enam") && m.reacts.includes("🐣"), last(m).substring(0, 120));
}
{
  const m = mkM("1500000", "ftoolnumberwords"); await run(nwP, m);
  t("  1500000 → satu juta lima ratus ribu", has(m, "satu juta lima ratus ribu"));
}
{
  const m = mkM("100", "ftoolnumberwords"); await run(nwP, m);
  t("  100 → seratus", has(m, "seratus"));
}
{
  const m = mkM("0", "ftoolnumberwords"); await run(nwP, m);
  t("  0 → nol", has(m, "nol"));
}
{
  const m = mkM("15", "ftoolnumberwords"); await run(nwP, m);
  t("  15 → lima belas", has(m, "lima belas"));
}
{
  const m = mkM("1001", "ftoolnumberwords"); await run(nwP, m);
  t("  1001 → seribu satu", has(m, "seribu satu"));
}
{
  const m = mkM("abc", "ftoolnumberwords"); await run(nwP, m);
  t("  input bukan angka → pesan salah + ❌", m.reacts.includes("❌"));
}

// ═══ 17. DURASI ═══
w("\n— .ftooldurasi —");
{
  const m = mkM("2026-09-26|2026-12-31", "ftooldurasi"); await run(durP, m);
  t("  26 Sep → 31 Des 2026 = 96 hari (13 mgg 5 hr)", has(m, "96 hari", "13 minggu 5 hari") && m.reacts.includes("🐣"), last(m).substring(0, 220));
}
{
  const m = mkM("2026-12-31|2026-09-26", "ftooldurasi"); await run(durP, m);
  t("  urutan dibalik → hasil sama (swap otomatis)", has(m, "96 hari"));
}
{
  const m = mkM("26-09-2026 08:00|26-09-2026 10:30", "ftooldurasi"); await run(durP, m);
  t("  selisih jam → total 0 hari + detail 2 jam 30 menit", has(m, "total: 0 hari", "2 jam 30 menit"), last(m).substring(0, 220));
}
{
  const m = mkM("besok|lusa", "ftooldurasi"); await run(durP, m);
  t("  tanggal gak valid → pesan salah + ❌", m.reacts.includes("❌"));
}

// ═══ 18. STRIPTAGS ═══
w("\n— .ftoolstriptags —");
{
  const m = mkM("<p>halo <b>dunia</b></p>", "ftoolstriptags"); await run(stP, m);
  t("  tag dibuang: halo dunia", has(m, "halo dunia") && !last(m).includes("<b>") && m.reacts.includes("🐣"), last(m).substring(0, 160));
}
{
  const m = mkM("a &amp; b", "ftoolstriptags"); await run(stP, m);
  t("  entity &amp; → &", has(m, "a & b"));
}
{
  const m = mkM("<br>", "ftoolstriptags"); await run(stP, m);
  t("  hasil kosong → error jujur + ❌", m.reacts.includes("❌"));
}

// ═══ 19. DEDUPLINES ═══
w("\n— .ftooldeduplines —");
{
  const m = mkM("nasi\ngoreng\nnasi\nbakso", "ftooldeduplines"); await run(ddP, m);
  t("  4 baris → 3 unik, dihapus 1", has(m, "unik: 3", "dihapus: 1") && m.reacts.includes("🐣"), last(m).substring(0, 200));
}
{
  const m = mkM("a\nb\na\nb\na", "ftooldeduplines"); await run(ddP, m);
  t("  urutan pertama dipertahankan", last(m).indexOf("a") < last(m).indexOf("b"));
}

// ═══ 20. SORTLINES ═══
w("\n— .ftoolsortlines —");
{
  const m = mkM("az mangga\napel\njeruk", "ftoolsortlines"); await run(slP, m);
  const scaz = last(m).replace(/\n/g, " ");
  t("  az → apel jeruk mangga (3 baris)", has(m, "×3 baris") && sc(scaz).indexOf("apel") < sc(scaz).indexOf("jeruk") && sc(scaz).indexOf("jeruk") < sc(scaz).indexOf("mangga") && m.reacts.includes("🐣"), last(m).substring(0, 200));
}
{
  const m = mkM("za mangga\napel\njeruk", "ftoolsortlines"); await run(slP, m);
  const scza = sc(last(m)).replace(/\n/g, " ");
  t("  za → mangga jeruk apel", scza.indexOf("mangga") < scza.indexOf("apel"));
}
{
  const m = mkM("acak x\ny\nz", "ftoolsortlines"); await run(slP, m);
  t("  acak → 3 baris tetap lengkap", last(m).includes("x") && last(m).includes("y") && last(m).includes("z"));
}
{
  const m = mkM("turun mangga apel", "ftoolsortlines"); await run(slP, m);
  t("  mode gak dikenal → kartu usage", last(m).includes(sc("ftoolsortlines")));
}

// ═══ 21. NATO ═══
w("\n— .ftoolnato —");
{
  const m = mkM("budi", "ftoolnato"); await run(ntP, m);
  t("  budi → Bravo Uniform Delta India", has(m, "bravo uniform delta india") && m.reacts.includes("🐣"), last(m).substring(0, 120));
}
{
  const m = mkM("b1", "ftoolnato"); await run(ntP, m);
  t("  angka ikut dieja: b1 → Bravo One", has(m, "bravo one"));
}

// ═══ 22. EMOJIREMOVE ═══
w("\n— .ftoolemojiremove —");
{
  const m = mkM("halo 🎉 dunia 😄", "ftoolemojiremove"); await run(erP, m);
  t("  emoji dibuang: halo dunia", has(m, "halo dunia") && !last(m).includes("🎉") && m.reacts.includes("🐣"), last(m).substring(0, 120));
}
{
  const m = mkM("🎉😄", "ftoolemojiremove"); await run(erP, m);
  t("  isinya emoji semua → error jujur + ❌", m.reacts.includes("❌"));
}

// ═══ 23. REPLACE ═══
w("\n— .ftoolreplace —");
{
  const m = mkM("kucing|anjing|kucing hitam dan kucing putih", "ftoolreplace"); await run(rpP, m);
  t("  kucing→anjing 2x diganti", has(m, "anjing hitam dan anjing putih", "2x diganti") && m.reacts.includes("🐣"), last(m).substring(0, 220));
}
{
  const m = mkM("halo||halo dunia", "ftoolreplace"); await run(rpP, m);
  t("  hapus mode (ke kosong) → dunia", has(m, "dunia"));
}
{
  const m = mkM("x", "ftoolreplace"); await run(rpP, m);
  t("  kurang argumen → kartu usage", last(m).includes(sc("ftoolreplace")));
}

fs.rmSync(new URL("./e2e-db.json", import.meta.url), { recursive: true, force: true });
w("\n===== " + pass + " PASS, " + fail + " FAIL =====");
process.exit(fail ? 1 : 0);
