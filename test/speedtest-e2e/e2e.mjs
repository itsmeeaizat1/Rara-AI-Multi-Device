// E2E .speedtest (11 Sep 2026) — request owner "tmbah speedtes"
// Stub fetch Cloudflare (trace/down/up) — deterministik tanpa network.
// Jalankan dari cwd repo: node test/speedtest-e2e/e2e.mjs
import { config as stConfig, handler as stHandler } from "../../plugins/main/speedtest.js";

let pass = 0, fail = 0;
const w = (s) => process.stdout.write(s + "\n");
const check = (name, ok, extra) => { w((ok ? "  ✅" : "  ❌") + " " + name + (ok ? "" : extra ? ` — ${extra}` : "")); ok ? pass++ : fail++; };
const SC_MAP = { a: 'ᴀ', b: 'ʙ', c: 'ᴄ', d: 'ᴅ', e: 'ᴇ', f: 'ꜰ', g: 'ɢ', h: 'ʜ', i: 'ɪ', j: 'ᴊ', k: 'ᴋ', l: 'ʟ', m: 'ᴍ', n: 'ɴ', o: 'ᴏ', p: 'ᴘ', r: 'ʀ', s: 'ꜱ', t: 'ᴛ', u: 'ᴜ', v: 'ᴠ', w: 'ᴡ', y: 'ʏ', z: 'ᴢ' };
const toSC = (s) => String(s || "").replace(/[a-zA-Z]/g, c => SC_MAP[c.toLowerCase()] || c);

const mkStream = (chunks) => new ReadableStream({
  start(c) { for (const ch of chunks) c.enqueue(ch); c.close(); },
});

function stubFetch() {
  let downCount = 0;
  const realFetch = globalThis.fetch;
  globalThis.fetch = async (url, opts = {}) => {
    url = String(url);
    if (url.includes("/cdn-cgi/trace")) {
      return new Response("ip=1.2.3.4\ncolo=CGK\nloc=ID\n");
    }
    if (url.includes("/__down?bytes=0")) {
      return new Response(new ArrayBuffer(0));
    }
    if (url.includes("/__down")) {
      downCount++;
      return new Response(mkStream([
        new Uint8Array(1_000_000).fill(7),
        new Uint8Array(1_000_000).fill(7),
        new Uint8Array(500_000).fill(7),
      ]));
    }
    if (url.includes("/__up")) {
      return new Response("ok");
    }
    return realFetch(url, opts);
  };
  return () => { globalThis.fetch = realFetch; return downCount; };
}

function mkMocks() {
  const sent = [];
  const m = {
    text: ".speedtest", chat: "x@g.us", sender: "s@w", pushName: "S",
    react: async () => true,
    reply: async (t) => { sent.push({ type: "reply", text: String(t) }); },
  };
  const sock = {
    sendMessage: async (jid, content) => { sent.push({ type: content.edit ? "edit" : "send", text: String(content.text || "") }); return { key: { id: "k1" } }; },
    sendPresenceUpdate: async () => true,
  };
  return { m, sock, sent };
}

w("\n— 1. alur lengkap .speedtest (stub network) —");
{
  const restore = stubFetch();
  const { m, sock, sent } = mkMocks();
  const r = await stHandler(m, { sock });
  restore();
  check("handled true", r?.handled === true);
  check("stage 1 kirim (bukan edit)", sent[0]?.type === "send" && sent[0]?.text.includes(toSC("Menghubungkan")), sent[0]?.text.slice(0, 40));
  check("semua stage berikutnya EDIT pesan yang sama", sent.slice(1).every((s) => s.type === "edit"), sent.map((s) => s.type).join(","));
  const finalMsg = sent.filter((s) => s.text.includes(toSC("Hasil Tes"))).pop();
  check("ada box hasil final", !!finalMsg, "gak ada box ᴄᴘᴜ");
  if (finalMsg) {
    check("header 「 ✦ ꜱᴘᴇᴇᴅᴛᴇꜱᴛ ✦ 」", finalMsg.text.startsWith(`「 ✦ ${toSC("Speedtest")} ✦ 」`));
    check("ping ms terisi", /• ᴘɪɴɢ : [\d.]+ ms/.test(finalMsg.text), finalMsg.text.slice(0, 80));
    check("jitter ms terisi", /• ᴊɪᴛᴛᴇʀ : [\d.]+ ms/.test(finalMsg.text));
    check("download Mbps terisi", /• ᴅᴏᴡɴʟᴏᴀᴅ : [\d.]+ Mbps/.test(finalMsg.text));
    check("upload Mbps terisi", /• ᴜᴘʟᴏᴀᴅ : [\d.]+ Mbps/.test(finalMsg.text));
    check("IP publik dari trace (1.2.3.4)", finalMsg.text.includes("1.2.3.4"));
    check("section koneksi + status + kuota terpakai", finalMsg.text.includes(toSC("Koneksi")) && finalMsg.text.includes(toSC("Kuota Terpakai")) && /~[\d.]+ MB/.test(finalMsg.text));
  }
}

w("\n— 2. tanpa sock → fallback m.reply (gak crash) —");
{
  const restore = stubFetch();
  const replies = [];
  const m = { text: ".speedtest", chat: "x", sender: "s", pushName: "S", react: async () => true, reply: async (t) => { replies.push(String(t)); } };
  const r = await stHandler(m, {});
  restore();
  check("handled true + reply fallback terisi", r?.handled === true && replies.length > 0 && replies[replies.length - 1].includes(toSC("Hasil Tes")), `n=${replies.length}`);
}

w("\n— 3. network mati total → novaError —");
{
  const realFetch = globalThis.fetch;
  globalThis.fetch = async () => { throw new Error("network down"); };
  const replies = [];
  const m = { text: ".speedtest", chat: "x", sender: "s", pushName: "S", react: async () => true, reply: async (t) => { replies.push(String(t)); } };
  await stHandler(m, {});
  globalThis.fetch = realFetch;
  const err = replies[replies.length - 1] || "";
  check("novaError ❌ box", err.includes("❌") && err.includes(toSC("SPEEDTEST")), err.slice(0, 60));
}

w("\n— 4. pluginConfig —");
check("name speedtest + alias speedtes & speed", stConfig.name === "speedtest" && stConfig.alias.includes("speedtes") && stConfig.alias.includes("speed"));
check("cooldown lama (hemat bandwidth)", stConfig.cooldown >= 30, String(stConfig.cooldown));

w(`\n${pass} PASS / ${fail} FAIL`);
process.exit(fail ? 1 : 0);
