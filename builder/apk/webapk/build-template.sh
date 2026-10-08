#!/bin/bash
# RARA AI - MULTI DEVICE — build-template.sh (dipanggil di Dockerfile)
# Bangun template WebView APK sekali: manifest + MainActivity → aapt2 → javac → d8 → apksigner.
# Arg: <src_dir> <out_dir> <android_sdk>
set -e
SRC="$1"; OUT="$2"; SDK="$3"
JAR="$SDK/platforms/android-34/android.jar"
BT="$SDK/build-tools/34.0.0"
mkdir -p "$OUT" "$SRC/gen" "$SRC/classes"

echo "[template] compile resources (aapt2)"
"$BT/aapt2" compile --dir "$SRC/res" -o "$SRC/gen/res.zip"
"$BT/aapt2" link -o "$SRC/gen/base.apk" -I "$JAR" \
  --manifest "$SRC/AndroidManifest.xml" \
  --min-sdk-version 21 --target-sdk-version 28 \
  "$SRC/gen/res.zip"

echo "[template] compile java (javac)"
javac -source 8 -target 8 -nowarn -bootclasspath "$JAR" \
  -d "$SRC/classes" "$SRC/MainActivity.java" 2>&1 | grep -v "bootstrap class path" || true

echo "[template] dex (d8)"
mkdir -p "$SRC/gen/dex"
"$BT/d8" --release --lib "$JAR" --min-api 21 \
  --output "$SRC/gen/dex" $(find "$SRC/classes" -name "*.class")

echo "[template] package (aapt2 add + zip)"
cd "$SRC/gen"
cp base.apk template.apk
cd dex && zip -qr ../template.apk classes.dex && cd ..
mkdir -p assets && cp "$SRC/assets/rara-config.txt" assets/ && zip -qr template.apk assets/

echo "[template] zipalign + sign"
"$BT/zipalign" -f 4 template.apk aligned.apk
if [ ! -f "$OUT/rara.keystore" ]; then
  keytool -genkeypair -keystore "$OUT/rara.keystore" -alias rara \
    -keyalg RSA -keysize 2048 -validity 10000 \
    -storepass rara123 -keypass rara123 \
    -dname "CN=Rara AI, OU=Aizat, O=Aizat, C=ID" >/dev/null 2>&1
fi
"$BT/apksigner" sign --ks "$OUT/rara.keystore" --ks-pass pass:rara123 \
  --ks-key-alias rara --key-pass pass:rara123 \
  --out "$OUT/template.apk" aligned.apk
"$BT/apksigner" verify --print-certs "$OUT/template.apk" | head -2
ls -la "$OUT/template.apk"
echo "[template] OK"
