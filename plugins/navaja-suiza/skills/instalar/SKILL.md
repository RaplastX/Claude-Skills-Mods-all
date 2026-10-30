---
name: instalar
description: Instala en esta sesión en la nube las herramientas de la navaja suiza (vídeo, audio, voz, clonar voz, imágenes, web).
argument-hint: "[todo|video|audio|clon|imagen|web]"
disable-model-invocation: true
---

Ejecuta, sin explorar nada antes:

```bash
bash scripts/instalar.sh $ARGUMENTS
```

(La ruta es relativa al directorio base de esta skill.) Tarda unos minutos con `todo`: lánzalo en segundo plano y avisa cuando acabe. Al terminar, responde solo con la lista ✓/✗ que imprime. Si algo falla, lee las últimas líneas de `~/.cache/navaja/instalar.log` y explica la causa en una frase.

Si dice «sin cookies» y la persona quiere Instagram, TikTok privado o webs con su cuenta: debe guardar sus cookies (exportadas con la extensión Cookie-Editor, en JSON) en el secreto `NAVAJA_COOKIES` del entorno; para imágenes rápidas en GPU gratis, un token de lectura de Hugging Face en `HF_TOKEN`. Se añaden en el menú del entorno (título de la sesión → Edit) y se aplican en la siguiente sesión. Nunca pidas que los pegue en el chat.
