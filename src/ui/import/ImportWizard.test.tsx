import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { validateContentPack } from '../../core/content/validate-pack'
import type { ContentPack, VocabularyUnit } from '../../core/learning/model'
import { CET4_MVP_PACK } from '../../data/packs'
import { ImportWizard } from './ImportWizard'

describe('ImportWizard', () => {
  it('parses, maps, manually completes, previews, and saves a pasted word list', async () => {
    const user = userEvent.setup()
    let savedPack: ContentPack | undefined
    const onSave = vi.fn(async (pack: ContentPack) => {
      savedPack = pack
      return { ok: true }
    })
    const onDone = vi.fn()
    render(
      <ImportWizard
        dictionaryUnits={CET4_MVP_PACK.units.filter(
          (unit): unit is VocabularyUnit => unit.type === 'vocab',
        )}
        onSave={onSave}
        onDone={onDone}
        onCancel={vi.fn()}
      />,
    )

    await user.type(screen.getByLabelText('词表名称'), '课堂词表')
    await user.type(
      screen.getByLabelText('带表头的词表内容'),
      'word,meaning\nabandon,放弃\nmystery,',
    )
    await user.click(screen.getByRole('button', { name: '解析词表' }))

    expect(screen.getByText(/识别为 CSV/)).toBeInTheDocument()
    expect(screen.getByLabelText('英文词汇（必填）')).toHaveValue('0')
    expect(screen.getByLabelText('中文释义')).toHaveValue('1')
    expect(screen.getByRole('table')).toHaveTextContent('mystery')
    await user.click(screen.getByRole('button', { name: '检查与补全' }))

    expect(screen.getByRole('heading', { name: '处理多义词与缺失释义' })).toBeInTheDocument()
    await user.type(screen.getByLabelText('或手工填写中文释义'), '谜；神秘事物')
    await user.click(screen.getByRole('button', { name: '生成确认预览' }))

    const stats = screen.getByLabelText('导入统计')
    expect(within(stats).getByText('新增').parentElement).toHaveTextContent('2')
    expect(within(stats).getByText('Pending').parentElement).toHaveTextContent('0')
    await user.click(screen.getByRole('button', { name: '确认并保存词表' }))

    expect(await screen.findByRole('heading', { name: /课堂词表.*已保存/ })).toBeInTheDocument()
    expect(onSave).toHaveBeenCalledOnce()
    expect(savedPack?.units).toHaveLength(2)
    expect(savedPack ? validateContentPack(savedPack) : ['missing']).toEqual([])
    await user.click(screen.getByRole('button', { name: '返回主页选择词表' }))
    expect(onDone).toHaveBeenCalledOnce()
  })
})
