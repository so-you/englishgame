import type { BattleState } from '../../core/battle/model'

export function BattleHud({ battle }: { readonly battle: BattleState }) {
  return (
    <div className="battle-hud" aria-label="战斗资源">
      <div>
        <span>生命</span>
        <strong>{battle.player.hp} / {battle.player.maxHp}</strong>
      </div>
      <div>
        <span>格挡</span>
        <strong>{battle.player.block}</strong>
      </div>
      <div>
        <span>能量</span>
        <strong>{battle.player.energy}</strong>
      </div>
      <div>
        <span>专注</span>
        <strong>{battle.player.focus}</strong>
      </div>
      <div>
        <span>语流</span>
        <strong>{battle.player.fluency} / 3</strong>
      </div>
    </div>
  )
}
