import type { ReTinaExample } from './types'

type Props = {
  example: ReTinaExample
  code: string
  sketch: string
}

const RightPanel = ({ example, code, sketch }: Props) => {
  const routeUrl = `${import.meta.env.DEV ? '' : '/re-tina'}/${example.route}`

  return (
    <div className="flex flex-2 flex-col gap-6">
      <iframe src={routeUrl} height="400" width="100%" />
      <h3>
        {example.route}:{' '}
        <a
          href={routeUrl}
          className="text-primary ml-auto w-fit underline md:ml-0"
          target="_blank"
        >
          Open fullscreen ↗️
        </a>
      </h3>
      <pre className="relative bg-[#282c34]">
        <button
          className="absolute top-2 right-2 rounded border bg-[#282c34] px-2 text-sm"
          onClick={(ev) => {
            const button = ev.target as HTMLButtonElement
            button.innerText = 'Copied!'
            navigator.clipboard.writeText(code)
            setTimeout(() => {
              button.innerText = 'Copy'
            }, 2000)
          }}
        >
          Copy
        </button>
        <code
          className="hljs language-javascript overflow-x-auto text-xs whitespace-pre"
          dangerouslySetInnerHTML={{
            __html: sketch,
          }}
        ></code>
      </pre>
    </div>
  )
}

export default RightPanel
