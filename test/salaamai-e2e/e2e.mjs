// E2E .salaamai — mock transport via setSalaamHttp (gak kena live server)
import {
  askSalaam, setSalaamHttp, resetSalaamHttp, resetSalaamSession,
  resolveSalaamAssistant, cleanSalaamReply, SALAAM_ASSISTANTS,
} from "../../src/lib/rara-salaamai.js";
import { toSC } from "../../src/lib/styler.js";

let pass = 0, fail = 0;
const w = (s) => process.stdout.write(s + "\n");
const check = (name, ok) => { w((ok ? "  ✅" : "  ❌") + " " + name); ok ? pass++ : fail++; };

// ── transport mock ──
let calls = [];
let behavior = {};
const mockHttp = async (url, headers, body) => {
  calls.push({ url, headers, body });
  const act = behavior[url] || (() => ({ status: 200, ok: true, json: { success: true, reply: "ok" } }));
  return act(body, headers);
};

// ── 1. lib: resolve asisten ──
check("resolve: junaid default", resolveSalaamAssistant("junaid")?.contextId === 1439);
check("resolve: unknown → null", resolveSalaamAssistant("gakada") === null);
check("resolve: no-arg → junaid", resolveSalaamAssistant()?.id === "junaid");
check("registry: 5 asisten", SALAAM_ASSISTANTS.length === 5);

// ── 2. lib: cleanReply ──
check("clean: strip tag + entity",
  cleanSalaamReply("<p>Wudhu itu&nbsp;suci &amp; bersih</p>") === "Wudhu itu suci & bersih");
check("clean: br → newline", cleanSalaamReply("baris1<br/>baris2").includes("\n"));

// ── 3. lib: askSalaam sukses (start_session + submit) ──
setSalaamHttp(mockHttp);
resetSalaamSession();
calls = [];
behavior = {
  "https://ai.salaam.world/wp-json/mwai/v1/start_session": () =>
    ({ status: 200, ok: true, json: { success: true, sessionId: "sess123", restNonce: "nonce99" } }),
  "https://ai.salaam.world/wp-json/mwai-ui/v1/chats/submit": (body, headers) =>
    ({ status: 200, ok: true, json: { success: true, reply: "Wudhu adalah bersuci dengan air." } }),
};
const r1 = await askSalaam({ question: "apa itu wudhu?" });
check("ask: reply dapet", r1.reply === "Wudhu adalah bersuci dengan air.");
check("ask: assistant junaid", r1.assistant.id === "junaid");
const startCall = calls.find((c) => c.url.includes("start_session"));
const submitCall = calls.find((c) => c.url.includes("chats/submit"));
check("ask: start_session kepanggil", !!startCall);
check("ask: newMessage kekirim", submitCall?.body?.newMessage === "apa itu wudhu?");
check("ask: contextId junaid 1439", submitCall?.body?.contextId === 1439);
check("ask: session id dipakai", submitCall?.body?.session === "sess123");
check("ask: nonce di header", submitCall?.headers?.["x-wp-nonce"] === "nonce99");
check("ask: messages ada user baru", Array.isArray(submitCall?.body?.messages) &&
  submitCall.body.messages.at(-1)?.role === "user");

// ── 4. lib: session cache — ask kedua gak start_session lagi ──
calls = [];
const r2 = await askSalaam({ question: "hukum wudhu?" });
check("cache: gak start_session ulang", !calls.some((c) => c.url.includes("start_session")));
check("cache: tetep dapet reply", r2.reply.includes("Wudhu"));

// ── 5. lib: routing asisten bilkees (contextId 1510 + referer sister) ──
calls = [];
const r3 = await askSalaam({ question: "doa sebelum makan", assistantId: "bilkees" });
const s3 = calls.find((c) => c.url.includes("chats/submit"));
check("routing: bilkees contextId 1510", s3?.body?.contextId === 1510);
check("routing: referer sister", s3?.headers?.referer?.includes("sister-bilkees"));
check("routing: assistant name", r3.assistant.name === "Sister Bilkees");

// ── 6. lib: history multi-turn kekirim ──
calls = [];
await askSalaam({ question: "lanjut", assistantId: "junaid",
  history: [{ role: "user", content: "apa itu wudhu?" }, { role: "assistant", content: "bersuci" }] });
const s6 = calls.find((c) => c.url.includes("chats/submit"));
check("history: 3 messages (2 history + 1 baru)", s6?.body?.messages?.length === 3);
check("history: role assistant kekirim", s6.body.messages[1]?.role === "assistant");

// ── 7. lib: nonce kadaluarsa (401 rest_forbidden) → auto refresh + retry ──
resetSalaamSession();
calls = [];
let submitHits = 0;
let startHits = 0;
behavior = {
  "https://ai.salaam.world/wp-json/mwai/v1/start_session": () => {
    startHits++;
    // start pertama = nonce kadaluarsa, refresh (force) = nonce segar
    return startHits === 1
      ? { status: 200, ok: true, json: { sessionId: "sess-refresh", restNonce: "nonce-old" } }
      : { status: 200, ok: true, json: { sessionId: "sess-refresh", restNonce: "nonce-fresh" } };
  },
  "https://ai.salaam.world/wp-json/mwai-ui/v1/chats/submit": (body, headers) => {
    submitHits++;
    if (headers["x-wp-nonce"] === "nonce-fresh") {
      return { status: 200, ok: true, json: { success: true, reply: "segar!" } };
    }
    return { status: 401, ok: false, json: { code: "rest_forbidden", message: "Sorry, you are not allowed to do that." } };
  },
};
const r7 = await askSalaam({ question: "tes refresh" });
check("refresh: reply sukses setelah retry", r7.reply === "segar!");
check("refresh: submit 2x (gagal + retry)", submitHits === 2);
check("refresh: start_session 2x (awal + force)", calls.filter((c) => c.url.includes("start_session")).length === 2);

// ── 8. lib: 500 → pesan server bermasalah ──
behavior = {
  "https://ai.salaam.world/wp-json/mwai/v1/start_session": () =>
    ({ status: 200, ok: true, json: { sessionId: "s", restNonce: "n" } }),
  "https://ai.salaam.world/wp-json/mwai-ui/v1/chats/submit": () =>
    ({ status: 500, ok: false, json: { success: false, message: "Oops! Something went wrong on the server." } }),
};
let err8 = null;
try { await askSalaam({ question: "tes" }); } catch (e) { err8 = e.message; }
check("500: error server bermasalah", /server salaam bermasalah/i.test(err8 || ""));

// ── 9. lib: 403 rejected (bukan nonce) ──
behavior = {
  "https://ai.salaam.world/wp-json/mwai/v1/start_session": () =>
    ({ status: 200, ok: true, json: { sessionId: "s", restNonce: "n" } }),
  "https://ai.salaam.world/wp-json/mwai-ui/v1/chats/submit": () =>
    ({ status: 403, ok: false, json: { success: false, message: "Sorry, your query has been rejected." } }),
};
let err9 = null;
try { await askSalaam({ question: "tes" }); } catch (e) { err9 = e.message; }
check("403: error query ditolak", /query ditolak/i.test(err9 || ""));

// ── 10. lib: maxLen ──
let err10 = null;
try { await askSalaam({ question: "a".repeat(600), assistantId: "musa" }); } catch (e) { err10 = e.message; }
check("maxLen: tolak > 20 (musa)", /maks 20 karakter/i.test(err10 || ""));
let err10b = null;
try { await askSalaam({ question: "" }); } catch (e) { err10b = e.message; }
check("maxLen: pertanyaan kosong ditolak", /kosong/i.test(err10b || ""));

// ── 11. lib: asisten gak dikenal ──
let err11 = null;
try { await askSalaam({ question: "tes", assistantId: "gakada" }); } catch (e) { err11 = e.message; }
check("unknown assistant: ditolak", /asisten gak dikenal/i.test(err11 || ""));

// ── 12. plugin handler ──
resetSalaamHttp();
const { config, handler } = await import("../../plugins/ai/salaamai.js");
const replies = [];
let reactions = [];
function mockM(text, extra = {}) {
  const args = String(text).split(/\s+/).filter(Boolean);
  return {
    args, text: String(text), prefix: ".", command: "salaamai",
    pushName: "Tester", chat: "62899@c.us", sender: "62899", ...extra,
    reply: async (t) => { replies.push(String(t)); },
    react: async (r) => { reactions.push(r); },
  };
}

// help
replies.length = 0;
await handler(mockM(""), {});
check("plugin: no-arg → help", replies.length === 1 && /ꜱᴀʟᴀᴀᴍ|salaam/i.test(replies[0]));

// list
replies.length = 0;
await handler(mockM("list"), {});
check("plugin: list 5 asisten", replies[0].includes(toSC("Brother Junaid")) && replies[0].includes(toSC("Sister Zahra")));

// ask sukses (mock via lib seam)
setSalaamHttp(mockHttp);
resetSalaamSession();
behavior = {
  "https://ai.salaam.world/wp-json/mwai/v1/start_session": () =>
    ({ status: 200, ok: true, json: { sessionId: "s", restNonce: "n" } }),
  "https://ai.salaam.world/wp-json/mwai-ui/v1/chats/submit": () =>
    ({ status: 200, ok: true, json: { success: true, reply: "Wudhu adalah cara bersuci di Islam." } }),
};
replies.length = 0; reactions = [];
await handler(mockM("apa itu wudhu?"), {});
check("plugin: ask → reply berisi jawaban", replies.length === 1 && replies[0].includes(toSC("Wudhu adalah cara bersuci")));
check("plugin: react 🕒 lalu 🐣", reactions.includes("🕒") && reactions.includes("🐣"));
check("plugin: footer ai.salaam.world", replies[0].includes(toSC("ai.salaam.world")));

// ask + asisten di token pertama
replies.length = 0; calls = [];
await handler(mockM("bilkees doa sebelum makan"), {});
const s12 = calls.find((c) => c.url.includes("chats/submit"));
check("plugin: token asisten ke-strip + contextId 1510",
  s12?.body?.newMessage === "doa sebelum makan" && s12?.body?.contextId === 1510);

// multi-turn: history nambah
calls = [];
await handler(mockM("lanjut yang tadi"), {});
const s13 = calls.find((c) => c.url.includes("chats/submit"));
check("plugin: multi-turn history kekirim", (s13?.body?.messages?.length || 0) >= 3);

// reset
replies.length = 0;
await handler(mockM("reset"), {});
check("plugin: reset memori", replies.length === 1 && /ɴᴇᴍᴏʀʏ|hapus/i.test(replies[0]) || replies[0].includes(toSC("dihapus")));
calls = [];
await handler(mockM("topik baru"), {});
const s14 = calls.find((c) => c.url.includes("chats/submit"));
check("plugin: habis reset history kosong", s14?.body?.messages?.length === 1);

// error server down → fallback note
behavior = {
  "https://ai.salaam.world/wp-json/mwai/v1/start_session": () =>
    ({ status: 200, ok: true, json: { sessionId: "s", restNonce: "n" } }),
  "https://ai.salaam.world/wp-json/mwai-ui/v1/chats/submit": () =>
    ({ status: 500, ok: false, json: { success: false, message: "Oops! Something went wrong on the server." } }),
};
replies.length = 0; reactions = [];
await handler(mockM("tes down"), {});
check("plugin: server down → reply fallback", replies.length === 1 && reactions.includes("❌"));
check("plugin: fallback kasih opsi .ai", /ᴀɪ|ai|raraai/i.test(replies[0]));

// pertanyaan kosong setelah strip asisten
replies.length = 0;
await handler(mockM("bilkees"), {});
check("plugin: asisten doang → info asisten", replies.length === 1 && replies[0].includes(toSC("Sister Bilkees")) && replies[0].includes(toSC("doa (dua) harian & moment")));

w(`\n${pass} PASS / ${fail} FAIL`);
process.exit(fail ? 1 : 0);
