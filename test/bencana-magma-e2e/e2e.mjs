// E2E bencanawatch upgrade gunung api PVMBG + retry BMKG (request owner 10 Sep 2026)
import {
  parseMagmaPage, parseMagmaCoords, getMagmaVolcanoes,
  setMagmaHttp, resetMagmaHttp, MAGMA_LEVELS,
  diffVolcanoState, fetchJsonWithRetry, FETCH_RETRY_DELAY_MS,
  evSumberKey, BENCANA_SUMBER, eventCard,
  dispatchNearQuake, dispatchNearEvent,
} from "../../src/lib/nova-bencana.js";

let pass = 0, fail = 0;
const w = (s) => process.stdout.write(s + "\n");
const check = (name, ok) => { w((ok ? "  ✅" : "  ❌") + " " + name); ok ? pass++ : fail++; };

// ── fixture halaman tingkat-aktivitas (struktur persis live 10 Sep 2026) ──
const FIXTURE_PAGE = `<!DOCTYPE html><html><body>
<div class="card card-status"><div class="media"><div class="media-body"><h1>0</h1><p>Level IV (Awas)</p></div></div></div>
<div class="card card-status"><div class="media"><div class="media-body"><h1>5</h1><p>Level III (Siaga)</p></div></div></div>
<div class="card card-status"><div class="media"><div class="media-body"><h1>22</h1><p>Level II (Waspada)</p></div></div></div>
<div class="card card-status"><div class="media"><div class="media-body"><h1>42</h1><p>Level I (Normal)</p></div></div></div>
<table><tr><td rowspan="6"><a href="" class="tx-inverse">Level III (Siaga)</a> <span>desc</span></td><td class="tx-12" rowspan="6"> 5 </td></tr>
<tr><td>Anak Krakatau - Lampung <a href="https://magma.esdm.go.id/v1/gunung-api/laporan/325506?signature=abc"><i class="fa"></i>Lihat laporan</a><br></td></tr>
<tr><td>Lewotobi Laki-laki - Nusa Tenggara Timur <a href="https://magma.esdm.go.id/v1/gunung-api/laporan/325502?signature=def"><i class="fa"></i>Lihat laporan</a><br></td></tr>
<tr><td>Merapi - Daerah Istimewa Yogyakarta dan Jawa Tengah <a href="https://magma.esdm.go.id/v1/gunung-api/laporan/325503?signature=ghi"><i class="fa"></i>Lihat laporan</a><br></td></tr>
<tr><td>Semeru - Jawa Timur <a href="https://magma.esdm.go.id/v1/gunung-api/laporan/325505?signature=jkl"><i class="fa"></i>Lihat laporan</a><br></td></tr>
<tr><td>Sinabung - Sumatera Utara <a href="https://magma.esdm.go.id/v1/gunung-api/laporan/325504?signature=mno"><i class="fa"></i>Lihat laporan</a><br></td></tr>
<tr><td rowspan="3"><a href="" class="tx-inverse">Level II (Waspada)</a> <span>desc</span></td><td class="tx-12" rowspan="3"> 2 </td></tr>
<tr><td>Bromo - Jawa Timur <a href="https://magma.esdm.go.id/v1/gunung-api/laporan/325442?signature=pqr"><i class="fa"></i>Lihat laporan</a><br></td></tr>
<tr><td>Ibu - Maluku Utara <a href="https://magma.esdm.go.id/v1/gunung-api/laporan/325427?signature=stu"><i class="fa"></i>Lihat laporan</a><br></td></tr>
<tr><td rowspan="2"><a href="" class="tx-inverse">Level I (Normal)</a> <span>desc</span></td><td class="tx-12" rowspan="2"> 1 </td></tr>
<tr><td>Agung - Bali <a href="https://magma.esdm.go.id/v1/gunung-api/laporan/325478?signature=vwx"><i class="fa"></i>Lihat laporan</a><br></td></tr>
</table></body></html>`;

// ── 1. parseMagmaPage ──
w("\n— parseMagmaPage —");
{
  const page = parseMagmaPage(FIXTURE_PAGE);
  check("ringkas: 4 kartu level", Object.keys(page.ringkas).length === 4);
  check("ringkas: Siaga = 5", page.ringkas["Level III (Siaga)"] === 5);
  check("list: 8 gunung", page.list.length === 8);
  const krak = page.list[0];
  check("row 1: Anak Krakatau (Lampung)", krak.nama === "Anak Krakatau" && krak.prov === "Lampung");
  check("row 1: level III (Siaga)", krak.levelNum === 3 && krak.levelLabel === "SIAGA");
  check("row 1: laporanId 325506", krak.laporanId === 325506);
  check("row 1: laporanUrl utuh + signature", krak.laporanUrl.includes("signature=abc"));
  const bromo = page.list.find((v) => v.nama === "Bromo");
  check("row Bromo: level II (Waspada)", bromo?.levelNum === 2);
  const agung = page.list.find((v) => v.nama === "Agung");
  check("row Agung: level I (Normal)", agung?.levelNum === 1);
  check("nama multi-kata: Lewotobi Laki-laki", page.list.some((v) => v.nama === "Lewotobi Laki-laki"));
  check("string kosong → 0 gunung, gak throw", parseMagmaPage("").list.length === 0);
}

// ── 2. parseMagmaCoords ──
w("\n— parseMagmaCoords —");
{
  const c1 = parseMagmaCoords("posisi geografis di Latitude -7.542&deg;LU, Longitude 110.442&deg;BT dan memiliki ketinggian 2968 mdpl");
  check("Merapi: lat -7.542 lon 110.442", c1?.lat === -7.542 && c1?.lon === 110.442);
  const c2 = parseMagmaCoords("Latitude 3.68&deg;LS, Longitude 96.91&deg;BT");
  check("LS positif → dinegasi (-3.68)", c2?.lat === -3.68);
  const c3 = parseMagmaCoords("Latitude 1.5&deg;LU, Longitude 101.3&deg;BT");
  check("LU positif tetap positif (utara)", c3?.lat === 1.5);
  check("gak ada koordinat → null", parseMagmaCoords("nggak ada info") === null);
  const c4 = parseMagmaCoords("Latitude 999&deg;LS, Longitude 96.91&deg;BT");
  check("lat > 90 → null (guard)", c4 === null);
}

// ── 3. getMagmaVolcanoes via seam ──
w("\n— getMagmaVolcanoes (seam) —");
{
  let fetched = 0;
  setMagmaHttp(async () => { fetched++; return { ok: true, status: 200, text: async () => FIXTURE_PAGE }; });
  const page = await getMagmaVolcanoes();
  check("live fetch via seam: 8 gunung", page.list.length === 8 && fetched === 1);
  // retry: 403 dua kali lalu sukses
  let n = 0;
  setMagmaHttp(async () => { n++; return n < 3 ? { ok: false, status: 403, text: "" } : { ok: true, status: 200, text: async () => FIXTURE_PAGE }; });
  const page2 = await getMagmaVolcanoes();
  check("magma 403 flaky → retry sampai sukses (3 attempt)", page2.list.length === 8 && n === 3);
  // page kosong → throw (deteksi struktur berubah)
  let threw = false;
  setMagmaHttp(async () => ({ ok: true, status: 200, text: async () => "<html>kosong</html>" }));
  try { await getMagmaVolcanoes(); } catch { threw = true; }
  check("parse 0 gunung → throw (jangan dispatch diam2)", threw);
  resetMagmaHttp();
}

// ── 4. fetchJsonWithRetry (BMKG 403 flaky) ──
w("\n— fetchJsonWithRetry —");
{
  // delay 2s per retry — pakai 1 retry biar test gak lambat
  let n = 0;
  const impl = async () => { n++; return n === 1 ? { ok: false, status: 403 } : { ok: true, status: 200, json: async () => ({ Infogempa: { gempa: { Magnitude: "3.5" } } }) }; };
  const d = await fetchJsonWithRetry("https://data.bmkg.go.id/DataMKG/TEWS/autogempa.json", 3000, 1, impl);
  check("403 sekali → retry → sukses M3.5", d?.Infogempa?.gempa?.Magnitude === "3.5" && n === 2);
  // 404 → gak retry (langsung lempar)
  let n2 = 0;
  const impl2 = async () => { n2++; return { ok: false, status: 404 }; };
  let threw404 = false;
  try { await fetchJsonWithRetry("https://x.test/404", 3000, 2, impl2); } catch (e) { threw404 = String(e.message).includes("404"); }
  check("404 → tanpa retry, lempar langsung", threw404 && n2 === 1);
  // retry habis → lempar error 403
  let n3 = 0;
  const impl3 = async () => { n3++; return { ok: false, status: 403 }; };
  let threw403 = false;
  try { await fetchJsonWithRetry("https://x.test/403", 1000, 1, impl3); } catch (e) { threw403 = String(e.message).includes("403"); }
  check("403 terus → habis retry lempar", threw403 && n3 === 2);
  check("delay retry 2 detik (konstanta)", FETCH_RETRY_DELAY_MS === 2000);
}

// ── 5. diffVolcanoState ──
w("\n— diffVolcanoState —");
{
  const mkList = () => parseMagmaPage(FIXTURE_PAGE).list;
  let st = {};
  const r1 = diffVolcanoState(st, mkList());
  check("baseline pertama → silent, 0 changes", r1.baseline === true && r1.changes.length === 0);
  check("state terisi 8 gunung", Object.keys(st.volcano.levels).length === 8);
  check("Merapi tercatat III", st.volcano.levels["Merapi"]?.num === 3);
  // naik ke Siaga
  const r2 = diffVolcanoState(st, mkList());
  check("tanpa perubahan → 0 changes", r2.changes.length === 0);
  const upList = mkList().map((v) => v.nama === "Bromo" ? { ...v, levelNum: 3, levelLabel: "SIAGA" } : v);
  const r3 = diffVolcanoState(st, upList);
  check("Bromo II→III = 1 change (naik Siaga)", r3.changes.length === 1 && r3.changes[0].v.nama === "Bromo" && r3.changes[0].prevNum === 2);
  check("state Bromo ke-update ke III", st.volcano.levels["Bromo"]?.num === 3);
  // turun ke Normal (near-only)
  const downList = mkList().map((v) => v.nama === "Sinabung" ? { ...v, levelNum: 1, levelLabel: "NORMAL" } : v);
  const r4 = diffVolcanoState(st, downList);
  const sin = r4.changes.find((c) => c.v.nama === "Sinabung");
  check("Sinabung III→I ke-change (turun global)", sin?.prevNum === 3 && sin?.v.levelNum === 1);
  // gunung baru masuk di Siaga → alert
  const newList = [...mkList(), { nama: "Gunung Baru Saja Meletus", prov: "Maluku", levelNum: 4, levelLabel: "AWAS", laporanUrl: "https://magma.esdm.go.id/v1/gunung-api/laporan/999?signature=z", laporanId: 999 }];
  const r5 = diffVolcanoState(st, newList);
  const baru = r5.changes.find((c) => c.v.nama === "Gunung Baru Saja Meletus");
  check("gunung BARU masuk di AWAS → alert (prevNum=1)", baru?.prevNum === 1 && baru?.v.levelNum === 4);
  // gunung baru masuk di Normal → silent
  const st2 = {}; diffVolcanoState(st2, mkList());
  const newList2 = [...mkList(), { nama: "Gunung Tenang", prov: "Jawa Barat", levelNum: 1, levelLabel: "NORMAL", laporanUrl: "https://x", laporanId: 1 }];
  const r6 = diffVolcanoState(st2, newList2);
  check("gunung BARU di Normal → silent dicatat", r6.changes.length === 0 && st2.volcano.levels["Gunung Tenang"]?.num === 1);
}

// ── 6. sumber pvmbg ──
w("\n— sumber pvmbg —");
check("evSumberKey: PVMBG MAGMA → pvmbg", evSumberKey({ sumber: "PVMBG MAGMA Indonesia" }) === "pvmbg");
check("evSumberKey: BMKG tetap bmkg", evSumberKey({ sumber: "BMKG (data.bmkg.go.id)" }) === "bmkg");
check("BENCANA_SUMBER: pvmbg terdaftar", BENCANA_SUMBER.includes("pvmbg"));
{
  const card = eventCard({ kind: "gunungapi", jenis: "Gunung Api", level: "SIAGA", desc: "Merapi — DIY", sumber: "PVMBG MAGMA Indonesia", laporanUrl: "https://magma.esdm.go.id/v1/gunung-api/laporan/325503?signature=x" });
  check("eventCard pvmbg: sourceUrl = laporan resmi", card.sourceUrl?.includes("laporan/325503"));
  check("eventCard pvmbg: title tanpa M (mag null)", card.title === "Gunung Api — SIAGA");
}

// ── 7. dispatchNearEvent refactor ──
w("\n— near-dispatch generic —");
check("dispatchNearQuake masih ada (backward-compat fastTick)", typeof dispatchNearQuake === "function");
check("dispatchNearEvent generic ada (gunungapi)", typeof dispatchNearEvent === "function");

// ── 8. MAGMA_LEVELS ──
w("\n— MAGMA_LEVELS —");
check("4 level lengkap (IV→I)", [4, 3, 2, 1].every((n) => MAGMA_LEVELS[n]?.label));
check("label benar: AWAS/SIAGA/WASPADA/NORMAL",
  MAGMA_LEVELS[4].label === "AWAS" && MAGMA_LEVELS[3].label === "SIAGA" && MAGMA_LEVELS[2].label === "WASPADA" && MAGMA_LEVELS[1].label === "NORMAL");

w(`\n${pass} PASS / ${fail} FAIL`);
setTimeout(() => process.exit(fail ? 1 : 0), 300);
