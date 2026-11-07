function keyboardListener(
  cb: (state: {
    UP?: boolean
    DOWN?: boolean
    FRONT?: boolean
    BACK?: boolean
    LEFT?: boolean
    RIGHT?: boolean
    SPACE?: boolean
  }) => void
) {
  const codes: { [key: string]: boolean } = {}
  window.addEventListener('keydown', (event) => {
    event.preventDefault()
    codes[event.code] = true
  })
  window.addEventListener('keyup', (event) => {
    event.preventDefault()
    codes[event.code] = false
  })
  function update() {
    cb({
      UP: codes['KeyE'],
      DOWN: codes['KeyQ'],
      FRONT: codes['KeyW'],
      BACK: codes['KeyS'],
      LEFT: codes['KeyA'],
      RIGHT: codes['KeyD'],
      SPACE: codes['Space'],
    })
    requestAnimationFrame(update)
  }
  update()
}

export default keyboardListener
