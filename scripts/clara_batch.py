#!/usr/bin/env python3
import re, os, sys

cat = sys.argv[1] if len(sys.argv) > 1 else ''
base = f'/tmp/nova-bot/plugins/{cat}' if cat else '/tmp/nova-bot/plugins'

def scan_dir(path):
    files = []
    if not os.path.isdir(path): return files
    for f in os.listdir(path):
        full = os.path.join(path, f)
        if os.path.isdir(full):
            files.extend(scan_dir(full))
        elif f.endswith('.js'):
            files.append(full)
    return files

changed = 0

for filepath in scan_dir(base):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    orig = content
    name_m = re.search(r'name:\s*["\']([^"\']+)["\']', content)
    pname = name_m.group(1) if name_m else os.path.basename(filepath).replace('.js', '')

    # Import
    if not re.search(r'claraWrap\s*[},]', content):
        mi = re.search(r'(import\s*\{[^}]*\}\s*from\s*["\'][^"\']*nova-menu-style[^"\']*["\'];)', content)
        if mi:
            imp = mi.group(1)
            if 'claraWrap' not in imp:
                content = content.replace(imp, imp.replace('{', '{ claraWrap, ', 1), 1)
        else:
            fi = re.search(r'(import\s+.*?;)', content)
            if fi:
                pos = fi.end()
                content = content[:pos] + '\nimport { claraWrap } from "../../src/lib/nova-menu-style.js";' + content[pos:]

    # bracketBox("emoji"("label"), [...])
    content = re.sub(r'bracketBox\(\s*"[^"]*"\s*\(\s*"([^"]+)"\s*\)\s*,\s*\[([^\]]*)\]\s*\)',
        lambda m: f'claraWrap("{m.group(1)}", [{m.group(2)}].join("\\n"))' if m.group(2).strip() else f'claraWrap("{m.group(1)}", "")',
        content)

    # bracketBox("emoji", "label", [...])
    content = re.sub(r'bracketBox\(\s*"[^"]*"\s*,\s*"([^"]+)"\s*,\s*\[([^\]]*)\]\s*\)',
        lambda m: f'claraWrap("{m.group(1)}", [{m.group(2)}].join("\\n"))' if m.group(2).strip() else f'claraWrap("{m.group(1)}", "")',
        content)

    # bracketBox("emoji", "label", `tmpl`)
    content = re.sub(r'bracketBox\(\s*"[^"]*"\s*,\s*"([^"]+)"\s*,\s*(`[^`]*`)\s*\)',
        lambda m: f'claraWrap("{m.group(1)}", {m.group(2)})', content)

    # alyaHeader("title", "emoji")
    content = re.sub(r'alyaHeader\("([^"]+)",\s*"([^"]*)"\)', lambda m: f'claraWrap("{m.group(1)}", "{m.group(2)}")', content)
    content = re.sub(r'alyaHeader\("([^"]+)"\)', lambda m: f'claraWrap("{m.group(1)}", "")', content)

    # sendReplyWithNav with te()
    content = re.sub(r'(await\s+|return\s+)?sendReplyWithNav\(sock,\s*m,\s*te\(m\.prefix,\s*m\.command,\s*m\.pushName\)\s*,\s*"([^"]+)"\)\s*;?',
        lambda m: f'{m.group(1) or ""}m.reply(claraWrap("{m.group(2)}", te(m.prefix, m.command, m.pushName), "error"))', content)

    # m.reply(te(...))
    content = re.sub(r'm\.reply\(te\(m\.prefix,\s*m\.command,\s*m\.pushName\)\)',
        lambda m: f'm.reply(claraWrap("{pname}", te(m.prefix, m.command, m.pushName), "error"))', content)
    content = re.sub(r'return\s+m\.reply\(te\(m\.prefix,\s*m\.command,\s*m\.pushName\)\)',
        lambda m: f'return m.reply(claraWrap("{pname}", te(m.prefix, m.command, m.pushName), "error"))', content)

    # sendReplyWithNav with "Error: " + e.message
    content = re.sub(r'(await\s+|return\s+)?sendReplyWithNav\(sock,\s*m,\s*"Error:\s*"\s*\+\s*e\.message,\s*"([^"]+)"\)',
        lambda m: f'{m.group(1) or ""}m.reply(claraWrap("{m.group(2)}", "Error: " + e.message, "error"))', content)

    # __navText with template literal
    def fix_navtext(m):
        tmpl, ret, name = m.group(1), m.group(2) or '', m.group(3)
        if 'claraWrap' in tmpl or 'bracketBox' in tmpl: return m.group(0)
        is_usage = bool(re.search(r'penggunaan|contoh|format|cara pakai|usage|masukkan|kirim|caranya', tmpl, re.I))
        tm = re.search(r'\*([^*]{2,50})\*', tmpl)
        title = tm.group(1) if tm else name
        if is_usage:
            return f'{{ const __navText = claraWrap("{title}", `{tmpl}`); {ret}sendReplyWithNav(sock, m, __navText, "{name}"); }}'
        return f'{{ const __navText = claraWrap("{title}", `{tmpl}`); {ret}m.reply(__navText); }}'

    content = re.sub(
        r'\{\s*const\s+__navText\s*=\s*`((?:[^`]|\\`)+)`;\s*(return\s+await\s+|return\s+|await\s+)?sendReplyWithNav\(sock,\s*m,\s*__navText,\s*"([^"]+)"\s*\)\s*;?\s*\}',
        fix_navtext, content)

    # __navText with string
    def fix_navtext_s(m):
        s, ret, name = m.group(1), m.group(2) or '', m.group(3)
        if 'claraWrap' in s or 'bracketBox' in s: return m.group(0)
        is_usage = bool(re.search(r'penggunaan|contoh|format|cara pakai|usage|masukkan|kirim|caranya', s, re.I))
        tm = re.search(r'\*([^*]{2,50})\*', s)
        title = tm.group(1) if tm else name
        if is_usage:
            return f'{{ const __navText = claraWrap("{title}", \'{s}\'); {ret}sendReplyWithNav(sock, m, __navText, "{name}"); }}'
        return f'{{ const __navText = claraWrap("{title}", \'{s}\'); {ret}m.reply(__navText); }}'

    content = re.sub(
        r"\{\s*const\s+__navText\s*=\s*'([^']+)';\s*(return\s+await\s+|return\s+|await\s+)?sendReplyWithNav\(sock,\s*m,\s*__navText,\s*\"([^\"]+)\"\s*\)\s*;?\s*\}",
        fix_navtext_s, content)

    # Broken __navText = (var, { mentions })
    content = re.sub(
        r'\{\s*const\s+__navText\s*=\s*\(([^,]+),\s*\{\s*mentions:\s*\[([^\]]+)\]\s*\}\s*\);\s*await\s+sendReplyWithNav\(sock,\s*m,\s*__navText,\s*"([^"]+)"\s*\);\s*\}',
        lambda m: f'await m.reply(claraWrap("{m.group(3)}", {m.group(1).strip()}), {{ mentions: [{m.group(2)}] }});', content)

    # Broken __navText = (var);
    content = re.sub(
        r'\{\s*const\s+__navText\s*=\s*\(([^)]+)\);\s*await\s+sendReplyWithNav\(sock,\s*m,\s*__navText,\s*"([^"]+)"\s*\)\s*;?\s*\};?',
        lambda m: f'await m.reply(claraWrap("{m.group(2)}", {m.group(1).strip()}));', content)

    # m.reply with concatenated backticks
    def fix_concat(m):
        ret = m.group(1) or ''
        text_expr = m.group(2)
        if 'claraWrap' in text_expr or 'bracketBox' in text_expr or 'te(' in text_expr: return m.group(0)
        if '╔' in text_expr or '╎' in text_expr: return m.group(0)
        tm = re.search(r'\*([^*]{2,50})\*', text_expr)
        title = tm.group(1) if tm else pname
        return f'{ret}m.reply(claraWrap("{title}", {text_expr}))'

    content = re.sub(r'(return\s+)?m\.reply\(\s*((?:`[^`]+`\s*\+\s*\n?\s*)+`[^`]+`)\s*,?\s*\)', fix_concat, content)

    # m.reply(`text`) simple
    def fix_bt(m):
        ret = m.group(1) or ''
        tmpl = m.group(2)
        if 'claraWrap' in m.group(0) or 'te(' in m.group(0): return m.group(0)
        if '╔' in tmpl or '╎' in tmpl or len(tmpl.strip()) < 8: return m.group(0)
        tm = re.search(r'\*([^*]{2,50})\*', tmpl)
        title = tm.group(1) if tm else pname
        return f'{ret}m.reply(claraWrap("{title}", `{tmpl}`))'

    content = re.sub(r'(return\s+)?m\.reply\(`([^`]+)`\)', fix_bt, content)

    # m.reply("text") simple
    def fix_s(m):
        ret = m.group(1) or ''
        s = m.group(2)
        if 'claraWrap' in m.group(0) or 'te(' in m.group(0): return m.group(0)
        if '╔' in s or '╎' in s or len(s.strip()) < 10: return m.group(0)
        tm = re.search(r'\*([^*]{2,50})\*', s)
        title = tm.group(1) if tm else pname
        return f'{ret}m.reply(claraWrap("{title}", "{s}"))'

    content = re.sub(r'(return\s+)?m\.reply\("([^"]{10,})"\)', fix_s, content)

    # sendReplyWithNav(sock, m, `text`, "name")
    def fix_nav_bt(m):
        ret = m.group(1) or ''
        tmpl = m.group(2)
        name = m.group(3)
        if 'claraWrap' in tmpl or 'bracketBox' in tmpl: return m.group(0)
        if '╔' in tmpl or '╎' in tmpl: return m.group(0)
        is_usage = bool(re.search(r'penggunaan|contoh|format|cara pakai|usage|masukkan|kirim|caranya', tmpl, re.I))
        tm = re.search(r'\*([^*]{2,50})\*', tmpl)
        title = tm.group(1) if tm else name
        if is_usage:
            return f'{ret}sendReplyWithNav(sock, m, claraWrap("{title}", `{tmpl}`), "{name}")'
        return f'{ret}m.reply(claraWrap("{title}", `{tmpl}`))'

    content = re.sub(r'(await\s+|return\s+)?sendReplyWithNav\(sock,\s*m,\s*`((?:[^`]|\\`)+)`\s*,\s*"([^"]+)"\)', fix_nav_bt, content)

    # sendReplyWithNav(sock, m, "string", "name")
    def fix_nav_s(m):
        ret = m.group(1) or ''
        s = m.group(2)
        name = m.group(3)
        if 'claraWrap' in s or 'bracketBox' in s: return m.group(0)
        if '╔' in s or '╎' in s: return m.group(0)
        is_usage = bool(re.search(r'penggunaan|contoh|format|cara pakai|usage|masukkan|kirim|caranya', s, re.I))
        tm = re.search(r'\*([^*]{2,50})\*', s)
        title = tm.group(1) if tm else name
        if is_usage:
            return f'{ret}sendReplyWithNav(sock, m, claraWrap("{title}", "{s}"), "{name}")'
        return f'{ret}m.reply(claraWrap("{title}", "{s}"))'

    content = re.sub(r'(await\s+|return\s+)?sendReplyWithNav\(sock,\s*m,\s*"([^"]{10,})"\s*,\s*"([^"]+)"\)', fix_nav_s, content)

    if content != orig:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        changed += 1

print(f"Changed: {changed}")
