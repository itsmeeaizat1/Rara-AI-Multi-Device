// E2E .totp — TOTP deterministik, verifikasi silang pakai otpauth langsung
import fs from "fs";
import * as OTPAuth from "otpauth";
const w = (s) => process.stdout.write(s + "\n");
let pass = 0, fail = 0;
const check = (name, ok) => { w((ok ? "  ✅ " : "  ❌ ") + name); ok ? pass++ : fail++; };

import * as lib from "../../src/lib/rara-totp.js";

const SECRET = "JBSWY3DPEHPK3PXP"; // secret test standar (RFC 4226)

// 1. addAccount
const r1 = lib.addAccount("user1", "gmail", SECRET);
check("1. add: ok + label tersimpan", r1.ok === true && r1.account.label === "gmail");
check("2. add: kode awal kegenerate 6 digit", r1.ok && r1.code.length === 6 && /^\d{6}$/.test(r1.code));

// 2. kode = verifikasi silang otpauth langsung (deterministik)
const ref = new OTPAuth.TOTP({ label: "gmail", algorithm: "SHA1", digits: 6, period: 30, secret: OTPAuth.Secret.fromBase32(SECRET) }).generate();
check("3. kode cocok sama otpauth langsung (RFC 6238)", r1.code === ref);

// 3. countdown 1-30 detik
const g1 = lib.generateCode(lib.findAccount("user1", "gmail"));
check("4. countdown 1-30 dtk", g1.secondsRemaining >= 1 && g1.secondsRemaining <= 30);

// 4. invalid inputs
check("5. secret ngawur ditolak", lib.addAccount("user1", "x1", "BUKANBASE32!!").ok === false);
check("6. secret kependekan ditolak", lib.addAccount("user1", "x2", "AB2").ok === false);
check("7. label kosong ditolak", lib.addAccount("user1", "", SECRET).ok === false);
check("8. label invalid ditolak", lib.addAccount("user1", "label;drop", SECRET).ok === false);
check("9. duplicate label ditolak", lib.addAccount("user1", "GMAIL", SECRET).ok === false);

// 5. otpauth:// URI parse
const uri = "otpauth://totp/facebook%3Auser1?secret=KRSXG5DSM5UQD2LO&issuer=Facebook&digits=6&period=30";
const r2 = lib.addAccount("user1", "facebook", uri);
check("10. otpauth:// URI keparse", r2.ok === true && r2.account.secret === "KRSXG5DSM5UQD2LO");
const uriBroken = "otpauth://totp/?secret=";
check("11. URI rusak ditolak", lib.addAccount("user1", "rusak", uriBroken).ok === false);

// 6. findAccount: label case-insensitive + nomor + not found
check("12. find by label (case-insensitive)", lib.findAccount("user1", "GMAIL")?.label === "gmail");
check("13. find by nomor urut", lib.findAccount("user1", "1")?.label === "gmail");
check("14. find not found → null", lib.findAccount("user1", "paypal") === null);

// 7. isolasi user
check("15. isolasi: user2 gak liat akun user1", lib.listAccounts("user2").length === 0);

// 8. list + limit
check("16. list user1 = 2 akun", lib.listAccounts("user1").length === 2);
for (let i = 0; i < 12; i++) lib.addAccount("user1", "akun" + i, SECRET);
check("17. maks 10 akun per user", lib.listAccounts("user1").length === 10);

// 9. remove
const r3 = lib.removeAccount("user1", "facebook");
check("18. del by label", r3.ok === true && r3.account.label === "facebook");
const r4 = lib.removeAccount("user1", "facebook");
check("19. del lagi → not found", r4.ok === false && r4.error === "not_found");

// 10. state persist
check("20. state file tersimpan", fs.existsSync("src/database/user/totp.json"));

// ────────── handler e2e ──────────
fs.rmSync("src/database/user/totp.json");
// reset state in-memory: re-import module fresh
const libUrl = new URL("../../src/lib/rara-totp.js", import.meta.url).href + "?t=" + Date.now();
const lib2 = await import(libUrl);
const { config, handler } = await import("../../plugins/tools/totp.js");

const replies = []; const reacts = [];
const mockM = (args, isGroup = false) => ({
  args, text: args.join(" "), prefix: ".", command: "totp", pushName: "Tester",
  chat: "62899@c.us", sender: "userA", isGroup,
  reply: async (t) => replies.push(String(t)), react: async (r) => reacts.push(r),
});
const mockSock = { sendMessage: async () => {} };

// guard grup
await handler(mockM(["gmail"], true), { sock: mockSock });
check("21. guard grup: diblok + warning 🔒", /ᴘʀɪᴠᴀᴛᴇ|private/i.test(replies.at(-1)) && reacts.at(-1) === "🔒");

// help no-arg
await handler(mockM([], false), { sock: mockSock });
check("22. no-arg: help reply", replies.at(-1).length > 50);

// add via command
await handler(mockM(["add", "gmail", SECRET]), { sock: mockSock });
check("23. add via command: tersimpan", lib.listAccounts("userA").length === 1);

// generate via command — kode = otpauth verifikasi
await handler(mockM(["gmail"]), { sock: mockSock });
const codeInReply = replies.at(-1).match(/\b(\d{6})\b/)?.[1];
const expect = new OTPAuth.TOTP({ algorithm: "SHA1", digits: 6, period: 30, secret: OTPAuth.Secret.fromBase32(SECRET) }).generate();
check("24. kode di reply = kode otpauth asli", codeInReply === expect);
check("25. reply ada countdown bar", /[▰▱]/.test(replies.at(-1)));

// list
await handler(mockM(["list"]), { sock: mockSock });
check("26. list command tampil akun", /ɢᴍᴀɪʟ|gmail/i.test(replies.at(-1)));

// del
await handler(mockM(["del", "gmail"]), { sock: mockSock });
check("27. del via command: kehapus", lib.listAccounts("userA").length === 0);

// not found
await handler(mockM(["paypal"]), { sock: mockSock });
check("28. akun gak ada → error ramah", /ɢᴀᴋ ᴀᴅᴀ|gak ada/i.test(replies.at(-1)));

// cleanup
fs.rmSync("src/database/user/totp.json");

w(`\n${fail === 0 ? "🎉 SEMUA PASS" : "⚠️ ADA FAIL"} — ${pass} pass, ${fail} fail`);
await new Promise((r) => setTimeout(r, 300));
process.exit(fail === 0 ? 0 : 1);
