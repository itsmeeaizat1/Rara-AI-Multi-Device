import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { tipText, claraWrap } from "../../src/lib/nova-menu-style.js";
import { callAI } from "../../src/lib/nova-ai-service.js";
import { GoogleSearch } from "../../src/scraper/google.js";
import axios from "axios";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DB_PATH = path.join(__dirname, "..", "..", "data", "cekfakta-db.json");

// ─── Database helpers ───
function loadDB() {
  try {
    if (fs.existsSync(DB_PATH)) {
      return JSON.parse(fs.readFileSync(DB_PATH, "utf-8"));
    }
  } catch (e) { console.error('[cekfakta-v2.js]:', e.message); }
  return { groups: {} };
}

function saveDB(db) {
  try {
    const dir = path.dirname(DB_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));
  } catch (e) {
    console.log("[CEKFAKTA-V2] Failed to save DB:", e.message);
  }
}

function isCekFaktaOn(groupId) {
  const db = loadDB();
  return db.groups[groupId]?.enabled === true;
}

function toggleOn(groupId) {
  const db = loadDB();
  if (!db.groups[groupId]) db.groups[groupId] = {};
  db.groups[groupId].enabled = true;
  saveDB(db);
}

function toggleOff(groupId) {
  const db = loadDB();
  if (!db.groups[groupId]) db.groups[groupId] = {};
  db.groups[groupId].enabled = false;
  saveDB(db);
}

function getStats(groupId) {
  const db = loadDB();
  const g = db.groups[groupId] || {};
  return {
    enabled: g.enabled || false,
    totalChecks: g.totalChecks || 0,
    hoaxCount: g.hoaxCount || 0,
    faktaCount: g.faktaCount || 0,
    unverifiedCount: g.unverifiedCount || 0,
  };
}

function incrementStats(groupId, verdict) {
  const db = loadDB();
  if (!db.groups[groupId]) db.groups[groupId] = {};
  db.groups[groupId].totalChecks = (db.groups[groupId].totalChecks || 0) + 1;
  if (verdict === "HOAX") db.groups[groupId].hoaxCount = (db.groups[groupId].hoaxCount || 0) + 1;
  else if (verdict === "FAKTA") db.groups[groupId].faktaCount = (db.groups[groupId].faktaCount || 0) + 1;
  else db.groups[groupId].unverifiedCount = (db.groups[groupId].unverifiedCount || 0) + 1;
  saveDB(db);
}

// ─── Known hoax patterns (local quick-check before AI) ───
const HOAX_PATTERNS = [
  { regex: /hadiah|gratis[\s-]*(pulsa|kuota|saldo|voucher|iphone|motor|mobil)/i, type: "HOAX", note: "Pola hadiah gratis mencurigakan" },
  { regex: /klik\s*(link|tautan)\s*untuk\s*(klaim|ambil|menukar)/i, type: "HOAX", note: "Pola phishing: klaim hadiah via link" },
  { regex: /bagikan?\s*( ini|this)\s*ke\s*\d+/i, type: "HOAX", note: "Pola viral chain message: bagikan ke X orang/grup" },
  { regex: /wajib\s*(share|bagikan)/i, type: "HOAX", note: "Pola spam: wajib share" },
  { regex: /vaksin\s*(menyebabkan|bikin|bisa)\s*(autisme|kanker|mandul|kemandulan|hiv)/i, type: "HOAX", note: "Misinformasi medis: klaim vaksin terbukti salah" },
  { regex: /5g\s*(menyebabkan|bikin|bisa)\s*(corona|covid|virus)/i, type: "HOAX", note: "Misinformasi: 5G penyebab COVID terbukti salah" },
  { regex: /minum\s*(air\s*)?(keras|klorin|bleach|pemutih)\s*(sembuh|obat|sembuhkan)/i, type: "HOAX", note: "Misinformasi medis berbahaya" },
];

function quickLocalCheck(text) {
  for (const pattern of HOAX_PATTERNS) {
    if (pattern.regex.test(text)) {
      return pattern;
    }
  }
  return null;
}

// ─── Web search for fact-check context ───
async function searchWebForContext(claimText) {
  const searchResults = [];

  // Search 1: Claim + "cek fakta" / "hoax"
  const factCheckQuery = `${claimText.slice(0, 200)} cek fakta OR hoax OR benarkah`;
  // Search 2: Claim itself
  const generalQuery = claimText.slice(0, 200);

  const queries = [factCheckQuery, generalQuery];

  for (const query of queries) {
    try {
      const result = await GoogleSearch(query);
      if (result?.status && result?.results?.length > 0) {
        for (const item of result.results.slice(0, 5)) {
          searchResults.push({
            title: item.resource_title || "",
            url: item.resolved_endpoint || "",
            source: item.origin_node || "",
            date: item.temporal_stamp || "",
          });
        }
      }
    } catch (e) {
      console.log("[CEKFAKTA-V2] Google search failed:", e.message);
    }
  }

  // Deduplicate by URL
  const seen = new Set();
  const unique = searchResults.filter(r => {
    if (seen.has(r.url)) return false;
    seen.add(r.url);
    return true;
  });

  return unique.slice(0, 10);
}

// ─── Fetch snippet from a URL (try to get first paragraph) ───
async function fetchSnippet(url, timeoutMs = 5000) {
  try {
    const { data } = await axios.get(url, {
      timeout: timeoutMs,
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" },
      maxRedirects: 3,
    });
    // Extract text between <p> tags (simple extraction)
    const snippets = data.match(/<p[^>]*>([\s\S]*?)<\/p>/gi);
    if (snippets && snippets.length > 0) {
      let text = snippets
        .slice(0, 3)
        .map(s => s.replace(/<[^>]+>/g, ""))
        .join(" ")
        .replace(/\s+/g, " ")
        .trim();
      if (text.length > 500) text = text.slice(0, 500) + "...";
      return text;
    }
  } catch (e) { console.error('[cekfakta-v2.js]:', e.message); }
  return null;
}

export default {
  name: "cekfakta-v2",
  alias: ["cekhoax"],
  category: "group",
  desc: "Group Fact-Check & Hoax Detector v2 - AI + Web Search real-time verification dengan toggle per-grup",
  usage: ".cekfakta (reply pesan/klaim)\n.cekfakta <teks klaim>\n.cekfaktaon - Aktifkan (owner)\n.cekfaktaoff - Matikan (owner)\n.cekfaktastatus - Statistik",
  example: ".cekfakta\n.cekfakta Vaksin COVID bikin mandul\n.cekfaktaon",
  wait: "🕐",
  error: "❌",

  async handler(m, { sock, config: botConfig }) {
    const prefix = botConfig.command?.prefix || ".";
    const aiConfig = botConfig.aiHelp || {};
    const groupId = m.key?.remoteJid || m.chat || "";
    const raw = m.text?.trim() || "";

    // ─── Parse command ───
    const cmdMatch = raw.toLowerCase().match(new RegExp(
      `^${prefix}(cekfaktaon|cekfaktaoff|cekfaktastatus|cekfakta|factcheck|cekhoax)\\b`, "i"
    ));
    const command = cmdMatch ? cmdMatch[1].toLowerCase() : "";

    // Owner check
    const isOwner = (() => {
      const ownerJid = botConfig?.owner?.[0] || botConfig?.ownerNumber || "";
      const sender = m.sender || m.key?.participant || "";
      if (!ownerJid) return false;
      const cleanOwner = ownerJid.replace(/[^0-9]/g, "");
      const cleanSender = sender.replace(/[^0-9]/g, "");
      return cleanOwner === cleanSender;
    })();

    // ─── .cekfaktaon ───
    if (command === "cekfaktaon") {
      if (!isOwner) {
        await m.reply(claraWrap("Cek Fakta", [
          `┊ Status: *Akses Ditolak*`,
          ``,
          `┊ Hanya owner yang bisa mengatur fitur ini.`,
        ].join("\n")));
        return { handled: true };
      }
      toggleOn(groupId);
      await m.reply(claraWrap("Cek Fakta", [
        `┊ Status: *AKTIF* 🟢`,
        ``,
        `┊ Fitur Cek Fakta & Hoax Detector v2 dinyalakan.`,
        `┊ AI + Web Search aktif untuk verifikasi real-time.`,
        ``,
        `┊ Anggota grup: reply pesan + *${prefix}cekfakta*`,
      ].join("\n")));
      await m.react("✅");
      return { handled: true };
    }

    // ─── .cekfaktaoff ───
    if (command === "cekfaktaoff") {
      if (!isOwner) {
        await m.reply(claraWrap("Cek Fakta", [
          `┊ Status: *Akses Ditolak*`,
          ``,
          `┊ Hanya owner yang bisa mengatur fitur ini.`,
        ].join("\n")));
        return { handled: true };
      }
      toggleOff(groupId);
      await m.reply(claraWrap("Cek Fakta", [
        `┊ Status: *NONAKTIF* 🔴`,
        ``,
        `┊ Fitur Cek Fakta dimatikan.`,
        `┊ Ketik *${prefix}cekfaktaon* untuk aktifkan lagi.`,
      ].join("\n")));
      await m.react("✅");
      return { handled: true };
    }

    // ─── .cekfaktastatus ───
    if (command === "cekfaktastatus") {
      const stats = getStats(groupId);
      const statusText = stats.enabled ? "AKTIF 🟢" : "NONAKTIF 🔴";
      await m.reply(claraWrap("Cek Fakta - Status", [
        `┊ Status: *${statusText}*`,
        ``,
        `┊ 📊 Statistik Grup Ini:`,
        `┊ Total cek: *${stats.totalChecks}*`,
        `┊ Hoax: *${stats.hoaxCount}* 🔴`,
        `┊ Fakta: *${stats.faktaCount}* 🟢`,
        `┊ Belum terverifikasi: *${stats.unverifiedCount}* 🟡`,
        ``,
        `┊ Owner:`,
        `┊ ${prefix}cekfaktaon - Aktifkan`,
        `┊ ${prefix}cekfaktaoff - Matikan`,
      ].join("\n")));
      await m.react("✅");
      return { handled: true };
    }

    // ─── Main: .cekfakta (fact-check) ───
    if (!isCekFaktaOn(groupId)) {
      await m.reply(claraWrap("Cek Fakta", [
        `┊ Status: *Nonaktif di grup ini*`,
        ``,
        `┊ Owner: ketik *${prefix}cekfaktaon* untuk mengaktifkan.`,
      ].join("\n")));
      return { handled: true };
    }

    if (!aiConfig.apiKey) {
      await m.reply(claraWrap("Cek Fakta", [
        `┊ Status: *AI belum dikonfigurasi*`,
        ``,
        `┊ Owner: ketik *${prefix}aihelp* untuk set API key.`,
      ].join("\n")));
      return { handled: true };
    }

    // Ambil teks klaim
    let claimText = "";
    const quoted = m.quoted;

    if (quoted) {
      claimText = (quoted.text || "").trim();
    }
    if (!claimText) {
      claimText = raw
        .replace(new RegExp(`^${prefix}(cekfakta|factcheck|cekhoax)\\s+`, "i"), "")
        .trim();
    }

    if (!claimText || claimText.length < 3) {
      await m.reply(claraWrap("Cek Fakta", [
        `┊ Cara Pakai:`,
        ``,
        `┊ 1. Reply pesan/berita → ketik *${prefix}cekfakta*`,
        `┊ 2. Atau ketik: *${prefix}cekfakta <klaim>*`,
        ``,
        `┊ Contoh:`,
        `┊    *${prefix}cekfakta Vaksin COVID bikin mandul*`,
        `┊    Reply WA forward → *${prefix}cekfakta*`,
        ``,
        `┊ Owner:`,
        `┊ *${prefix}cekfaktaon* / *${prefix}cekfaktaoff* / *${prefix}cekfaktastatus*`,
      ].join("\n")));
      return { handled: true };
    }

    if (claimText.length > 3000) claimText = claimText.slice(0, 3000);

    await m.react("🐣");

    // ─── Step 1: Local pattern quick-check ───
    const localCheck = quickLocalCheck(claimText);
    const localNote = localCheck
      ? `Deteksi lokal: ${localCheck.note} (pola terdeteksi otomatis)`
      : null;

    // ─── Step 2: Web search for context ───
    let searchContext = "";
    let searchSources = [];
    try {
      await m.reply(claraWrap("Cek Fakta - Searching", [
        `┊ 🔍 Mencari informasi di internet...`,
        `┊ 🤖 AI akan menganalisis hasil pencarian...`,
      ].join("\n")));

      const webResults = await searchWebForContext(claimText);

      if (webResults.length > 0) {
        // Fetch snippets from top 3 results
        const snippetPromises = webResults.slice(0, 3).map(r => fetchSnippet(r.url));
        const snippets = await Promise.allSettled(snippetPromises);

        searchSources = webResults.map((r, i) => ({
          title: r.title,
          source: r.source,
          url: r.url,
          snippet: snippets[i]?.status === "fulfilled" ? snippets[i].value : null,
        }));

        // Build context text for AI
        const contextParts = searchSources.map((s, i) => {
          let part = `Sumber ${i + 1}: ${s.title}`;
          if (s.source) part += ` (${s.source})`;
          if (s.snippet) part += `\nRingkasan: ${s.snippet}`;
          return part;
        });
        searchContext = `Hasil pencarian internet terkait klaim ini:\n\n${contextParts.join("\n\n")}`;
      }
    } catch (e) {
      console.log("[CEKFAKTA-V2] Web search failed:", e.message);
    }

    // ─── Step 3: AI analysis with web context ───
    const systemPrompt = `Kamu adalah fact-checker profesional Indonesia. Tugasmu menganalisis klaim, berita, atau isu viral dan memberikan verdict berdasarkan kredibilitas informasi.

${searchContext ? `Kamu DIBERIKAN hasil pencarian internet real-time sebagai konteks. Gunakan hasil pencarian ini sebagai referensi utama, ditambah pengetahuanmu untuk verdict.` : `Tidak ada hasil pencarian internet tersedia. Gunakan pengetahuanmu untuk analisis.`}

Aturan output HARUS persis format ini (gunakan bahasa Indonesia):

VERDICT:
[HOAX atau FAKTA atau BELUM TERVERIFIKASI - pilih SATU saja]

TINGKAT KEYAKINAN:
[Nilai 0-100%]

RINGKASAN:
[Ringkasan 2-3 kalimat]

PENJELASAN:
[Penjelasan detail mengapa HOAX/FAKTA/BELUM TERVERIFIKASI. Sertakan fakta, data, referensi]

KONTEKS:
[Konteks isu: kapan viral, platform, siapa menyebarkan]

REKOMENDASI:
[Saran tindakan: abaikan, cek sumber resmi, laporkan, dll]

SUMBER VERIFIKASI:
[Jenis sumber untuk verifikasi: turnbackhoax.id, cekfakta.com, Mafindo, situs pemerintah, WHO, Kemenkes, dll]

Aturan:
1. Tentukan verdict seobjektif mungkin berdasarkan konteks pencarian + pengetahuan
2. Klaim tentang event yang belum terjadi → BELUM TERVERIFIKASI
3. Klaim medis/sains → rujuk konsensus ilmiah, WHO/Kemenkes
4. Jangan mengarang URL spesifik, sebutkan jenis sumber saja
5. Klaim politik sensitif → cenderung BELUM TERVERIFIKASI kecuali jelas hoax (provokasi SARA)
6. Ringkas, fokus pada fakta`;

    try {
      const userContent = searchContext
        ? `${searchContext}\n\n---\n\nAnalisis klaim berikut dan berikan verdict fact-check:\n\n"${claimText}"`
        : `Analisis klaim/berita berikut dan berikan verdict fact-check:\n\n"${claimText}"`;

      const reply = await callAI({
        providerKey: "openai",
        model: aiConfig.model || "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userContent },
        ],
        apiKey: aiConfig.apiKey,
        apiEndpoint: aiConfig.apiEndpoint,
        temperature: 0.2,
        maxTokens: 1024,
      });

      // Parse AI response
      const sections = {};
      const labels = ["VERDICT", "TINGKAT KEYAKINAN", "RINGKASAN", "PENJELASAN", "KONTEKS", "REKOMENDASI", "SUMBER VERIFIKASI"];

      for (const label of labels) {
        const regex = new RegExp(`${label}:\\s*\\n?([\\s\\S]*?)(?=\\n\\n[A-Z][A-Z ]+:|$)`, "i");
        const match = reply.match(regex);
        sections[label] = match ? match[1].trim() : "-";
      }

      // Verdict display
      const verdict = (sections["VERDICT"] || "").toUpperCase();
      let verdictEmoji = "🟡";
      let verdictColor = "BELUM TERVERIFIKASI";
      if (verdict.includes("HOAX")) {
        verdictEmoji = "🔴";
        verdictColor = "HOAX";
      } else if (verdict.includes("FAKTA") && !verdict.includes("BELUM")) {
        verdictEmoji = "🟢";
        verdictColor = "FAKTA";
      }

      // Confidence
      const confidenceMatch = (sections["TINGKAT KEYAKINAN"] || "").match(/(\d+)\s*%/);
      const confidence = confidenceMatch ? confidenceMatch[1] : "??";

      // Truncate claim
      const displayClaim = claimText.length > 150 ? claimText.slice(0, 150) + "..." : claimText;

      // Build search source list
      let sourceLines = [];
      if (searchSources.length > 0) {
        sourceLines.push(``, `┊ 🔎 Sumber Pencarian Internet:`);
        searchSources.slice(0, 5).forEach((s, i) => {
          sourceLines.push(`┊ ${i + 1}. ${s.title || "Tanpa judul"}`);
          if (s.source) sourceLines.push(`┊    Sumber: ${s.source}`);
        });
      }

      // Build output
      const lines = [
        `┊ ${verdictEmoji} Verdict: *${verdictColor}*`,
        `┊ Keyakinan: *${confidence}%*`,
        `┊ Sumber: ${searchSources.length > 0 ? "AI + Web Search" : "AI saja"}`,
        ``,
        `┊ 📝 Klaim:`,
        `┊ "${displayClaim}"`,
        ``,
        `┊ 📋 Ringkasan:`,
        `┊ ${sections["RINGKASAN"]}`,
        ``,
        `┊ 🔍 Penjelasan:`,
        `┊ ${sections["PENJELASAN"]}`,
        ``,
        `┊ 🌐 Konteks:`,
        `┊ ${sections["KONTEKS"]}`,
        ``,
        `┊ 💡 Rekomendasi:`,
        `┊ ${sections["REKOMENDASI"]}`,
        ``,
        `┊ 📚 Sumber Verifikasi:`,
        `┊ ${sections["SUMBER VERIFIKASI"]}`,
      ];

      // Add local pattern note
      if (localNote) {
        lines.push(``, `┊ ⚠️ Deteksi Lokal:`, `┊ ${localNote}`);
      }

      // Add web search sources
      lines.push(...sourceLines);

      lines.push(
        ``, `┊ 📊 *${prefix}cekfaktastatus* untuk statistik grup`,
      );

      const text =
        claraWrap("Cek Fakta & Hoax Detector v2", lines.join("\n")) +
        "\n" +
        tipText(`Reply klaim lain + ${prefix}cekfakta untuk cek lagi`);

      await m.reply(text);
      await m.react("✅");

      // Update stats
      incrementStats(groupId, verdictColor);
    } catch (error) {
      const text =
        claraWrap("Cek Fakta - Error", [
          `┊ Status: *Gagal*`,
          `┊ Alasan: *${error.message}*`,
          ``,
          `┊ Cek AI API key: *${prefix}aihelp*`,
        ].join("\n"));
      await m.reply(text);
      await m.react("❌");
    }

    return { handled: true };
  },
};
