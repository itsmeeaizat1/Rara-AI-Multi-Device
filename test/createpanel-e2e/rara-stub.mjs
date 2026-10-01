// Stub "rara" untuk e2e createserver — semua export asli (jidDecode dll) + interactive msg mock
export * from "../../node_modules/rara/lib/index.js";
export async function prepareWAMessageMedia() { return { imageMessage: { url: "mock" } } }
export function generateWAMessageFromContent(to, content, opts) {
  return { key: { id: "mock-" + Date.now(), remoteJid: to }, message: { stub: true, content } }
}
