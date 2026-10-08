// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
// builder/apk/receiver/webapk-build.js — WEB/HTML → WebView APK
// Dipanggil builder.js saat project punya index.html:
//   1. patch URL config (file:///android_asset/site/index.html)
//   2. label resources.arsc di-byte-swap 1:1 (placeholder fix-length)
//   3. icon custom (kalau ada icon.png / icon.jpg di root) → replace mipmap
//   4. re-zip + apksigner sign (keystore template)
// Arg: <project_root> <workspace>
const { execFileSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

const PLACEHOLDER = "RaraWebAppPPPPPPPPPPPPPPPPPPPPPPPPPPPP";
const run = (c, a, o) => execFileSync(c, a, Object.assign({ stdio: "pipe" }, o)).toString();

function labelPatch(ar, name) {
  // string pool aapt2 = UTF-8; swap 1:1 same byte length
  const target = Buffer.from(PLACEHOLDER, "utf8");
  const val = Buffer.from(String(name || "").slice(0, PLACEHOLDER.length), "utf8");
  const rep = Buffer.alloc(target.length, 0x20);
  rep.write(val.subarray(0, target.length).toString("utf8"), 0, "utf8");
  const i = ar.indexOf(target);
  if (i < 0) return ar; // placeholder gak ketemu → label default, gak fatal
  return Buffer.concat([ar.subarray(0, i), rep, ar.subarray(i + target.length)]);
}

function webApkBuild(root, workspace) {
  const T = "/opt/receiver/webapk";
  const stage = path.join(workspace, "webapk-stage");
  fs.rmSync(stage, { recursive: true, force: true });
  fs.mkdirSync(stage, { recursive: true });
  run("unzip", ["-q", path.join(T, "template.apk"), "-d", stage]);
  // isi site dari project root (semua file html/css/js/asset)
  const siteDir = path.join(stage, "assets", "site");
  fs.mkdirSync(siteDir, { recursive: true });
  run("cp", ["-r", root + "/.", siteDir]);
  fs.writeFileSync(path.join(stage, "assets", "rara-config.txt"), "file:///android_asset/site/index.html\n");
  // icon custom kalau ada
  const icon = ["icon.png", "icon.jpg", "icon.jpeg"].map((f) => path.join(root, f)).find((f) => fs.existsSync(f));
  if (icon) {
    for (const d of fs.readdirSync(path.join(stage, "res")).filter((d) => d.startsWith("mipmap-"))) {
      fs.copyFileSync(icon, path.join(stage, "res", d, "ic_launcher.png"));
    }
  }
  // label custom kalau ada file .app-name (bot nulis ini buat nama app user)
  const nameFile = path.join(root, ".app-name");
  const arsc = path.join(stage, "resources.arsc");
  if (fs.existsSync(nameFile)) {
    const name = fs.readFileSync(nameFile, "utf8").trim();
    fs.writeFileSync(arsc, labelPatch(fs.readFileSync(arsc), name));
  }
  const apk = path.join(stage, "app.apk");
  run("rm", ["-f", apk]);
  const cwd = process.cwd();
  process.chdir(stage);
  try { run("zip", ["-qr", apk, "."]); } finally { process.chdir(cwd); }
  const out = path.join(root, "app-release.apk");
  run(path.join(process.env.ANDROID_HOME || "/opt/android-sdk", "build-tools/34.0.0/apksigner"),
    ["sign", "--ks", path.join(T, "rara.keystore"), "--ks-pass", "pass:rara123",
     "--ks-key-alias", "rara", "--key-pass", "pass:rara123", "--out", out, apk]);
  return out;
}

if (require.main === module) {
  const [root, workspace] = process.argv.slice(2);
  try { console.log(webApkBuild(root, workspace)); } catch (e) { console.error(e.message); process.exit(1); }
}
module.exports = { webApkBuild, labelPatch, PLACEHOLDER };
