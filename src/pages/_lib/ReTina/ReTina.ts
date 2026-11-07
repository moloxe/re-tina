import type {
  RenderProps,
  RTCamera,
  RTMaterialFuncs,
  RTMaterialPartial,
  RTTex,
  RTBufferType,
  RTRaymarchOptions,
} from './types'
import getRender from './device/get-render'
import getDevice from './device/get-device'
import RTMaterial from './utils/rt-material'
import RTCollision from './utils/rt-collision'
import RTUniform from './utils/rt-uniform'
import RTLoop from './utils/rt-loop'
import { dumbFsCanvas, resizeCanvas } from './utils/utils'
import RTTexture from './utils/rt-texture'
import RTPingPong from './utils/rt-ping-pong'
import RTInterlacing from './utils/rt-interlacing'
import RTComputeScene from './utils/rt-compute-scene'
import RTBuffer from './utils/rt-buffer'
import freeControls, { type FreeControlsOptions } from '../utils/freeControls'
import thirdPersonControls, {
  type ThirdPersonControlsOptions,
} from '../utils/thirdPersonControls'

type Props = {
  height?: number
  main?: string
  functions?: string
  texs?: RTTex[]
  buffers?: RTBufferType[]
  usePrevFrameTex?: boolean
  useInterlacing?: boolean
  fps?: number
  showFps?: boolean
  transparent?: boolean
  imageRendering?: string
  raymarch?: RTRaymarchOptions
}

class ReTina {
  canvas: HTMLCanvasElement
  private main?: string
  private functions?: string
  private render?: (props: RenderProps) => void
  private initalCustomUniforms: { [key: string]: number } = {}
  private setUniform?: (name: string, value: number) => void
  private getUniform?: (name: string) => number
  private materialFuncs: RTMaterialFuncs[] = []
  private usePrevFrameTex?: boolean
  private useInterlacing?: boolean
  private setDeviceTexure?: (index: number, textureData: Uint8Array) => void
  private setDeviceBuffer?: (index: number, bufferData: BufferSource) => void
  private texs: RTTex[]
  private buffers: RTBufferType[]
  private fps?: number
  private showFps?: boolean
  private transparent?: boolean
  private rtCollision?: RTCollision
  private rtUniform?: RTUniform
  private rtPingPong?: RTPingPong
  private rtInterlacing?: RTInterlacing
  private rtComputeScene?: RTComputeScene
  private raymarch?: RTRaymarchOptions
  private device?: GPUDevice
  private presentationFormat?: GPUTextureFormat
  private frameCallbacks: (() => void)[] = []

  camera: RTCamera = {
    pos: { x: 0, y: 0, z: 0 },
    spherical: { radius: 0, theta: 0, phi: 0 },
    fov: 90,
  }

  constructor({
    main,
    functions,
    texs,
    buffers,
    usePrevFrameTex,
    useInterlacing,
    fps,
    height,
    showFps,
    transparent,
    imageRendering,
    raymarch,
  }: Props = {}) {
    this.canvas = dumbFsCanvas(height, transparent, imageRendering)
    this.main = main
    this.functions = functions
    this.texs = texs ?? []
    this.buffers = buffers ?? []
    this.useInterlacing = useInterlacing
    this.usePrevFrameTex = usePrevFrameTex
    this.fps = fps
    this.showFps = showFps
    this.transparent = transparent
    this.raymarch = raymarch
  }

  registerMaterial(partialMaterial: RTMaterialPartial) {
    if (this.render) throw new Error('Render already built')
    const index = this.materialFuncs.length
    const material = new RTMaterial({
      rt: this,
      material: partialMaterial,
      index,
    })
    this.materialFuncs.push({
      sdFunc: partialMaterial.sdFunc,
      lightFunc: partialMaterial.lightFunc,
    })
    return material
  }

  setTex(index: number, textureData: Uint8Array) {
    if (!this.setDeviceTexure) throw new Error('Render not built')
    this.setDeviceTexure(index, textureData)
  }

  setBuffer(index: number, bufferData: BufferSource) {
    if (!this.setDeviceBuffer) throw new Error('Render not built')
    this.setDeviceBuffer(index, bufferData)
  }

  registerUniform(name: string, value?: number) {
    if (this.render) throw new Error('Render already built')
    this.initalCustomUniforms[name] = value ?? 0
    const set = (value: number) => {
      if (!this.setUniform) throw new Error('Render not built')
      this.setUniform(name, value)
      this.initalCustomUniforms[name] = value
    }
    const get = () => {
      if (!this.getUniform) throw new Error('Render not built')
      return this.getUniform(name)
    }
    return { set, get }
  }

  private async build() {
    const { device, presentationFormat } = await this.getDevice()
    const context = this.canvas.getContext('webgpu')

    if (!context) {
      throw new Error('No context found')
    }

    context.configure({
      device,
      format: presentationFormat,
      alphaMode: this.transparent ? 'premultiplied' : 'opaque',
      usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.COPY_DST,
    })

    const rtUniform = new RTUniform(device, {
      frame: 0,
      time: 0,
      aspectRatio: this.canvas.width / this.canvas.height,
      width: this.canvas.width,
      height: this.canvas.height,
      camPosX: this.camera.pos.x ?? 0,
      camPosY: this.camera.pos.y ?? 0,
      camPosZ: this.camera.pos.z ?? 0,
      camSphericalR: this.camera.spherical.radius ?? 0,
      camSphericalT: this.camera.spherical.theta ?? 0,
      camSphericalP: this.camera.spherical.phi ?? 0,
      camFov: this.camera.fov ?? 90,
      ...this.initalCustomUniforms,
    })

    this.rtUniform = rtUniform

    const rtTexture = new RTTexture(device, this.texs)

    let rtBuffer: RTBuffer | undefined
    if (this.buffers.length > 0) {
      rtBuffer = new RTBuffer(device, this.buffers)
    }

    const texBufLayoutEntries: GPUBindGroupLayoutEntry[] = []

    this.texs.forEach((_, i) => {
      texBufLayoutEntries.push({
        binding: i,
        visibility: GPUShaderStage.FRAGMENT,
        texture: { sampleType: 'unfilterable-float' },
      })
    })

    if (rtBuffer) {
      this.buffers.forEach((_, i) => {
        texBufLayoutEntries.push({
          binding: i + this.texs.length,
          visibility: GPUShaderStage.FRAGMENT | GPUShaderStage.COMPUTE,
          buffer: { type: 'read-only-storage' },
        })
      })
    }

    const texBufBindGroupLayout = device.createBindGroupLayout({
      entries: texBufLayoutEntries,
    })

    const bindGroupLayouts = [
      rtUniform.uniformBindGroupLayout,
      texBufBindGroupLayout,
    ]

    let prevFrameGroupIndex: number | undefined
    const needsPingPong = this.usePrevFrameTex || this.useInterlacing
    if (needsPingPong) {
      this.rtPingPong = new RTPingPong(this.canvas, device, presentationFormat)
      if (this.usePrevFrameTex) {
        prevFrameGroupIndex = bindGroupLayouts.length
        bindGroupLayouts.push(this.rtPingPong.pingPongBindGroupLayout)
      }
    }

    // ── Automatic compute pre-pass (cone marching) ──
    let rtComputeScene: RTComputeScene | undefined
    let distMapGroupIndex: number | undefined

    const enableCone = this.raymarch?.coneTile !== false
    if (this.materialFuncs.length > 0 && enableCone) {
      const coneTile =
        typeof this.raymarch?.coneTile === 'number' ? this.raymarch.coneTile : 8

      rtComputeScene = new RTComputeScene({
        device,
        canvas: this.canvas,
        rtUniform,
        rtTexture,
        rtBuffer,
        materialFuncs: this.materialFuncs,
        functions: this.functions,
        usePrevFrameTex: this.usePrevFrameTex,
        coneTile,
        raymarchOptions: this.raymarch,
      })
      this.rtComputeScene = rtComputeScene

      distMapGroupIndex = bindGroupLayouts.length
      bindGroupLayouts.push(rtComputeScene.distMapReadLayout)
    }

    let rtInterlacing: RTInterlacing | undefined
    if (this.useInterlacing && this.rtPingPong) {
      rtInterlacing = new RTInterlacing({
        device,
        canvas: this.canvas,
        presentationFormat,
        rtUniform,
        rtPingPong: this.rtPingPong,
      })
      this.rtInterlacing = rtInterlacing
    }

    this.render = await getRender({
      device,
      bindGroupLayouts,
      presentationFormat,
      context,
      canvas: this.canvas,
      main: this.main,
      materialFuncs: this.materialFuncs,
      functions: this.functions,
      rtUniform,
      rtTexture,
      rtBuffer,
      usePrevFrameTex: this.usePrevFrameTex,
      useInterlacing: this.useInterlacing,
      prevFrameGroupIndex,
      rtPingPong: this.rtPingPong,
      rtInterlacing: this.rtInterlacing,
      transparent: this.transparent,
      rtComputeScene,
      distMapGroupIndex,
      raymarchOptions: this.raymarch,
    })
    this.setUniform = (name: string, value: number) => {
      rtUniform.set(name, value)
    }
    this.getUniform = (name: string) => {
      return rtUniform.get(name)
    }
    this.setDeviceTexure = (index: number, textureData: Uint8Array) => {
      rtTexture.setTexture(index, textureData)
    }
    this.setDeviceBuffer = (index: number, bufferData: BufferSource) => {
      rtBuffer?.setBuffer(index, bufferData)
    }

    if (this.materialFuncs.length > 0) {
      this.rtCollision = new RTCollision({
        device,
        rtUniformKeys: rtUniform.getKeysSortedByOffset(),
        functions: this.functions,
        materialFuncs: this.materialFuncs,
        nTextures: this.texs.length,
        usePrevFrameTex: this.usePrevFrameTex,
        rtUniform,
        rtTexture,
        rtBuffer,
      })
    }
  }

  checkCollision(index: number, pos?: { x: number; y: number; z: number }) {
    if (!this.rtCollision || !this.rtUniform)
      throw new Error('Render not built')

    // Default: evaluate the SDF at the current camera position.
    // Callers may pass an explicit pos to probe any world-space point
    // (e.g. feet, head, or a non-player material position).
    const resolvedPos = pos ?? {
      x: this.rtUniform.get('camPosX'),
      y: this.rtUniform.get('camPosY'),
      z: this.rtUniform.get('camPosZ'),
    }

    return this.rtCollision.checkCollision(index, resolvedPos)
  }

  async start(props?: {
    onBuild?: () => void
    onFrame?: () => void
    once?: boolean
  }) {
    await this.build()
    props?.onBuild?.()

    if (props?.once) {
      this.render?.({
        camera: this.camera,
      })
      return
    }

    const rtLoop = new RTLoop({
      cb: () => {
        for (const callback of this.frameCallbacks) {
          callback()
        }
        props?.onFrame?.()
      },
      shoot: () => {
        this.render?.({
          camera: this.camera,
        })
      },
      fps: this.fps,
      showFps: this.showFps,
    })
    rtLoop.start()

    window.addEventListener('resize', () => {
      this.resize()
    })
  }

  async getDevice() {
    if (!this.device || !this.presentationFormat) {
      const { device, presentationFormat } = await getDevice()
      this.device = device
      this.presentationFormat = presentationFormat
    }
    return {
      device: this.device,
      presentationFormat: this.presentationFormat,
    }
  }

  resize() {
    resizeCanvas(this.canvas, this.canvas.height)

    if (this.rtPingPong && this.device && this.presentationFormat) {
      this.rtPingPong.resize(
        this.canvas.width,
        this.canvas.height,
        this.device,
        this.presentationFormat
      )
    }

    if (this.rtInterlacing) {
      this.rtInterlacing.resize(this.canvas.width, this.canvas.height)
    }

    if (this.rtComputeScene) {
      this.rtComputeScene.resize(this.canvas.width, this.canvas.height)
    }
  }

  isBuilt() {
    return this.render !== undefined
  }

  setControlsToFree(options?: FreeControlsOptions) {
    return freeControls(this, options)
  }

  setControlsTo3rdPerson(options?: ThirdPersonControlsOptions) {
    const thirdPerson = thirdPersonControls(this, options)
    this.frameCallbacks.push(thirdPerson.update)
    return thirdPerson
  }
}

export default ReTina
