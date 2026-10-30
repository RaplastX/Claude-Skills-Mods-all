#!/usr/bin/env bash
# Genera en dist/ los paquetes para subir a claude.ai (Personalizar → Plugins).
#   router-ia.plugin        skill + subagentes + /rapido /estandar /profundo (Claude Code y Cowork; en el chat, la skill)
#   router-ia-auto.plugin   el mod de Claude Code
#   navaja-suiza.plugin     medios, voz, imágenes y webs (sesiones de Claude Code en la nube)
#   router-ia-chat.zip      solo la skill del router, para quien use únicamente el chat
set -euo pipefail

RAIZ="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DIST="$RAIZ/dist"
rm -rf "$DIST" && mkdir -p "$DIST"

empaqueta() { # carpeta destino
  (cd "$1" && zip -qr "$2" . -x '*/__pycache__/*' '*.pyc' '.claude-plugin/types/*' '*.log' '.DS_Store')
  echo "$(basename "$2")"
}

empaqueta "$RAIZ/plugins/router-ia" "$DIST/router-ia.plugin"
empaqueta "$RAIZ/mods/router-ia-auto" "$DIST/router-ia-auto.plugin"
empaqueta "$RAIZ/plugins/navaja-suiza" "$DIST/navaja-suiza.plugin"

CHAT="$(mktemp -d)"
mkdir -p "$CHAT/.claude-plugin" "$CHAT/skills"
cp -r "$RAIZ/plugins/router-ia/skills/router-ia" "$CHAT/skills/"
python3 - "$RAIZ/plugins/router-ia/.claude-plugin/plugin.json" "$CHAT/.claude-plugin/plugin.json" <<'PY'
import json, sys
d = json.load(open(sys.argv[1]))
d["name"] = "router-ia-chat"
d["description"] = "Recomienda el modelo y el esfuerzo adecuados en el chat de claude.ai y explica cómo cambiarlos a mano."
json.dump(d, open(sys.argv[2], "w"), ensure_ascii=False, indent=2)
PY
empaqueta "$CHAT" "$DIST/router-ia-chat.zip"
rm -rf "$CHAT"

for f in "$DIST"/*; do
  if unzip -l "$f" | grep -qE '\.(sh|py|mjs|ts)$' && [[ "$f" == *chat* ]]; then
    echo "✗ $f lleva scripts y no debería" >&2
    exit 1
  fi
done
ls -la "$DIST"
