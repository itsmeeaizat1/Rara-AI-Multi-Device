// E2E rich response .search ala Meta AI (request owner 10 Sep 2026)
// Verifikasi: struktur payload richResponseMessage (base64 unifiedResponse,
// primitives GenAI text/image/suggest, TANPA forwardingScore), jalur handler
// .search (rich primary → fallback kalau relay gagal), wiki + suggest via seam.
// Jalankan dari cwd DIR KOSONG: mkdir -p /tmp/richsearch-e2e && cd /tmp/richsearch-e2e &&
// node <repo>/test/richsearch-e2e/e2e.mjs
import {
  buildRichResponse, sendRichMessage, getWikiSummary, getGoogleSuggest,
  setRichHttp, resetRichHttp,
} from "../../src/lib/nova-rich-response.js";
import {
  searchWeb, fetchPagePreview, saveSearchSession, getSearchSession,
  setWebSearchHttp, setPreviewHttp, resetWebSearchDeps,
} from "../../src/lib/nova-websearch.js";
import { config as searchConfig, handler } from "../../plugins/browser/search.js";
import { smallcapsText as toSC } from "../../src/lib/styler.js";

let pass = 0, fail = 0;
const w = (s) => process.stdout.write(s + "\n");
const check = (name, ok) => { w((ok ? "  ✅" : "  ❌") + " " + name); ok ? pass++ : fail++; };

// ── mock sock: relayMessage + sendMessage + sendButton recorder ──
function makeMockSock({ relayFails = false } = {}) {
  const calls = { relay: [], send: [], button: [] };
  return {
    calls,
    relayMessage: async (jid, node, opts) => {
      if (relayFails) throw new Error("relay down");
      calls.relay.push({ jid, node, opts });
    },
    sendMessage: async (jid, msg, opts) => { calls.send.push({ jid, msg, opts }); return { key: { id: "m" + calls.send.length } }; },
    sendButton: async (jid, _t, text, m, buttons) => { calls.button.push({ jid, text, buttons }); return true; },
  };
}

// ── mock m ──
function makeM(text, sock) {
  const replies = [];
  const reacts = [];
  const args = String(text).split(" ").filter(Boolean); // args TANPA nama command (ala bot asli)
  return {
    args, chat: "62812@g.us", prefix: ".", isGroup: false,
    reply: async (t) => { replies.push(t); return true; },
    react: async (e) => { reacts.push(e); return true; },
    _replies: replies, _reacts: reacts, _sock: sock,
  };
}

// ── 1. buildRichResponse ──
w("\n— buildRichResponse —");
{
  const rich = buildRichResponse(
    [
      { type: "image", url: "https://img.test/x.jpg" },
      { type: "text", content: "halo" },
      { type: "suggest", prompts: [".search a", ".search b"] },
      { type: "table", rows: [["a", "b"]] },
      { type: "bogus" },
      null,
    ],
    "🔎 tes", "footer"
  );
  check("response_id uuid ada", /^[0-9a-f-]{36}$/.test(rich.response_id));
  check("4 sections valid (bogus+null difilter)", rich.sections.length === 4);
  check("section 1 image primitive", rich.sections[0].view_model.primitive.__typename === "GenAIaeacdsnwImagePrimitive" && rich.sections[0].view_model.primitive.image === "https://img.test/x.jpg");
  check("section 1 layout single", rich.sections[0].view_model.__typename === "GenAISingleLayoutViewModel");
  check("section 2 text primitive", rich.sections[1].view_model.primitive.__typename === "GenAIaeacdsnwTextPrimitive" && rich.sections[1].view_model.primitive.text === "halo");
  check("section 3 suggest + action row layout", rich.sections[2].view_model.primitive.__typename === "GenAIaeacdsnwSuggestPrimitive" && rich.sections[2].view_model.__typename === "GenAIActionRowLayoutViewModel" && rich.sections[2].view_model.primitive.prompts.length === 2);
  check("section 4 table primitive", rich.sections[3].view_model.primitive.__typename === "GenAIaeacdsnwTablePrimitive");
  check("headerText/footerText", rich.headerText === "🔎 tes" && rich.footerText === "footer");
}

// ── 2. sendRichMessage payload ──
w("\n— sendRichMessage payload —");
{
  const sock = makeMockSock();
  const rich = buildRichResponse([{ type: "text", content: "isi" }], "🔎 query", "");
  const ok = await sendRichMessage(sock, "jid@g.us", rich);
  check("relay kekirim → true", ok === true && sock.calls.relay.length === 1);
  const { jid, node, opts } = sock.calls.relay[0];
  check("relay ke jid bener", jid === "jid@g.us");
  check("opts.messageId = response_id", opts.messageId === rich.response_id);
  check("messageContextInfo.botMetadata.botResponseId", node.messageContextInfo.botMetadata.botResponseId === rich.response_id);
  const richMsg = node.botForwardedMessage.message.richResponseMessage;
  check("richResponseMessage.messageType 1", richMsg.messageType === 1);
  check("submessages header text", richMsg.submessages[0].messageText === "🔎 query" && richMsg.submessages[0].messageType === 2);
  // base64 decode → valid JSON + sections
  const decoded = JSON.parse(Buffer.from(richMsg.unifiedResponse.data, "base64").toString("utf-8"));
  check("unifiedResponse base64 → JSON valid", decoded.response_id === rich.response_id && decoded.sections[0].view_model.primitive.text === "isi");
  const ctx = richMsg.contextInfo;
  check("contextInfo botJid Meta AI + forwardOrigin 4", ctx.forwardedAiBotMessageInfo.botJid === "867051314767696@bot" && ctx.forwardOrigin === 4);
  check("TANPA forwardingScore/isForwarded (bebas label Diteruskan)", ctx.forwardingScore === undefined && ctx.isForwarded === undefined);
  // relay throw → false (fallback path)
  const bad = makeMockSock({ relayFails: true });
  check("relay gagal → false (fallback)", (await sendRichMessage(bad, "x@g.us", rich)) === false);
}

// ── 3. wiki + suggest via seam ──
w("\n— wiki & google suggest (seam) —");
{
  setRichHttp(async (url) => {
    if (url.includes("wikipedia")) {
      return { title: "Nasi goreng", extract: "Nasi goreng adalah makanan...", thumbnail: { source: "https://img.test/nasi.jpg" }, content_urls: { desktop: { page: "https://id.wikipedia.org/wiki/Nasi_goreng" } } };
    }
    if (url.includes("suggestqueries")) {
      return ["nasi goreng", ["resep nasi goreng", "nasi goreng spesial", "nasi goreng gila", "nasi goreng seafood"]];
    }
    throw new Error("unhandled " + url);
  });
  const wiki = await getWikiSummary("nasi goreng");
  check("wiki: title + extract + thumbnail + url", wiki?.title === "Nasi goreng" && wiki.thumbnail === "https://img.test/nasi.jpg" && wiki.url.includes("Nasi_goreng"));
  const sug = await getGoogleSuggest("nasi goreng", 4);
  check("suggest: 4 saran", sug.length === 4 && sug[0] === "resep nasi goreng");
  resetRichHttp();
  const wiki404 = await getWikiSummary("zzz gak ada");
  check("wiki gak ketemu → null (gak throw)", wiki404 === null);
}

// ── 4. handler .search → RICH primary ──
w("\n— handler: rich primary —");
{
  // seam search engine → hasil fixture
  setWebSearchHttp(async () => `<html><body>
    <li class="b_algo"><h2><a href="https://hp.test/1">HP Terkenal 2026</a></h2><div class="b_caption"><p>daftar hp terkenal lengkap</p></div></li>
    <li class="b_algo"><h2><a href="https://hp.test/2">Review HP Terbaik</a></h2><div class="b_caption"><p>review hp terbaru</p></div></li>
    </body></html>`);
  setRichHttp(async (url) => {
    if (url.includes("wikipedia")) throw new Error("404");
    if (url.includes("suggestqueries")) return ["daftar hp terkenal", ["hp terkenal 2026", "hp terkenal murah"]];
    throw new Error("unhandled " + url);
  });
  const sock = makeMockSock();
  const m = makeM("bing daftar hp terkenal", sock);
  await handler(m, { sock });
  check("rich dikirim (1 relay)", sock.calls.relay.length === 1);
  const node = sock.calls.relay[0].node;
  const decoded = JSON.parse(Buffer.from(node.botForwardedMessage.message.richResponseMessage.unifiedResponse.data, "base64").toString("utf-8"));
  check("header = query", decoded.headerText.includes("daftar hp terkenal"));
  const texts = decoded.sections.filter((s) => s.view_model.primitive.__typename === "GenAIaeacdsnwTextPrimitive").map((s) => s.view_model.primitive.text);
  check("teks hasil: 2 judul masuk", texts.some((t) => t.includes("HP Terkenal 2026")) && texts.some((t) => t.includes("Review HP Terbaik")));
  check("teks petunjuk .search <nomor>", texts.some((t) => t.includes(".search <nomor>")));
  const sugg = decoded.sections.find((s) => s.view_model.primitive.__typename === "GenAIaeacdsnwSuggestPrimitive");
  check("suggest chips = .search <terkait>", sugg?.view_model.primitive.prompts[0] === ".search hp terkenal 2026");
  check("wiki gak ada → gak ada image section", !decoded.sections.some((s) => s.view_model.primitive.__typename === "GenAIaeacdsnwImagePrimitive"));
  check("react 🐣", m._reacts.includes("🐣"));
  check("session hasil nyimpen", getSearchSession(m.chat)?.items?.length === 2);
  check("fallback popup gak kekirim", sock.calls.button.length === 0);

  // ── 5. handler relay gagal → fallback list + popup ──
  w("\n— handler: fallback list lama —");
  const sock2 = makeMockSock({ relayFails: true });
  const m2 = makeM("bing daftar hp terkenal", sock2);
  await handler(m2, { sock: sock2 });
  check("relay gagal → popup list fallback kekirim", sock2.calls.button.length === 1);
  check("fallback text ada hasil 1..N", sock2.calls.button[0].text.includes(toSC("HP Terkenal 2026").slice(0, 8)) || sock2.calls.button[0].text.includes("hp.test"));

  // ── 6. handler .search <nomor> → rich preview ──
  w("\n— handler: preview rich —");
  setPreviewHttp(async () => `<html><head>
    <title>HP Terkenal 2026 — Daftar Lengkap</title>
    <meta property="og:image" content="https://img.test/hp-banner.jpg">
    <meta property="og:description" content="daftar hp terkenal tahun 2026">
    </head><body><p>Isi halaman tentang daftar hp terkenal tahun 2026 dari berbagai merek.</p></body></html>`);
  const sock3 = makeMockSock();
  const m3 = makeM("2", sock3);
  await handler(m3, { sock: sock3 });
  check("preview: rich dikirim (1 relay)", sock3.calls.relay.length === 1);
  const dec3 = JSON.parse(Buffer.from(sock3.calls.relay[0].node.botForwardedMessage.message.richResponseMessage.unifiedResponse.data, "base64").toString("utf-8"));
  check("preview: image og halaman", dec3.sections[0].view_model.primitive.__typename === "GenAIaeacdsnwImagePrimitive" && dec3.sections[0].view_model.primitive.image === "https://img.test/hp-banner.jpg");
  const t3 = dec3.sections.filter((s) => s.view_model.primitive.__typename === "GenAIaeacdsnwTextPrimitive").map((s) => s.view_model.primitive.text);
  check("preview: judul + link + isi halaman", t3.some((t) => t.includes("HP Terkenal 2026 — Daftar Lengkap")) && t3.some((t) => t.includes("https://hp.test/2")) && t3.some((t) => t.includes("Isi halaman tentang daftar hp")));
  check("preview: header = hasil #N", dec3.headerText.includes("Hasil #2"));

  // ── 7. preview relay gagal → fallback teks lama + banner ──
  w("\n— handler: preview fallback —");
  const sock4 = makeMockSock({ relayFails: true });
  const m4 = makeM("1", sock4);
  await handler(m4, { sock: sock4 });
  check("preview fallback: sendMessage teks lama", sock4.calls.send.length === 1 && !!sock4.calls.send[0].msg.text);
  check("preview fallback: ada READMORE + banner card", sock4.calls.send[0].msg.text.includes("ISI HALAMAN:") && !!sock4.calls.send[0].msg.contextInfo.externalAdReply);

  resetWebSearchDeps();
  resetRichHttp();
}

w(`\n${pass} PASS / ${fail} FAIL`);
setTimeout(() => process.exit(fail ? 1 : 0), 300);
