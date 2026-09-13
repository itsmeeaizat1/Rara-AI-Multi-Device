// E2E — AI STICKER GENERATOR (13 Sep 2026, fitur baru pilihan owner)
// .aisticker <prompt> → AI generate gambar → otomatis sticker webp.
// Test: prompt engineering, hd flag, flow react/kirim, error path.
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
const R = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
process.chdir(R);

const DB_DIR = "/tmp/nova-aisticker-db-" + Date.now();
fs.mkdirSync(DB_DIR, { recursive: true });
const { initDatabase } = await import(R + "/src/lib/nova-database.js");
await initDatabase(DB_DIR + "/db.json");

const mod = await import(R + "/plugins/sticker/aisticker.js");
const { handler, _setAiStickerGenForTest, _resetAiStickerGenForTest, _setAiStickerHdForTest, parseHdFlag, buildStickerPrompt } = mod;
const { fromSC } = await import(R + "/src/lib/styler.js");
const norm = (s) => fromSC(String(s)).toLowerCase();

let pass = 0, fail = 0;
const w = (s) => process.stdout.write(s + "\n");
const check = (name, ok, extra) => { w((ok ? "  ✅" : "  ❌") + " " + name + (ok || !extra ? "" : " — " + extra)); ok ? pass++ : fail++; };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const SENDER = "628123456789@s.whatsapp.net";
const CHAT = "628123456789@s.whatsapp.net";

function mkMock() {
  const sends = [];
  const stickers = [];
  const reacts = [];
  const m = {
    sender: SENDER, chat: CHAT, pushName: "Budi", prefix: ".",
    react: async (e) => { reacts.push(e); },
    reply: async (txt, opts) => { sends.push({ txt, opts }); return { key: { id: "r" + sends.length } }; },
  };
  const sock = {
    sendImageAsSticker: async (chat, buf, msg, opts) => {
      stickers.push({ chat, buf, opts });
      return { key: { id: "st" + stickers.length } };
    },
  };
  return { m, sock, sends, stickers, reacts };
}

const PNG = Buffer.from("89504e470d0a1a0a" + "ab".repeat(6000), "hex");

// ═══════════════════════════════════════════════════════════════
w("\n— pure: parseHdFlag + buildStickerPrompt —");
{
  let r = parseHdFlag("kucing astronot lucu");
  check("tanpa flag → hd kosong", r.hd === "" && r.prompt === "kucing astronot lucu");
  r = parseHdFlag("hd kucing astronot");
  check("flag hd → polish + prompt bersih", r.hd === "polish" && r.prompt === "kucing astronot");
  r = parseHdFlag("kucing 4k astronot");
  check("flag 4k → 2x (posisi tengah pun kena)", r.hd === "2x" && r.prompt === "kucing astronot");
  r = parseHdFlag("hd2 hd");
  check("hd2 duluan yang kepilih (regex order)", r.hd === "2x");

  const sp = buildStickerPrompt("pepaya ngedance");
  check("prompt engineering: die-cut + chibi + no text", sp.includes("die-cut") && sp.includes("Chibi") && sp.includes("no text"));
  check("prompt user kebawa", sp.includes("pepaya ngedance"));
  const spEmpty = buildStickerPrompt("");
  check("prompt kosong → default kucing lucu", spEmpty.includes("kucing lucu"));
}

// ═══════════════════════════════════════════════════════════════
w("\n— handler: happy path —");
{
  const { m, sock, sends, stickers, reacts } = mkMock();
  const genCalls = [];
  _setAiStickerGenForTest(async (prompt, opts) => {
    genCalls.push({ prompt, opts });
    return { base64: PNG.toString("base64"), mimeType: "image/png", via: "nano-banana" };
  });
  await handler(m, { sock, args: ["kucing", "astronot", "lucu"], config: { command: { prefix: "." } } });

  check("gen kepanggil SEKALI dengan prompt engineering", genCalls.length === 1 && genCalls[0].prompt.includes("die-cut"));
  check("rasio dipaksa 1:1 (square sticker)", genCalls[0].opts?.ratio === "1:1");
  check("sticker kekirim via sendImageAsSticker", stickers.length === 1);
  check("sticker kekirim ke chat yang sama", stickers[0].chat === CHAT);
  check("buffer gambar bener (PNG hasil AI)", stickers[0].buf.length === PNG.length);
  check("packname/author kepasang", !!stickers[0].opts?.packname && !!stickers[0].opts?.author);
  check("react 🧠 → 🛠️ → 🐣", reacts.join(",") === "🧠,🛠️,🐣", reacts.join(","));
  const card = norm(sends.at(-1).txt);
  check("kartu sukses: prompt + engine", card.includes("kucing astronot lucu") && card.includes("nano-banana"));
  _resetAiStickerGenForTest();
}

// ═══════════════════════════════════════════════════════════════
w("\n— handler: opsi hd —");
{
  const { m, sock, sends, stickers, reacts } = mkMock();
  _setAiStickerGenForTest(async () => ({ base64: PNG.toString("base64"), mimeType: "image/png", via: "nano-banana" }));
  let polished = 0, upscaled = 0;
  _setAiStickerHdForTest(
    async (buf, f) => { upscaled++; return Buffer.concat([buf, Buffer.alloc(f * 100)]); },
    async (buf) => { polished++; return buf; },
  );
  await handler(m, { sock, args: ["hd", "pepaya", "ngedance"], config: { command: { prefix: "." } } });
  check("hd → polish dipanggil (1x)", polished === 1 && upscaled === 0);
  await handler(m, { sock, args: ["pepaya", "4k"], config: { command: { prefix: "." } } });
  check("4k → upscale 2x dipanggil", upscaled === 1 && polished === 1);
  check("hd mode gak ganggu pengiriman sticker (2 sticker terkirim)", stickers.length === 2);
  _resetAiStickerGenForTest();
}

// ═══════════════════════════════════════════════════════════════
w("\n— handler: tanpa prompt → panduan —");
{
  const { m, sock, sends, stickers } = mkMock();
  await handler(m, { sock, args: [], config: { command: { prefix: "." } } });
  const txt = norm(sends.at(-1).txt);
  check("panduan muncul (contoh + flag hd)", txt.includes("aisticker") && txt.includes("kucing astronot") && txt.includes("4k"));
  check("gak ada sticker kekirim", stickers.length === 0);
}

// ═══════════════════════════════════════════════════════════════
w("\n— handler: gen gagal → ❌ —");
{
  const { m, sock, sends, stickers, reacts } = mkMock();
  _setAiStickerGenForTest(async () => { throw new Error("engine down"); });
  await handler(m, { sock, args: ["kucing"], config: { command: { prefix: "." } } });
  check("react ❌ + kartu gagal sopan", reacts.at(-1) === "❌" && norm(sends.at(-1).txt).includes("gagal"));
  check("gak ada sticker terkirim", stickers.length === 0);
  _resetAiStickerGenForTest();
}

w(`\n— summary —\nPASS ${pass} / FAIL ${fail}`);
process.exit(fail ? 1 : 0);
