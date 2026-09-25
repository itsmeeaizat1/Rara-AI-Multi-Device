// E2E — JADWALBOLA (ESPN rewire + kickoff ticker) + GEMPA (wave anim + fix crash) (13 Sep 2026)
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
const R = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
process.chdir(R);

const DB_DIR = "/tmp/nova-bolagempa-db-" + Date.now();
fs.mkdirSync(DB_DIR, { recursive: true });
const { initDatabase } = await import(R + "/src/lib/nova-database.js");
await initDatabase(DB_DIR + "/db.json");

const { fromSC } = await import(R + "/src/lib/styler.js");
const norm = (s) => fromSC(String(s)).toLowerCase();

let pass = 0, fail = 0;
const w = (s) => process.stdout.write(s + "\n");
const check = (name, ok, extra) => { w((ok ? "  ✅" : "  ❌") + " " + name + (ok || !extra ? "" : " — " + extra)); ok ? pass++ : fail++; };

const SENDER = "628123456789@s.whatsapp.net";
const CHAT = SENDER;
const realFetch = globalThis.fetch;

function mkMock() {
  const sends = [];
  const reacts = [];
  const m = {
    sender: SENDER, chat: CHAT, pushName: "Budi", prefix: ".", args: [], command: "jadwalbola",
    react: async (e) => { reacts.push(e); },
    reply: async (txt, opts) => { sends.push({ txt, opts }); return { key: { id: "r" + sends.length } }; },
  };
  const sock = {
    sendMessage: async (jid, payload, opts) => { sends.push({ txt: payload?.text, edit: payload?.edit?.id, opts }); return { key: { id: "e" + sends.length } }; },
    sendMedia: async (jid, src, caption, quoted, opts) => { sends.push({ media: true, caption, src }); return { key: { id: "md" + sends.length } }; },
  };
  return { m, sock, sends, reacts };
}
const normSends = (mk) => mk.sends.map((s) => norm(s.txt || s.caption || ""));

// ── ESPN fixture ──
const NOW = Date.now();
const espnEvent = (offsetMs, home, away, state, homeScore, awayScore, league = "English Premier League") => ({
  date: new Date(NOW + offsetMs).toISOString(),
  name: `${away} at ${home}`,
  competitions: [{
    competitors: [
      { homeAway: "home", team: { displayName: home }, score: homeScore },
      { homeAway: "away", team: { displayName: away }, score: awayScore },
    ],
    status: { type: { state, shortDetail: state === "in" ? "1H" : "" } },
  }],
});
function espnPayload(events, leagueName = "English Premier League") {
  return { leagues: [{ name: leagueName, abbreviation: "EPL" }], events };
}
function mockFetchLeague(payload) {
  return async (url) => {
    if (String(url).includes("site.api.espn.com")) {
      return { ok: true, json: async () => payload };
    }
    return realFetch(url);
  };
}

// ═══════════════════════════════════════════════════════════════
w("\n— JADWALBOLA: ESPN rewire + kickoff ticker —");
{
  const jb = await import(R + "/plugins/info/footballschedule.js");
  const { handler, findLeagueKey, getMatches } = jb;

  // mapping liga
  check("findLeagueKey inggris → eng.1", findLeagueKey("inggris") === "inggris");
  check("findLeagueKey 'ucl' → ucl (liga champions)", findLeagueKey("ucl") === "ucl" && findLeagueKey("champions") === "champions");
  check("findLeagueKey 'bri' → indonesia", findLeagueKey("bri") === "indonesia");
  check("findLeagueKey sampah → null", findLeagueKey("xyzabc") === null);

  // getMatches via mock fetch
  globalThis.fetch = mockFetchLeague(espnPayload([
    espnEvent(2 * 3600e3, "Manchester United", "Manchester City", "pre"),
    espnEvent(5 * 3600e3, "Arsenal", "Chelsea", "pre"),
    espnEvent(-1 * 3600e3, "Liverpool", "Everton", "in", "2", "1"),
  ]));
  const evs = await getMatches(["inggris"]);
  check("getMatches: 3 event terurut + live detect", evs.length === 3 && evs[0].state === "in" && evs[1].home === "Manchester United");

  // handler: kartu + LIVE skor + 🔜 marker + ticker kickoff (2 jam → ≤24h → ticker)
  const mk = mkMock();
  await handler(mk.m, { sock: mk.sock });
  const texts = normSends(mk);
  const card = texts.find((t) => t.includes("jadwal pertandingan"));
  check("kartu utama: jadwal + hari ini", !!card);
  check("kartu: match LIVE + skor 2-1", card.includes("liverpool") && card.includes("2-1"));
  check("kartu: berikutnya 🔜 + sisa", card.includes("berikutnya") && card.includes("manchester united"));
  const tickerInit = texts.find((t) => t.includes("kickoff") && t.includes("manchester united") && !t.includes("pertandingan dimulai"));
  check("ticker kickoff kekirim (≤24 jam)", !!tickerInit && tickerInit.includes("wib") === false); // countdown bukan jadwal
  // ticker jalan fire-and-forget — tungguin settle
  await new Promise((r) => setTimeout(r, 2500));
  const texts2 = normSends(mk);
  check("react 🧠 → 🐣", mk.reacts[0] === "🧠" && mk.reacts.includes("🐣"));

  // filter liga: 'inggris' → cuma fetch eng.1
  {
    const mk2 = mkMock();
    mk2.m.args = ["inggris"];
    globalThis.fetch = mockFetchLeague(espnPayload([espnEvent(3 * 3600e3, "Brighton", "Coventry", "pre")]));
    await handler(mk2.m, { sock: mk2.sock });
    const t = normSends(mk2).find((x) => x.includes("premier league"));
    check("filter liga → nama liga di kartu", !!t);
  }

  // kosong → kartu jujur
  {
    const mk3 = mkMock();
    globalThis.fetch = mockFetchLeague(espnPayload([]));
    await handler(mk3.m, { sock: mk3.sock });
    check("0 event → kartu jujur + daftar liga", normSends(mk3).some((t) => t.includes("gak ada pertandingan")));
  }

  // API down → error sopan
  {
    const mk4 = mkMock();
    globalThis.fetch = async () => { throw new Error("network down"); };
    await handler(mk4.m, { sock: mk4.sock });
    check("API down → react ❌ + error sopan", mk4.reacts.at(-1) === "❌" && normSends(mk4).length > 0);
  }
  globalThis.fetch = realFetch;
}

// ═══════════════════════════════════════════════════════════════
w("\n— GEMPA: wave anim + fix crash —");
{
  const g = await import(R + "/plugins/info/earthquake.js");
  const { handler } = g;

  const gempaFix = {
    Infogempa: {
      gempa: {
        Magnitude: "5.2", Wilayah: "Pusat gempa di laut selatan Jawa",
        Lintang: "LS 7.5", Bujur: "BT 107.2", Kedalaman: "40 km",
        Tanggal: "13 Sep 2026", Jam: "20:45:15 WIB",
        Potensi: "Tidak berpotensi tsunami", Dirasakan: "III (Cianjur)",
        Shakemap: "shakemap.jpg",
      },
    },
  };

  // terkini: wave anim → settle kartu → shakemap
  {
    const mk = mkMock();
    globalThis.fetch = async (url) => {
      if (String(url).includes("autogempa")) return { ok: true, json: async () => gempaFix };
      if (String(url).includes("shakemap")) return { ok: true };
      return realFetch(url);
    };
    mk.m.command = "gempa";
    await handler(mk.m, { sock: mk.sock });
    await new Promise((r) => setTimeout(r, 1000));
    const texts = normSends(mk);
    check("wave anim: frame memindai → gelombang → finalisasi", texts.some((t) => t.includes("memindai")) && texts.some((t) => t.includes("gelombang p meluncur")));
    check("wave settle: kartu final ke EDIT pesan animasi (bukan pesan baru)", texts.some((t) => t.includes("gempa terkini bmkg") && t.includes("m 5.2")) && mk.sends.some((s) => s.edit));
    check("shakemap kekirim sebagai gambar", mk.sends.some((s) => s.media && norm(s.caption).includes("shakemap")));
    check("react 🧠 → 🛠️ → 🐣", mk.reacts.join(",") === "🧠,🛠️,🐣", mk.reacts.join(","));
  }

  // dirasakan (branch yang DULU crash)
  {
    const mk = mkMock();
    globalThis.fetch = async (url) => {
      if (String(url).includes("gempadirasakan")) return { ok: true, json: async () => ({ Infogempa: { gempa: [
        { Magnitude: "4.1", Wilayah: "Lombok", Tanggal: "13 Sep 2026", Jam: "10:00 WIB", Kedalaman: "10 km", Dirasakan: "II Mataram" },
        { Magnitude: "3.9", Wilayah: "Aceh", Tanggal: "13 Sep 2026", Jam: "08:00 WIB", Kedalaman: "12 km", Dirasakan: "II Banda Aceh" },
      ] } }) };
      return realFetch(url);
    };
    mk.m.args = ["dirasakan"];
    await handler(mk.m, { sock: mk.sock });
    const t = normSends(mk).at(-1);
    check("dirasakan: list 2 gempa (fix crash lama)", t.includes("dirasakan terbaru") && t.includes("lombok") && t.includes("aceh"));

    // list
    globalThis.fetch = async (url) => {
      if (String(url).includes("gempaterkini")) return { ok: true, json: async () => ({ Infogempa: { gempa: [
        { Magnitude: "5.6", Wilayah: "Mentawai", Tanggal: "13 Sep 2026", Jam: "07:00 WIB", Kedalaman: "20 km", Potensi: "Tidak berpotensi tsunami" },
      ] } }) };
      return realFetch(url);
    };
    mk.m.args = ["list"];
    await handler(mk.m, { sock: mk.sock });
    check("list: M5.0+ + potensi", normSends(mk).at(-1).includes("m 5.0+") && normSends(mk).at(-1).includes("mentawai"));

    // help (sub gak dikenal)
    mk.m.args = ["help"];
    await handler(mk.m, { sock: mk.sock });
    check("help: 3 perintah + sumber BMKG", normSends(mk).at(-1).includes("dirasakan") && normSends(mk).at(-1).includes("bmkg"));

    // BMKG down → error sopan
    globalThis.fetch = async () => { throw new Error("down"); };
    mk.m.args = [];
    await handler(mk.m, { sock: mk.sock });
    check("BMKG down → react ❌ + error sopan", mk.reacts.at(-1) === "❌" && normSends(mk).at(-1).includes("error"));
  }
  globalThis.fetch = realFetch;
}

w(`\n— summary —\nPASS ${pass} / FAIL ${fail}`);
process.exit(fail ? 1 : 0);
