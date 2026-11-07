import type ReTina from '../ReTina/ReTina'
import freeControls, { type FreeControlsOptions } from './freeControls'
import type RTMaterial from '../ReTina/utils/rt-material'

export type ThirdPersonControlsOptions = {
  initPos?: { x: number; y: number; z: number }
  radius?: number
  theta?: number
  fov?: number
  speed?: number
  slowDown?: {
    x?: number
    y?: number
    z?: number
  }
  gravity?: number
  jumpForce?: number
  terminalVel?: number
  floorSkin?: number
  wallSkin?: number
  groundDot?: number
  ceilingDot?: number
  respawnY?: number
  sdFunc?: string
  lightFunc?: string
}

export function thirdPersonControls(
  rt: ReTina,
  options?: ThirdPersonControlsOptions
) {
  const initPos = Object.freeze({
    x: options?.initPos?.x ?? rt.camera.pos.x ?? 0,
    y: options?.initPos?.y ?? rt.camera.pos.y ?? 2,
    z: options?.initPos?.z ?? rt.camera.pos.z ?? 4,
  })

  rt.camera.pos = { ...initPos }
  rt.camera.spherical.radius = options?.radius ?? 2
  rt.camera.spherical.theta = options?.theta ?? 0.2
  if (options?.fov !== undefined) {
    rt.camera.fov = options.fov
  }

  const defaultSdFunc = /* wgsl */ `
    let camPos = vec3f(U.camPosX, U.camPosY, U.camPosZ);
    let offset = vec3f(0, -0.4, 0);
    let head = sdSphere(pos - camPos - offset, 0.3);
    let body = sdCapsule(pos - camPos - offset, vec3f(0, 0, 0), vec3f(0, -0.6, 0), 0.2);
    return opSmoothUnion(head, body, 0.2);
  `

  const player: RTMaterial = rt.registerMaterial({
    enableCollisions: true,
    sdFunc: options?.sdFunc ?? defaultSdFunc,
    lightFunc: options?.lightFunc,
  })

  const GRAVITY = options?.gravity ?? 0.003
  const JUMP_FORCE = options?.jumpForce ?? 0.08
  const TERMINAL_VEL = options?.terminalVel ?? -0.2
  const FLOOR_SKIN = options?.floorSkin ?? 0.2
  const WALL_SKIN = options?.wallSkin ?? 0.28
  const GROUND_DOT = options?.groundDot ?? 0.65
  const CEILING_DOT = options?.ceilingDot ?? -0.65

  let onGround = false
  let pendingCollision: Promise<void> | null = null

  const controls = rt.setControlsToFree({
    speed: options?.speed ?? 0.004,
    slowDown: options?.slowDown ?? { x: 0.88, y: 1, z: 0.88 },
    blockY: true,
    onSpace: () => {
      if (onGround) {
        controls.setVelocity({ y: JUMP_FORCE })
        onGround = false
      }
    },
  })

  type ColResult = Awaited<ReturnType<typeof player.checkCollision>>

  function applyResponse(
    result: ColResult,
    oldCam: { x: number; y: number; z: number }
  ) {
    const { materialIndex, collisionDist, collisionNormal: n } = result

    if (materialIndex === -1) return

    const isFloor = n.y > GROUND_DOT
    const isCeiling = n.y < CEILING_DOT
    const skin = isFloor ? FLOOR_SKIN : WALL_SKIN

    if (collisionDist >= skin) {
      if (isFloor && collisionDist > FLOOR_SKIN * 1.5) onGround = false
      return
    }

    const penetration = skin - collisionDist
    const correctedY = oldCam.y + n.y * penetration

    if (isFloor) {
      rt.camera.pos.y = Math.max(rt.camera.pos.y, correctedY)
    } else if (isCeiling) {
      rt.camera.pos.y = Math.min(rt.camera.pos.y, correctedY)
    } else {
      rt.camera.pos.y += n.y * penetration
    }

    rt.camera.pos.x += n.x * penetration
    rt.camera.pos.z += n.z * penetration

    const vel = controls.getVelocity()

    if (isFloor) {
      // ── Floor ──
      onGround = true
      player.setColor({ r: 0, g: 1, b: 0 })
      if (vel.y < 0) controls.setVelocity({ y: 0 })
    } else if (isCeiling) {
      // ── Ceiling ──
      onGround = false
      player.setColor({ r: 1, g: 0, b: 0 })
      if (vel.y > 0) controls.setVelocity({ y: 0 })
    } else {
      // ── Lateral wall ──
      player.setColor({ r: 0, g: 0, b: 1 })
      const dot = vel.x * n.x + vel.y * n.y + vel.z * n.z
      if (dot < 0) {
        controls.setVelocity({
          x: vel.x - dot * n.x,
          y: vel.y - dot * n.y,
          z: vel.z - dot * n.z,
        })
      }
    }
  }

  function update() {
    const cam = rt.camera.pos

    if (!onGround) {
      controls.applyForce({ y: -GRAVITY })
      const vel = controls.getVelocity()
      if (vel.y < TERMINAL_VEL) controls.setVelocity({ y: TERMINAL_VEL })
    } else {
      const vel = controls.getVelocity()
      if (vel.y < 0) controls.setVelocity({ y: 0 })
    }

    cam.y += controls.getVelocity().y

    if (options?.respawnY !== undefined && cam.y < options.respawnY) {
      rt.camera.pos = { ...initPos }
      controls.setVelocity({ x: 0, y: 0, z: 0 })
      onGround = false
      return
    }

    if (pendingCollision) return

    const oldCam = { x: cam.x, y: cam.y, z: cam.z }
    const feet = { x: cam.x, y: cam.y - 1.0, z: cam.z }
    const head = { x: cam.x, y: cam.y + 0.1, z: cam.z }

    pendingCollision = (async () => {
      const feetResult = await player.checkCollision(feet)
      const headResult = await player.checkCollision(head)

      const dominant =
        feetResult.collisionDist <= headResult.collisionDist
          ? feetResult
          : headResult

      const minDist = dominant.collisionDist
      if (dominant.materialIndex === -1 || minDist > WALL_SKIN) {
        player.setColor({ r: 1, g: 1, b: 1 })
      }

      applyResponse(dominant, oldCam)
      pendingCollision = null
    })().catch(() => {
      pendingCollision = null
    })
  }

  return {
    player,
    controls,
    update,
    getIsOnGround: () => onGround,
    resetPosition: () => {
      rt.camera.pos = { ...initPos }
      controls.setVelocity({ x: 0, y: 0, z: 0 })
      onGround = false
    },
  }
}

export default thirdPersonControls
