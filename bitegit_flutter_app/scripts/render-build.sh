#!/usr/bin/env bash

set -euo pipefail

FLUTTER_VERSION="${FLUTTER_VERSION:-3.41.4}"
FLUTTER_ROOT="${HOME}/flutter-${FLUTTER_VERSION}"

if [ ! -d "${FLUTTER_ROOT}" ]; then
  git clone --depth 1 --branch "${FLUTTER_VERSION}" https://github.com/flutter/flutter.git "${FLUTTER_ROOT}"
fi

export PATH="${FLUTTER_ROOT}/bin:${PATH}"
export PUB_CACHE="${HOME}/.pub-cache"
export CI=true
export FLUTTER_SUPPRESS_ANALYTICS=true

flutter --disable-analytics >/dev/null 2>&1 || true
flutter config --enable-web
flutter --no-version-check pub get
flutter --no-version-check build web --release
