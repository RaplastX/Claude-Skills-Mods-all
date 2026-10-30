import { describe, expect, test } from 'claude-code/testing'

import { decide, parseCommand, stripTags } from './hooks/classify'
import type { DecideInput } from './hooks/classify'

const base: DecideInput = {
  text: '',
  mode: 'auto',
  prev: null,
  contextTokens: 0,
  cacheThreshold: 30000,
  downStreak: 0,
}

const route = (text: string, more: Partial<DecideInput> = {}) =>
  decide({ ...base, ...more, text }).route

describe('clasificador', () => {
  test('lo mecánico va a Haiku con esfuerzo bajo', async () => {
    expect(route('renombra la variable userId a accountId')).toEqual(
      expect.objectContaining({ tier: 'haiku', effort: 'low' }),
    )
    expect(route('¿dónde está definida la función login?')).toEqual(
      expect.objectContaining({ tier: 'haiku' }),
    )
  })

  test('implementar es Sonnet medio, aunque mencione buscar', async () => {
    expect(
      route('implementa un buscador de productos con filtros en la tienda'),
    ).toEqual(expect.objectContaining({ tier: 'sonnet', effort: 'medium' }))
  })

  test('arquitectura más seguridad es Opus alto', async () => {
    expect(
      route(
        'diseña la arquitectura del sistema de pagos y revisa la seguridad del login',
      ),
    ).toEqual(expect.objectContaining({ tier: 'opus', effort: 'high' }))
  })

  test('pensar a fondo sube el esfuerzo', async () => {
    expect(
      route(
        'piensa a fondo: hay una condición de carrera intermitente en la cola',
      ),
    ).toEqual(expect.objectContaining({ tier: 'opus', effort: 'xhigh' }))
  })

  test('una sola señal difícil es Sonnet alto', async () => {
    expect(route('optimiza el rendimiento de esta consulta SQL')).toEqual(
      expect.objectContaining({ tier: 'sonnet', effort: 'high' }),
    )
  })

  test('"sí, hazlo" sigue con la ruta anterior', async () => {
    const prev = { tier: 'opus', effort: 'high', reason: 'x' } as const

    expect(route('sí, hazlo', { prev })).toEqual(
      expect.objectContaining({ tier: 'opus', effort: 'high' }),
    )
  })

  test('las etiquetas +modelo y +esfuerzo mandan', async () => {
    expect(route('renombra esto +opus +alto')).toEqual(
      expect.objectContaining({ tier: 'opus', effort: 'high' }),
    )
    expect(stripTags('renombra esto +opus +alto')).toBe('renombra esto')
    expect(stripTags('a  b\n  c')).toBe('a  b\n  c')
  })

  test('modo ahorro cambia Opus por Sonnet con más esfuerzo', async () => {
    expect(
      route('diseña la arquitectura y revisa la seguridad', { mode: 'ahorro' }),
    ).toEqual(expect.objectContaining({ tier: 'sonnet', effort: 'xhigh' }))
  })

  test('modo calidad nunca usa Haiku', async () => {
    expect(route('renombra la variable x', { mode: 'calidad' })).toEqual(
      expect.objectContaining({ tier: 'sonnet' }),
    )
  })
})

describe('caché', () => {
  const prev = { tier: 'opus', effort: 'high', reason: 'x' } as const
  const light = 'renombra la variable x a y'

  test('con poco contexto baja de modelo enseguida', async () => {
    expect(route(light, { prev, contextTokens: 5000 }).tier).toBe('haiku')
  })

  test('con mucho contexto espera a un segundo turno ligero', async () => {
    const first = decide({ ...base, text: light, prev, contextTokens: 90000 })

    expect(first.route.tier).toBe('opus')
    expect(first.route.effort).toBe('low')
    expect(first.downStreak).toBe(1)

    const second = decide({
      ...base,
      text: light,
      prev: first.route,
      contextTokens: 90000,
      downStreak: first.downStreak,
    })

    expect(second.route.tier).toBe('haiku')
    expect(second.downStreak).toBe(0)
  })

  test('subir de modelo no espera', async () => {
    expect(
      route('diseña la arquitectura con foco en seguridad', {
        prev: { tier: 'haiku', effort: 'low', reason: 'x' },
        contextTokens: 90000,
      }).tier,
    ).toBe('opus')
  })
})

describe('/ruta', () => {
  test('entiende modos, fijados y errores', async () => {
    expect(parseCommand('')).toEqual({ kind: 'show' })
    expect(parseCommand('Ahorro')).toEqual({ kind: 'mode', mode: 'ahorro' })
    expect(parseCommand('opus muy-alto')).toEqual(
      expect.objectContaining({
        kind: 'pin',
        route: expect.objectContaining({ tier: 'opus', effort: 'xhigh' }),
      }),
    )
    expect(parseCommand('opus rapidísimo').kind).toBe('error')
  })
})

test('el mensaje decide el modelo y el esfuerzo del bucle principal', async ($, on) => {
  const sent: { model: string; effort?: unknown; agentId?: string }[] = []

  on('session.model', () => ({ value: 'claude-sonnet-5-5' }))
  on('session.usage', () => ({
    value: {
      startedAt: 0,
      context: { tokens: 1000, window: 200000 },
      rateLimits: [],
    },
  }))
  on('ui.status', () => ({ value: undefined }))
  on('prompt.submit', (_, e) => ({ text: e.text }))
  on('turn.step', async function* (_, e) {
    sent.push({ model: e.model, effort: e.effort, agentId: e.agentId })

    return {
      turnId: e.turnId,
      index: e.index,
      answer: '',
      toolUses: [],
      stopReason: 'end_turn',
      usage: null,
    }
  })

  const step = async (agentId?: string) => {
    const stream = $.turn.step({
      turnId: 't1',
      index: 0,
      model: 'claude-sonnet-5-5',
      effort: 'medium',
      messageCount: 1,
      ...(agentId ? { agentId } : {}),
    })

    for await (const _ of stream) {
      // solo se consume
    }

    return stream.result
  }

  const typed = { wait: false, origin: { kind: 'composer' } } as const
  const entered = await $.prompt.submit({
    ...typed,
    text: 'diseña la arquitectura y revisa la seguridad +max',
  })

  expect(entered.text).toBe('diseña la arquitectura y revisa la seguridad')

  await step()
  await step('subagente-1')

  expect(sent[0]).toEqual(
    expect.objectContaining({ model: 'opus', effort: 'max' }),
  )
  // Un subagente conserva su propio modelo.
  expect(sent[1]).toEqual(
    expect.objectContaining({ model: 'claude-sonnet-5-5', effort: 'medium' }),
  )

  // El aviso de una tarea en segundo plano no cambia la ruta.
  await $.prompt.submit({
    wait: false,
    origin: { kind: 'task-notification' },
    text: 'renombra la variable x',
  })
  await step()

  expect(sent[2]).toEqual(
    expect.objectContaining({ model: 'opus', effort: 'max' }),
  )
})
