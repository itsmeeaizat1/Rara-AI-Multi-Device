// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// TempMail V2 — CatchMail.io API (https://api.catchmail.io)
// Free disposable email, no auth required, custom domain support
import { getDatabase } from "../../src/lib/nova-database.js";
import { claraWrap } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "tempmailv2",
  alias: ["tempmailv2"],
  category: "tools",
  description: "Temp Email V2 — CatchMail.io API, gratis tanpa auth, custom domain support",
  usage: ".tempmailv2 new <username>\n.tempmailv2 inbox [email]\n.tempmailv2 read <id> [email]\n.tempmailv2 delete <id> <email>\n.tempmailv2 gen",
  example: ".tempmailv2 new aizat\n.tempmailv2 inbox aizat@catchmail.io",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: true,
  cooldown: 3,
  energi: 0,
  isEnabled: true,
};

const API_BASE = "https://api.catchmail.io";
const DEFAULT_DOMAIN = "catchmail.io";

// ─── API Calls ─────────────────────────────────────────────────

async function apiListMailbox(email, page = 1, pageSize = 50) {
  const url = API_BASE + "/api/v1/mailbox?address=" + encodeURIComponent(email) + "&page=" + page + "&page_size=" + pageSize;
  const res = await fetch(url, { method: "GET", headers: { Accept: "application/json" } });
  const data = await res.json();
  if (!res.ok) {
    const errMsg = data?.error?.message || "HTTP " + res.status;
    throw new Error(errMsg);
  }
  return data;
}

async function apiGetMessage(id, email) {
  const url = API_BASE + "/api/v1/message/" + encodeURIComponent(id) + "?mailbox=" + encodeURIComponent(email);
  const res = await fetch(url, { method: "GET", headers: { Accept: "application/json" } });
  const data = await res.json();
  if (!res.ok) {
    const errMsg = data?.error?.message || "HTTP " + res.status;
    throw new Error(errMsg);
  }
  return data;
}

async function apiDeleteMessage(id, email) {
  const url = API_BASE + "/api/v1/message/" + encodeURIComponent(id) + "?mailbox=" + encodeURIComponent(email);
  const res = await fetch(url, { method: "DELETE", headers: { Accept: "application/json" } });
  if (!res.ok && res.status !== 204) {
    let errMsg = "HTTP " + res.status;
    try { const data = await res.json(); errMsg = data?.error?.message || errMsg; } catch (e) { console.error('[tempmailv2.js]:', e.message); }
    throw new Error(errMsg);
  }
  return true;
}

// ─── Helpers ───────────────────────────────────────────────────

function generateUsername() {
  const consonants = "bcdfghjklmnpqrstvwxyz";
  const vowels = "aeiou";
  let res = "";
  for (let i = 0; i < 8; i++) {
    res += i % 2 === 0 ? consonants[Math.floor(Math.random() * consonants.length)] : vowels[Math.floor(Math.random() * vowels.length)];
  }
  return res;
}

function stripHtml(html) {
  if (!html) return "";
  return String(html)
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function extractLinks(html) {
  if (!html) return [];
  const links = [];
  const regex = /https?:\/\/[^\s"'<>]+/g;
  let match;
  while ((match = regex.exec(html)) !== null) {
    links.push(match[0]);
  }
  return links;
}

function formatDate(dateStr) {
  try {
    const d = new Date(dateStr);
    return d.toLocaleString("id-ID", { timeZone: "Asia/Jakarta", day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
  } catch {
    return dateStr || "N/A";
  }
}

function formatSize(bytes) {
  if (!bytes) return "0 B";
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}

// ─── Handler ────────────────────────────────────────────────────

async function handler(m, { conn, text, args, usedPrefix, command }) {
  try {
    const db = await getDatabase();
    const sender = m.sender;
    const user = db.data.users?.[sender] || {};
    const sub = (args[0] || "").toLowerCase();

    // NEW — buat email baru
    if (sub === "new" || sub === "buat" || sub === "create") {
      let username = (args[1] || "").toLowerCase().trim();
      if (!username) username = generateUsername();
      // Sanitize username
      username = username.replace(/[^a-z0-9._-]/gi, "").toLowerCase();
      if (!username || username.length < 2) {
        return m.reply(claraWrap("Temp Email V2", "Username minimal 2 karakter (huruf, angka, titik, underscore, strip)."));
      }
      const email = username + "@" + DEFAULT_DOMAIN;

      // Save to user
      if (!db.data.users[sender]) db.data.users[sender] = {};
      db.data.users[sender].tempmailV2 = email;
      db.data.users[sender].tempmailV2Created = new Date().toISOString();
      await db.save();

      return m.reply(claraWrap("Temp Email V2", [
        "EMAIL BARU DIBUAT",
        "",
        "Email: " + email,
        "Domain: " + DEFAULT_DOMAIN,
        "API: CatchMail.io",
        "",
        "Cek inbox: .tempmailv2 inbox",
        "Baca pesan: .tempmailv2 read <id>",
        "Hapus pesan: .tempmailv2 delete <id> <email>",
        "",
        "Gratis tanpa auth. Email akan terus aktif selama CatchMail.io beroperasi.",
      ], "success"));
    }

    // GEN — generate random email
    if (sub === "gen" || sub === "acak" || sub === "random") {
      const username = generateUsername();
      const email = username + "@" + DEFAULT_DOMAIN;

      if (!db.data.users[sender]) db.data.users[sender] = {};
      db.data.users[sender].tempmailV2 = email;
      db.data.users[sender].tempmailV2Created = new Date().toISOString();
      await db.save();

      return m.reply(claraWrap("Temp Email V2", [
        "RANDOM EMAIL DIBUAT",
        "",
        "Email: " + email,
        "",
        "Cek inbox: .tempmailv2 inbox",
      ], "success"));
    }

    // INBOX — lihat daftar pesan
    if (sub === "inbox" || sub === "cek" || sub === "list") {
      let email = (args[1] || "").toLowerCase().trim();
      if (!email) email = user.tempmailV2 || "";
      if (!email) {
        return m.reply(claraWrap("Temp Email V2", "Belum ada email aktif. Ketik .tempmailv2 new <username> atau .tempmailv2 gen"));
      }

      m.reply(claraWrap("Temp Email V2", "Mengambil inbox dari CatchMail.io..."));

      const data = await apiListMailbox(email);
      const messages = data.messages || [];

      if (messages.length === 0) {
        return m.reply(claraWrap("Temp Email V2", [
          "INBOX: " + email,
          "",
          "Kosong. Belum ada pesan masuk.",
          "",
          "Kirim email ke alamat ini, lalu cek lagi dengan .tempmailv2 inbox",
        ], "info"));
      }

      let lines = [
        "INBOX: " + email,
        "Total pesan: " + (data.total || messages.length),
        "",
      ];
      messages.forEach((msg, i) => {
        lines.push((i + 1) + ". ID: " + msg.id);
        lines.push("   Dari: " + (msg.from || "N/A"));
        lines.push("   Subjek: " + (msg.subject || "(no subject)"));
        lines.push("   Tanggal: " + formatDate(msg.date));
        lines.push("   Ukuran: " + formatSize(msg.size));
        lines.push("");
      });
      lines.push("Baca pesan: .tempmailv2 read <id> " + email);
      lines.push("Hapus pesan: .tempmailv2 delete <id> " + email);

      return m.reply(claraWrap("Temp Email V2", lines));
    }

    // READ — baca isi pesan
    if (sub === "read" || sub === "baca" || sub === "pesan") {
      const id = args[1] || "";
      let email = (args[2] || "").toLowerCase().trim();
      if (!email) email = user.tempmailV2 || "";
      if (!id) {
        return m.reply(claraWrap("Temp Email V2", "Format: .tempmailv2 read <id> <email>\nContoh: .tempmailv2 read abc123 aizat@catchmail.io"));
      }
      if (!email) {
        return m.reply(claraWrap("Temp Email V2", "Belum ada email aktif. Ketik .tempmailv2 new <username>"));
      }

      m.reply(claraWrap("Temp Email V2", "Mengambil pesan dari CatchMail.io..."));

      const msg = await apiGetMessage(id, email);
      const bodyText = stripHtml(msg.body?.html) || msg.body?.text || "(no content)";
      const links = extractLinks(msg.body?.html || msg.body?.text || "");
      const attachments = msg.attachments || [];

      let lines = [
        "PESAN EMAIL",
        "",
        "ID: " + msg.id,
        "Dari: " + (msg.from || "N/A"),
        "Ke: " + (msg.to ? msg.to.join(", ") : email),
        "Subjek: " + (msg.subject || "(no subject)"),
        "Tanggal: " + formatDate(msg.date),
        "Ukuran: " + formatSize(msg.size),
        "",
        "ISI PESAN:",
        "",
        bodyText.substring(0, 3000),
      ];

      if (bodyText.length > 3000) {
        lines.push("", "...(pesan dipotong, " + (bodyText.length - 3000) + " karakter lagi)");
      }

      if (links.length > 0) {
        lines.push("", "LINK DALAM PESAN:");
        links.slice(0, 10).forEach((l) => lines.push(l));
      }

      if (attachments.length > 0) {
        lines.push("", "ATTACHMENTS:");
        attachments.forEach((a) => {
          lines.push("- " + a.filename + " (" + formatSize(a.size) + ") [" + a.content_type + "]");
          if (a.download_url) lines.push("  Download: " + API_BASE + a.download_url);
        });
      }

      lines.push("", "Hapus pesan: .tempmailv2 delete " + id + " " + email);

      return m.reply(claraWrap("Temp Email V2", lines, "info"));
    }

    // DELETE — hapus pesan
    if (sub === "delete" || sub === "hapus" || sub === "del") {
      const id = args[1] || "";
      let email = (args[2] || "").toLowerCase().trim();
      if (!email) email = user.tempmailV2 || "";
      if (!id || !email) {
        return m.reply(claraWrap("Temp Email V2", "Format: .tempmailv2 delete <id> <email>\nContoh: .tempmailv2 delete abc123 aizat@catchmail.io"));
      }

      await apiDeleteMessage(id, email);

      return m.reply(claraWrap("Temp Email V2", [
        "PESAN DIHAPUS",
        "",
        "ID: " + id,
        "Email: " + email,
        "",
        "Pesan telah dihapus permanen dari CatchMail.io.",
      ], "success"));
    }

    // CLEAR — hapus semua pesan
    if (sub === "clear" || sub === "bersihkan") {
      let email = (args[1] || "").toLowerCase().trim();
      if (!email) email = user.tempmailV2 || "";
      if (!email) {
        return m.reply(claraWrap("Temp Email V2", "Belum ada email aktif."));
      }

      m.reply(claraWrap("Temp Email V2", "Mengambil semua pesan untuk dihapus..."));

      const data = await apiListMailbox(email);
      const messages = data.messages || [];

      if (messages.length === 0) {
        return m.reply(claraWrap("Temp Email V2", "Inbox sudah kosong."));
      }

      let deleted = 0;
      let failed = 0;
      for (const msg of messages) {
        try {
          await apiDeleteMessage(msg.id, email);
          deleted++;
        } catch (e) {
          failed++;
        }
      }

      return m.reply(claraWrap("Temp Email V2", [
        "BULK DELETE",
        "",
        "Email: " + email,
        "Dihapus: " + deleted + "/" + messages.length,
        failed > 0 ? "Gagal: " + failed : "",
      ], "success"));
    }

    // CURRENT — lihat email aktif
    if (sub === "current" || sub === "aktif" || sub === "info") {
      const email = user.tempmailV2 || "";
      const created = user.tempmailV2Created || "";
      if (!email) {
        return m.reply(claraWrap("Temp Email V2", "Belum ada email aktif. Ketik .tempmailv2 new <username>"));
      }
      return m.reply(claraWrap("Temp Email V2", [
        "EMAIL AKTIF",
        "",
        "Email: " + email,
        "Dibuat: " + formatDate(created),
        "API: CatchMail.io",
        "",
        "Cek inbox: .tempmailv2 inbox",
      ], "info"));
    }

    // HELP
    return m.reply(claraWrap("Temp Email V2", [
      "CatchMail.io API — Free Disposable Email",
      "Gratis tanpa auth, custom domain support",
      "",
      "CARA PAKAI:",
      usedPrefix + "tempmailv2 new <username> — Buat email baru",
      usedPrefix + "tempmailv2 gen — Generate random email",
      usedPrefix + "tempmailv2 inbox [email] — Lihat daftar pesan",
      usedPrefix + "tempmailv2 read <id> [email] — Baca isi pesan",
      usedPrefix + "tempmailv2 delete <id> <email> — Hapus pesan",
      usedPrefix + "tempmailv2 clear [email] — Hapus semua pesan",
      usedPrefix + "tempmailv2 current — Lihat email aktif",
      "",
      "Domain: " + DEFAULT_DOMAIN,
      "API: api.catchmail.io",
      "Rate limit: 1 req/detik (anonymous)",
      "",
      "Contoh:",
      usedPrefix + "tempmailv2 new aizat",
      usedPrefix + "tempmailv2 inbox aizat@catchmail.io",
      usedPrefix + "tempmailv2 read abc123 aizat@catchmail.io",
    ]));
  } catch (e) {
    console.error("[TempMail V2]", e);
    m.reply(claraWrap("Temp Email V2", "Error: " + e.message));
  }
}

export { pluginConfig as config, handler };
