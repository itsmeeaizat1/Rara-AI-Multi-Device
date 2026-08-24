// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { claraWrap, claraLine } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "poll",
  alias: ["poll", "survei2", "vote"],
  category: "group",
  description: "Polling/voting interaktif dengan auto-close timer dan real-time results",
  usage: ".poll <command> [args]",
  example: ".poll create Makan apa? | Nasi Goreng, Mie Ayam, Bakso",
  isOwner: false,
  isPremium: false,
  isGroup: true,
  isPrivate: false,
  cooldown: 10,
  energi: 0,
  isEnabled: true,
};

// === In-memory poll store ===
if (!global.novaPolls) global.novaPolls = {};

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
  if (ms < 60000) return `${Math.floor(ms / 1000)} detik`;
  if (ms < 3600000) return `${Math.floor(ms / 60000)} menit`;
  return `${Math.floor(ms / 3600000)} jam ${Math.floor((ms % 3600000) / 60000)} menit`;
}

function generatePollId() {
  return `POLL-${Date.now().toString(36).toUpperCase().slice(-5)}`;
}

function getActivePolls(chatId) {
  const polls = global.novaPolls[chatId] || {};
  return Object.entries(polls)
    .filter(([_, p]) => !p.closed)
    .sort((a, b) => a[1].createdAt - b[1].createdAt);
}

function buildResultText(poll) {
  const counts = new Array(poll.options.length).fill(0);
  const votersByOption = poll.options.map(() => []);

  for (const [voterJid, optIndices] of Object.entries(poll.votes)) {
    for (const idx of optIndices) {
      counts[idx]++;
      votersByOption[idx].push(voterJid);
    }
  }

  const totalVoters = Object.keys(poll.votes).length;
  const totalVotes = counts.reduce((a, b) => a + b, 0);

  const maxVotes = Math.max(...counts);
  const winners = counts
    .map((c, i) => ({ count: c, index: i }))
    .filter((o) => o.count === maxVotes && o.count > 0);

  let lines = [];

  poll.options.forEach((opt, i) => {
    const count = counts[i];
    const pct = totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0;
    lines.push(`${i + 1}. ${opt} - ${pct}% (${count} suara)`);
  });

  lines.push("");
  lines.push(`Total Voter: ${totalVoters} | Total Suara: ${totalVotes}`);

  if (poll.closed) {
    if (winners.length === 1) {
      lines.push("");
      lines.push(`Pemenang: ${poll.options[winners[0].index]} (${maxVotes} suara)`);
    } else if (winners.length > 1) {
      lines.push("");
      lines.push(`Seri: ${winners.map((w) => poll.options[w.index]).join(", ")} (${maxVotes} suara)`);
    } else {
      lines.push("");
      lines.push("Tidak ada pemenang (0 suara)");
    }
  }

  return lines.join("\n");
}

async function handler(m, { sock }) {
  const text = m.text || "";
  const chatId = m.chat;

  if (!global.novaPolls[chatId]) global.novaPolls[chatId] = {};

  const args = text.trim().split(/\s+/);
  const subCmd = (args[0] || "").toLowerCase();

  // === HELP ===
  if (!text || subCmd === "help" || subCmd === "bantuan") {
    const helpText = claraWrap("Poll", [
      "Sistem polling interaktif dengan auto-close timer",
      "",
      "Perintah tersedia:",
      "",
      ".poll create <pertanyaan> | <opsi1>, <opsi2>, ...",
      "Buat poll baru (default timer 5 menit)",
      "",
      ".poll create <durasi> <pertanyaan> | <opsi1>, ...",
      "Buat poll dengan timer custom (10m, 1h, 30s)",
      "",
      ".poll create multi <pertanyaan> | <opsi1>, ...",
      "Buat poll pilihan ganda (bisa pilih lebih dari 1)",
      "",
      ".poll create multi <durasi> <pertanyaan> | <opsi1>, ...",
      "Pilihan ganda dengan timer custom",
      "",
      ".poll vote <pollId> <nomorOpsi>",
      "Vote pada poll aktif (contoh: .poll vote POLL-A1B2C 2)",
      "",
      ".poll hasil [pollId]",
      "Lihat hasil real-time poll aktif atau poll terbaru",
      "",
      ".poll list",
      "Lihat daftar poll aktif di grup ini",
      "",
      ".poll close [pollId]",
      "Tutup poll secara manual (admin/creator only)",
      "",
      ".poll delete <pollId>",
      "Hapus poll dari memory (admin/creator only)",
      "",
      "Contoh cepat:",
      ".poll create Makan siang? | Nasi Goreng, Mie Ayam, Bakso",
      ".poll create 30m Siapa hadir meetup? | Ya, Tidak, Mungkin",
      ".poll create multi Pilih hobi! | Game, Musik, Olahraga, Baca",
    ].join("\n"));
    return m.reply( helpText, { commandName: "poll" });
  }

  // === CREATE ===
  if (subCmd === "create" || subCmd === "buat") {
    let rest = text.slice(text.indexOf(" ") + 1).trim();

    if (!rest) {
      return m.reply(claraWrap("Poll", "Format salah!\n\nKetik .poll help untuk panduan", "error"));
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
      return m.reply(claraWrap("Poll", "Format salah! Gunakan: pertanyaan | opsi1, opsi2, ...", "error"));
    }

    const question = pipeParts[0];
    const options = pipeParts[1].split(",").map((o) => o.trim()).filter(Boolean);

    if (options.length < 2) {
      return m.reply(claraWrap("Poll", "Minimal 2 opsi!", "error"));
    }
    if (options.length > 10) {
      return m.reply(claraWrap("Poll", "Maksimal 10 opsi!", "error"));
    }
    if (question.length > 200) {
      return m.reply(claraWrap("Poll", "Pertanyaan terlalu panjang (max 200 karakter)", "error"));
    }

    const activeCount = getActivePolls(chatId).length;
    if (activeCount >= 3) {
      return m.reply(claraWrap("Poll", "Maksimal 3 poll aktif per grup!\n\nTutup poll lain dulu dengan .poll close", "warn"));
    }

    const pollId = generatePollId();
    const createdAt = Date.now();
    const closedAt = createdAt + timerMs;

    global.novaPolls[chatId][pollId] = {
      id: pollId,
      question,
      options,
      votes: {},
      isMultiple,
      timerMs,
      createdAt,
      closedAt,
      closed: false,
      creator: m.sender,
      creatorName: m.pushName || m.sender.split("@")[0],
    };

    const timerStr = formatDuration(timerMs);
    const modeStr = isMultiple ? "Pilihan Ganda" : "Pilihan Tunggal";

    const display = claraWrap("Poll Created", [
      question,
      "",
      `ID: ${pollId}`,
      `Mode: ${modeStr}`,
      `Timer: ${timerStr}`,
      `Dibuat oleh: ${m.pushName || m.sender.split("@")[0]}`,
      "",
      "Opsi:",
      ...options.map((opt, i) => `${i + 1}. ${opt}`),
      "",
      `Ketik: .poll vote ${pollId} <nomor>`,
      `Contoh: .poll vote ${pollId} 2`,
      "",
      `Lihat hasil: .poll hasil ${pollId}`,
      `Tutup manual: .poll close ${pollId}`,
    ]);

    await m.reply( display, { commandName: "poll" });

    // Send native WA poll too for convenience
    try {
      await sock.sendMessage(m.chat, {
        poll: {
          name: `${question} [${pollId}]`,
          values: options,
          selectableCount: isMultiple ? options.length : 1,
        },
      });
    } catch (e) {
      // Native poll optional
    }

    // Auto-close timer
    setTimeout(async () => {
      try {
        const poll = global.novaPolls[chatId]?.[pollId];
        if (!poll || poll.closed) return;

        poll.closed = true;
        poll.closedAt = Date.now();

        const result = buildResultText(poll);
        await sock.sendMessage(chatId, {
          text: claraWrap("Poll Auto-Closed", [
            `Poll ${pollId} telah berakhir (waktu habis)`,
            "",
            result,
          ]),
        });
      } catch (e) {
        // Silent fail
      }
    }, timerMs);

    return;
  }

  // === VOTE ===
  if (subCmd === "vote" || subCmd === "pilih") {
    const pollId = (args[1] || "").toUpperCase().trim();
    const optNum = parseInt(args[2]);

    if (!pollId || !optNum) {
      return m.reply(claraWrap("Poll", "Format: .poll vote <pollId> <nomorOpsi>\n\nContoh: .poll vote POLL-A1B2C 2", "error"));
    }

    const poll = global.novaPolls[chatId]?.[pollId];
    if (!poll) {
      return m.reply(claraWrap("Poll", `Poll ${pollId} tidak ditemukan!`, "error"));
    }
    if (poll.closed) {
      return m.reply(claraWrap("Poll", `Poll ${pollId} sudah ditutup!`, "warn"));
    }
    if (optNum < 1 || optNum > poll.options.length) {
      return m.reply(claraWrap("Poll", `Pilih nomor 1 sampai ${poll.options.length}!`, "error"));
    }

    const optIndex = optNum - 1;

    if (poll.votes[m.sender]) {
      if (poll.isMultiple) {
        const idx = poll.votes[m.sender].indexOf(optIndex);
        if (idx >= 0) {
          poll.votes[m.sender].splice(idx, 1);
          return m.reply(claraWrap("Poll", `Vote dibatalkan: ${poll.options[optIndex]}\n\nKetik .poll hasil ${pollId} untuk lihat hasil`, "info"));
        } else {
          poll.votes[m.sender].push(optIndex);
        }
      } else {
        poll.votes[m.sender] = [optIndex];
      }
    } else {
      poll.votes[m.sender] = [optIndex];
    }

    const votedOpts = poll.votes[m.sender].map((i) => poll.options[i]).join(", ");
    return m.reply(claraWrap("Poll Vote", [
      "Vote tercatat!",
      `Pilihan: ${votedOpts}`,
      `Poll: ${pollId}`,
      "",
      `Lihat hasil: .poll hasil ${pollId}`,
    ], "success"));
  }

  // === HASIL / RESULTS ===
  if (subCmd === "hasil" || subCmd === "result" || subCmd === "hasil") {
    let pollId = (args[1] || "").toUpperCase().trim();

    if (!pollId) {
      const active = getActivePolls(chatId);
      if (active.length === 0) {
        const allPolls = Object.entries(global.novaPolls[chatId]);
        if (allPolls.length === 0) {
          return m.reply(claraWrap("Poll", "Belum ada poll di grup ini!", "warn"));
        }
        const latest = allPolls.sort((a, b) => b[1].createdAt - a[1].createdAt)[0];
        pollId = latest[0];
      } else {
        pollId = active[active.length - 1][0];
      }
    }

    const poll = global.novaPolls[chatId]?.[pollId];
    if (!poll) {
      return m.reply(claraWrap("Poll", `Poll ${pollId} tidak ditemukan!`, "error"));
    }

    const resultText = buildResultText(poll);
    const status = poll.closed ? "CLOSED" : "AKTIF";
    const remaining = poll.closed ? "-" : formatDuration(Math.max(0, poll.closedAt - Date.now()));

    return m.reply(claraWrap(`Poll Result [${status}]`, [
      `ID: ${pollId}`,
      `Pertanyaan: ${poll.question}`,
      `Sisa waktu: ${remaining}`,
      "",
      resultText,
    ]));
  }

  // === LIST ===
  if (subCmd === "list" || subCmd === "daftar") {
    const polls = Object.entries(global.novaPolls[chatId]);
    if (polls.length === 0) {
      return m.reply(claraWrap("Poll", "Belum ada poll di grup ini!", "info"));
    }

    const lines = polls.map(([id, p]) => {
      const status = p.closed ? "CLOSED" : "AKTIF";
      const totalVoters = Object.keys(p.votes).length;
      const remaining = p.closed ? "-" : formatDuration(Math.max(0, p.closedAt - Date.now()));
      return `${id} [${status}]\n   Q: ${p.question}\n   Votes: ${totalVoters} orang | Sisa: ${remaining}`;
    });

    return m.reply(claraWrap("Poll List", lines));
  }

  // === CLOSE ===
  if (subCmd === "close" || subCmd === "tutup") {
    let pollId = (args[1] || "").toUpperCase().trim();

    if (!pollId) {
      const active = getActivePolls(chatId);
      if (active.length === 0) {
        return m.reply(claraWrap("Poll", "Tidak ada poll aktif untuk ditutup!", "warn"));
      }
      pollId = active[active.length - 1][0];
    }

    const poll = global.novaPolls[chatId]?.[pollId];
    if (!poll) {
      return m.reply(claraWrap("Poll", `Poll ${pollId} tidak ditemukan!`, "error"));
    }
    if (poll.closed) {
      return m.reply(claraWrap("Poll", `Poll ${pollId} sudah ditutup!`, "warn"));
    }

    const groupMeta = await sock.groupMetadata(chatId).catch(() => null);
    const isAdmin = groupMeta?.participants?.find((p) => p.id === m.sender)?.admin;
    const isCreator = poll.creator === m.sender;

    if (!isAdmin && !isCreator && !m.isOwner) {
      return m.reply(claraWrap("Poll", "Hanya admin, creator poll, atau owner yang bisa menutup poll!", "error"));
    }

    poll.closed = true;
    poll.closedAt = Date.now();

    const resultText = buildResultText(poll);
    return m.reply(claraWrap("Poll Closed", [
      `Poll ${pollId} ditutup oleh ${m.pushName || m.sender.split("@")[0]}`,
      "",
      resultText,
    ], "success"));
  }

  // === DELETE ===
  if (subCmd === "delete" || subCmd === "hapus" || subCmd === "del") {
    const pollId = (args[1] || "").toUpperCase().trim();
    if (!pollId) {
      return m.reply(claraWrap("Poll", "Format: .poll delete <pollId>", "error"));
    }

    const poll = global.novaPolls[chatId]?.[pollId];
    if (!poll) {
      return m.reply(claraWrap("Poll", `Poll ${pollId} tidak ditemukan!`, "error"));
    }

    const groupMeta = await sock.groupMetadata(chatId).catch(() => null);
    const isAdmin = groupMeta?.participants?.find((p) => p.id === m.sender)?.admin;
    const isCreator = poll.creator === m.sender;

    if (!isAdmin && !isCreator && !m.isOwner) {
      return m.reply(claraWrap("Poll", "Hanya admin, creator, atau owner yang bisa hapus poll!", "error"));
    }

    delete global.novaPolls[chatId][pollId];
    return m.reply(claraWrap("Poll", `Poll ${pollId} berhasil dihapus!`, "success"));
  }

  // === UNKNOWN ===
  return m.reply(claraWrap("Poll", [
    `Perintah tidak dikenal: ${subCmd}`,
    "",
    "Ketik .poll help untuk melihat semua perintah",
  ], "warn"));
}

export { pluginConfig as config, handler };
