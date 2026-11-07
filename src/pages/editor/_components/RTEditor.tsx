import { useEffect, useMemo } from 'preact/hooks'
import { loadExamples } from '../../_utils/loadExamples'
import { setEditor, useEditor } from '../_store/editor'
import hljs from 'highlight.js/lib/core'
import typescript from 'highlight.js/lib/languages/typescript'
import 'highlight.js/styles/atom-one-dark.min.css'

hljs.registerLanguage('typescript', typescript)

const EXAMPLES = await loadExamples()
const TITLES = EXAMPLES.map((e) => e.route)

function RTEditor() {
  const editor = useEditor()
  const currentCode = editor.code[editor.example ?? ''] ?? ''

  function onChangeExample(e: any) {
    setEditor({
      example: e.target.value,
      code: editor.code,
    })
  }

  function onChangeCode(e: any) {
    if (!editor.example) return
    setEditor({
      example: editor.example,
      code: {
        ...editor.code,
        [editor.example]: e.target.value,
      },
    })
  }

  function onResetCode() {
    if (!editor.example) return
    const newCode = { ...editor.code }
    const currentExample = EXAMPLES.find(
      (example) => example.route === editor.example
    )
    newCode[editor.example] = currentExample?.sketch ?? ''
    setEditor({
      example: editor.example,
      code: newCode,
    })
  }

  const codeHtml = useMemo(() => {
    return hljs.highlight(currentCode, {
      language: 'typescript',
    }).value
  }, [currentCode])

  return (
    <div class="flex max-h-screen flex-2 flex-col overflow-hidden">
      <div class="flex border-b">
        <select
          id="examples"
          class="flex-1 rounded-none bg-transparent p-1 outline-none"
          value={editor.example ?? ''}
          onChange={onChangeExample}
        >
          {TITLES.map((title) => (
            <option value={title}>{title}</option>
          ))}
        </select>
        <button
          onClick={onResetCode}
          class="border-l px-3 py-1 text-xs text-white hover:bg-gray-100 hover:text-black"
        >
          Reset
        </button>
      </div>

      <div className="relative flex h-[calc(100vh-30px)] flex-1 overflow-auto bg-[#282c34]">
        <textarea
          class="absolute top-0 left-0 flex field-sizing-content w-full resize-none p-2 font-mono text-xs text-transparent caret-blue-500 outline-none"
          value={currentCode}
          onInput={onChangeCode}
          spellcheck={false}
        ></textarea>
        <pre class="mt-0">
          <code
            className="hljs language-javascript overflow-x-auto text-xs"
            dangerouslySetInnerHTML={{
              __html: codeHtml,
            }}
          ></code>
        </pre>
      </div>
    </div>
  )
}

export default RTEditor
