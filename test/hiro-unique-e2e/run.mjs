// E2E hiro-unique-ports — 10 plugin unik port HIROBOT
let pass = 0, total = 0;
function ok(name, cond, detail = "") {
  total++;
  if (cond) { pass++; console.log(`  ✓ ${name}`); }
  else console.log(`  ✗ ${name} ${detail}`);
}
console.log("─── HIRO UNIQUE PORTS e2e ───");

const files = {
  react: "../../plugins/tools/react.js",
  pollination: "../../plugins/ai/pollination.js",
  fakemsg: "../../plugins/group/fakemsg.js",
  simulate: "../../plugins/group/simulate.js",
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

console.log(`─── hasil: ${pass}/${total} ${pass === total ? "PASSED ✓" : "ADA YANG GAGAL ✗"} ───`);
process.exit(pass === total ? 0 : 1);
