// E2E .webwatch — fetcher di-inject, 100% offline
import fs from "fs";
const w = (s) => process.stdout.write(s + "\n");
let pass = 0, fail = 0;
const check = (name, ok) => { w((ok ? "  ✅ " : "  ❌ ") + name); ok ? pass++ : fail++; };

// fake site: konten bisa diubah dari test
const sites = {
  "https://contoh.com": { status: 200, contentType: "text/html", body: "<html><head><title>Contoh</title></head><body>versi 1\nharga Rp 100\nbye</body></html>" },
  "https://berita.com": { status: 200, contentType: "text/html", body: "headline lama\nini body" },
};
const unreachable = { "https://mati.com": false };

import * as lib from "../../src/lib/nova-webwatch.js";
lib.setFetcher(async (url) => {
  if (unreachable[url]) throw new Error("timeout");
  if (/^https:\/\/contoh\.com\//.test(url)) return { status: 200, body: "halaman " + url, contentType: "text/html" };
  const s = sites[url];
  if (!s) throw new Error("404");
  return { status: s.status, body: s.body, contentType: s.contentType };
});

const sent = [];
const mockSock = { sendMessage: async (chatId, content) => { sent.push({ chatId, text: content?.text || "" }); } };
lib.setSock(mockSock);
await lib.initWebWatch(mockSock);

// 1. addWatch valid → snapshot tersimpan
const r1 = await lib.addWatch("chatA", "https://contoh.com", 30);
check("1. addWatch: ok + title keparse", r1.ok === true && r1.watch.title === "Contoh");
check("2. addWatch: hash + size snapshot", r1.watch.lastHash.length === 64 && r1.watch.lastSize > 0);
check("3. addWatch: interval tersimpan 30", r1.watch.intervalMenit === 30);

// 2. interval clamp
const r2 = await lib.addWatch("chatA", "https://berita.com", 1);
check("4. interval 1 → clamp ke 5", r2.watch.intervalMenit === 5);

// 3. invalid url
const r3 = await lib.addWatch("chatA", "bukan-url", 30);
check("5. url invalid ditolak", r3.ok === false && r3.error === "url_invalid");

// 4. duplicate
const r4 = await lib.addWatch("chatA", "https://contoh.com", 30);
check("6. duplicate ditolak", r4.ok === false && r4.error === "duplicate");

// 5. unreachable
const r5 = await lib.addWatch("chatA", "https://mati.com", 30);
check("7. site unreachable ditolak", r5.ok === false && r5.error === "unreachable");

// 6. list per chat (chatA 2, chatB 0)
check("8. list chatA = 2", lib.listWatches("chatA").length === 2);
check("9. list chatB = 0", lib.listWatches("chatB").length === 0);

// 7. runCheck no change → 0 alert
let alerts = await lib.runCheck({ force: true });
check("10. no change: 0 alert", alerts.length === 0);

// 8. konten berubah → alert dengan snippet
sites["https://contoh.com"].body = "<html><head><title>Contoh Baru</title></head><body>versi 2\nharga Rp 150\nbye</body></html>";
alerts = await lib.runCheck({ force: true });
check("11. change: 1 alert", alerts.length === 1);
const a = alerts[0];
check("12. alert: oldSize→newSize beda", a.oldSize !== a.newSize);
check("13. alert: snippet baris 1 konten baru", a.snippet?.line === 1 && a.snippet.text.includes("versi 2"));
check("14. state: hash keupdate", a.watch.lastHash === lib.hashBody(sites["https://contoh.com"].body));

// 9. site mati pas runtime → no false alarm, snapshot tetap
sites["https://berita.com"].body = "headline BARU";
unreachable["https://berita.com"] = true;
alerts = await lib.runCheck({ force: true });
check("15. site mati: 0 alert (no false alarm)", alerts.length === 0);
const still = lib.listWatches("chatA").find((x) => x.url === "https://berita.com");
check("16. snapshot lama tetap utuh", still.lastHash === lib.hashBody("headline lama\nini body"));
unreachable["https://berita.com"] = false;

// 10. notif ke chat yang benar
sent.length = 0;
sites["https://berita.com"].body = "headline BARU banget\nini body";
const nowRes = await lib.checkNow("chatA");
check("17. checkNow: 1 changed terkirim ke chatA", nowRes.changed === 1 && sent.length === 1 && sent[0].chatId === "chatA");
check("18. pesan alert ada judul+url+ukuran", /ᴡᴇʙ ᴡᴀᴛᴄʜᴇʀ/.test(sent[0].text) && sent[0].text.includes("https://berita.com") && sent[0].text.includes("char"));

// 11. removeWatch by nomor & url & not found
const r6 = lib.removeWatch("chatA", "1");
check("19. stop by nomor", r6.ok === true && r6.watch.url === "https://contoh.com");
const r7 = lib.removeWatch("chatA", "https://berita.com");
check("20. stop by url", r7.ok === true);
const r8 = lib.removeWatch("chatA", "999");
check("21. stop not found", r8.ok === false && r8.error === "not_found");
check("22. list chatA kosong lagi", lib.listWatches("chatA").length === 0);

// 12. limit 5 per chat
for (let i = 0; i < 7; i++) await lib.addWatch("chatB", `https://contoh.com/p${i}`, 10);
check("23. maks 5 per chat", lib.listWatches("chatB").length === 5);

// 13. global toggle (ala .switch auto webwatch)
check("24. status awal enabled + monitor jalan", lib.getStatus().enabled === true && lib.getStatus().running === true);
lib.setEnabled(false);
check("25. OFF: monitor stop, watch tetap ada", lib.getStatus().enabled === false && lib.getStatus().running === false && lib.getStatus().total === 5);
lib.setEnabled(true);
check("26. ON: monitor nyala lagi", lib.getStatus().enabled === true && lib.getStatus().running === true);

// 14. state persist ke file
check("27. state file tersimpan", fs.existsSync("src/data/webwatch.json"));

// ────────── handler e2e (plugin) ──────────
const { config, handler } = await import("../../plugins/tools/webwatch.js");
const replies = [];
const mockM = (args) => ({
  args, text: args.join(" "), prefix: ".", command: "webwatch", pushName: "Tester",
  chat: "chatC", sender: "62899", reply: async (t) => replies.push(String(t)), react: async () => {},
});
sent.length = 0;

await handler(mockM([]), { sock: mockSock });
check("28. no-arg: help reply", replies.length === 1 && replies[0].length > 50);

await handler(mockM(["salahurl"]), { sock: mockSock });
check("29. url salah: ditolak", /ɢᴀᴋ ᴠᴀʟɪᴅ|gak valid/i.test(replies.at(-1)));

await handler(mockM(["https://berita.com"]), { sock: mockSock });
check("30. add via command: mulai dipantau", replies.at(-1).includes("ᴍᴜʟᴀɪ ᴅɪᴘᴀɴᴛᴀᴜ"));

await handler(mockM(["list"]), { sock: mockSock });
check("31. list command: tampil", replies.at(-1).includes("https://berita.com"));

sites["https://berita.com"].body = "headline FINAL\nini body";
sent.length = 0;
await handler(mockM(["now"]), { sock: mockSock });
check("32. now command: alert masuk chat", sent.length === 1 && sent[0].chatId === "chatC");

await handler(mockM(["stop", "https://berita.com"]), { sock: mockSock });
check("33. stop command: berhenti", /ꜱᴛᴏᴘ ᴘᴀɴᴛᴀᴜ|stop pantau/i.test(replies.at(-1)) && lib.listWatches("chatC").length === 0);

await handler(mockM(["info"]), { sock: mockSock });
check("34. info command: status", replies.at(-1).includes("ꜱᴛᴀᴛᴜꜱ"));

// cleanup state test
fs.rmSync("src/data/webwatch.json");
for (const wch of lib.listWatches("chatB")) lib.removeWatch("chatB", wch.id);

w(`\n${fail === 0 ? "🎉 SEMUA PASS" : "⚠️ ADA FAIL"} — ${pass} pass, ${fail} fail`);
await new Promise((r) => setTimeout(r, 300));
process.exit(fail === 0 ? 0 : 1);
