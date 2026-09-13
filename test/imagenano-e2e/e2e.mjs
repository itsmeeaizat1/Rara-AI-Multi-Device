// E2E — nano-banana text2img di rantai image gen agent
import path from "node:path";
const R = path.resolve(".");
const svc = await import(R + "/src/lib/nova-ai-service.js");
const { callImageGenChain, nanoBananaText2Img, _setNanoBananaT2IForTest } = svc;

let pass = 0, fail = 0;
const t = (name, ok) => { if (ok) { pass++; console.log("✅ " + name); } else { fail++; console.log("❌ " + name); } };

// 1. export + canvas valid
t("1a. nanoBananaText2Img exported", typeof nanoBananaText2Img === "function");
t("1b. callImageGenChain exported", typeof callImageGenChain === "function");
const m = svc;
// canvas 512x512 PNG (dari konstanta internal — cek lewat source)
const src = (await import("node:fs")).readFileSync(R + "/src/lib/nova-ai-service.js", "utf8");
t("1c. canvas kosong 512x512 ke-embed", /NANO_CANVAS_B64 = "iVBOR/.test(src) && /This is a blank gray canvas/.test(src));
const chainStart = src.indexOf("export async function callImageGenChain");
const chainEnd = src.indexOf("/**", chainStart);
const chainSrc = src.slice(chainStart, chainEnd > 0 ? chainEnd : undefined);
t("1d. chain nyebut nano-banana sebelum pollinations", chainSrc.indexOf("nbFn(promptClean") >= 0 && chainSrc.indexOf("nbFn(promptClean") < chainSrc.indexOf("pollinations juru penyelamat"));

// 2. seam inject sukses → chain return via nano-banana (tanpa network nano)
_setNanoBananaT2IForTest(async () => ({ base64: Buffer.alloc(10000, 7).toString("base64"), mimeType: "image/png", via: "nano-banana" }));
let via = "";
try { const img = await callImageGenChain("test kucing", {}); via = img.via || ""; } catch (e) { via = "ERR:" + e.message; }
t("2a. chain return via nano-banana (seam sukses)", via.includes("nano-banana"));

// 3. seam inject gagal → jatuh ke pollinations (live 1 gambar kecil)
_setNanoBananaT2IForTest(async () => { throw new Error("down"); });
let via2 = "";
try { const img = await callImageGenChain("simple red circle on white background", {}); via2 = img.via || ""; } catch (e) { via2 = "ERR:" + e.message; }
t("3a. nano-banana down → pollinations juru penyelamat", via2.includes("pollinations"));

_setNanoBananaT2IForTest(null);
console.log(`\n— summary —\nPASS ${pass} / FAIL ${fail}`);
process.exit(fail ? 1 : 0);
