// E2E — .ZLIRIK (AI Lyrics Generator via zelapi /ai-generate)
import { strict as assert } from "assert";
import fs from "fs";

let pass = 0, fail = 0;
const w = (s) => process.stdout.write(s + "\n");
function check(name, cond, extra = "") {
  if (cond) { pass++; w(`  ✅ ${name}`); }
  else { fail++; w(`  ❌ ${name}${extra ? " — " + extra : ""}`); }
}

const TMP = "/tmp/lirikai-e2e";
fs.rmSync(TMP, { recursive: true, force: true });
fs.mkdirSync(TMP, { recursive: true });
process.env.NOVA_DB_DIR = TMP;
const { initDatabase } = await import("../../src/lib/rara-database.js");
await initDatabase(TMP + "/db.json");
const { fromSC } = await import("../../src/lib/styler.js");
const scr = await import("../../src/scraper/zelapi.js");
const norm = (s) => fromSC(String(s)).toLowerCase();

const plug = await import("../../plugins/ai/zlirik.js");

let sends = [], reacts = [], gotUrl = "";
const setHttp = (json, status = 200) => {
  scr._setZelHttpForTest(async (u) => {
    gotUrl = u;
    return { status, headers: { get: () => "application/json" }, json: async () => json };
  });
};
plug._setZelKeyForTest("testkey123");

const mk = (args) => ({
  args, chat: "gc@g.us", sender: "62user@s.whatsapp.net",
  react: async (r) => { reacts.push(r); },
  reply: async (t) => { sends.push(t); },
});
const run = async (args) => {
  sends = []; reacts = []; gotUrl = "";
  await plug.handler(mk(args), {});
  return norm(sends[0] || "");
};

// ── 1. tanpa topik → usage ──
w("\n— .zlirik (kosong) —");
{
  const card = await run([]);
  check("usage muncul", card.includes("generator lirik"));
  check("catatan jujur bukan audio", card.includes("bukan lagu") || card.includes("bukan audio"));
}

// ── 2. sukses via ailyrics (topik|genre|mood) ──
w("\n— .zlirik kehilangan sahabat | pop | sedih —");
{
  setHttp({
    status: true, creator: "Hazel", title: "Kenangan Terakhir", theme: "kehilangan sahabat",
    genre: "Pop", emotion: "Sedih", lyrics: "[Verse 1]\nKita pernah tertawa bersama\n[Chorus]\nKini kau tlah pergi",
  });
  const card = await run(["kehilangan", "sahabat", "|", "pop", "|", "sedih"]);
  check("judul muncul", card.includes("kenangan terakhir"));
  check("lirik muncul", card.includes("kita pernah tertawa"));
  check("url pakai ailyrics dulu", gotUrl.includes("/ai-generate/ailyrics") && gotUrl.includes("theme=kehilangan"));
  check("genre param terkirim", gotUrl.includes("genre=pop") || gotUrl.includes("genre=Pop"));
  check("react 🐣", reacts.includes("🐣"));
}

// ── 3. ailyrics gagal → fallback lyricsai ──
w("\n— fallback ke lyricsai kalau ailyrics gagal —");
{
  let calls = 0;
  scr._setZelHttpForTest(async (u) => {
    calls++;
    gotUrl = u;
    if (u.includes("ailyrics")) return { status: 200, headers: { get: () => "application/json" }, json: async () => ({ status: false, error: "timeout" }) };
    return { status: 200, headers: { get: () => "application/json" }, json: async () => ({ status: true, title: "DRAFT", lyrics: { full: "Baris lirik dari lyricsai" } }) };
  });
  const card = await run(["cinta", "yang", "hilang"]);
  check("2 kali panggil (ailyrics gagal → lyricsai)", calls === 2);
  check("lirik dari fallback muncul", card.includes("baris lirik dari lyricsai"));
}

// ── 4. keduanya mati ──
w("\n— keduanya mati —");
{
  setHttp({ status: false, error: "Arrearage - saldo habis" });
  const card = await run(["topik", "apa", "saja"]);
  check("error asli keluar", card.includes("arrearage") || card.includes("saldo habis"));
  check("react ❌", reacts.includes("❌"));
}

// ── 5. API_KEY kosong ──
w("\n— API_KEY kosong —");
{
  plug._setZelKeyForTest("");
  const card = await run(["topik", "apa", "saja"]);
  check("pesan key belum di-set", card.includes("belum di-set") || card.includes("apikeys"));
  plug._setZelKeyForTest("testkey123");
}

// ── 6. hanya pipe kosong (topic kosong tapi ada |) ──
w("\n— pipe doang tanpa topik —");
{
  const card = await run(["|", "pop"]);
  check("balik ke usage (topik wajib)", card.includes("generator lirik ai"));
}

w(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
