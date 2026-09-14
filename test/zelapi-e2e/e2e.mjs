// E2E — ZELAPI SUITE (.zel .zimage .zchatgpt .zdeepseek dll — 86 command)
import { strict as assert } from "assert";
import fs from "fs";

let pass = 0, fail = 0;
const w = (s) => process.stdout.write(s + "\n");
function check(name, cond, extra = "") {
  if (cond) { pass++; w(`  ✅ ${name}`); }
  else { fail++; w(`  ❌ ${name}${extra ? " — " + extra : ""}`); }
}

const TMP = "/tmp/zel-e2e";
fs.rmSync(TMP, { recursive: true, force: true });
fs.mkdirSync(TMP, { recursive: true });
process.env.NOVA_DB_DIR = TMP;
const { initDatabase } = await import("../../src/lib/nova-database.js");
await initDatabase(TMP + "/db.json");
const { fromSC } = await import("../../src/lib/styler.js");
const scr = await import("../../src/scraper/zelapi.js");
const norm = (s) => fromSC(String(s)).toLowerCase();

const p1 = await import("../../plugins/ai/zelaichat1.js");
const p2 = await import("../../plugins/ai/zelaichat2.js");
const hub = await import("../../plugins/ai/zelhub.js");

let sends = [], reacts = [], gotUrl = "", mockJson = null, mockBin = null;
const setHttp = (json, bin) => {
  scr._setZelHttpForTest(async (u) => {
    gotUrl = u;
    if (bin) return { status: 200, headers: { get: () => "image/webp" }, arrayBuffer: async () => bin };
    return { status: 200, headers: { get: () => "application/json" }, json: async () => json };
  });
};
const mk = (command, args, quoted) => ({
  command, args, quoted,
  sender: "62user@g.us", chat: "gc@g.us", pushName: "user", isOwner: false,
  react: async (r) => { reacts.push(r); },
  reply: async (t) => { sends.push(t); },
});
const run = async (plug, command, args, quoted) => {
  sends = []; reacts = []; gotUrl = "";
  await plug.handler(mk(command, args, quoted), { sock: {} });
  return norm(sends[0] || "");
};

// ── 1. .zchatgpt sukses ──
w("\n— .zchatgpt sukses —");
{
  setHttp({ status: true, creator: "Hazel", data: { text: "Hai! Aku baik, makasih. Kamu apa kabar?" } });
  const card = await run(p1, "zchatgpt", ["halo", "apa", "kabar"]);
  check("jawaban keluar", card.includes("hai! aku baik"));
  check("label zelapi", card.includes("zchatgpt") && card.includes("zelapi"));
  check("url bener", gotUrl.includes("/ai/chatgpt") && gotUrl.includes("prompt=halo") && gotUrl.includes("apikey=zelapi"));
  check("react 🐣", reacts.includes("🐣"));
}

// ── 2. .zduckai bentuk respon beda (result) ──
w("\n— .zduckai (bentuk respon result) —");
{
  setHttp({ status: true, result: "Ini jawaban duck ai" });
  const card = await run(p2, "zduckai", ["tes"]);
  check("ekstrak toleran", card.includes("ini jawaban duck ai"));
  check("endpoint duckai", gotUrl.includes("/ai/duckai") && gotUrl.includes("text=tes"));
}

// ── 3. endpoint mati → error asli STRICT ──
w("\n— .zdeepseek mati → error asli —");
{
  setHttp({ status: false, error: "Failed to create session", error_code: "SESSION_CREATE_FAILED" });
  const card = await run(p1, "zdeepseek", ["halo"]);
  check("error asli keluar", card.includes("failed to create session") && card.includes("session_create_failed"));
  check("label MATI", card.includes("zdeepseek mati"));
  check("react ❌", reacts.includes("❌"));
}

// ── 4. tanpa pesan → usage ──
w("\n— .zcici tanpa pesan —");
{
  const card = await run(p1, "zcici", []);
  check("usage keluar", card.includes(".zcici"));
}

// ── 5. .zel list —
w("\n— .zel list —");
{
  const card = await run(hub, "zel", []);
  const { ZEL_AI_REGISTRY } = await import("../../src/lib/nova-zel-registry.js");
  check("jumlah command disebut", card.includes(`${Object.keys(ZEL_AI_REGISTRY).length} ai`));
  check("ada .zchatgpt", card.includes(".zchatgpt"));
  check("ada .zzai", card.includes(".zzai"));
  check("vision disebut", card.includes("mode vision"));
  check("zimage disebut", card.includes(".zimage"));
}

// ── 6. .zel <nama> shortcut ──
w("\n— .zel gemini halo —");
{
  setHttp({ status: true, data: { text: "Halo dari gemini" } });
  const card = await run(hub, "zel", ["gemini", "halo"]);
  check("shortcut jalan", card.includes("halo dari gemini"));
  check("url gemini", gotUrl.includes("/ai/gemini"));
}

// ── 7. .zimage buffer gambar ──
w("\n— .zimage kucing astronot —");
{
  const bin = new Uint8Array(20000).fill(120);
  setHttp(null, bin);
  let sentImage = null;
  const sock = { sendMessage: async (jid, content) => { sentImage = content; } };
  sends = []; reacts = []; gotUrl = "";
  await hub.handler(mk("zimage", ["kucing", "astronot"]), { sock });
  check("gambar terkirim (buffer)", sentImage?.image?.length === 20000);
  check("caption engine zelapi", norm(sentImage?.caption || "").includes("zelapi"));
  check("url zimage", gotUrl.includes("/ai/zimage") && gotUrl.includes("prompt=kucing"));
}

// ── 8. .zimage gagal (json error) ──
w("\n— .zimage gagal —");
{
  setHttp({ status: false, error: "gagal generate" });
  const card = await run(hub, "zimage", ["tes"]);
  check("error zimage keluar", card.includes("zimage mati") || card.includes("gagal"));
}

// ── 9. key kosong → error strict ──
w("\n— key kosong —");
{
  scr._setZelKeyForTest("");
  const card = await run(p1, "zchatgpt", ["halo"]);
  scr._setZelKeyForTest(undefined);
  check("error key keluar", card.includes("key zelapi belum di-set"));
}

// ── 10. .zai (z.ai) → cmd .zzai ──
w("\n— .zzai registry —");
{
  const { getZelSpec } = await import("../../src/lib/nova-zel-registry.js");
  check("zzai ada di registry", getZelSpec("zzai")?.slug === "zai");
  check("zgoogle → google slug", getZelSpec("zgoogle")?.slug === "google");
  check("zqwenchat → qwen-chat", getZelSpec("zqwenchat")?.slug === "qwen-chat");
  check("vision type", getZelSpec("zgeminivision")?.type === "vision");
  check("zimage type image", getZelSpec("zimage")?.type === "image");
  check("claude-auto gak ada (skip)", getZelSpec("zclaudeauto") === null);
}

// ── 11. vision tanpa foto → hint ──
w("\n— .zgeminivision tanpa foto —");
{
  setHttp({ status: true, response: "ok" });
  const card = await run(p1, "zgeminivision", ["deskripsikan"]);
  check("hint vision keluar", card.includes("vision") || card.includes("reply foto"));
}

// ── 12. markdown cleaner ──
w("\n— markdown dibersihin —");
{
  setHttp({ status: true, data: { text: "**Tebal** dan\n\n\n\nbanyak baris\n# Judul" } });
  const card = await run(p1, "zchatgpt", ["tes"]);
  check("bold md → WA", card.includes("*tebal*"));
  check("header md dibuang", !card.includes("# judul"));
}


// ── 13. IMAGE SUITE —
w("\n— .zimg list —");
{
  const pimg = await import("../../plugins/ai/zelimg.js");
  const card = await run(pimg, "zimg", []);
  check("daftar generator keluar", card.includes("zapi image") || card.includes("generator"));
  check("text2img disebut", card.includes(".zbingimage"));
  check("imgedit disebut", card.includes(".znanobananedit"));
}

w("\n— .zbingimage (text2img JSON images) —");
{
  const pimg = await import("../../plugins/ai/zelimg.js");
  pimg._setFetchBufferForTest(async (u) => Buffer.from("IMG" + u));
  setHttp({ status: true, creator: "Hazel", data: { images: ["https://tse1.mm.bing.net/img1.webp", "https://tse2.mm.bing.net/img2.webp"] } });
  let sentImages = [];
  const sock = {
    sendMessage: async (jid, content) => {
      sentImages.push(content);
      return {};
    },
  };
  sends = []; reacts = []; gotUrl = "";
  await pimg.handler(mk("zbingimage", ["kucing", "astronot"]), { sock });
  check("2 gambar terkirim", sentImages.length === 2);
  check("caption engine zelapi", norm(sentImages[0]?.caption || "").includes("zelapi"));
  check("url endpoint bener", gotUrl.includes("ai-image/bingimage") && gotUrl.includes("prompt=kucing"));
  check("fetchBuffer url dipanggil", sentImages[0]?.image);
}

w("\n— .znanobananedit tanpa foto → hint WAJIB reply —");
{
  const pimg = await import("../../plugins/ai/zelimg.js");
  const card = await run(pimg, "znanobananedit", ["jadi", "ghibli"]);
  check("hint reply foto", card.includes("reply foto"));
}

w("\n— .znanobanana flex: tanpa foto = text2img —");
{
  const pimg = await import("../../plugins/ai/zelimg.js");
  setHttp({ status: true, data: { images: ["https://x.example.com/gbr.png"] } });
  let sentImages = [];
  const sock = { sendMessage: async (jid, c) => { sentImages.push(c); return {}; } };
  sends = []; reacts = []; gotUrl = "";
  await pimg.handler(mk("znanobanana", ["kucing", "lucu"]), { sock });
  check("flex tanpa foto jalan", gotUrl.includes("ai-image/nanobanana"));
  check("gambar terkirim", sentImages.length === 1);
}

w("\n— image endpoint mati → error asli —");
{
  const pimg = await import("../../plugins/ai/zelimg.js");
  setHttp({ status: false, error: "Gagal mendapatkan URL gambar" });
  const card = await run(pimg, "zaiart", ["tes"]);
  check("error asli keluar", card.includes("gagal mendapatkan url gambar"));
  check("label MATI", card.includes("zaiart mati"));
}

w("\n— chat AI balikin gambar (zcici images[]) —");
{
  p1._setFetchBufferForTest(async (u) => Buffer.from("IMG" + u));
  setHttp({ status: true, response: "ini gambarnya", images: ["https://c.example.com/pic.webp"] });
  let sentImages = [];
  const sock = { sendMessage: async (jid, c) => { sentImages.push(c); return {}; } };
  sends = []; reacts = []; gotUrl = "";
  await p1.handler(mk("zcici", ["bikin", "gambar", "kucing"]), { sock });
  check("teks keluar", norm(sends[0] || "").includes("ini gambarnya"));
  check("gambar ikut dikirim", sentImages.length === 1);
}


w("\n— zbetterwaifu (NSFW, default nonaktif) —");
{
  const pw = await import("../../plugins/nsfw/zelbetterwaifu.js");
  check("default nonaktif", pw.config.isEnabled === false);
  check("kategori nsfw", pw.config.category === "nsfw");
  check("cooldown & energi", pw.config.cooldown === 20 && pw.config.energi === 3);

  // usage tanpa prompt
  sends = []; reacts = [];
  const sockw = { sendMessage: async () => ({}) };
  await pw.handler(mk("zbetterwaifu", []), { sock: sockw });
  check("usage keluar", norm(sends[0] || "").includes("waifu catgirl"));

  // strict error: 500 + error body
  setHttp({ status: 500, error: "Cookie tidak valid" });
  sends = [];
  await pw.handler(mk("zbetterwaifu", ["tes"]), { sock: sockw });
  check("error asli keluar", norm(sends[0] || "").includes("cookie tidak valid"));

  // sukses: images + seam buffer
  pw._setFetchBufferForTest(async (u) => Buffer.concat([Buffer.from("IMG"), Buffer.alloc(1500, 7)]));
  setHttp({ status: true, data: { images: ["https://w.example.com/a.png"] } });
  let sentImgs = [];
  const sock2 = { sendMessage: async (jid, c) => { sentImgs.push(c); return {}; } };
  sends = []; reacts = [];
  await pw.handler(mk("zbetterwaifu", ["waifu", "catgirl"]), { sock: sock2 });
  check("gambar terkirim", sentImgs.length === 1);
  check("caption engine", (sentImgs[0]?.caption || "").includes("zelapi betterwaifu"));
}

w("\n— selesai —");

w("\n— registry image —");
{
  const { getZelImageSpec, ZEL_IMAGE_REGISTRY } = await import("../../src/lib/nova-zel-registry.js");
  check("22 generator terdaftar", Object.keys(ZEL_IMAGE_REGISTRY).length === 22);
  check("nanobanana type flex", getZelImageSpec("znanobanana")?.type === "flex");
  check("nanobananedit type imgedit", getZelImageSpec("znanobananedit")?.type === "imgedit");
  check("undress gak ada (skip konten dewasa)", getZelImageSpec("zundress") === null);
  check("deepfake gak ada (skip)", getZelImageSpec("zdeepfake") === null);
  check("firefly gak ada (skip credensial)", getZelImageSpec("zfirefly") === null);
  check("omnivton gak ada (butuh 2 foto)", getZelImageSpec("zomnivton") === null);
}

w(`\n— summary —\nPASS ${pass} / FAIL ${fail}`);
process.exit(fail ? 1 : 0);
