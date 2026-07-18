import type { SessionPhase } from '../core/session/model'

export type AppScreen =
  | 'loading'
  | 'home'
  | 'teaching'
  | 'battle'
  | 'relic-reward'
  | 'heal-reward'
  | 'settlement'
  | 'defeat'
  | 'import'
  | 'progress'
  | 'settings'
  | 'error'

export function screenForSessionPhase(phase: SessionPhase): AppScreen {
  if (phase === 'teaching') return 'teaching'
  if (phase === 'battle-1' || phase === 'battle-2' || phase === 'boss') {
    return 'battle'
  }
  if (phase === 'relic-reward') return 'relic-reward'
  if (phase === 'heal-reward') return 'heal-reward'
  if (phase === 'settlement') return 'settlement'
  if (phase === 'defeat') return 'defeat'
  return 'home'
}
