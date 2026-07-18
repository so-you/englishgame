import { useState } from 'react'

import type { ContentPack } from '../../core/learning/model'
import type { UserSettings } from '../../infra/indexeddb/schema'
import type { AppScreen } from '../../app/app-screen'
import { PackCard } from '../shared/PackCard'

interface HomeScreenProps {
  readonly packs: readonly ContentPack[]
  readonly settings: UserSettings
  readonly dueCountByPack: Readonly<Record<string, number>>
  readonly hasResumableSession: boolean
  readonly onStartPack: (packId: string) => void
  readonly onContinue: () => void
  readonly onChangeQuota: (quota: number) => void
  readonly onNavigate: (screen: AppScreen) => void
}

export function HomeScreen({
  packs,
  settings,
  dueCountByPack,
  hasResumableSession,
  onStartPack,
  onContinue,
  onChangeQuota,
  onNavigate,
}: HomeScreenProps) {
  const [selectedPackId, setSelectedPackId] = useState(packs[0]?.id ?? '')

  return (
    <div className="screen home-screen">
      <header className="screen-header">
        <div>
          <p className="eyebrow">English Roguelike · MVP v0.1</p>
          <h1>英语爬塔</h1>
          <p>把真正到期的英语内容带进一场十分钟的卡牌冒险。</p>
        </div>
        <nav aria-label="辅助页面">
          <button type="button" className="button button--quiet" onClick={() => onNavigate('progress')}>
            学习进度
          </button>
          <button type="button" className="button button--quiet" onClick={() => onNavigate('settings')}>
            设置
          </button>
        </nav>
      </header>

      {hasResumableSession ? (
        <section className="resume-banner" aria-labelledby="resume-title">
          <div>
            <p className="eyebrow">未完成的探索</p>
            <h2 id="resume-title">从上次保存的位置继续</h2>
          </div>
          <button type="button" className="button button--primary" onClick={onContinue}>
            继续上次会话
          </button>
        </section>
      ) : null}

      <section aria-labelledby="pack-title">
        <div className="section-heading">
          <div>
            <p className="eyebrow">第一步</p>
            <h2 id="pack-title">选择学习内容</h2>
          </div>
          <button type="button" className="button button--secondary" onClick={() => onNavigate('import')}>
            导入词表
          </button>
        </div>
        <div className="pack-grid">
          {packs.map((pack) => (
            <PackCard
              key={pack.id}
              pack={pack}
              selected={selectedPackId === pack.id}
              dueCount={dueCountByPack[pack.id] ?? 0}
              onSelect={() => setSelectedPackId(pack.id)}
            />
          ))}
        </div>
      </section>

      <section className="session-settings" aria-labelledby="quota-title">
        <div>
          <p className="eyebrow">第二步</p>
          <h2 id="quota-title">设置本局节奏</h2>
          <p>到期内容始终优先；新词只在战前安全教学。</p>
        </div>
        <label>
          <span>每局新词数量</span>
          <select
            value={settings.newUnitQuota}
            onChange={(event) => onChangeQuota(Number(event.target.value))}
          >
            {[0, 1, 2, 3, 4].map((quota) => (
              <option key={quota} value={quota}>
                {quota}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          className="button button--primary button--large"
          disabled={!selectedPackId}
          onClick={() => onStartPack(selectedPackId)}
        >
          开始本次学习
        </button>
      </section>
    </div>
  )
}
