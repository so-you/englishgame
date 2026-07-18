interface RecallFeedbackProps {
  readonly correct: boolean
  readonly explanation: string
  readonly onDone: () => void
}

export function RecallFeedback({
  correct,
  explanation,
  onDone,
}: RecallFeedbackProps) {
  return (
    <div className="recall-feedback" role="status" aria-live="polite">
      <strong>{correct ? '回答正确' : '这次没有答对'}</strong>
      <p>{explanation}</p>
      <button type="button" className="button button--primary" onClick={onDone}>
        返回战斗
      </button>
    </div>
  )
}
