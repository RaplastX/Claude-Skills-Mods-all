# Claude Skills & Mods

Plugins para que Claude elija el modelo (Haiku, Sonnet, Opus) y el esfuerzo adecuados para cada tarea: el trabajo sale preciso y no se gastan tokens como si fueran ilimitados.

## ¿Mod o skill?

Las dos cosas, porque cada una llega a un sitio distinto:

| | Chat de claude.ai | Cowork | Claude Code |
| --- | --- | --- | --- |
| **`router-ia`** (skill + subagentes) | Regula su esfuerzo y te avisa si conviene otro modelo | Reparte el trabajo entre subagentes Haiku, Sonnet y Opus | Igual que Cowork |
| **`router-ia-auto`** (mod) | No se ejecuta | No se ejecuta | **Cambia solo** de modelo y esfuerzo en cada mensaje |

- Una **skill** son instrucciones: funciona en todas partes, pero en el chat Claude no puede cambiar de modelo por sí mismo (eso lo eliges tú en el selector).
- Un **mod** es código que se engancha a Claude Code: puede cambiar de verdad el modelo y el esfuerzo de cada petición. Solo existe en Claude Code.

Lo recomendable: instalar `router-ia` en tu cuenta (te sirve en los tres) y, si usas Claude Code, además `router-ia-auto`.

**Desde el móvil en sesiones de Claude Code en la nube** (claude.ai/code con repos de GitHub) el mod sí funciona: se ejecuta dentro del Claude Code de la sesión, no en el teléfono. Es la mejor opción ahí; la skill lo complementa repartiendo trabajo entre subagentes.

## `navaja-suiza`: medios, voz, imágenes y webs

Para sesiones en la nube (empiezan vacías: primero `/instalar`).

| Skill | Qué hace | Probado en la nube |
| --- | --- | --- |
| `/instalar [todo\|video\|audio\|clon\|imagen\|web]` | Instala lo necesario en la sesión y carga tus cookies | ✓ |
| `ver-medios` | Ve vídeos de TikTok, Instagram, YouTube o archivos: una hoja con fotogramas clave + transcripción, con pocos tokens | TikTok ✓ · YouTube: datos y subtítulos ✓, el vídeo lo bloquea desde servidores (prueba con cookies) |
| `audio` | Transcribe (Whisper), voz en español (Piper), clona tu voz (Chatterbox) y analiza música (tempo, tonalidad, secciones, pulsos) | Whisper ✓ · Piper ✓ · música ✓ |
| `crear-imagenes` | Imágenes realistas con Z-Image-Turbo o Qwen-Image (modelos chinos abiertos) gratis, y diseños con texto exacto desde HTML | HTML ✓ · GPU de Hugging Face: necesita `HF_TOKEN` · CPU local ✓ (~20 min por imagen) |
| `crear-videos` | Vídeos narrados (voz + imágenes/clips + subtítulos + música), recetas de edición con ffmpeg, animados con código | Narrado vertical ✓ |
| `web-auto` | Navegador real con tus cookies: extraer datos, tareas con tu cuenta, probar tus apps (móvil/escritorio), publicar vía Buffer o Metricool | ✓ |

Todo el trabajo pesado está en scripts: Claude los ejecuta con argumentos en vez de escribir código cada vez, y devuelven resúmenes cortos. Así se gastan pocos tokens.

**Secretos del entorno** (menú del entorno en el título de la sesión → Edit; se aplican en la sesión siguiente, nunca los pegues en el chat):

- `NAVAJA_COOKIES`: tus cookies para Instagram, TikTok, YouTube y webs con tu cuenta. Exporta con la extensión Cookie-Editor (formato JSON) desde un navegador con extensiones; también vale un cookies.txt o cualquiera de los dos en base64. Usa una cuenta secundaria si te preocupa un bloqueo.
- `HF_TOKEN`: token de lectura de una cuenta gratuita de Hugging Face. Da cuota diaria de GPU gratis para generar imágenes en segundos.

Límites de esta nube: el proxy no deja pasar WebSockets (por eso no hay voces de Microsoft Edge), YouTube bloquea la descarga de vídeo desde servidores, y no hay GPU: generar imágenes en local lleva unos 20 minutos por imagen (576×768), así que lo normal es la GPU gratis de Hugging Face (`HF_TOKEN`).

## `router-ia`: skill, subagentes y cambio de modelo por turno

- `skills/router-ia`: qué modelo y esfuerzo usar según la tarea, cómo repartir sin desperdiciar uso, el bloque de transparencia «DECISIÓN DE RUTA» y la lista de comprobación antes de entregar. En el chat recomienda el modelo y explica cómo cambiarlo (nombre del modelo junto al botón de enviar → modelo y Effort).
- `/rapido`, `/estandar`, `/profundo` (solo Claude Code): skills con `model:` y `effort:` en la cabecera; ese turno lo hace Haiku·bajo, Sonnet·medio u Opus·alto y luego vuelve el modelo de la sesión. Es el mecanismo nativo de Claude Code.
- Subagentes: `haiku-rapido` y `auditor-repo` (Haiku), `sonnet-constructor`, `probador` e `investigador` (Sonnet), `opus-arquitecto` (Opus), cada uno con las herramientas justas.

## `router-ia-auto`: el mod de Claude Code

En cada mensaje tuyo lo clasifica (reglas sin coste; opcionalmente pregunta a Haiku en los casos dudosos) y manda la petición al modelo y esfuerzo que tocan. **El selector de la app sigue mostrando el modelo de la sesión**: el mod cambia cada petición sin tocarlo. Para ver qué modelo trabajó de verdad, usa `/ruta-estado`.

| Ejemplo | Ruta |
| --- | --- |
| «¿qué es un archivo .env?» | Haiku · bajo |
| «renombra `userId` a `accountId`» | Haiku · bajo |
| «implementa un endpoint con validación y tests» | Sonnet · medio |
| «optimiza el rendimiento de esta consulta» | Sonnet · alto |
| «diseña la arquitectura de pagos y revisa la seguridad» | Opus · alto |
| «piensa a fondo: hay una condición de carrera intermitente» | Opus · muy alto |
| «sí, hazlo» | la misma ruta que el mensaje anterior |

```
/ruta                 ruta actual y por qué (auto, ahorro, calidad, off, o fijar: /ruta opus alto)
/ruta-estado          qué modelo atendió de verdad cada petición (dato del servidor)
/ruta-auditar         qué partes del ruteo funcionan en esta sesión
/ruta-probar [vivo]   prueba el clasificador con 8 clases de tarea; "vivo" comprueba cada modelo
```

En un mensaje puedes forzar solo ese turno con `+opus`, `+sonnet`, `+haiku` y `+bajo`, `+medio`, `+alto`, `+muy-alto`, `+max`. Respeta las skills que fijan modelo, los fallbacks y `opusplan`. Modo, umbral de caché y clasificador se cambian en `/config`.

Todo el detalle (auditoría de lo anterior, mecanismos reales, cómo decide, caché, qué hacer si falla): [docs/MODEL-ROUTING.md](docs/MODEL-ROUTING.md).

## Instalar

**Claude Code (terminal):**

```
/plugin install router-ia --marketplace RaplastX/Claude-Skills-Mods-all
/plugin install router-ia-auto --marketplace RaplastX/Claude-Skills-Mods-all
/plugin install navaja-suiza --marketplace RaplastX/Claude-Skills-Mods-all
```

Responde `y` para añadir el marketplace y elige el ámbito de usuario. Si el repositorio es privado, el equipo necesita acceso a él en GitHub y credenciales de git configuradas.

**Desde el móvil (chat, Cowork y Claude Code en la nube):** sube los paquetes en **Personalizar → Plugins → Subir un plugin**. `bash scripts/empaquetar.sh` los genera en `dist/`:

| Paquete | Para qué |
| --- | --- |
| `router-ia.plugin` | La skill del router (chat, Cowork, Code) + subagentes y `/rapido` `/estandar` `/profundo` (Code) |
| `router-ia-auto.plugin` | El mod (Claude Code, también en la nube) |
| `navaja-suiza.plugin` | Medios, voz, imágenes y webs (sesiones en la nube) |
| `router-ia-chat.zip` | Solo la skill del router, sin nada de Claude Code: úsalo en vez de `router-ia.plugin` si solo usas el chat |

Los plugins guardados en tu cuenta se cargan al **abrir** una sesión nueva de Claude Code: tras guardar o actualizar uno, empieza una sesión nueva.

Si ya tienes `model-router-pro-mobile`, desactívalo: hace lo mismo y tener dos copias de los subagentes gasta contexto en cada sesión.

## Límites

- En el chat ningún plugin puede cambiar el modelo; la skill solo regula cómo trabaja Claude y te recomienda cambiarlo cuando importa.
- El mod usa la API de mods de Claude Code (acceso anticipado, probada con la 2.1.314): puede cambiar entre versiones.
- Cambiar de modelo o delegar en subagentes también gasta del límite de Claude Pro; el router ahorra eligiendo bien, no saltándose límites.
- Solo usa los modelos que tenga tu plan. Si un modelo no admite esfuerzo, Claude Code lo ignora.
- La clasificación por reglas acierta en lo habitual, no siempre: para eso están `+opus`, `/ruta` y `/ruta off`.

## Desarrollo

```
claude plugin validate mods/router-ia-auto
claude plugin test mods/router-ia-auto
claude plugin validate plugins/router-ia
claude plugin validate plugins/navaja-suiza
bash scripts/empaquetar.sh
```

Cambios: [CHANGELOG.md](CHANGELOG.md).
