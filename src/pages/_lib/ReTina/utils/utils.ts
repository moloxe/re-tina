export function resizeCanvas(canvas: HTMLCanvasElement, _height?: number) {
  const height = _height ?? window.innerHeight
  const width = height * (window.innerWidth / window.innerHeight)
  canvas.height = Math.max(1, height)
  canvas.width = Math.max(1, width)
}

export function dumbFsCanvas(
  height?: number,
  transparent?: boolean,
  imageRendering?: string
) {
  const canvas = document.createElement('canvas')
  resizeCanvas(canvas, height)

  canvas.style.position = 'fixed'
  canvas.style.top = '50%'
  canvas.style.left = '50%'
  canvas.style.transform = 'translate(-50%, -50%)'
  canvas.style.width = '100svw'
  canvas.style.height = '100svh'

  if (transparent) {
    canvas.style.pointerEvents = 'none'
  }

  if (imageRendering) {
    canvas.style.imageRendering = imageRendering
  } else if (height && height < window.innerHeight) {
    canvas.style.imageRendering = 'pixelated'
  }

  document.body.appendChild(canvas)

  return canvas
}
