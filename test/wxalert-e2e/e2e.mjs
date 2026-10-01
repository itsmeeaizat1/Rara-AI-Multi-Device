// E2E — WXALERT / EWS v2 (24 Sep 2026)
// .wxalert: query manual NWS/NHC + langganan auto-push EWS v2.
// Owner: "aku mau tambah sebagai fitur cuaca otomatis dan ews v2 … upgrade
// kodenya jgn kyk v1 biar beneran hidup fitur berfungsi notifikasinya".
import { mkdtempSync } from "fs";
import { tmpdir } from "os";
import path from "path";
import { fileURLToPath } from "url";
const R = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
process.chdir(R);

let pass = 0, fail = 0;
const w = (s) => process.stdout.write(s + "\n");
const check = (name, ok, extra) => { w((ok ? "  ✅" : "  ❌") + " " + name + (ok || !extra ? "" : " — " + extra)); ok ? pass++ : fail++; };

const dbDir = mkdtempSync(path.join(tmpdir(), "wxalert-"));
const { initDatabase, getDatabase } = await import(R + "/src/lib/rara-database.js");
await initDatabase(path.join(dbDir, "db"));
const db = getDatabase();
const { toSC } = await import(R + "/src/lib/rara-menu-style.js");

const plug = await import(R + "/plugins/cuaca/wxalert.js");
const handler = plug.handler;

// raraWrap output kecil-semua (smallcaps) — bandingkan pakai toSC biar gak gotcha
const has = (s, x) => {
  const l = String(s).toLowerCase();
  const e = String(x).toLowerCase();
  return l.includes(e) || l.includes(toSC(e));
};

// helpers
const mkM = (over = {}) => ({
  key: { remoteJid: over.jid || "chat-1" },
  args: [], prefix: ".", command: "wxalert", pushName: "tes",
  reply: async (t) => { (mkM._replies[mkM._cur] ||= []).push(String(t)); return {}; },
  ...over,
  args: over.args || [],
});
mkM._replies = { "chat-1": [], "chat-2": [] };
mkM._cur = "chat-1";
const lastReply = (chat) => (mkM._replies[chat || mkM._cur] || []).at(-1) || "";

function mockSock() {
  const sends = [];
  return {
    sends,
    sendMessage: async (chat, payload) => { sends.push({ chat, payload }); return { key: { id: "m" + sends.length } }; },
  };
}

const NWS_ALERT = (id, sev, event, area) => ({
  id,
  properties: { event, severity: sev, areaDesc: area, headline: event + " issued by NWS", ends: "2026-09-24T22:00:00-04:00" },
});
const NWS_OK = (feats) => ({ status: 200, data: { features: feats } });
const STORM = (id, name, cls) => ({
  id, name, classification: cls, intensity: "45", pressure: "995",
  latitude: "25.1N", longitude: "50.2W", movementDir: 270, movementSpeed: 8,
  lastUpdate: "2026-09-23T21:00:00.000Z", publicAdvisory: { url: "https://nhc.example" },
});

// ══════════════════════════════════════════════════════════════
w("\n— 1. config + manual query —");
{
  check("1. config (name/alias/category cuaca)", plug.pluginConfig?.name === "wxalert" && (plug.pluginConfig?.alias || []).includes("ewsv2") && plug.pluginConfig?.category === "cuaca");
  plug._setHttpForTest(async (url) => {
    if (url.includes("CurrentStorms")) return { status: 200, data: { activeStorms: [STORM("al062026", "Fay", "TD")] } };
    return NWS_OK([
      NWS_ALERT("nws-1", "Extreme", "Tornado Warning", "Dallam, TX"),
      NWS_ALERT("nws-2", "Severe", "Flash Flood Warning", "Harlan, KY"),
      NWS_ALERT("nws-3", "Minor", "Flood Advisory", "Logan, OH"),
    ]);
  });
  await handler(mkM({ args: [] }), { sock: mockSock(), db });
  check("1a. ringkasan nasional (total + per-severity + top serius)", has(lastReply(), "total alert aktif: 3") && has(lastReply(), "tornado warning"), lastReply().slice(0, 90));
  check("1b. alert top dirender dgn area + s/d", has(lastReply(), "dallam, tx") && has(lastReply(), "s/d"), lastReply().slice(0, 120));
  await handler(mkM({ args: ["texas"] }), { sock: mockSock(), db });
  check("1c. .wxalert texas → detail negara bagian", has(lastReply(), "alert aktif di tx"), lastReply().slice(0, 80));
  await handler(mkM({ args: ["wakanda"] }), { sock: mockSock(), db });
  check("1d. wilayah gak dikenal → jujur + contoh", has(lastReply(), "gak dikenal"), lastReply().slice(0, 80));
  await handler(mkM({ args: ["tropis"] }), { sock: mockSock(), db });
  check("1e. .wxalert tropis → siklon NHC (nama+klasifikasi)", has(lastReply(), "fay") && has(lastReply(), "depresi tropis"), lastReply().slice(0, 90));
  plug._resetSeamsForTest(); // buang cache nasional < 5 mnt biar 500 beneran di-fetch
  plug._setHttpForTest(async () => ({ status: 500, data: {} }));
  await handler(mkM({ args: [] }), { sock: mockSock(), db });
  check("1f. NWS down → jujur", has(lastReply(), "bermasalah (500)"), lastReply().slice(0, 80));
}

// ══════════════════════════════════════════════════════════════
w("\n— 2. EWS v2 langganan (on/off/status) —");
{
  db.data.wxalert = undefined; db.save();
  plug._resetSeamsForTest();
  plug._setHttpForTest(async () => NWS_OK([]));
  const sock = mockSock();
  await handler(mkM({ args: ["on"] }), { sock, db });
  check("2a. .wxalert on → nasional aktif", has(lastReply(), "nasional") && has(lastReply(), "aktif"), lastReply().slice(0, 90));
  await handler(mkM({ args: ["on", "fl", "texas", "wakanda"] }), { sock, db });
  check("2b. on fl texas → 2 state; wakanda di-skip jujur", has(lastReply(), "fl, tx") && has(lastReply(), "wakanda"), lastReply().slice(0, 120));
  await handler(mkM({ args: ["on", "tropis"] }), { sock, db });
  check("2c. on tropis → siklon NHC aktif", has(lastReply(), "tropis"), lastReply().slice(0, 80));
  const st = db.data.wxalert.watchers["chat-1"];
  check("2d. watcher persist di db (nasional+states+tropis+seen)", st?.nasional === true && st?.tropis === true && (st?.states || []).join() === "FL,TX" && typeof st.seen === "object");
  await handler(mkM({ args: ["status"] }), { sock, db });
  check("2e. status → ringkas langganan", has(lastReply(), "fl, tx") && has(lastReply(), "nasional"), lastReply().slice(0, 100));
  await handler(mkM({ args: ["off"] }), { sock, db });
  check("2f. off → dihapus", !db.data.wxalert.watchers["chat-1"] && has(lastReply(), "dihentikan"), lastReply().slice(0, 60));
  await handler(mkM({ args: ["off"] }), { sock, db });
  check("2g. off tanpa langganan → jujur", has(lastReply(), "gak ada langganan"), lastReply().slice(0, 60));
}

// ══════════════════════════════════════════════════════════════
w("\n— 3. sampel aktivasi + tes (bukti notifikasi jalan) —");
{
  db.data.wxalert = undefined; db.save();
  plug._resetSeamsForTest();
  plug._setHttpForTest(async (url) => {
    if (url.includes("CurrentStorms")) return { status: 200, data: { activeStorms: [STORM("al062026", "Fay", "TD")] } };
    return NWS_OK([
      NWS_ALERT("nws-a1", "Severe", "Flash Flood Warning", "Dallam, TX"),
      NWS_ALERT("nws-a2", "Minor", "Flood Advisory", "Logan, OH"),
    ]);
  });
  const sock = mockSock();
  await handler(mkM({ args: ["on", "texas", "tropis"] }), { sock, db });
  const w1 = db.data.wxalert.watchers["chat-1"];
  check("3a. sampel aktivasi: alert serius aktif LANGSUNG dikirim", sock.sends.some((s) => has(s.payload?.text, "contoh alert aktif")), "sends=" + sock.sends.length);
  check("3b. sampel tropis langsung dikirim", sock.sends.some((s) => has(s.payload?.text, "contoh siklon aktif") && has(s.payload?.text, "fay")));
  check("3c. sampel di-mark seen (gak dobel di tick)", w1.seen["nws-a1"] && w1.seen["al062026"], "seen=" + Object.keys(w1.seen).join(","));
  check("3d. alert Minor gak dijadiin sampel", !w1.seen["nws-a2"]);
  mkM._replies["chat-1"] = [];
  await handler(mkM({ args: ["tes"] }), { sock, db });
  check("3e. .wxalert tes → alert contoh via jalur kirim sama", sock.sends.some((s) => has(s.payload?.text, "tes notifikasi")) && has(lastReply(), "berhasil"), lastReply().slice(0, 60));
  check("3f. health push tercatat pasca-tes", db.data.wxalert.health.pushes >= 1);
}

// ══════════════════════════════════════════════════════════════
w("\n— 4. monitor tick — push per-alert + dedupe —");
{
  db.data.wxalert = undefined; db.save();
  plug._resetSeamsForTest();
  const fresh = [NWS_ALERT("t1", "Severe", "Tornado Warning", "Dallam, TX"), NWS_ALERT("t2", "Extreme", "Flash Flood Warning", "Harlan, KY")];
  plug._setHttpForTest(async (url) => {
    if (url.includes("CurrentStorms")) return { status: 200, data: { activeStorms: [] } };
    return NWS_OK(fresh);
  });
  const sock = mockSock();
  await handler(mkM({ args: ["on", "nasional"] }), { sock, db });
  sock.sends.length = 0; // buang sampel aktivasi
  await plug._tickForTest(sock);
  const alerts = sock.sends.filter((s) => has(s.payload?.text, "alert baru") || has(s.payload?.text, "tornado warning"));
  check("4a. alert Severe/Extreme baru → push (bukan digest)", alerts.length >= 2, "push=" + alerts.length);
  check("4b. PUSH PER-ALERT (tiap alert pesan sendiri)", sock.sends.filter((s) => has(s.payload?.text, "ews v2 — alert cuaca as")).length === 2, sock.sends.map((s) => (s.payload?.text || "").slice(0, 25)).join("|"));
  const w1 = db.data.wxalert.watchers["chat-1"];
  check("4c. seen persist di db t1/t2", w1.seen.t1 && w1.seen.t2);
  sock.sends.length = 0;
  await plug._tickForTest(sock);
  check("4d. tick kedua tanpa alert baru → hening (dedupe)", sock.sends.length === 0, "sends=" + sock.sends.length);
  // alert Minor gak di-push
  plug._setHttpForTest(async (url) => {
    if (url.includes("CurrentStorms")) return { status: 200, data: { activeStorms: [] } };
    return NWS_OK([NWS_ALERT("t3", "Minor", "Flood Advisory", "Logan, OH")]);
  });
  sock.sends.length = 0;
  await plug._tickForTest(sock);
  check("4e. alert Minor di-skip", sock.sends.length === 0);
  // NWS error → lastError tercatat, gak throw (cache harus dibersihin dulu,
  // kalau gak pollNational pakai cache < 5 mnt dan gak pernah fetch)
  plug._resetSeamsForTest();
  plug._setHttpForTest(async () => ({ status: 503, data: {} }));
  let threw = false;
  try { await plug._tickForTest(sock); } catch { threw = true; }
  check("4f. NWS down → tick gak throw + lastError tercatat", !threw && !!db.data.wxalert.health.lastError, db.data.wxalert.health.lastError || "");
  check("4g. health ticks/pushes terisi", db.data.wxalert.health.ticks >= 4 && db.data.wxalert.health.pushes >= 2, JSON.stringify(db.data.wxalert.health));
  await handler(mkM({ args: ["health"] }), { sock, db });
  check("4h. .wxalert health → report ke owner", has(lastReply(), "monitor ews v2") && has(lastReply(), "error terakhir"), lastReply().slice(0, 90));
}

// ══════════════════════════════════════════════════════════════
w("\n— 5. multi-chat + digest tropis + cap —");
{
  db.data.wxalert = undefined; db.save();
  plug._resetSeamsForTest();
  plug._setHttpForTest(async () => ({ status: 200, data: { activeStorms: [] } }));
  const sock = mockSock();
  mkM._cur = "chat-2";
  await handler(mkM({ args: ["on", "tropis"], jid: "chat-2" }), { sock, db });
  mkM._cur = "chat-1";
  plug._setHttpForTest(async (url) => {
    if (url.includes("CurrentStorms")) return { status: 200, data: { activeStorms: [STORM("ep012026", "Gaston", "TS"), STORM("ep022026", "Hermine", "HU"), STORM("ep032026", "Ian", "TS"), STORM("ep042026", "Julia", "TD"), STORM("ep052026", "Karl", "TS"), STORM("ep062026", "Lisa", "HU")] } };
    return NWS_OK([]);
  });
  sock.sends.length = 0;
  await plug._tickForTest(sock);
  const perChat = {};
  sock.sends.forEach((s) => { perChat[s.chat] = (perChat[s.chat] || 0) + 1; });
  check("5a. push cuma ke chat yang langganan tropis", Object.keys(perChat).join() === "chat-2", Object.keys(perChat).join(","));
  const tropisMsgs = sock.sends.filter((s) => has(s.payload?.text, "siklon tropis baru"));
  check("5b. tropis: 4 push per-sistem + 1 digest sisa", tropisMsgs.length === 4 && sock.sends.some((s) => has(s.payload?.text, "sistem tropis baru lain")), "push=" + tropisMsgs.length);
  // burst nasional > cap → 8 push + digest
  db.data.wxalert = undefined; db.save();
  plug._resetSeamsForTest();
  plug._setHttpForTest(async () => ({ status: 200, data: { activeStorms: [] } }));
  await handler(mkM({ args: ["on", "nasional"] }), { sock, db });
  sock.sends.length = 0;
  const burst = Array.from({ length: 11 }, (_, i) => NWS_ALERT("b" + i, i === 0 ? "Extreme" : "Severe", "Warning " + i, "County " + i));
  plug._setHttpForTest(async () => NWS_OK(burst));
  await plug._tickForTest(sock);
  const pushes = sock.sends.filter((s) => has(s.payload?.text, "ews v2 — alert cuaca as"));
  check("5c. burst 11 alert → max 8 push per-alert + 1 digest sisa", pushes.length === 8 && sock.sends.some((s) => has(s.payload?.text, "alert lain baru")), "push=" + pushes.length);
  plug._resetSeamsForTest();
}

// ══════════════════════════════════════════════════════════════
w("\n— 6. anti-dobel dgn fitur lama —");
{
  const dis = await import(R + "/plugins/cuaca/disastersystemwatch.js");
  const disaster = await import(R + "/plugins/cuaca/disaster.js");
  const cfgs = [plug.pluginConfig, dis.config || dis.pluginConfig, disaster.config || disaster.pluginConfig];
  const names = cfgs.map((c) => c?.name);
  const aliasSets = cfgs.map((c) => new Set((c?.alias || c?.aliases || []).filter(Boolean)));
  const dupes = [];
  for (let i = 0; i < aliasSets.length; i++)
    for (let j = i + 1; j < aliasSets.length; j++)
      for (const a of aliasSets[i]) if (aliasSets[j].has(a)) dupes.push(a);
  check("6a. nama 3 plugin cuaca gak dobel", new Set(names).size === 3, names.join(","));
  check("6b. gak ada alias dobel antar plugin cuaca", dupes.length === 0, dupes.join(","));
}

w(`\n— summary —\nPASS ${pass} / FAIL ${fail}`);
process.exit(fail ? 1 : 0);
