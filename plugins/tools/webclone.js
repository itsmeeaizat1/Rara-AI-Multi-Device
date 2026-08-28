// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// WebsiteCloner — Clone website & dapatkan template HTML/CSS via smartdom API
import { novaError, novaEmpty, novaGuide, novaNoInput, claraWrap } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "webclone",
  alias: ["webclone"],
  category: "tools",
  description: "WebsiteCloner — clone website & dapatkan template via smartdom API, gratis tanpa token",
  usage: ".webclone <url>",
  example: ".webclone https://example.com\n.webclone https://google.com",
  isOwner: true,
  isPremium: false,
  isGroup: false,
  isPrivate: true,
  cooldown: 20,
  energi: 0,
  isEnabled: true,
};

function generateRandomIP() {
  const ranges = [
    [1, 1], [2, 2], [5, 5], [23, 23], [27, 27], [31, 31], [36, 36], [37, 37], [39, 39], [42, 42],
    [46, 46], [49, 49], [50, 50], [60, 60], [114, 114], [117, 117], [118, 118], [119, 119], [120, 120],
    [121, 121], [122, 122], [123, 123], [124, 124], [125, 125], [126, 126], [180, 180], [182, 182], [183, 183],
  ];
  const range = ranges[Math.floor(Math.random() * ranges.length)];
  return [range[0], Math.floor(Math.random() * 256), Math.floor(Math.random() * 256), Math.floor(Math.random() * 256)].join(".");
}

async function eventDrivenFetch(url, options) {
  const response = await fetch(url, options);
  if (!response.ok) {
    const errorText = await response.text().catch(() => "");
    throw new Error("HTTP " + response.status + ": " + errorText.substring(0, 300));
  }

  const text = await response.text();
  try {
    return JSON.parse(text);
  } catch (e) {
    throw new Error("Response bukan JSON valid: " + text.substring(0, 300));
  }
}

async function cloneWebsite(url) {
  const spoofedIp = generateRandomIP();
  const headers = {
    "Content-Type": "application/json",
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "X-Forwarded-For": spoofedIp,
    "X-Real-IP": spoofedIp,
    "Client-IP": spoofedIp,
    "True-Client-IP": spoofedIp,
    "X-Originating-IP": spoofedIp,
    "X-Cluster-Client-IP": spoofedIp,
    Forwarded: "for=" + spoofedIp,
  };

  // API 1: Provision Clone
  const cloneUrl = "https://us-central1-smartdom-421020.cloudfunctions.net/provisionCloneNoAuthFunction";
  const cloneBody = JSON.stringify({ url, overwrite: true });
  const cloneData = await eventDrivenFetch(cloneUrl, { method: "POST", headers, body: cloneBody });

  if (!cloneData.path) {
    throw new Error("Tidak ada path dari API clone. Response: " + JSON.stringify(cloneData).substring(0, 300));
  }

  // API 2: Get Ext Template
  const templateUrl = "https://smartdom-421020.uc.r.appspot.com/getExtTemplate";
  const templateBody = JSON.stringify({ tid: cloneData.path });
  const templateData = await eventDrivenFetch(templateUrl, { method: "POST", headers, body: templateBody });

  return { cloneData, templateData };
}

async function handler(m, { conn, text, args, usedPrefix, command }) {
  try {
    const url = text.trim();
    if (!url) {
      return m.reply(claraWrap("WebsiteCloner", [
        "Clone website & dapatkan template HTML/CSS",
        "Gratis tanpa token via smartdom API",
        "",
        "CARA PAKAI:",
        usedPrefix + "webclone <url_website>",
        "",
        "Contoh:",
        usedPrefix + "webclone https://example.com",
        usedPrefix + "webclone https://google.com",
        "",
        "Hasil: template HTML + CSS siap pakai",
      ]));
    }

    // Validate URL
    if (!url.match(/^https?:\/\/.+/)) {
      return m.reply(claraWrap("WebsiteCloner", "URL tidak valid! Harus diawali http:// atau https://\n💡 *Contoh:* .webclone https://example.com"));
    }

    m.reply(claraWrap("WebsiteCloner", "Sedang cloning website...\nURL: " + url + "\nMungkin butuh 10-30 detik."));

    const { cloneData, templateData } = await cloneWebsite(url);

    // Extract template content
    let lines = [
      "CLONE BERHASIL",
      "",
      "URL: " + url,
      "Path: " + (cloneData.path || "N/A"),
      "",
    ];

    // Check what templateData contains
    if (templateData.html || templateData.content) {
      const htmlContent = templateData.html || templateData.content;
      lines.push("TEMPLATE HTML:");
      lines.push("");

      // If content is very long, send as file
      if (htmlContent.length > 2000) {
        lines.push("Template terlalu panjang untuk chat (" + htmlContent.length + " karakter).");

        // Try to send as file
        try {
          const fileName = "clone_" + new URL(url).hostname.replace(/\./g, "_") + ".html";
          const { Buffer } = await import("node:buffer");
          const fileBuffer = Buffer.from(htmlContent, "utf-8");

          await conn.sendMessage(m.key.remoteJid, {
            document: fileBuffer,
            mimetype: "text/html",
            fileName,
            caption: claraWrap("WebsiteCloner", [
              "CLONE BERHASIL",
              "",
              "URL: " + url,
              "File: " + fileName,
              "Size: " + (fileBuffer.length / 1024).toFixed(1) + " KB",
              "Source: smartdom API",
            ], "success"),
          }, { quoted: m });
          return;
        } catch (fileErr) {
          // Fallback: send truncated
          lines = [
            "CLONE BERHASIL",
            "",
            "URL: " + url,
            "Path: " + (cloneData.path || "N/A"),
            "",
            "TEMPLATE (dipotong, " + htmlContent.length + " karakter total):",
            "",
            htmlContent.substring(0, 3000),
            "",
            "...(dipotong)",
          ];
        }
      } else {
        lines.push("```" + htmlContent + "```");
      }
    } else if (templateData.css) {
      lines.push("TEMPLATE CSS:");
      lines.push("```" + String(templateData.css).substring(0, 3000) + "```");
    } else if (templateData.url || templateData.download_url) {
      const dlUrl = templateData.url || templateData.download_url;
      lines.push("DOWNLOAD TEMPLATE:");
      lines.push(dlUrl);
    } else {
      // Raw response
      const rawJson = JSON.stringify(templateData, null, 2);
      if (rawJson.length > 3000) {
        lines.push("RESPONSE (dipotong):");
        lines.push("```" + rawJson.substring(0, 3000) + "```");
        lines.push("", "...(" + (rawJson.length - 3000) + " karakter lagi)");
      } else {
        lines.push("RESPONSE:");
        lines.push("```" + rawJson + "```");
      }
    }

    lines.push("");
    lines.push("Source: smartdom API (gratis, no token)");

    return m.reply(claraWrap("WebsiteCloner", lines, "success"));
  } catch (e) {
    console.error("[WebsiteCloner]", e);
    m.reply(claraWrap("WebsiteCloner", [
      "Error: " + e.message,
      "",
      "Kemungkinan penyebab:",
      "1. URL tidak valid atau tidak aktif",
      "2. smartdom API sedang maintenance",
      "3. IP diblokir sementara",
      "4. Website terlalu kompleks untuk di-clone",
    ], "warn"));
  }
}

export { pluginConfig as config, handler };
