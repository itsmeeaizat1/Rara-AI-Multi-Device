// stub src/handler.js — rekam panggilan messageHandler child bot
export const calls = [];
export async function messageHandler(msg, sock, opts) { calls.push({ msg, sock, opts }); }
