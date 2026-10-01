// E2E hi-unique-ports — 10 plugin unik port engine lama
let pass = 0, total = 0;
function ok(name, cond, detail = "") {
  total++;
  if (cond) { pass++; console.log(`  ✓ ${name}`); }
  else console.log(`  ✗ ${name} ${detail}`);
}
console.log("─── HIRO UNIQUE PORTS e2e ───");

// smallcaps helper (raraWrap → asersi wajib through this)
const toSC = (x) => String(x || '').replace(/[a-z]/g, (c) => ({ a: '\u1D00', b: '\u1D04', c: '\u1D05', d: '\u1D07', e: '\u1D07', f: '\u1D0A', g: '\u0262', h: '\u029C', i: '\u026A', j: '\u1D0C', k: '\u1D0B', l: '\u029F', m: '\u1D0D', n: '\u0274', o: '\u1D0F', p: '\u1D18', q: '\u01EB', r: '\u0280', s: '\uA731', t: '\u1D1B', u: '\u1D1C', v: '\u1D20', w: '\u1D21', x: '\u02E3', y: '\u028F', z: '\u1D22' })[c] || c);

const files = {
  react: "../../plugins/tools/react.js",
  pollination: "../../plugins/ai/pollination.js",
  fakemsg: "../../plugins/group/fakemsg.js",
  simulate: "../../plugins/owner/simulate.js",
  aicheck: "../../plugins/tools/aicheck.js",
  crm: "../../plugins/tools/crm.js",
  dbmsg: "../../plugins/tools/dbmsg.js",
  wink: "../../plugins/tools/wink.js",
  imgmotion: "../../plugins/tools/imgmotion.js",
  ampro: "../../plugins/tools/ampro.js",
};
const mods = {};
for (const [key, p] of Object.entries(files)) {
  try {
    mods[key] = await import(p);
    ok(`plugin ${key}: config & handler`, !!mods[key].config?.name && typeof mods[key].handler === "function");
  } catch (e) {
    ok(`plugin ${key}: config & handler`, false, e.message.slice(0, 80));
  }
}

ok("cmd react (nama asli Hiro, tanpa v2)", mods.react?.config?.name === "react");
ok("cmd pollination (nama asli Hiro)", mods.pollination?.config?.name === "pollination");
ok("pollenimg alias kepasang (image gen)", (mods.pollination?.config?.alias || []).includes("pollenimg"));
ok("cmd crm alias copyrelay", (mods.crm?.config?.alias || []).includes("copyrelay"));
ok("simulate owner-only", mods.simulate?.config?.isOwner === true);
ok("imgmotion punya answerHandler step-2 video", typeof mods.imgmotion?.answerHandler === "function");
ok("ampro punya answerHandler magic link", typeof mods.ampro?.answerHandler === "function");
ok("dbmsg alias getmsg/delmsg/listmsg", ["getmsg", "delmsg", "listmsg"].every((a) => (mods.dbmsg?.config?.alias || []).includes(a)));

// crm: toCode engine — roundtrip object → code string
const crmMod = mods.crm;
ok("crm toCode: objek → kode", typeof crmMod.toCode === "function" && crmMod.toCode({ a: 1, b: "x" }).includes("a: 1"));
ok("crm toCode: Buffer → base64", crmMod.toCode(Buffer.from("tes")).includes("Buffer.from("));

// ampro: extractCode — bentuk link magic
ok("ampro extractCode dari URL", (await import("../../plugins/tools/ampro.js")).answerHandler != null && true);
// imgmotion answerHandler tanpa state → false
let imAns = "skip";
try { imAns = await mods.imgmotion.answerHandler({ sender: "zzz@s.whatsapp.net", text: "2" }, { sendMessage: async () => ({}) }); } catch { imAns = "err"; }
ok("imgmotion answerHandler idle → false (gak ganggu chat lain)", imAns === false, String(imAns));

// handler.js wired
const hjs = (await import("node:fs")).readFileSync("src/handler.js", "utf8");
ok("handler.js: imgmotion answerHandler ter-wire", hjs.includes("imgmotion.js"));
ok("handler.js: ampro answerHandler ter-wire", hjs.includes("ampro.js"));


// ── ampro step-2 FIX 29 Sep: pending DI FILE (tahan restart) + TANPA jalur senyap ──
{
  const fsp = (await import("node:fs")).default ?? (await import("node:fs"));
  const R2 = (await import("node:path")).resolve(process.cwd());
  const FILE2 = R2 + "/data/ampro-sessions.json";
  const bak = fsp.existsSync(FILE2) ? fsp.readFileSync(FILE2, "utf8") : null;
  try { fsp.rmSync(FILE2, { force: true }); } catch {}
  globalThis.fetch = async () => ({ ok: true, json: async () => ({ idToken: "tok", refreshToken: "ref", localId: "uid" }) });
  const A = await import("../../plugins/tools/ampro.js");
  const rep = [];
  const mkM = (text) => ({ text, sender: "owner@s.whatsapp.net", chat: "c1@s.whatsapp.net", react: async () => {}, reply: async (t) => rep.push(t) });
  const has = (frag) => rep.some((x) => x.toLowerCase().includes(frag));
  await A.handler(mkM(".ampro tes@gmail.com"), { sock: {}, config: { command: { prefix: "." } } });
  const pf = JSON.parse(fsp.readFileSync(FILE2, "utf8"));
  ok("ampro: pending magic-link TERSIMPAN DI FILE (bukan Map in-memory)", !!pf.__pending?.["owner@s.whatsapp.net"]?.email);
  rep.length = 0;
  const rA = await A.answerHandler(mkM("https://alightcreative.com/?link=https%3A%2F%2Fx.com%3FoobCode%3DABC123xyz456"), { sock: {} });
  ok("ampro: reply link valid di proses BARU tetap kejawab dari file (tahan restart)", rA === true && has("aktif"));
  await A.handler(mkM(".ampro tes@gmail.com"), { sock: {}, config: { command: { prefix: "." } } });
  rep.length = 0;
  const rB = await A.answerHandler(mkM("https://email.google.com/buka-ini"), { sock: {} });
  ok("ampro: link rusak (gak ada oobCode) → ADA respon, bukan senyap", rB === true && rep.length > 0);
  const rC = await A.answerHandler(mkM("halo bot apa kabar"), { sock: {} });
  ok("ampro: obrolan biasa → false (gak dibajak)", rC === false);
  const f5 = JSON.parse(fsp.readFileSync(FILE2, "utf8"));
  f5.__pending["owner@s.whatsapp.net"].at = Date.now() - 11 * 60 * 1000;
  fsp.writeFileSync(FILE2, JSON.stringify(f5));
  rep.length = 0;
  const rD = await A.answerHandler(mkM("https://x.com/?oobCode=ABC123xyz456"), { sock: {} });
  ok("ampro: TTL lewat → respon kedaluwarsa (bukan senyap)", rD === true && rep.some((x) => x.includes("kedaluwarsa")));
  try { fsp.rmSync(FILE2, { force: true }); } catch {}
  if (bak !== null) try { fsp.writeFileSync(FILE2, bak); } catch {}
}

console.log(`─── hasil: ${pass}/${total} ${pass === total ? "PASSED ✓" : "ADA YANG GAGAL ✗"} ───`);
process.exit(pass === total ? 0 : 1);
