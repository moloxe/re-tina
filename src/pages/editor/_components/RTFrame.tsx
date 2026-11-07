import { useEffect, useRef, useState } from 'preact/hooks'
import { useEditor } from '../_store/editor'

function parseCode(code: string, hash: number) {
  return `
    <!doctype html>
    <html>
        <head>
            <meta charset="UTF-8" />
            <meta name="viewport" content="width=device-width" />
            <meta name="robots" content="noindex, nofollow" />
            <meta name="hash" content=${hash} />
            <style>
                html {
                    overflow: hidden;
                    background-color: black;
                }
                canvas {
                    margin: auto;
                }
            </style>
        </head>
        <body>
            <script type="module">${code}</script>
        </body>
    </html>`
}

const RTFrame = () => {
  const iframeRef = useRef(null)
  const editor = useEditor()
  const currentCode = editor.example ? editor.code[editor.example] : ''
  const [playingCode, setPlayingCode] = useState(parseCode(currentCode, 0))

  useEffect(() => {
    const id = setTimeout(() => {
      setPlayingCode(parseCode(currentCode, editor.lastUpdate ?? 0))
    }, 500)

    return () => {
      clearTimeout(id)
    }
  }, [currentCode, editor.lastUpdate])

  return (
    <div class="flex flex-3 flex-col border-l border-white">
      <div id="iframe-container" class="flex-2 bg-black">
        {currentCode && (
          <iframe
            ref={iframeRef}
            class="h-full w-full"
            srcDoc={playingCode}
          ></iframe>
        )}
      </div>
      <div class="flex-1"></div>
    </div>
  )
}

export default RTFrame
