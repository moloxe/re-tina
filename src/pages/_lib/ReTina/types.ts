export type RTCoord = {
  x: number
  y: number
  z: number
}

export type RTColor = {
  r: number
  g: number
  b: number
}

type Spherical = {
  radius: number
  theta: number
  phi: number
}

export type RTMaterialPartial = {
  sdFunc: string
  lightFunc?: string
  pos?: RTCoord
  color?: RTColor
  rotation?: RTCoord
  enableCollisions?: boolean
}

export type RTMaterialFuncs = {
  sdFunc: string
  lightFunc?: string
}

export type RenderProps = {
  camera: RTCamera
}

export type RTCamera = {
  pos: RTCoord
  spherical: Spherical
  fov: number
}

export type RTTex = {
  width: number
  height: number
}

export type RTBufferType = {
  size: number
}

export type RTRaymarchOptions = {
  maxSteps?: number
  maxDist?: number
  pixelEps?: number
  relaxation?: number
  coneTile?: number | false
  aoSamples?: number
  debugSteps?: boolean
}
