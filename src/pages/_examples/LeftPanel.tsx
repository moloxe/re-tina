import type { ReTinaExample } from './types'
import ReTinaImg from './../_assets/re-tina.jpeg'

type Props = {
  examples: ReTinaExample[]
  currentExample: number
  setCurrentExample: (v: number) => void
}

const LeftPanel = ({ examples, currentExample, setCurrentExample }: Props) => {
  const editorUrl = `${import.meta.env.DEV ? '' : '/re-tina'}/editor`

  return (
    <div className="flex flex-1 w-full flex-col gap-6 md:w-64 md:shrink-0">
      <div class="flex flex-col">
        <img
          src={ReTinaImg.src}
          alt="ReTina logo"
          className="w-full rounded-lg min-h-32"
        />
        <a
          class="text-primary w-fit ml-auto mr-2 text-sm"
          target="_blank"
          href={editorUrl}
        >
          Open editor
        </a>
      </div>

      <div>
        ReTina, a simple raymarch engine. It also works well as a tool for
        interactive shaders.
      </div>

      <div>See some examples:</div>

      <div className="block w-full md:hidden">
        <select
          className="w-full"
          value={currentExample}
          onChange={(e) => setCurrentExample(Number(e.currentTarget.value))}
        >
          {examples.map((example, index) => (
            <option key={example.route} value={index}>
              {example.route}
            </option>
          ))}
        </select>
      </div>

      <div className="hidden flex-col gap-x-2 md:flex">
        {examples.map((example, index) => {
          const isCurrent = index === currentExample
          const id = `sketch${index}`
          return (
            <label class="mb-2 flex gap-2" key={example.route} for={id}>
              <input
                type="radio"
                id={id}
                value={index}
                checked={currentExample === index}
                onClick={() => {
                  setCurrentExample(index)
                }}
                className={'underline' + (isCurrent ? 'text-primary' : '')}
              />
              {example.route}
            </label>
          )
        })}
      </div>
    </div>
  )
}

export default LeftPanel
