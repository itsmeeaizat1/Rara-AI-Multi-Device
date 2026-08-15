// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// File ini aman untuk di-obfuscate dengan obfuscator.io
// Jangan obfuscate file lain (connection.js, dll)

const _k = "Aizat123#*";
const _e = process.env.PAIRING_PASSWORD;

export function getAuthKey() {
  return _e || _k;
}

export function verifyAuth(input) {
  return input === (_e || _k);
}
