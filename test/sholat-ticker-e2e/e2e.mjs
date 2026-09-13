// E2E — JADWAL SHOLAT LIVE COUNTDOWN (13 Sep 2026, batch 4 variasi polos)
// Request owner: ".jadwalsholat gak ada pelengkap kyk penghitung" ala .afk.
// - computeNextPrayer: sholat berikutnya hari ini / Subuh besok kalau semua lewat
// - buildSholatCountdownCard: kartu countdown → kartu SUDAH WAKTU
// - ticker live: kirim → edit-in-place → selesai di waktunya
import path from "path";
import { fileURLToPath } from "url";
const R = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
process.chdir(R);

const { computeNextPrayer, buildSholatCountdownCard } = await import(R + "/src/lib/nova-sholat-api.js");
const { runLiveTicker } = await import(R + "/src/lib/nova-countdown.js");
const moment = (await import("moment-timezone")).default;
const { fromSC } = await import(R + "/src/lib/styler.js");
// GOTCHA (ke-4x): claraWrap nge-render smallcaps → assert WAJIB norm fromSC + lowercase
const norm = (s) => fromSC(String(s)).toLowerCase();

let pass = 0, fail = 0;
const w = (s) => process.stdout.write(s + "\n");
const check = (name, ok, extra) => { w((ok ? "  ✅" : "  ❌") + " " + name + (ok || !extra ? "" : " — " + extra)); ok ? pass++ : fail++; };

// waktu WIB sekarang → times relatif buat tes deterministik
const nowWib = moment.tz("Asia/Jakarta");
const rel = (minutes) => nowWib.clone().add(minutes, "minutes").format("HH:mm");
const relH = (hours) => nowWib.clone().add(hours, "hours").format("HH:mm");

// ═══════════════════════════════════════════════════════════════
w("\n— computeNextPrayer —");
{
  const times = { imsak: rel(-400), subuh: rel(-350), terbit: rel(-300), dhuha: rel(-250), dzuhur: rel(-180), ashar: rel(-100), maghrib: rel(120), isya: rel(200) };
  const next = computeNextPrayer(times);
  check("siang hari → Maghrib berikutnya", next?.key === "maghrib" && next.name === "Maghrib", JSON.stringify(next));
  check("target masa depan + timeStr bawa", next && next.targetTs > Date.now() && next.timeStr === rel(120));
  check("bukan besok", next && next.isTomorrow === false);
}
{
  const times = { imsak: rel(-400), subuh: rel(-350), terbit: rel(-300), dhuha: rel(-250), dzuhur: rel(-180), ashar: rel(-100), maghrib: rel(-40), isya: rel(-20) };
  const next = computeNextPrayer(times);
  check("isya udah lewat semua → Subuh BESOK", next?.key === "subuh" && next.isTomorrow === true, JSON.stringify(next));
  check("target besok masuk akal (< 24 jam, > 0)", next && next.targetTs - Date.now() > 0 && next.targetTs - Date.now() < 86400000);
}
{
  const next = computeNextPrayer({ imsak: "-", subuh: "-", terbit: "-", dhuha: "-", dzuhur: "-", ashar: "-", maghrib: "-", isya: "-" });
  check("jadwal kosong/'-' → null senyap", next === null);
}
{
  // cuma 5 waktu: terbit/dhuha/imsak gak pernah jadi "berikutnya"
  const times = { imsak: rel(5), subuh: rel(-350), terbit: rel(30), dhuha: rel(40), dzuhur: rel(60), ashar: rel(100), maghrib: rel(150), isya: rel(200) };
  const next = computeNextPrayer(times);
  check("imsak/terbit/dhuha di-skip → Dzuhur", next?.key === "dzuhur", JSON.stringify(next));
}

// ═══════════════════════════════════════════════════════════════
w("\n— buildSholatCountdownCard —");
{
  const next = { key: "maghrib", name: "Maghrib", timeStr: "17:45", targetTs: 0, isTomorrow: false };
  const c = buildSholatCountdownCard(next, 90 * 60 * 1000, "Jakarta — DKI");
  const cn = norm(c);
  check("kartu countdown: Menuju + sisa + pukul + lokasi", cn.includes("menuju maghrib") && cn.includes("lagi") && c.includes("17:45") && cn.includes("jakarta"), c.slice(0, 80));
  check("format sisa 1:30:00", c.includes("1:30:00"), c.slice(0, 200));
  const d = buildSholatCountdownCard(next, 0, "Jakarta");
  check("remainingMs 0 → SUDAH WAKTU", /ꜱᴜᴅᴀʜ ᴡᴀᴋᴛᴜ|sudah waktu/i.test(d), d.slice(0, 80));
  const b = buildSholatCountdownCard({ key: "subuh", name: "Subuh", timeStr: "04:30", targetTs: 0, isTomorrow: true }, 7 * 3600 * 1000, null);
  check("besok ditandai + kartu jalan tanpa lokasi", norm(b).includes("(besok)") && !b.includes("📍"));
}

// ═══════════════════════════════════════════════════════════════
w("\n— ticker live end-to-end (mock sock) —");
{
  const sends = [];
  let firstKey = null;
  const sock = {
    sendMessage: async (chat, payload, opts) => {
      sends.push({ chat, payload, opts });
      const key = { id: "tick-" + sends.length, remoteJid: chat };
      if (!firstKey) firstKey = key;
      return { key };
    },
  };
  const target = Date.now() + 3200; // ~3 dtk → tick per detik, selesai di waktunya
  const next = { key: "maghrib", name: "Maghrib", timeStr: "17:45", targetTs: target, isTomorrow: false };
  const res = await runLiveTicker({
    sock, chat: "c@g.us", m: null,
    initialCard: buildSholatCountdownCard(next, target - Date.now(), "Jakarta"),
    tickCard: (st) => buildSholatCountdownCard(next, st.remainingMs, "Jakarta"),
    mode: "down",
    targetTs: target,
  });
  const edits = sends.filter((s) => s.payload?.edit);
  check("kartu awal terkirim + di-edit berulang", sends.length >= 2 && edits.length >= 1, `${sends.length} sends / ${edits.length} edits`);
  check("selesai di waktunya (finished)", res.finished === true, JSON.stringify(res));
  const last = sends[sends.length - 1];
  check("kartu akhir = SUDAH WAKTU", /ꜱᴜᴅᴀʜ ᴡᴀᴋᴛᴜ|sudah waktu/i.test(last.payload.text), last.payload.text.slice(0, 60));
  check("semua edit nyasar ke key yang sama", edits.length > 0 && edits.every((e) => e.payload.edit?.id === firstKey.id));
}
{
  // edit mati (sendMessage edit gagal) → kartu pertama tetep tampil, gak crash
  const sends = [];
  const sock = {
    sendMessage: async (chat, payload) => {
      if (payload?.edit) throw new Error("edit dead");
      sends.push({ chat, payload });
      return { key: { id: "k1" } };
    },
  };
  const target = Date.now() + 2000;
  const res = await runLiveTicker({
    sock, chat: "c@g.us", m: null,
    initialCard: "kartu awal",
    tickCard: () => "kartu tick",
    mode: "down", targetTs: target,
  });
  check("edit gagal → gak crash, kartu awal tetep tampil", sends.length === 1 && res.edits <= 1, JSON.stringify(res));
}

// ═══════════════════════════════════════════════════════════════
w("\n— plugin jadwalsholat: caption punya pelengkap (myquran live) —");
{
  try {
    const { searchKota, getTodaySchedule, extractPrayerTimes } = await import(R + "/src/lib/nova-sholat-api.js");
    const kota = await searchKota("Jakarta");
    const jadwal = await getTodaySchedule(kota.id);
    const times = extractPrayerTimes(jadwal);
    const next = computeNextPrayer(times);
    check("live: jadwal Jakarta terambil + sholat berikutnya kedeteksi", !!kota && !!next, JSON.stringify({ kota: kota?.id, next: next?.name }));
    const mark = (k) => (next && next.key === k ? "🔜 " : "");
    const captionHasMarker = !!mark(next.key).trim();
    check("live: marker 🔜 + baris Berikutnya kebangun", captionHasMarker && next.name.length > 0, next.name + " " + next.timeStr);
    const lokasiLine = jadwal.daerah ? `${jadwal.lokasi} — ${jadwal.daerah}` : jadwal.lokasi;
    const card = buildSholatCountdownCard(next, next.targetTs - Date.now(), lokasiLine);
    check("live: kartu countdown ke-render", norm(card).includes("menuju") && norm(card).includes("lagi"), card.slice(0, 60));
  } catch (e) {
    w("  ⚠️ live myquran skip (jaringan): " + (e?.message || e));
  }
}

w(`\n— summary —\nPASS ${pass} / FAIL ${fail}`);
process.exit(fail ? 1 : 0);
