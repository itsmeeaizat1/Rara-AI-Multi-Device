import os, re

excluded = {
    "plugins/main/menu.js",
    "plugins/main/allmenu.js",
    "plugins/main/allmenucategory.js",
    "plugins/main/infov2.js",
    "plugins/search/play.js",
    "plugins/search/yts.js",
    "plugins/search/spotify.js",
    "plugins/user/daftarotomatis.js",
    "plugins/user/daftar.js",
    "plugins/group/botmode.js",
    "plugins/owner/cekschedule.js",
    "plugins/sticker/sticker.js"
}

helper_keywords = ["raraWrap", "raraError", "raraEmpty", "raraGuide", "raraNoInput", "bracketBox", "raraCaption", "raraReply", "raraBox", "raraLine", "raraSuccess", "raraUsage"]

no_helper_files = []
raw_reply_files = []

for root, dirs, files in os.walk("plugins"):
    for file in files:
        if not file.endswith(".js"):
            continue
        fp = os.path.join(root, file)
        # normalize path relative to repo root
        rel_fp = os.path.relpath(fp, ".").replace("\\", "/")
        if rel_fp in excluded:
            continue
        
        with open(fp, "r", encoding="utf-8", errors="ignore") as f:
            content = f.read()
        
        has_reply = "m.reply" in content
        has_helper = any(kw in content for kw in helper_keywords)
        
        if has_reply and not has_helper:
            no_helper_files.append(rel_fp)

print(f"Total files with m.reply but NO helper imports/calls: {len(no_helper_files)}")
for f in sorted(no_helper_files):
    print(f)
