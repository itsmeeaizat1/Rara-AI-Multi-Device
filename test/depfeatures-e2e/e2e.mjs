// E2E 6 FITUR DARI AUDIT DEPENDENCIES (16 Sep 2026, owner: "ya kerjakan
// langsung ke 6 pluginnya") — mega/mal/calculator-mathjs/convert/obfuscate/
// figlet + upgrade didyoumean di handler.
// Seam jaringan di-inject — semua tes offline & deterministik.
// Jalankan dari repo root: node test/depfeatures-e2e/e2e.mjs
import { suggestCommand } from "../../src/lib/rara-command-suggest.js";

const R = "plugins".replace(/^.*$/, process.cwd()) ? process.cwd() : process.cwd();
let pass = 0, fail = 0;
const w = (s) => process.stdout.write(s + "\n");
const t = (name, ok, extra = "") => {
  w((ok ? "  ✅ " : "  ❌ ") + name + (ok ? "" : " — " + String(extra).slice(0, 200)));
  ok ? pass++ : fail++;
};

const makeM = (text, quoted) => {
  const replies = [];
  const m = {
    chat: "12036302@g.us", sender: "628123456789@s.whatsapp.net", isGroup: true, isOwner: true,
    text, quoted, replies,
    reply: async (txt) => { replies.push(String(txt)); },
    react: async () => {},
  };
  return m;
};
const makeSock = () => {
  const sends = [];
  return { sends, sendMessage: async (jid, content) => { sends.push({ jid, content }); } };
};
const CTX = { config: { command: { prefix: "." } }, prefix: "." };

w("\n— 1. suggestCommand (levenshtein + didyoumean) —");
const CMDS = ["menu", "haribesar", "harilibur", "haripenting", "calculator", "convert", "mal"];
t("1a. typo ketik: haribesr → haribesar", suggestCommand("haribesr", CMDS) === "haribesar");
t("1b. typo jauh (didyoumean): haribsar → haribesar", suggestCommand("haribsar", CMDS) === "haribesar", JSON.stringify(suggestCommand("haribsar", CMDS)));
t("1c. gak ada yang mirip → null", suggestCommand("zzzzzzzzzz", CMDS) === null);
t("1d. input kosong → null", suggestCommand("", CMDS) === null);

w("\n— 2. .mega downloader MEGA (seam, offline) —");
{
  const mod = await import(R + "/plugins/download/mega.js");
  t("2a. plugin ke-import + punya config & handler", !!mod.config && typeof mod.handler === "function");
  // sukses: file kecil
  const fakeFile = { name: "rara-test.zip", size: 2048, loadAttributes: async () => {}, downloadBuffer: async () => Buffer.alloc(2048, 7) };
  mod._setMegaForTest({ File: { fromURL: (u) => { if (!/mega\.nz\/file\//.test(u)) throw new Error("bad link"); return fakeFile; } } });
  const sock = makeSock();
  const m = makeM("https://mega.nz/file/AbCd1234#KkLl5678");
  await mod.handler(m, { ...CTX, sock });
  t("2b. file kecil → document terkirim (buffer 2KB)", sock.sends.length === 1 && sock.sends[0].content.document?.length === 2048 && sock.sends[0].content.fileName === "rara-test.zip", JSON.stringify(sock.sends.map(s => Object.keys(s.content))));
  // size limit 100 MB
  mod._setMegaForTest({ File: { fromURL: () => ({ name: "besar.iso", size: 200 * 1024 * 1024, loadAttributes: async () => {}, downloadBuffer: async () => Buffer.alloc(10) }) } });
  const m2 = makeM("https://mega.nz/file/AbCd1234#KkLl5678");
  await mod.handler(m2, { ...CTX, sock: makeSock() });
  t("2c. file > 100 MB ditolak dengan pesan ukuran", m2.replies.some((r) => /100/.test(r) && /mb|melebihi/i.test(r)), m2.replies.at(-1)?.slice(0, 120));
  // folder link
  const m3 = makeM("https://mega.nz/folder/AbCd1234#KkLl5678");
  await mod.handler(m3, { ...CTX, sock: makeSock() });
  t("2d. link folder → panduan (belum didukung)", m3.replies.some((r) => /folder|folder/i.test(r)));
  // tanpa link
  const m4 = makeM("halo ini bukan link");
  await mod.handler(m4, { ...CTX, sock: makeSock() });
  t("2e. bukan link MEGA → error jelas", m4.replies.some((r) => /[mm]ega|mega/i.test(r) && /ditemukan|link/i.test(r)));
  // link mati
  mod._setMegaForTest({ File: { fromURL: () => ({ loadAttributes: async () => { throw new Error("Resource not found"); } }) } });
  const m5 = makeM("https://mega.nz/file/ZZZZ#K");
  await mod.handler(m5, { ...CTX, sock: makeSock() });
  t("2f. file tidak ada → error asli diterjemahkan", m5.replies.some((r) => /ditemukan|dekripsi|tidak ditemukan|dekripsi/i.test(r)));
}

w("\n— 3. .mal suite MyAnimeList (seam, offline) —");
{
  const mod = await import(R + "/plugins/anime/mal.js");
  mod._setMalForTest({
    infoFromName: async (q) => ({ title: "Steins;Gate", score: 9.07, episodes: 24, type: "TV", status: "Finished Airing", synopsis: "Sains gila-gilaan dengan microwave.", genres: [{ name: "Thriller" }], studios: [{ name: "White Fox" }] }),
    search: async (q) => [{ name: "Steins;Gate", payload: { media_type: "TV", start_year: 2011 } }, { name: "Steins;Gate 0", payload: { media_type: "TV", start_year: 2018 } }],
    season: async (year, season) => [{ title: `Anime ${season} ${year}`, score: 8.5 }],
  });
  const m = makeM("steins gate");
  await mod.handler(m, { ...CTX, sock: makeSock() });
  t("3a. detail: judul + skor + episode kebaca", m.replies.some((r) => /steins|Steins/i.test(r) && /\*9\.07\*/.test(r) && /\*24\*/.test(r)), m.replies.at(-1)?.slice(0, 150));
  const m2 = makeM("cari steins");
  await mod.handler(m2, { ...CTX, sock: makeSock() });
  t("3b. .mal cari: daftar hasil", m2.replies.some((r) => /2\.\s*\*/.test(r) && /gate 0|Gate 0/i.test(r)));
  const m3 = makeM("musim 2026 fall");
  await mod.handler(m3, { ...CTX, sock: makeSock() });
  t("3c. .mal musim: anime musiman ter-list", m3.replies.some((r) => /2026/.test(r) && /fall|fall/i.test(r) && /anime fall|Anime fall/i.test(r)), m3.replies.at(-1)?.slice(0, 150));
  const m4 = makeM("");
  await mod.handler(m4, { ...CTX, sock: makeSock() });
  t("3d. tanpa input → panduan subcommand", m4.replies.length > 0 && /mal|mal/i.test(m4.replies.at(-1)));
  mod._setMalForTest({ infoFromName: async () => null, search: async () => [], season: async () => [] });
  const m5 = makeM("anime ngawur zzz");
  await mod.handler(m5, { ...CTX, sock: makeSock() });
  t("3e. tidak ditemukan → error + arahan cari", m5.replies.some((r) => /tidak ditemukan|tidak ditemukan/i.test(r)));
}

w("\n— 4. .calc calculator (mathjs, LIVE — parser murni) —");
{
  const mod = await import(R + "/plugins/tools/calculator.js");
  const m = makeM("sqrt(16) + 2^3");
  await mod.handler(m, { ...CTX, sock: makeSock() });
  t("4a. mathjs: sqrt(16)+2^3 = 12", m.replies.some((r) => /\*12\*/.test(r)), m.replies.at(-1)?.slice(0, 150));
  const m2 = makeM("sin(pi/2) * 5");
  await mod.handler(m2, { ...CTX, sock: makeSock() });
  t("4b. mathjs fungsi: sin(pi/2)*5 = 5", m2.replies.some((r) => /5\b/.test(r)), m2.replies.at(-1)?.slice(0, 150));
  const m3 = makeM("console.log(process.exit)");
  await mod.handler(m3, { ...CTX, sock: makeSock() });
  t("4c. injeksi kode DITOLAK (parser sandbox)", m3.replies.some((r) => /tidak valid|ekspresi/i.test(r)) && !m3.replies.some((r) => /Hasil/.test(r)), m3.replies.at(-1)?.slice(0, 120));
  const m4 = makeM("");
  await mod.handler(m4, { ...CTX, sock: makeSock() });
  t("4d. tanpa input → panduan", m4.replies.length > 0);
}

w("\n— 5. .convert konversi satuan (mathjs, LIVE) —");
{
  const mod = await import(R + "/plugins/tools/convert.js");
  const m = makeM("5 km ke mil");
  await mod.handler(m, { ...CTX, sock: makeSock() });
  t("5a. 5 km → 3.106856 mil (alias ID + display ID)", m.replies.some((r) => /3\.106856/.test(r)), m.replies.at(-1)?.slice(0, 150));
  const m2 = makeM("30 celcius ke fahrenheit");
  await mod.handler(m2, { ...CTX, sock: makeSock() });
  t("5b. 30 celcius → 86 fahrenheit", m2.replies.some((r) => /\*86/.test(r)), m2.replies.at(-1)?.slice(0, 150));
  const m3 = makeM("90 menit ke jam");
  await mod.handler(m3, { ...CTX, sock: makeSock() });
  t("5c. 90 menit → 1.5 jam", m3.replies.some((r) => /\*1\.5/.test(r)), m3.replies.at(-1)?.slice(0, 150));
  const m4 = makeM("5 km ke kg");
  await mod.handler(m4, { ...CTX, sock: makeSock() });
  t("5d. satuan beda dimensi → error jelas", m4.replies.some((r) => /tidak cocok|tidak cocok/i.test(r)), m4.replies.at(-1)?.slice(0, 120));
  const m5 = makeM("10 keping ke gigabyte");
  await mod.handler(m5, { ...CTX, sock: makeSock() });
  t("5e. satuan ngawur → daftar satuan didukung", m5.replies.some((r) => /tidak dikenal|didukung|tidak dikenal/i.test(r)));
  const m6 = makeM("");
  await mod.handler(m6, { ...CTX, sock: makeSock() });
  t("5f. tanpa input → panduan", m6.replies.length > 0);
}

w("\n— 6. .obfuscate JavaScript (lokal, LIVE) —");
{
  const mod = await import(R + "/plugins/tools/obfuscate.js");
  const m = makeM("const rahasia = 'password123'; console.log(rahasia);");
  await mod.handler(m, { ...CTX, sock: makeSock() });
  const out = m.replies.join("\n");
  t("6a. kode ke-obfuscate: string disembunyikan (base64/hex)", /_0x|base64|\x61/.test(out) && !/password123/.test(out), out.slice(0, 200));
  const m2 = makeM("const x = 1;");
  await mod.handler(m2, { ...CTX, sock: makeSock() });
  t("6b. kode kependekan → ditolak", m2.replies.some((r) => /kependekan|kependekan/i.test(r)));
  const m3 = makeM("");
  await mod.handler(m3, { ...CTX, sock: makeSock() });
  t("6c. tanpa input → panduan (termasuk reply kode)", m3.replies.length > 0 && /obfuscate/i.test(m3.replies.at(-1)));
  const m4 = makeM("", { text: "const rahasia = 'password123'; console.log(rahasia);" });
  await mod.handler(m4, { ...CTX, sock: makeSock() });
  t("6d. reply pesan kode juga jalan", m4.replies.some((r) => /kode berhasil|\`/.test(r)));
}

w("\n— 7. .figlet ASCII art (figlet, LIVE) —");
{
  const mod = await import(R + "/plugins/fun/figlet.js");
  const m = makeM("RARA");
  await mod.handler(m, { ...CTX, sock: makeSock() });
  t("7a. teks → ASCII art dalam code block", m.replies.some((r) => r.includes("```") && /N|V/.test(r.replace(/\s/g, "")) && r.length > 60), (m.replies.at(-1) || "").slice(0, 150));
  const m2 = makeM("RARA Doom");
  await mod.handler(m2, { ...CTX, sock: makeSock() });
  t("7b. font dipilih: DOOM dipakai", m2.replies.some((r) => /「 Doom 」|Doom/.test(r)), (m2.replies.at(-1) || "").slice(0, 80));
  const m3 = makeM("list");
  await mod.handler(m3, { ...CTX, sock: makeSock() });
  t("7c. .figlet list → daftar font", m3.replies.some((r) => /standard|Standard/i.test(r) && /doom|Doom/i.test(r)));
  const m4 = makeM("x".repeat(25));
  await mod.handler(m4, { ...CTX, sock: makeSock() });
  t("7d. teks kepanjangan → ditolak", m4.replies.some((r) => /kepanjangan|kepanjangan/i.test(r)));
  const m5 = makeM("RARA FontNgawur");
  await mod.handler(m5, { ...CTX, sock: makeSock() });
  t("7e. font gak dikenali → fallback Standard tetap jalan", m5.replies.some((r) => /Standard/.test(r)));
}

w("\n— 8. konvensi repo —");
{
  const fs = await import("fs");
  for (const f of ["plugins/download/mega.js", "plugins/anime/mal.js", "plugins/tools/convert.js", "plugins/tools/obfuscate.js", "plugins/fun/figlet.js", "plugins/tools/calculator.js"]) {
    const src = fs.readFileSync(`${f}`, "utf8");
    t(`8x. ${f}: default export utuh (anti exit-0-senyap)`, /export default/.test(src) && /isEnabled: true/.test(src));
  }
  const h = fs.readFileSync("src/handler.js", "utf8");
  t("8g. handler.js pakai suggestCommand (didyoumean terpasang)", h.includes("rara-command-suggest") && h.includes("suggestCommand("));
}

w(`\n===== ${pass} PASS, ${fail} FAIL =====`);
process.exit(fail ? 1 : 0);
