import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import type { Mode, Route, Tier } from '../types'
import { HELP, decide, label, parseCommand, stripTags } from './classify'

const COMMAND = 'ruta'
const MODES = ['auto', 'ahorro', 'calidad', 'off'] as const
const TYPED: ReadonlySet<string> = new Set(['composer', 'bridge', 'sdk'])

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

const tierOf = (model: string): Tier | undefined =>
  (['opus', 'sonnet', 'haiku'] as const).find(tier =>
    model.toLowerCase().includes(tier),
  )

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

export const register: Register = (on, options) => {
  const configured: Mode = MODES.find(m => m === options.modo) ?? 'auto'
  const threshold =
    typeof options.umbral_cache === 'number' ? options.umbral_cache : 30000

  on('session.start', async ($, e, next) => {
    await $.command.register({
      name: COMMAND,
      description: 'Router IA: modelo y esfuerzo automáticos (/ruta ayuda)',
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
    const decision = decide({
      text: e.text,
      mode,
      prev,
      contextTokens: context.tokens ?? 0,
      cacheThreshold: threshold,
      downStreak: await read($, streakAtom),
    })

    await update($, routeAtom, () => decision.route)
    await update($, streakAtom, () => decision.downStreak)
    $.ui.status(
      `ruta ${mode}: ${label(decision.route)} · ${decision.route.reason}`,
    )

    const text = stripTags(e.text)

    return next(text === e.text ? e : { ...e, text })
  })

  // Solo el bucle principal: los subagentes conservan el modelo de su definición.
  on('turn.step', async function* ($, e, next) {
    const route = e.agentId === undefined ? await active($, configured) : null

    if (route === null) {
      return yield* next(e)
    }

    return yield* next({ ...e, model: route.tier, effort: route.effort })
  })

  on('command.run', { command: COMMAND }, async ($, e) => {
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
            ? 'Router apagado: el modelo y el esfuerzo son los que elijas con /model.'
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
      `Modo: ${mode}`,
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
}
