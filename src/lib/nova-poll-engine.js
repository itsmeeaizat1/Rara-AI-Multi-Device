// NOVA POLL ENGINE — persist poll + votes ke db, pasang ulang timer pas
// bot restart, hasil pakai bar meter ▰▱, live countdown 🕒 standar.
// (Upgrade 14 Sep 2026: sebelumnya global.novaPolls RAM murni — restart =
// votes lenyap, timer mati. Pola: nova-ram-persist + restore ala pomodoro.)
import { persistLoad } from "./nova-ram-persist.js";
import { getDatabase } from "./nova-database.js";
import { claraWrap } from "./nova-menu-style.js";
import { runLiveTicker } from "./nova-countdown.js";

const KEY = "novaPolls";
if (!global.novaPolls) global.novaPolls = {};
if (!global.__pollTimers) global.__pollTimers = {}; // chatId:pollId → timerId

persistLoad(KEY);

/** Simpen store poll ke db — WAJIB dipanggil tiap abis mutasi */
export function pollPersist() {
  // ⚠️ JANGAN replace global.novaPolls (global[KEY] = snapshot) — semua
  // reference live (closure ticker isCancelled, timer, plugin) bakal nyangkut
  // di objek LAMA → ticker gak berhenti walau poll closed. Serialisasi ke
  // db doang, global tetep objek asli yang dimutasi.
  try {
    const snapshot = {};
    for (const [chatId, polls] of Object.entries(global.novaPolls || {})) {
      snapshot[chatId] = {};
      for (const [id, p] of Object.entries(polls || {})) {
        if (!p) continue;
        const { timerId, ticker, ...rest } = p; // timerId gak bisa diserialisasi
        snapshot[chatId][id] = rest;
      }
    }
    getDatabase().setting("ramPersist:" + KEY, snapshot);
  } catch {}
}

/** Bar meter standar ▰▱ (10 blok) */
export function pollBar(pct) {
  const f = Math.max(0, Math.min(10, Math.round((pct / 100) * 10)));
  return "▰".repeat(f) + "▱".repeat(10 - f);
}

/** Hasil poll — bar ▰▱ per opsi + persen + winner/seri */
export function buildPollResult(poll) {
  const counts = new Array(poll.options.length).fill(0);
  for (const [, optIndices] of Object.entries(poll.votes || {})) {
    for (const idx of optIndices) counts[idx]++;
  }
  const totalVoters = Object.keys(poll.votes || {}).length;
  const totalVotes = counts.reduce((a, b) => a + b, 0);

  const lines = poll.options.map((opt, i) => {
    const pct = totalVotes > 0 ? Math.round((counts[i] / totalVotes) * 100) : 0;
    return `${i + 1}. ${opt}\n   ${pollBar(pct)} ${pct}% (${counts[i]} suara)`;
  });
  lines.push("", `Total Voter: ${totalVoters} | Total Suara: ${totalVotes}`);

  if (poll.closed) {
    const maxVotes = Math.max(...counts);
    const winners = counts.map((c, i) => ({ c, i })).filter((o) => o.c === maxVotes && o.c > 0);
    if (maxVotes > 0) {
      lines.push("");
      if (winners.length === 1) lines.push(`🏆 Pemenang: ${poll.options[winners[0].i]} (${maxVotes} suara)`);
      else lines.push(`🤝 Seri: ${winners.map((w) => poll.options[w.i]).join(", ")} (${maxVotes} suara)`);
    } else {
      lines.push("", "Tidak ada suara masuk");
    }
  }
  return lines.join("\n");
}

/** Tutup poll + kirim kartu hasil (dipakai timer auto-close & restore miss) */
export async function closePollNow(sock, chatId, pollId, reason = "waktu habis", opts = {}) {
  const poll = global.novaPolls?.[chatId]?.[pollId];
  if (!poll || poll.closed) return false;
  poll.closed = true;
  poll.closedAt = Date.now();
  const tid = global.__pollTimers[`${chatId}:${pollId}`];
  if (tid) { clearTimeout(tid); delete global.__pollTimers[`${chatId}:${pollId}`]; }
  pollPersist();
  if (!opts.silent) {
    try {
      await sock.sendMessage(chatId, { text: claraWrap("Poll Berakhir", [
        `Poll ${pollId} ditutup (${reason})`,
        `Pertanyaan: ${poll.question}`,
        "",
        buildPollResult(poll),
      ]) });
    } catch {}
  }
  return true;
}

/** Pasang timer auto-close (dipakai create + restore startup) */
export function armPollTimer(sock, chatId, pollId) {
  const poll = global.novaPolls?.[chatId]?.[pollId];
  if (!poll || poll.closed) return;
  const tid = global.__pollTimers[`${chatId}:${pollId}`];
  if (tid) clearTimeout(tid);
  const delay = Math.max(0, Number(poll.closedAt) - Date.now());
  global.__pollTimers[`${chatId}:${pollId}`] = setTimeout(() => {
    delete global.__pollTimers[`${chatId}:${pollId}`];
    closePollNow(sock, chatId, pollId, "waktu habis").catch(() => {});
  }, delay);
}

/**
 * Live countdown 🕒 di kartu poll — nge-tick sampai auto-close;
 * close manual / delete → isCancelled → closing adaptif (bukan "waktu habis").
 */
export function firePollTicker(sock, chatId, m, poll) {
  const fmt = (ms) => {
    if (ms <= 0) return "sekarang";
    const s = Math.floor(ms / 1000);
    const h = Math.floor(s / 3600), mn = Math.floor((s % 3600) / 60), sc = s % 60;
    if (h > 0) return `${h} jam ${mn} mnt`;
    if (mn > 0) return `${mn} mnt ${sc} dtk`;
    return `${sc} dtk`;
  };
  const card = (remainingMs, live = true) => claraWrap("Poll Dibuat", [
    `ID: ${poll.id}`,
    `Pertanyaan: ${poll.question}`,
    `Mode: ${poll.isMultiple ? "Pilihan Ganda" : "Pilihan Tunggal"}`,
    `Berakhir dalam: ${fmt(remainingMs)}${live ? " 🕒" : ""}`,
    `Dibuat oleh: ${poll.creatorName}`,
    "",
    `Ketik: .poll vote ${poll.id} <nomor>`,
    `Hasil: .poll hasil ${poll.id}`,
  ], "success");
  return runLiveTicker({
    sock, chat: chatId, m,
    mode: "down", targetTs: Number(poll.closedAt),
    maxEdits: Number(process.env.NOVA_TICK_MAXEDITS) || 24,
    initialCard: card(Number(poll.closedAt) - Date.now()),
    tickCard: (st) => card(st.remainingMs, st.remainingMs > 0),
    finalCard: () => {
      if (poll.deleted) {
        return claraWrap("Poll Dihapus", `ID: ${poll.id}`, "warn");
      }
      if (poll.closed) {
        return claraWrap("Poll Ditutup", [
          `ID: ${poll.id}`,
          `Pertanyaan: ${poll.question}`,
          "", "✅ Poll ditutup — hasil dikirim di atas/bawah",
        ], "warn");
      }
      return card(0, false);
    },
    isCancelled: () => poll.closed === true || poll.deleted === true,
  }).catch(() => {});
}

/**
 * Dipanggil connection.js pas startup: poll aktif dipasang ulang
 * timer-nya; yang kelewat ditutup + hasil dikirim.
 */
export function restorePolls(sock) {
  let rearmed = 0, missed = 0;
  try {
    persistLoad(KEY);
    const now = Date.now();
    for (const [chatId, polls] of Object.entries(global.novaPolls || {})) {
      for (const [id, p] of Object.entries(polls || {})) {
        if (!p || p.closed) continue;
        if (Number(p.closedAt) > now) {
          armPollTimer(sock, chatId, id);
          rearmed++;
        } else {
          closePollNow(sock, chatId, id, "kelewat pas bot mati").catch(() => {});
          missed++;
        }
      }
    }
  } catch {}
  return { rearmed, missed };
}
