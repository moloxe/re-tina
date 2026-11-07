import type ReTina from '../ReTina'
import type { RTColor, RTCoord, RTMaterialPartial } from '../types'

type Props = {
  material: RTMaterialPartial
  rt: ReTina
  index: number
  enableCollisions?: boolean
}

class RTMaterial {
  setPos: (p: Partial<RTCoord>) => void
  getPos: () => RTCoord
  setRot: (r: Partial<RTCoord>) => void
  setColor: (c: Partial<RTColor>) => void
  setCollisionGroup: (cg: number) => void
  checkForCollisions?: () => void
  private collisionGroup: number = -1
  private index: number
  private rt: ReTina

  constructor({ material, rt, index }: Props) {
    this.rt = rt
    if (!material.pos) material.pos = { x: 0, y: 0, z: 0 }
    if (!material.color) material.color = { r: 1, g: 1, b: 1 }
    if (!material.rotation) material.rotation = { x: 0, y: 0, z: 0 }

    const { set: setPosX, get: getPosX } = rt.registerUniform(
      `material${index}Px`,
      material.pos.x
    )
    const { set: setPosY, get: getPosY } = rt.registerUniform(
      `material${index}Py`,
      material.pos.y
    )
    const { set: setPosZ, get: getPosZ } = rt.registerUniform(
      `material${index}Pz`,
      material.pos.z
    )

    this.getPos = () => ({
      x: getPosX(),
      y: getPosY(),
      z: getPosZ(),
    })

    this.setPos = (pos: Partial<RTCoord>) => {
      if (pos.x !== undefined) setPosX(pos.x)
      if (pos.y !== undefined) setPosY(pos.y)
      if (pos.z !== undefined) setPosZ(pos.z)
    }

    const setRotX = rt.registerUniform(
      `material${index}Rx`,
      material.rotation.x
    ).set
    const setRotY = rt.registerUniform(
      `material${index}Ry`,
      material.rotation.y
    ).set
    const setRotZ = rt.registerUniform(
      `material${index}Rz`,
      material.rotation.z
    ).set

    this.setRot = (rot: Partial<RTCoord>) => {
      if (rot.x !== undefined) setRotX(rot.x)
      if (rot.y !== undefined) setRotY(rot.y)
      if (rot.z !== undefined) setRotZ(rot.z)
    }

    const setColorR = rt.registerUniform(
      `material${index}Cr`,
      material.color.r
    ).set
    const setColorG = rt.registerUniform(
      `material${index}Cg`,
      material.color.g
    ).set
    const setColorB = rt.registerUniform(
      `material${index}Cb`,
      material.color.b
    ).set

    this.setColor = (color: Partial<RTColor>) => {
      if (color.r !== undefined) setColorR(color.r)
      if (color.g !== undefined) setColorG(color.g)
      if (color.b !== undefined) setColorB(color.b)
    }

    if (material.enableCollisions) {
      this.collisionGroup = index
    }

    this.setCollisionGroup = rt.registerUniform(
      `material${index}CollisionGroup`,
      this.collisionGroup
    ).set

    this.index = index
  }

  checkCollision(pos?: { x: number; y: number; z: number }) {
    return this.rt.checkCollision(this.index, pos)
  }

  getIndex() {
    return this.index
  }
}

export default RTMaterial
