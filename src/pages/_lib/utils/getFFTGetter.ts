async function generateFFTGetter(bufferSize: number) {
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: {
      echoCancellation: false,
      noiseSuppression: false,
      autoGainControl: false,
    },
  })

  const audioCtx = new window.AudioContext()
  const source = audioCtx.createMediaStreamSource(stream)
  const analyser = audioCtx.createAnalyser()

  analyser.fftSize = bufferSize * 2 // fftSize debe ser el doble para obtener 'bufferSize' bins
  const bufferLength = analyser.frequencyBinCount // Exactamente igual a bufferSize
  const dataArray = new Uint8Array(bufferLength)

  source.connect(analyser)

  function getFFTBuffer() {
    analyser.getByteFrequencyData(dataArray)
    return dataArray
  }

  return getFFTBuffer
}

type Props = {
  bufferSize?: number
}

type ReturnType = () => Uint8Array<ArrayBuffer>

const getFFTGetter = async ({
  bufferSize,
}: Props = {}): Promise<ReturnType> => {
  try {
    if (navigator.mediaDevices) {
      const getter = await generateFFTGetter(bufferSize ?? 256)
      return getter
    }
    const instructionEl = document.createElement('div')
    instructionEl.innerHTML = `
      <p style="color: #fff; font-size: 1.4rem;">
        Click anywhere to enable microphone recording.
      </p>`
    document.body.appendChild(instructionEl)

    const promise = new Promise<ReturnType>((res) => {
      document.addEventListener(
        'click',
        async () => {
          instructionEl.remove()
          const getter = await generateFFTGetter(bufferSize ?? 256)
          res(getter)
        },
        { once: true }
      )
    })
    return promise
  } catch (err) {
    console.error('Error al acceder al micrófono:', err)
    throw err
  }
}

export default getFFTGetter
