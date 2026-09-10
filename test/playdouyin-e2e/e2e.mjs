// E2E .playdouyin — DOUYIN MURNI (gak nyampur TikTok), search & resolve
// di-inject biar offline. Reaksi ⏳→🐣 wajib (standar bot).
import { initDatabase } from "../../src/lib/nova-database.js";
import {
  setDouyinSearchRunner,
  setDouyinResolver,
  resetPlayDouyinDeps,
  isDouyinLink,
  isTikTokLink,
} from "../../src/lib/nova-playdouyin.js";
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

const { config, handler } = await import("../../plugins/search/playdouyin.js");

const replies = [];
const sent = [];
const reacts = [];
function mockM(args) {
  return {
    args, text: args.join(" "), prefix: ".", command: "playdouyin",
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

// 4. link douyin → resolve via resolver injected
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
replies.length = 0; sent.length = 0;
await handler(mockM(["https://v.douyin.com/abc123/"]), { sock: mockSock });
check("resolve link douyin: video terkirim", sent.length === 1 && sent[0].payload?.video?.url === "https://dl.example/douyin.mp4");

// 5. link douyin gak valid / resolve gagal → error jelas
setDouyinResolver(async () => null);
replies.length = 0; sent.length = 0;
await handler(mockM(["https://v.douyin.com/broken/"]), { sock: mockSock });
check("resolve gagal: pesan error", replies.length === 1 && replies[0].includes("❌"));

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
const { searchPlayDouyin } = await import("../../src/lib/nova-playdouyin.js");
await searchPlayDouyin("cache-test");
await searchPlayDouyin("cache-test");
check("cache keyword: runner cuma dipanggil 1x", calls === 1);

// 11. config plugin
check("config: nama playdouyin", config.name === "playdouyin");
check("config: alias ada douyinplay", (config.alias || []).includes("douyinplay"));
check("config: cooldown 15", config.cooldown === 15);

w(`\n${pass}/${pass + fail} PASS`);
resetPlayDouyinDeps();
setTimeout(() => process.exit(fail ? 1 : 0), 300);
