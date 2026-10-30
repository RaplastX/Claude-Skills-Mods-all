export type Tier = 'haiku' | 'sonnet' | 'opus'
export type Effort = 'low' | 'medium' | 'high' | 'xhigh' | 'max'
export type Mode = 'auto' | 'ahorro' | 'calidad' | 'fijo' | 'off'

// Lo que el router decidió para el siguiente turno y por qué.
export type Route = { tier: Tier; effort: Effort; reason: string }

declare module 'claude-code' {
  interface PluginState {
    'router-ia-auto': {
      // null: se usa el modo por defecto de la configuración del plugin.
      mode: Mode | null
      route: Shaped<Route | null>
      pinned: Shaped<Route | null>
      // Turnos seguidos que pedían un modelo menor (para no ir y volver).
      downStreak: number
    }
  }
}
