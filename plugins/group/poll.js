// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// ═════════════════════════════════════════════
// 🔹 Poll — .poll
// 🔹 Polling interaktif + native WA poll, auto-close timer.
// 🔹 UPGRADE 14 Sep 2026 (request owner "ya poll"):
//   (1) PERSIST — dulu RAM murni: restart = votes lenyap, timer mati.
//       Sekinian via nova-poll-engine (db + restore + re-arm timer).
//   (2) LIVE COUNTDOWN 🕒 di kartu poll → auto-close; close/delete
//       → closing adaptif (bukan "waktu habis" menyesatkan).
//   (3) BAR METER ▰▱ standar di semua hasil + pemenang 🏆.
// ═════════════════════════════════════════════

import { novaWrap } from "../../src/lib/nova-menu-style.js";
import {
  pollPersist,
  buildPollResult,
  closePollNow,
  armPollTimer,
  firePollTicker,
} from "../../src/lib/nova-poll-engine.js";

const pluginConfig = {
  name: "poll",
  alias: ["poll"],
  category: "group",
  description: "Polling/voting interaktif + native WA poll, auto-close timer, hasil bar meter",
  usage: ".poll <command> [args]",
  example: ".poll create Makan apa? | Nasi Goreng, Mie Ayam, Bakso",
  isOwner: false, isPremium: false, isGroup: true, isPrivate: false,
  cooldown: 10, energi: 0, isEnabled: true,
};

function parseDuration(str) {
  if (!str) return null;
  const match = str.match(/^(\d+)([smhd])$/i);
  if (!match) return null;
  const num = parseInt(match[1]);
  const unit = match[2].toLowerCase();
  const multipliers = { s: 1000, m: 60000, h: 3600000, d: 86400000 };
  return num * multipliers[unit];
}

function formatDuration(ms) {
  if (ms <= 0) return "sekarang";
  if (ms < 60000) return `${Math.floor(ms / 1000)} detik`;
  if (ms < 3600000) return `${Math.floor(ms / 60000)} menit`;
  return `${Math.floor(ms / 3600000)} jam ${Math.floor((ms % 3600000) / 60000)} menit`;
}

function generatePollId() {
  return `POLL-${Date.now().toString(36).toUpperCase().slice(-5)}${Math.random().toString(36).slice(2, 4).toUpperCase()}`;
}

function getActivePolls(chatId) {
  const polls = global.novaPolls[chatId] || {};
  return Object.entries(polls)
    .filter(([_, p]) => !p.closed)
    .sort((a, b) => a[1].createdAt - b[1].createdAt);
}

async function handler(m, { sock }) {
  try {
    const text = m.text || "";
    const chatId = m.chat;

    if (!global.novaPolls[chatId]) global.novaPolls[chatId] = {};

    const args = text.trim().split(/\s+/);
    const subCmd = (args[0] || "").toLowerCase();

    // === HELP ===
    if (!text || subCmd === "help" || subCmd === "bantuan") {
      return m.reply(novaWrap("Poll", [
        "📊 *POLLING INTERAKTIF — AUTO-CLOSE TIMER*",
        "",
        "Poll text + native WA poll sekaligus. Hasil bar meter ▰▱, tahan restart.",
        "",
        "• *.poll create <tanya> | <opsi1>, <opsi2>, ...* — timer 5 mnt",
        "• *.poll create <durasi> <tanya> | <opsi>* — 30s/10m/1h/1d",
        "• *.poll create multi <tanya> | <opsi>* — pilihan ganda",
        "",
        "• *.poll vote <id> <nomor>* — vote (multi: ketik lagi buat toggle)",
        "• *.poll hasil [id]* — hasil real-time (bar ▰▱)",
        "• *.poll list* — poll aktif di grup",
        "• *.poll close [id]* — tutup manual (admin/creator)",
        "• *.poll delete <id>* — hapus poll",
        "",
        "Contoh: *.poll create 30m Makan siang? | Nasi Goreng, Mie Ayam, Bakso*",
      ]));
    }

    // === CREATE ===
    if (subCmd === "create" || subCmd === "buat") {
      let rest = text.slice(text.indexOf(" ") + 1).trim();
      if (!rest) {
        return m.reply(novaWrap("Poll", "Format salah!\n\nKetik .poll help untuk panduan", "error"));
      }

      let isMultiple = false;
      let timerMs = 5 * 60 * 1000;

      if (rest.toLowerCase().startsWith("multi ")) {
        isMultiple = true;
        rest = rest.slice(6).trim();
      }

      const durMatch = rest.match(/^(\d+[smhd])\s+/i);
      if (durMatch) {
        const parsed = parseDuration(durMatch[1]);
        if (parsed && parsed >= 10000 && parsed <= 86400000) {
          timerMs = parsed;
          rest = rest.slice(durMatch[0].length).trim();
        }
      }

      const pipeParts = rest.split("|").map((p) => p.trim());
      if (pipeParts.length < 2) {
        return m.reply(novaWrap("Poll", "Format salah! Gunakan: pertanyaan | opsi1, opsi2, ...", "error"));
      }

      const question = pipeParts[0];
      const options = pipeParts[1].split(",").map((o) => o.trim()).filter(Boolean);

      if (options.length < 2) {
        return m.reply(novaWrap("Poll", "Minimal 2 opsi!", "error"));
      }
      if (options.length > 10) {
        return m.reply(novaWrap("Poll", "Maksimal 10 opsi!", "error"));
      }
      if (question.length > 200) {
        return m.reply(novaWrap("Poll", "Pertanyaan terlalu panjang (max 200 karakter)", "error"));
      }

      const activeCount = getActivePolls(chatId).length;
      if (activeCount >= 3) {
        return m.reply(novaWrap("Poll", "Maksimal 3 poll aktif per grup!\n\nTutup poll lain dulu dengan .poll close", "warn"));
      }

      const pollId = generatePollId();
      const poll = {
        id: pollId,
        question,
        options,
        votes: {},
        isMultiple,
        timerMs,
        createdAt: Date.now(),
        closedAt: Date.now() + timerMs,
        closed: false,
        deleted: false,
        creator: m.sender,
        creatorName: m.pushName || m.sender.split("@")[0],
      };
      global.novaPolls[chatId][pollId] = poll;
      pollPersist();
      armPollTimer(sock, chatId, pollId);
      await m.react("🐣");

      // native WA poll juga (optional — fail gak fatal)
      try {
        await sock.sendMessage(m.chat, {
          poll: { name: `${question} [${pollId}]`, values: options, selectableCount: isMultiple ? options.length : 1 },
        });
      } catch {}

      // 🔹 LIVE COUNTDOWN 🕒 — kartu nge-tick sampai auto-close;
      // close/delete → closing adaptif
      return firePollTicker(sock, chatId, m, poll);
    }

    // === VOTE ===
    if (subCmd === "vote" || subCmd === "pilih") {
      const pollId = (args[1] || "").toUpperCase().trim();
      const optNum = parseInt(args[2]);

      if (!pollId || !optNum) {
        return m.reply(novaWrap("Poll", "Format: .poll vote <pollId> <nomorOpsi>\n\n💡 Contoh: .poll vote POLL-A1B2C 2", "error"));
      }

      const poll = global.novaPolls[chatId]?.[pollId];
      if (!poll) {
        return m.reply(novaWrap("Poll", `Poll ${pollId} tidak ditemukan!`, "error"));
      }
      if (poll.closed) {
        return m.reply(novaWrap("Poll", `Poll ${pollId} sudah ditutup!`, "warn"));
      }
      if (optNum < 1 || optNum > poll.options.length) {
        return m.reply(novaWrap("Poll", `Pilih nomor 1 sampai ${poll.options.length}!`, "error"));
      }

      const optIndex = optNum - 1;
      if (poll.votes[m.sender]) {
        if (poll.isMultiple) {
          const idx = poll.votes[m.sender].indexOf(optIndex);
          if (idx >= 0) {
            poll.votes[m.sender].splice(idx, 1);
            pollPersist(); // votes persist (restart gak lenyap)
            return m.reply(novaWrap("Poll", `Vote dibatalkan: ${poll.options[optIndex]}\n\nKetik .poll hasil ${pollId} untuk lihat hasil`, "info"));
          }
          poll.votes[m.sender].push(optIndex);
        } else {
          poll.votes[m.sender] = [optIndex];
        }
      } else {
        poll.votes[m.sender] = [optIndex];
      }
      pollPersist();

      const votedOpts = poll.votes[m.sender].map((i) => poll.options[i]).join(", ");
      return m.reply(novaWrap("Poll Vote", [
        "✅ Vote tercatat!",
        `Pilihan: ${votedOpts}`,
        `Poll: ${pollId}`,
        "",
        `Hasil: .poll hasil ${pollId}`,
      ], "success"));
    }

    // === HASIL / RESULTS ===
    if (subCmd === "hasil" || subCmd === "result" || subCmd === "results") {
      let pollId = (args[1] || "").toUpperCase().trim();

      if (!pollId) {
        const active = getActivePolls(chatId);
        if (active.length === 0) {
          const allPolls = Object.entries(global.novaPolls[chatId]);
          if (allPolls.length === 0) {
            return m.reply(novaWrap("Poll", "Belum ada poll di grup ini!", "warn"));
          }
          pollId = allPolls.sort((a, b) => b[1].createdAt - a[1].createdAt)[0][0];
        } else {
          pollId = active[active.length - 1][0];
        }
      }

      const poll = global.novaPolls[chatId]?.[pollId];
      if (!poll) {
        return m.reply(novaWrap("Poll", `Poll ${pollId} tidak ditemukan!`, "error"));
      }

      const status = poll.closed ? "CLOSED" : "AKTIF";
      const remaining = poll.closed ? "-" : formatDuration(Math.max(0, poll.closedAt - Date.now()));

      return m.reply(novaWrap(`Poll Result [${status}]`, [
        `ID: ${pollId}`,
        `Pertanyaan: ${poll.question}`,
        `Sisa waktu: ${remaining}`,
        "",
        buildPollResult(poll),
      ]));
    }

    // === LIST ===
    if (subCmd === "list" || subCmd === "daftar") {
      const polls = Object.entries(global.novaPolls[chatId]);
      if (polls.length === 0) {
        return m.reply(novaWrap("Poll", "Belum ada poll di grup ini!", "info"));
      }

      const lines = polls.map(([id, p]) => {
        const status = p.closed ? "🔒 CLOSED" : "🕒 AKTIF";
        const totalVoters = Object.keys(p.votes).length;
        const remaining = p.closed ? "-" : formatDuration(Math.max(0, p.closedAt - Date.now()));
        return `${id} [${status}]\n   Q: ${p.question}\n   Votes: ${totalVoters} orang | Sisa: ${remaining}`;
      });

      return m.reply(novaWrap("Poll List", lines));
    }

    // === CLOSE ===
    if (subCmd === "close" || subCmd === "tutup") {
      let pollId = (args[1] || "").toUpperCase().trim();

      if (!pollId) {
        const active = getActivePolls(chatId);
        if (active.length === 0) {
          return m.reply(novaWrap("Poll", "Tidak ada poll aktif untuk ditutup!", "warn"));
        }
        pollId = active[active.length - 1][0];
      }

      const poll = global.novaPolls[chatId]?.[pollId];
      if (!poll) {
        return m.reply(novaWrap("Poll", `Poll ${pollId} tidak ditemukan!`, "error"));
      }
      if (poll.closed) {
        return m.reply(novaWrap("Poll", `Poll ${pollId} sudah ditutup!`, "warn"));
      }

      const groupMeta = await sock.groupMetadata(chatId).catch(() => null);
      const isAdmin = groupMeta?.participants?.find((p) => p.id === m.sender)?.admin;
      const isCreator = poll.creator === m.sender;

      if (!isAdmin && !isCreator && !m.isOwner) {
        return m.reply(novaWrap("Poll", "Hanya admin, creator poll, atau owner yang bisa menutup poll!", "error"));
      }

      // closePollNow: matiin timer + persist + kirim hasil
      await closePollNow(sock, chatId, pollId, `ditutup oleh ${m.pushName || m.sender.split("@")[0]}`, { silent: true });
      return m.reply(novaWrap("Poll Closed", [
        `Poll ${pollId} ditutup oleh ${m.pushName || m.sender.split("@")[0]}`,
        "",
        buildPollResult(poll),
      ], "success"));
    }

    // === DELETE ===
    if (subCmd === "delete" || subCmd === "hapus" || subCmd === "del") {
      const pollId = (args[1] || "").toUpperCase().trim();
      if (!pollId) {
        return m.reply(novaWrap("Poll", "Format: .poll delete <pollId>", "error"));
      }

      const poll = global.novaPolls[chatId]?.[pollId];
      if (!poll) {
        return m.reply(novaWrap("Poll", `Poll ${pollId} tidak ditemukan!`, "error"));
      }

      const groupMeta = await sock.groupMetadata(chatId).catch(() => null);
      const isAdmin = groupMeta?.participants?.find((p) => p.id === m.sender)?.admin;
      const isCreator = poll.creator === m.sender;

      if (!isAdmin && !isCreator && !m.isOwner) {
        return m.reply(novaWrap("Poll", "Hanya admin, creator, atau owner yang bisa hapus poll!", "error"));
      }

      poll.deleted = true; // marker → ticker closing "DIHAPUS"
      const tid = global.__pollTimers?.[`${chatId}:${pollId}`];
      if (tid) { clearTimeout(tid); delete global.__pollTimers[`${chatId}:${pollId}`]; }
      delete global.novaPolls[chatId][pollId];
      pollPersist();
      return m.reply(novaWrap("Poll", `Poll ${pollId} berhasil dihapus! ✅`, "success"));
    }

    // === UNKNOWN ===
    return m.reply(novaWrap("Poll", [
      `Perintah tidak dikenal: ${subCmd}`,
      "",
      "Ketik .poll help untuk melihat semua perintah",
    ], "warn"));
  } catch (err) {
    console.error("[poll]", err.message);
    await m.react("❌");
    return m.reply(novaWrap("Poll", "⚠️ Ada error pas proses poll. Coba lagi ya."));
  }
}

export { pluginConfig as config, handler };
