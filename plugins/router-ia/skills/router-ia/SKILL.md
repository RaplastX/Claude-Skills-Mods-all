---
name: router-ia
description: Elige el modelo (Haiku, Sonnet, Opus) y el nivel de esfuerzo adecuados para cada tarea y trabaja con precisión gastando los mínimos tokens. Úsala al empezar un proyecto o una tarea grande, cuando el usuario pida ahorrar uso o tokens, o cuando dude qué modelo usar. Funciona en Claude Code, Cowork y el chat de claude.ai.
---

# Router IA

Meta: el resultado correcto a la primera, con el modelo más barato que lo haga bien y sin tokens de relleno. Barato y mal hecho sale caro: rehacer cuesta más que acertar.

## 1. Qué puedes hacer aquí

Comprueba tus herramientas antes de prometer nada:

- **Tienes la herramienta Agent (Claude Code, Cowork):** puedes repartir trabajo. Usa los subagentes `haiku-rapido`, `sonnet-constructor` y `opus-arquitecto`; si no están, llama a Agent con `model` (`haiku`, `sonnet`, `opus`) y `effort` según la tabla de abajo. Esta skill te autoriza a fijar `effort` así.
- **No la tienes (chat de claude.ai):** no puedes cambiar de modelo ni de esfuerzo por tu cuenta. Regula tu propio esfuerzo (sección 4) y, solo si el modelo actual no basta o sobra mucho, dilo en una línea al principio: «Esto saldría mejor con Opus y pensamiento extendido» o «Para esto basta Haiku». Nunca digas que cambiaste de modelo.
- **En Claude Code con el mod `router-ia-auto`:** el hilo principal ya cambia solo de modelo y esfuerzo. No pidas al usuario que use `/model`; limítate a delegar bien.

## 2. Clasifica la tarea

| Tarea | Modelo | Esfuerzo |
| --- | --- | --- |
| Buscar archivos o símbolos, listar, renombrar, formatear, traducir, resumir, mensajes de commit | Haiku | bajo |
| Pregunta corta o explicación puntual | Sonnet | bajo |
| Implementar, corregir un bug normal, escribir tests, refactor acotado | Sonnet | medio |
| Petición larga con muchos requisitos, una sola dificultad seria (rendimiento, migración, auth, pagos) | Sonnet | alto |
| Arquitectura, seguridad, concurrencia, bug intermitente o sin causa clara, dos o más dificultades juntas | Opus | alto |
| Lo anterior y además crítico o el usuario pide pensar a fondo | Opus | muy alto (`xhigh`) |

`max` solo si el usuario lo pide. Ante la duda entre dos niveles, elige el de abajo y sube si falla.

Errar sale caro (datos, dinero, seguridad, producción): sube un nivel aunque la tarea parezca corta.

## 3. Reparte sin desperdiciar

- **Lo pequeño hazlo tú.** Cada subagente arranca en frío y vuelve a leer contexto: no delegues nada que resuelvas en dos o tres herramientas.
- **Delega exploraciones grandes a Haiku.** Leer veinte archivos en el hilo principal infla el contexto de todos los turnos siguientes; un subagente lee y devuelve solo rutas y conclusiones.
- **Opus diseña, Sonnet construye.** Pide a Opus un plan corto y ejecutable; la implementación y las pruebas van a Sonnet. No uses Opus para editar texto ni para buscar.
- **Encargos cerrados.** Cada encargo dice qué hacer, qué archivos tocar, cómo verificarlo y qué devolver (resumen corto, no volcados). Nunca dos agentes editando los mismos archivos a la vez.
- **Escala con pruebas, no con intentos.** Si el nivel barato falla, pasa al siguiente con el diagnóstico concreto (error, archivo, hipótesis). No repitas el mismo intento.
- **No cambies de modelo a mitad de una tarea larga** si puedes delegar: cambiar de modelo en el hilo principal tira la caché y se reenvía todo el contexto a precio completo.

## 4. Regula tu propio esfuerzo

- **Bajo:** respuesta directa, sin preámbulo ni resumen final. Una herramienta si hace falta.
- **Medio:** razona lo justo, actúa, verifica lo esencial, informa en pocas líneas.
- **Alto:** entiende la causa antes de tocar nada, considera dos alternativas como mucho, verifica a fondo (tests, compilación, casos límite).

Siempre, sea cual sea el nivel:

- Lee solo lo necesario: busca antes de abrir, abre por rangos, no releas lo que ya está en la conversación.
- Muestra cambios, no archivos enteros. No repitas el código que el usuario ya tiene.
- Pregunta solo si falta algo esencial que cambie el resultado; si no, elige lo razonable y dilo.
- Nada de relleno: sin disculpas, sin repetir la pregunta, sin listas de opciones que no vas a seguir.

## 5. Precisión antes de entregar

1. ¿Responde a lo que se pidió, ni más ni menos?
2. ¿Lo comprobaste? Ejecuta tests, compila o prueba el caso; si no pudiste, dilo claramente.
3. ¿Inventaste algo (APIs, archivos, resultados)? Si no lo viste, no lo afirmes.
4. Informa de lo hecho, lo verificado y lo pendiente, en ese orden y en pocas líneas.

No afirmes ahorros concretos de tokens o dinero sin una medición real.
