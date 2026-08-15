const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const allFiles = execSync("grep -rl bracketBox plugins/ --include=*.js", { cwd: "/tmp/nova-check", encoding: "utf-8" })
  .trim().split("\n").filter(Boolean);

const batch = allFiles.slice(0, 5);

for (const relPath of batch) {
  const fullPath = path.join("/tmp/nova-check", relPath);
  let c = fs.readFileSync(fullPath, "utf-8");
  let changed = false;
  const lines = c.split("\n");

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];
    if (i > 30 && !line.includes("import")) continue;
    
    if (line.trim() === "bracketBox," || line.trim() === "bracketBox") {
      lines.splice(i, 1);
      changed = true;
      i--;
      continue;
    }
    
    if (line.includes("import") && line.includes("bracketBox")) {
      let orig = line;
      line = line.replace(/bracketBox,\s*/g, "");
      line = line.replace(/,\s*bracketBox/g, "");
      line = line.replace(/bracketBox/g, "");
      line = line.replace(/\{\s+/g, "{ ");
      line = line.replace(/\s+\}/g, " }");
      if (line !== orig) {
        lines[i] = line;
        changed = true;
      }
    }
  }

  if (changed) {
    c = lines.join("\n");
    fs.writeFileSync(fullPath, c);
    console.log("OK: " + relPath);
  } else {
    console.log("SKIP: " + relPath);
  }
}
console.log("Remaining: " + allFiles.length);
