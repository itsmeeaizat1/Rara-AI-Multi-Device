// E2E .dbexport — export + read-back verify pakai exceljs
import { initDatabase, getDatabase } from "../../src/lib/nova-database.js";
import ExcelJS from "exceljs";

await initDatabase("/tmp/dbexport-e2e-db.json");
const db = getDatabase();
db.setUser("628111111111", { name: "Aizat", number: "628111111111", premium: true, limit: 50, rpg: { gold: 50000, cash: 15000000, level: 12, exp: 3400, jobLevel: 5, totalKills: 20, bossKills: 3 } });
db.setUser("628222222222", { name: "Budi", number: "628222222222", limit: 30, rpg: { gold: 30000, cash: 8000000, level: 9 } });
db.setUser("628333333333", { name: "Citra", number: "628333333333" }); // user tanpa rpg
db.data.groups["628123-123@g.us"] = { welcome: true };

const { config, handler } = await import("../../plugins/owner/dbexport.js");

let sent = []; const replies = [];
const mockM = (args) => ({
  args, text: args.join(" "), prefix: ".", command: "dbexport", pushName: "Tester",
  chat: "62899@c.us", sender: "62899", reply: async (t) => replies.push(String(t)), react: async () => {},
});
const mockSock = {
  sendMessage: async (chat, content, opts) => sent.push({ chat, content }),
  sendMedia: async () => {},
};

let pass = 0, fail = 0;
const w = (s) => process.stdout.write(s + "\n");
const check = (name, ok) => { w((ok ? "  ✅ " : "  ❌ ") + name); ok ? pass++ : fail++; };

// 1. config owner-only + kategori owner
check("config: isOwner true + kategori owner", config.isOwner === true && config.category === "owner");

// 2. full export → dokumen xlsx kekirim
await handler(mockM([]), { sock: mockSock });
check("full: kirim 1 dokumen", sent.length === 1 && !!sent[0].content?.document);
const doc = sent[0].content;
check("full: mimetype xlsx benar", doc.mimetype === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
check("full: fileName .xlsx", /\.xlsx$/.test(doc.fileName));
check("full: caption ada", typeof doc.caption === "string" && doc.caption.length > 10);

// 3. file ada + magic zip (PK)
import { readFileSync, existsSync, rmSync } from "fs";
const filePath = doc.document.url;
check("full: file kebentuk", existsSync(filePath));
const raw = readFileSync(filePath);
check("full: magic PK (xlsx = zip)", raw[0] === 0x50 && raw[1] === 0x4b);
check("full: size > 3KB", raw.length > 3000);

// 4. READ-BACK: buka workbook & verif isi
const wb = new ExcelJS.Workbook();
await wb.xlsx.load(raw);
const sheetNames = wb.worksheets.map((s) => s.name);
check("read-back: 4 sheet (Pemain RPG, Ringkasan, Users, Groups)", sheetNames.length === 4 && ["Pemain RPG","Ringkasan","Users","Groups"].every(n => sheetNames.includes(n)));

const rpgSheet = wb.getWorksheet("Pemain RPG");
check("read-back: RPG header baris 1", rpgSheet.getRow(1).getCell(2).value === "Nama");
check("read-back: RPG 3 pemain (sort gold desc)", rpgSheet.rowCount - 1 === 3);
check("read-back: RPG #1 = Aizat (gold terbesar)", rpgSheet.getRow(2).getCell(2).value === "Aizat");
check("read-back: gold Aizat = 50000", rpgSheet.getRow(2).getCell(6).value === 50000);
check("read-back: cash Aizat = 15jt", rpgSheet.getRow(2).getCell(7).value === 15000000);

const usersSheet = wb.getWorksheet("Users");
check("read-back: Users 3 baris", usersSheet.rowCount - 1 === 3);

const ringkasan = wb.getWorksheet("Ringkasan");
const ringkasanText = JSON.stringify(ringkasan.getSheetValues());
check("read-back: Ringkasan nyebut 'Pemain RPG' 3", ringkasanText.includes("Pemain RPG"));
check("read-back: total gold 80000 kehitung", ringkasanText.includes("80000"));

// 5. mode rpg-only → cuma 1 sheet
sent = [];
await handler(mockM(["rpg"]), { sock: mockSock });
const doc2 = sent[0]?.content;
const raw2 = readFileSync(doc2.document.url);
const wb2 = new ExcelJS.Workbook();
await wb2.xlsx.load(raw2);
check("rpg-only: cuma 1 sheet", wb2.worksheets.length === 1 && wb2.worksheets[0].name === "Pemain RPG");
check("rpg-only: fileName ada tag rpg", /rpg/.test(doc2.fileName));

// 6. cleanup tmp file test
rmSync(filePath); rmSync(doc2.document.url);
check("cleanup tmp file", !existsSync(filePath));

w(`\n${fail === 0 ? "🎉 SEMUA PASS" : "⚠️ ADA FAIL"} — ${pass} pass, ${fail} fail`);
await new Promise((r) => setTimeout(r, 300));
process.exit(fail === 0 ? 0 : 1);
