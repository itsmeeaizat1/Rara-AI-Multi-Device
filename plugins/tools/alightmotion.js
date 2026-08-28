// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// AlightMotionV1 — Auto register AM premium via RyezenStore + CatchMail
// Source: https://api.andaraz.com/snippets/ai1/alightmotionv3
// © 2026 All Rights Reserved.
import https from "https";
import { URL } from "url";
import fs from "node:fs/promises";
import path from "node:path";
import { getDatabase } from "../../src/lib/nova-database.js";
import { novaError, novaEmpty, novaGuide, novaNoInput, claraWrap } from "../../src/lib/nova-menu-style.js";
import { getAndarazConfig } from "../../src/lib/config/env-loader.js";
const andarazConfig = getAndarazConfig();

const pluginConfig = {
  name: "amprem",
  alias: ["amprem"],
  category: "tools",
  description: "Alight Motion Premium Creator V1 — auto register via RyezenStore + CatchMail",
  usage: ".amprem create <jumlah>\n.amprem login <user> <pass>\n.amprem list",
  example: ".amprem create 1\n.amprem create 5\n.amprem login user pass",
  isOwner: true,
  isPremium: false,
  isGroup: false,
  isPrivate: true,
  cooldown: 10,
  energi: 0,
  isEnabled: true,
};

const SESSION_FILE = path.join(process.cwd(), "database", "am-v2-session.json");

const USER_AGENTS = [
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
];

class AlightMotionV1 {
  constructor() {
    this.uaIndex = Math.floor(Math.random() * USER_AGENTS.length);
    this.cookie = null;
    this.credit = 0;
    this.consonants = "bcdfghjklmnpqrstvwxyz";
    this.vowels = "aeiou";
    this.uLen = 3;
    this.pLen = 6;
    this.uIndices = new Array(this.uLen).fill(0);
    this.pIndices = new Array(this.pLen).fill(0);
    this.tLen = 1;
    this.tIndices = new Array(this.tLen).fill(0);
  }

  _generateRandomIP() {
    const ranges = [
      [1, 1], [2, 2], [5, 5], [23, 23], [27, 27], [31, 31], [36, 36], [37, 37], [39, 39], [42, 42],
      [46, 46], [49, 49], [50, 50], [60, 60], [114, 114], [117, 117], [118, 118], [119, 119], [120, 120],
      [121, 121], [122, 122], [123, 123], [124, 124], [125, 125], [126, 126], [180, 180], [182, 182], [183, 183],
    ];
    const range = ranges[Math.floor(Math.random() * ranges.length)];
    return [
      range[0],
      Math.floor(Math.random() * 256),
      Math.floor(Math.random() * 256),
      Math.floor(Math.random() * 256),
    ].join(".");
  }

  _nextIndices(indices) {
    let pos = indices.length - 1;
    while (pos >= 0) {
      indices[pos]++;
      const chars = pos % 2 === 0 ? this.consonants : this.vowels;
      if (indices[pos] < chars.length) return true;
      indices[pos] = 0;
      pos--;
    }
    return false;
  }

  _getString(indices) {
    let res = "";
    for (let i = 0; i < indices.length; i++) {
      const chars = i % 2 === 0 ? this.consonants : this.vowels;
      res += chars[indices[i]];
    }
    return res;
  }

  generateCredentials() {
    const username = this._getString(this.uIndices);
    const password = this._getString(this.pIndices);

    const uNotExhausted = this._nextIndices(this.uIndices);
    if (!uNotExhausted) {
      const pNotExhausted = this._nextIndices(this.pIndices);
      if (!pNotExhausted) {
        this.uLen++;
        this.pLen++;
        this.uIndices = new Array(this.uLen).fill(0);
        this.pIndices = new Array(this.pLen).fill(0);
      }
    }

    return { username, password };
  }

  generateTempMailAddress() {
    let res = "";
    for (let i = 0; i < this.tIndices.length; i++) {
      const chars = i % 2 === 0 ? this.consonants : this.vowels;
      res += chars[this.tIndices[i]];
    }

    let pos = this.tIndices.length - 1;
    while (pos >= 0) {
      this.tIndices[pos]++;
      const chars = pos % 2 === 0 ? this.consonants : this.vowels;
      if (this.tIndices[pos] < chars.length) break;
      this.tIndices[pos] = 0;
      pos--;
    }
    if (pos < 0) {
      this.tLen++;
      this.tIndices = new Array(this.tLen).fill(0);
    }

    return res + "@catchmail.io";
  }

  async _request(method, urlString, body = null) {
    const targetUrl = new URL(urlString);
    const isRyezen = targetUrl.hostname.includes("ryezenstore.online");
    const spoofedIp = isRyezen ? this._generateRandomIP() : null;

    return new Promise((resolve, reject) => {
      const options = {
        hostname: targetUrl.hostname,
        path: targetUrl.pathname + targetUrl.search,
        method: method,
        headers: {},
        rejectUnauthorized: false,
      };

      if (isRyezen) {
        options.headers["User-Agent"] = USER_AGENTS[this.uaIndex];
        options.headers["accept"] = "application/json, text/plain, */*";
        options.headers["content-type"] = "application/json";
        options.headers["X-Forwarded-For"] = spoofedIp;
        options.headers["X-Real-IP"] = spoofedIp;
        options.headers["Client-IP"] = spoofedIp;
        options.headers["True-Client-IP"] = spoofedIp;
        options.headers["X-Originating-IP"] = spoofedIp;
        options.headers["X-Cluster-Client-IP"] = spoofedIp;
        options.headers["Forwarded"] = `for=${spoofedIp}`;
        options.headers["Origin"] = "https://www.ryezenstore.online";
        options.headers["Referer"] = "https://www.ryezenstore.online/";
      }

      if (this.cookie && isRyezen) {
        options.headers["Cookie"] = this.cookie;
      }

      const req = https.request(options, (res) => {
        let setCookie = res.headers["set-cookie"];
        if (setCookie) {
          if (Array.isArray(setCookie)) {
            this.cookie = setCookie.map((c) => c.split(";")[0]).join("; ");
          } else {
            this.cookie = setCookie.split(";")[0];
          }
        }

        const chunks = [];
        res.on("data", (chunk) => chunks.push(chunk));
        res.on("end", () => {
          try {
            const raw = Buffer.concat(chunks).toString("utf-8");
            const data = JSON.parse(raw);

            if (res.statusCode >= 400 || (data && data.success === false)) {
              reject(new Error(data.error || data.message || `Request failed with status ${res.statusCode}`));
              return;
            }

            resolve(data);
          } catch (e) {
            if (res.statusCode >= 400) {
              reject(new Error(`Request failed with status ${res.statusCode}`));
            } else {
              resolve({});
            }
          }
        });
      });

      req.on("error", reject);
      if (body) {
        const bodyStr = JSON.stringify(body);
        options.headers["Content-Length"] = Buffer.byteLength(bodyStr);
        req.write(bodyStr);
      }
      req.end();
    });
  }

  async register(username, password) {
    return await this._request("POST", "https://www.ryezenstore.online/api/auth/register", { username, password });
  }

  async login(username, password) {
    const res = await this._request("POST", "https://www.ryezenstore.online/api/auth/login", { username, password });
    if (res && res.user && typeof res.user.credits !== "undefined") {
      this.credit = res.user.credits;
    }
    return res;
  }

  async getTempMail() {
    return { email: this.generateTempMailAddress() };
  }

  async sendLink(email) {
    return await this._request("POST", "https://www.ryezenstore.online/api/am/send-link", { email });
  }

  async getInbox(email) {
    const encoded = encodeURIComponent(email);
    return await this._request("GET", `https://catchmail.io/api/v1/mailbox?address=${encoded}&page=1&page_size=50`);
  }

  async getMessage(email, id) {
    const encoded = encodeURIComponent(email);
    return await this._request("GET", `https://catchmail.io/api/v1/message/${id}?mailbox=${encoded}`);
  }

  async activatePremium(email, magicLink) {
    const res = await this._request("POST", "https://www.ryezenstore.online/api/am/activate", { email, magicLink });
    if (res && typeof res.creditsRemaining !== "undefined") {
      this.credit = res.creditsRemaining;
    }
    return res;
  }

  async logout() {
    if (this.cookie) {
      try {
        await this._request("POST", "https://www.ryezenstore.online/api/auth/logout");
      } catch (e) { console.error('[alightmotion.js]:', e.message); }
      this.cookie = null;
      this.credit = 0;
    }
    return true;
  }
}

// ─── Session Storage ────────────────────────────────────────────

async function loadSession() {
  try {
    const raw = await fs.readFile(SESSION_FILE, "utf8");
    return JSON.parse(raw);
  } catch {
    return { accounts: [] };
  }
}

async function saveSession(session) {
  try {
    await fs.mkdir(path.dirname(SESSION_FILE), { recursive: true });
    await fs.writeFile(SESSION_FILE, JSON.stringify(session, null, 2), "utf8");
  } catch (e) {
    console.error("[AM V1] saveSession error:", e);
  }
}

// ─── Command Handler ─────────────────────────────────────────────

async function handler(m, { conn, text, args, usedPrefix, command }) {
  try {
    const db = await getDatabase();
    const sender = m.sender;
    const sub = (args[0] || "").toLowerCase();

    // LIST
    if (sub === "list" || sub === "daftar") {
      const session = await loadSession();
      const accounts = session.accounts || [];
      if (accounts.length === 0) {
        return m.reply(claraWrap("AM Premium V1", "Belum ada akun dibuat. Ketik .amprem create 1"));
      }
      let lines = ["DAFTAR AKUN AM PREMIUM V1", "Total: " + accounts.length + " akun", ""];
      accounts.slice(-20).forEach((acc, i) => {
        lines.push((i + 1) + ". Email: " + acc.email);
        lines.push("   Password: " + acc.password);
        lines.push("   Tanggal: " + new Date(acc.date).toLocaleDateString("id-ID"));
      });
      if (accounts.length > 20) {
        lines.push("", "... dan " + (accounts.length - 20) + " akun lainnya");
      }
      return m.reply(claraWrap("AM Premium V1", lines));
    }

    // LOGIN (manual dengan user/pass yang udah ada)
    if (sub === "login") {
      const username = args[1] || "";
      const password = args[2] || "";
      if (!username || !password) {
        return m.reply(claraWrap("AM Premium V1", "Format: .amprem login <username> <password>"));
      }
      m.reply(claraWrap("AM Premium V1", "Login ke RyezenStore..."));
      const am = new AlightMotionV1();
      try {
        const loginRes = await am.login(username, password);
        return m.reply(claraWrap("AM Premium V1", [
          "LOGIN BERHASIL",
          "",
          "Username: " + username,
          "Credits: " + (am.credit || loginRes.user?.credits || 0),
          "",
          "Sekarang bisa create AM premium dengan akun ini.",
          "Ketik: .amprem create 1",
        ], "success"));
      } catch (e) {
        return m.reply(claraWrap("AM Premium V1", "Login gagal: " + e.message));
      }
    }

    // CREATE
    if (sub === "create" || sub === "buat") {
      let limit = parseInt(args[1]) || 1;
      if (limit < 1) limit = 1;
      if (limit > 10) limit = 10;

      m.reply(claraWrap("AM Premium V1", "Membuat " + limit + " akun AM Premium V1...\nProses mungkin butuh 1-2 menit per akun."));

      const am = new AlightMotionV1();
      let successCount = 0;
      let failedCount = 0;
      let errorMsgs = [];
      let results = [];
      let currentUsername = "";
      let currentPassword = "";

      for (let i = 0; i < limit; i++) {
        try {
          // Register & Login
          if (!am.cookie || am.credit <= 0) {
            if (am.cookie) await am.logout();

            let loggedIn = false;
            let attempts = 0;
            while (!loggedIn && attempts < 20) {
              attempts++;
              const creds = am.generateCredentials();
              currentUsername = creds.username;
              currentPassword = creds.password;
              try {
                await am.register(currentUsername, currentPassword);
                await am.login(currentUsername, currentPassword);
                loggedIn = true;
              } catch (err) {
                const errStr = JSON.stringify({ error: err.message });
                if (errStr.includes("Username sudah digunakan") || errStr.includes("acak/tidak wajar")) {
                  continue;
                } else {
                  throw err;
                }
              }
            }
            if (!loggedIn) throw new Error("Gagal register setelah 20 percobaan");
          }

          if (am.cookie && am.credit > 0) {
            // Get temp mail
            const tempMailData = await am.getTempMail();
            const email = tempMailData.email;

            // Send link
            await am.sendLink(email);

            // Wait for magic link
            let magicLink = null;
            let pollAttempts = 0;
            while (!magicLink && pollAttempts < 60) {
              pollAttempts++;
              try {
                const inboxData = await am.getInbox(email);
                if (inboxData && Array.isArray(inboxData.messages) && inboxData.messages.length > 0) {
                  for (const msg of inboxData.messages) {
                    if (msg.from && msg.from.includes("noreply@alight-creative.firebaseapp.com")) {
                      const msgData = await am.getMessage(email, msg.id);
                      if (msgData && msgData.body) {
                        const htmlBody = msgData.body.html || msgData.body.text || "";
                        const match = htmlBody.match(/https:\/\/alight-creative\.firebaseapp\.com[^\s>'"]+/);
                        if (match) {
                          magicLink = match[0];
                          break;
                        }
                      }
                    }
                  }
                }
              } catch (e) { console.error('[alightmotion.js]:', e.message); }
              if (!magicLink) await new Promise((r) => setTimeout(r, 2000));
            }

            if (!magicLink) throw new Error("Magic link tidak ditemukan setelah 2 menit");

            // Activate premium
            await am.activatePremium(email, magicLink);
            successCount++;
            results.push({ email, password: currentPassword, status: "OK" });

            // Save to session
            const session = await loadSession();
            session.accounts.push({ email, password: currentPassword, date: new Date().toISOString() });
            await saveSession(session);

            // Save to database
            if (!db.data.users?.[sender]) db.data.users[sender] = {};
            if (!db.data.users[sender].amAccounts) db.data.users[sender].amAccounts = [];
            db.data.users[sender].amAccounts.push({ email, password: currentPassword, date: new Date().toISOString() });
            db.data.users[sender].amTotalCreated = (db.data.users[sender].amTotalCreated || 0) + 1;
            await db.save();
          }

          if (am.credit <= 0) await am.logout();
        } catch (error) {
          failedCount++;
          errorMsgs.push(error.message || "ERR");
          break;
        }
      }

      let lines = [
        "HASIL CREATE AM PREMIUM V1",
        "",
        "Berhasil: " + successCount + "/" + limit,
        "Gagal: " + failedCount,
      ];

      if (results.length > 0) {
        lines.push("", "AKUN BERHASIL:");
        results.forEach((r, i) => {
          lines.push((i + 1) + ". Email: " + r.email);
          lines.push("   Password: " + r.password);
        });
      }

      if (errorMsgs.length > 0) {
        lines.push("", "Error: " + errorMsgs.join(", "));
      }

      lines.push("", "Total akun tersimpan: .amprem list");
      lines.push("Source: RyezenStore + CatchMail");

      return m.reply(claraWrap("AM Premium V1", lines, successCount > 0 ? "success" : "warn"));
    }

    // HELP
    return m.reply(claraWrap("AM Premium V1", [
      "Alight Motion Premium Creator V1",
      "Auto register via RyezenStore + CatchMail",
      "",
      "CARA PAKAI:",
      usedPrefix + "amprem create <jumlah> — Buat akun AM premium (max 10)",
      usedPrefix + "amprem login <user> <pass> — Login manual",
      usedPrefix + "amprem list — Lihat daftar akun",
      "",
      "Sumber: ryezenstore.online + catchmail.io",
      "Source: Andaraz API (api.andaraz.com/snippets/ai1/alightmotionv3)",
    ]));
  } catch (e) {
    console.error("[AM Premium V1]", e);
    m.reply(claraWrap("AM Premium V1", "Error: " + e.message));
  }
}

export { pluginConfig as config, handler };
