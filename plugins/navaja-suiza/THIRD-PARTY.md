# Código de terceros

| Skill | Origen | Commit | Licencia | Notas |
| --- | --- | --- | --- | --- |
| `hyperframes` | https://github.com/heygen-com/hyperframes (`skills/hyperframes` + `references/`) | 359b6c8 | Apache 2.0 | Sin scripts. Usa `npx hyperframes` (npm, oficial) y Chromium/ffmpeg |
| `agent-browser` | https://github.com/vercel-labs/agent-browser (`skills/agent-browser`) | 7ed6afd | Apache 2.0 | Solo la instrucción. Su instalación (`npm i -g agent-browser`) ejecuta `postinstall`, que descarga un binario de sus releases de GitHub: no lo he ejecutado |

Revisión: `hyperframes` tiene mapas de base que descargan teselas de CDNs públicos y claves opcionales para describir imágenes; ninguna se ejecuta sin que la pidas.
