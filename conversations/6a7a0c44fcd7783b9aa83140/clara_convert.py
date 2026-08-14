#!/usr/bin/env python3
"""Comprehensive claraWrap converter - handles all patterns at once."""
import re, os, sys

def scan_dir(path):
    files = []
    for f in os.listdir(path):
        full = os.path.join(path, f)
        if os.path.isdir(full):
            files.extend(scan_dir(full))
        elif f.endswith('.js'):
            files.append(full)
    return files

stats = {'import_added': 0, 'bracketbox': 0, 'alyaheader': 0, 'te_error': 0,
         'nav_error_str': 0, 'navtext_tmpl': 0, 'navtext_broken': 0,
         'mreply_backtick': 0, 'mreply_str': 0, 'mreply_concat': 0, 'sendnav_plain': 0}

for filepath in scan_dir('/tmp/nova-bot/plugins'):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    orig = content
    
    name_m = re.search(r'name:\s*["\']([^"\']+)["\']', content)
    pname = name_m.group(1) if name_m else os.path.basename(filepath).replace('.js', '')
    
    # STEP 1: Ensure claraWrap import
    has_clara_import = bool(re.search(r'claraWrap\s*[},]', content))
    if not has_clara_import:
        menu_import = re.search(r'(import\s*\{[^}]*\}\s*from\s*["\'][^"\']*nova-menu-style[^"\']*["\'];)', content)
        if menu_import:
            imp = menu_import.group(1)
            if 'claraWrap' not in imp:
                new_imp = imp.replace('{', '{ claraWrap, ', 1)
                content = content.replace(imp, new_imp, 1)
                stats['import_added'] += 1
        else:
            first_import = re.search(r'(import\s+.*?;)', content)
            if first_import:
                insert_pos = first_import.end()
                rel_path = '../../src/lib/nova-menu-style.js'
                content = content[:insert_pos] + '\nimport { claraWrap } from "' + rel_path + '";' + content[insert_pos:]
                stats['import_added'] += 1
    
    # STEP 2: bracketBox("emoji"("label"), [...]) broken pattern
    def fix_broken_bb(m):
        label = m.group(1)
        lines_str = m.group(2).strip()
        if not lines_str:
            return f'claraWrap("{label}", "")'
        lines = [l.strip() for l in lines_str.split(',') if l.strip()]
        if len(lines) == 1:
            return f'claraWrap("{label}", {lines[0]})'
        return f'claraWrap("{label}", [{", ".join(lines)}].join("\\n"))'
    
    new_content = re.sub(
        r'bracketBox\(\s*"[^"]*"\s*\(\s*"([^"]+)"\s*\)\s*,\s*\[([^\]]*)\]\s*\)',
        fix_broken_bb, content
    )
    if new_content != content:
        stats['bracketbox'] += 1
        content = new_content
    
    # STEP 3: bracketBox("emoji", "label", [...])
    new_content = re.sub(
        r'bracketBox\(\s*"[^"]*"\s*,\s*"([^"]+)"\s*,\s*\[([^\]]*)\]\s*\)',
        fix_broken_bb, content
    )
    if new_content != content:
        stats['bracketbox'] += 1
        content = new_content
    
    # STEP 4: bracketBox("emoji", "label", `template`)
    new_content = re.sub(
        r'bracketBox\(\s*"[^"]*"\s*,\s*"([^"]+)"\s*,\s*(`[^`]*`)\s*\)',
        lambda m: f'claraWrap("{m.group(1)}", {m.group(2)})',
        content
    )
    if new_content != content:
        stats['bracketbox'] += 1
        content = new_content
    
    # STEP 5: alyaHeader("title", "emoji")
    new_content = re.sub(
        r'alyaHeader\("([^"]+)",\s*"([^"]*)"\)',
        lambda m: f'claraWrap("{m.group(1)}", "{m.group(2)}")',
        content
    )
    if new_content != content:
        stats['alyaheader'] += 1
        content = new_content
    
    new_content = re.sub(
        r'alyaHeader\("([^"]+)"\)',
        lambda m: f'claraWrap("{m.group(1)}", "")',
        content
    )
    if new_content != content:
        stats['alyaheader'] += 1
        content = new_content
    
    # STEP 6: sendReplyWithNav with te()
    def fix_te_nav(m):
        ret = m.group(1) or ''
        name = m.group(2)
        return f'{ret}m.reply(claraWrap("{name}", te(m.prefix, m.command, m.pushName), "error"))'
    
    new_content = re.sub(
        r'(await\s+|return\s+)?sendReplyWithNav\(sock,\s*m,\s*te\(m\.prefix,\s*m\.command,\s*m\.pushName\)\s*,\s*"([^"]+)"\)\s*;?',
        fix_te_nav, content
    )
    if new_content != content:
        stats['te_error'] += 1
        content = new_content
    
    # m.reply(te(...))
    new_content = re.sub(
        r'm\.reply\(te\(m\.prefix,\s*m\.command,\s*m\.pushName\)\)',
        lambda m: f'm.reply(claraWrap("{pname}", te(m.prefix, m.command, m.pushName), "error"))',
        content
    )
    if new_content != content:
        stats['te_error'] += 1
        content = new_content
    
    new_content = re.sub(
        r'return\s+m\.reply\(te\(m\.prefix,\s*m\.command,\s*m\.pushName\)\)',
        lambda m: f'return m.reply(claraWrap("{pname}", te(m.prefix, m.command, m.pushName), "error"))',
        content
    )
    if new_content != content:
        stats['te_error'] += 1
        content = new_content
    
    # STEP 7: sendReplyWithNav with "Error: " + e.message
    new_content = re.sub(
        r'(await\s+|return\s+)?sendReplyWithNav\(sock,\s*m,\s*"Error:\s*"\s*\+\s*e\.message,\s*"([^"]+)"\)',
        lambda m: f'{m.group(1) or ""}m.reply(claraWrap("{m.group(2)}", "Error: " + e.message, "error"))',
        content
    )
    if new_content != content:
        stats['nav_error_str'] += 1
        content = new_content
    
    # STEP 8: __navText with template literal
    def fix_navtext(m):
        tmpl = m.group(1)
        ret = m.group(2) or ''
        name = m.group(3)
        if 'claraWrap' in tmpl or 'bracketBox' in tmpl:
            return m.group(0)
        is_usage = bool(re.search(r'penggunaan|contoh|format|cara pakai|usage|masukkan|kirim|caranya', tmpl, re.I))
        title_m = re.search(r'\*([^*]{2,50})\*', tmpl)
        title = title_m.group(1) if title_m else name
        if is_usage:
            return f'{{ const __navText = claraWrap("{title}", `{tmpl}`); {ret}sendReplyWithNav(sock, m, __navText, "{name}"); }}'
        return f'{{ const __navText = claraWrap("{title}", `{tmpl}`); {ret}m.reply(__navText); }}'
    
    new_content = re.sub(
        r'\{\s*const\s+__navText\s*=\s*`((?:[^`]|\\`)+)`;\s*(return\s+await\s+|return\s+|await\s+)?sendReplyWithNav\(sock,\s*m,\s*__navText,\s*"([^"]+)"\s*\)\s*;?\s*\}',
        fix_navtext, content
    )
    if new_content != content:
        stats['navtext_tmpl'] += 1
        content = new_content
    
    # __navText with plain string
    def fix_navtext_s(m):
        s = m.group(1)
        ret = m.group(2) or ''
        name = m.group(3)
        if 'claraWrap' in s or 'bracketBox' in s:
            return m.group(0)
        is_usage = bool(re.search(r'penggunaan|contoh|format|cara pakai|usage|masukkan|kirim|caranya', s, re.I))
        title_m = re.search(r'\*([^*]{2,50})\*', s)
        title = title_m.group(1) if title_m else name
        if is_usage:
            return f'{{ const __navText = claraWrap("{title}", \'{s}\'); {ret}sendReplyWithNav(sock, m, __navText, "{name}"); }}'
        return f'{{ const __navText = claraWrap("{title}", \'{s}\'); {ret}m.reply(__navText); }}'
    
    new_content = re.sub(
        r"\{\s*const\s+__navText\s*=\s*'([^']+)';\s*(return\s+await\s+|return\s+|await\s+)?sendReplyWithNav\(sock,\s*m,\s*__navText,\s*\"([^\"]+)\"\s*\)\s*;?\s*\}",
        fix_navtext_s, content
    )
    if new_content != content:
        stats['navtext_tmpl'] += 1
        content = new_content
    
    # Broken __navText = (var, { mentions })
    new_content = re.sub(
        r'\{\s*const\s+__navText\s*=\s*\(([^,]+),\s*\{\s*mentions:\s*\[([^\]]+)\]\s*\}\s*\);\s*await\s+sendReplyWithNav\(sock,\s*m,\s*__navText,\s*"([^"]+)"\s*\);\s*\}',
        lambda m: f'await m.reply(claraWrap("{m.group(3)}", {m.group(1).strip()}), {{ mentions: [{m.group(2)}] }});',
        content
    )
    if new_content != content:
        stats['navtext_broken'] += 1
        content = new_content
    
    # Broken __navText = (var);
    new_content = re.sub(
        r'\{\s*const\s+__navText\s*=\s*\(([^)]+)\);\s*await\s+sendReplyWithNav\(sock,\s*m,\s*__navText,\s*"([^"]+)"\s*\)\s*;?\s*\};?',
        lambda m: f'await m.reply(claraWrap("{m.group(2)}", {m.group(1).strip()}));',
        content
    )
    if new_content != content:
        stats['navtext_broken'] += 1
        content = new_content
    
    # STEP 9: m.reply with concatenated backticks
    def fix_concat(m):
        ret = m.group(1) or ''
        text_expr = m.group(2)
        if 'claraWrap' in text_expr or 'bracketBox' in text_expr or 'te(' in text_expr:
            return m.group(0)
        if '╔' in text_expr or '╎' in text_expr:
            return m.group(0)
        title_m = re.search(r'\*([^*]{2,50})\*', text_expr)
        title = title_m.group(1) if title_m else pname
        return f'{ret}m.reply(claraWrap("{title}", {text_expr}))'
    
    new_content = re.sub(
        r'(return\s+)?m\.reply\(\s*((?:`[^`]+`\s*\+\s*\n?\s*)+`[^`]+`)\s*,?\s*\)',
        fix_concat, content
    )
    if new_content != content:
        stats['mreply_concat'] += 1
        content = new_content
    
    # STEP 10: m.reply(`text`) simple
    def fix_bt(m):
        ret = m.group(1) or ''
        tmpl = m.group(2)
        if 'claraWrap' in m.group(0) or 'bracketBox' in m.group(0) or 'te(' in m.group(0):
            return m.group(0)
        if '╔' in tmpl or '╎' in tmpl:
            return m.group(0)
        if len(tmpl.strip()) < 8:
            return m.group(0)
        title_m = re.search(r'\*([^*]{2,50})\*', tmpl)
        title = title_m.group(1) if title_m else pname
        return f'{ret}m.reply(claraWrap("{title}", `{tmpl}`))'
    
    new_content = re.sub(
        r'(return\s+)?m\.reply\(`([^`]+)`\)',
        fix_bt, content
    )
    if new_content != content:
        stats['mreply_backtick'] += 1
        content = new_content
    
    # STEP 11: m.reply("text") simple
    def fix_s(m):
        ret = m.group(1) or ''
        s = m.group(2)
        if 'claraWrap' in m.group(0) or 'bracketBox' in m.group(0) or 'te(' in m.group(0):
            return m.group(0)
        if '╔' in s or '╎' in s:
            return m.group(0)
        if len(s.strip()) < 10:
            return m.group(0)
        title_m = re.search(r'\*([^*]{2,50})\*', s)
        title = title_m.group(1) if title_m else pname
        return f'{ret}m.reply(claraWrap("{title}", "{s}"))'
    
    new_content = re.sub(
        r'(return\s+)?m\.reply\("([^"]{10,})"\)',
        fix_s, content
    )
    if new_content != content:
        stats['mreply_str'] += 1
        content = new_content
    
    # STEP 12: sendReplyWithNav(sock, m, `text`, "name")
    def fix_nav_bt(m):
        ret = m.group(1) or ''
        tmpl = m.group(2)
        name = m.group(3)
        if 'claraWrap' in tmpl or 'bracketBox' in tmpl:
            return m.group(0)
        if '╔' in tmpl or '╎' in tmpl:
            return m.group(0)
        is_usage = bool(re.search(r'penggunaan|contoh|format|cara pakai|usage|masukkan|kirim|caranya', tmpl, re.I))
        title_m = re.search(r'\*([^*]{2,50})\*', tmpl)
        title = title_m.group(1) if title_m else name
        if is_usage:
            return f'{ret}sendReplyWithNav(sock, m, claraWrap("{title}", `{tmpl}`), "{name}")'
        return f'{ret}m.reply(claraWrap("{title}", `{tmpl}`))'
    
    new_content = re.sub(
        r'(await\s+|return\s+)?sendReplyWithNav\(sock,\s*m,\s*`((?:[^`]|\\`)+)`\s*,\s*"([^"]+)"\)',
        fix_nav_bt, content
    )
    if new_content != content:
        stats['sendnav_plain'] += 1
        content = new_content
    
    # sendReplyWithNav(sock, m, "string", "name")
    def fix_nav_s(m):
        ret = m.group(1) or ''
        s = m.group(2)
        name = m.group(3)
        if 'claraWrap' in s or 'bracketBox' in s:
            return m.group(0)
        if '╔' in s or '╎' in s:
            return m.group(0)
        is_usage = bool(re.search(r'penggunaan|contoh|format|cara pakai|usage|masukkan|kirim|caranya', s, re.I))
        title_m = re.search(r'\*([^*]{2,50})\*', s)
        title = title_m.group(1) if title_m else name
        if is_usage:
            return f'{ret}sendReplyWithNav(sock, m, claraWrap("{title}", "{s}"), "{name}")'
        return f'{ret}m.reply(claraWrap("{title}", "{s}"))'
    
    new_content = re.sub(
        r'(await\s+|return\s+)?sendReplyWithNav\(sock,\s*m,\s*"([^"]{10,})"\s*,\s*"([^"]+)"\)',
        fix_nav_s, content
    )
    if new_content != content:
        stats['sendnav_plain'] += 1
        content = new_content
    
    if content != orig:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)

print("Done! Stats:")
for k, v in stats.items():
    print(f"  {k}: {v}")
