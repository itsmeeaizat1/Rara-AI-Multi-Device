// E2E — altftools native port (.jwt/.textrepeat/.slugify/.textcount/.textfreq/.textreverse)
// Sumber ide: altftool.com (13.947 tool browser) — di-port NATIVE offline, gak pake API situs itu.
import fs from "node:fs";
fs.rmSync(new URL("./e2e-db.json", import.meta.url), { recursive: true, force: true });
const { initDatabase } = await import("../../src/lib/nova-database.js");
await initDatabase(new URL("./e2e-db.json", import.meta.url).pathname);

const from = async (p) => await import("../../plugins/tools/" + p + ".js");
const jwtP = await from("jwt");
const repP = await from("textrepeat");
const slugP = await from("slugify");
const cntP = await from("textcount");
const frqP = await from("textfreq");
const revP = await from("textreverse");
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
const plugs = [["jwt", jwtP], ["textrepeat", repP], ["slugify", slugP], ["textcount", cntP], ["textfreq", frqP], ["textreverse", revP]];
t("  6 plugin config utuh: tools + enabled + cd 3",
  plugs.every(([, p]) => p.config.category === "tools" && p.config.isEnabled === true && p.config.cooldown === 3),
  plugs.map(([, p]) => p.config.cooldown).join(","));
t("  6 handler exported", plugs.every(([, p]) => typeof p.handler === "function"));

// ═══ 2. JWT ═══
w("\n— .jwt —");
const b64u = (o) => Buffer.from(JSON.stringify(o)).toString("base64url");
const nowSec = Math.floor(Date.now() / 1000);
const tokOk = `${b64u({ alg: "HS256", typ: "JWT" })}.${b64u({ sub: "123", name: "Aizat", iat: nowSec, exp: nowSec + 3600 })}.SflKxwRJ`;
{
  const m = mkM(tokOk, "jwt"); await run(jwtP, m);
  t("  token valid: alg HS256 + nama + AKTIF", has(m, "HS256", "Aizat", "AKTIF") && m.reacts.includes("🐣"), last(m).substring(0, 120));
}
{
  const tokExp = `${b64u({ alg: "HS256" })}.${b64u({ sub: "x", exp: nowSec - 100 })}.sig`;
  const m = mkM(tokExp, "jwt"); await run(jwtP, m);
  t("  token kadaluarsa: status KADALUARSA", has(m, "KADALUARSA"), last(m).substring(0, 160));
}
{
  const m = mkM("bukan.jwt.tokennnn.", "jwt"); await run(jwtP, m);
  // bagian ke-3 kosong? "bukan.jwt.tokennnn." split → ["bukan","jwt","tokennnn",""] 4 part → salah
  t("  format salah (4 bagian) → pesan salah cmd", m.reacts.includes("❌") && last(m).length > 0);
}
{
  const m = mkM("abc.def", "jwt"); await run(jwtP, m);
  t("  2 bagian → format gak valid", has(m, "gak valid") && m.reacts.includes("❌"), last(m).substring(0, 120));
}
{
  const m = mkM("", "jwt"); await run(jwtP, m);
  t("  tanpa token → kartu usage", last(m).includes(sc("jwt")) && m.reacts.includes("🕒"));
}

// ═══ 3. TEXTREPEAT ═══
w("\n— .textrepeat —");
{
  const m = mkM("5|halo", "textrepeat"); await run(repP, m);
  const count = (last(m).match(/halo/g) || []).length;
  t("  5|halo → halo muncul 5x + 🐣", count === 5 && m.reacts.includes("🐣"), "count=" + count);
}
{
  const m = mkM("50|x", "textrepeat"); await run(repP, m);
  t("  50x dibatasi jadi 20x (note cap muncul)", has(m, "jumlah 50 dibatasi jadi 20x"), last(m).substring(0, 160));
}
{
  const m = mkM("0|abc", "textrepeat"); await run(repP, m);
  t("  0x → pesan salah cmd + ❌", m.reacts.includes("❌") && last(m).length > 0);
}
{
  const m = mkM("3", "textrepeat"); await run(repP, m);
  t("  tanpa pipe → kartu usage", m.reacts.includes("🕒") && last(m).includes(sc("textrepeat")));
}

// ═══ 4. SLUGIFY ═══
w("\n— .slugify —");
{
  const m = mkM("Halo Dunia Baru 2026!", "slugify"); await run(slugP, m);
  t("  'Halo Dunia Baru 2026!' → halo-dunia-baru-2026", has(m, "halo-dunia-baru-2026") && m.reacts.includes("🐣"), last(m).substring(0, 120));
}
{
  const m = mkM("!!! ??? ---", "slugify"); await run(slugP, m);
  t("  teks tanpa alfanumerik → pesan salah + ❌", m.reacts.includes("❌") && last(m).length > 0);
}
{
  const m = mkM("  Café ÜNICODE  ", "slugify"); await run(slugP, m);
  t("  aksen unicode diratakan: cafe-unicode", has(m, "cafe-unicode"));
}

// ═══ 5. TEXTCOUNT ═══
w("\n— .textcount —");
{
  const m = mkM("Halo dunia. Ini tes!", "textcount"); await run(cntP, m);
  t("  'Halo dunia. Ini tes!' → 4 kata, 2 kalimat", has(m, "kata: 4", "kalimat: 2") && m.reacts.includes("🐣"), last(m).substring(0, 160));
}
{
  const m = mkM("satu", "textcount"); await run(cntP, m);
  t("  1 kata → 1 kalimat, estimasi baca muncul", has(m, "kata: 1", "kalimat: 1", "estimasi baca"));
}
{
  const m = mkM("", "textcount"); await run(cntP, m);
  t("  tanpa teks → kartu usage", last(m).includes(sc("textcount")));
}

// ═══ 6. TEXTFREQ ═══
w("\n— .textfreq —");
{
  const m = mkM("aku belajar karena aku suka ai dan aku suka belajar", "textfreq"); await run(frqP, m);
  t("  aku ×3 teratas + belajar ×2", has(m, "aku ×3", "belajar ×2", "total kata: 10") && m.reacts.includes("🐣"), last(m).substring(0, 160));
}
{
  const m = mkM("!!! ...", "textfreq"); await run(frqP, m);
  t("  tanpa kata → error jujur + ❌", m.reacts.includes("❌") && has(m, "error"));
}

// ═══ 7. TEXTREVERSE ═══
w("\n— .textreverse —");
{
  const m = mkM("halo dunia", "textreverse"); await run(revP, m);
  t("  'halo dunia' → 'ainud olah'", has(m, "ainud olah") && m.reacts.includes("🐣"), last(m).substring(0, 120));
}
{
  const m = mkM("a🙂b", "textreverse"); await run(revP, m);
  t("  emoji utuh dibalik: b🙂a", has(m, "b🙂a"));
}
{
  const m = mkM("", "textreverse"); await run(revP, m);
  t("  tanpa teks → kartu usage", last(m).includes(sc("textreverse")));
}

fs.rmSync(new URL("./e2e-db.json", import.meta.url), { recursive: true, force: true });
w("\n===== " + pass + " PASS, " + fail + " FAIL =====");
process.exit(fail ? 1 : 0);
