// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
// ANTREAN KIRIM PER-CHAT (QA Gate 3, owner 9 Okt 2026):
// Semua balasan lewat antrean FIFO per-JID + jeda acak human-like antar kirim
// ke chat yang sama — anti burst instan beruntun (risiko banned WA).
// Chat beda jalan PARALEL (gak saling nunggu), chat sama SERIAL + jeda acak.

const DEFAULT_MIN_DELAY = 350; // ms — jarak minimal antar kirim ke chat sama
const DEFAULT_MAX_DELAY = 1200; // ms — jeda acak human-like cap
const MAX_QUEUE_WARN = 50; // antrean numpuk lebih dr ini = warning log

let _minDelay = DEFAULT_MIN_DELAY;
let _maxDelay = DEFAULT_MAX_DELAY;
let _enabled = true;

// jid -> { tail: Promise (serial chain), lastAt: number (ms kirim sebelumnya), pending: int }
const _chains = new Map();

function _rand(min, max) {
  return min + Math.floor(Math.random() * (max - min + 1));
}

export function _setQueueDelaysForTest(min, max) {
  _minDelay = min;
  _maxDelay = max;
}

export function _setQueueEnabledForTest(v) {
  _enabled = !!v;
}

export function __resetQueueForTest() {
  _chains.clear();
  _minDelay = DEFAULT_MIN_DELAY;
  _maxDelay = DEFAULT_MAX_DELAY;
  _enabled = true;
}

export function __getQueueStateForTest() {
  return {
    minDelay: _minDelay,
    maxDelay: _maxDelay,
    enabled: _enabled,
    chats: _chains.size,
    lastAt: Object.fromEntries([..._chains.entries()].map(([j, c]) => [j, c.lastAt])),
    pending: Object.fromEntries([..._chains.entries()].map(([j, c]) => [j, c.pending])),
  };
}

/**
 * Bungkus sock.sendMessage dengan antrean per-chat + jeda acak human-like.
 * Dipanggil SEKALI per socket (guard __queueWrapped anti dobel-wrap saat reload).
 * Return value & error dari sendMessage asli diteruskan apa adanya;
 * error satu job GAK merusak antrean job berikutnya.
 */
export function wrapSendQueue(sock) {
  if (!sock || typeof sock.sendMessage !== "function") return sock;
  if (sock.__queueWrapped) return sock;
  sock.__queueWrapped = true;

  const orig = sock.sendMessage.bind(sock);

  sock.sendMessage = async function queuedSend(jid, content, opts) {
    // Di luar antrean: queue mati, jid gak valid, atau internal (react chip kecil)
    const isReact = content && typeof content === "object" && "react" in content;
    if (!_enabled || !jid || typeof jid !== "string" || isReact) {
      return orig(jid, content, opts);
    }

    let chain = _chains.get(jid);
    if (!chain) {
      chain = { tail: Promise.resolve(), lastAt: 0, pending: 0 };
      _chains.set(jid, chain);
    }
    chain.pending += 1;
    if (chain.pending > MAX_QUEUE_WARN && !chain.warned) {
      chain.warned = true; // satu warning per burst, reset pas antrean kosong
      console.warn(`[send-queue] antrean ${jid} numpuk ${chain.pending} job — cek loop kirim`);
    }

    const job = chain.tail.then(async () => {
      // jeda human-like: pastikan jarak dr kirim sebelumnya >= jeda acak
      if (chain.lastAt) {
        const need = chain.lastAt + _rand(_minDelay, _maxDelay) - Date.now();
        if (need > 0) await new Promise((r) => setTimeout(r, need));
      }
      try {
        return await orig(jid, content, opts);
      } finally {
        chain.lastAt = Date.now();
      }
    });

    // error job gak boleh matiin chain
    chain.tail = job.catch(() => {});
    try {
      return await job;
    } finally {
      chain.pending -= 1;
      if (chain.pending <= 0) chain.warned = false;
    }
  };

  return sock;
}

// ── QA Gate 5: graceful shutdown ─────────────────────────────────────────────
// Deploy/restart gak boleh motong reply yang lagi nanggung di antrean.
// drainSendQueue nunggu semua job pending kekirim (atau timeout), dipanggil
// dari SIGINT/SIGTERM handler sebelum koneksi dimatikan.

export function getQueueDepth() {
  let total = 0;
  for (const c of _chains.values()) total += Math.max(0, c.pending);
  return total;
}

export async function drainSendQueue(timeoutMs = 8000, pollMs = 50) {
  const deadline = Date.now() + timeoutMs;
  while (getQueueDepth() > 0) {
    if (Date.now() >= deadline) return false;
    const wait = Math.min(pollMs, Math.max(1, deadline - Date.now()));
    await new Promise((r) => setTimeout(r, wait));
  }
  return true;
}
