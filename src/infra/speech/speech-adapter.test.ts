import { describe, expect, it, vi } from 'vitest'

import { createSpeechAdapter } from './speech-adapter'

function utterance() {
  return {
    lang: '',
    voice: null,
    onend: null,
    onerror: null,
  } as unknown as SpeechSynthesisUtterance
}

describe('speech adapter', () => {
  it('reports unsupported and missing-English-voice states', () => {
    expect(createSpeechAdapter({}).capability()).toEqual({
      available: false,
      status: 'unsupported',
    })
    const synthesis = {
      getVoices: () => [{ lang: 'zh-CN' }],
      cancel: vi.fn(),
      speak: vi.fn(),
    } as unknown as SpeechSynthesis
    expect(
      createSpeechAdapter({ synthesis, createUtterance: utterance }).capability(),
    ).toEqual({ available: false, status: 'no-english-voice' })
  })

  it('selects an English voice and resolves successful playback', async () => {
    const voice = { lang: 'en-GB' } as SpeechSynthesisVoice
    let spoken: SpeechSynthesisUtterance | undefined
    const synthesis = {
      getVoices: () => [voice],
      cancel: vi.fn(),
      speak: (value: SpeechSynthesisUtterance) => {
        spoken = value
        value.onend?.({} as SpeechSynthesisEvent)
      },
    } as unknown as SpeechSynthesis
    const adapter = createSpeechAdapter({ synthesis, createUtterance: utterance })

    expect(await adapter.speak('abandon')).toEqual({ ok: true, value: undefined })
    expect(spoken).toMatchObject({ lang: 'en-GB', voice })
  })

  it('turns playback failures into a recoverable result', async () => {
    const synthesis = {
      getVoices: () => [],
      cancel: vi.fn(),
      speak: (value: SpeechSynthesisUtterance) => value.onerror?.({} as SpeechSynthesisErrorEvent),
    } as unknown as SpeechSynthesis
    const result = await createSpeechAdapter({
      synthesis,
      createUtterance: utterance,
    }).speak('abandon')

    expect(result).toMatchObject({
      ok: false,
      error: { code: 'playback-failed' },
    })
  })
})
