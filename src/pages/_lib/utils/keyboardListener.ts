export type KeyState = {
  UP?: boolean
  DOWN?: boolean
  FRONT?: boolean
  BACK?: boolean
  LEFT?: boolean
  RIGHT?: boolean
  SPACE?: boolean
}

function keyboardListener(cb: (state: KeyState, dt: number) => void) {
  const codes: { [key: string]: boolean } = {}
  window.addEventListener('keydown', (event) => {
    event.preventDefault()
    codes[event.code] = true
  })
  window.addEventListener('keyup', (event) => {
    event.preventDefault()
    codes[event.code] = false
  })
  window.addEventListener('blur', () => {
    for (const key in codes) {
      codes[key] = false
    }
  })

  return function update(dt = 1 / 60) {
    cb(
      {
        UP: codes['KeyE'],
        DOWN: codes['KeyQ'],
        FRONT: codes['KeyW'],
        BACK: codes['KeyS'],
        LEFT: codes['KeyA'],
        RIGHT: codes['KeyD'],
        SPACE: codes['Space'],
      },
      dt
    )
  }
}

export default keyboardListener
