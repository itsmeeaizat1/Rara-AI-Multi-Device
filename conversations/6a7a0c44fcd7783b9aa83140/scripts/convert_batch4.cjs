const fs = require("fs");

const files = [
  "plugins/info/harilibur.js",
  "plugins/info/cekcuaca.js",
  "plugins/fun/puisi.js",
  "plugins/fun/mbti.js",
  "plugins/fun/timecapsule.js"
];

for (const f of files) {
  let c = fs.readFileSync(f, "utf-8");
  let changed = false;
  const lines = c.split("\n");

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];
    if (line.includes("bracketBox(") && !line.includes("import") && !line.trim().startsWith("bracketBox,")) {
      const idx = line.indexOf("bracketBox(");
      const afterBracket = line.substring(idx + "bracketBox(".length);

      let depth = 0;
      let inString = false;
      let stringChar = "";
      let firstComma = -1;
      for (let j = 0; j < afterBracket.length; j++) {
        const ch = afterBracket[j];
        if (!inString && (ch === '"' || ch === '`' || ch === "'")) {
          inString = true;
          stringChar = ch;
        } else if (inString && ch === stringChar && afterBracket[j-1] !== '\\') {
          inString = false;
        } else if (!inString && ch === '(') {
          depth++;
        } else if (!inString && ch === ')') {
          depth--;
        } else if (!inString && ch === ',' && depth === 0) {
          firstComma = j;
          break;
        }
      }

      if (firstComma !== -1) {
        const before = line.substring(0, idx);
        const after = afterBracket.substring(firstComma + 1).trimStart();
        lines[i] = before + "claraWrap(" + after;
        changed = true;
      }
    }
  }

  if (changed) {
    c = lines.join("\n");
    c = c.split("bracketBox,\n").join("");
    c = c.split("bracketBox,").join("");
    c = c.split(", bracketBox").join("");
    c = c.split(" bracketBox ").join(" ");

    fs.writeFileSync(f, c);
    console.log("OK: " + f);
  } else {
    console.log("SKIP: " + f);
  }
}
