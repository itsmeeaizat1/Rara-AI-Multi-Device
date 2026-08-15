// claraWrap converter v2 - handles more patterns
const fs = require('fs');
const path = require('path');

const cat = process.argv[2] || '';
const base = `/tmp/nova-bot/plugins/${cat}`;
if (!fs.existsSync(base)) { console.log('Dir not found'); process.exit(0); }

let changed = 0;

function processFile(filepath) {
  let content = fs.readFileSync(filepath, 'utf-8');
  const orig = content;
  const nameMatch = content.match(/name:\s*["']([^"']+)["']/);
  const pname = nameMatch ? nameMatch[1] : path.basename(filepath).replace('.js', '');
  
  // Import
  if (!content.includes('claraWrap')) {
    const mi = content.match(/import\s*\{([^}]*)\}\s*from\s*["'][^"']*nova-menu-style["']/);
    if (mi) content = content.replace(mi[0], mi[0].replace('{', '{ claraWrap,'));
    else {
      const fi = content.match(/import\s+.*?;/);
      if (fi) {
        const pos = fi.index + fi[0].length;
        content = content.slice(0, pos) + '\nimport { claraWrap } from "../../src/lib/nova-menu-style.js";' + content.slice(pos);
      }
    }
  }
  
  // 1. __navText = 'string'; sendReplyWithNav -> wrap
  content = content.replace(/\{\s*const\s+__navText\s*=\s*'([^']+)';\s*(return\s+await\s+|return\s+|await\s+)?sendReplyWithNav\(sock,\s*m,\s*__navText,\s*"([^"]+)"\s*\)\s*;?\s*\}/g, (m, txt, pre, name) => {
    if (txt.includes('claraWrap') || txt.includes('╔')) return m;
    const isUsage = /penggunaan|contoh|format|cara pakai|usage|masukkan|kirim/i.test(txt);
    const tm = txt.match(/\*([^*]{2,50})\*/);
    const title = tm ? tm[1] : name;
    return isUsage 
      ? `{ const __navText = claraWrap("${title}", '${txt}'); ${pre || ''}sendReplyWithNav(sock, m, __navText, "${name}"); }`
      : `{ const __navText = claraWrap("${title}", '${txt}'); ${pre || ''}m.reply(__navText); }`;
  });
  
  // 2. __navText = `template`; sendReplyWithNav -> wrap
  content = content.replace(/\{\s*const\s+__navText\s*=\s*`([^`]+)`;\s*(return\s+await\s+|return\s+|await\s+)?sendReplyWithNav\(sock,\s*m,\s*__navText,\s*"([^"]+)"\s*\)\s*;?\s*\}/g, (m, tmpl, pre, name) => {
    if (tmpl.includes('claraWrap') || tmpl.includes('╔')) return m;
    const isUsage = /penggunaan|contoh|format|cara pakai|usage|masukkan|kirim/i.test(tmpl);
    const tm = tmpl.match(/\*([^*]{2,50})\*/);
    const title = tm ? tm[1] : name;
    return isUsage
      ? `{ const __navText = claraWrap("${title}", \`${tmpl}\`); ${pre || ''}sendReplyWithNav(sock, m, __navText, "${name}"); }`
      : `{ const __navText = claraWrap("${title}", \`${tmpl}\`); ${pre || ''}m.reply(__navText); }`;
  });
  
  // 3. sendReplyWithNav(sock, m, `template`, "name") -> wrap or m.reply
  content = content.replace(/(await\s+|return\s+)?sendReplyWithNav\(sock,\s*m,\s*`([^`]+)`\s*,\s*"([^"]+)"\)/g, (m, pre, tmpl, name) => {
    if (tmpl.includes('claraWrap') || tmpl.includes('╔')) return m;
    const isUsage = /penggunaan|contoh|format|cara pakai|usage|masukkan|kirim/i.test(tmpl);
    const tm = tmpl.match(/\*([^*]{2,50})\*/);
    const title = tm ? tm[1] : name;
    return isUsage
      ? `${pre || ''}sendReplyWithNav(sock, m, claraWrap("${title}", \`${tmpl}\`), "${name}")`
      : `${pre || ''}m.reply(claraWrap("${title}", \`${tmpl}\`))`;
  });
  
  // 4. sendReplyWithNav(sock, m, "string", "name") -> wrap or m.reply
  content = content.replace(/(await\s+|return\s+)?sendReplyWithNav\(sock,\s*m,\s*"([^"]{10,})"\s*,\s*"([^"]+)"\)/g, (m, pre, s, name) => {
    if (s.includes('claraWrap') || s.includes('╔')) return m;
    const isUsage = /penggunaan|contoh|format|cara pakai|usage|masukkan|kirim/i.test(s);
    const tm = s.match(/\*([^*]{2,50})\*/);
    const title = tm ? tm[1] : name;
    return isUsage
      ? `${pre || ''}sendReplyWithNav(sock, m, claraWrap("${title}", "${s}"), "${name}")`
      : `${pre || ''}m.reply(claraWrap("${title}", "${s}"))`;
  });
  
  // 5. m.reply(variable) -> m.reply(claraWrap(pname, variable))
  content = content.replace(/m\.reply\((?!claraWrap|te\(|sock\.)(([a-zA-Z_$][a-zA-Z0-9_$]*)(?:\s*\+\s*["'][^"']*["'])?)\)/g, (m, expr, varname) => {
    if (['txt', 'text', 'result', 'res', 'msg', 'message', 'reply', 'output', 'caption', 'body', 'response', 'str', 'string'].includes(varname)) {
      return `m.reply(claraWrap("${pname}", ${expr}))`;
    }
    return m;
  });
  
  // 6. m.reply(`template` + `template` + ...) -> m.reply(claraWrap(pname, ...))
  content = content.replace(/m\.reply\(((?:`[^`]+`\s*\+\s*\n?\s*)+`[^`]+`)\)/g, (m, expr) => {
    if (expr.includes('claraWrap') || expr.includes('╔') || expr.includes('te(')) return m;
    return `m.reply(claraWrap("${pname}", ${expr}))`;
  });
  
  // 7. m.reply(`text`) -> m.reply(claraWrap(pname, `text`))
  content = content.replace(/m\.reply\(`([^`]+)`\)/g, (m, tmpl) => {
    if (tmpl.includes('claraWrap') || tmpl.includes('╔') || tmpl.includes('╎') || tmpl.includes('te(')) return m;
    if (tmpl.length < 5) return m;
    return `m.reply(claraWrap("${pname}", \`${tmpl}\`))`;
  });
  
  // 8. m.reply("text") -> m.reply(claraWrap(pname, "text"))
  content = content.replace(/m\.reply\("([^"]{10,})"\)/g, (m, s) => {
    if (s.includes('claraWrap') || s.includes('╔') || s.includes('╎') || s.includes('te(')) return m;
    return `m.reply(claraWrap("${pname}", "${s}"))`;
  });
  
  // 9. sendReplyWithNav with te()
  content = content.replace(/(await\s+|return\s+)?sendReplyWithNav\(sock,\s*m,\s*te\(m\.prefix,\s*m\.command,\s*m\.pushName\)\s*,\s*"([^"]+)"\)\s*;?/g,
    (m, pre, name) => `${pre || ''}m.reply(claraWrap("${name}", te(m.prefix, m.command, m.pushName), "error"))`);
  
  // 10. sendReplyWithNav with "Error: " + e.message
  content = content.replace(/(await\s+|return\s+)?sendReplyWithNav\(sock,\s*m,\s*"Error:\s*"\s*\+\s*e\.message,\s*"([^"]+)"\)/g,
    (m, pre, name) => `${pre || ''}m.reply(claraWrap("${name}", "Error: " + e.message, "error"))`);
  
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
