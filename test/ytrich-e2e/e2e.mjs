// E2E YouTube AI RICH (contoh owner 10 Sep 2026: script !youtube rich bot).
// Verifikasi: rantai Piped + fallback yt-search, payload rich (image + table
// + deskripsi + link + chips), primitive video baru, handler .yts rich →
// fallback teks. Jalankan dari cwd DIR KOSONG:
//   mkdir -p /tmp/ytrich-e2e && cd /tmp/ytrich-e2e &&
//   node <repo>/test/ytrich-e2e/e2e.mjs
import {
  setPipedHttp, setYtsSearch, resetYouTubeDeps,
  getYouTubeInfo, formatYouTubeRich, pipedSearch, pipedVideoDetails,
  extractVideoId, formatNumber, formatDuration,
} from "../../src/lib/nova-youtube-info.js";
import { buildRichResponse, sendRichMessage } from "../../src/lib/nova-rich-response.js";
import { config as ytsConfig, handler } from "../../plugins/search/yts.js";

let pass = 0, fail = 0;
const w = (s) => process.stdout.write(s + "\n");
const check = (name, ok) => { w((ok ? "  ✅" : "  ❌") + " " + name); ok ? pass++ : fail++; };

// ── helper ──
function makeM(argsText, sock) {
  const replies = [], reacts = [];
  return {
    args: String(argsText).split(" ").filter(Boolean),
    text: String(argsText),
    chat: "62812@g.us", prefix: ".", isGroup: true,
    reply: async (t) => { replies.push(t); return { key: { id: "r" + replies.length } }; },
    react: async (e) => { reacts.push(e); return true; },
    _replies: replies, _reacts: reacts, _sock: sock,
  };
}
function makeSock({ relayFails = 0 } = {}) {
  const calls = { relay: [] };
  let fails = relayFails;
  return {
    calls,
    relayMessage: async (jid, node, opts) => { if (fails-- > 0) throw new Error("relay down"); calls.relay.push({ jid, node, opts }); },
    sendMessage: async (jid, msg) => ({ key: { id: "s" } }),
  };
}
const PIPED_ITEM = (id) => ({
  url: `/watch?v=${id}`, type: "stream", title: "Lofi Hip Hop Mix",
  uploaderName: "Lofi Girl", uploader: "Lofi Girl", views: 12345678, viewCount: 12345678,
  duration: 3650, uploadedDate: "1 tahun lalu", uploadDate: "1 tahun lalu",
  thumbnailUrl: "https://img.test/lofi.jpg", likes: 98765,
  description: "Deskripsi lofi ".repeat(60), // > 500 char
});

// ── 1. primitives & helper — verbatim contoh owner ──
w("\n— helper format (verbatim contoh owner) —");
{
  check("formatNumber 12.3M / 98.8K / 999", formatNumber(12345678) === "12.3M" && formatNumber(98765) === "98.8K" && formatNumber(999) === "999");
  check("formatDuration 3650 → 1:00:50", formatDuration(3650) === "1:00:50");
  check("formatDuration 75 → 1:15", formatDuration(75) === "1:15");
  check("extractVideoId watch / youtu.be / shorts / ID mentah", extractVideoId("https://youtube.com/watch?v=abc123XYZ_-") === "abc123XYZ_-" && extractVideoId("https://youtu.be/abc123XYZ_-") === "abc123XYZ_-" && extractVideoId("https://youtube.com/shorts/abc123XYZ_-") === "abc123XYZ_-" && extractVideoId("abc123XYZ_-") === "abc123XYZ_-");
  check("extractVideoId query biasa → null", extractVideoId("lagu galau") === null);
}

// ── 2. primitive VIDEO baru di buildRichResponse ──
w("\n— primitive video baru —");
{
  const rich = buildRichResponse([{ type: "video", url: "https://video.test/v.mp4", duration: 42 }], "tes", "");
  const prim = rich.sections[0].view_model.primitive;
  check("GenAIaeacdsnwVideoPrimitive + duration", prim.__typename === "GenAIaeacdsnwVideoPrimitive" && prim.video === "https://video.test/v.mp4" && prim.duration === 42);
}

// ── 3. rantai Piped — instance 1 mati → instance 2 jalan ──
w("\n— rantai piped (seam) —");
{
  const tried = [];
  setPipedHttp(async (url) => {
    tried.push(url);
    // instance PERTAMA dalam rantai selalu down (order-agnostic test)
    if (tried.length === 1) throw new Error("503 down");
    if (url.includes("/search")) return { items: [PIPED_ITEM("dQw4w9WgXcQ")] };
    if (url.includes("/streams/")) return { title: "Lofi Hip Hop Mix", uploader: "Lofi Girl", views: 12345678, duration: 3650, uploadDate: "1 tahun lalu", likes: 98765, description: "Deskripsi lofi ".repeat(60), thumbnailUrl: "https://img.test/lofi.jpg" };
    throw new Error("unhandled " + url);
  });
  const items = await pipedSearch("lofi hip hop");
  check("search: instance 1 down → instance 2 dapet", items.length === 1 && tried.length === 2);
  const det = await pipedVideoDetails("dQw4w9WgXcQ");
  check("details: title + likes + thumbnail", det?.title === "Lofi Hip Hop Mix" && det.likes === 98765);
}

// ── 4. getYouTubeInfo — mode QUERY, mode LINK, fallback yt-search, null ──
w("\n— getYouTubeInfo —");
{
  const info = await getYouTubeInfo("lofi hip hop");
  check("query: video lengkap source piped", info?.source === "piped" && info.video.id === "dQw4w9WgXcQ" && info.video.title === "Lofi Hip Hop Mix" && info.video.likeCount === 98765 && info.video.url.includes("watch?v=dQw4w9WgXcQ"));
  const infoLink = await getYouTubeInfo("https://youtu.be/dQw4w9WgXcQ");
  check("link: langsung detail", infoLink?.video.id === "dQw4w9WgXcQ" && infoLink.source === "piped");

  // piped mati semua → yt-search fallback
  setPipedHttp(async () => { throw new Error("all down"); });
  setYtsSearch(async (q) => (String(q).includes("galau")
    ? { videos: [{ title: "Lagu Galau", author: { name: "Penyanyi" }, views: 5000, ago: "2 hari lalu", image: "https://img.test/galau.jpg", url: "https://youtube.com/watch?v=galau12345", timestamp: "3:21" }] }
    : { videos: [] }));
  const infoYts = await getYouTubeInfo("lagu galau");
  check("fallback yt-search: source + data terbatas", infoYts?.source === "yt-search" && infoYts.video.title === "Lagu Galau" && infoYts.video.id === "galau12345" && infoYts.video.duration === null);
  check("fallback: likeCount/desc null (yt-search gak punya)", infoYts.video.likeCount === null && infoYts.video.description === null);

  const infoNull = await getYouTubeInfo("zzz gak ada hasil");
  check("semua mati + gak ketemu → null", infoNull === null);
  resetYouTubeDeps();
}

// ── 5. formatYouTubeRich — payload verbatim contoh owner ──
w("\n— formatYouTubeRich payload —");
{
  const video = {
    title: "Lofi Hip Hop Mix", uploaderName: "Lofi Girl", viewCount: 12345678,
    duration: 3650, uploadedDate: "1 tahun lalu", likeCount: 98765,
    description: "Deskripsi lofi ".repeat(60),
    thumbnailUrl: "https://img.test/lofi.jpg",
    url: "https://youtube.com/watch?v=dQw4w9WgXcQ", id: "dQw4w9WgXcQ",
  };
  const rich = formatYouTubeRich(video, { chips: [".playaudio lofi", ".ytmp3 https://x"] });
  const secs = rich.sections.map((s) => s.view_model.primitive.__typename);
  check("urutan: image → text → table → text → text → suggest", secs[0] === "GenAIaeacdsnwImagePrimitive" && secs[1] === "GenAIaeacdsnwTextPrimitive" && secs[2] === "GenAIaeacdsnwTablePrimitive" && secs[5] === "GenAIaeacdsnwSuggestPrimitive" && secs.length === 6);
  check("image = thumbnail", rich.sections[0].view_model.primitive.image === "https://img.test/lofi.jpg");
  check("text 1 = judul", rich.sections[1].view_model.primitive.text.includes("Lofi Hip Hop Mix"));
  const table = rich.sections[2].view_model.primitive.table;
  check("table: 5 baris Channel/Views/Duration/Uploaded/Likes", table.length === 5 && table[0][0] === "Channel" && table[1][1] === "12.3M" && table[2][1] === "1:00:50" && table[4][1] === "98.8K");
  const desc = rich.sections[3].view_model.primitive.text;
  check("deskripsi kepotong 500 + tanda ...", desc.length <= 520 && desc.includes("..."));
  check("link tonton di text terakhir-1", rich.sections[4].view_model.primitive.text.includes("watch?v=dQw4w9WgXcQ"));
  check("chips suggest masuk", rich.sections[5].view_model.primitive.prompts[0] === ".playaudio lofi");
  check("header = judul (max 40)", rich.headerText.length <= 42 && rich.headerText.includes("Lofi"));
  // tanpa likes/desc (yt-search) → table 4 baris, tanpa section deskripsi
  const rich2 = formatYouTubeRich({ title: "Lagu Galau", uploaderName: "Penyanyi", viewCount: 5000, duration: null, uploadedDate: "2 hari", url: "https://youtube.com/watch?v=galau12345", id: "galau12345" });
  const t2 = rich2.sections.find((s) => s.view_model.primitive.__typename === "GenAIaeacdsnwTablePrimitive").view_model.primitive.table;
  check("data terbatas: 4 baris + Duration N/A", t2.length === 4 && t2[2][1] === "N/A");
}

// ── 6. handler .yts → rich + fallback ──
w("\n— handler .yts —");
{
  setPipedHttp(async (url) => {
    if (url.includes("/search")) return { items: [PIPED_ITEM("dQw4w9WgXcQ")] };
    if (url.includes("/streams/")) return { title: "Lofi Hip Hop Mix", uploader: "Lofi Girl", views: 12345678, duration: 3650, uploadDate: "1 tahun lalu", likes: 98765, description: "Deskripsi lofi ".repeat(60), thumbnailUrl: "https://img.test/lofi.jpg" };
    throw new Error("unhandled");
  });
  const sock = makeSock();
  const m = makeM("lofi hip hop", sock);
  await handler(m, { sock, text: "lofi hip hop" });
  check("rich kekirim (1 relay)", sock.calls.relay.length === 1);
  const richMsg = sock.calls.relay[0].node.botForwardedMessage.message.richResponseMessage;
  const dec = JSON.parse(Buffer.from(richMsg.unifiedResponse.data, "base64").toString("utf-8"));
  check("payload: image + table + desc + chips", dec.sections.some((s) => s.view_model.primitive.__typename === "GenAIaeacdsnwImagePrimitive") && dec.sections.some((s) => s.view_model.primitive.__typename === "GenAIaeacdsnwTablePrimitive") && dec.sections.some((s) => s.view_model.primitive.__typename === "GenAIaeacdsnwSuggestPrimitive"));
  check("chips = .playaudio/.playvideo/.ytmp3", dec.sections.find((s) => s.view_model.primitive.__typename === "GenAIaeacdsnwSuggestPrimitive").view_model.primitive.prompts.every((p) => p.startsWith(".playaudio") || p.startsWith(".playvideo") || p.startsWith(".ytmp3")));
  check("TANPA forwardingScore", richMsg.contextInfo.forwardingScore === undefined);
  check("react 🐣", m._reacts.includes("🐣"));
  check("fallback teks gak kekirim", m._replies.length === 0);

  // relay gagal → fallback teks lama
  const sock2 = makeSock({ relayFails: 1 });
  const m2 = makeM("lofi hip hop", sock2);
  await handler(m2, { sock: sock2, text: "lofi hip hop" });
  check("fallback: m.reply teks Ditemukan + URL", m2._replies.length === 1 && m2._replies[0].includes("Ditemukan") && m2._replies[0].includes("watch?v=dQw4w9WgXcQ") && m2._replies[0].includes("1:00:50"));
  check("fallback: tetap react 🐣", m2._reacts.includes("🐣"));

  // semua sumber mati → error + react ❌
  setPipedHttp(async () => { throw new Error("down"); });
  setYtsSearch(async () => ({ videos: [] }));
  const sock3 = makeSock();
  const m3 = makeM("zzz gak ada", sock3);
  await handler(m3, { sock: sock3, text: "zzz gak ada" });
  check("gak ketemu: error + react ❌", m3._replies[0]?.includes("tidak menemukan hasil") && m3._reacts.includes("❌"));
  resetYouTubeDeps();
}

// ── 7. sendRichMessage primitive video jalan via relay ──
w("\n— send video rich —");
{
  const sock = makeSock();
  const rich = buildRichResponse([{ type: "video", url: "https://video.test/v.mp4", duration: 42 }], "🎬 tes", "");
  const ok = await sendRichMessage(sock, "j@g.us", rich);
  const dec = JSON.parse(Buffer.from(sock.calls.relay[0].node.botForwardedMessage.message.richResponseMessage.unifiedResponse.data, "base64").toString("utf-8"));
  check("video primitive kekirim", ok === true && dec.sections[0].view_model.primitive.__typename === "GenAIaeacdsnwVideoPrimitive");
}

w(`\n${pass} PASS / ${fail} FAIL`);
setTimeout(() => process.exit(fail ? 1 : 0), 300);
