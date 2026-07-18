import { useState } from 'react'

import type { SessionState } from '../../core/session/model'

interface SpeechResult {
  readonly ok: boolean
  readonly error?: { readonly message: string }
}

interface TeachingScreenProps {
  readonly session: SessionState
  readonly speechAvailable: boolean
  readonly onSpeak?: (term: string) => Promise<SpeechResult>
  readonly onComplete: () => void
  readonly onAbandon: () => void
}

export function TeachingScreen({
  session,
  speechAvailable,
  onSpeak,
  onComplete,
  onAbandon,
}: TeachingScreenProps) {
  const [speechError, setSpeechError] = useState<string>()
  const unitId = session.learningSet.newUnitIds[session.teachingIndex]
  const unit = session.contentPack.units.find((candidate) => candidate.id === unitId)
  const total = session.learningSet.newUnitIds.length

  if (!unit || unit.type !== 'vocab') {
    return (
      <div className="screen centered-panel" role="alert">
        <h1>无法加载教学内容</h1>
        <p>当前学习项目缺失或不是可教学的词汇项目。</p>
        <button type="button" className="button" onClick={onAbandon}>
          返回主页
        </button>
      </div>
    )
  }

  return (
    <div className="screen teaching-screen">
      <header className="teaching-header">
        <div>
          <p className="eyebrow">战前学习 · 不计分</p>
          <h1>先认识新内容，再进入战斗</h1>
        </div>
        <div className="progress-count" aria-label={`教学进度 ${session.teachingIndex + 1} / ${total}`}>
          {session.teachingIndex + 1} / {total}
        </div>
      </header>
      <div className="progress-track" aria-hidden="true">
        <span style={{ width: `${((session.teachingIndex + 1) / total) * 100}%` }} />
      </div>

      <article className="teaching-card">
        <div className="word-heading">
          <div>
            <p className="part-of-speech">{unit.partOfSpeech}</p>
            <h2>{unit.term}</h2>
            <p className="phonetic">{unit.phonetic}</p>
          </div>
          <button
            type="button"
            className="speech-button"
            disabled={!speechAvailable}
            onClick={() => {
              if (!onSpeak) return
              setSpeechError(undefined)
              void onSpeak(unit.term).then((result) => {
                if (!result.ok) setSpeechError(result.error?.message ?? '发音播放失败。')
              })
            }}
            aria-label="播放发音"
          >
            <span aria-hidden="true">◖))</span>
            <span>{speechAvailable ? '播放发音' : '语音不可用'}</span>
          </button>
        </div>
        {speechError ? <p className="speech-error" role="alert">{speechError}</p> : null}
        <p className="definition">{unit.definitionZh}</p>
        {unit.example ? (
          <blockquote>
            <p>{unit.example}</p>
            <footer>{unit.exampleZh}</footer>
          </blockquote>
        ) : null}
        <div className="teaching-note">
          <strong>记忆提示</strong>
          <span>先理解目标词义；战斗中的练习会逐步减少线索。</span>
        </div>
      </article>

      <footer className="teaching-actions">
        <button type="button" className="button button--quiet" onClick={onAbandon}>
          退出本次会话
        </button>
        <button type="button" className="button button--primary button--large" onClick={onComplete}>
          我已理解，继续
        </button>
      </footer>
    </div>
  )
}
