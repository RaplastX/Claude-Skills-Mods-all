# Código de terceros

Copiado sin cambios de lógica (solo la descripción de cada SKILL.md acortada y, en ui-ux-pro-max, la ruta de los scripts a `${CLAUDE_SKILL_DIR}`):

| Skill | Origen | Commit revisado | Licencia |
| --- | --- | --- | --- |
| `ui-ux-pro-max` | https://github.com/nextlevelbuilder/ui-ux-pro-max-skill (`.claude/skills/ui-ux-pro-max`, sin pruebas) | 9a3f14f | MIT, ver `LICENSE-ui-ux-pro-max` |
| `diagram-design` | https://github.com/cathrynlavery/diagram-design (`skills/diagram-design`) | 0cf73c3 | MIT, ver `LICENSE-diagram-design` |

Revisión (30 oct 2026): ningún script de uso hace llamadas de red ni ejecuta comandos del sistema. Excepciones: `diagram-design/scripts/export_png.py` usa Playwright/Chromium solo si pides exportar a PNG, y las diagramas HTML cargan una fuente de Google Fonts al abrirse en un navegador. No se incluyen hooks, servidores MCP ni instaladores.

| `frontend-design` | https://github.com/anthropics/skills (`skills/frontend-design`) | ca45fc4 | Apache 2.0, `LICENSE-frontend-design.txt` |

Solo la instrucción (`SKILL.md`), sin scripts.
