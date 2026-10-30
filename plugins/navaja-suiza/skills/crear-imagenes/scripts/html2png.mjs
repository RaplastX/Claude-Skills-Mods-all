// Convierte un diseño HTML en imagen exacta (miniaturas, banners, portadas con texto).
// Uso: node html2png.mjs diseno.html salida.png [--ancho 1080] [--alto 1920] [--escala 1]
import { resolve } from 'node:path'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const { chromium } = require('playwright')

const [entrada, salida, ...resto] = process.argv.slice(2)
const opcion = (nombre, porDefecto) => {
  const i = resto.indexOf(nombre)
  return i >= 0 ? Number(resto[i + 1]) : porDefecto
}

if (!entrada || !salida) {
  console.error('Uso: node html2png.mjs diseno.html salida.png [--ancho 1080] [--alto 1920]')
  process.exit(2)
}

const ancho = opcion('--ancho', 1080)
const alto = opcion('--alto', 1920)
const navegador = await chromium.launch()
const pagina = await navegador.newPage({
  viewport: { width: ancho, height: alto },
  deviceScaleFactor: opcion('--escala', 1),
})
await pagina.goto(`file://${resolve(entrada)}`, { waitUntil: 'networkidle' })
await pagina.evaluate(() => document.fonts.ready)
await pagina.screenshot({ path: salida, clip: { x: 0, y: 0, width: ancho, height: alto } })
await navegador.close()
console.log(`${salida} (${ancho}x${alto})`)
