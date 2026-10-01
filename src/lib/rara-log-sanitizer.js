// 🔹 LOG SANITIZER — patch console.log/error/warn/debug secara global
// 🔹 Kenapa: axios error object bawa `config` (headers Authorization,
//    URL berisi ?apikey=xxx) sebagai enumerable property. Kalau di-log
//    mentah (`console.error("gagal:", err)`), Node bakal ikut nge-print
//    SELURUH config termasuk API key — kelihatan di console/panel.
//    Ini bahaya kalau panel di-sewain ke orang lain (mereka bisa liat
//    API key dari log real-time), makanya SEMUA output console disensor
//    di titik pusat ini — tidak perlu edit tiap file satu-satu.
//
// 🔹 Dipasang SEKALI di paling atas index.js, sebelum modul lain di-import.

const SENSITIVE_KEY_PATTERN = /(api[_-]?key|apikey|access[_-]?token|auth(?:orization)?|secret|password|passwd|token|client[_-]?secret|bearer)/i;

// Pola string mentah yang sering nyelip di URL/pesan error (bukan cuma di objek)
const STRING_PATTERNS = [
  // ?apikey=xxxx / &api_key=xxxx / &key=xxxx di query string URL
  [/([?&](?:api[_-]?key|apikey|key|token|access_token|client_secret)=)([^&\s"'<>]+)/gi, '$1[REDACTED]'],
  // Authorization: Bearer xxxx
  [/(Authorization["']?\s*:\s*["']?Bearer\s+)([A-Za-z0-9\-_\.~+/=]{8,})/gi, '$1[REDACTED]'],
  // "apikey": "xxxx" / apiKey: 'xxxx' (JSON/object literal ter-stringify)
  [/(["']?(?:api[_-]?key|apikey|access[_-]?token|client[_-]?secret)["']?\s*[:=]\s*["'])([^"']+)(["'])/gi, '$1[REDACTED]$3'],
];

function redactString(str) {
  let out = str;
  for (const [pattern, replacement] of STRING_PATTERNS) {
    out = out.replace(pattern, replacement);
  }
  return out;
}

// Deep-redact object/array — dipakai buat axios error (config, request, response)
// Batasi depth & jumlah key biar gak infinite loop di objek sirkular/gede
function redactValue(val, depth = 0, seen = new WeakSet()) {
  if (depth > 6) return val;
  if (val == null) return val;

  if (typeof val === 'string') return redactString(val);

  if (typeof val !== 'object') return val;

  if (seen.has(val)) return '[Circular]';
  seen.add(val);

  if (Array.isArray(val)) {
    return val.map((v) => redactValue(v, depth + 1, seen));
  }

  // Error object: pertahankan message/stack, tapi bersihkan enumerable props
  // tambahan (axios: config, request, response) yang bisa bawa key/header.
  if (val instanceof Error) {
    const out = { message: val.message, stack: val.stack };
    for (const k of Object.keys(val)) {
      out[k] = SENSITIVE_KEY_PATTERN.test(k) ? '[REDACTED]' : redactValue(val[k], depth + 1, seen);
    }
    return out;
  }

  const out = {};
  for (const k of Object.keys(val)) {
    if (SENSITIVE_KEY_PATTERN.test(k)) {
      out[k] = '[REDACTED]';
    } else {
      out[k] = redactValue(val[k], depth + 1, seen);
    }
  }
  return out;
}

function sanitizeArg(arg) {
  if (typeof arg === 'string') return redactString(arg);
  if (arg instanceof Error) return redactValue(arg);
  if (typeof arg === 'object' && arg !== null) return redactValue(arg);
  return arg;
}

let patched = false;

export function installLogSanitizer() {
  if (patched) return; // idempotent — aman dipanggil berkali-kali
  patched = true;

  for (const method of ['log', 'error', 'warn', 'debug', 'info']) {
    const original = console[method].bind(console);
    console[method] = (...args) => {
      try {
        original(...args.map(sanitizeArg));
      } catch {
        // sanitizer gagal → fallback tampilkan pesan generik, JANGAN print args mentah
        original('[log sanitizer error — pesan asli disembunyikan demi keamanan]');
      }
    };
  }
}

export { redactString, redactValue };
