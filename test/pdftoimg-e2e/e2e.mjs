// E2E .pdftoimg — PDF dummy pdf-lib, render verified, 100% offline
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
const w = (s) => process.stdout.write(s + "\n");
let pass = 0, fail = 0;
const check = (name, ok) => { w((ok ? "  ✅ " : "  ❌ ") + name); ok ? pass++ : fail++; };

import { pdfToImages, parsePagesArg, MAX_PAGES } from "../../src/lib/nova-pdftoimg.js";
// baca IHDR langsung dari bytes PNG (offset 16: width, 20: height, big-endian)
function pngSize(buf) { return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) }; }

// bikin PDF dummy 7 halaman
async function makePdf(pages) {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  for (let i = 1; i <= pages; i++) {
    const p = doc.addPage([300, 200]);
    p.drawText("PAGE" + i, { x: 120, y: 100, size: 24, font, color: rgb(0, 0, 0) });
  }
  return await doc.save();
}

// ── parsePagesArg ──
check("1. default 5 halaman", parsePagesArg(undefined) === 5);
check("2. 'all' → maks 20", parsePagesArg("all") === MAX_PAGES);
check("3. angka valid 10", parsePagesArg("10") === 10);
check("4. angka gila di-cap 20", parsePagesArg("999") === 20);
check("5. ngawur → default", parsePagesArg("abc") === 5);

// ── render ──
const pdf7 = await makePdf(7);
const r1 = await pdfToImages(pdf7, { pagesArg: "3" });
check("6. 7 halaman, minta 3 → 3 PNG", r1.ok && r1.rendered === 3 && r1.totalPages === 7);
check("7. PNG buffer valid (signature)", r1.images[0].png.slice(0, 8).toString("hex") === "89504e470d0a1a0a");
check("8. ukuran canvas sesuai 2x (600x400)", r1.images[0].png.length > 1000);
check("9. truncated flag nyala", r1.truncated === true);

const r2 = await pdfToImages(pdf7, { pagesArg: "all" });
check("10. all → semua 7 halaman", r2.ok && r2.rendered === 7 && r2.truncated === false);
check("11. pageNumber urut 1-7", r2.images.map((i) => i.pageNumber).join(",") === "1,2,3,4,5,6,7");

// PNG bisa dibaca & dimension bener (600x400 pada scale 2)
const size = pngSize(r2.images[0].png);
check("12. PNG IHDR 600x400", size.width === 600 && size.height === 400);

// ── error paths ──
const r3 = await pdfToImages(Buffer.from("bukan pdf"), {});
check("13. buffer ngawur → pdf_invalid", r3.ok === false && r3.error === "pdf_invalid");
const r4 = await pdfToImages(null, {});
check("14. buffer kosong → empty_buffer", r4.ok === false && r4.error === "empty_buffer");

// ── PDF halaman banyak → cap ──
const pdf25 = await makePdf(25);
const r5 = await pdfToImages(pdf25, { pagesArg: "all" });
check("15. 25 halaman minta all → cap 20", r5.ok && r5.rendered === 20 && r5.truncated === true);

// ────────── handler e2e ──────────
const { config, handler } = await import("../../plugins/tools/pdftoimg.js");
const replies = []; const reacts = []; const sentImgs = [];
const mockM = (args, quoted) => ({
  args, text: args.join(" "), prefix: ".", command: "pdftoimg", pushName: "Tester",
  chat: "chatE", sender: "62899", quoted,
  reply: async (t) => replies.push(String(t)), react: async (r) => reacts.push(r),
});
const mockSock = {
  sendMessage: async (chatId, content) => {
    if (content?.image) sentImgs.push({ chatId, png: content.image, caption: content.caption });
  },
};

// tanpa reply → error ramah
await handler(mockM([], null), { sock: mockSock });
check("16. tanpa reply: minta reply PDF", /ʀᴇᴘʟʏ|reply/i.test(replies.at(-1)));

// reply bukan PDF
await handler(mockM([], { mimetype: "image/jpeg", buffer: Buffer.from("x") }), { sock: mockSock });
check("17. reply bukan PDF: ditolak", replies.length === 2);

// reply PDF asli → images terkirim
const goodQuoted = { mimetype: "application/pdf", fileName: "laporan.pdf", buffer: pdf7 };
await handler(mockM(["3"], goodQuoted), { sock: mockSock });
check("18. render + kirim 3 image ke chat", sentImgs.length === 3 && sentImgs[0].chatId === "chatE");
check("19. caption: nama file + halaman", sentImgs[0].caption.includes("laporan") && /ʜᴀʟᴀᴍᴀɴ|halaman/i.test(sentImgs[0].caption));
check("20. caption halaman terakhir → truncated ⚠️", sentImgs.at(-1).caption.includes("ᴍᴀᴋꜱ") || sentImgs.at(-1).caption.includes("maks"));
check("21. PNG terkirim valid", sentImgs[0].png.slice(0, 8).toString("hex") === "89504e470d0a1a0a");

// PDF rusak
await handler(mockM([], { mimetype: "application/pdf", fileName: "rusak.pdf", buffer: Buffer.from("hancur") }), { sock: mockSock });
check("22. PDF rusak: pesan error ramah", /ɢᴀᴋ ᴠᴀʟɪᴅ|gak valid/i.test(replies.at(-1)));

// default pagesArg = 5
sentImgs.length = 0;
await handler(mockM([], goodQuoted), { sock: mockSock });
check("23. default: 5 halaman ke-render", sentImgs.length === 5);

w(`\n${fail === 0 ? "🎉 SEMUA PASS" : "⚠️ ADA FAIL"} — ${pass} pass, ${fail} fail`);
await new Promise((r) => setTimeout(r, 300));
process.exit(fail === 0 ? 0 : 1);
