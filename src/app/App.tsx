import { useEffect, useState } from 'react'
import { useStore } from 'zustand'

import {
  openEnglishGameDatabase,
} from '../infra/indexeddb/database'
import { createAppStore, type AppRuntime, type AppStore } from './app-store'
import { loadBootstrapData } from './bootstrap'
import { HomeScreen } from '../ui/home/HomeScreen'
import { TeachingScreen } from '../ui/teaching/TeachingScreen'
import { BattleScreen } from '../ui/battle/BattleScreen'
import { RelicRewardScreen } from '../ui/reward/RelicRewardScreen'
import { HealRewardScreen } from '../ui/reward/HealRewardScreen'
import { SettlementScreen } from '../ui/settlement/SettlementScreen'
import { DefeatScreen } from '../ui/settlement/DefeatScreen'
import { ProgressScreen } from '../ui/progress/ProgressScreen'
import { ImportWizard } from '../ui/import/ImportWizard'
import { SettingsScreen } from '../ui/settings/SettingsScreen'
import { downloadUserData } from './download-user-data'
import type { VocabularyUnit } from '../core/learning/model'
import { createBrowserSpeechAdapter } from '../infra/speech/speech-adapter'
import { FocusManager } from '../ui/shared/FocusManager'
import { screenForSessionPhase } from './app-screen'

import './app.css'

const DEFAULT_RUNTIME: AppRuntime = {
  now: () => Date.now(),
  nextId: () => crypto.randomUUID(),
  nextSeed: () => crypto.getRandomValues(new Uint32Array(1))[0]!,
}

const SCREEN_TITLE = {
  home: '选择学习内容',
  teaching: '战前学习',
  battle: '战斗',
  'relic-reward': '选择遗物',
  'heal-reward': '整备恢复',
  settlement: '学习结算',
  defeat: '本次探索结束',
  import: '导入自定义词表',
  progress: '学习进度',
  settings: '设置',
  loading: '正在加载',
  error: '应用暂时不可用',
} as const

function AppView({ store }: { readonly store: AppStore }) {
  const screen = useStore(store, (state) => state.screen)
  const currentTime = useStore(store, (state) => state.currentTime)
  const error = useStore(store, (state) => state.error)
  const packs = useStore(store, (state) => state.packs)
  const settings = useStore(store, (state) => state.settings)
  const srsStates = useStore(store, (state) => state.srsStates)
  const session = useStore(store, (state) => state.session)
  const resumableSession = useStore(store, (state) => state.resumableSession)
  const [speechAdapter] = useState(createBrowserSpeechAdapter)
  const [, refreshVoices] = useState(0)

  useEffect(() => {
    if (!window.speechSynthesis) return
    const onVoicesChanged = () => refreshVoices((value) => value + 1)
    window.speechSynthesis.addEventListener('voiceschanged', onVoicesChanged)
    return () =>
      window.speechSynthesis.removeEventListener(
        'voiceschanged',
        onVoicesChanged,
      )
  }, [])

  useEffect(() => {
    document.documentElement.dataset.reducedMotion = String(
      settings.reducedMotion,
    )
    return () => {
      delete document.documentElement.dataset.reducedMotion
    }
  }, [settings.reducedMotion])

  if (screen === 'home') {
    const statesById = new Map(srsStates.map((state) => [state.unitId, state]))
    const dueCountByPack = Object.fromEntries(
      packs.map((pack) => [
        pack.id,
        pack.units.filter((unit) => {
          const state = statesById.get(unit.id)
          return state?.dueAt !== undefined && state.dueAt <= currentTime
        }).length,
      ]),
    )
    return (
      <HomeScreen
        packs={packs}
        settings={settings}
        dueCountByPack={dueCountByPack}
        hasResumableSession={resumableSession !== undefined}
        onStartPack={(packId) => void store.getState().startSession(packId)}
        onContinue={() => store.getState().continueSession()}
        onChangeQuota={(quota) =>
          void store.getState().updateNewUnitQuota(quota)
        }
        onNavigate={(nextScreen) => store.getState().navigate(nextScreen)}
      />
    )
  }

  if (screen === 'teaching' && session) {
    const speechAvailable =
      settings.speechEnabled && speechAdapter.capability().available
    return (
      <TeachingScreen
        session={session}
        speechAvailable={speechAvailable}
        onSpeak={(term) => speechAdapter.speak(term)}
        onComplete={() => void store.getState().completeTeaching()}
        onAbandon={() => void store.getState().abandonSession()}
      />
    )
  }

  if (screen === 'battle' && session?.currentBattle) {
    const listeningAvailable =
      settings.speechEnabled && speechAdapter.capability().available
    return (
      <BattleScreen
        session={session}
        showTimingHints={settings.showTimingHints}
        speechAvailable={listeningAvailable}
        onSpeak={(term) => speechAdapter.speak(term)}
        onPlayCard={(cardId) =>
          store.getState().dispatchSession({
            type: 'battle-action',
            action: { type: 'play-card', cardId },
          })
        }
        onPrepareOvercharge={(cardId) =>
          store.getState().prepareOvercharge(cardId, listeningAvailable)
        }
        onResolveOvercharge={(request) =>
          store.getState().resolveOvercharge(request)
        }
        onOverchargeFeedbackDone={() => {
          const currentSession = store.getState().session
          if (currentSession) {
            store.getState().navigate(screenForSessionPhase(currentSession.phase))
          }
        }}
        onEndTurn={() =>
          store.getState().dispatchSession({
            type: 'battle-action',
            action: { type: 'end-turn' },
          })
        }
      />
    )
  }

  if (screen === 'relic-reward' && session) {
    return (
      <RelicRewardScreen
        ownedRelicIds={session.relicIds}
        onChoose={(relicId) =>
          void store.getState().dispatchSession({ type: 'choose-relic', relicId })
        }
      />
    )
  }

  if (screen === 'heal-reward' && session?.currentBattle) {
    return (
      <HealRewardScreen
        hp={session.currentBattle.player.hp}
        maxHp={session.currentBattle.player.maxHp}
        onClaim={() =>
          void store.getState().dispatchSession({ type: 'claim-heal' })
        }
      />
    )
  }

  if (screen === 'settlement' && session) {
    return (
      <SettlementScreen
        session={session}
        onFinish={() => void store.getState().finishSession()}
      />
    )
  }

  if (screen === 'defeat' && session) {
    return (
      <DefeatScreen
        session={session}
        onFinish={() => void store.getState().finishSession()}
      />
    )
  }

  if (screen === 'progress') {
    return (
      <ProgressScreen
        packs={packs}
        states={srsStates}
        now={currentTime}
        onBack={() => store.getState().navigate('home')}
        onExport={async () => {
          const result = await store.getState().exportData()
          if (!result.ok) return result
          downloadUserData(result.value)
          return { ok: true }
        }}
      />
    )
  }

  if (screen === 'import') {
    const dictionaryUnits = packs.flatMap((pack) =>
      pack.units.filter(
        (unit): unit is VocabularyUnit => unit.type === 'vocab',
      ),
    )
    return (
      <ImportWizard
        dictionaryUnits={dictionaryUnits}
        onSave={(pack) => store.getState().saveImportedPack(pack)}
        onDone={() => store.getState().navigate('home')}
        onCancel={() => store.getState().navigate('home')}
      />
    )
  }

  if (screen === 'settings') {
    return (
      <SettingsScreen
        settings={settings}
        onUpdate={(patch) => store.getState().updateSettings(patch)}
        onExport={async () => {
          const result = await store.getState().exportData()
          if (!result.ok) return result
          downloadUserData(result.value)
          return { ok: true }
        }}
        onReset={() => store.getState().resetData(true)}
        onBack={() => store.getState().navigate('home')}
      />
    )
  }

  return (
    <main className="app-shell">
      <section className="intro" aria-labelledby="app-title">
        <p className="eyebrow">English Roguelike · MVP v0.1</p>
        <h1 id="app-title">英语爬塔</h1>
        <p>在战斗中复习真正到期的英语内容。</p>
        <h2>{SCREEN_TITLE[screen]}</h2>
        {error ? <p role="alert">{error}</p> : null}
      </section>
    </main>
  )
}

function FocusManagedAppView({ store }: { readonly store: AppStore }) {
  const screen = useStore(store, (state) => state.screen)
  return (
    <FocusManager focusKey={screen}>
      <AppView store={store} />
    </FocusManager>
  )
}

export function App({ store: providedStore }: { readonly store?: AppStore }) {
  const [store, setStore] = useState<AppStore | undefined>(providedStore)
  const [loadError, setLoadError] = useState<string>()

  useEffect(() => {
    if (providedStore) return
    let active = true
    let database: IDBDatabase | undefined

    void (async () => {
      try {
        const opened = await openEnglishGameDatabase()
        if (!opened.ok) {
          if (active) setLoadError(opened.error.message)
          return
        }
        database = opened.value
        const data = await loadBootstrapData(database)
        if (!data.ok) {
          database.close()
          database = undefined
          if (active) setLoadError(data.error.message)
          return
        }
        if (active) setStore(createAppStore(database, data.value, DEFAULT_RUNTIME))
      } catch (error) {
        if (active) {
          setLoadError(error instanceof Error ? error.message : String(error))
        }
      }
    })()

    return () => {
      active = false
      database?.close()
    }
  }, [providedStore])

  if (store) return <FocusManagedAppView store={store} />

  return (
    <main className="app-shell">
      <section className="intro" aria-labelledby="app-title">
        <p className="eyebrow">English Roguelike · MVP v0.1</p>
        <h1 id="app-title">英语爬塔</h1>
        <p>在战斗中复习真正到期的英语内容。</p>
        {loadError ? (
          <p role="alert">{loadError}</p>
        ) : (
          <p role="status">正在加载本地学习数据…</p>
        )}
      </section>
    </main>
  )
}
