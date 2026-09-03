// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// src/lib/panel/config.js — CONFIG PANEL PTERODACTYL v1 - v100
//
// EDIT FILE INI buat daftarin semua domain panel lu (v1 - v100).
//
// Field per slot:
//   domain  : URL panel Pterodactyl (wajib diisi, tanpa garis miring di akhir)
//   apikey  : PTLA — Application API key (ptla_xxx) — admin panel
//   capikey : PTLC — Client API key (ptlc_xxx) — buat fitur status/upload
//   egg / nestid / location : default pembuatan server di panel tsb
//
// PENTING (aturan repo): JANGAN hardcode PTLA/PTLC di file ini.
//   - Kalau kosong ("") → diambil dari misc.json (ptero_serverN_apikey / ptero_serverN_capikey)
//   - Atau set langsung dari WhatsApp: .setpanel v2 domain https://... | apikey ptla_xxx | capikey ptlc_xxx
//     (tersimpan di src/data/ptero-panels.json — menang dari semua sumber)
//
// Prioritas nilai: ptero-panels.json (.setpanel)  >  file ini  >  misc.json
// Slot yang domain + PTLA-nya belum ada gak akan muncul di daftar panel aktif.

export const PANELS = {
  // ── Panel v1 (aktif — PTLA/PTLC dari misc.json) ──
  1: { domain: "__REDACTED__", apikey: "", capikey: "", egg: "15", nestid: "5", location: "1" },

  // ── Panel v2 - v100 (isi domainnya di sini) ──
  2: { domain: "", apikey: "", capikey: "", egg: "15", nestid: "5", location: "1" },
  3: { domain: "", apikey: "", capikey: "", egg: "15", nestid: "5", location: "1" },
  4: { domain: "", apikey: "", capikey: "", egg: "15", nestid: "5", location: "1" },
  5: { domain: "", apikey: "", capikey: "", egg: "15", nestid: "5", location: "1" },
  6: { domain: "", apikey: "", capikey: "", egg: "15", nestid: "5", location: "1" },
  7: { domain: "", apikey: "", capikey: "", egg: "15", nestid: "5", location: "1" },
  8: { domain: "", apikey: "", capikey: "", egg: "15", nestid: "5", location: "1" },
  9: { domain: "", apikey: "", capikey: "", egg: "15", nestid: "5", location: "1" },
  10: { domain: "", apikey: "", capikey: "", egg: "15", nestid: "5", location: "1" },

  // ── Panel v11 - v19 ──
  11: { domain: "", apikey: "", capikey: "", egg: "15", nestid: "5", location: "1" },
  12: { domain: "", apikey: "", capikey: "", egg: "15", nestid: "5", location: "1" },
  13: { domain: "", apikey: "", capikey: "", egg: "15", nestid: "5", location: "1" },
  14: { domain: "", apikey: "", capikey: "", egg: "15", nestid: "5", location: "1" },
  15: { domain: "", apikey: "", capikey: "", egg: "15", nestid: "5", location: "1" },
  16: { domain: "", apikey: "", capikey: "", egg: "15", nestid: "5", location: "1" },
  17: { domain: "", apikey: "", capikey: "", egg: "15", nestid: "5", location: "1" },
  18: { domain: "", apikey: "", capikey: "", egg: "15", nestid: "5", location: "1" },
  19: { domain: "", apikey: "", capikey: "", egg: "15", nestid: "5", location: "1" },
  20: { domain: "", apikey: "", capikey: "", egg: "15", nestid: "5", location: "1" },

  // ── Panel v21 - v29 ──
  21: { domain: "", apikey: "", capikey: "", egg: "15", nestid: "5", location: "1" },
  22: { domain: "", apikey: "", capikey: "", egg: "15", nestid: "5", location: "1" },
  23: { domain: "", apikey: "", capikey: "", egg: "15", nestid: "5", location: "1" },
  24: { domain: "", apikey: "", capikey: "", egg: "15", nestid: "5", location: "1" },
  25: { domain: "", apikey: "", capikey: "", egg: "15", nestid: "5", location: "1" },
  26: { domain: "", apikey: "", capikey: "", egg: "15", nestid: "5", location: "1" },
  27: { domain: "", apikey: "", capikey: "", egg: "15", nestid: "5", location: "1" },
  28: { domain: "", apikey: "", capikey: "", egg: "15", nestid: "5", location: "1" },
  29: { domain: "", apikey: "", capikey: "", egg: "15", nestid: "5", location: "1" },
  30: { domain: "", apikey: "", capikey: "", egg: "15", nestid: "5", location: "1" },

  // ── Panel v31 - v39 ──
  31: { domain: "", apikey: "", capikey: "", egg: "15", nestid: "5", location: "1" },
  32: { domain: "", apikey: "", capikey: "", egg: "15", nestid: "5", location: "1" },
  33: { domain: "", apikey: "", capikey: "", egg: "15", nestid: "5", location: "1" },
  34: { domain: "", apikey: "", capikey: "", egg: "15", nestid: "5", location: "1" },
  35: { domain: "", apikey: "", capikey: "", egg: "15", nestid: "5", location: "1" },
  36: { domain: "", apikey: "", capikey: "", egg: "15", nestid: "5", location: "1" },
  37: { domain: "", apikey: "", capikey: "", egg: "15", nestid: "5", location: "1" },
  38: { domain: "", apikey: "", capikey: "", egg: "15", nestid: "5", location: "1" },
  39: { domain: "", apikey: "", capikey: "", egg: "15", nestid: "5", location: "1" },
  40: { domain: "", apikey: "", capikey: "", egg: "15", nestid: "5", location: "1" },

  // ── Panel v41 - v49 ──
  41: { domain: "", apikey: "", capikey: "", egg: "15", nestid: "5", location: "1" },
  42: { domain: "", apikey: "", capikey: "", egg: "15", nestid: "5", location: "1" },
  43: { domain: "", apikey: "", capikey: "", egg: "15", nestid: "5", location: "1" },
  44: { domain: "", apikey: "", capikey: "", egg: "15", nestid: "5", location: "1" },
  45: { domain: "", apikey: "", capikey: "", egg: "15", nestid: "5", location: "1" },
  46: { domain: "", apikey: "", capikey: "", egg: "15", nestid: "5", location: "1" },
  47: { domain: "", apikey: "", capikey: "", egg: "15", nestid: "5", location: "1" },
  48: { domain: "", apikey: "", capikey: "", egg: "15", nestid: "5", location: "1" },
  49: { domain: "", apikey: "", capikey: "", egg: "15", nestid: "5", location: "1" },
  50: { domain: "", apikey: "", capikey: "", egg: "15", nestid: "5", location: "1" },

  // ── Panel v51 - v59 ──
  51: { domain: "", apikey: "", capikey: "", egg: "15", nestid: "5", location: "1" },
  52: { domain: "", apikey: "", capikey: "", egg: "15", nestid: "5", location: "1" },
  53: { domain: "", apikey: "", capikey: "", egg: "15", nestid: "5", location: "1" },
  54: { domain: "", apikey: "", capikey: "", egg: "15", nestid: "5", location: "1" },
  55: { domain: "", apikey: "", capikey: "", egg: "15", nestid: "5", location: "1" },
  56: { domain: "", apikey: "", capikey: "", egg: "15", nestid: "5", location: "1" },
  57: { domain: "", apikey: "", capikey: "", egg: "15", nestid: "5", location: "1" },
  58: { domain: "", apikey: "", capikey: "", egg: "15", nestid: "5", location: "1" },
  59: { domain: "", apikey: "", capikey: "", egg: "15", nestid: "5", location: "1" },
  60: { domain: "", apikey: "", capikey: "", egg: "15", nestid: "5", location: "1" },

  // ── Panel v61 - v69 ──
  61: { domain: "", apikey: "", capikey: "", egg: "15", nestid: "5", location: "1" },
  62: { domain: "", apikey: "", capikey: "", egg: "15", nestid: "5", location: "1" },
  63: { domain: "", apikey: "", capikey: "", egg: "15", nestid: "5", location: "1" },
  64: { domain: "", apikey: "", capikey: "", egg: "15", nestid: "5", location: "1" },
  65: { domain: "", apikey: "", capikey: "", egg: "15", nestid: "5", location: "1" },
  66: { domain: "", apikey: "", capikey: "", egg: "15", nestid: "5", location: "1" },
  67: { domain: "", apikey: "", capikey: "", egg: "15", nestid: "5", location: "1" },
  68: { domain: "", apikey: "", capikey: "", egg: "15", nestid: "5", location: "1" },
  69: { domain: "", apikey: "", capikey: "", egg: "15", nestid: "5", location: "1" },
  70: { domain: "", apikey: "", capikey: "", egg: "15", nestid: "5", location: "1" },

  // ── Panel v71 - v79 ──
  71: { domain: "", apikey: "", capikey: "", egg: "15", nestid: "5", location: "1" },
  72: { domain: "", apikey: "", capikey: "", egg: "15", nestid: "5", location: "1" },
  73: { domain: "", apikey: "", capikey: "", egg: "15", nestid: "5", location: "1" },
  74: { domain: "", apikey: "", capikey: "", egg: "15", nestid: "5", location: "1" },
  75: { domain: "", apikey: "", capikey: "", egg: "15", nestid: "5", location: "1" },
  76: { domain: "", apikey: "", capikey: "", egg: "15", nestid: "5", location: "1" },
  77: { domain: "", apikey: "", capikey: "", egg: "15", nestid: "5", location: "1" },
  78: { domain: "", apikey: "", capikey: "", egg: "15", nestid: "5", location: "1" },
  79: { domain: "", apikey: "", capikey: "", egg: "15", nestid: "5", location: "1" },
  80: { domain: "", apikey: "", capikey: "", egg: "15", nestid: "5", location: "1" },

  // ── Panel v81 - v89 ──
  81: { domain: "", apikey: "", capikey: "", egg: "15", nestid: "5", location: "1" },
  82: { domain: "", apikey: "", capikey: "", egg: "15", nestid: "5", location: "1" },
  83: { domain: "", apikey: "", capikey: "", egg: "15", nestid: "5", location: "1" },
  84: { domain: "", apikey: "", capikey: "", egg: "15", nestid: "5", location: "1" },
  85: { domain: "", apikey: "", capikey: "", egg: "15", nestid: "5", location: "1" },
  86: { domain: "", apikey: "", capikey: "", egg: "15", nestid: "5", location: "1" },
  87: { domain: "", apikey: "", capikey: "", egg: "15", nestid: "5", location: "1" },
  88: { domain: "", apikey: "", capikey: "", egg: "15", nestid: "5", location: "1" },
  89: { domain: "", apikey: "", capikey: "", egg: "15", nestid: "5", location: "1" },
  90: { domain: "", apikey: "", capikey: "", egg: "15", nestid: "5", location: "1" },

  // ── Panel v91 - v99 ──
  91: { domain: "", apikey: "", capikey: "", egg: "15", nestid: "5", location: "1" },
  92: { domain: "", apikey: "", capikey: "", egg: "15", nestid: "5", location: "1" },
  93: { domain: "", apikey: "", capikey: "", egg: "15", nestid: "5", location: "1" },
  94: { domain: "", apikey: "", capikey: "", egg: "15", nestid: "5", location: "1" },
  95: { domain: "", apikey: "", capikey: "", egg: "15", nestid: "5", location: "1" },
  96: { domain: "", apikey: "", capikey: "", egg: "15", nestid: "5", location: "1" },
  97: { domain: "", apikey: "", capikey: "", egg: "15", nestid: "5", location: "1" },
  98: { domain: "", apikey: "", capikey: "", egg: "15", nestid: "5", location: "1" },
  99: { domain: "", apikey: "", capikey: "", egg: "15", nestid: "5", location: "1" },
  100: { domain: "", apikey: "", capikey: "", egg: "15", nestid: "5", location: "1" },
};
