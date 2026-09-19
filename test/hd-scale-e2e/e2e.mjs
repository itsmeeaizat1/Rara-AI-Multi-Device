// E2E .hd (19 Sep 2026, owner report ".hd 16 knp hasilnya bkn 16x malah 4x")
// — validasi: parsing scale angka polos & "16x", range 2..16, multi-pass
// bertahap, cap 16000px, auto-doc hasil besar, caption jujur.
const R = process.cwd();
const sharpMod = await import(R + "/node_modules/sharp/dist/index.cjs");
const sharp = sharpMod.default || sharpMod;
const { handler } = await import(R + "/plugins/tools/hd.js");

let pass = 0, fail = 0;
const out = (s) => console.log(s);
function t(label, cond, extra) {
  if (cond) { pass++; out("✅ " + label); }
  else { fail++; out("❌ " + label + (extra ? " — " + extra : "")); }
}

async function makeJpeg(w, h) {
  return await sharp({ create: { width: w, height: h, channels: 3, background: { r: 90, g: 130, b: 170 } } })
    .jpeg({ quality: 80 }).toBuffer();
}

// probe dimensi hasil dari buffer jpeg/sharp
async function dims(buf) {
  const m = await sharp(buf).metadata();
  return { w: m.width, h: m.height };
}

async function runHd(args, srcBuf) {
  const sent = [];
  const reacts = [];
  const m = {
    isImage: true,
    quoted: null,
    args,
    chat: "test@g.us",
    prefix: ".",
    command: "hd",
    react: async (r) => reacts.push(r),
    reply: async (txt) => sent.push({ type: "reply", txt }),
    download: async () => srcBuf,
  };
  const sock = { sendMessage: async (to, msg) => { sent.push({ type: "msg", to, msg }); return { key: { id: "x" } }; } };
  await handler(m, { sock, args });
  return { sent, reacts };
}

out("— .hd 16 (angka polos, dulunya GAK dikenali) —");
{
  const src = await makeJpeg(100, 100);
  const { sent } = await runHd(["16"], src);
  const img = sent.find((s) => s.type === "msg" && (s.msg.image || s.msg.document));
  const buf = img?.msg?.image ? img.msg.image : img?.msg?.document;
  t("1a. hasil dikirim", !!img, JSON.stringify(sent.map((s) => s.type)));
  const cap = (img?.msg?.caption) || "";
  t("1b. caption Scale: 16x", cap.includes("Scale: 16x"), cap.slice(0, 60));
  // image WA dikirim sebagai buffer? mock nyimpen buffer persis → probe langsung
  const d = await dims(buf);
  t("1c. dimensi hasil 1600x1600 (16x beneran)", d.w === 1600 && d.h === 1600, JSON.stringify(d));
  // 1600x1600: sisi pendek 1600 > 1080 → DI ATAS 1080p → document (aturan owner)
  t("1d. hasil 1600x1600 (di atas 1080p) → document", !!img?.msg?.document, "type: " + (img?.msg?.image ? "image" : "doc"));
}

out("\n— .hd 8 (800x800, di bawah 1080p) → tetap image —");
{
  const src = await makeJpeg(100, 100);
  const { sent } = await runHd(["8"], src);
  const img = sent.find((s) => s.type === "msg" && (s.msg.image || s.msg.document));
  t("4c. hasil 800x800 (di bawah 1080p) → image", !!img?.msg?.image, "type: " + (img?.msg?.image ? "image" : "doc"));
}

out("\n— .hd 16 input gede → hasil >1920px dikirim document (anti kompres WA) —");
{
  const src = await makeJpeg(300, 300);
  const { sent } = await runHd(["16"], src);
  const img = sent.find((s) => s.type === "msg" && (s.msg.image || s.msg.document));
  const cap = (img?.msg?.caption) || "";
  t("1e. caption Scale: 16x (4800x4800)", cap.includes("Scale: 16x (4800x4800)"), cap.slice(0, 60));
  t("1f. hasil >1920px → document", !!img?.msg?.document, "type: " + (img?.msg?.image ? "image" : "doc"));
}

out("\n— .hd 16x (format lama juga sah) —");
{
  const src = await makeJpeg(100, 100);
  const { sent } = await runHd(["16x"], src);
  const img = sent.find((s) => s.type === "msg" && (s.msg.image || s.msg.document));
  const cap = img?.msg?.caption || "";
  t("2a. caption Scale: 16x", cap.includes("Scale: 16x"), cap.slice(0, 60));
}

out("\n— .hd 17 → clamp ke 16 —");
{
  const src = await makeJpeg(100, 100);
  const { sent } = await runHd(["17"], src);
  const img = sent.find((s) => s.type === "msg" && (s.msg.image || s.msg.document));
  const cap = img?.msg?.caption || "";
  t("3a. caption Scale: 16x (17 di-clamp)", cap.includes("Scale: 16x"), cap.slice(0, 60));
}

out("\n— .hd 8 → tetap jalan (8x multi-pass 2x×3) —");
{
  const src = await makeJpeg(100, 100);
  const { sent } = await runHd(["8"], src);
  const img = sent.find((s) => s.type === "msg" && (s.msg.image || s.msg.document));
  const cap = img?.msg?.caption || "";
  t("4a. caption Scale: 8x", cap.includes("Scale: 8x"), cap.slice(0, 60));
  const d = await dims(img?.msg?.image || img?.msg?.document);
  t("4b. dimensi hasil 800x800", d.w === 800 && d.h === 800, JSON.stringify(d));
}

out("\n— .hd default (tanpa arg) → 2x —");
{
  const src = await makeJpeg(100, 100);
  const { sent } = await runHd([], src);
  const img = sent.find((s) => s.type === "msg" && (s.msg.image || s.msg.document));
  const cap = img?.msg?.caption || "";
  t("5a. caption Scale: 2x (default)", cap.includes("Scale: 2x"), cap.slice(0, 60));
}

out("\n— gambar gede: scale otomatis diturunin (batas 16000px) —");
{
  const src = await makeJpeg(5000, 100);
  const { sent } = await runHd(["4"], src);
  const img = sent.find((s) => s.type === "msg" && (s.msg.image || s.msg.document));
  const cap = img?.msg?.caption || "";
  // 5000 * 4 = 20000 > 16000 → turun ke 3 → 15000px
  t("6a. caption Scale: 3x (diturunin dari 4x)", cap.includes("Scale: 3x"), cap.slice(0, 80));
  t("6b. caption jujur nyebut scale diturunin", /diturunin dari 4x/.test(cap), cap.slice(0, 120));
  const d = await dims(img?.msg?.image || img?.msg?.document);
  t("6c. dimensi hasil 15000x300 (gak lewat batas)", d.w === 15000 && d.h === 300, JSON.stringify(d));
}

out("\n— bukan gambar → guide —");
{
  const sent = [];
  const m = {
    isImage: false,
    quoted: null,
    args: [],
    chat: "test@g.us",
    prefix: ".",
    command: "hd",
    react: async () => {},
    reply: async (txt) => sent.push(txt),
    download: async () => Buffer.alloc(0),
  };
  const sock = { sendMessage: async () => {} };
  await handler(m, { sock, args: [] });
  const txt = (sent[0] || "").toLowerCase();
  t("7a. tanpa gambar → guide .hd", /hd/.test(txt) && !txt.includes("scale: "), txt.slice(0, 60));
}

out("\n═══ HD SCALE E2E: " + pass + " pass · " + fail + " fail ═══");
process.exit(fail ? 1 : 0);
