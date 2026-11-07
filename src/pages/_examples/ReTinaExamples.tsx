import { useMemo, useState } from 'preact/compat'
import type { ReTinaExample } from './types'
import hljs from 'highlight.js/lib/core'
import 'highlight.js/styles/atom-one-dark.min.css'

import javascript from 'highlight.js/lib/languages/javascript'
import LeftPanel from './LeftPanel'
import RightPanel from './RightContent'

hljs.registerLanguage('javascript', javascript)

const parseSketch = (code: string) => {
  const libUrl = import.meta.env.DEV
    ? `${window.location.origin}/lib.js`
    : 'https://moloxe.github.io/re-tina/lib.js'
  return code.replaceAll('@ReTina', libUrl)
}

type Props = {
  examples: ReTinaExample[]
}

const ReTinaExamples = ({ examples }: Props) => {
  const [currentExample, setCurrentExample] = useState(0)
  const example = examples[currentExample]
  const code = parseSketch(example.sketch)

  const sketch = useMemo(() => {
    return hljs.highlight(code, {
      language: 'javascript',
    }).value
  }, [example])

  if (!example) return null

  return (
    <main class="m-auto flex w-full max-w-3xl flex-col justify-center gap-6 p-2 pt-8 md:max-w-6xl md:flex-row">
      <LeftPanel
        currentExample={currentExample}
        examples={examples}
        setCurrentExample={(v) => setCurrentExample(v)}
      />
      <RightPanel code={code} example={example} sketch={sketch} />
    </main>
  )
}

export default ReTinaExamples
