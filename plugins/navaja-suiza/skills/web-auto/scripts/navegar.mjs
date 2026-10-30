// Abre una web con Chromium (con tus cookies si las hay), hace pasos y devuelve
// lo justo: título, texto, errores y capturas.
//
// Uso: node navegar.mjs URL [--movil] [--captura f.png] [--pagina-entera]
//                           [--texto 4000] [--pasos pasos.json] [--sin-cookies]
//                           [--guardar-sesion]
// pasos.json: [{"accion":"clic","selector":"text=Entrar"},
//              {"accion":"escribir","selector":"#q","valor":"hola"},
//              {"accion":"tecla","valor":"Enter"}, {"accion":"esperar","ms":2000},
//              {"accion":"esperar","selector":".resultado"}, {"accion":"ir","valor":"https://..."},
//              {"accion":"scroll"}, {"accion":"captura","valor":"paso.png"},
//              {"accion":"texto","selector":"main"}, {"accion":"evaluar","valor":"document.title"}]
import { existsSync, readFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const { chromium, devices } = require('playwright')

const args = process.argv.slice(2)
const url = args.find(a => /^https?:\/\//.test(a) || a.startsWith('file:'))
const flag = name => args.includes(name)
const valor = (name, porDefecto) => {
  const i = args.indexOf(name)
  return i >= 0 && args[i + 1] !== undefined ? args[i + 1] : porDefecto
}

if (!url) {
  console.error('Uso: node navegar.mjs URL [--movil] [--captura f.png] [--pasos pasos.json]')
  process.exit(2)
}

const sesion = join(homedir(), '.config', 'navaja', 'storage-state.json')
const usarCookies = !flag('--sin-cookies') && existsSync(sesion)
const limite = Number(valor('--texto', 4000))
const errores = []

const navegador = await chromium.launch()
const contexto = await navegador.newContext({
  ...(flag('--movil') ? devices['iPhone 13'] : { viewport: { width: 1366, height: 900 } }),
  locale: 'es-ES',
  ...(usarCookies ? { storageState: sesion } : {}),
})
const pagina = await contexto.newPage()
pagina.on('console', m => m.type() === 'error' && errores.push(`consola: ${m.text().slice(0, 200)}`))
pagina.on('pageerror', e => errores.push(`js: ${e.message.slice(0, 200)}`))
pagina.on('requestfailed', r =>
  errores.push(`red: ${r.failure()?.errorText} ${r.url().slice(0, 120)}`),
)
pagina.on('response', r => r.status() >= 400 && errores.push(`http ${r.status()}: ${r.url().slice(0, 120)}`))

const textoDe = async selector => {
  const t = await pagina.locator(selector ?? 'body').first().innerText({ timeout: 10000 })
  return t.replace(/\n{3,}/g, '\n\n').trim()
}

const salida = []
try {
  await pagina.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 })
  await pagina.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {})

  const pasos = valor('--pasos') ? JSON.parse(readFileSync(valor('--pasos'), 'utf8')) : []
  for (const [i, p] of pasos.entries()) {
    const donde = p.selector ? pagina.locator(p.selector).first() : null
    switch (p.accion) {
      case 'clic': await donde.click({ timeout: 15000 }); break
      case 'escribir': await donde.fill(String(p.valor ?? ''), { timeout: 15000 }); break
      case 'tecla': await (donde ?? pagina.keyboard).press(p.valor); break
      case 'esperar':
        if (p.selector) await donde.waitFor({ timeout: p.ms ?? 20000 })
        else await pagina.waitForTimeout(p.ms ?? 1000)
        break
      case 'ir': await pagina.goto(p.valor, { waitUntil: 'domcontentloaded' }); break
      case 'scroll': await pagina.mouse.wheel(0, p.valor ?? 2000); await pagina.waitForTimeout(800); break
      case 'captura':
        await pagina.screenshot({ path: p.valor, fullPage: Boolean(p.entera) })
        salida.push(`captura paso ${i + 1}: ${p.valor}`)
        break
      case 'texto': salida.push(`texto paso ${i + 1}:\n${(await textoDe(p.selector)).slice(0, limite)}`); break
      case 'evaluar': salida.push(`evaluar paso ${i + 1}: ${JSON.stringify(await pagina.evaluate(p.valor))}`); break
      default: throw new Error(`acción desconocida en el paso ${i + 1}: ${p.accion}`)
    }
    await pagina.waitForLoadState('domcontentloaded').catch(() => {})
  }

  console.log(`url: ${pagina.url()}`)
  console.log(`título: ${await pagina.title()}`)
  console.log(`cookies: ${usarCookies ? 'sí' : 'no'} · vista: ${flag('--movil') ? 'móvil' : 'escritorio'}`)
  if (valor('--captura')) {
    await pagina.screenshot({ path: valor('--captura'), fullPage: flag('--pagina-entera') })
    console.log(`captura: ${valor('--captura')}`)
  }
  for (const linea of salida) console.log(linea)
  if (limite > 0 && !salida.some(l => l.startsWith('texto'))) {
    const texto = await textoDe()
    console.log(`\ntexto (${Math.min(texto.length, limite)} de ${texto.length} caracteres):\n${texto.slice(0, limite)}`)
  }
  if (flag('--guardar-sesion')) {
    await contexto.storageState({ path: sesion })
    console.log(`sesión guardada en ${sesion}`)
  }
} catch (error) {
  console.log(`error: ${error.message.split('\n')[0]}`)
  const fallo = join(homedir(), 'navaja-salida', 'fallo.png')
  await pagina.screenshot({ path: fallo }).then(() => console.log(`captura del fallo: ${fallo}`), () => {})
  process.exitCode = 1
} finally {
  const unicos = [...new Set(errores)]
  if (unicos.length) console.log(`\nerrores de la página (${unicos.length}):\n${unicos.slice(0, 15).join('\n')}`)
  await navegador.close()
}
