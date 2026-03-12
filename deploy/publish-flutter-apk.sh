#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SRC_APK="${ROOT_DIR}/bitegit_flutter_app/build/app/outputs/flutter-apk/app-release.apk"
DOWNLOAD_DIR="${ROOT_DIR}/public/downloads"
INDEX_HTML="${ROOT_DIR}/public/index.html"
PUBSPEC_FILE="${ROOT_DIR}/bitegit_flutter_app/pubspec.yaml"

if [[ ! -f "${SRC_APK}" ]]; then
  echo "Error: APK not found at ${SRC_APK}" >&2
  exit 1
fi

if [[ ! -f "${INDEX_HTML}" ]]; then
  echo "Error: index.html not found at ${INDEX_HTML}" >&2
  exit 1
fi

if [[ ! -f "${PUBSPEC_FILE}" ]]; then
  echo "Error: pubspec.yaml not found at ${PUBSPEC_FILE}" >&2
  exit 1
fi

mkdir -p "${DOWNLOAD_DIR}"

VERSION_LINE="$(grep -E '^version:' "${PUBSPEC_FILE}" | head -n 1 | awk '{print $2}')"
BUILD_CODE="${VERSION_LINE##*+}"
if [[ -z "${BUILD_CODE}" || "${BUILD_CODE}" == "${VERSION_LINE}" ]]; then
  BUILD_CODE="0"
fi

STAMP="$(date +%Y%m%d%H%M)"
LATEST_APK="${DOWNLOAD_DIR}/bitegit-android-latest.apk"

cp -f "${SRC_APK}" "${LATEST_APK}"

SHA256="$(/usr/bin/shasum -a 256 "${LATEST_APK}" | awk '{print $1}')"
SIZE_BYTES="$(stat -f %z "${LATEST_APK}")"

cat > "${DOWNLOAD_DIR}/latest-apk.json" <<JSON
{
  "filename": "bitegit-android-latest.apk",
  "buildCode": "${BUILD_CODE}",
  "stamp": "${STAMP}",
  "sha256": "${SHA256}",
  "sizeBytes": ${SIZE_BYTES}
}
JSON

/usr/bin/perl -0pi -e "s#/downloads/[^\"']+\\.apk\\?v=[0-9]+#/downloads/bitegit-android-latest.apk?v=${STAMP}#g; s#<strong>[^<]*\\.apk(?: \\(v[0-9]+\\))?</strong>#<strong>bitegit-android-latest.apk (v${BUILD_CODE})</strong>#g" "${INDEX_HTML}"

echo "Published APK: bitegit-android-latest.apk"
echo "SHA256: ${SHA256}"
echo "Size: ${SIZE_BYTES} bytes"
