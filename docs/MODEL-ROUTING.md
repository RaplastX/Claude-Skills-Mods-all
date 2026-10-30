# Ruteo de modelos

Cómo elige este repositorio entre Haiku, Sonnet y Opus, qué mecanismos son reales en cada sitio y cómo comprobar qué modelo trabajó de verdad.

## Auditoría de lo que había (antes de la versión 0.2)

| Pieza | Qué hacía de verdad | ¿Cambiaba el modelo? |
| --- | --- | --- |
| `model-router-pro-mobile` (plugin de tu cuenta, fuera del repo) | Skill de instrucciones y tres subagentes con `model:` | Solo los subagentes, cuando Claude decidía delegar. El hilo principal, nunca |
| `router-ia` 0.1 (skill + 3 subagentes) | Lo mismo, con reglas más finas | Igual: solo subagentes |
| `router-ia-auto` 0.1 (mod) | Reescribía el modelo y el esfuerzo de cada petición del hilo principal | Sí, pero **solo en sesiones que lo tuvieran cargado**, sin forma de comprobarlo y pisando las skills que fijan modelo |

Por qué no veías cambiar nada: en la sesión donde se escribió, el mod no estaba cargado (los plugins de la cuenta se cargan al **abrir** una sesión) y, aunque lo esté, el selector de la app muestra siempre el modelo de la sesión: el mod cambia cada petición sin tocarlo. No existía `/route`; el comando era `/ruta`.

## Mecanismos reales

| Mecanismo | Dónde funciona | Qué cambia | Cuánto dura |
| --- | --- | --- | --- |
| Mod `router-ia-auto` | Claude Code (también en la nube desde el móvil) | Modelo y esfuerzo de cada petición del hilo principal | Cada mensaje |
| Skills con `model:`/`effort:` (`/rapido`, `/estandar`, `/profundo`) | Claude Code | Modelo y esfuerzo | El turno de la skill; luego vuelve el de la sesión |
| Subagentes con `model:` (`haiku-rapido`, `auditor-repo`, `sonnet-constructor`, `probador`, `investigador`, `opus-arquitecto`) | Claude Code y Cowork | El modelo del subagente | Lo que dura el encargo |
| `opusplan` (`/model opusplan`) | Claude Code | Opus en modo plan, Sonnet al ejecutar | Toda la sesión |
| `/model` y `/effort` | Claude Code | Modelo y esfuerzo de la sesión | Hasta cambiarlo |
| Skill `router-ia` en el chat | claude.ai | Nada: recomienda y explica cómo cambiarlo a mano | — |

Una skill del chat **no puede** tocar el selector de modelos. En el chat, el modelo y el esfuerzo se cambian tocando el nombre del modelo junto al botón de enviar (ahí está también **Effort** y el interruptor **Thinking**).

## Cómo decide el router

1. **Reglas sin coste** sobre el mensaje: señales de dificultad (arquitectura, seguridad, causa raíz, concurrencia, «piensa a fondo»...), de tarea mecánica (buscar, renombrar, resumir...), de construcción (implementar, tests, bug) y tamaño de la petición.
2. **Modo mixto** (opcional, en `/config`): si las reglas no ven señal clara y el mensaje es largo, pregunta a Haiku con esfuerzo bajo. Gasta un poco de uso; si Haiku no responde, mandan las reglas.
3. **Continuaciones** («sí», «dale», «sí, hazlo») siguen con la misma ruta.
4. **Etiquetas** en el mensaje (`+opus`, `+haiku`, `+alto`, `+max`...) mandan para ese mensaje.
5. **Caché**: la caché es de cada modelo. Bajar a Haiku compensa siempre: su entrada sin caché cuesta menos que leer la caché de Opus. Bajar de Opus a Sonnet obliga a Sonnet a cachear todo el contexto: con más de 30.000 tokens (ajustable), el router espera a que la tarea lo siga pidiendo un segundo mensaje y mientras tanto baja el esfuerzo. Subir es inmediato. (Cálculo con los precios oficiales de la API como referencia; el límite de Claude Pro no se publica en tokens.)
6. **Respeta lo que ya eligió otro**: si una skill con `model:`, un fallback o `opusplan` fijaron el modelo de una petición, el router no lo pisa.

| Nivel | Modelo | Esfuerzo | Ejemplos |
| --- | --- | --- | --- |
| Rápido | Haiku | low | Pregunta sencilla, resumen corto, buscar, renombrar, extraer |
| Estándar | Sonnet | medium / high | Programar, corregir, tests, revisar, investigar, analizar documentos |
| Profundo | Opus | high / xhigh | Arquitectura, seguridad, concurrencia, bugs difíciles, decisiones críticas |
| Híbrido | `opusplan` | — | Proyectos grandes donde planificar y ejecutar se separan |

**Esfuerzo**: `low` responde directo; `medium` razona lo justo; `high` analiza a fondo; `xhigh` todavía más (Opus 4.7 en adelante); `max` es el máximo y solo se usa si lo pides. **Ultracode** no es un esfuerzo: es un ajuste de Claude Code que lanza flujos de trabajo largos y gasta mucho; actívalo solo para tareas grandes (`/effort`).

## Comprobar qué modelo trabajó de verdad

- `/ruta-estado`: cada petición con lo **pedido** y lo **atendido según el servidor** (el id que devuelve la API), del hilo principal y de cada subagente. Si no coinciden (por un fallback), sale «⚠ distinto».
- `/ruta-auditar`: qué piezas funcionan en la sesión (mod, modo, `opusplan`, `CLAUDE_CODE_EFFORT_LEVEL`, ultracode, cadena de respaldo) y cuántas peticiones enrutadas atendió el modelo pedido.
- `/ruta-probar`: las ocho clases de tarea de prueba contra el clasificador (gratis); `/ruta-probar vivo` además comprueba que Haiku, Sonnet y Opus responden.
- Sin el mod no hay forma de ver el modelo real de cada petición desde la sesión; el selector solo enseña el de la sesión.

## Usar `/ruta`

```
/ruta                 ruta actual y por qué
/ruta auto            elige solo (por defecto)
/ruta ahorro          evita Opus y baja el esfuerzo cuando se puede
/ruta calidad         nunca Haiku y sube el esfuerzo
/ruta opus alto       fija modelo y esfuerzo hasta /ruta auto
/ruta off             no toca nada (usas /model y /effort)
```

## Contexto y uso

- Abre una sesión nueva o usa `/compact` cuando el contexto está lleno de cosas que ya no importan: cada mensaje reenvía todo el contexto.
- Delega lecturas grandes a `haiku-rapido` o `auditor-repo`: el contexto principal solo recibe el resumen. Pero cada subagente también gasta uso: no delegues lo que se resuelve en dos o tres pasos.
- Los scripts de `navaja-suiza` procesan los datos antes de que entren al contexto (hojas de fotogramas, transcripciones por bloques, texto de páginas recortado).
- Las skills con `disable-model-invocation: true` (`/rapido`, `/estandar`, `/profundo`, `/instalar`) no ocupan contexto hasta que las usas.

## Cuando algo falla

- **Modelo no disponible**: la petición falla o salta la cadena de respaldo (`fallbackModel`) si la tienes; `/ruta-estado` lo marca como «⚠ distinto». `/ruta-probar vivo` dice qué modelos responden.
- **El subagente asignado falla**: el hilo principal recibe el error; la regla es escalar al nivel siguiente con el diagnóstico, no repetir lo mismo.
- **El router no actúa**: comprueba con `/ruta-auditar` que el mod está cargado (sesión nueva tras guardarlo) y que el modo no es `off`.
