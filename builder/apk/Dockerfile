# RARA AI - MULTI DEVICE — APK Builder Image (8 Okt 2026)
# Toolchain: Java 21 + Android SDK (aapt2/d8/apksigner) + Flutter + Node 20 receiver.
# Support 3 jenis build: web/HTML → WebView APK, Android Gradle native, Flutter.
# Build di VPS HOST (bukan di container bot):
#   git clone https://github.com/itsmeeaizat1/Rara-AI-Multi-Device.git /tmp/rara
#   cd /tmp/rara && docker build -t apk-builder:latest builder/apk/
FROM eclipse-temurin:21-jdk-jammy

ENV DEBIAN_FRONTEND=noninteractive
RUN apt-get update && apt-get install -y --no-install-recommends \
      unzip zip git curl ca-certificates file xz-utils && \
    rm -rf /var/lib/apt/lists/*

# Node 20 (receiver + patcher)
RUN curl -fsSL https://nodejs.org/dist/v20.11.1/node-v20.11.1-linux-x64.tar.xz \
      | tar -xJ -C /usr/local --strip-components=1

# Android SDK
ENV ANDROID_HOME=/opt/android-sdk
RUN mkdir -p ${ANDROID_HOME}/cmdline-tools && \
    curl -fsSL https://dl.google.com/android/repository/commandlinetools-linux-11076708_latest.zip -o /tmp/clt.zip && \
    unzip -q /tmp/clt.zip -d ${ANDROID_HOME}/cmdline-tools && \
    mv ${ANDROID_HOME}/cmdline-tools/cmdline-tools ${ANDROID_HOME}/cmdline-tools/latest && \
    rm /tmp/clt.zip && \
    yes | ${ANDROID_HOME}/cmdline-tools/latest/bin/sdkmanager --licenses > /dev/null && \
    ${ANDROID_HOME}/cmdline-tools/latest/bin/sdkmanager \
      "platform-tools" "platforms;android-34" "build-tools;34.0.0" > /dev/null

# Flutter (stable, Android artifacts pre-cached)
RUN git clone --depth 1 -b stable https://github.com/flutter/flutter.git /opt/flutter
ENV PATH=${PATH}:/opt/flutter/bin:${ANDROID_HOME}/cmdline-tools/latest/bin:${ANDROID_HOME}/platform-tools:${ANDROID_HOME}/build-tools/34.0.0
RUN flutter config --no-analytics && flutter precache --android > /dev/null

# Template WebView APK (dipakai jalur "web → apk"), dibangun sekali di sini:
# manifest + MainActivity → javac → d8 → aapt2 package → apksigner sign
COPY webapk /opt/receiver/webapk-src
COPY receiver /opt/receiver/app
RUN mkdir -p /opt/receiver/webapk && \
    bash /opt/receiver/webapk-src/build-template.sh /opt/receiver/webapk-src /opt/receiver/webapk /opt/android-sdk && \
    rm -rf /opt/receiver/webapk-src/gen /opt/receiver/webapk-src/classes

ENV HOME=/home/container
RUN mkdir -p /home/container
WORKDIR /home/container

EXPOSE 8080
CMD ["node", "/opt/receiver/app/boot.js"]
