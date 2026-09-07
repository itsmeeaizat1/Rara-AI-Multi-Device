// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// All Downloader — fallback chain antar versi (V1 → V2 → V3 → V4).
// Command tiap versi TETAP TERPISAH (biar keliatan engine mana yang down),
// tapi kalau versi itu gagal, otomatis nyoba versi berikutnya.
// Sukses via fallback → notice singkat versi mana yang down tadi.

import { claraWrap } from "./nova-menu-style.js";

const VERSIONS = {
  v1: { label: ".alldl (V1)", file: "../../plugins/download/alldl.js" },
  v2: { label: ".alldownloader (V2)", file: "../../plugins/download/alldownloader.js" },
  v3: { label: ".alldl3 (V3)", file: "../../plugins/download/alldownloaderv3.js" },
  v4: { label: ".alldl4 (V4)", file: "../../plugins/download/alldownloaderv4.js" },
};

const CHAINS = {
  v1: ["v1", "v2", "v3", "v4"],
  v2: ["v2", "v3", "v4"],
  v3: ["v3", "v4"],
};

const ATTEMPT_TIMEOUT = 150000; // guard biar satu versi gak nge-hang satu chain

function firstLine(t) {
  if (!t) return "gagal";
  const lines = String(t)
    .split("\n")
    .map((s) => s.replace(/[「✦」|│•]/g, "").trim())
    .filter((s) => s.length > 4);
  if (!lines.length) return "gagal";
  // utamakan baris yang ada kata kunci alasan gagalnya
  const reason =
    lines.find((s) => /(gagal|error|down|timeout|tidak|server|api|gak|diproses|unduh|didukung|dikenal|private|unavailable|403|404|500)/i.test(s)) ||
    lines[0];
  return reason.slice(0, 90) || "gagal";
}

// Rekam satu attempt: media (sock.sendMessage) dikirim LIVE, teks (m.reply)
// DITAHAN. Sukses → flush teks tertahan (urutan tetap). Gagal → buang teksnya,
// lanjut versi berikutnya — biar error tiap versi gak numpuk jadi spam.
function makeRecorder(m, sock) {
  let mediaSent = false;
  let killed = false;
  let lastText = null;
  const held = [];

  const wrappedSock = new Proxy(sock, {
    get(target, prop) {
      if (prop === "sendMessage") {
        return async (jid, content, opts) => {
          if (killed) return {};
          const c = content || {};
          if (c.video || c.audio || c.image || c.document || c.sticker) mediaSent = true;
          return target.sendMessage(jid, content, opts);
        };
      }
      const v = target[prop];
      return typeof v === "function" ? v.bind(target) : v;
    },
  });

  const wrappedM = new Proxy(m, {
    get(target, prop) {
      if (prop === "reply") {
        return async (...a) => {
          if (killed) return;
          if (typeof a[0] === "string") lastText = a[0];
          held.push(a);
          return {};
        };
      }
      const v = target[prop];
      return typeof v === "function" ? v.bind(target) : v;
    },
  });

  return {
    sock: wrappedSock,
    m: wrappedM,
    mediaSent: () => mediaSent,
    lastText: () => lastText,
    kill: () => {
      killed = true;
    },
    flush: async () => {
      for (const a of held) {
        try {
          await m.reply(...a);
        } catch {}
      }
    },
  };
}

async function runAttempt(mod, m, ctx) {
  const rec = makeRecorder(m, ctx.sock || ctx.conn);
  const attemptCtx = {
    ...ctx,
    sock: rec.sock,
    conn: rec.sock,
    __novaAllDlAttempt: true,
  };
  let err = null;
  let timer = null;
  try {
    await Promise.race([
      mod.handler(rec.m, attemptCtx),
      new Promise((_, rej) => {
        timer = setTimeout(() => rej(new Error("attempt timeout")), ATTEMPT_TIMEOUT);
      }),
    ]);
  } catch (e) {
    err = e?.message || "error";
    // timeout: matiin attempt lama biar gak nembus kirim media dobel belakangan
    if (err === "attempt timeout" && !rec.mediaSent()) rec.kill();
  } finally {
    clearTimeout(timer);
  }
  return { rec, err };
}

export async function runAllDlFallback(selfKey, m, ctx = {}) {
  const chain = CHAINS[selfKey] || [selfKey];
  const fails = [];

  for (const key of chain) {
    const mod = await import(new URL(VERSIONS[key].file, import.meta.url).href);
    const { rec, err } = await runAttempt(mod, m, ctx);

    if (rec.mediaSent()) {
      await rec.flush();
      if (fails.length) {
        try {
          await m.reply(
            claraWrap(
              "All Downloader",
              `Engine ${VERSIONS[selfKey].label} lagi down:\n` +
                fails.map((f) => `• ${f}`).join("\n") +
                `\n\nSukses via ${VERSIONS[key].label}.`
            )
          );
        } catch {}
      }
      return true;
    }

    fails.push(`${VERSIONS[key].label} — ${firstLine(rec.lastText() || err)}`);
  }

  try {
    await m.reply(
      claraWrap(
        "All Downloader",
        "Semua engine downloader gagal memproses link ini:\n\n" +
          fails.map((f) => `• ${f}`).join("\n") +
          "\n\nTiap versi punya engine berbeda — kalau semua gagal, biasanya link-nya privat/sudah dihapus. Coba lagi beberapa saat."
      )
    );
  } catch {}
  return false;
}
