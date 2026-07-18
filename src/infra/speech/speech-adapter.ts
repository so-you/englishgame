import { err, ok, type Result } from '../../core/shared/result'

export interface SpeechError {
  readonly code: 'unsupported' | 'english-voice-unavailable' | 'playback-failed'
  readonly message: string
}

export interface SpeechCapability {
  readonly available: boolean
  readonly status: 'ready' | 'voices-loading' | 'unsupported' | 'no-english-voice'
}

export interface SpeechAdapter {
  capability(): SpeechCapability
  speak(text: string): Promise<Result<void, SpeechError>>
}

interface SpeechDependencies {
  readonly synthesis?: SpeechSynthesis
  readonly createUtterance?: (text: string) => SpeechSynthesisUtterance
}

export function createSpeechAdapter(
  dependencies: SpeechDependencies,
): SpeechAdapter {
  const capability = (): SpeechCapability => {
    if (!dependencies.synthesis || !dependencies.createUtterance) {
      return { available: false, status: 'unsupported' }
    }
    const voices = dependencies.synthesis.getVoices()
    if (voices.length === 0) {
      return { available: true, status: 'voices-loading' }
    }
    return voices.some((voice) => voice.lang.toLowerCase().startsWith('en'))
      ? { available: true, status: 'ready' }
      : { available: false, status: 'no-english-voice' }
  }

  return {
    capability,
    speak: (text) => {
      const state = capability()
      if (!state.available || !dependencies.synthesis || !dependencies.createUtterance) {
        return Promise.resolve(
          err({
            code:
              state.status === 'no-english-voice'
                ? 'english-voice-unavailable'
                : 'unsupported',
            message:
              state.status === 'no-english-voice'
                ? '设备没有可用的英语语音。'
                : '当前浏览器不支持语音播放。',
          }),
        )
      }

      return new Promise((resolve) => {
        try {
          const utterance = dependencies.createUtterance!(text)
          const englishVoice = dependencies.synthesis!.getVoices().find((voice) =>
            voice.lang.toLowerCase().startsWith('en'),
          )
          utterance.lang = englishVoice?.lang ?? 'en-US'
          if (englishVoice) utterance.voice = englishVoice
          utterance.onend = () => resolve(ok(undefined))
          utterance.onerror = () =>
            resolve(
              err({
                code: 'playback-failed',
                message: '发音播放失败，可以继续阅读音标和例句。',
              }),
            )
          dependencies.synthesis!.cancel()
          dependencies.synthesis!.speak(utterance)
        } catch {
          resolve(
            err({
              code: 'playback-failed',
              message: '发音播放失败，可以继续阅读音标和例句。',
            }),
          )
        }
      })
    },
  }
}

export function createBrowserSpeechAdapter(): SpeechAdapter {
  const synthesis =
    typeof window !== 'undefined' && 'speechSynthesis' in window
      ? window.speechSynthesis
      : undefined
  const createUtterance =
    typeof SpeechSynthesisUtterance === 'function'
      ? (text: string) => new SpeechSynthesisUtterance(text)
      : undefined
  return createSpeechAdapter({ synthesis, createUtterance })
}
