// RARA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// WebToNative — Convert website ke native APK via webtonative.com API, no token needed
import { raraError, raraEmpty, raraGuide, raraNoInput, raraWrap } from "../../src/lib/rara-menu-style.js";

const pluginConfig = {
  name: "webtoapk",
  alias: ["webtoapk"],
  category: "browser",
  description: "WebToNative — convert website ke native Android/iOS app gratis tanpa API key",
  usage: ".webtoapk <url> <nama_app>\n.webtoapk <url> <nama_app> <email>",
  example: ".webtoapk https://example.com MyApp\n.webtoapk https://google.com GoogleApp aizat@mail.com",
  isOwner: true,
  isPremium: false,
  isGroup: false,
  isPrivate: true,
  cooldown: 30,
  energi: 0,
  isEnabled: true,
};

const API_BASE = "https://www.webtonative.com/api/v1";

const USER_AGENTS = [
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36",
];

function generateRandomIP() {
  const ranges = [
    [1, 1], [2, 2], [5, 5], [23, 23], [27, 27], [31, 31], [36, 36], [37, 37], [39, 39], [42, 42],
    [46, 46], [49, 49], [50, 50], [60, 60], [114, 114], [117, 117], [118, 118], [119, 119], [120, 120],
    [121, 121], [122, 122], [123, 123], [124, 124], [125, 125], [126, 126], [180, 180], [182, 182], [183, 183],
  ];
  const range = ranges[Math.floor(Math.random() * ranges.length)];
  return [range[0], Math.floor(Math.random() * 256), Math.floor(Math.random() * 256), Math.floor(Math.random() * 256)].join(".");
}

async function apiRequest(endpoint, method = "GET", body = null) {
  const url = new URL(API_BASE + endpoint);
  const spoofedIp = generateRandomIP();
  const ua = USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];

  const headers = {
    "User-Agent": ua,
    Accept: "application/json",
    "Accept-Language": "en-US,en;q=0.9",
    "Content-Type": "application/json",
    Origin: "https://www.webtonative.com",
    Referer: "https://www.webtonative.com/",
    "X-Forwarded-For": spoofedIp,
    "X-Real-IP": spoofedIp,
    "Client-IP": spoofedIp,
    "True-Client-IP": spoofedIp,
    "X-Originating-IP": spoofedIp,
    "X-Cluster-Client-IP": spoofedIp,
    Forwarded: "for=" + spoofedIp,
  };

  const options = { method, headers };
  if (body) {
    options.body = JSON.stringify(body);
  }

  const res = await fetch(url.toString(), options);
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    return { raw: text, status: res.status };
  }
}

async function buildApp(appName, emailId, websiteUrl) {
  const payload = {
    appName,
    emailId,
    packageId: "WEBTONATIVE_STARTER",
    websiteUrl,
    referralCode: "",
    utmInfo: {
      utm_source: "",
      utm_medium: "",
      utm_campaign: "",
      utm_term: "",
      utm_content: "",
    },
    device_type: "website",
    browser: "chrome",
  };

  const data = await apiRequest("/build-app-request", "POST", payload);
  if (!data || !data.isSuccess) {
    throw new Error(data?.message || "Build app request gagal");
  }
  return data;
}

async function checkStatus(requestId) {
  return await apiRequest("/check-app-status?requestId=" + requestId, "GET");
}

async function waitUntilDone(requestId, onProgress) {
  let attempts = 0;
  const maxAttempts = 180; // ~15 minutes max (5s interval)
  let lastStatus = null;

  while (attempts < maxAttempts) {
    attempts++;
    const data = await checkStatus(requestId);

    if (data && data.android_status === "DONE" && data.ios_status === "DONE") {
      return data;
    }

    // Report progress on status change
    const currentStatus = data.android_status + "|" + data.ios_status;
    if (currentStatus !== lastStatus && onProgress) {
      onProgress(data);
      lastStatus = currentStatus;
    }

    // Check for error status
    if (data.android_status === "FAILED" || data.ios_status === "FAILED") {
      throw new Error("Build gagal. Android: " + data.android_status + ", iOS: " + data.ios_status);
    }

    // Wait 5 seconds before next poll
    await new Promise((r) => setTimeout(r, 5000));
  }

  throw new Error("Timeout menunggu build. Coba lagi nanti.");
}

async function handler(m, { conn, text, args, usedPrefix, command }) {
  try {
    await m.react("🕒");
    const input = text.trim();
    if (!input) {
      return m.reply(raraWrap("WebToNative", [
        "Convert website ke native Android/iOS app",
        "Gratis tanpa API key via webtonative.com",
        "",
        "CARA PAKAI:",
        usedPrefix + "webtoapk <url> <nama_app>",
        usedPrefix + "webtoapk <url> <nama_app> <email>",
        "",
        "Contoh:",
        usedPrefix + "webtoapk https://example.com MyApp",
        usedPrefix + "webtoapk https://google.com GoogleApp aizat@mail.com",
        "",
        "Email opsional (default: random@catchmail.io)",
        "Build butuh 5-15 menit, bot akan polling otomatis",
      ]));
    }

    // Parse args: url, name, [email]
    const parts = input.split(/\s+/);
    const websiteUrl = parts[0];
    let appName = parts[1] || "";
    let emailId = parts[2] || "";

    // Validate URL
    if (!websiteUrl || !websiteUrl.match(/^https?:\/\/.+/)) {
      return m.reply(raraWrap("WebToNative", "URL tidak valid! Contoh: .webtoapk https://example.com MyApp"));
    }

    if (!appName) {
      return m.reply(raraWrap("WebToNative", "Nama app wajib! Contoh: .webtoapk https://example.com MyApp"));
    }

    // Generate random email if not provided
    if (!emailId) {
      const random = Math.random().toString(36).substring(2, 10);
      emailId = random + "@catchmail.io";
    }

    m.reply(raraWrap("WebToNative", [
      "MEMULAI BUILD APP",
      "",
      "URL: " + websiteUrl,
      "Nama App: " + appName,
      "Email: " + emailId,
      "",
      "Mengirim request ke WebToNative API...",
    ], "info"));

    // Build app
    const build = await buildApp(appName, emailId, websiteUrl);
    const requestId = build.requestId;

    if (!requestId) {
      return m.reply(raraWrap("WebToNative", [
        "Request berhasil dikirim tapi requestId tidak ditemukan.",
        "Response: " + JSON.stringify(build).substring(0, 500),
      ], "warn"));
    }

    m.reply(raraWrap("WebToNative", [
      "REQUEST DITERIMA",
      "",
      "Request ID: " + requestId,
      "App: " + appName,
      "",
      "Sedang build... polling setiap 5 detik",
      "Estimasi: 5-15 menit",
    ], "info"));

    // Wait for build to complete with progress updates
    const result = await waitUntilDone(requestId, (statusData) => {
      // Send progress update on status change
      try {
        const androidStatus = statusData.android_status || "PENDING";
        const iosStatus = statusData.ios_status || "PENDING";
        conn.sendMessage(m.key.remoteJid, {
          text: raraWrap("WebToNative", [
            "BUILD UPDATE",
            "",
            "Request ID: " + requestId,
            "Android: " + androidStatus,
            "iOS: " + iosStatus,
          ], "info"),
        });
      } catch (e) { console.error('[webtoapk.js]:', e.message); }
    });

    // Build complete - extract download links
    let lines = [
      "BUILD SELESAI!",
      "",
      "App: " + appName,
      "URL: " + websiteUrl,
      "Request ID: " + requestId,
      "",
    ];

    // Android APK
    if (result.android_apk_url || result.androidUrl || result.android_url) {
      const apkUrl = result.android_apk_url || result.androidUrl || result.android_url;
      lines.push("ANDROID APK:");
      lines.push(apkUrl);
      lines.push("");
    }

    // iOS
    if (result.ios_url || result.iosUrl) {
      const iosUrl = result.ios_url || result.iosUrl;
      lines.push("iOS:");
      lines.push(iosUrl);
      lines.push("");
    }

    // Full result if no specific URLs found
    if (!result.android_apk_url && !result.androidUrl && !result.android_url && !result.ios_url && !result.iosUrl) {
      lines.push("RESULT:");
      lines.push(JSON.stringify(result, null, 2).substring(0, 1500));
    }

    lines.push("Source: webtonative.com (gratis, no token)");
    lines.push("Build time: ~" + (attempts * 5) + " detik");

    await m.react("🐣");
    return m.reply(raraWrap("WebToNative", lines, "success"));
  } catch (e) {
    await m.react("❌");
    console.error("[WebToNative]", e);
    m.reply(raraWrap("WebToNative", [
      "Error: " + e.message,
      "",
      "Kemungkinan penyebab:",
      "1. URL website tidak valid/tidak aktif",
      "2. WebToNative API sedang maintenance",
      "3. IP diblokir sementara",
      "4. Timeout (build terlalu lama)",
    ], "warn"));
  }
}

export { pluginConfig as config, handler };
