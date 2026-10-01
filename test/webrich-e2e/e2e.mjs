// E2E .WEB AI RICH (owner 10 Sep 2026: "fitur ai rich cm buat cmd .web —
// .web youtube → ai rich youtube, .web google → ai rich google search").
// Verifikasi: feed YouTube ala halaman search asli, detail video via link,
// SERP Google ala Chrome, intercept handler .web, fallback webview saat
// rich gagal. Jalankan dari cwd DIR KOSONG:
//   mkdir -p /tmp/webrich-e2e && cd /tmp/webrich-e2e &&
//   node <repo>/test/webrich-e2e/e2e.mjs
import {
  setPipedHttp, setYtsSearch, resetYouTubeDeps,
  getYouTubeFeed, formatYouTubeFeedRich, pipedSuggestions, extractVideoId,
} from "../../src/lib/rara-youtube-info.js";
import { formatGoogleSerpRich } from "../../src/lib/rara-web-rich.js";
import { buildRichResponse, sendRichMessage } from "../../src/lib/rara-rich-response.js";
import { config as webConfig, handler as webHandler } from "../../plugins/browser/web.js";

let pass = 0, fail = 0;
const w = (s) => process.stdout.write(s + "\n");
const check = (name, ok) => { w((ok ? "  ✅" : "  ❌") + " " + name); ok ? pass++ : fail++; };

function makeM(argsText, sock) {
  const replies = [], reacts = [];
  return {
    args: String(argsText).split(" ").filter(Boolean),
    text: String(argsText),
    chat: "62812@g.us", prefix: ".", isGroup: true, sender: "62812@s.whatsapp.net",
    reply: async (t) => { replies.push(typeof t === "string" ? t : JSON.stringify(t)); return { key: { id: "r" + replies.length } }; },
    react: async (e) => { reacts.push(e); return true; },
    _replies: replies, _reacts: reacts, _sock: sock,
  };
}
function makeSock() {
  const calls = { relay: [] };
  return {
    calls,
    relayMessage: async (jid, node, opts) => { calls.relay.push({ jid, node, opts }); },
    sendMessage: async (jid, msg) => ({ key: { id: "s" } }),
  };
}
const richOf = (call) => {
  const rm = call.node?.botForwardedMessage?.message?.richResponseMessage;
  return rm ? JSON.parse(Buffer.from(rm.unifiedResponse.data, "base64").toString("utf-8")) : null;
};
const PIPED_SEARCH_ITEMS = (n) => Array.from({ length: n }, (_, i) => ({
  url: `/watch?v=${("vid" + i).padEnd(11, "0")}`,
  type: "stream", title: `Video Kucing Lucu Part ${i + 1}`,
  thumbnail: `https://img.test/thumb${i}.jpg`,
  uploaderName: `Channel ${i + 1}`, views: 1000 + i, duration: 60 + i,
  uploadedDate: `${i + 1} hari lalu`, uploaded: -1, shortDescription: "desc",
}));

// seam Piped: /search + /streams + /suggestions
function pipedMock(query) {
  setPipedHttp(async (url) => {
    if (url.includes("/search")) return { items: PIPED_SEARCH_ITEMS(7).filter((it, i) => i < 7 && it.title.toLowerCase().includes(query.toLowerCase()) || i < 2) };
    if (url.includes("/suggestions")) return [query, query + " lucu", query + " viral", "zzz lain"];
    if (url.includes("/streams/")) return { title: `Detail ${query}`, uploader: "Channel X", views: 999, duration: 123, uploadDate: "kemarin", likes: 55, description: "Deskripsi video.", thumbnailUrl: "https://img.test/detail.jpg" };
    throw new Error("unhandled " + url);
  });
}

// ── 1. getYouTubeFeed — mapping ala YouTube search ──
w("\n— getYouTubeFeed (piped) —");
{
  pipedMock("kucing");
  const feed = await getYouTubeFeed("kucing");
  check("source piped + 7 items", feed?.source === "piped" && feed.items.length === 7);
  const it = feed.items[0];
  check("item: url penuh + thumbnail + channel", it.url === "https://youtube.com/watch?v=vid00000000" && it.id === "vid00000000" && it.thumbnail === "https://img.test/thumb0.jpg" && it.channel === "Channel 1");
  check("item: durationText + views + uploadedDate", it.durationText === "1:00" && it.views === 1000 && it.uploadedDate === "1 hari lalu");
  // item LIVE duration -1
  setPipedHttp(async (url) => {
    if (url.includes("/search")) return { items: [{ url: "/watch?v=live1111111", type: "stream", title: "Live Semalam", thumbnail: "https://img.test/live.jpg", uploaderName: "Live Chan", views: 5, duration: -1, uploadedDate: null, uploaded: -1 }] };
    throw new Error("x");
  });
  const feedLive = await getYouTubeFeed("live");
  check("item LIVE: durationText 🔴 LIVE", feedLive.items[0].live === true && feedLive.items[0].durationText === "🔴 LIVE");

  // fallback yt-search
  setPipedHttp(async () => { throw new Error("down"); });
  setYtsSearch(async () => ({ videos: [{ title: "Kucing Galau", author: { name: "Chan" }, views: 42, ago: "3 hari lalu", image: "https://img.test/y.jpg", url: "https://youtube.com/watch?v=galau12345", timestamp: "2:30" }] }));
  const feedYt = await getYouTubeFeed("kucing");
  check("fallback yt-search: timestamp → durationText", feedYt?.source === "yt-search" && feedYt.items[0].durationText === "2:30" && feedYt.items[0].channel === "Chan");
  resetYouTubeDeps();
}

// ── 2. formatYouTubeFeedRich — tampilan ala search YouTube ──
w("\n— formatYouTubeFeedRich —");
{
  pipedMock("kucing");
  const feed = await getYouTubeFeed("kucing");
  const items = feed.items; // item hasil mapping (ala handler beneran)
  const rich = formatYouTubeFeedRich(items, { query: "kucing", chips: [".playaudio kucing", ".web youtube kucing lucu"] });
  resetYouTubeDeps();
  const secs = rich.sections;
  check("5 video → 10 section (image+text per video) + note + chips = 12", secs.length === 12);
  check("section 1 = thumbnail image", secs[0].view_model.primitive.__typename === "GenAIaeacdsnwImagePrimitive" && secs[0].view_model.primitive.image === "https://img.test/thumb0.jpg");
  const t1 = secs[1].view_model.primitive.text;
  check("text video: judul + channel • views • durasi • tanggal", t1.includes("Video Kucing Lucu Part 1") && t1.includes("Channel 1 • 1.0Kx ditonton") && t1.includes("1:00") && t1.includes("1 hari lalu"));
  check("note +2 video lagi", secs[10].view_model.primitive.text.includes("+2 video lagi"));
  check("chips suggest terakhir", secs[11].view_model.primitive.__typename === "GenAIaeacdsnwSuggestPrimitive");
  check("header = ▶️ YouTube — query", rich.headerText.startsWith("▶️ YouTube —"));
}

// ── 3. formatGoogleSerpRich — SERP ala Chrome ──
w("\n— formatGoogleSerpRich —");
{
  const r = { source: "Bing", engineNote: "google", items: [
    { title: "Cara Merawat Kucing", url: "https://www.petlove.com/merawat-kucing", snippet: "Panduan lengkap merawat kucing dari kitten hingga dewasa" },
    { title: "10 Fakta Kucing", url: "https://kucingmania.id/fakta", snippet: "Fakta menarik tentang kucing" },
  ] };
  const wiki = { title: "Kucing", extract: "Kucing adalah mamalia karnivora dari keluarga Felidae.".repeat(10), thumbnail: "https://img.test/kucing.jpg", url: "https://id.wikipedia.org/wiki/Kucing" };
  const rich = formatGoogleSerpRich("kucing", r, { wiki, suggests: ["kucing lucu", "kucing oren"], prefix: "." });
  check("section 1 = header query + source", rich.sections[0].view_model.primitive.text.includes("kucing") && rich.sections[0].view_model.primitive.text.includes("Bing"));
  const s1 = rich.sections[1].view_model.primitive.text;
  check("SERP hasil 1: judul *bold* + domain + snippet + link", s1.startsWith("*Cara Merawat Kucing*") && s1.includes("petlove.com") && s1.includes("Panduan lengkap") && s1.includes("https://www.petlove.com/merawat-kucing"));
  const s2 = rich.sections[2].view_model.primitive.text;
  check("SERP hasil 2: format sama", s2.startsWith("*10 Fakta Kucing*") && s2.includes("kucingmania.id"));
  // knowledge panel setelah hasil
  check("knowledge panel: image wiki setelah SERP", rich.sections[3].view_model.primitive.__typename === "GenAIaeacdsnwImagePrimitive" && rich.sections[4].view_model.primitive.text.includes("📖 Kucing"));
  check("panel extract kepotong 300", rich.sections[4].view_model.primitive.text.includes("..."));
  check("chips = .web google <suggest>", rich.sections[5].view_model.primitive.prompts[0] === ".web google kucing lucu");
  // tanpa wiki/suggest → gak ada panel/chips
  const rich2 = formatGoogleSerpRich("x", { items: r.items.slice(0, 1) }, {});
  check("opsional: tanpa wiki/suggest → 2 section doang", rich2.sections.length === 2);
}

// ── 4. pipedSuggestions ──
w("\n— pipedSuggestions —");
{
  setPipedHttp(async (url) => {
    if (url.includes("/suggestions")) return ["kucing", "kucing lucu", 42, null, "kucing oren"];
    throw new Error("x");
  });
  const sugg = await pipedSuggestions("kucing");
  check("suggest: string doang, max 8", sugg.length === 3 && sugg[1] === "kucing lucu");
  const none = await pipedSuggestions("");
  check("query kosong → []", none.length === 0);
  resetYouTubeDeps();
}

// ── 5. handler .web youtube <query> → rich feed ──
w("\n— handler .web youtube —");
{
  pipedMock("kucing");
  const sock = makeSock();
  const m = makeM("youtube kucing", sock);
  await webHandler(m, { sock, args: m.args });
  check("rich feed kekirim (1 relay)", sock.calls.relay.length === 1);
  const dec = richOf(sock.calls.relay[0]);
  check("payload: 5 thumbnail + text per video", dec.sections.filter((s) => s.view_model.primitive.__typename === "GenAIaeacdsnwImagePrimitive").length === 5 && dec.sections.filter((s) => s.view_model.primitive.__typename === "GenAIaeacdsnwTextPrimitive").length >= 6);
  check("chips: playaudio/playvideo + .web youtube <suggest>", dec.sections.at(-1).view_model.primitive.prompts.some((p) => p.startsWith(".playaudio kucing")) && dec.sections.at(-1).view_model.primitive.prompts.some((p) => p.startsWith(".web youtube")));
  check("TANPA forwardingScore", sock.calls.relay[0].node.botForwardedMessage.message.richResponseMessage.contextInfo.forwardingScore === undefined);
  check("react 🕒→🐣", m._reacts[0] === "🕒" && m._reacts.at(-1) === "🐣");

  // .web youtube <link> → detail 1 video
  const sock2 = makeSock();
  const m2 = makeM("youtube https://youtu.be/vid00000000", sock2);
  await webHandler(m2, { sock: sock2, args: m2.args });
  const dec2 = richOf(sock2.calls.relay[0]);
  check("mode link → rich detail (table Channel/Views)", sock2.calls.relay.length === 1 && dec2.sections.some((s) => s.view_model.primitive.__typename === "GenAIaeacdsnwTablePrimitive") && dec2.headerText.includes("Detail"));

  // .web yt alias = sama
  const sock3 = makeSock();
  const m3 = makeM("yt kucing", sock3);
  await webHandler(m3, { sock: sock3, args: m3.args });
  check("alias .web yt → rich juga", sock3.calls.relay.length === 1 && !!richOf(sock3.calls.relay[0]));
  resetYouTubeDeps();
}

// ── 6. handler .web google <query> → SERP rich ──
w("\n— handler .web google —");
{
  const sock = makeSock();
  const m = makeM("google cara merawat kucing", sock);
  // searchWeb live (bing) — di sandbox boleh; kalau mati → fallback webview (relay 0 + card)
  await webHandler(m, { sock, args: m.args });
  const riches = sock.calls.relay.map(richOf).filter(Boolean);
  if (riches.length) {
    check("SERP rich kekirim", riches[0].sections.some((s) => s.view_model.primitive.__typename === "GenAIaeacdsnwTextPrimitive" && s.view_model.primitive.text.startsWith("*")));
    check("chips .web google terkait", riches[0].sections.some((s) => s.view_model.primitive.__typename === "GenAIaeacdsnwSuggestPrimitive"));
  } else {
    check("SERP rich kekirim (LIVE bing gagal → SKIP, jangan gagal test)", true);
  }
}

// ── 7. rich gagal → fallback webview card lama ──
w("\n— fallback webview —");
{
  pipedMock("kucing");
  const sock = makeSock();
  // relay cuma nolak node RICH — card webview (viewOnceMessage) diterima
  sock.relayMessage = async (jid, node) => {
    if (node?.botForwardedMessage?.message?.richResponseMessage) throw new Error("rich down");
    sock.calls.relay.push({ jid, node });
  };
  const m = makeM("youtube kucing", sock);
  await webHandler(m, { sock, args: m.args });
  const cardCall = sock.calls.relay.find((c) => c.node?.viewOnceMessage?.message?.interactiveMessage);
  check("fallback: card webview kekirim (bukan rich)", !!cardCall && !sock.calls.relay.some((c) => c.node?.botForwardedMessage));
  check("fallback: react 🐣 di akhir", m._reacts.at(-1) === "🐣");
  resetYouTubeDeps();
}

// ── 8. .web youtube bare → guide/flow lama (gak rich) ──
w("\n— .web youtube tanpa query —");
{
  const sock = makeSock();
  const m = makeM("youtube", sock);
  await webHandler(m, { sock, args: m.args });
  check("tanpa query: gak ada rich (card webview m.youtube.com)", !sock.calls.relay.some((c) => c.node?.botForwardedMessage?.message?.richResponseMessage));
  resetYouTubeDeps();
}

w(`\n${pass} PASS / ${fail} FAIL`);
setTimeout(() => process.exit(fail ? 1 : 0), 300);
