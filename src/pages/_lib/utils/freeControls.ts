import type ReTina from '@ReTina'
import keyboardListener from './keyboardListener'

export type FreeControlsOptions =
  | {
      blockZoom?: boolean
      blockY?: boolean
      speed?: number
      slowDown?: {
        x?: number
        y?: number
        z?: number
      }
      onSpace?: () => void
    }
  | undefined

function freeControls(rt: ReTina, options: FreeControlsOptions) {
  const canvas = rt.canvas
  canvas.style.cursor = 'grab'
  canvas.style.userSelect = 'none'
  canvas.style.touchAction = 'manipulation'

  let mousePressed = false
  let prevX: number
  let prevY: number

  function actionDown(coord: { x: number; y: number }) {
    mousePressed = true
    prevX = coord.x
    prevY = coord.y
  }

  document.addEventListener('mousedown', ({ clientX, clientY }) => {
    actionDown({ x: clientX, y: clientY })
    canvas.style.cursor = 'grabbing'
  })
  document.addEventListener('touchstart', ({ changedTouches }) => {
    const touch = changedTouches[0]
    actionDown({ x: touch.clientX, y: touch.clientY })
  })

  function actionMove(coord: { x: number; y: number }) {
    rt.camera.spherical.theta += (3 * (prevX - coord.x)) / window.innerWidth
    rt.camera.spherical.phi += (3 * (prevY - coord.y)) / window.innerHeight
    prevX = coord.x
    prevY = coord.y
  }

  document.addEventListener('mousemove', (event) => {
    if (!mousePressed) return
    actionMove({ x: event.clientX, y: event.clientY })
  })
  document.addEventListener('touchmove', (event) => {
    if (!mousePressed) return
    const touch = event.changedTouches[0]
    actionMove({ x: touch.clientX, y: touch.clientY })
  })

  document.addEventListener('mouseup', () => {
    mousePressed = false
    canvas.style.cursor = 'grab'
  })
  document.addEventListener('touchend', () => {
    mousePressed = false
  })

  document.addEventListener('wheel', (event) => {
    if (options?.blockZoom) return
    rt.camera.spherical.radius += event.deltaY * 0.001
  })

  const vel = [0, 0, 0]
  const acc = options?.speed ?? 0.002

  keyboardListener((move) => {
    const yAngle = rt.camera.spherical.theta

    if (move.UP && !options?.blockY) {
      vel[1] += acc
    }
    if (move.DOWN && !options?.blockY) {
      vel[1] -= acc
    }
    if (move.FRONT) {
      vel[0] -= acc * Math.sin(yAngle)
      vel[2] -= acc * Math.cos(yAngle)
    }
    if (move.BACK) {
      vel[0] += acc * Math.sin(yAngle)
      vel[2] += acc * Math.cos(yAngle)
    }
    if (move.LEFT) {
      vel[0] -= acc * Math.cos(yAngle)
      vel[2] += acc * Math.sin(yAngle)
    }
    if (move.RIGHT) {
      vel[0] += acc * Math.cos(yAngle)
      vel[2] -= acc * Math.sin(yAngle)
    }
    if (move.SPACE) {
      options?.onSpace?.()
    }

    rt.camera.pos.x += vel[0]
    if (!options?.blockY) rt.camera.pos.y += vel[1]
    rt.camera.pos.z += vel[2]

    vel[0] *= options?.slowDown?.x ?? 0.9
    if (!options?.blockY) vel[1] *= options?.slowDown?.y ?? 0.9
    vel[2] *= options?.slowDown?.z ?? 0.9
  })

  return {
    applyForce(force: { x?: number; y?: number; z?: number }) {
      vel[0] += force.x ?? 0
      vel[1] += force.y ?? 0
      vel[2] += force.z ?? 0
    },
    getVelocity() {
      return { x: vel[0], y: vel[1], z: vel[2] }
    },
    setVelocity(newVel: { x?: number; y?: number; z?: number }) {
      if (newVel.x !== undefined) vel[0] = newVel.x
      if (newVel.y !== undefined) vel[1] = newVel.y
      if (newVel.z !== undefined) vel[2] = newVel.z
    },
  }
}

export default freeControls
