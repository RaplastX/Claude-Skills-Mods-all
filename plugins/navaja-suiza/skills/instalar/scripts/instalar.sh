#!/usr/bin/env bash
# Instala lo que usa la navaja suiza en una sesión en la nube (que empieza vacía).
# Uso: instalar.sh [todo|base|video|audio|voz|clon|imagen|web]...   (por defecto: todo)
# Se puede repetir: lo ya instalado se salta.
set -uo pipefail

AQUI="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
NAVAJA="$HOME/.config/navaja"
CACHE="$HOME/.cache/navaja"
LOG="$CACHE/instalar.log"
mkdir -p "$NAVAJA" "$CACHE"
: > "$LOG"

ok=()
fallo=()

paso() { echo "· $*"; }
bien() { ok+=("$1"); }
mal() { fallo+=("$1: $2"); }

pip_i() {
  python3 -m pip install --user -q --disable-pip-version-check "$@" >>"$LOG" 2>&1
}

baja() { # baja URL DESTINO (sin rehacer si ya está)
  [ -s "$2" ] && return 0
  curl -sSfL --retry 3 -o "$2.part" "$1" >>"$LOG" 2>&1 && mv "$2.part" "$2"
}

base() {
  paso "base: entorno, yt-dlp y cookies"
  cat >"$NAVAJA/env.sh" <<EOF
export PATH="\$HOME/.local/bin:\$PATH"
export SSL_CERT_FILE="\${SSL_CERT_FILE:-/root/.ccr/ca-bundle.crt}"
export NAVAJA_CACHE="$CACHE"
export NAVAJA_DIR="$NAVAJA"
EOF
  [ -f /root/.ccr/ca-bundle.crt ] || sed -i '/SSL_CERT_FILE/d' "$NAVAJA/env.sh"
  grep -q 'navaja/env.sh' "$HOME/.bashrc" 2>/dev/null ||
    echo '[ -f "$HOME/.config/navaja/env.sh" ] && . "$HOME/.config/navaja/env.sh"' >>"$HOME/.bashrc"
  # shellcheck disable=SC1091
  . "$NAVAJA/env.sh"

  if pip_i -U "yt-dlp[default,curl-cffi]"; then bien "yt-dlp $(yt-dlp --version)"; else mal yt-dlp "ver $LOG"; fi

  python3 "$AQUI/cookies.py" >>"$LOG" 2>&1
  local conf="$HOME/.config/yt-dlp/config"
  mkdir -p "$(dirname "$conf")"
  {
    echo "--js-runtimes node"
    echo "--no-progress"
    [ -s "$NAVAJA/cookies.txt" ] && echo "--cookies $NAVAJA/cookies.txt"
  } >"$conf"
  if [ -s "$NAVAJA/cookies.txt" ]; then bien "cookies cargadas"; else bien "sin cookies (solo contenido público)"; fi

  command -v ffmpeg >/dev/null && bien "ffmpeg" || mal ffmpeg "no está instalado en la imagen"
}

audio() {
  paso "audio: Whisper, librosa y voces Piper"
  if pip_i faster-whisper librosa soundfile piper-tts; then bien "whisper, librosa, piper"; else mal audio "ver $LOG"; fi
  local v="$CACHE/voces" hf="https://huggingface.co/rhasspy/piper-voices/resolve/main/es"
  mkdir -p "$v"
  for voz in es_MX/claude/high/es_MX-claude-high es_ES/davefx/medium/es_ES-davefx-medium; do
    baja "$hf/$voz.onnx" "$v/$(basename "$voz").onnx" &&
      baja "$hf/$voz.onnx.json" "$v/$(basename "$voz").onnx.json" ||
      mal "voz $(basename "$voz")" "no se pudo bajar"
  done
  bien "voces: $(ls "$v"/*.onnx 2>/dev/null | xargs -n1 basename | sed 's/.onnx//' | paste -sd, -)"
}

clon() {
  paso "clonar voz: PyTorch (CPU) y Chatterbox multilingüe (tarda unos minutos)"
  if pip_i torch==2.6.0 torchaudio==2.6.0 --index-url https://download.pytorch.org/whl/cpu &&
    pip_i chatterbox-tts; then
    bien "chatterbox (clonar voz)"
  else
    mal clon "ver $LOG"
  fi
}

imagen() {
  paso "imagen: motor local (stable-diffusion.cpp), Z-Image-Turbo y cliente de Spaces"
  local m="$CACHE/modelos" hf="https://huggingface.co"
  mkdir -p "$m"
  baja "$hf/leejet/Z-Image-Turbo-GGUF/resolve/main/z_image_turbo-Q4_K.gguf" "$m/z_image_turbo-Q4_K.gguf" &
  baja "$hf/unsloth/Qwen3-4B-Instruct-2507-GGUF/resolve/main/Qwen3-4B-Instruct-2507-Q4_K_M.gguf" "$m/Qwen3-4B-Instruct-2507-Q4_K_M.gguf" &
  baja "$hf/Comfy-Org/z_image_turbo/resolve/main/split_files/vae/ae.safetensors" "$m/ae.safetensors" &
  python3 -c "import stable_diffusion_cpp" 2>/dev/null ||
    CMAKE_ARGS="-DGGML_NATIVE=ON" pip_i stable-diffusion-cpp-python==0.4.7
  pip_i gradio_client
  wait
  if python3 -c "import stable_diffusion_cpp" 2>/dev/null && [ -s "$m/z_image_turbo-Q4_K.gguf" ] &&
    [ -s "$m/Qwen3-4B-Instruct-2507-Q4_K_M.gguf" ] && [ -s "$m/ae.safetensors" ]; then
    bien "Z-Image-Turbo local"
  else
    mal imagen "ver $LOG"
  fi
  [ -n "${HF_TOKEN:-}" ] && bien "HF_TOKEN: Spaces con GPU gratis" || bien "sin HF_TOKEN: solo motor local"
}

docs() {
  paso "documentos y OCR: RapidOCR, PyMuPDF y MarkItDown"
  if pip_i rapidocr-onnxruntime pymupdf "markitdown[pdf,docx,pptx,xlsx]"; then bien "ocr y documentos"; else mal docs "ver $LOG"; fi
}

web() {
  paso "web: Playwright (Chromium ya viene en la imagen)"
  if node -e "require('playwright')" 2>/dev/null; then bien "playwright"; else mal web "playwright no disponible"; fi
  [ -s "$NAVAJA/storage-state.json" ] && bien "sesiones web desde cookies"
}

video() {
  paso "vídeo: ffmpeg + lo de audio para narrar"
  audio
}

pedidos=("$@")
[ ${#pedidos[@]} -eq 0 ] && pedidos=(todo)
base
for p in "${pedidos[@]}"; do
  case "$p" in
  todo) audio; docs; imagen; web; clon ;;
  base) ;;
  audio | voz) audio ;;
  video) video ;;
  clon) clon ;;
  imagen | imagenes) imagen ;;
  docs | ocr | documentos) docs ;;
  web) web ;;
  *) mal "$p" "componente desconocido (usa todo, video, audio, voz, clon, docs, imagen o web)" ;;
  esac
done

echo
for o in "${ok[@]}"; do echo "✓ $o"; done
for f in "${fallo[@]}"; do echo "✗ $f"; done
[ ${#fallo[@]} -eq 0 ]
