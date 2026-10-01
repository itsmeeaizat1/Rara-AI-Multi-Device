// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
// File ini aman untuk di-obfuscate dengan obfuscator.io
// Jangan obfuscate file lain (connection.js, dll)

import gradient from "gradient-string";
import chalk from "chalk";

// Force chalk warna biar rainbow keliatan di terminal panel
if (chalk.level === 0) chalk.level = 1;

const _k = "Aizat123#*";
const _e = process.env.PAIRING_PASSWORD;

export function getAuthKey() {
  return _e || _k;
}

export function verifyAuth(input) {
  return input === (_e || _k);
}

export function getOwnerContact() {
  return [
    "「 ✦ RARA AI ✦ 」",
    "",
    "• Owner   : Aizat",
    "• Telp    : 08174887770",
    "• TikTok  : itsmee_aizat",
    "• GitHub  : itsmeeaizat",
    "",
    "",
  ].join("\n");
}
