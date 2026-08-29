// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { novaError, novaEmpty, novaGuide, novaNoInput, claraWrap } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "virtualcheck",
  alias: ["virtualcheck"],
  category: "tools",
  description: "Deteksi apakah nomor HP virtual/VOIP/prepaid disposable atau nomor reguler",
  usage: ".virtualcheck <nomor>",
  example: ".virtualcheck 6281234567890",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 5,
  energi: 1,
  isEnabled: true,
};

// Prefix nomor virtual Indonesia (berdasarkan prefix yang dikenal)
const VIRTUAL_PREFIXES_ID = {
  // Aplikasi virtual number
  "62851": { provider: "Telkomsel Virtual / Cloud", type: "virtual", risk: "high" },
  "62852": { provider: "Telkomsel Virtual / Cloud", type: "virtual", risk: "high" },
  "62853": { provider: "Indosat Ooredoo Virtual", type: "virtual", risk: "high" },
  "62854": { provider: "Indosat Ooredoo Virtual", type: "virtual", risk: "high" },
  "62855": { provider: "Indosat Ooredoo Virtual", type: "virtual", risk: "high" },
  "62856": { provider: "Indosat Ooredoo Virtual", type: "virtual", risk: "high" },
  // Three (sering dipakai untuk nomor disposable)
  "62895": { provider: "Three (Hutchison)", type: "regular", risk: "low" },
  "62896": { provider: "Three (Hutchison)", type: "regular", risk: "low" },
  "62897": { provider: "Three (Hutchison)", type: "regular", risk: "low" },
  "62898": { provider: "Three (Hutchison)", type: "regular", risk: "low" },
  "62899": { provider: "Three (Hutchison)", type: "regular", risk: "low" },
};

// Provider VOIP/online terkenal (prefix internasional)
const VOIP_PROVIDERS = [
  { prefix: "1", name: "USA/Canada — Bisa Google Voice, TextNow, TextPlus, Burner" },
  { prefix: "44", name: "UK — Bisa Skype, Google Voice UK" },
  { prefix: "7", name: "Russia — Bisa nomor virtual" },
];

// Indikator nomor disposable/suspicious
const DISPOSABLE_INDICATORS = [
  { prefix: "62851", label: "Nomor virtual Telkomsel (sering dipakai scam)" },
  { prefix: "62852", label: "Nomor virtual Telkomsel (sering dipakai scam)" },
  { prefix: "62853", label: "Nomor virtual Indosat (sering dipakai scam)" },
  { prefix: "62854", label: "Nomor virtual Indosat (sering dipakai scam)" },
  { prefix: "62855", label: "Nomor virtual Indosat (sering dipakai scam)" },
];

// Prefix provider reguler Indonesia
const REGULAR_PROVIDERS = {
  "62811": "Telkomsel (Kartu Halo/Simpati)",
  "62812": "Telkomsel (Kartu Halo/Simpati)",
  "62813": "Telkomsel (Kartu Halo/Simpati)",
  "62821": "Telkomsel (AS)",
  "62822": "Telkomsel (AS)",
  "62823": "Telkomsel (AS)",
  "62851": "Telkomsel (Virtual)",
  "62852": "Telkomsel (Virtual)",
  "62814": "Indosat (Mentari)",
  "62815": "Indosat (Mentari/IM3)",
  "62816": "Indosat (Mentari/IM3)",
  "62817": "XL (Regular)",
  "62818": "XL (Regular)",
  "62819": "XL (Regular)",
  "62831": "Axis",
  "62832": "Axis",
  "62833": "Axis",
  "62838": "Axis",
  "62855": "Indosat (Virtual)",
  "62856": "Indosat (Virtual)",
  "62857": "Indosat (IM3)",
  "62858": "Indosat (IM3)",
  "62859": "Indosat (IM3)",
  "62877": "Smartfren",
  "62878": "Smartfren",
  "62879": "Smartfren",
  "62881": "Smartfren",
  "62882": "Smartfren",
  "62883": "Smartfren",
  "62884": "Smartfren",
  "62885": "Smartfren",
  "62886": "Smartfren",
  "62887": "Smartfren",
  "62888": "Smartfren (Talk-Mania)",
  "62889": "Smartfren",
  "62895": "Three",
  "62896": "Three",
  "62897": "Three",
  "62898": "Three",
  "62899": "Three",
};

function normalizeNumber(num) {
  let cleaned = num.replace(/[^0-9]/g, "");
  if (cleaned.startsWith("0")) cleaned = "62" + cleaned.slice(1);
  if (!cleaned.startsWith("62") && cleaned.length >= 8) cleaned = "62" + cleaned;
  return cleaned;
}

function checkNumber(num) {
  const findings = [];
  let isVirtual = false;
  let isVOIP = false;
  let riskScore = 0;
  let provider = "Tidak dikenali";
  let numberType = "Tidak dikenali";

  // Cek prefix virtual Indonesia
  for (const [prefix, info] of Object.entries(VIRTUAL_PREFIXES_ID)) {
    if (num.startsWith(prefix)) {
      isVirtual = true;
      provider = info.provider;
      numberType = "Virtual/Cloud";
      if (info.risk === "high") {
        riskScore += 40;
        findings.push("Nomor virtual Indonesia terdeteksi (" + info.provider + ")");
      }
      break;
    }
  }

  // Cek disposable indicators
  for (const ind of DISPOSABLE_INDICATORS) {
    if (num.startsWith(ind.prefix)) {
      findings.push(ind.label);
      riskScore += 20;
      break;
    }
  }

  // Cek provider reguler
  if (!isVirtual) {
    for (const [prefix, name] of Object.entries(REGULAR_PROVIDERS)) {
      if (num.startsWith(prefix)) {
        provider = name;
        numberType = name.includes("Virtual") ? "Virtual" : "Regular (SIM Card)";
        if (name.includes("Virtual")) {
          isVirtual = true;
          riskScore += 30;
          findings.push("Prefix virtual terdeteksi: " + name);
        } else {
          findings.push("Provider reguler: " + name);
        }
        break;
      }
    }
  }

  // Cek nomor internasional (VOIP potential)
  if (!num.startsWith("62")) {
    isVOIP = true;
    riskScore += 25;
    const countryCode = num.slice(0, 1);
    const voipMatch = VOIP_PROVIDERS.find((v) => num.startsWith(v.prefix));
    if (voipMatch) {
      findings.push("Nomor internasional (" + voipMatch.name + ")");
      provider = "Internasional";
      numberType = "Internasional/VOIP";
    } else {
      findings.push("Nomor internasional — kemungkinan VOIP/virtual");
      provider = "Internasional";
      numberType = "Internasional/VOIP";
    }
  }

  // Cek panjang nomor
  if (num.length < 10) {
    findings.push("Nomor terlalu pendek (" + num.length + " digit) — mencurigakan");
    riskScore += 20;
  }

  // Cek pola berulang (sering nomor palsu)
  if (/^(\d)\1{6,}$/.test(num)) {
    findings.push("Pola nomor berulang (semua digit sama) — kemungkinan palsu");
    riskScore += 30;
  }

  // Cek nomor mulai dengan 0 setelah kode negara
  if (num.startsWith("620")) {
    findings.push("Format tidak standar (620...) — nomor tidak valid");
    riskScore += 15;
  }

  // Final verdict
  let verdict;
  if (riskScore >= 60) verdict = "BERBAHAYA — Nomor virtual/suspicious";
  else if (riskScore >= 35) verdict = "MENCURIGAKAN — Mungkin virtual/disposable";
  else if (isVirtual) verdict = "VIRTUAL — Nomor virtual terdeteksi";
  else if (isVOIP) verdict = "VOIP — Nomor internasional/VOIP";
  else verdict = "AMAN — Nomor reguler";

  return { number: num, provider, numberType, isVirtual, isVOIP, riskScore, verdict, findings };
}

async function handler(m, { sock }) {
  const input = m.args.join(" ").trim();

  if (!input) {
    return m.reply( claraWrap("Virtual Check", [
      "Deteksi nomor virtual/VOIP/disposable vs nomor reguler",
      "",
      "CARA PAKAI:",
      m.prefix + "virtualcheck <nomor>",
      m.prefix + "cekvirtual <nomor>",
      "",
      "CONTOH:",
      m.prefix + "virtualcheck 6281234567890",
      m.prefix + "cekvirtual 081234567890",
      "",
      "Deteksi: Virtual Indonesia, VOIP internasional, disposable, pola palsu",
    ]), "virtualcheck");
  }

  await m.react("🔍");

  try {
    const num = normalizeNumber(input);
    const result = checkNumber(num);

    let verdictEmoji = "✅";
    if (result.riskScore >= 60) verdictEmoji = "🚫";
    else if (result.riskScore >= 35) verdictEmoji = "⚠️";
    else if (result.isVirtual || result.isVOIP) verdictEmoji = "⚠️";

    let lines = [
      "Nomor: " + num,
      "Provider: " + result.provider,
      "Tipe: " + result.numberType,
      "",
      "Hasil: " + verdictEmoji + " *" + result.verdict + "*",
      "Risk Score: " + result.riskScore + "/100",
      "",
    ];

    if (result.findings.length > 0) {
      lines.push("Detail:");
      result.findings.forEach((f, i) => {
        lines.push((i + 1) + ". " + f);
      });
    }

    lines.push("");
    if (result.riskScore >= 35) {
      lines.push("PERINGATAN: Nomor ini berpotensi virtual/VOIP.");
      lines.push("Hati-hati transaksi — nomor virtual sering dipakai penipu.");
      lines.push("Saran: Minta video call atau verifikasi identitas tambahan.");
    } else {
      lines.push("Nomor terlihat reguler (SIM card fisik).");
      lines.push("Tetap hati-hati saat transaksi.");
    }

    await m.react(result.riskScore >= 35 ? "⚠️" : "✅");
    return m.reply(claraWrap("Virtual Check", lines));
  } catch (e) {
    console.error("[Virtual Check]", e);
    return m.reply(claraWrap("Virtual Check", "Error: " + e.message));
  }
}

export { pluginConfig as config, handler };
