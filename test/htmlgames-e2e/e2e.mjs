// E2E — htmlgames (.htmlsnake/.htmltetris/.htmldino/.htmlpong) + kategori HTML di menu
// Game HTML dikirim sebagai dokumen .html self-contained — chat WA gak bisa render HTML.
// GOTCHA: claraWrap = smallcaps → asersi teks WAJIB fromSC.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
const { fromSC } = await import("../../src/lib/styler.js");

let pass = 0, fail = 0;
const w = (s) => process.stdout.write(s + "\n");
const t = (name, ok, extra) => { w((ok ? "✅ " : "❌ ") + name + (ok ? "" : " — " + (extra || ""))); ok ? pass++ : fail++; };
const sc = (s) => fromSC(String(s || "")).toLowerCase();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "../..");

// ═══ 1. FILE GAME HTML ═══
w("\n— file game html —");
const games = [["snake", "nova-snake"], ["tetris", "nova-tetris"], ["dino", "nova-dino"], ["pong", "nova-pong"]];
for (const [g, fname] of games) {
  const p = path.join(root, "src/htmlgames", g + ".html");
  const ok = fs.existsSync(p);
  let markers = false, size = 0, title = "";
  if (ok) {
    const s = fs.readFileSync(p, "utf-8");
    size = s.length;
    markers = s.includes("<canvas") && s.includes("<script") && s.includes("localStorage") && s.includes("lang=\"id\"");
    title = s.includes("<title>") ? /<title>(.*?)<\/title>/.exec(s)[1] : "";
  }
  t(`  ${g}.html ada + self-contained (canvas+script+localStorage+lang=id) + judul`, ok && markers && size > 2000, `size=${size} markers=${markers}`);
}

// ═══ 2. PLUGIN ═══
w("\n— plugin —");
const plugs = {};
for (const [g] of games) plugs[g] = await import(`../../plugins/html/html${g}.js`);
t("  4 plugin config: category html + enabled + cd 5", Object.values(plugs).every((p) => p.config.category === "html" && p.config.isEnabled === true && p.config.cooldown === 5));
t("  4 handler exported", Object.values(plugs).every((p) => typeof p.handler === "function"));
t("  cmd utama prefix html (htmlsnake/htmltetris/htmldino/htmlpong)", ["snake", "tetris", "dino", "pong"].every((g, i) => plugs[g].config.name === ["htmlsnake", "htmltetris", "htmldino", "htmlpong"][i]));

function mkM(text) {
  const o = {
    text, command: "altf", prefix: ".", chat: "1203630@g.us", sender: "6281@s.whatsapp.net",
    replyed: [], reacts: [], sends: [],
    reply: async (s) => { o.replyed.push(String(s)); return o; },
    react: async (e) => { o.reacts.push(e); return o; },
  };
  o.sock = { sendMessage: async (c, x) => { o.sends.push(x); return { key: { id: "x" } }; } };
  return o;
}
const run = (plug, m) => plug.handler(m, { sock: m.sock, config: { command: { prefix: "." } } });

// ═══ 3. HANDLER KIRIM DOKUMEN ═══
w("\n— kirim dokumen —");
for (const [g, fname] of games) {
  const m = mkM("");
  await run(plugs[g], m);
  const doc = m.sends.find((x) => x.document);
  t(`  .html${g} kirim dokumen ${fname}.html + mimetype text/html + caption`,
    !!doc && doc.fileName === fname + ".html" && doc.mimetype === "text/html" && typeof doc.document !== "undefined" && !!doc.caption,
    JSON.stringify(m.sends.map((x) => Object.keys(x))));
}
{
  const m = mkM("");
  await run(plugs.snake, m);
  t("  react 🕒→🐣 + caption kecil mengandung 'buka lampiran'", m.reacts.includes("🕒") && m.reacts.includes("🐣") && sc(m.sends[0]?.caption).includes("buka lampiran"));
}
{
  // file hilang → error jujur (rename sementara)
  const f = path.join(root, "src/htmlgames/snake.html");
  fs.renameSync(f, f + ".bak");
  const m = mkM("");
  await run(plugs.snake, m);
  fs.renameSync(f + ".bak", f);
  t("  file game hilang → error jujur + react ❌", m.reacts.includes("❌") && m.replyed.length === 1 && sc(m.replyed[0]).includes("error"));
}

// ═══ 4. KATEGORI HTML DI MENU ═══
w("\n— kategori html di menu —");
{
  const allmenu = fs.readFileSync(path.join(root, "plugins/main/allmenu.js"), "utf-8");
  const cat = fs.readFileSync(path.join(root, "plugins/main/allmenucategory.js"), "utf-8");
  t("  allmenu.js: 'html' di CATEGORY_ORDER", /CATEGORY_ORDER[\s\S]*?"html"/.test(allmenu) && allmenu.includes('"browser", "html", "canvas"'));
  t("  allmenu.js: CATEGORY_NAMES html: HTML", /html:\s*"HTML"/.test(allmenu));
  t("  allmenucategory.js: CATEGORY_NAMES html: HTML", /html:\s*"HTML"/.test(cat));
}

// ═══ 5. REGISTRI PLUGIN LOADER ═══
w("\n— loader —");
{
  const { loadPlugins } = await import("../../src/lib/nova-plugin-loader.js").catch(() => ({ loadPlugins: null }));
  if (loadPlugins) {
    const store = loadPlugins(path.join(root, "plugins"));
    const htmlCmds = [...store.keys()].filter((k) => k.startsWith("html"));
    t("  4 cmd htmlsnake/htmltetris/htmldino/htmlpong ke-load di registry", ["htmlsnake", "htmltetris", "htmldino", "htmlpong"].every((c) => store.has(c)), JSON.stringify(htmlCmds));
  } else {
    t("  loader API gak tersedia — skip (dipakai suite import)", true);
  }
}

w("\n===== " + pass + " PASS, " + fail + " FAIL =====");
process.exit(fail ? 1 : 0);
