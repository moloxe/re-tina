import type { ReTinaExample } from '../_examples/types'

export async function loadExamples() {
  const files = import.meta.glob('@src/pages/_sketches/*.ts', {
    eager: false,
    query: '?raw',
  })

  const paths = Object.keys(files)
  const examples: ReTinaExample[] = []
  const libUrl = import.meta.env.DEV
    ? '/lib.js'
    : 'https://moloxe.github.io/re-tina/lib.js'
  const imgUrl = import.meta.env.DEV
    ? '/img/tina.jpeg'
    : 'https://moloxe.github.io/re-tina/img/tina.jpeg'

  for (let index = 0; index < paths.length; index++) {
    const path = paths[index]
    const route = path.split('/').pop()?.replace('.ts', '') ?? ''
    let sketch = ((await files[path]()) as any).default as string
    sketch = sketch.replaceAll('@ReTina', libUrl)
    sketch = sketch.replaceAll('/img/tina.jpeg', imgUrl)
    examples.push({ route, sketch })
  }

  return examples
}
