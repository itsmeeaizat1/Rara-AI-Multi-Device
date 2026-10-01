// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
// session-cli.js — Util CLI pairing & normalisasi nomor (9 Sep 2026,
// request owner: "di run cmd support masukin no pairing, gak perlu
// set manual dr file bot identity")

// Normalisasi nomor Indonesia: 08xxx → 628xxx, 8xxx → 628xxx
export function normalizePhone(raw) {
  let d = String(raw || "").replace(/[^0-9]/g, "");
  if (d.startsWith("0")) d = "62" + d.slice(1);
  else if (/^[1-9]/.test(d) && !d.startsWith("62")) d = "62" + d;
  return d;
}

// Parse CLI: --pairing 628xxx | --pairing=628xxx | node index.js 628xxx
export function parseCliPairing(argv = []) {
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--pairing" && argv[i + 1]) return argv[i + 1];
    if (typeof a === "string" && a.startsWith("--pairing=")) return a.slice("--pairing=".length);
    if (i > 1 && /^62\d{8,}$/.test(a)) return a;
  }
  return "";
}
