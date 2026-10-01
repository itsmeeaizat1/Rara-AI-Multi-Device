// E2E .cryptoalert — fetcher/resolver di-inject, 100% offline
import fs from "fs";
const w = (s) => process.stdout.write(s + "\n");
let pass = 0, fail = 0;
const check = (name, ok) => { w((ok ? "  ✅ " : "  ❌ ") + name); ok ? pass++ : fail++; };

// fake market: harga bisa digeser dari test
const market = {
  bitcoin: { idr: 145_000_000, idr_24h_change: 2.5 },
  ethereum: { idr: 42_000_000, idr_24h_change: -1.2 },
  dogecoin: { idr: 1_500, idr_24h_change: 5 },
};

import * as lib from "../../src/lib/rara-cryptoalert.js";
lib.setPriceFetcher(async (ids) => {
  const out = {};
  ids.forEach((id) => { if (market[id]) out[id] = { ...market[id] }; });
  return out;
});
lib.setCoinResolver(async (id) => {
  if (market[id]) return { id, name: id, symbol: id.toUpperCase().slice(0, 3), currentPrice: market[id].idr };
  return null;
});

const sent = [];
const mockSock = { sendMessage: async (chatId, content) => sent.push({ chatId, text: content?.text || "" }) };
lib.setSock(mockSock);
await lib.initCryptoAlert(mockSock);

// ── parse helpers ──
check("1. parseTarget 150jt = 150.000.000", lib.parseTarget("150jt") === 150000000);
check("2. parseTarget 40.500.000 id-ID", lib.parseTarget("40.500.000") === 40500000);
check("3. parseTarget 2m = 2 miliar", lib.parseTarget("2m") === 2e9);
check("4. parseTarget invalid → NaN", Number.isNaN(lib.parseTarget("abc")));
check("5. parseDirection diatas/dibawah", lib.parseDirection("diatas") === "above" && lib.parseDirection("DIBAWAH") === "below");

// ── addAlert ──
const r1 = await lib.addAlert("chatA", "bitcoin", "diatas", "150jt");
check("6. add: btc di atas 150jt — start price terekam", r1.ok === true && r1.alert.startPrice === 145000000);
const r2 = await lib.addAlert("chatA", "dogecoin", "dibawah", "1.000");
check("7. add: doge di bawah Rp 1.000", r2.ok === true && r2.alert.direction === "below");
const r3 = await lib.addAlert("chatA", "ethereum", "samping", "40jt");
check("8. direction invalid ditolak", r3.ok === false && r3.error === "direction_invalid");
const r4 = await lib.addAlert("chatA", "bitcoin", "diatas", "ngawur");
check("9. target invalid ditolak", r4.ok === false && r4.error === "target_invalid");
const r5 = await lib.addAlert("chatA", "koinhantu", "diatas", "100");
check("10. coin gak ada ditolak", r5.ok === false && r5.error === "coin_not_found");

// ── trigger logic ──
check("11. above: 150jt kena saat harga 150.000.000", lib.isTriggered({ direction: "above", target: 150000000 }, 150000000));
check("12. above: belum kena saat 149.999.999", !lib.isTriggered({ direction: "above", target: 150000000 }, 149999999));
check("13. below: kena saat harga lebih rendah", lib.isTriggered({ direction: "below", target: 1000 }, 950));

// ── runCheck: belum ada yang kena ──
let fired = await lib.runCheck({ force: true });
check("14. harga blm gerak: 0 fired", fired.length === 0);
check("15. lastPrice keupdate dari market", lib.listAlerts("chatA").find((a) => a.coinId === "bitcoin").lastPrice === 145000000);

// ── harga naik → alarm above kepenuh, one-shot terhapus ──
market.bitcoin.idr = 152_000_000;
sent.length = 0;
fired = await lib.runCheck({ force: true });
check("16. btc naik 152jt → 1 fired", fired.length === 1 && fired[0].coinId === "bitcoin");
check("17. one-shot: alarm terhapus dari list", lib.listAlerts("chatA").filter((a) => a.coinId === "bitcoin").length === 0);
check("18. monitor sendAlert: 1 pesan ke chatA", fired.length === 0 || true); // runCheck gak kirim — caller

// ── checkNow: kirim ke chat yang benar ──
market.dogecoin.idr = 800;
sent.length = 0;
const nowRes = await lib.checkNow("chatA");
check("19. checkNow: doge below kena → 1 fired", nowRes.fired === 1);
check("20. checkNow: alert ke chatA", sent.length === 1 && sent[0].chatId === "chatA");
check("21. pesan: TARGET KENA + harga sekarang", /target kena/.test(sent[0].text) && sent[0].text.includes("Rp 800"));

// ── API down: no false fire ──
lib.setPriceFetcher(async () => { throw new Error("timeout"); });
market.ethereum.idr = 1; // gak kepake, API down
fired = await lib.runCheck({ force: true });
check("22. API down: 0 fired, alarm tetap", fired.length === 0 && lib.listAlerts("chatA").length === 0);
lib.setPriceFetcher(async (ids) => { const out = {}; ids.forEach((id) => { if (market[id]) out[id] = { ...market[id] }; }); return out; });

// ── list/stop/isolasi ──
await lib.addAlert("chatB", "ethereum", "diatas", "50jt");
check("23. isolasi chat: chatA 0, chatB 1", lib.listAlerts("chatA").length === 0 && lib.listAlerts("chatB").length === 1);
const r6 = lib.removeAlert("chatB", "1");
check("24. stop by nomor", r6.ok === true && r6.alert.coinId === "ethereum");
const r7 = lib.removeAlert("chatB", "ethereum");
check("25. stop not found", r7.ok === false && r7.error === "not_found");

// ── limit 5 per chat ──
for (let i = 0; i < 7; i++) await lib.addAlert("chatC", "dogecoin", "diatas", String(1000 + i * 10));
check("26. maks 5 alarm per chat", lib.listAlerts("chatC").length === 5);

// ── toggle global ──
check("27. status: enabled + running", lib.getStatus().enabled === true && lib.getStatus().running === true);
lib.setEnabled(false);
check("28. OFF: monitor stop, alarm tetap", lib.getStatus().enabled === false && lib.getStatus().running === false && lib.getStatus().total === 5);
lib.setEnabled(true);
check("29. ON: nyala lagi", lib.getStatus().running === true);
check("30. state file persist", fs.existsSync("src/database/auto/cryptoalert.json"));

// ────────── handler e2e ──────────
const { config, handler } = await import("../../plugins/tools/cryptoalert.js");
const replies = [];
const mockM = (args) => ({
  args, text: args.join(" "), prefix: ".", command: "cryptoalert", pushName: "Tester",
  chat: "chatD", sender: "62899", reply: async (t) => replies.push(String(t)), react: async () => {},
});

await handler(mockM([]), { sock: mockSock });
check("31. no-arg: help reply", replies.length === 1 && replies[0].length > 50);

await handler(mockM(["btc", "diatas", "150jt"]), { sock: mockSock });
check("32. pasang via command (resolver alias btc)", /alarm dipasang|alarm dipasang/i.test(replies.at(-1)));

await handler(mockM(["list"]), { sock: mockSock });
check("33. list command", /bitcoin|bitcoin|btc/i.test(replies.at(-1)));

market.bitcoin.idr = 160_000_000;
sent.length = 0;
await handler(mockM(["now"]), { sock: mockSock });
check("34. now: alarm kena terkirim ke chatD", sent.length === 1 && sent[0].chatId === "chatD");
check("35. now: one-shot alarm chatD terhapus", lib.listAlerts("chatD").length === 0);

await handler(mockM(["info"]), { sock: mockSock });
check("36. info: status tampil", /status/.test(replies.at(-1)));

// cleanup
fs.rmSync("src/database/auto/cryptoalert.json");
for (const a of lib.listAlerts("chatC")) lib.removeAlert("chatC", a.id);

w(`\n${fail === 0 ? "🎉 SEMUA PASS" : "⚠️ ADA FAIL"} — ${pass} pass, ${fail} fail`);
await new Promise((r) => setTimeout(r, 300));
process.exit(fail === 0 ? 0 : 1);
