import { describe, expect, test } from 'claude-code/testing'

import {
  CASES,
  decide,
  parseCommand,
  parseHint,
  stripTags,
} from './hooks/classify'
import type { DecideInput } from './hooks/classify'

// Lo que el motor pone en cada comando que escribe la persona.
const typedCommand = {
  origin: { kind: 'composer' },
  presentation: { isFullscreen: false, columns: 80 },
} as const

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
  const build = 'implementa un endpoint POST /usuarios con validación y tests'

  test('bajar a Haiku no espera, aunque el contexto sea grande', async () => {
    expect(
      route('renombra la variable x a y', { prev, contextTokens: 400000 }).tier,
    ).toBe('haiku')
  })

  test('con poco contexto baja a Sonnet enseguida', async () => {
    expect(route(build, { prev, contextTokens: 5000 }).tier).toBe('sonnet')
  })

  test('con mucho contexto, Sonnet espera a un segundo turno', async () => {
    const first = decide({ ...base, text: build, prev, contextTokens: 90000 })

    expect(first.route.tier).toBe('opus')
    expect(first.route.effort).toBe('medium')
    expect(first.downStreak).toBe(1)

    const second = decide({
      ...base,
      text: build,
      prev: first.route,
      contextTokens: 90000,
      downStreak: first.downStreak,
    })

    expect(second.route.tier).toBe('sonnet')
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

describe('clases de tarea del documento', () => {
  test('cada clase va al modelo esperado', async () => {
    for (const c of CASES) {
      expect(`${c.name}: ${route(c.text).tier}`).toBe(`${c.name}: ${c.tier}`)
    }
  })

  test('la pista de Haiku manda sobre las reglas y se valida', async () => {
    const hint = parseHint(
      'Claro: {"modelo":"opus","esfuerzo":"high","motivo":"diseño con muchas dependencias"}',
    )

    expect(hint).toEqual(
      expect.objectContaining({ tier: 'opus', effort: 'high' }),
    )
    expect(parseHint('{"modelo":"gpt"}')).toBe(undefined)
    expect(parseHint('no sé')).toBe(undefined)
    expect(
      decide({ ...base, text: 'una tarea cualquiera', hint }).route.tier,
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
  on('clock.now', () => ({ value: Date.UTC(2026, 9, 30, 18, 5) }))
  on('command.register', (_, e) => ({ value: { command: e.name } }))
  on('turn.step', async function* (_, e) {
    sent.push({ model: e.model, effort: e.effort, agentId: e.agentId })
    // El servidor responde con el id completo del modelo que atendió.
    const served = `claude-${e.model.replace(/^claude-/, '').replace(/-5-5$/, '')}-5-5`

    return {
      turnId: e.turnId,
      index: e.index,
      answer: '',
      toolUses: [],
      stopReason: 'end_turn',
      usage: {
        model: served,
        input_tokens: 1,
        output_tokens: 1,
        cache_read_input_tokens: 0,
        cache_creation_input_tokens: 0,
      },
    }
  })

  const step = async (agentId?: string, model = 'claude-sonnet-5-5') => {
    const stream = $.turn.step({
      turnId: 't1',
      index: 0,
      model,
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

  // Una skill con model: haiku ya eligió para su turno: el router no la pisa.
  await step(undefined, 'claude-haiku-5-5')

  expect(sent[3]).toEqual(
    expect.objectContaining({ model: 'claude-haiku-5-5', effort: 'medium' }),
  )

  // /ruta-estado enseña lo pedido y lo que atendió el servidor.
  const estado = await $.command.run({
    ...typedCommand,
    command: 'ruta-estado',
    args: '',
  })

  expect(estado.text).toContain(
    'principal: enrutado opus/max → claude-opus-5-5',
  )
  expect(estado.text).toContain(
    'subagente subagent: claude-sonnet-5-5/medium → claude-sonnet-5-5',
  )
  expect(estado.text).toContain(
    'principal: claude-haiku-5-5/medium → claude-haiku-5-5',
  )
})

test('/ruta-probar acierta las 8 clases sin gastar nada', async ($, on) => {
  on('command.register', (_, e) => ({ value: { command: e.name } }))

  const probar = await $.command.run({
    ...typedCommand,
    command: 'ruta-probar',
    args: '',
  })

  expect(probar.text).not.toContain('✗')
  expect(probar.text?.match(/✓/g)?.length).toBe(8)
})
