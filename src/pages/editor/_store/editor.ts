import { persistentJSON } from '@nanostores/persistent'
import { useStore } from '@nanostores/react'
import { loadExamples } from '../../_utils/loadExamples'

const examples = await loadExamples()

type Editor = {
  example: string | null
  code: Record<string, string>
  lastUpdate?: number
}

const $editor = persistentJSON<Editor>('rt-editor', {
  example: examples[0].route,
  code: examples.reduce(
    (acc, example) => {
      acc[example.route] = example.sketch
      return acc
    },
    {} as Record<string, string>
  ),
  lastUpdate: 0,
})

export function setEditor(editor: Editor) {
  $editor.set({ ...editor, lastUpdate: performance.now() })
}

export function useEditor() {
  const editor = useStore($editor)
  return editor
}
