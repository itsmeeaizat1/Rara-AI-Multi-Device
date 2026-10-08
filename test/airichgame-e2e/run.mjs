// E2E airichgame — koleksi game HTML AI Rich (7 Okt 2026)
// Jalankan: node test/airichgame-e2e/run.mjs
import assert from "node:assert";
import fs from "node:fs";
import path from "node:path";
import url from "node:url";

const ROOT = path.resolve(path.dirname(url.fileURLToPath(import.meta.url)), "..", "..");
const plugin = await import(path.join(ROOT, "plugins/airich/airichgame.js"));
const { default: def, config, handler, listGames, fetchGameHtml, GAMES, _setAirichGameForTest, _resetAirichGameForTest } = plugin;

let pass = 0, fail = 0;
const t = [];
function test(name, fn) { t.push([name, fn]); }

// ── mock m ──
function mockM({ command = "airichgame", args = [], chat = "123@s.whatsapp.net" } = {}) {
  const calls = { replies: [], reacts: [], sends: [], notifies: 0 };
  return {
    m: {
      command, args, chat,
      react: async (e) => calls.reacts.push(e),
      reply: async (txt) => { calls.replies.push(txt); return txt; },
    },
    calls,
  };
}
function mockSeams() {
  const state = { sends: [], notifyCount: 0 };
  _setAirichGameForTest({
    send: async (sock, chat, html, opts) => state.sends.push({ chat, html, opts }),
    notify: async () => { state.notifyCount++; },
  });
  return state;
}

// ── 1. config ──
test("config: nama, kategori, alias", () => {
  assert.equal(config.name, "airichgame");
  assert.equal(config.category, "airich");
  assert.equal(def.command, "airichgame");
  for (const a of ["gameairich", "gameai", "ular", "flappy", "blok", "gabung", "suisut", "dino", "pong", "tikus", "memori"]) {
    assert.ok(config.alias.includes(a), `alias ${a} hilang`);
  }
  assert.equal(config.isEnabled, true);
});

// ── 2. registry & file game ──
test("registry: 15 game terdaftar", () => {
  const keys = listGames();
  assert.equal(keys.length, 15);
  for (const k of ["snake", "flappy", "tetris", "2048", "tictactoe", "dino", "pong", "whackamole", "memory", "sudoku", "simon", "minesweeper", "slidingpuzzle", "fourinarow", "brickbreaker"]) assert.ok(keys.includes(k), `${k} hilang`);
});

test("file game: ada, valid, self-contained, berbranding", () => {
  for (const k of listGames()) {
    const html = fetchGameHtml(k);
    assert.ok(html.length >= 500, `${k}: terlalu pendek`);
    assert.ok(/<canvas/i.test(html), `${k}: gak ada canvas`);
    assert.ok(/<script>/i.test(html), `${k}: gak ada script`);
    assert.ok(/RARA AI - MULTI DEVICE/i.test(html), `${k}: credit bar hilang`);
    // self-contained: gak ada resource eksternal (http/https di src/href)
    const externals = html.match(/(?:src|href)\s*=\s*["']https?:\/\//gi) || [];
    assert.equal(externals.length, 0, `${k}: ada resource eksternal ${externals[0]}`);
    // touch control ada
    assert.ok(/pointerdown|touchstart/i.test(html), `${k}: gak ada kontrol tap`);
    // judul Indonesia Title Case per game
    assert.ok(/<h2>/i.test(html), `${k}: judul <h2> hilang`);
  }
});

test("fetchGameHtml: nama nyasar throw", () => {
  assert.throws(() => fetchGameHtml("bogus"), /gak ada/);
  assert.throws(() => fetchGameHtml("angrybirds"), /daftar/);
});

// ── 3. handler: menu ──
test("handler tanpa arg → menu daftar semua game", async () => {
  mockSeams();
  const { m, calls } = mockM({ args: [] });
  await handler(m, { sock: {} });
  assert.equal(calls.replies.length, 1, "menu gak kekirim");
  const menu = calls.replies[0];
  for (const k of listGames()) assert.ok(menu.includes(k), `menu gak nyebut ${k}`);
  assert.ok(menu.includes("Unduh"), "menu gak nyebut tombol Unduh");
  assert.equal(calls.sends.length, 0);
  assert.equal(calls.reacts.length, 0, "menu gak perlu react");
});

// ── 4. handler: kirim game ──
test("handler .airichgame snake → kirim HTML snake via rich response", async () => {
  const seams = mockSeams();
  const { m, calls } = mockM({ args: ["snake"] });
  await handler(m, { sock: {} });
  assert.equal(seams.sends.length, 1, "game gak kekirim");
  const html = fetchGameHtml("snake");
  assert.equal(seams.sends[0].html, html, "payload bukan file snake.html");
  assert.equal(seams.sends[0].chat, "123@s.whatsapp.net");
  assert.ok(seams.sends[0].opts.title.includes("Ular Kelas"), "judul game hilang");
  assert.ok(seams.sends[0].opts.title.includes("*"), "tip bold hilang");
  assert.equal(seams.notifyCount, 1, "notif Unduh gak kekirim");
  assert.ok(calls.reacts.includes("🧠") && calls.reacts.includes("🐣"), "react flow hilang");
});

test("handler alias langsung .tetris (m.command tetris, tanpa arg)", async () => {
  const seams = mockSeams();
  const { m } = mockM({ command: "tetris", args: [] });
  await handler(m, { sock: {} });
  assert.equal(seams.sends.length, 1);
  assert.equal(seams.sends[0].html, fetchGameHtml("tetris"));
  assert.ok(seams.sends[0].opts.title.includes("Blok Jatuh"));
});

test("handler alias variasi .suisut → tictactoe", async () => {
  const seams = mockSeams();
  const { m } = mockM({ command: "suisut", args: [] });
  await handler(m, { sock: {} });
  assert.equal(seams.sends.length, 1);
  assert.equal(seams.sends[0].html, fetchGameHtml("tictactoe"));
});

test("handler .airichgame 2048 (key numerik)", async () => {
  const seams = mockSeams();
  const { m } = mockM({ args: ["2048"] });
  await handler(m, { sock: {} });
  assert.equal(seams.sends.length, 1);
  assert.equal(seams.sends[0].html, fetchGameHtml("2048"));
});

test("handler game ftool: .dino (m.command dino)", async () => {
  const seams = mockSeams();
  const { m } = mockM({ command: "dino", args: [] });
  await handler(m, { sock: {} });
  assert.equal(seams.sends.length, 1);
  assert.equal(seams.sends[0].html, fetchGameHtml("dino"));
  assert.ok(seams.sends[0].opts.title.includes("Dino Run"));
});

test("handler game ftool: .airichgame pong", async () => {
  const seams = mockSeams();
  const { m } = mockM({ args: ["pong"] });
  await handler(m, { sock: {} });
  assert.equal(seams.sends.length, 1);
  assert.equal(seams.sends[0].html, fetchGameHtml("pong"));
});

test("handler game ftool: .airichgame whackamole + alias .tikus → sama", async () => {
  const seams = mockSeams();
  const { m } = mockM({ args: ["whackamole"] });
  await handler(m, { sock: {} });
  assert.equal(seams.sends.length, 1);
  const seams2 = mockSeams();
  const { m: m2 } = mockM({ command: "tikus", args: [] });
  await handler(m2, { sock: {} });
  assert.equal(seams2.sends[0].html, seams.sends[0].html, "alias .tikus harus sama dengan whackamole");
});

test("handler game ftool: .memori → memory (alias Indonesia)", async () => {
  const seams = mockSeams();
  const { m } = mockM({ command: "memori", args: [] });
  await handler(m, { sock: {} });
  assert.equal(seams.sends.length, 1);
  assert.equal(seams.sends[0].html, fetchGameHtml("memory"));
  assert.ok(seams.sends[0].opts.title.includes("Kartu Memori"));
});

// ── 4b. anti-scroll v3: dokumen game punya scroll internal sendiri ──
// akar masalah: scroll chat WA ada di layer NATIVE luar webview — preventDefault gak nembus.
// solusi: body pan-y + overflow auto + min-height 101vh biar webview selalu punya scroll
// internal (gesture ketangkep di dalem), canvas tetep touch-action:none buat input game.
test("anti-scroll v3: scroll internal (101vh + pan-y + overscroll) di semua game", () => {
  for (const k of listGames()) {
    const html = fetchGameHtml(k);
    assert.ok(html.includes("min-height: 101vh"), `${k}: gak ada min-height 101vh`);
    assert.ok(html.includes("touch-action: pan-y"), `${k}: body bukan pan-y`);
    assert.ok(html.includes("overscroll-behavior: contain"), `${k}: gak ada overscroll-behavior`);
    const cm = html.match(/canvas \{([^}]*)\}/);
    assert.ok(cm && cm[1].includes("touch-action: none"), `${k}: canvas gak punya touch-action none`);
    assert.ok(!html.includes("gesturestart"), `${k}: guard preventDefault lama masih nyangkut`);
    assert.ok(html.includes("guide-table"), `${k}: gak ada tabel panduan`);
  }
});

// ── 5. handler: error ──
test("handler nama nyasar → kartu error + daftar game", async () => {
  mockSeams();
  const { m, calls } = mockM({ args: ["pacman"] });
  await handler(m, { sock: {} });
  assert.equal(calls.replies.length, 1);
  const err = calls.replies[0];
  assert.ok(err.includes("pacman"), "nama nyasar gak disebut");
  for (const k of listGames()) assert.ok(err.includes(k), `error gak nyebut ${k}`);
});

// ── 6. hub airich nyebut koleksi game ──
test("hub .airich nyebut .airichgame", () => {
  const src = fs.readFileSync(path.join(ROOT, "plugins/airich/airich.js"), "utf-8");
  assert.ok(src.includes("airichgame"), "hub gak nyebut airichgame");
  assert.ok(src.includes("suisut"), "hub gak nyebut daftar game");
  assert.ok(src.includes("dino") && src.includes("pong") && src.includes("tikus") && src.includes("memori"), "hub gak nyebut game ftool baru");
});

_resetAirichGameForTest();
for (const [name, fn] of t) {
  try { await fn(); pass++; console.log("  ✓ " + name); }
  catch (e) { fail++; console.log("  ✗ " + name + "\n    " + (e.message || e)); }
}
console.log(`\n===== ${pass} PASS, ${fail} FAIL =====`);
process.exit(fail ? 1 : 0);
