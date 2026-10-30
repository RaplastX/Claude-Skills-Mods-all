import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import type { Mode, Route, Served, Tier } from '../types'
import {
  CASES,
  CLASSIFIER_SYSTEM,
  HELP,
  decide,
  isAmbiguous,
  label,
  parseCommand,
  parseHint,
  stripTags,
} from './classify'

const MODES = ['auto', 'ahorro', 'calidad', 'off'] as const
const TYPED: ReadonlySet<string> = new Set([
  'composer',
  'bridge',
  'sdk',
  'unclassified',
])

// Cambia la etiqueta si cambia la forma de Route: descarta lo guardado antes.
const modeAtom = atom({ plugin: 'router-ia-auto', key: 'mode' } as const, null)
const routeAtom = atom(
  { plugin: 'router-ia-auto', key: 'route' } as const,
  null,
  {
    shape: 'route-1',
  },
)
const pinnedAtom = atom(
  { plugin: 'router-ia-auto', key: 'pinned' } as const,
  null,
  {
    shape: 'route-1',
  },
)
const streakAtom = atom(
  { plugin: 'router-ia-auto', key: 'downStreak' } as const,
  0,
)
const servedAtom = atom(
  { plugin: 'router-ia-auto', key: 'served' } as const,
  [],
  { shape: 'served-1' },
)

const tierOf = (model: string): Tier | undefined =>
  (['opus', 'sonnet', 'haiku'] as const).find(tier =>
    model.toLowerCase().includes(tier),
  )

const hhmm = (at: number): string => new Date(at).toISOString().slice(11, 16)

async function modeOf($: EngineInterface, configured: Mode): Promise<Mode> {
  return (await read($, modeAtom)) ?? configured
}

// Lo que se aplica a la próxima petición del bucle principal; null: nada.
async function active(
  $: EngineInterface,
  configured: Mode,
): Promise<Route | null> {
  const mode = await modeOf($, configured)

  if (mode === 'off') {
    return null
  }

  return mode === 'fijo' ? read($, pinnedAtom) : read($, routeAtom)
}

async function showStatus($: EngineInterface, configured: Mode) {
  const mode = await modeOf($, configured)
  const route = await active($, configured)

  $.ui.status(
    mode === 'off'
      ? undefined
      : route
        ? `ruta ${mode}: ${label(route)}`
        : `ruta ${mode}`,
  )
}

// Haiku clasifica un caso que las reglas no ven claro; si falla, mandan las reglas.
async function askHaiku(
  $: EngineInterface,
  text: string,
): Promise<Route | undefined> {
  const answer = await $.model.complete({
    model: 'haiku',
    system: CLASSIFIER_SYSTEM,
    prompt: text.slice(0, 6000),
    maxTokens: 80,
    effort: 'low',
    timeoutMs: 8000,
  })

  return answer.isAnswered ? parseHint(answer.text) : undefined
}

async function logServed($: EngineInterface, entry: Omit<Served, 'at'>) {
  const at = await $.clock.now()

  await update($, servedAtom, list => [...list, { ...entry, at }].slice(-50))
}

function servedLines(list: readonly Served[]): string[] {
  if (list.length === 0) {
    return ['Aún no hay peticiones registradas en esta sesión.']
  }

  const lines = list.slice(-12).map(s => {
    const ok = tierOf(s.asked) === tierOf(s.served)
    const who =
      s.agent === 'principal' ? 'principal' : `subagente ${s.agent.slice(0, 8)}`
    const pedido = `${s.asked}${s.effort ? `/${s.effort}` : ''}`

    return `  ${hhmm(s.at)} ${who}: ${s.routed ? 'enrutado ' : ''}${pedido} → ${s.served}${ok ? '' : '  ⚠ distinto'}`
  })
  const count = (agent: (s: Served) => boolean) => {
    const tiers = new Map<string, number>()

    for (const s of list.filter(agent)) {
      const tier = tierOf(s.served) ?? s.served
      tiers.set(tier, (tiers.get(tier) ?? 0) + 1)
    }

    return [...tiers].map(([tier, n]) => `${tier} ${n}`).join(', ') || 'ninguna'
  }

  return [
    'Últimas peticiones (pedido → atendido, según el servidor):',
    ...lines,
    `Total en esta sesión: principal ${count(s => s.agent === 'principal')} · subagentes ${count(s => s.agent !== 'principal')}`,
  ]
}

export const register: Register = (on, options) => {
  const configured: Mode = MODES.find(m => m === options.modo) ?? 'auto'
  const threshold =
    typeof options.umbral_cache === 'number' ? options.umbral_cache : 30000
  const classifier = options.clasificador === 'mixto' ? 'mixto' : 'reglas'

  on('session.start', async ($, e, next) => {
    await $.command.register({
      name: 'ruta',
      description: 'Router IA: modelo y esfuerzo automáticos (/ruta ayuda)',
    })
    await $.command.register({
      name: 'ruta-estado',
      description: 'Router IA: qué modelo atendió de verdad cada petición',
    })
    await $.command.register({
      name: 'ruta-auditar',
      description: 'Router IA: qué partes del ruteo funcionan en esta sesión',
    })
    await $.command.register({
      name: 'ruta-probar',
      description:
        'Router IA: prueba el clasificador ("vivo" pregunta a cada modelo)',
    })
    await showStatus($, configured)

    return next(e)
  })

  on('prompt.submit', async ($, e, next) => {
    // Solo reclasifica lo que escribe la persona, entre turnos: comandos,
    // avisos de tareas o de otras sesiones siguen la ruta que había, y cambiar
    // de modelo a mitad de turno tiraría la caché sin motivo.
    if (
      !TYPED.has(e.origin.kind) ||
      e.command !== undefined ||
      e.isMeta ||
      e.turnId !== undefined
    ) {
      return next(e)
    }

    const mode = await modeOf($, configured)

    if (mode === 'off' || mode === 'fijo') {
      return next(e)
    }

    const stored = await read($, routeAtom)
    const sessionTier = tierOf(await $.session.model())
    const prev: Route | null =
      stored ??
      (sessionTier
        ? { tier: sessionTier, effort: 'medium', reason: 'modelo de la sesión' }
        : null)
    const { context } = await $.session.usage()
    const input = {
      text: e.text,
      mode,
      prev,
      contextTokens: context.tokens ?? 0,
      cacheThreshold: threshold,
      downStreak: await read($, streakAtom),
    }
    let decision = decide(input)
    const text = stripTags(e.text)

    if (
      classifier === 'mixto' &&
      text === e.text &&
      isAmbiguous(e.text, decision.route)
    ) {
      const hint = await askHaiku($, e.text)

      if (hint) {
        decision = decide({ ...input, hint })
      }
    }

    await update($, routeAtom, () => decision.route)
    await update($, streakAtom, () => decision.downStreak)
    $.ui.status(
      `ruta ${mode}: ${label(decision.route)} · ${decision.route.reason}`,
    )

    return next(text === e.text ? e : { ...e, text })
  })

  // Enruta el bucle principal y apunta qué modelo respondió cada petición,
  // también la de los subagentes (que conservan el modelo de su definición).
  on('turn.step', async function* ($, e, next) {
    let sent = e

    if (e.agentId === undefined) {
      const route = await active($, configured)
      const sessionModel = await $.session.model()
      const sessionTier = tierOf(sessionModel)
      // Una skill con model:, un fallback o opusplan ya eligieron: no se toca.
      const chosenElsewhere =
        /opusplan/i.test(sessionModel) ||
        (sessionTier !== undefined && tierOf(e.model) !== sessionTier)

      if (route !== null && !chosenElsewhere) {
        sent = { ...e, model: route.tier, effort: route.effort }
      }
    }

    const result = yield* next(sent)

    await logServed($, {
      agent: e.agentId ?? 'principal',
      asked: sent.model,
      served: result.usage?.model ?? 'sin dato del servidor',
      effort: sent.effort === undefined ? null : String(sent.effort),
      routed: sent !== e,
    })

    if (e.agentId === undefined && result.usage?.model) {
      const tier = tierOf(result.usage.model) ?? result.usage.model
      const asked = tierOf(sent.model)

      $.ui.status(
        `ruta: atendió ${tier}${sent.effort === undefined ? '' : ` · ${sent.effort}`}${asked && asked !== tier ? ` (pedido ${asked})` : ''}`,
      )
    }

    return result
  })

  on('command.run', { command: 'ruta' }, async ($, e) => {
    const command = parseCommand(e.args)

    if (command.kind === 'help') {
      return { text: HELP }
    }

    if (command.kind === 'error') {
      return { text: command.text }
    }

    if (command.kind === 'mode') {
      await update($, modeAtom, () => command.mode)
      await update($, streakAtom, () => 0)
      await showStatus($, configured)

      return {
        text:
          command.mode === 'off'
            ? 'Router apagado: el modelo y el esfuerzo son los que elijas con /model y /effort.'
            : `Modo ${command.mode}: el modelo y el esfuerzo se eligen en cada mensaje.`,
      }
    }

    if (command.kind === 'pin') {
      await update($, pinnedAtom, () => command.route)
      await update($, modeAtom, () => 'fijo')
      await showStatus($, configured)

      return {
        text: `Fijado ${label(command.route)} hasta /ruta auto.`,
      }
    }

    const mode = await modeOf($, configured)
    const route = await active($, configured)
    const lines = [
      `Modo: ${mode} · clasificador: ${classifier}`,
      route
        ? `Ruta: ${label(route)} (${route.reason})`
        : mode === 'off'
          ? 'Ruta: ninguna, manda /model'
          : 'Ruta: aún ninguna, se decide con tu próximo mensaje',
      '',
      HELP,
    ]

    return { text: lines.join('\n') }
  })

  on('command.run', { command: 'ruta-estado' }, async $ => {
    const mode = await modeOf($, configured)
    const route = await active($, configured)
    const { context } = await $.session.usage()
    const lines = [
      `Modo: ${mode} · clasificador: ${classifier}`,
      `Ruta actual: ${route ? `${label(route)} (${route.reason})` : 'ninguna'}`,
      `Modelo de la sesión (el que muestra el selector): ${await $.session.model()}`,
      `Contexto: ${Math.round((context.tokens ?? 0) / 1000)}k tokens${context.percent === undefined ? '' : ` (${context.percent}%)`}`,
      '',
      ...servedLines(await read($, servedAtom)),
    ]

    return { text: lines.join('\n') }
  })

  on('command.run', { command: 'ruta-auditar' }, async $ => {
    const sessionModel = await $.session.model()
    const envEffort = await $.env.get('CLAUDE_CODE_EFFORT_LEVEL')
    const ultracode = await $.settings.read({ key: 'ultracode' })
    const fallback = await $.settings.read({ key: 'fallbackModel' })
    const served = await read($, servedAtom)
    const routed = served.filter(s => s.routed)
    const matched = routed.filter(s => tierOf(s.asked) === tierOf(s.served))
    const agents = served.filter(s => s.agent !== 'principal')
    const lines = [
      '✓ Mod router-ia-auto cargado: puede cambiar modelo y esfuerzo de cada petición del hilo principal.',
      `• Modo: ${await modeOf($, configured)} · clasificador: ${classifier}`,
      /opusplan/i.test(sessionModel)
        ? '• La sesión usa opusplan: el router se aparta (Opus planifica, Sonnet ejecuta).'
        : `• Modelo de la sesión: ${sessionModel} (el selector siempre muestra este; el router cambia cada petición sin tocarlo).`,
      routed.length === 0
        ? '• Aún no hay peticiones enrutadas: escribe un mensaje y vuelve a auditar.'
        : `${matched.length === routed.length ? '✓' : '⚠'} ${matched.length} de ${routed.length} peticiones enrutadas las atendió el modelo pedido (dato del servidor).`,
      agents.length === 0
        ? '• Sin subagentes en esta sesión todavía.'
        : `✓ Subagentes registrados: ${[...new Set(agents.map(s => tierOf(s.served) ?? s.served))].join(', ')} (modelo real según el servidor).`,
      envEffort
        ? `⚠ CLAUDE_CODE_EFFORT_LEVEL=${envEffort}: fija el esfuerzo por encima de skills y subagentes.`
        : '✓ Sin CLAUDE_CODE_EFFORT_LEVEL: skills y subagentes pueden fijar su esfuerzo.',
      ultracode === true
        ? '⚠ Ultracode activo: orquesta flujos largos y gasta mucho uso; apágalo en /effort para tareas normales.'
        : '✓ Ultracode apagado.',
      `• Cadena de respaldo (fallbackModel): ${Array.isArray(fallback) && fallback.length > 0 ? fallback.join(' → ') : 'ninguna'}`,
      '• Skills con model:/effort: (/rapido, /estandar, /profundo del plugin router-ia) cambian el modelo solo durante su turno; el router las respeta.',
      '• En el chat de claude.ai el mod no existe: allí solo la skill router-ia recomienda el modelo.',
    ]

    return { text: lines.join('\n') }
  })

  on('command.run', { command: 'ruta-probar' }, async ($, e) => {
    const lines = ['Clasificador (sin contexto previo, modo auto):']

    for (const c of CASES) {
      const { route } = decide({
        text: c.text,
        mode: 'auto',
        prev: null,
        contextTokens: 0,
        cacheThreshold: threshold,
        downStreak: 0,
      })

      lines.push(
        `  ${route.tier === c.tier ? '✓' : '✗'} ${c.name}: ${label(route)} (esperado ${c.tier}) · ${route.reason}`,
      )
    }

    if (!/\bvivo\b/i.test(e.args)) {
      lines.push(
        '',
        'Añade "vivo" para comprobar que cada modelo responde (gasta un poco de uso).',
      )

      return { text: lines.join('\n') }
    }

    lines.push('', 'Disponibilidad (una respuesta mínima de cada modelo):')

    for (const tier of ['haiku', 'sonnet', 'opus'] as const) {
      const t0 = await $.clock.now()
      const answer = await $.model.complete({
        model: tier,
        prompt: 'Responde solo con la palabra OK.',
        maxTokens: 10,
        effort: 'low',
        timeoutMs: 30000,
      })
      const seconds = ((await $.clock.now()) - t0) / 1000

      lines.push(
        answer.isAnswered
          ? `  ✓ ${tier}: responde (${seconds.toFixed(1)} s)`
          : `  ✗ ${tier}: no disponible (${answer.reason})`,
      )
    }

    lines.push(
      '',
      'El modelo que atiende cada petición real se ve con /ruta-estado.',
    )

    return { text: lines.join('\n') }
  })
}
