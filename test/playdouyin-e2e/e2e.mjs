// E2E .douyin MERGED (rename dr .playdouyin — request owner 10 Sep): satu
// command dua mode — keyword search (injected) + link download (injected).
// Douyin murni, TikTok DITOLAK. Reaksi 🕒→🐣 wajib.
import { initDatabase } from "../../src/lib/rara-database.js";
import {
  setDouyinSearchRunner,
  setDouyinResolver,
  resetPlayDouyinDeps,
  isDouyinLink,
  isTikTokLink,
} from "../../src/lib/rara-playdouyin.js";
import { normalizeDouyinItem } from "../../src/scraper/douyin-search.js";

await initDatabase("/tmp/playdouyin-e2e-db.json");

// ── data mock ala hasil asli vulnv/douyin-search-scraper (verified live) ──
const RAW_VIDEO = {
  keyword: "kucing lucu",
  aweme_id: "7641545429603061007",
  aweme_url: "https://www.douyin.com/video/7641545429603061007",
  desc: "Kucing lucu main bola #kucing",
  is_image_post: false,
  media_type: "video",
  video_play_url: "https://v5-dy-oexpiry.zjcdn.com/video.mp4",
  video_cover_url: "https://cover.example/douyin.jpg",
  author_nickname: "猫猫日常",
  author_unique_id: "maomao",
  play_count: 1500000,
  digg_count: 230000,
  comment_count: 3400,
  share_count: 12000,
  music_play_url: "https://music.example/a.mp3",
  music_title: "lagu douyin",
};
const RAW_PHOTO = {
  aweme_id: "740111222333444555",
  aweme_url: "https://www.douyin.com/note/740111222333444555",
  desc: "Foto slide douyin",
  is_image_post: true,
  images: ["https://img.example/1.webp", "https://img.example/2.webp", "https://img.example/3.webp"],
  author_nickname: "fotografer",
  play_count: 50000,
};

// inject search runner
setDouyinSearchRunner(async (actorId, input) => {
  const kw = (input.keywords || [])[0] || "";
  if (kw.includes("foto")) return [RAW_PHOTO];
  if (kw.includes("gagal")) return [];
  return [RAW_VIDEO];
});

const { config, handler } = await import("../../plugins/download/douyindl.js");

const replies = [];
const sent = [];
const reacts = [];
function mockM(args) {
  return {
    args, text: args.join(" "), prefix: ".", command: "douyin",
    pushName: "Tester", chat: "62899@c.us", sender: "62899",
    reply: async (t) => { replies.push(String(t)); },
    react: async (e) => { reacts.push(e); },
  };
}
const mockSock = {
  sendMessage: async (chat, payload) => { sent.push({ chat, payload }); },
};

let pass = 0, fail = 0;
const w = (s) => process.stdout.write(s + "\n");
const check = (name, ok) => { w((ok ? "  ✅" : "  ❌") + " " + name); ok ? pass++ : fail++; };

// 1. tanpa arg → usage guide + gak nyebut apify di guide? (guide cukup)
replies.length = 0; sent.length = 0;
await handler(mockM([]), { sock: mockSock });
check("no-arg: usage guide", replies.length === 1 && replies[0].length > 50);

// 2. keyword search video → kirim video douyin + reaksi 🐣
replies.length = 0; sent.length = 0; reacts.length = 0;
await handler(mockM(["kucing", "lucu"]), { sock: mockSock });
check("search video: kirim media", sent.length >= 1);
check("search video: payload video url no-watermark", sent[0]?.payload?.video?.url === RAW_VIDEO.video_play_url);
check("search video: caption douyin", String(sent[0]?.payload?.caption || "").includes("Douyin"));
check("search video: reaksi 🐣 terakhir", reacts[reacts.length - 1] === "🐣");

// 3. keyword search foto slide → kirim N foto
replies.length = 0; sent.length = 0;
await handler(mockM(["kucing", "foto"]), { sock: mockSock });
check("search foto slide: kirim semua image", sent.length === 3 && sent.every((s) => s.payload?.image?.url));

// 4. resolve link douyin (level LIB — last-mile fallback plugin pakai ini)
setDouyinResolver(async (url) => ({
  type: "video",
  title: "Video dari link",
  cover: "",
  link: url,
  author: { name: "creator", handle: "" },
  stats: { plays: 100, likes: 10, comments: 1, shares: 1 },
  video: { noWatermark: "https://dl.example/douyin.mp4", hd: "", watermark: "" },
  images: [],
  music: { url: "", title: "" },
}));
const { resolvePlayDouyin } = await import("../../src/lib/rara-playdouyin.js");
const r4 = await resolvePlayDouyin("https://v.douyin.com/abc123/");
check("resolve link douyin (lib): video no-watermark", r4.item?.video?.noWatermark === "https://dl.example/douyin.mp4");
// foto slide via lib
setDouyinResolver(async () => ({
  type: "photo", title: "Slide", cover: "", link: "x",
  author: { name: "a", handle: "" }, stats: {},
  video: { noWatermark: "", hd: "", watermark: "" },
  images: ["https://img.example/1.webp", "https://img.example/2.webp"],
  music: { url: "", title: "" },
}));
const r4b = await resolvePlayDouyin("https://v.douyin.com/slide/");
check("resolve foto slide (lib): 2 images", r4b.item?.type === "photo" && r4b.item.images.length === 2);

// 4c. fallback rantai baru: HAIDAR + SYLVATICA (level lib, injected)
const { haidarDouyin, sylvaticaDouyin, setHaidarDouyin, setSylvaticaDouyin, resetDouyinDlDeps, resolveDouyinShortlink } = await import("../../src/lib/rara-douyin-dl.js");
setHaidarDouyin(async () => ({ source: "Haidar", title: "Video Haidar", video: "https://dl.example/hd.mp4", audio: "https://dl.example/a.mp3", images: [] }));
const h4 = await haidarDouyin("https://www.douyin.com/video/1");
check("fallback haidar: video no-watermark + audio", h4?.video === "https://dl.example/hd.mp4" && h4?.audio === "https://dl.example/a.mp3");
// sylvatica: pilih quality hd duluan walau urutan array acak
setSylvaticaDouyin(null); // reset dulu biar default gak kepakai
setSylvaticaDouyin(async () => ({ source: "Sylvatica", title: "S", video: "https://dl.example/sy-hd.mp4", audio: "", images: [], quality: "hd ⭐" }));
const s4 = await sylvaticaDouyin("https://www.douyin.com/video/1");
check("fallback sylvatica: video hd terpilih", s4?.video === "https://dl.example/sy-hd.mp4" && s4?.quality === "hd ⭐");
// sylvatica foto slide
setSylvaticaDouyin(async () => ({ source: "Sylvatica", title: "S", video: "", audio: "", images: ["https://img.example/1.webp", "https://img.example/2.webp"], quality: "" }));
const s4b = await sylvaticaDouyin("https://www.douyin.com/note/2");
check("fallback sylvatica: foto slide shape", s4b?.images?.length === 2);
// kedua fallback null → gak crash
setHaidarDouyin(async () => null);
setSylvaticaDouyin(async () => null);
check("fallback haidar null: aman", (await haidarDouyin("x")) === null);
check("fallback sylvatica null: aman", (await sylvaticaDouyin("x")) === null);
// shortlink resolver: stub global fetch → redirect follow
const realFetch = globalThis.fetch;
globalThis.fetch = async () => ({ ok: true, url: "https://www.iesdouyin.com/share/video/123/" });
const rs = await resolveDouyinShortlink("https://v.douyin.com/abc/");
globalThis.fetch = realFetch;
check("shortlink resolver: v.douyin → kanonik", rs === "https://www.iesdouyin.com/share/video/123/");
check("shortlink resolver: url biasa gak diutak-atik", (await resolveDouyinShortlink("https://www.douyin.com/video/9")) === "https://www.douyin.com/video/9");
resetDouyinDlDeps();

// 5. resolve gagal → error jelas
setDouyinResolver(async () => null);
const r5 = await resolvePlayDouyin("https://v.douyin.com/broken/");
check("resolve gagal: pesan error", !r5.item && !!r5.error);

// 6. LINK TIKTOK → DITOLAK (gak nyampur)
setDouyinResolver(async (url) => ({ type: "video", title: "x", video: { noWatermark: url }, images: [] }));
replies.length = 0; sent.length = 0;
await handler(mockM(["https://www.tiktok.com/@user/video/123"]), { sock: mockSock });
check("link tiktok: DITOLAK", replies.length === 1 && (/tiktok/i.test(replies[0]) || replies[0].includes("ᴛɪᴋᴛᴏᴋ")));
check("link tiktok: gak kirim media", sent.length === 0);

// 7. search 0 hasil (douyin block) → error + tip
replies.length = 0; sent.length = 0;
await handler(mockM(["gagal", "total"]), { sock: mockSock });
check("search kosong: pesan block/tip", replies.length === 1 && replies[0].includes("❌"));

// 8. helper link: douyin vs tiktok
check("isDouyinLink: v.douyin.com", isDouyinLink("https://v.douyin.com/abc/"));
check("isDouyinLink: iesdouyin.com", isDouyinLink("https://www.iesdouyin.com/share/video/123"));
check("isDouyinLink: tiktok.com = false", !isDouyinLink("https://www.tiktok.com/@a/video/1"));
check("isTikTokLink: douyin.com = false", !isTikTokLink("https://www.douyin.com/video/1"));
check("isTikTokLink: tiktok.com = true", isTikTokLink("https://vm.tiktok.com/xx/"));

// 9. normalizeDouyinItem: stub limit_reached gak lolos filter
const stub = normalizeDouyinItem({ limit_reached: true, message: "preview unavailable" });
check("normalize: stub preview gak punya media", !stub.video.noWatermark && !stub.images.length);

// 10. cache 30 mnt: search sama gak manggil runner dobel
let calls = 0;
setDouyinSearchRunner(async () => { calls++; return [RAW_VIDEO]; });
resetPlayDouyinDeps();
setDouyinResolver(null);
const { searchPlayDouyin } = await import("../../src/lib/rara-playdouyin.js");
await searchPlayDouyin("cache-test");
await searchPlayDouyin("cache-test");
check("cache keyword: runner cuma dipanggil 1x", calls === 1);

// 11. config plugin
check("config: nama douyin", config.name === "douyin");
check("config: alias playdouyin tetap jalan (backward compat)", (config.alias || []).includes("playdouyin"));
check("config: cooldown 15", config.cooldown === 15);

w(`\n${pass}/${pass + fail} PASS`);
resetPlayDouyinDeps();
setTimeout(() => process.exit(fail ? 1 : 0), 300);
