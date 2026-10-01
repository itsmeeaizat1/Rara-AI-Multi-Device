// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
// rara-totp.js — TOTP 2FA Authenticator: simpen secret TOTP di bot,
// generate kode 6-digit real-time ala Google Authenticator
// (fitur baru 9 Sep 2026, request owner "fitur yg blm prnh ada di bot")
//
// .totp add <label> <secret|otpauth://totp/...> — simpen akun
// .totp <label> — kode sekarang + countdown | .totp list | .totp del <no|label>
// DEP BARU: otpauth (RFC 6238 TOTP asli). PRIVATE ONLY — kode 2FA sensitif.
// Secret diencrypt gak? file state plaintext ala apikeys.json (bot pribadi).

import * as OTPAuth from "otpauth";
import fs from "fs";
import path from "path";
import crypto from "crypto";
import { logger } from "./rara-logger.js";

const STATE_FILE = path.join(process.cwd(), "src", "database", "user", "totp.json");
const MAX_ACCOUNTS_PER_USER = 10;

// ------------------------------ state ------------------------------

let state = { accounts: [] };

function loadState() {
  try {
    if (fs.existsSync(STATE_FILE)) {
      state = { accounts: [], ...JSON.parse(fs.readFileSync(STATE_FILE, "utf8")) };
    }
  } catch (e) {
    logger?.warn?.("[totp] state load gagal: " + e.message);
    state = { accounts: [] };
  }
}

function saveState() {
  try {
    fs.mkdirSync(path.dirname(STATE_FILE), { recursive: true });
    fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
  } catch (e) {
    logger?.warn?.("[totp] state save gagal: " + e.message);
  }
}

function newId() {
  return "tp-" + crypto.randomBytes(4).toString("hex");
}

loadState();

// ------------------------------ parse ------------------------------

// terima raw base32 ATAU otpauth:// URI
export function parseSecretInput(raw) {
  const s = String(raw || "").trim();
  if (/^otpauth:\/\/totp\//i.test(s)) {
    try {
      const uri = OTPAuth.URI.parse(s);
      return {
        ok: true,
        label: uri.label || "",
        secret: String(uri.secret?.buffer ? uri.secret.base32 : uri.secret || ""),
        digits: uri.digits || 6,
        period: uri.period || 30,
      };
    } catch (e) {
      return { ok: false, error: "uri_invalid" };
    }
  }
  // base32 mentah
  if (!/^[A-Z2-7]+=*$/i.test(s.replace(/\s/g, "")) || s.replace(/\s/g, "").length < 8) {
    return { ok: false, error: "secret_invalid" };
  }
  return { ok: true, label: "", secret: s.replace(/\s/g, "").toUpperCase(), digits: 6, period: 30 };
}

// ------------------------------ API ------------------------------

function makeTotp(account) {
  return new OTPAuth.TOTP({
    label: account.label,
    algorithm: "SHA1",
    digits: account.digits || 6,
    period: account.period || 30,
    secret: OTPAuth.Secret.fromBase32(account.secret),
  });
}

export function generateCode(account) {
  try {
    const totp = makeTotp(account);
    const code = totp.generate();
    const period = account.period || 30;
    const secondsRemaining = period - (Math.floor(Date.now() / 1000) % period);
    return { ok: true, code, secondsRemaining };
  } catch (e) {
    return { ok: false, error: "generate_failed" };
  }
}

export function addAccount(userId, label, secretInput) {
  const parsed = parseSecretInput(secretInput);
  if (!parsed.ok) return parsed;

  const finalLabel = String(label || parsed.label || "").trim();
  if (!finalLabel) return { ok: false, error: "label_required" };
  if (!/^[a-zA-Z0-9 ._\-]{2,30}$/.test(finalLabel)) return { ok: false, error: "label_invalid" };

  const mine = state.accounts.filter((a) => a.userId === userId);
  if (mine.length >= MAX_ACCOUNTS_PER_USER) return { ok: false, error: "limit" };
  if (mine.some((a) => a.label.toLowerCase() === finalLabel.toLowerCase())) {
    return { ok: false, error: "duplicate" };
  }

  // validasi secret dengan generate sekali
  const probe = generateCode({ label: finalLabel, secret: parsed.secret, digits: parsed.digits, period: parsed.period });
  if (!probe.ok) return { ok: false, error: "secret_invalid" };

  const account = {
    id: newId(),
    userId,
    label: finalLabel,
    secret: parsed.secret,
    digits: parsed.digits,
    period: parsed.period,
    createdDate: new Date().toISOString(),
  };
  state.accounts.push(account);
  saveState();
  return { ok: true, account, code: probe.code };
}

export function listAccounts(userId) {
  return state.accounts.filter((a) => a.userId === userId);
}

export function findAccount(userId, key) {
  const k = String(key || "").trim();
  const mine = listAccounts(userId);
  if (/^\d+$/.test(k)) return mine[Number(k) - 1] || null;
  return mine.find((a) => a.label.toLowerCase() === k.toLowerCase()) || null;
}

export function removeAccount(userId, key) {
  const target = findAccount(userId, key);
  if (!target) return { ok: false, error: "not_found" };
  const i = state.accounts.indexOf(target);
  if (i !== -1) {
    state.accounts.splice(i, 1);
    saveState();
  }
  return { ok: true, account: target };
}
