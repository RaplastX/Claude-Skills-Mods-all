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

## `router-ia`: skill y subagentes

- `skills/router-ia`: tabla de qué modelo y esfuerzo usar según la tarea, reglas para no malgastar tokens (leer solo lo necesario, no delegar trivialidades, escalar con diagnóstico) y una lista de comprobación antes de entregar.
- `agents/haiku-rapido` (Haiku, esfuerzo bajo): explorar, buscar, cambios mecánicos.
- `agents/sonnet-constructor` (Sonnet, medio): implementar, corregir, tests.
- `agents/opus-arquitecto` (Opus, alto): arquitectura, seguridad, bugs difíciles.

Úsala escribiendo `/router-ia` al empezar una tarea grande, o deja que Claude la cargue cuando hables de ahorrar uso.

## `router-ia-auto`: el mod de Claude Code

En cada mensaje tuyo lo clasifica con reglas (no gasta ni un token) y manda la petición al modelo y esfuerzo que tocan:

| Ejemplo | Ruta |
| --- | --- |
| «renombra `userId` a `accountId`» | Haiku · bajo |
| «implementa un buscador con filtros» | Sonnet · medio |
| «optimiza el rendimiento de esta consulta» | Sonnet · alto |
| «diseña la arquitectura de pagos y revisa la seguridad» | Opus · alto |
| «piensa a fondo: hay una condición de carrera intermitente» | Opus · muy alto |
| «sí, hazlo» | la misma ruta que el mensaje anterior |

Cuida la caché: cambiar de modelo obliga a reenviar todo el contexto a precio completo. Por eso, con mucho contexto (30.000 tokens por defecto), solo baja de modelo si la tarea sigue siendo ligera dos mensajes seguidos; mientras tanto se queda en el modelo actual con menos esfuerzo. Subir de modelo cuando hace falta es inmediato. Los subagentes conservan su propio modelo.

La ruta actual se ve en la línea de estado. Comandos:

```
/ruta                 muestra la ruta actual y por qué
/ruta auto            elige solo (por defecto)
/ruta ahorro          evita Opus y baja el esfuerzo cuando se puede
/ruta calidad         nunca Haiku y sube el esfuerzo
/ruta opus alto       fija modelo y esfuerzo hasta /ruta auto
/ruta off             no toca nada (eliges tú con /model)
```

En un mensaje puedes forzar solo ese turno con `+opus`, `+sonnet`, `+haiku` y `+bajo`, `+medio`, `+alto`, `+muy-alto`, `+max` (la etiqueta se quita antes de enviarlo). El modo por defecto y el umbral de caché se cambian en `/config`.

## Instalar

**Claude Code (terminal):**

```
/plugin install router-ia --marketplace RaplastX/Claude-Skills-Mods-all
/plugin install router-ia-auto --marketplace RaplastX/Claude-Skills-Mods-all
```

Responde `y` para añadir el marketplace y elige el ámbito de usuario. Si el repositorio es privado, el equipo necesita acceso a él en GitHub y credenciales de git configuradas.

**Chat de claude.ai y Cowork:** comprime la carpeta del plugin con `.claude-plugin/` en la raíz del zip (`cd plugins/router-ia && zip -r ../../router-ia.zip .`) y súbelo en **Personalizar → Plugins → Subir un plugin**. Los plugins guardados en tu cuenta también se sincronizan con Claude Code.

Si ya tienes `model-router-pro-mobile`, desactívalo: hace lo mismo y tener dos copias de los subagentes gasta contexto en cada sesión.

## Límites

- En el chat ningún plugin puede cambiar el modelo; la skill solo regula cómo trabaja Claude y te recomienda cambiarlo cuando importa.
- El mod usa la API de mods de Claude Code (acceso anticipado, probada con la 2.1.314): puede cambiar entre versiones.
- Solo usa los modelos que tenga tu plan. Si un modelo no admite esfuerzo, Claude Code lo ignora.
- La clasificación por reglas acierta en lo habitual, no siempre: para eso están `+opus`, `/ruta` y `/ruta off`.

## Desarrollo

```
claude plugin validate mods/router-ia-auto
claude plugin test mods/router-ia-auto
claude plugin validate plugins/router-ia
```
