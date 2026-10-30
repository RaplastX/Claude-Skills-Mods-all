"""Convierte las cookies del secreto NAVAJA_COOKIES en los dos formatos que se usan.

Acepta lo que exporta un navegador: texto Netscape (cookies.txt), el JSON de la
extensión Cookie-Editor, o cualquiera de los dos en base64. Escribe:
  ~/.config/navaja/cookies.txt         para yt-dlp
  ~/.config/navaja/storage-state.json  para Playwright
Nunca imprime los valores.
"""

import base64
import binascii
import json
import os
import sys
import time
from pathlib import Path

DIR = Path.home() / ".config" / "navaja"


def decode(raw: str) -> str:
    text = raw.strip()
    if text.startswith(("[", "{", "#")) or "\t" in text:
        return text
    try:
        return base64.b64decode(text, validate=True).decode("utf-8").strip()
    except (binascii.Error, UnicodeDecodeError):
        return text


def from_json(text: str) -> list[dict]:
    data = json.loads(text)
    items = data.get("cookies", []) if isinstance(data, dict) else data
    cookies = []
    for c in items:
        expires = c.get("expirationDate", c.get("expires", -1))
        cookies.append(
            {
                "name": c["name"],
                "value": c["value"],
                "domain": c["domain"],
                "path": c.get("path", "/"),
                "expires": int(expires) if expires and expires > 0 else -1,
                "httpOnly": bool(c.get("httpOnly", False)),
                "secure": bool(c.get("secure", False)),
                "sameSite": {"no_restriction": "None", "lax": "Lax", "strict": "Strict"}.get(
                    str(c.get("sameSite", "")).lower(), "Lax"
                ),
            }
        )
    return cookies


def from_netscape(text: str) -> list[dict]:
    cookies = []
    for line in text.splitlines():
        http_only = line.startswith("#HttpOnly_")
        if http_only:
            line = line[len("#HttpOnly_") :]
        if not line.strip() or line.startswith("#"):
            continue
        parts = line.split("\t")
        if len(parts) < 7:
            continue
        domain, _, path, secure, expires, name, value = parts[:7]
        cookies.append(
            {
                "name": name,
                "value": value,
                "domain": domain,
                "path": path,
                "expires": int(expires) if expires.isdigit() and int(expires) > 0 else -1,
                "httpOnly": http_only,
                "secure": secure.upper() == "TRUE",
                "sameSite": "Lax",
            }
        )
    return cookies


def to_netscape(cookies: list[dict]) -> str:
    lines = ["# Netscape HTTP Cookie File"]
    for c in cookies:
        domain = c["domain"]
        prefix = "#HttpOnly_" if c["httpOnly"] else ""
        sub = "TRUE" if domain.startswith(".") else "FALSE"
        expires = c["expires"] if c["expires"] > 0 else int(time.time()) + 30 * 86400
        lines.append(
            "\t".join(
                [prefix + domain, sub, c["path"], "TRUE" if c["secure"] else "FALSE",
                 str(expires), c["name"], c["value"]]
            )
        )
    return "\n".join(lines) + "\n"


def main() -> int:
    raw = os.environ.get("NAVAJA_COOKIES", "")
    if not raw.strip():
        print("NAVAJA_COOKIES vacío: sin cookies")
        return 0
    text = decode(raw)
    try:
        cookies = from_json(text) if text.lstrip().startswith(("[", "{")) else from_netscape(text)
    except (ValueError, KeyError) as error:
        print(f"NAVAJA_COOKIES no tiene un formato reconocible ({type(error).__name__})")
        return 1
    if not cookies:
        print("NAVAJA_COOKIES no contiene cookies")
        return 1
    DIR.mkdir(parents=True, exist_ok=True)
    for name, content in (
        ("cookies.txt", to_netscape(cookies)),
        ("storage-state.json", json.dumps({"cookies": cookies, "origins": []})),
    ):
        path = DIR / name
        path.write_text(content)
        path.chmod(0o600)
    domains = sorted({c["domain"].lstrip(".") for c in cookies})
    print(f"{len(cookies)} cookies de: {', '.join(domains)}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
