async function loadImage(iurl: string) {
  const img = document.createElement('img')
  img.src = iurl
  await img.decode()

  const imageCanvas = document.createElement('canvas')
  imageCanvas.width = img.width
  imageCanvas.height = img.height
  const imageCanvasContext = imageCanvas.getContext('2d')

  if (!imageCanvasContext) throw new Error('No canvas context found')

  imageCanvasContext.drawImage(img, 0, 0, imageCanvas.width, imageCanvas.height)
  const imageData = imageCanvasContext.getImageData(
    0,
    0,
    imageCanvas.width,
    imageCanvas.height
  )

  const textureData = new Uint8Array(img.width * img.height * 4)
  for (let x = 0; x < img.width * img.height * 4; x++) {
    textureData[x] = imageData.data[x]
  }

  return { textureData, width: img.width, height: img.height }
}

export default loadImage
