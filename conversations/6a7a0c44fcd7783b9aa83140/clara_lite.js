// Lightweight claraWrap converter - no complex regex, just string operations
const fs = require('fs');
const path = require('path');

const cat = process.argv[2] || '';
const base = `/tmp/nova-bot/plugins/${cat}`;
if (!fs.existsSync(base)) { console.log('Dir not found'); process.exit(0); }

let changed = 0;

function processFile(filepath) {
  let content = fs.readFileSync(filepath, 'utf-8');
  const orig = content;
  
  // Get plugin name
  const nameMatch = content.match(/name:\s*["']([^"']+)["']/);
  const pname = nameMatch ? nameMatch[1] : path.basename(filepath).replace('.js', '');
  
  // 1. Add claraWrap import if missing
  if (!content.includes('claraWrap')) {
    const menuImport = content.match(/import\s*\{([^}]*)\}\s*from\s*["'][^"']*nova-menu-style["']/);
    if (menuImport) {
      content = content.replace(menuImport[0], menuImport[0].replace('{', '{ claraWrap,'));
    } else {
      const firstImport = content.match(/import\s+.*?;/);
      if (firstImport) {
        const pos = firstImport.index + firstImport[0].length;
        content = content.slice(0, pos) + '\nimport { claraWrap } from "../../src/lib/nova-menu-style.js";' + content.slice(pos);
      }
    }
  }
  
  // 2. bracketBox("emoji"("label"), [...]) -> claraWrap("label", [...].join("\n"))
  content = content.replace(/bracketBox\(\s*"[^"]*"\s*\(\s*"([^"]+)"\s*\)\s*,\s*\[([^\]]*)\]\s*\)/g, (m, label, lines) => {
    const arr = lines.split(',').map(s => s.trim()).filter(Boolean);
    return arr.length <= 1 ? `claraWrap("${label}", ${arr[0] || '""'})` : `claraWrap("${label}", [${arr.join(', ')}].join("\\n"))`;
  });
  
  // 3. bracketBox("emoji", "label", [...]) -> claraWrap
  content = content.replace(/bracketBox\(\s*"[^"]*"\s*,\s*"([^"]+)"\s*,\s*\[([^\]]*)\]\s*\)/g, (m, label, lines) => {
    const arr = lines.split(',').map(s => s.trim()).filter(Boolean);
    return arr.length <= 1 ? `claraWrap("${label}", ${arr[0] || '""'})` : `claraWrap("${label}", [${arr.join(', ')}].join("\\n"))`;
  });
  
  // 4. bracketBox("emoji", "label", `tmpl`) -> claraWrap
  content = content.replace(/bracketBox\(\s*"[^"]*"\s*,\s*"([^"]+)"\s*,\s*(`[^`]*`)\s*\)/g, 'claraWrap("$1", $2)');
  
  // 5. alyaHeader("title", "emoji") -> claraWrap
  content = content.replace(/alyaHeader\("([^"]+)",\s*"([^"]*)"\)/g, 'claraWrap("$1", "$2")');
  content = content.replace(/alyaHeader\("([^"]+)"\)/g, 'claraWrap("$1", "")');
  
  // 6. sendReplyWithNav with te() -> m.reply(claraWrap("name", te(...), "error"))
  content = content.replace(/(await\s+|return\s+)?sendReplyWithNav\(sock,\s*m,\s*te\(m\.prefix,\s*m\.command,\s*m\.pushName\)\s*,\s*"([^"]+)"\)\s*;?/g, 
    (m, pre, name) => `${pre || ''}m.reply(claraWrap("${name}", te(m.prefix, m.command, m.pushName), "error"))`);
  
  // 7. m.reply(te(...)) -> m.reply(claraWrap(pname, te(...), "error"))
  content = content.replace(/m\.reply\(te\(m\.prefix,\s*m\.command,\s*m\.pushName\)\)/g, 
    `m.reply(claraWrap("${pname}", te(m.prefix, m.command, m.pushName), "error"))`);
  content = content.replace(/return\s+m\.reply\(te\(m\.prefix,\s*m\.command,\s*m\.pushName\)\)/g, 
    `return m.reply(claraWrap("${pname}", te(m.prefix, m.command, m.pushName), "error"))`);
  
  // 8. sendReplyWithNav with "Error: " + e.message
  content = content.replace(/(await\s+|return\s+)?sendReplyWithNav\(sock,\s*m,\s*"Error:\s*"\s*\+\s*e\.message,\s*"([^"]+)"\)/g,
    (m, pre, name) => `${pre || ''}m.reply(claraWrap("${name}", "Error: " + e.message, "error"))`);
  
  // 9. m.reply(`text`) -> m.reply(claraWrap(pname, `text`)) - only if not already wrapped
  content = content.replace(/m\.reply\(`([^`]{8,})`\)/g, (m, tmpl) => {
    if (tmpl.includes('claraWrap') || tmpl.includes('╔') || tmpl.includes('╎') || tmpl.includes('te(')) return m;
    return `m.reply(claraWrap("${pname}", \`${tmpl}\`))`;
  });
  
  // 10. m.reply("text") -> m.reply(claraWrap(pname, "text")) - only long strings
  content = content.replace(/m\.reply\("([^"]{10,})"\)/g, (m, s) => {
    if (s.includes('claraWrap') || s.includes('╔') || s.includes('╎') || s.includes('te(')) return m;
    return `m.reply(claraWrap("${pname}", "${s}"))`;
  });
  
  if (content !== orig) {
    fs.writeFileSync(filepath, content);
    changed++;
  }
}

function scan(dir) {
  for (const f of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, f.name);
    if (f.isDirectory()) scan(full);
    else if (f.name.endsWith('.js')) processFile(full);
  }
}

scan(base);
console.log(`Changed: ${changed}`);
