import type { Effort, Mode, Route, Tier } from '../types'

// Reglas sin llamadas al modelo: clasificar no gasta ni un token.

const TIERS: readonly Tier[] = ['haiku', 'sonnet', 'opus']
const EFFORTS: readonly Effort[] = ['low', 'medium', 'high', 'xhigh', 'max']

const EFFORT_ES: Record<Effort, string> = {
  low: 'bajo',
  medium: 'medio',
  high: 'alto',
  xhigh: 'muy alto',
  max: 'máximo',
}

const EFFORT_WORDS: Record<string, Effort> = {
  bajo: 'low',
  low: 'low',
  medio: 'medium',
  medium: 'medium',
  alto: 'high',
  high: 'high',
  'muy-alto': 'xhigh',
  muyalto: 'xhigh',
  xhigh: 'xhigh',
  max: 'max',
  maximo: 'max',
}

type Signal = { name: string; weight: number; pattern: RegExp }

// Tareas difíciles o en las que equivocarse sale caro: suben modelo y esfuerzo.
const HARD: readonly Signal[] = [
  {
    name: 'arquitectura',
    weight: 2,
    pattern:
      /\b(arquitectur\w*|architect\w*|system design|disen\w* (del? )?(sistema|arquitectura|esquema|base de datos|api))\b/,
  },
  {
    name: 'seguridad',
    weight: 2,
    pattern:
      /\b(segurid\w*|security|vulnerab\w*|exploit\w*|inyeccion\w*|injection|xss|csrf|cifrado|encrypt\w*|criptograf\w*)\b/,
  },
  {
    name: 'causa raíz',
    weight: 2,
    pattern:
      /\b(causa raiz|root cause|intermitente\w*|flaky|heisenbug|no se (por que|porque)|don'?t know why|bug (sutil|raro|extrano)|subtle bug)\b/,
  },
  {
    name: 'pensar a fondo',
    weight: 2,
    pattern:
      /\b(piensa (bien|a fondo|profundamente|detenidamente|con calma)|a fondo|exhaustiv\w*|think (hard|deeply|carefully)|ultrathink|paso a paso)\b/,
  },
  {
    name: 'concurrencia',
    weight: 2,
    pattern:
      /\b(concurren\w*|race condition|condicion(es)? de carrera|deadlock|interbloqueo\w*|thread.?safe)\b/,
  },
  {
    name: 'rendimiento',
    weight: 1,
    pattern:
      /\b(rendimiento|performance|optimiz\w*|latencia|latency|cuello de botella|bottleneck|fuga de memoria|memory leak)\b/,
  },
  {
    name: 'migración',
    weight: 1,
    pattern: /\b(migra(r|cion|ciones|te|tion)|version mayor|major version)\b/,
  },
  {
    name: 'refactor grande',
    weight: 1,
    pattern:
      /\b(refactori\w* (todo|completo|entero|grande|general)|refactor (the whole|everything|entire)|reestructur\w*|rewrite|reescrib\w*)\b/,
  },
  {
    name: 'algoritmo',
    weight: 1,
    pattern:
      /\b(algoritm\w*|algorithm\w*|complejidad|complexity|distribuid\w*|distributed|escalab\w*|scalab\w*)\b/,
  },
  {
    name: 'producción',
    weight: 1,
    pattern: /\b(produccion|production|incidente|incident|caido|outage)\b/,
  },
  {
    name: 'dinero o accesos',
    weight: 1,
    pattern:
      /\b(pagos?|payments?|stripe|facturacion|billing|autenticacion|authentication|autorizacion|authorization|oauth|jwt|permisos|permissions)\b/,
  },
]

// Tareas mecánicas y acotadas: basta un modelo rápido con poco esfuerzo.
const LIGHT: readonly Signal[] = [
  { name: 'renombrar', weight: 1, pattern: /\b(renombr\w*|rename\w*)\b/ },
  {
    name: 'erratas',
    weight: 1,
    pattern: /\b(typos?|errata\w*|ortografi\w*|spelling)\b/,
  },
  {
    name: 'formato',
    weight: 1,
    pattern: /\b(formatea\w*|formatting|indent\w*|prettier)\b/,
  },
  { name: 'traducir', weight: 1, pattern: /\b(traduc\w*|translat\w*)\b/ },
  {
    name: 'buscar',
    weight: 1,
    pattern:
      /\b(busca|buscame|encuentra|localiza|find|search|grep|donde (esta|estan|se define)|where is)\b/,
  },
  { name: 'listar', weight: 1, pattern: /\b(listar?|enumera)\b/ },
  {
    name: 'commit',
    weight: 1,
    pattern: /\b(mensaje de commit|commit message)\b/,
  },
  {
    name: 'resumir',
    weight: 1,
    pattern: /\b(resume|resumen|summari\w*|tl;?dr)\b/,
  },
  {
    name: 'cambio de texto',
    weight: 1,
    pattern:
      /\b(cambia|change|actualiza|update) (el |la |los |las |the )?(texto|text|titulo|title|color|etiqueta|label|copy|version)\b/,
  },
]

// Construir, depurar o probar: nunca por debajo de Sonnet.
const BUILD =
  /\b(implement\w*|crea|crear|create|construy\w*|construir|build|desarroll\w*|develop|programa|programar|agrega\w*|anad\w*|add|feature|funcionalidad|endpoint|componente|component|pantalla|screen|tests?|pruebas?|arregl\w*|corrig\w*|fix\w*|bug|error|debug\w*|depura\w*)\b/

// "sí", "dale", "sí, hazlo"...: sigue la tarea anterior con la misma ruta.
const CONTINUE =
  /^((si|sip|ok|okay|vale|dale|sigue|continua|continue|go on|go ahead|hazlo|adelante|perfecto|listo|yes|procede|proceed|claro|correcto|por favor|porfa|please|gracias)\b[\s.!,]*){1,4}$/

const TAG_TIER = /(^|\s)\+(haiku|sonnet|opus)\b/i
const TAG_EFFORT =
  /(^|\s)\+(bajo|medio|alto|muy-alto|m[aá]x(imo)?|low|medium|high|xhigh)\b/i

export const normalize = (text: string): string =>
  text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim()

const effortWord = (word: string): Effort | undefined =>
  EFFORT_WORDS[normalize(word)]

const shift = (effort: Effort, by: number, cap: Effort = 'xhigh'): Effort => {
  const top = EFFORTS.indexOf(cap)
  const at = Math.min(top, Math.max(0, EFFORTS.indexOf(effort) + by))

  return EFFORTS[at] ?? effort
}

const rank = (tier: Tier): number => TIERS.indexOf(tier)

export const label = (route: Route): string =>
  `${route.tier} · ${EFFORT_ES[route.effort]}`

export const stripTags = (text: string): string => {
  const stripped = text
    .replace(new RegExp(TAG_TIER.source, 'gi'), '')
    .replace(new RegExp(TAG_EFFORT.source, 'gi'), '')
    .trim()

  return stripped === '' ? text : stripped
}

export type DecideInput = {
  text: string
  mode: Exclude<Mode, 'fijo' | 'off'>
  prev: Route | null
  // Tokens que se reenvían en la próxima petición (contexto actual).
  contextTokens: number
  // Por encima de esto, bajar de modelo exige que la tarea siga siendo ligera
  // dos turnos seguidos: un cambio de ida y vuelta re-cachea todo dos veces.
  cacheThreshold: number
  // Turnos seguidos que ya pedían un modelo menor que el actual.
  downStreak: number
}

export type Decision = { route: Route; downStreak: number }

export const decide = (input: DecideInput): Decision => {
  const { text, mode, prev, contextTokens, cacheThreshold, downStreak } = input
  const norm = normalize(text)
  const tierTag = TAG_TIER.exec(text)?.[2]?.toLowerCase() as Tier | undefined
  const effortTagWord = TAG_EFFORT.exec(text)?.[2]
  const effortTag = effortTagWord ? effortWord(effortTagWord) : undefined

  if (!tierTag && !effortTag && prev && CONTINUE.test(norm)) {
    return {
      route: { ...prev, reason: 'continuación de la tarea anterior' },
      downStreak,
    }
  }

  const hard = HARD.filter(s => s.pattern.test(norm))
  const light = LIGHT.filter(s => s.pattern.test(norm))
  const score = hard.reduce((sum, s) => sum + s.weight, 0)
  const isBuild = BUILD.test(norm)
  const bullets = text.split('\n').filter(l => /^\s*([-*•]|\d+[.)])\s/.test(l))
  const size =
    text.length > 3000 ? 2 : text.length > 1200 || bullets.length >= 5 ? 1 : 0
  const isDeep = hard.some(s => s.name === 'pensar a fondo')

  let tier: Tier
  let effort: Effort
  let why: string

  if (score >= 3 || (score >= 2 && size >= 1)) {
    tier = 'opus'
    effort = 'high'
  } else if (score === 2) {
    tier = 'opus'
    effort = 'medium'
  } else if (score === 1) {
    tier = 'sonnet'
    effort = 'high'
  } else if (light.length > 0 && !isBuild && size === 0 && text.length < 400) {
    tier = 'haiku'
    effort = 'low'
  } else if (size >= 2) {
    tier = 'sonnet'
    effort = 'high'
  } else if (!isBuild && text.length < 120 && /\?\s*$/.test(norm)) {
    tier = 'sonnet'
    effort = 'low'
  } else {
    tier = 'sonnet'
    effort = 'medium'
  }

  if (isDeep && tier !== 'haiku') {
    effort = shift(effort, 1)
  }

  if (hard.length > 0) {
    why = hard.map(s => s.name).join(', ')
  } else if (tier === 'haiku') {
    why = `tarea mecánica: ${light.map(s => s.name).join(', ')}`
  } else if (size > 0) {
    why = 'petición larga o con muchos requisitos'
  } else if (effort === 'low') {
    why = 'pregunta corta'
  } else {
    why = isBuild ? 'implementación normal' : 'tarea general'
  }

  if (mode === 'ahorro') {
    if (tier === 'opus') {
      tier = 'sonnet'
      effort = shift(effort, 1)
      why += '; modo ahorro: Sonnet con más esfuerzo en vez de Opus'
    } else if (tier === 'sonnet') {
      effort = shift(effort, -1)
    }
  } else if (mode === 'calidad') {
    if (tier === 'haiku') {
      tier = 'sonnet'
      effort = 'medium'
    } else if (tier === 'sonnet' && score >= 1) {
      tier = 'opus'
      effort = 'medium'
    } else {
      effort = shift(effort, 1)
    }

    why += '; modo calidad'
  }

  if (tierTag) {
    tier = tierTag
    effort = effortTag ?? (tier === 'haiku' ? 'low' : effort)
    why = `elegido por ti (+${tierTag})`
  } else if (effortTag) {
    effort = effortTag
    why += `; esfuerzo elegido por ti`
  }

  // Cambiar de modelo tira la caché del contexto: con un contexto grande,
  // bajar de modelo para un solo turno sale más caro que quedarse.
  const isDowngrade = prev !== null && rank(tier) < rank(prev.tier)
  const streak = isDowngrade ? downStreak + 1 : 0

  if (
    !tierTag &&
    isDowngrade &&
    contextTokens >= cacheThreshold &&
    streak < 2
  ) {
    const kept = prev.tier
    effort = tier === 'haiku' ? 'low' : effort
    why += `; se mantiene ${kept} para no perder la caché (~${Math.round(contextTokens / 1000)}k tokens)`
    tier = kept

    return { route: { tier, effort, reason: why }, downStreak: streak }
  }

  return { route: { tier, effort, reason: why }, downStreak: 0 }
}

export type Command =
  | { kind: 'show' }
  | { kind: 'help' }
  | { kind: 'mode'; mode: Exclude<Mode, 'fijo'> }
  | { kind: 'pin'; route: Route }
  | { kind: 'error'; text: string }

const MODES: Record<string, Exclude<Mode, 'fijo'>> = {
  auto: 'auto',
  ahorro: 'ahorro',
  eco: 'ahorro',
  calidad: 'calidad',
  quality: 'calidad',
  off: 'off',
  apagado: 'off',
}

export const parseCommand = (args: string): Command => {
  const words = normalize(args).split(/\s+/).filter(Boolean)
  const [first, second] = words

  if (first === undefined) {
    return { kind: 'show' }
  }

  if (first === 'ayuda' || first === 'help') {
    return { kind: 'help' }
  }

  const mode = MODES[first]

  if (mode) {
    return { kind: 'mode', mode }
  }

  if ((TIERS as readonly string[]).includes(first)) {
    const tier = first as Tier
    const effort = second
      ? effortWord(second)
      : tier === 'haiku'
        ? 'low'
        : 'medium'

    if (!effort) {
      return {
        kind: 'error',
        text: `Esfuerzo desconocido: "${second}". Usa bajo, medio, alto, muy-alto o max.`,
      }
    }

    return { kind: 'pin', route: { tier, effort, reason: 'fijado con /ruta' } }
  }

  return {
    kind: 'error',
    text: `No entiendo "${args.trim()}". Prueba /ruta ayuda.`,
  }
}

export const HELP = [
  'Router IA: elige modelo y esfuerzo en cada turno.',
  '',
  '/ruta                 muestra la ruta actual y por qué',
  '/ruta auto            elige solo (por defecto)',
  '/ruta ahorro          evita Opus y baja el esfuerzo cuando se puede',
  '/ruta calidad         nunca Haiku y sube el esfuerzo',
  '/ruta opus alto       fija modelo y esfuerzo hasta /ruta auto',
  '/ruta off             no toca nada (eliges tú con /model)',
  '',
  'En un mensaje: +opus, +sonnet, +haiku y +bajo, +medio, +alto, +muy-alto, +max',
  'cambian solo ese mensaje.',
].join('\n')
