import type { Exercise } from './model'
import {
  editDistance,
  normalizeDisplayText,
  normalizeMatchText,
} from './normalize-text'

export type AnswerEvaluation =
  | { readonly status: 'correct' }
  | { readonly status: 'incorrect' }
  | { readonly status: 'needs-confirmation' }

export function evaluateAnswer(
  exercise: Exercise,
  response: string | readonly string[],
): AnswerEvaluation {
  if (exercise.answer.kind === 'choice') {
    return {
      status: response === exercise.answer.correctOptionId ? 'correct' : 'incorrect',
    }
  }

  if (exercise.answer.kind === 'text' && typeof response === 'string') {
    const normalize = exercise.answer.caseSensitive
      ? normalizeDisplayText
      : normalizeMatchText
    const normalizedResponse = normalize(response)
    const matches = exercise.answer.accepted.some(
      (accepted) => normalize(accepted) === normalizedResponse,
    )

    if (matches) {
      return { status: 'correct' }
    }

    const nearMatch =
      normalizedResponse.length >= 3 &&
      exercise.answer.accepted.some(
        (accepted) =>
          editDistance(normalizeMatchText(response), normalizeMatchText(accepted)) === 1,
      )

    return { status: nearMatch ? 'needs-confirmation' : 'incorrect' }
  }

  if (exercise.answer.kind === 'token-order' && Array.isArray(response)) {
    const normalizedResponse = response.map(normalizeMatchText)
    const matches = exercise.answer.acceptedOrders.some(
      (acceptedOrder) =>
        acceptedOrder.length === normalizedResponse.length &&
        acceptedOrder.every(
          (token, index) => normalizeMatchText(token) === normalizedResponse[index],
        ),
    )

    return { status: matches ? 'correct' : 'incorrect' }
  }

  return { status: 'incorrect' }
}
