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

  const update = keyboardListener((move, dt) => {
    // Normalize dt to 60 FPS reference so existing speed/slowDown values keep their exact feel
    const dtScale = dt * 60
    const yAngle = rt.camera.spherical.theta

    let ax = 0
    let ay = 0
    let az = 0

    if (move.UP && !options?.blockY) {
      ay += acc
    }
    if (move.DOWN && !options?.blockY) {
      ay -= acc
    }
    if (move.FRONT) {
      ax -= acc * Math.sin(yAngle)
      az -= acc * Math.cos(yAngle)
    }
    if (move.BACK) {
      ax += acc * Math.sin(yAngle)
      az += acc * Math.cos(yAngle)
    }
    if (move.LEFT) {
      ax -= acc * Math.cos(yAngle)
      az += acc * Math.sin(yAngle)
    }
    if (move.RIGHT) {
      ax += acc * Math.cos(yAngle)
      az -= acc * Math.sin(yAngle)
    }
    if (move.SPACE) {
      options?.onSpace?.()
    }

    const dampX = options?.slowDown?.x ?? 0.9
    const dampY = options?.slowDown?.y ?? 0.9
    const dampZ = options?.slowDown?.z ?? 0.9

    const stepVel = (v: number, a: number, s: number) => {
      if (s >= 1) return v + a * dtScale
      const sPow = Math.pow(s, dtScale)
      return v * sPow + (a * s * (1 - sPow)) / (1 - s)
    }

    const nextVx = stepVel(vel[0], ax, dampX)
    const nextVy = options?.blockY ? vel[1] : stepVel(vel[1], ay, dampY)
    const nextVz = stepVel(vel[2], az, dampZ)

    const dampFactorX = dampX < 1 ? dampX : 1
    const dampFactorY = dampY < 1 ? dampY : 1
    const dampFactorZ = dampZ < 1 ? dampZ : 1

    rt.camera.pos.x += (nextVx / dampFactorX) * dtScale
    if (!options?.blockY) rt.camera.pos.y += (nextVy / dampFactorY) * dtScale
    rt.camera.pos.z += (nextVz / dampFactorZ) * dtScale

    vel[0] = nextVx
    if (!options?.blockY) vel[1] = nextVy
    vel[2] = nextVz
  })

  return {
    update,
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
