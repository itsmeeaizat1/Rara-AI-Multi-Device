// E2E Auto Berita Notifier (12 Sep 2026).
// Seam: setRssHttp (xml fixture) + setImgHttp (thumbnail) — gak nyamber network live.
import path from "node:path";
import fs from "node:fs";

const out = (s) => process.stdout.write(s + "\n");
let pass = 0, fail = 0;
function t(label, cond, extra) {
  if (cond) { pass++; out("✅ " + label); }
  else { fail++; out("❌ " + label + (extra ? " — " + extra : "")); }
}
const norm = (s) => String(s || "").toLowerCase();

const R = path.resolve(".");
fs.rmSync("/tmp/berita-e2e-db", { recursive: true, force: true });
const { initDatabase, getDatabase } = await import(R + "/src/lib/rara-database.js");
await initDatabase("/tmp/berita-e2e-db/rara.json");
const db = getDatabase();

const lib = await import(R + "/src/lib/rara-berita-notifier.js");
const { config, handler } = await import(R + "/plugins/berita/newsnotify.js");
const { fromSC } = await import(R + "/src/lib/styler.js");
const { setAutoTargetConfig, getAutoTargetConfig } = await import(R + "/src/lib/rara-auto-target.js");
const low = (s) => fromSC(norm(s));

t("1a. plugin beritanotify kategori berita", config.name === "beritanotify" && config.category === "berita" && config.alias.includes("beritabarak"));
// FIX v24.2.3: sumber `kompas` mati (Cloudflare 202/0 byte) → diganti Antara.
t("1b. 4 sumber RSS (cnn/tempo/cnbc/antara)", Object.keys(lib.SOURCES).join(",") === "cnn,tempo,cnbc,antara");

// ═══ fixture RSS ala CNN (enclosure thumbnail) ═══
const items = [];
for (let i = 1; i <= 6; i++) {
  items.push(`<item><title>Berita Lama ${i}</title><link>https://cnn.example.com/berita-${i}</link><pubDate>Sat, 12 Sep 2026 1${i}:00:00 +0700</pubDate><description>&lt;b&gt;Isi berita ${i}&lt;/b&gt; singkat &amp; jelas.</description><enclosure url="https://akcdn.example.com/img-${i}.jpeg?w=360&amp;q=90" length="25000" type="image/jpeg"/></item>`);
}
const FIXTURE = `<?xml version="1.0"?><rss version="2.0"><channel><title>CNN Indonesia</title>${items.join("")}
<item><title>Berita Img Fallback</title><link>https://cnn.example.com/berita-img</link><pubDate>Sat, 12 Sep 2026 12:00:00 +0700</pubDate><description>Pendeskripsi &lt;img src="https://img.example.com/foto.jpg" alt="x"&gt; sisanya teks.</description></item>
</channel></rss>`;
// berita BARU muncul di siklus ke-2 (dedup test)
// item baru WAJIB di-inject KE DALAM <channel> (di luar </channel> gak kebaca parser)
function withItem(xml, item) { return xml.replace("</channel>", item + "</channel>"); }
let fixture = FIXTURE;
lib.setRssHttp(async () => fixture);
lib.setImgHttp(async (url) => Buffer.from("thumb-" + url.slice(-20)));

// ═══ 2. fetchFeed parse ═══
out("\n— fetchFeed —");
const feed = await lib.fetchFeed("cnn", 10);
t("2a. 7 item ke-parse", feed.length === 7, `n=${feed.length}`);
t("2b. title + snippet strip HTML + decode entitas", feed[0].title === "Berita Lama 6" && /isi berita 6 singkat & jelas/i.test(feed[0].snippet), feed[0].snippet);
t("2c. enclosure jadi image (thumbnail)", feed[0].image === "https://akcdn.example.com/img-6.jpeg?w=360&q=90", feed[0].image);
const fb = feed.find((x) => x.title === "Berita Img Fallback");
t("2d. img di description jadi fallback image", !!fb && fb.image === "https://img.example.com/foto.jpg", (fb || {}).image);
t("2e. urut terbaru duluit (pubTs desc)", feed[0].pubTs >= feed[1].pubTs && feed[0].pubTs > 0, `${feed[0].pubTs} vs ${feed[1].pubTs}`);

// ═══ 3. scheduled flow: subscriber + dedup ═══
out("\n— runCheck scheduled —");
const sent = [];
const sockMock = { sendMessage: async (chat, msg) => { sent.push({ chat, msg }); return { key: {} }; } };
lib.setSock(sockMock);
lib.addSubscriber("grup-a@g.us");
lib.setBeritaNotifierOn(true);

let r = await lib.runCheck(); // semua berita "baru" (seen kosong) → kirim max 3
t("3a. siklus pertama kirim max 3 ke 1 subscriber", r.sent === 3 && r.recipients === 1 && r.berita === 3, JSON.stringify(r));
t("3b. pesan plaintext (text) + thumbnail externalAdReply", sent[0].msg.text && sent[0].msg.contextInfo?.externalAdReply?.thumbnail?.length > 0, JSON.stringify(Object.keys(sent[0].msg)));
t("3c. renderLargerThumbnail true + sourceUrl link berita", sent[0].msg.contextInfo.externalAdReply.renderLargerThumbnail === true && /berita-/.test(sent[0].msg.contextInfo.externalAdReply.sourceUrl));
t("3d. format pesan: judul + snippet + link + waktu WIB", /BERITA BARU — CNN Indonesia/.test(sent[0].msg.text) && /Berita /.test(sent[0].msg.text) && /berita-6|berita-5|berita-4/.test(sent[0].msg.text) && /WIB/.test(sent[0].msg.text));

r = await lib.runCheck(); // semua udah ke-seen → 0 kirim
t("3e. siklus kedua dedup → 0 berita baru", r.sent === 0 && r.berita === 0, JSON.stringify(r));

// berita baru muncul
fixture = withItem(FIXTURE, `<item><title>BREAKING Berita Baru Banget</title><link>https://cnn.example.com/berita-99</link><pubDate>Sat, 12 Sep 2026 12:30:00 +0700</pubDate><description>Deskripsi breaking news.</description><enclosure url="https://akcdn.example.com/img-99.jpeg" length="25000" type="image/jpeg"/></item>`);
sent.length = 0;
r = await lib.runCheck();
t("3f. berita baru masuk → kirim 1 (dedup jalan)", r.sent === 1 && /Berita Baru Banget/.test(sent[0].msg.text), JSON.stringify(r));

// ═══ 4. target terpusat nambah jangkauan ═══
out("\n— target terpusat —");
setAutoTargetConfig("autoberitanotify", { mode: "dm", dm: "6281234@s.whatsapp.net" });
fixture = withItem(FIXTURE, `<item><title>Berita Central Target</title><link>https://cnn.example.com/berita-77</link><pubDate>Sat, 12 Sep 2026 12:35:00 +0700</pubDate><description>Deskripsi.</description></item>`);
sent.length = 0;
r = await lib.runCheck();
t("4a. subscriber + target terpusat (dm) dapat, dedup jid", r.sent === 2 && r.recipients === 2 && sent.some((s) => s.chat === "6281234@s.whatsapp.net") && sent.some((s) => s.chat === "grup-a@g.us"), JSON.stringify(r));
t("4b. statusInfo nunjukin target desc", /dm 6281234/i.test(lib.statusInfo().targetDesc || ""), lib.statusInfo().targetDesc);

// ═══ 5. only: sample aktivasi gak spam subscriber lain ═══
out("\n— sample aktivasi —");
fixture = withItem(FIXTURE, `<item><title>Berita Sample Aktivasi</title><link>https://cnn.example.com/berita-55</link><pubDate>Sat, 12 Sep 2026 12:38:00 +0700</pubDate><description>Deskripsi sample.</description></item>`);
sent.length = 0;
r = await lib.runCheck({ force: true, max: 1, only: "grup-baru@g.us" });
t("5a. only=chat → sample ke chat itu doang (subscriber lain aman)", r.sent === 1 && sent[0].chat === "grup-baru@g.us" && sent.length === 1, JSON.stringify(r));
t("5b. sample ikut ke-mark seen (gak dobel dikirim siklus berikut)", !(await lib.runCheck()).sent);

// ═══ 6. config: sumber + interval + seen cap ═══
out("\n— config —");
t("6a. setSource valid → reset seen", lib.setSource("tempo") === "tempo" && lib.loadState().seen.length === 0 && lib.loadState().source === "tempo");
t("6b. setSource invalid → null", lib.setSource("detik") === null);
t("6c. setIntervalMin 15 ok, 3 & 999 ditolak", lib.setIntervalMin(15) === 15 && lib.setIntervalMin(3) === null && lib.setIntervalMin(999) === null);
const st = lib.loadState();
st.seen = Array.from({ length: 250 }, (_, i) => "guid-" + i);
await lib.saveState(st);
await lib.runCheck().catch(() => {});
t("6d. seen di-cap 200", lib.loadState().seen.length <= 200, String(lib.loadState().seen.length));
t("6e. statusInfo label + interval", lib.statusInfo().sourceLabel === "Tempo" && lib.statusInfo().intervalMin === 15);
t("6f. off global → runCheck skipped", lib.setBeritaNotifierOn(false) === false && (await lib.runCheck()).skipped === "off");
lib.setBeritaNotifierOn(true);

// ═══ 7. plugin handler ═══
out("\n— plugin —");
const replies = [];
function mockM(args, chat = "pc-x@s.whatsapp.net") {
  return {
    command: "beritanotify", args, text: args.join(" "), prefix: ".",
    chat, sender: chat, pushName: "User",
    isGroup: chat.includes("@g.us"),
    react: async () => {},
    reply: async (txt) => { replies.push(String(txt)); return { key: {} }; },
  };
}
const sockPlug = { sendMessage: async (c, msg) => { sent.push({ chat: c, msg }); return { key: {} }; } };
const opts = { sock: sockPlug, config: { command: { prefix: "." } } };

await handler(mockM([]), opts);
t("7a. no-arg → guide", /beritanotify/.test(low(replies.at(-1))));

sent.length = 0; fixture = FIXTURE;
await handler(mockM(["on"], "grup-c@g.us"), opts);
t("7b. .beritanotify on → subscriber baru + sample ke chat itu doang", /langganan berita aktif/.test(low(replies.at(-1))) && sent.some((s) => s.chat === "grup-c@g.us") && sent.every((s) => s.chat === "grup-c@g.us"), (replies.at(-1) || "").slice(0, 80) + " | sent=" + sent.map((s) => s.chat).join(","));
t("7c. subscriber tercatat", lib.isSubscriber("grup-c@g.us") && lib.loadState().subscribers.includes("grup-c@g.us"));

await handler(mockM(["on"], "grup-c@g.us"), opts);
t("7d. double on → info udah langganan", /udah langganan/.test(low(replies.at(-1))));

await handler(mockM(["sumber"]), opts);
t("7e. sumber no-arg → daftar sumber", /tempo/.test(low(replies.at(-1))) && /cnn/.test(low(replies.at(-1))));
await handler(mockM(["sumber", "cnbc"]), opts);
t("7f. sumber cnbc → ganti", /sumber berganti/.test(low(replies.at(-1))) && lib.loadState().source === "cnbc");
await handler(mockM(["sumber", "xxx"]), opts);
t("7g. sumber invalid → error", /gak dikenal/.test(low(replies.at(-1))));

await handler(mockM(["interval", "20"]), opts);
t("7h. interval 20 ok", /20/.test(low(replies.at(-1))) && lib.loadState().intervalMin === 20);
await handler(mockM(["interval", "2"]), opts);
t("7i. interval 2 ditolak", /gak valid/.test(low(replies.at(-1))));

await handler(mockM(["status"]), opts);
t("7j. status: on + sumber + subscriber + target", /berita notifier/.test(low(replies.at(-1))) && /cnbc/.test(low(replies.at(-1))), (replies.at(-1) || "").slice(0, 120));

fixture = withItem(FIXTURE, `<item><title>Berita Now Command</title><link>https://cnn.example.com/berita-now</link><pubDate>Sat, 12 Sep 2026 12:39:00 +0700</pubDate><description>Deskripsi now.</description></item>`);
sent.length = 0;
await handler(mockM(["now"], "grup-c@g.us"), opts);
t("7k. .now → force kirim ke semua subscriber+target", /dikirim di atas/.test(low(replies.at(-1))) && sent.some((s) => s.chat === "grup-a@g.us"), `sent=${sent.map((s) => s.chat).join(",")}`);

await handler(mockM(["off"], "grup-c@g.us"), opts);
t("7l. off → unSubscribe chat ini doang (grup-a tetap)", /dihentikan/.test(low(replies.at(-1))) && !lib.isSubscriber("grup-c@g.us") && lib.isSubscriber("grup-a@g.us"));

await handler(mockM(["apaaja"]), opts);
t("7m. sub gak dikenal → info", /gak dikenal/.test(low(replies.at(-1))));

// feed error → now sopan
lib.setRssHttp(async () => { throw new Error("RSS 500"); });
await handler(mockM(["now"], "grup-a@g.us"), opts);
t("7n. feed mati → pesan error sopan", /gagal ambil feed/.test(low(replies.at(-1))));

// ═══ 8. switch integration ═══
out("\n— switch wiring —");
const switchSrc = fs.readFileSync(R + "/plugins/owner/switch.js", "utf-8");
const idxSrc = fs.readFileSync(R + "/index.js", "utf-8");
t("8a. AUTO_ALIASES beritanotify → autoberitanotify", /beritanotify: "autoberitanotify"/.test(switchSrc));
t("8b. registry switch autoberitanotify", /autoberitanotify: \{/.test(switchSrc) && /Auto Berita Notifier/.test(switchSrc));
t("8c. TARGETABLE + SUBSCRIBER_FEATURES ke-daftar (semua occurrence)", (switchSrc.match(/autoberitanotify/g) || []).length >= 6, String((switchSrc.match(/autoberitanotify/g) || []).length));
t("8d. index.js init BeritaNotifier", /BeritaNotifier/.test(idxSrc) && /rara-berita-notifier/.test(idxSrc));

out(`\n===== ${pass} PASS, ${fail} FAIL =====`);
process.exit(fail ? 1 : 0);
