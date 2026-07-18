import { validateContentPack } from '../../src/core/content/validate-pack'
import { BUILTIN_PACKS } from '../../src/data/packs/index'

const problems: string[] = []

for (const pack of BUILTIN_PACKS) {
  for (const violation of validateContentPack(pack)) {
    problems.push(`${pack.id}: ${violation.path}: ${violation.message}`)
  }

  for (const unit of pack.units) {
    if (unit.type !== 'vocab') continue
    if (!unit.acceptedMeanings?.some((meaning) => meaning.trim().length > 0)) {
      problems.push(`${pack.id}: ${unit.id}: acceptedMeanings must not be empty`)
    }
    if (!unit.phonetic || !unit.partOfSpeech || !unit.example || !unit.exampleZh) {
      problems.push(`${pack.id}: ${unit.id}: enrichment fields are incomplete`)
    }
    if (!unit.source.name || !unit.source.license) {
      problems.push(`${pack.id}: ${unit.id}: source name and license are required`)
    }
  }

  for (const exercise of pack.exercises) {
    if (
      exercise.answer.kind === 'text' &&
      !exercise.answer.accepted.some((answer) => answer.trim().length > 0)
    ) {
      problems.push(`${pack.id}: ${exercise.id}: accepted answers must not be empty`)
    }
    if (exercise.answer.kind === 'choice') {
      const correctOptionId = exercise.answer.correctOptionId
      if (exercise.options?.length !== 4) {
        problems.push(`${pack.id}: ${exercise.id}: choice exercise needs four options`)
      }
      if (
        !exercise.options?.some(
          (option) => option.id === correctOptionId,
        )
      ) {
        problems.push(`${pack.id}: ${exercise.id}: correct option is missing`)
      }
    }
  }
}

if (problems.length > 0) {
  throw new Error(`Content validation failed:\n${problems.join('\n')}`)
}

const unitCount = BUILTIN_PACKS.reduce((sum, pack) => sum + pack.units.length, 0)
const exerciseCount = BUILTIN_PACKS.reduce(
  (sum, pack) => sum + pack.exercises.length,
  0,
)
console.log(
  `Validated ${BUILTIN_PACKS.length} built-in pack(s), ${unitCount} units, and ${exerciseCount} exercises.`,
)
