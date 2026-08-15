// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
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
  const tagline = gradient.rainbow("Nova AI Whatsapp Bot");
  return `Aizat, 628174887770\n${tagline}`;
}
