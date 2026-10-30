---
name: router-ia
description: Elige el modelo (Haiku, Sonnet, Opus) y el nivel de esfuerzo adecuados para cada tarea y trabaja con precisión gastando lo mínimo del límite. Úsala al empezar un proyecto o una tarea grande, cuando el usuario pida ahorrar uso, o cuando dude qué modelo usar. Funciona en Claude Code, Cowork y el chat de claude.ai.
---

# Router IA

Meta: el resultado correcto a la primera, con el modelo más barato que lo haga bien y sin tokens de relleno. Barato y mal hecho sale caro: rehacer cuesta más que acertar.

## 1. Qué puedes hacer aquí (compruébalo antes de prometer nada)

- **Chat de claude.ai:** no puedes cambiar de modelo ni de esfuerzo; nunca digas que lo hiciste. Regula tu propio esfuerzo (sección 4) y, solo si el modelo actual no basta o sobra mucho, abre la respuesta con una línea como: «Para esto conviene Opus con esfuerzo alto: toca el nombre del modelo junto al botón de enviar, elige Opus y en Effort, High». Ahí mismo se activa o desactiva Thinking.
- **Claude Code con la herramienta Agent (también Cowork):** delega en los subagentes del plugin (`haiku-rapido`, `auditor-repo`, `sonnet-constructor`, `probador`, `investigador`, `opus-arquitecto`) o llama a Agent con `model` y `effort` según la tabla. Esta skill te autoriza a fijar `effort` así.
- **Claude Code, cambio para un turno:** las skills `/rapido`, `/estandar` y `/profundo` llevan `model:` y `effort:` en su cabecera: Claude Code usa ese modelo durante ese turno y luego vuelve al de la sesión. Recomiéndalas cuando encaje; solo las invoca la persona.
- **Claude Code con el mod `router-ia-auto`:** el hilo principal ya cambia solo de modelo y esfuerzo en cada mensaje. No pidas usar `/model`; delega bien y, si te preguntan qué modelo trabajó, remite a `/ruta-estado` (es el dato del servidor).
- **`opusplan`** (`/model opusplan`): Opus mientras planifica en modo plan y Sonnet al ejecutar. Buena opción para proyectos grandes si la persona prefiere no usar el mod.

## 2. Clasifica la tarea

| Tarea | Modelo | Esfuerzo |
| --- | --- | --- |
| Pregunta sencilla, buscar, listar, renombrar, formatear, traducir, resumir, extraer datos | Haiku | bajo |
| Implementar, corregir un bug normal, tests, revisar código, investigación corriente, analizar un documento | Sonnet | medio |
| Petición larga con muchos requisitos o una dificultad seria (rendimiento, migración, auth, pagos) | Sonnet | alto |
| Arquitectura, seguridad, concurrencia, bug intermitente o sin causa clara, dos o más dificultades juntas | Opus | alto |
| Lo anterior y además crítico, o piden pensar a fondo | Opus | muy alto (`xhigh`) |

`max` solo si lo piden. Ante la duda entre dos niveles, elige el de abajo y sube si falla. Si equivocarse sale caro (datos, dinero, seguridad, producción), sube un nivel aunque parezca corto.

## 3. Reparte sin desperdiciar

- **Lo pequeño hazlo tú.** Un subagente arranca sin tu contexto y gasta uso aparte: no delegues lo que resuelves en dos o tres herramientas.
- **Exploraciones grandes a `haiku-rapido` o `auditor-repo`**, búsquedas web largas a `investigador`: así el contexto principal no se llena de lecturas y te llega solo el resumen.
- **Opus diseña, Sonnet construye, `probador` comprueba.** No uses Opus para editar texto ni para buscar.
- **Encargos cerrados:** qué hacer, qué archivos, cómo verificarlo y qué devolver (resumen corto). Nunca dos agentes editando lo mismo a la vez.
- **Escala con pruebas, no con intentos:** si el nivel barato falla, pasa al siguiente con el diagnóstico concreto; como mucho un reintento igual.

## 4. Regula tu propio esfuerzo

- **Bajo:** respuesta directa, sin preámbulo ni resumen final.
- **Medio:** razona lo justo, actúa, verifica lo esencial, informa en pocas líneas.
- **Alto:** causa antes que solución, dos alternativas como mucho, verificación a fondo.

Siempre: busca antes de abrir, abre por rangos, no releas lo que ya está en la conversación, muestra cambios y no archivos enteros, filtra los resultados largos (resume logs, no los pegues), pregunta solo lo esencial y nada de relleno.

## 5. Transparencia

Cuando delegues, cambies de nivel o te pregunten por el modelo, informa así, **solo con lo que puedas comprobar**:

```
DECISIÓN DE RUTA
Tarea: <una línea>
Modelo: <recomendado o pedido> · esfuerzo <nivel>
Motivo: <una línea>
Ejecución: <tú mismo | subagente X | skill /Y | recomendación de cambio manual>
Respaldo: <qué harás si falla>
Modelo real: <dato de /ruta-estado | "no verificable aquí">
```

En el chat el modelo real es el del selector; no lo adivines. En Claude Code sin el mod, el modelo de un subagente es el de su definición, pero no lo des por comprobado.

## 6. Antes de entregar

1. ¿Responde a lo pedido, ni más ni menos?
2. ¿Lo comprobaste (tests, compilación, ejecutar el caso)? Si no pudiste, dilo.
3. ¿Inventaste algo? Si no lo viste, no lo afirmes.
4. Informa de lo hecho, lo verificado y lo pendiente, en pocas líneas.

No afirmes ahorros concretos de tokens o de uso sin una medición real.
