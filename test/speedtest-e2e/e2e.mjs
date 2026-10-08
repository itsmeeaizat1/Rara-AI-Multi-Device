// E2E .speedtest (11 Sep 2026) — request owner "tmbah speedtes"
// Stub fetch Cloudflare (trace/down/up) — deterministik tanpa network.
// Jalankan dari cwd repo: node test/speedtest-e2e/e2e.mjs
import { config as stConfig, handler as stHandler } from "../../plugins/main/speedtest.js";

let pass = 0, fail = 0;
const w = (s) => process.stdout.write(s + "\n");
const check = (name, ok, extra) => { w((ok ? "  ✅" : "  ❌") + " " + name + (ok ? "" : extra ? ` — ${extra}` : "")); ok ? pass++ : fail++; };
const SC_MAP = { a: 'a', b: 'b', c: 'c', d: 'd', e: 'e', f: 'f', g: 'g', h: 'h', i: 'i', j: 'j', k: 'k', l: 'l', m: 'm', n: 'n', o: 'o', p: 'p', r: 'r', s: 's', t: 't', u: 'u', v: 'v', w: 'w', y: 'y', z: 'z' };
// UPDATE 1 Okt: teks bot kini plain — toSC lokal jadi passthrough
const toSC = (s) => String(s ?? "");

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
  check("ada box hasil final", !!finalMsg, "gak ada box cpu");
  if (finalMsg) {
    check("header 『 *Speedtest* 』", finalMsg.text.startsWith(`『 *${toSC("Speedtest")}* 』`));
    check("ping ms terisi", /• ping : [\d.]+ ms/i.test(finalMsg.text), finalMsg.text.slice(0, 80));
    check("jitter ms terisi", /• jitter : [\d.]+ ms/i.test(finalMsg.text));
    check("download Mbps terisi", /• download : [\d.]+ Mbps/i.test(finalMsg.text));
    check("upload Mbps terisi", /• upload : [\d.]+ Mbps/i.test(finalMsg.text));
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

w("\n— 3. network mati total → raraError —");
{
  const realFetch = globalThis.fetch;
  globalThis.fetch = async () => { throw new Error("network down"); };
  const replies = [];
  const m = { text: ".speedtest", chat: "x", sender: "s", pushName: "S", react: async () => true, reply: async (t) => { replies.push(String(t)); } };
  await stHandler(m, {});
  globalThis.fetch = realFetch;
  const err = replies[replies.length - 1] || "";
  // 3 Okt: raraError balik desain lama — 『 *Speedtest* 』 + ❌
  check("raraError desain lama", err.startsWith(`『 *Speedtest* 』`) && err.includes("❌"), err.slice(0, 60));
}

w("\n— 4. pluginConfig —");
check("name speedtest + alias speedtes & speed", stConfig.name === "speedtest" && stConfig.alias.includes("speedtes") && stConfig.alias.includes("speed"));
check("cooldown lama (hemat bandwidth)", stConfig.cooldown >= 30, String(stConfig.cooldown));

w("\n— 5. hasil tes TERSIMPAN + baris Info Server —");
{
  const lib = await import("../../src/lib/rara-speedtest.js");

  // db mock: setting(key) get / setting(key, value) set
  const mkDb = () => {
    const store = {};
    return {
      setting: (k, v) => { if (v !== undefined) { store[k] = v; return store[k]; } return store[k]; },
      _store: store,
    };
  };

  const restore = stubFetch();
  const db = mkDb();
  const r1 = await lib.initServerSpeedtest(null, db, { bootDelayMs: 0 });
  check("init pertama → jalan & saved", r1?.saved === true && !!r1.result?.down, JSON.stringify(r1).slice(0, 60));
  const saved = lib.getSavedSpeedtest(db);
  check("hasil tersimpan di setting serverSpeedtest", !!saved && saved.down > 0 && saved.up > 0 && saved.ping > 0);
  const r2 = await lib.initServerSpeedtest(null, db, { bootDelayMs: 0 });
  check("connect lagi → SKIP (cuma sekali)", r2?.skipped === true || (r2.saved === undefined && !r2.result), JSON.stringify(r2));

  const rows = lib.speedtestInfoRows(db);
  check("speedtestInfoRows → Download/Upload", rows.length === 2 && rows[0].label === "Download" && /Mbps/.test(rows[0].value) && rows[1].label === "Upload", JSON.stringify(rows));
  check("db kosong → rows []", lib.speedtestInfoRows(mkDb()).length === 0);
  check("db null → rows [] (gak crash)", lib.speedtestInfoRows(null).length === 0);
  restore();
}

w("\n— 6. plugin .speedtest simpan hasil tiap run —");
{
  const restore = stubFetch();
  const store = {};
  const db = { setting: (k, v) => { if (v !== undefined) { store[k] = v; return store[k]; } return store[k]; } };
  const { m, sock, sent } = mkMocks();
  await stHandler(m, { sock, db });
  restore();
  check("handler simpan serverSpeedtest ke db", !!store.serverSpeedtest && store.serverSpeedtest.down > 0, JSON.stringify(store.serverSpeedtest || {}).slice(0, 60));
}

w("\n— 7. serverNetworkRows: IP publik/lokal, port, DNS —");
{
  const { serverNetworkRows } = await import("../../src/lib/rara-info-section.js");
  const store = {};
  const db = { setting: (k, v) => { if (v !== undefined) { store[k] = v; return store[k]; } return store[k]; } };

  const empty = serverNetworkRows(db);
  check("db kosong → tetap ada IP Lokal + Port (gak ada IP Publik)", empty.some(r => r.label === "IP Lokal" && /^\d+\.\d+\.\d+\.\d+$|^-$/.test(r.value)) && empty.some(r => r.label === "Port"), JSON.stringify(empty));

  db.setting("serverSpeedtest", { ip: "103.22.131.9", down: 87.4, up: 23.1, ping: 23, jitter: 1 });
  const rows = serverNetworkRows(db);
  const publik = rows.find(r => r.label === "IP Publik");
  const lokal = rows.find(r => r.label === "IP Lokal");
  const port = rows.find(r => r.label === "Port");
  const dns1 = rows.find(r => r.label === "DNS 1");
  check("IP Publik dari hasil speedtest tersimpan", publik && publik.value === "103.22.131.9", JSON.stringify(publik));
  check("IP Lokal IPv4 atau -", lokal && /^\d+\.\d+\.\d+\.\d+$|^-$/.test(lokal.value));
  check("Port (NOVA_WEB_PORT default 8080)", port && port.value === String(process.env.NOVA_WEB_PORT || "8080"));
  check("DNS 1 ada kalau resolv.conf punya nameserver (IPv4/IPv6)", !dns1 || /^[0-9a-fA-F.:%]+$/.test(dns1.value), JSON.stringify(dns1));
  check("max 1 baris DNS 2", rows.filter(r => r.label === "DNS 2").length <= 1);
  check("db null gak crash", Array.isArray(serverNetworkRows(null)));
}

w(`\n${pass} PASS / ${fail} FAIL`);
process.exit(fail ? 1 : 0);
