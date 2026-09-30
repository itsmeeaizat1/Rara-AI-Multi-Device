// E2E — CHATREVIVE (fitur grup #7: revive grup sepi dengan AI)
// Run: node test/chatrevive-e2e/run.mjs (dari ROOT repo)
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..", "..");
process.chdir(ROOT);

let PASS = 0, FAIL = 0, SECTION = "";
const results = [];
function section(name) { SECTION = name; console.log("\n─── " + name); }
function check(label, cond, extra = "") {
  if (cond) { PASS++; results.push(`✓ [${SECTION}] ${label}`); }
  else { FAIL++; results.push(`✗ [${SECTION}] ${label} ${extra ? "— " + extra : ""}`); console.log(`  ✗ ${label} ${extra ? "— " + extra : ""}`); }
}

// ── smallcaps-aware (GOTCHA: semua output bot smallcaps → asersi WAJIB fromSC)
const { toSC } = await import("../../src/lib/nova-menu-style.js");
const SC = { a:"ᴀ",b:"ʙ",c:"ᴄ",d:"ᴅ",e:"ᴇ",f:"ꜰ",g:"ɢ",h:"ʜ",i:"ɪ",j:"ᴊ",k:"ᴋ",l:"ʟ",m:"ᴍ",n:"ɴ",o:"ᴏ",p:"ᴘ",r:"ʀ",s:"ꜱ",t:"ᴛ",u:"ᴜ",v:"ᴠ",w:"ᴡ",y:"ʏ",z:"ᴢ" };
// GOTCHA: huruf smallcaps KELEWAT range [ᴀ-ᴢ] (ʜ=U+1D25, ʟ, ʀ, ʏ…)
// → WAJIB per-char dari mapping, JANGAN range regex.
const SC_RE = new RegExp("[" + Object.values(SC).join("") + "]", "gu");
const fromSC = (s) => String(s).replace(SC_RE, c => { for (const [k, v] of Object.entries(SC)) if (v === c) return k; return c; });

// ── engine + seams
const R = await import("../../src/lib/nova-chat-revive.js");
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), "chatrevive-e2e-"));
const STATE_FILE = path.join(TMP, "chatrevive.json");
R._setChatReviveFileForTest(STATE_FILE);

// ── fake sock (pola jasher)
function mkSock() {
  const sent = [];
  return { sent, sendMessage: async (jid, payload) => { sent.push({ jid, text: payload?.text || "" }); return { key: { id: "x" } }; } };
}

// ── waktu maquet: mulai epoch stabil
let NOW = 1_700_000_000_000;
R._setChatReviveNowForTest(() => NOW);

const G1 = "120363023@g.us";
const G2 = "987654@g.us";
const TG = "tg_g1004391233300@g.us";
const H1 = 3600000;

section("0. kode & wiring");
{
  const handlerSrc = fs.readFileSync("src/handler.js", "utf8");
  const indexSrc = fs.readFileSync("index.js", "utf8");
  const plugSrc = fs.readFileSync("plugins/group/chatrevive.js", "utf8");
  check("handler.js wire noteChatActivity", handlerSrc.includes("noteChatActivity(m.chat)"));
  check("index.js scheduler ChatRevive", indexSrc.includes('name: "ChatRevive"') && indexSrc.includes("nova-chat-revive"));
  check("plugin kategori group", plugSrc.includes('category: "group"'));
  check("plugin admin gate isAdmin", plugSrc.includes("isAdmin: true"));
  check("plugin export konvensi `config`", /export \{ pluginConfig as config, handler \}/.test(plugSrc));
  check("default threshold 6 jam", (await import("../../src/lib/nova-chat-revive.js")).getChatReviveStatus(G1).thresholdHours === 6);
}

section("1. default & state");
{
  R._resetChatReviveForTest();
  R._setChatReviveFileForTest(STATE_FILE);
  R._setChatReviveNowForTest(() => NOW);
  const st = R._chatReviveStateForTest();
  check("fresh pairing: groups kosong (bukan rule dummy)", Object.keys(st.groups).length === 0);
  const s = R.getChatReviveStatus(G1);
  check("status default off", s.on === false);
  check("status default sepiJam null (gak nebak)", s.sepiJam === null);
  const on = R.enableChatRevive(G1);
  check("enable ok", on.ok === true && on.thresholdHours === 6);
  R.enableChatRevive(G1); // enable dobel harus idempotent
  check("enable idempotent", R._chatReviveStateForTest().groups[G1].on === true);
  const off = R.disableChatRevive(G1);
  check("disable ok", off.ok === true && R.getChatReviveStatus(G1).on === false);
}

section("2. threshold");
{
  R._resetChatReviveForTest();
  R._setChatReviveFileForTest(STATE_FILE);
  const bad = R.setChatReviveThreshold(G1, "0");
  check("jam 0 ditolak jujur", bad.ok === false);
  const bad2 = R.setChatReviveThreshold(G1, "25");
  check("jam 25 ditolak jujur", bad2.ok === false);
  const bad3 = R.setChatReviveThreshold(G1, "abc");
  check("jam non-angka ditolak jujur", bad3.ok === false);
  const ok = R.setChatReviveThreshold(G1, "3");
  check("jam 3 diterima", ok.ok === true && ok.thresholdHours === 3);
}

section("3. noteChatActivity");
{
  R._resetChatReviveForTest();
  R._setChatReviveFileForTest(STATE_FILE);
  R._setChatReviveNowForTest(() => NOW);
  check("aktivitas grup WA dicatat", R.noteChatActivity(G1, NOW) === true);
  check("aktivitas grup TG (bridge) dicatat", R.noteChatActivity(TG, NOW) === true);
  check("DM gak dicatat", R.noteChatActivity("628123456789@s.whatsapp.net", NOW) === false);
  check("jid aneh gak dicatat", R.noteChatActivity("status@broadcast", NOW) === false);
  check("lastHumanAt tersimpan", R._chatReviveStateForTest().groups[G1].lastHumanAt === NOW);
}

section("4. tick — kondisi tolak");
{
  R._resetChatReviveForTest();
  R._setChatReviveFileForTest(STATE_FILE);
  R._setChatReviveNowForTest(() => NOW);
  R._setChatReviveAiForTest(async () => "kenapa kalian sepi semua? ada yang baru nonton apa bagus?");
  const sock = mkSock();

  // grup belum on → gak kirim walau udah mati 100 jam
  R.noteChatActivity(G1, NOW);
  NOW += 100 * H1;
  let r = await R.runChatReviveTick(sock);
  check("grup off → gak kirim", r.revived === 0 && sock.sent.length === 0);

  // on tapi belum sepi
  R.enableChatRevive(G1);
  R.noteChatActivity(G1, NOW);
  NOW += 2 * H1; // threshold 6, baru 2 jam
  r = await R.runChatReviveTick(sock);
  check("belum sepi (2/6 jam) → gak kirim", r.revived === 0 && sock.sent.length === 0);

  // gak ada aktivitas tercatat → gak nebak (jam gak dimajuin biar G1 masih "belum sepi")
  R.enableChatRevive(G2);
  r = await R.runChatReviveTick(sock);
  const g2why = r.skipped.find((x) => x.startsWith(G2));
  check("tanpa jejak aktivitas → skip jujur", !r.sent && g2why && g2why.includes("belum ada aktivitas"));
  check("total kirim masih 0", sock.sent.length === 0);
}

section("5. tick — revive sehat");
{
  R._resetChatReviveForTest();
  R._setChatReviveFileForTest(STATE_FILE);
  R._setChatReviveNowForTest(() => NOW);
  R._setChatReviveAiForTest(async () => "udah jam segini masih sepi semua?\n\nBy the way ada yang pernah coba martabak keju+coklat dibikin satu? rasanya kok bikin perang justru enak\n- bullet nyasar");
  const sock = mkSock();

  R.enableChatRevive(G1);
  R.setChatReviveThreshold(G1, "2");
  R.noteChatActivity(G1, NOW);
  NOW += 3 * H1; // sepi 3 jam ≥ threshold 2 jam
  const r = await R.runChatReviveTick(sock);
  check("revive terkirim 1x", r.revived === 1 && sock.sent.length === 1);
  const text = sock.sent[0].text;
  check("output AI dibersihin: satu baris", text && !text.includes("\n"));
  check("output AI: bullet marker dibuang", !/^- /.test(text) && !text.startsWith("-"));
  check("output AI: bold/backtick dibuang", !/[*`]/.test(text));
  check("lastReviveAt tercatat", R._chatReviveStateForTest().groups[G1].lastReviveAt === NOW);
  check("todayCount jadi 1", R._chatReviveStateForTest().groups[G1].todayCount === 1);

  // window belum lewat → gak dobel
  NOW += 1 * H1;
  const r2 = await R.runChatReviveTick(sock);
  check("1 revive per window → gak dobel", r2.revived === 0 && sock.sent.length === 1);

  // window lewat tapi max 3/hari (gap 2 jam = pas threshold)
  NOW += 2 * H1;
  await R.runChatReviveTick(sock); // ke-2
  NOW += 2 * H1;
  await R.runChatReviveTick(sock); // ke-3
  check("3 revive kirim", sock.sent.length === 3);
  NOW += 2 * H1;
  const r4 = await R.runChatReviveTick(sock);
  check("kuota 3/hari habis → stop", r4.revived === 0 && sock.sent.length === 3);
  const why = r4.skipped.find((x) => x.startsWith(G1));
  check("alasan kuota jujur", why && why.includes("kuota harian"));

  // ganti hari WIB → kuota reset (loncat 24 jam pasti nyebrang hari)
  NOW += 24 * H1;
  const r5 = await R.runChatReviveTick(sock);
  check("ganti hari WIB → kuota reset & revive lagi", r5.revived === 1 && sock.sent.length === 4);
}

section("6. tick — AI gagal → skip senyap (jujur, gak ada template)");
{
  R._resetChatReviveForTest();
  R._setChatReviveFileForTest(STATE_FILE);
  R._setChatReviveNowForTest(() => NOW);
  R._setChatReviveAiForTest(async () => "");
  const sock = mkSock();
  R.enableChatRevive(G1);
  R.noteChatActivity(G1, NOW);
  NOW += 7 * H1;
  const r = await R.runChatReviveTick(sock);
  check("AI kosong → gak kirim apa pun", r.revived === 0 && sock.sent.length === 0);
  check("counter HARUS gak naik pas gagal", R._chatReviveStateForTest().groups[G1].todayCount === 0);
  const why = r.skipped.find((x) => x.startsWith(G1));
  check("alasan AI jujur", why && why.includes("AI gak balas"));
}

section("7. tes manual (force)");
{
  R._resetChatReviveForTest();
  R._setChatReviveFileForTest(STATE_FILE);
  R._setChatReviveNowForTest(() => NOW);
  R._setChatReviveAiForTest(async () => "serius nih: kalau bisa makan satu menu gratis seumur hidup, pilih apa?");
  const sock = mkSock();
  R.enableChatRevive(G1);
  R.noteChatActivity(G1, NOW); // belum sepi sama sekali
  const t = await R.testChatRevive(sock, G1);
  check("tes force kirim walau belum sepi", t.sent === true && sock.sent.length === 1);
  check("tes force gak makan kuota harian", R._chatReviveStateForTest().groups[G1].todayCount === 0);
  // tick langsung setelah tes gak boleh dobel (belum sepi + window kejepit)
  NOW += 2 * H1;
  const r = await R.runChatReviveTick(sock);
  check("setelah tes, tick gak dobel-kirim", r.revived === 0 && sock.sent.length === 1);
}

section("8. plugin — handler & gate");
{
  const plug = await import("../../plugins/group/chatrevive.js");
  check("pluginConfig name chatrevive", plug.config?.name === "chatrevive");
  check("alias ada (revive/antisepei)", Array.isArray(plug.config.alias) && plug.config.alias.includes("revive") && plug.config.alias.includes("antisepei"));
  const sock = mkSock();
  const mkM = (args, extra = {}) => ({
    text: ".chatrevive " + args.join(" "), args, chat: G1,
    isOwner: false, isAdmin: true, key: { id: "k1" },
    ...extra,
  });

  // tanpa argumen → guide (smallcaps)
  await plug.handler(mkM([]), { sock });
  let all = fromSC(sock.sent.map(s => s.text).join(" ")).toLowerCase();
  check("guide tanpa arg muncul", all.includes("chat revive") && all.includes("sub"));
  check("guide nyebut semua sub (on/off/jam/status/tes)", ["on", "off", "jam", "status", "tes"].every(s => all.includes(s)));

  // on → kartu aktif
  sock.sent.length = 0;
  await plug.handler(mkM(["on"]), { sock });
  all = fromSC(sock.sent[0]?.text || "").toLowerCase();
  check("on → kartu aktif + sebut 6 jam", all.includes("aktif") && all.includes("6"));

  // jam 3
  sock.sent.length = 0;
  await plug.handler(mkM(["jam", "3"]), { sock });
  all = fromSC(sock.sent[0]?.text || "").toLowerCase();
  check("jam 3 diterima", all.includes("3") && all.includes("sepi"));

  // jam ngawur → jujur tolak
  sock.sent.length = 0;
  await plug.handler(mkM(["jam", "99"]), { sock });
  all = fromSC(sock.sent[0]?.text || "").toLowerCase();
  check("jam 99 jujur ditolak", all.includes("tidak valid") || all.includes("1 sampai 24"));

  // status → nyebut fitur aktif
  sock.sent.length = 0;
  await plug.handler(mkM(["status"]), { sock });
  all = fromSC(sock.sent[0]?.text || "").toLowerCase();
  check("status nunjukin aktif + sepi", all.includes("aktif") && all.includes("sepi"));

  // sub gak dikenal → jujur
  sock.sent.length = 0;
  await plug.handler(mkM(["explode"]), { sock });
  all = fromSC(sock.sent[0]?.text || "").toLowerCase();
  check("sub gak dikenal jujur", all.includes("tidak dikenal"));
}

console.log(`\n─── hasil: ${PASS}/${PASS + FAIL} ${FAIL === 0 ? "PASSED ✓" : "FAILED"} ───`);
if (FAIL > 0) { console.log(results.filter(r => r.startsWith("✗")).join("\n")); process.exit(1); }
try { fs.rmSync(TMP, { recursive: true, force: true }); } catch {}
process.exit(0);
