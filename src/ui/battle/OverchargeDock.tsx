import { useState } from 'react'

import { evaluateAnswer } from '../../core/learning/evaluate-answer'
import type { PendingOvercharge } from '../../core/session/prepare-overcharge'
import { RecallFeedback } from './RecallFeedback'

export interface ResolveOverchargeRequest {
  readonly pending: PendingOvercharge
  readonly response: string | readonly string[]
  readonly usedHint: boolean
  readonly confirmedNearMatch: boolean
}

interface ActionResult {
  readonly ok: boolean
  readonly error?: { readonly message: string }
}

interface OverchargeDockProps {
  readonly pending: PendingOvercharge
  readonly showTimingHints: boolean
  readonly speechTerm?: string
  readonly speechAvailable: boolean
  readonly onSpeak?: (term: string) => Promise<ActionResult>
  readonly onResolve: (
    request: ResolveOverchargeRequest,
  ) => Promise<ActionResult>
  readonly onCancel: () => void
  readonly onDone: () => void
}

export function OverchargeDock({
  pending,
  showTimingHints,
  speechTerm,
  speechAvailable,
  onSpeak,
  onResolve,
  onCancel,
  onDone,
}: OverchargeDockProps) {
  const [response, setResponse] = useState('')
  const [usedHint, setUsedHint] = useState(false)
  const [confirmNearMatch, setConfirmNearMatch] = useState(false)
  const [feedback, setFeedback] = useState<{ correct: boolean }>()
  const [error, setError] = useState<string>()
  const [speechError, setSpeechError] = useState<string>()
  const exercise = pending.exercise

  const submit = async () => {
    if (!response) return
    const evaluation = evaluateAnswer(exercise, response)
    if (evaluation.status === 'needs-confirmation' && !confirmNearMatch) {
      setConfirmNearMatch(true)
      return
    }
    const resolved = await onResolve({
      pending,
      response,
      usedHint,
      confirmedNearMatch: confirmNearMatch,
    })
    if (!resolved.ok) {
      setError(resolved.error?.message ?? '无法提交答案。')
      return
    }
    setFeedback({
      correct:
        evaluation.status === 'correct' ||
        (evaluation.status === 'needs-confirmation' && confirmNearMatch),
    })
  }

  return (
    <aside className="overcharge-dock" aria-labelledby="overcharge-title">
      <div className="overcharge-heading">
        <div>
          <p className="eyebrow">消耗 1 点专注</p>
          <h2 id="overcharge-title">过载回忆</h2>
        </div>
        {!feedback ? (
          <button type="button" className="button button--quiet" onClick={onCancel}>
            取消
          </button>
        ) : null}
      </div>

      {feedback ? (
        <RecallFeedback
          correct={feedback.correct}
          explanation={exercise.explanation}
          onDone={onDone}
        />
      ) : (
        <div className="exercise-panel">
          <p className="exercise-prompt">{exercise.prompt}</p>
          {exercise.kind === 'vocab-listening-spelling' ? (
            <button
              type="button"
              className="button button--secondary"
              disabled={!speechAvailable || !speechTerm || !onSpeak}
              onClick={() => {
                if (!speechTerm || !onSpeak) return
                setSpeechError(undefined)
                void onSpeak(speechTerm).then((result) => {
                  if (!result.ok) {
                    setSpeechError(
                      result.error?.message ?? '播放失败，请使用拼写替代题。',
                    )
                  }
                })
              }}
            >
              {speechAvailable ? '播放题目发音' : '听力不可用，已改用拼写题'}
            </button>
          ) : null}
          {speechError ? <p role="alert">{speechError}</p> : null}
          {showTimingHints ? (
            <p className="timing-hint">本题会记录用时，但不会因超时判错。</p>
          ) : null}
          {exercise.answer.kind === 'choice' ? (
            <fieldset className="choice-grid">
              <legend>选择一个答案</legend>
              {exercise.options?.map((option) => (
                <label key={option.id}>
                  <input
                    type="radio"
                    name="overcharge-answer"
                    value={option.id}
                    checked={response === option.id}
                    onChange={() => setResponse(option.id)}
                  />
                  <span>{option.text}</span>
                </label>
              ))}
            </fieldset>
          ) : (
            <label className="text-answer">
              <span>输入答案</span>
              <input
                value={response}
                onChange={(event) => setResponse(event.target.value)}
                autoComplete="off"
              />
            </label>
          )}

          {usedHint ? (
            <p className="hint-text">提示：{exercise.explanation}</p>
          ) : null}
          {confirmNearMatch ? (
            <p className="near-match" role="alert">
              与目标答案只差一个字符。确认按当前拼写提交，或继续修改答案。
            </p>
          ) : null}
          {error ? <p role="alert">{error}</p> : null}

          <div className="exercise-actions">
            <button
              type="button"
              className="button button--secondary"
              disabled={usedHint}
              onClick={() => setUsedHint(true)}
            >
              使用提示
            </button>
            <button
              type="button"
              className="button button--primary"
              disabled={!response}
              onClick={() => void submit()}
            >
              {confirmNearMatch ? '确认当前拼写' : '提交答案'}
            </button>
          </div>
        </div>
      )}
    </aside>
  )
}
