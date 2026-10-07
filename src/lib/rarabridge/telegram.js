// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
// Telegram Bot API client — fetch long-polling, TANPA dependency eksternal.
// Dipakai oleh src/lib/rarabridge/ (fitur .bridge multi-platform).
// Semua HTTP bisa di-seam lewat _setTelegramHttpForTest buat e2e.
//
// Batas platform: file max 50 MB (upload multipart & getFile download).

const API_BASE = "https://api.telegram.org";

let _http = null; // seam test
export function _setTelegramHttpForTest(fn) {
  _http = fn;
}

async function tgFetch(token, method, params = {}) {
  const url = `${API_BASE}/bot${token}/${method}`;
  if (_http) return _http(url, params);
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });
  return {
    ok: res.ok,
    status: res.status,
    json: async () => res.json(),
    text: async () => res.text(),
  };
}

async function tgAssert(resp, what) {
  let body = null;
  try {
    body = typeof resp.json === "function" ? await resp.json() : null;
  } catch {}
  if (!resp.ok) {
    let desc = `HTTP ${resp.status}`;
    if (body && body.description) desc += ` — ${body.description}`;
    throw new Error(`Telegram ${what} gagal: ${desc}`);
  }
  if (body && body.ok === false) {
    throw new Error(
      `Telegram ${what} ditolak: ${body.description || body.error_code || "unknown"}`,
    );
  }
  return body && typeof body.result !== "undefined" ? body.result : body;
}

export function createTelegramClient({ token, log = () => {} } = {}) {
  if (!token || typeof token !== "string" || token.length < 10) {
    throw new Error("Token Telegram tidak valid — bikin bot di @BotFather lalu .setkey telegram <token>");
  }
  let running = false;
  let offset = 0;
  let pollTimer = null;
  let pollAbort = null;
  // id pesan bot terakhir per chatId — dipakai react/edit (loading anim)
  const lastSent = new Map();
  const onMessage = async () => {};

  async function call(method, params, what = method) {
    const resp = await tgFetch(token, method, params);
    return await tgAssert(resp, what);
  }

  // ── Kirim ──────────────────────────────────────────────
  async function sendMessage(chatId, text) {
    const body = String(text ?? "");
    // Batas Telegram: 4096 char/pesan — pecah jangan error
    if (body.length <= 4096) {
      const r = await call("sendMessage", {
        chat_id: chatId,
        text: body,
        link_preview_options: { is_disabled: true },
      });
      lastSent.set(String(chatId), r?.message_id ?? null);
      return r;
    }
    let last = null;
    for (let i = 0; i < body.length; i += 4000) {
      last = await call("sendMessage", {
        chat_id: chatId,
        text: body.slice(i, i + 4000),
        link_preview_options: { is_disabled: true },
      });
    }
    lastSent.set(String(chatId), last?.message_id ?? null);
    return last;
  }

  async function editMessageText(chatId, messageId, text) {
    // throw kalau beneran gagal — caller (animasi editFramesAnim) nangkep buat
    // fallback kirim pesan baru. Cuma "message is not modified" (isi identik)
    // yang dianggap sukses senyap.
    let resp;
    try {
      resp = await call("editMessageText", {
        chat_id: chatId,
        message_id: messageId,
        text: String(text ?? "").slice(0, 4000),
        link_preview_options: { is_disabled: true },
      });
    } catch (e) {
      if (/not modified/i.test(String(e?.message || e))) return { message_id: Number(messageId) || messageId, ok: true };
      throw e;
    }
  }

  async function setMessageReaction(chatId, emoji) {
    try {
      const msgId = lastSent.get(String(chatId));
      if (!msgId) return null;
      return await call("setMessageReaction", {
        chat_id: chatId,
        message_id: msgId,
        emoji: emoji || "👍",
      });
    } catch {
      return null;
    }
  }

  async function uploadMedia(chatId, method, field, file, caption = "", title = "") {
    // file: { buffer, filename, mimetype } — multipart FormData (native Node 20)
    const url = `${API_BASE}/bot${token}/${method}`;
    const fd = new FormData();
    fd.append("chat_id", String(chatId));
    if (caption) fd.append("caption", String(caption).slice(0, 1024));
    // judul audio (owner 29 Sep: "bentuk audio ada judulnya, bertuliskan voice aja")
    if (title) fd.append("title", title);
    if (file && typeof file === "object" && (file.buffer || file.url)) {
      if (file.url) fd.append(field, file.url);
      else
        fd.append(
          field,
          new Blob([file.buffer], { type: file.mimetype || "application/octet-stream" }),
          file.filename || "file",
        );
    } else if (typeof file === "string") {
      fd.append(field, file); // file_id / URL string
    } else {
      throw new Error("Media Telegram tidak valid");
    }
    let resp;
    if (_http) resp = await _http(url, fd);
    else {
      const r = await fetch(url, { method: "POST", body: fd });
      resp = { ok: r.ok, status: r.status, json: async () => r.json(), text: async () => r.text() };
    }
    const r2 = await tgAssert(resp, method);
    lastSent.set(String(chatId), r2?.message_id ?? null);
    return r2;
  }

  const sendPhoto = (chatId, file, caption) => uploadMedia(chatId, "sendPhoto", "photo", file, caption);
  const sendVideo = (chatId, file, caption) => uploadMedia(chatId, "sendVideo", "video", file, caption);
  // judul audio di Telegram dibaca "voice" — bukan nama file mentah (owner 29 Sep)
  const sendAudio = (chatId, file, caption) => uploadMedia(chatId, "sendAudio", "audio", file, caption, "voice");
  const sendDocument = (chatId, file, caption) => uploadMedia(chatId, "sendDocument", "document", file, caption);
  const sendAnimation = (chatId, file, caption) => uploadMedia(chatId, "sendAnimation", "animation", file, caption);

  // ── Terima ─────────────────────────────────────────────
  async function pollOnce(handler) {
    const ms = 25_000;
    const ctrl = new AbortController();
    pollAbort = ctrl;
    let resp;
    const url = `${API_BASE}/bot${token}/getUpdates?timeout=25&offset=${offset}`;
    if (_http) {
      resp = await _http(url, {});
    } else {
      const r = await fetch(url, { signal: ctrl.signal });
      resp = { ok: r.ok, status: r.status, json: async () => r.json(), text: async () => r.text() };
    }
    const body = await tgAssert(resp, "getUpdates");
    const updates = Array.isArray(body) ? body : [];
    for (const u of updates) {
      offset = Math.max(offset, (u.update_id || 0) + 1);
      // CHANNEL POST (7 Okt): bot admin channel nerima channel_post — diproses
      // juga biar command (.tgid / .cpanel dll) jalan di saluran Telegram.
      if (u.channel_post || u.edited_channel_post) {
        u.message = u.message || u.channel_post || u.edited_channel_post;
      }
      // Diagnostik update masuk (biar pesan grup "gak nyampe" keliatan di log)
      const __um = u.message || u.edited_message;
      log(`update masuk: ${Object.keys(u).filter((k) => k !== "update_id").join(",") || "?"} chat=${__um?.chat?.id ?? "-"} tipe=${__um?.chat?.type ?? "-"} dari=${__um?.from?.id ?? "-"} teks=${JSON.stringify(String(__um?.text ?? __um?.caption ?? "").slice(0, 40))}`);
      if (u.message || u.edited_message) {
        try {
          await handler(u.message || u.edited_message, u);
        } catch (e) {
          log(`telegram handler error: ${e?.message || e}`);
        }
      }
    }
    void ms;
  }

  async function loop(handler) {
    let backoff = 1000;
    while (running) {
      try {
        await pollOnce(handler);
        backoff = 1000;
      } catch (e) {
        if (!running) break;
        log(`telegram poll error: ${e?.message || e} — retry ${Math.round(backoff / 1000)}s`);
        await new Promise((r) => setTimeout(r, backoff));
        backoff = Math.min(backoff * 2, 60_000);
      }
    }
  }

  return {
    start: async (handler) => {
      if (running) return false;
      running = true;
      offset = 0;
      const me = await call("getMe", {}, "getMe");
      loop(handler);
      return me;
    },
    stop: () => {
      running = false;
      try { pollAbort?.abort(); } catch {}
      if (pollTimer) clearTimeout(pollTimer);
      return true;
    },
    isRunning: () => running,
    sendMessage,
    editMessageText,
    setMessageReaction,
    sendPhoto,
    sendVideo,
    sendAudio,
    sendDocument,
    sendAnimation,
    // util: unduh file dari Telegram (max 20 MB versi gratis Bot API)
    downloadFile: async (fileId) => {
      const f = await call("getFile", { file_id: fileId }, "getFile");
      const path = f?.file_path;
      if (!path) throw new Error("Telegram getFile tanpa file_path");
      const url = `https://api.telegram.org/file/bot${token}/${path}`;
      if (_http) {
        const r = await _http(url, { _binary: true });
        return Buffer.from(await r.buffer());
      }
      const r = await fetch(url);
      if (!r.ok) throw new Error(`Telegram download file gagal: HTTP ${r.status}`);
      return Buffer.from(await r.arrayBuffer());
    },
    _lastSent: lastSent,
  };
}
