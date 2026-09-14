// E2E — .bypass & .fixupx via zelapi.eu.cc kategori Bypass — STRICT, no fallback
import { strict as assert } from "assert";
import fs from "fs";

let pass = 0, fail = 0;
const w = (s) => process.stdout.write(s + "\n");
function check(name, cond, extra = "") {
  if (cond) { pass++; w(`  ✅ ${name}`); }
  else { fail++; w(`  ❌ ${name}${extra ? " — " + extra : ""}`); }
}

const TMP = "/tmp/zelbypass-e2e";
fs.rmSync(TMP, { recursive: true, force: true });
fs.mkdirSync(TMP, { recursive: true });
process.env.NOVA_DB_DIR = TMP;
const { initDatabase } = await import("../../src/lib/nova-database.js");
await initDatabase(TMP + "/db.json");

const { fromSC } = await import("../../src/lib/styler.js");
const norm = (s) => fromSC(String(s)).toLowerCase();

const bypassPlugin = await import("../../plugins/tools/bypass.js");
const fixupxPlugin = await import("../../plugins/tools/fixupx.js");
const zelbypass = await import("../../src/scraper/zelbypass.js");

let sends = [];
let reacts = [];
let sentMedia = [];
const sock = {
  sendMessage: async (jid, content) => { sentMedia.push({ jid, content }); },
};
const mk = (args, extra = {}) => ({
  args,
  sender: "62user@g.us",
  chat: "gc@g.us",
  key: { remoteJid: "gc@g.us" },
  pushName: "user",
  isOwner: false,
  react: async (r) => { reacts.push(r); },
  reply: async (t) => { sends.push(t); },
  ...extra,
});

// ═══ .bypass ═══
w("\n═══ .bypass ═══");

w("\n— usage (tanpa args) —");
sends = []; reacts = [];
await bypassPlugin.handler(mk([]), { sock });
check("kartu usage keluar", sends.length === 1 && /bypass shortlink/.test(norm(sends[0])));
check("daftar provider muncul", /linkvertise/.test(norm(sends[0])) && /bicolink/.test(norm(sends[0])));

w("\n— URL tidak valid —");
sends = []; reacts = [];
await bypassPlugin.handler(mk(["bukan-url"]), { sock });
check("error url invalid", sends.length === 1 && /url tidak valid/.test(norm(sends[0])));
check("react ❌", reacts.includes("❌"));

w("\n— provider gak dikenali —");
sends = []; reacts = [];
await bypassPlugin.handler(mk(["https://google.com/xyz"]), { sock });
check("error provider gak dikenali", sends.length === 1 && /provider gak dikenali/.test(norm(sends[0])));

w("\n— berhasil bypass linkvertise (mock) —");
zelbypass._setZelBypassHttpForTest(async () => ({
  status: 200,
  json: async () => ({ status: true, bypassed_url: "https://contoh-tujuan.com/file.zip" }),
}));
sends = []; reacts = [];
await bypassPlugin.handler(mk(["https://linkvertise.com/123/judul"]), { sock });
check("bypass berhasil keluar", sends.length === 1 && /bypass berhasil/.test(norm(sends[0])));
check("link tujuan muncul", /contoh-tujuan\.com\/file\.zip/.test(sends[0]));
check("react 🐣", reacts.includes("🐣"));
zelbypass._resetZelBypassHttpForTest();

w("\n— endpoint mati (503/500) → error asli, no fallback —");
zelbypass._setZelBypassHttpForTest(async () => ({
  status: 500,
  json: async () => ({ error: "browserService is not defined" }),
}));
sends = []; reacts = [];
await bypassPlugin.handler(mk(["https://linkvertise.com/999/dead"]), { sock });
check("error asli keluar (bukan fallback palsu)", sends.length === 1 && /browserservice is not defined/.test(norm(sends[0])));
check("react ❌", reacts.includes("❌"));
zelbypass._resetZelBypassHttpForTest();

w("\n— key kosong → API_KEY —");
zelbypass._setZelBypassKeyForTest("");
sends = []; reacts = [];
await bypassPlugin.handler(mk(["https://linkvertise.com/1/x"]), { sock });
check("error key belum di-set", sends.length === 1 && /api key zelapi\.eu\.cc belum di-set/.test(norm(sends[0])));
zelbypass._setZelBypassKeyForTest(undefined);

// ═══ .fixupx ═══
w("\n═══ .fixupx ═══");

w("\n— usage (tanpa args) —");
sends = []; reacts = [];
await fixupxPlugin.handler(mk([]), { sock });
check("kartu usage keluar", sends.length === 1 && /cek tweet/.test(norm(sends[0])));

w("\n— URL tidak valid —");
sends = []; reacts = [];
await fixupxPlugin.handler(mk(["bukan-url"]), { sock });
check("error url invalid", sends.length === 1 && /url tidak valid/.test(norm(sends[0])));

w("\n— host bukan twitter/x → error dari scraper —");
zelbypass._setZelBypassKeyForTest("TEST-KEY");
sends = []; reacts = [];
await fixupxPlugin.handler(mk(["https://facebook.com/post/123"]), { sock });
check("error host bukan tweet", sends.length === 1 && /twitter\.com \/ x\.com/.test(norm(sends[0])));

w("\n— berhasil ambil tweet teks doang (mock, no media) —");
zelbypass._setZelBypassHttpForTest(async () => ({
  status: 200,
  json: async () => ({
    status: true, ok: true,
    tweet: { text: "Halo dunia dari tweet", favorite_count: 10, retweet_count: 2, reply_count: 1, view_count: 100, media: [] },
    user: { screen_name: "testuser", name: "Test User" },
  }),
}));
sends = []; reacts = [];
await fixupxPlugin.handler(mk(["https://x.com/testuser/status/123"]), { sock });
check("teks tweet muncul", sends.length === 1 && /halo dunia dari tweet/.test(norm(sends[0])));
check("username muncul", /testuser/.test(norm(sends[0])));
check("stats muncul", /10/.test(sends[0]) && /100/.test(sends[0]));
check("gak kirim media (kosong)", sentMedia.length === 0);
zelbypass._resetZelBypassHttpForTest();

w("\n— berhasil ambil tweet dgn media (mock) —");
sentMedia = [];
zelbypass._setZelBypassHttpForTest(async () => ({
  status: 200,
  json: async () => ({
    status: true, ok: true,
    tweet: { text: "Ada gambar", favorite_count: 5, media: ["https://pbs.twimg.com/media/foto1.jpg"] },
    user: { screen_name: "user2" },
  }),
}));
sends = []; reacts = [];
await fixupxPlugin.handler(mk(["https://twitter.com/user2/status/456"]), { sock });
check("media dikirim via sock.sendMessage", sentMedia.length === 1);
check("caption muncul di media", sentMedia.length && /ada gambar/.test(norm(sentMedia[0].content.caption || "")));
check("m.reply gak dipanggil dobel (media doang)", sends.length === 0);
zelbypass._resetZelBypassHttpForTest();
zelbypass._setZelBypassKeyForTest(undefined);

w(`\n\n${pass} pass, ${fail} fail`);
process.exit(fail ? 1 : 0);
