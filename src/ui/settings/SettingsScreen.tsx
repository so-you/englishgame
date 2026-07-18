import { useEffect, useRef, useState } from 'react'

import type { UserSettings } from '../../infra/indexeddb/schema'

interface ActionResult {
  readonly ok: boolean
  readonly error?: { readonly message: string }
}

interface SettingsScreenProps {
  readonly settings: UserSettings
  readonly onUpdate: (
    patch: Partial<Omit<UserSettings, 'id' | 'newUnitQuota'>>,
  ) => Promise<ActionResult>
  readonly onExport: () => Promise<ActionResult>
  readonly onReset: () => Promise<ActionResult>
  readonly onBack: () => void
}

export function SettingsScreen({
  settings,
  onUpdate,
  onExport,
  onReset,
  onBack,
}: SettingsScreenProps) {
  const [status, setStatus] = useState<string>()
  const [confirmingReset, setConfirmingReset] = useState(false)
  const resetButtonRef = useRef<HTMLButtonElement>(null)
  const confirmRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (confirmingReset) confirmRef.current?.focus()
  }, [confirmingReset])

  const update = async (
    patch: Partial<Omit<UserSettings, 'id' | 'newUnitQuota'>>,
  ) => {
    const result = await onUpdate(patch)
    setStatus(result.ok ? '设置已保存。' : result.error?.message ?? '设置保存失败。')
  }

  return (
    <main className="screen settings-screen">
      <header className="screen-header">
        <div>
          <p className="eyebrow">体验与数据</p>
          <h1>设置</h1>
          <p>设置保存在当前浏览器，不需要账号。</p>
        </div>
        <button type="button" className="button button--quiet" onClick={onBack}>
          返回主页
        </button>
      </header>

      <section className="settings-panel" aria-labelledby="experience-title">
        <h2 id="experience-title">学习体验</h2>
        <label className="toggle-row">
          <span><strong>减少动画</strong><small>关闭非必要的移动与过渡效果</small></span>
          <input
            type="checkbox"
            checked={settings.reducedMotion}
            onChange={(event) => void update({ reducedMotion: event.target.checked })}
          />
        </label>
        <label className="toggle-row">
          <span><strong>显示软计时提示</strong><small>只提示用时，不把速度作为硬失败条件</small></span>
          <input
            type="checkbox"
            checked={settings.showTimingHints}
            onChange={(event) => void update({ showTimingHints: event.target.checked })}
          />
        </label>
        <label className="toggle-row">
          <span><strong>启用英语发音</strong><small>设备不支持语音时自动回退为非听力题</small></span>
          <input
            type="checkbox"
            checked={settings.speechEnabled}
            onChange={(event) => void update({ speechEnabled: event.target.checked })}
          />
        </label>
      </section>

      <section className="settings-panel data-settings" aria-labelledby="storage-title">
        <div>
          <h2 id="storage-title">本地数据</h2>
          <p>可以随时导出 JSON 副本；重置会删除导入词表、复习状态、日志、设置和未完成会话。</p>
        </div>
        <div className="settings-buttons">
          <button
            type="button"
            className="button button--secondary"
            onClick={() => {
              void onExport().then((result) =>
                setStatus(result.ok ? '学习数据已导出。' : result.error?.message ?? '导出失败。'),
              )
            }}
          >
            导出全部数据
          </button>
          <button
            ref={resetButtonRef}
            type="button"
            className="button button--danger"
            onClick={() => setConfirmingReset(true)}
          >
            重置全部数据
          </button>
        </div>

        {confirmingReset ? (
          <div className="danger-confirm" role="alertdialog" aria-labelledby="reset-title">
            <div>
              <strong id="reset-title">确定永久删除所有本地学习数据？</strong>
              <p>此操作无法撤销。建议先导出备份。</p>
            </div>
            <button
              type="button"
              className="button button--quiet"
              onClick={() => {
                setConfirmingReset(false)
                queueMicrotask(() => resetButtonRef.current?.focus())
              }}
            >
              取消
            </button>
            <button
              ref={confirmRef}
              type="button"
              className="button button--danger"
              onClick={() => {
                void onReset().then((result) => {
                  if (!result.ok) {
                    setStatus(result.error?.message ?? '重置失败。')
                    setConfirmingReset(false)
                  }
                })
              }}
            >
              确认永久删除
            </button>
          </div>
        ) : null}
        {status ? <p role="status">{status}</p> : null}
      </section>
    </main>
  )
}
