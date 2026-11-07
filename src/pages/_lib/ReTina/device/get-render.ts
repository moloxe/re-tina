import type {
  RenderProps,
  RTCamera,
  RTMaterialFuncs,
  RTRaymarchOptions,
} from '../types'
import vertWGSL from './../shaders/vert.wgsl?raw'
import parseFragmentShader from '../shaders/parse-fragment-shader'
import RTUniform from '../utils/rt-uniform'
import RTTexture from '../utils/rt-texture'
import RTPingPong from '../utils/rt-ping-pong'
import type RTInterlacing from '../utils/rt-interlacing'
import type RTComputeScene from '../utils/rt-compute-scene'
import type RTBuffer from '../utils/rt-buffer'

type Props = {
  device: GPUDevice
  presentationFormat: GPUTextureFormat
  context: GPUCanvasContext
  canvas: HTMLCanvasElement
  main?: string
  functions?: string
  materialFuncs: RTMaterialFuncs[]
  rtUniform: RTUniform
  rtTexture: RTTexture
  rtBuffer?: RTBuffer
  usePrevFrameTex?: boolean
  useInterlacing?: boolean
  bindGroupLayouts: GPUBindGroupLayout[]

  prevFrameGroupIndex?: number
  rtPingPong?: RTPingPong
  rtInterlacing?: RTInterlacing
  transparent?: boolean
  rtComputeScene?: RTComputeScene
  distMapGroupIndex?: number
  raymarchOptions?: RTRaymarchOptions
}

async function getRender({
  device,
  presentationFormat,
  context,
  canvas,
  main,
  materialFuncs,
  functions,
  rtUniform,
  rtTexture,
  rtBuffer,
  usePrevFrameTex,
  useInterlacing,
  bindGroupLayouts,

  prevFrameGroupIndex,
  rtPingPong,
  rtInterlacing,
  transparent,
  rtComputeScene,
  distMapGroupIndex,
  raymarchOptions,
}: Props) {
  const fragWGSL = parseFragmentShader({
    main,
    functions,
    materialFuncs,
    rtUniformKeys: rtUniform.getKeysSortedByOffset(),
    nTextures: rtTexture.length(),
    nBuffers: rtBuffer ? rtBuffer.length() : 0,
    bufferGroupIndex: 1,
    prevFrameGroupIndex,
    usePrevFrameTex,
    useInterlacing,
    distMapGroupIndex,
    raymarchOptions,
  })

  const renderPipeline = device.createRenderPipeline({
    layout: device.createPipelineLayout({
      bindGroupLayouts,
    }),
    vertex: {
      module: device.createShaderModule({
        code: vertWGSL,
      }),
      entryPoint: 'main',
    },
    fragment: {
      module: device.createShaderModule({
        code: fragWGSL,
      }),
      entryPoint: 'main',
      targets: [{ format: presentationFormat }],
    },
    primitive: {
      topology: 'triangle-strip',
      frontFace: 'ccw',
      stripIndexFormat: 'uint32',
    },
  })

  let frame = 0
  let initTime: number | null = null
  function updateSceneUniforms(camera: RTCamera) {
    const now = performance.now() / 1000
    if (initTime === null) initTime = performance.now() / 1000
    const time = now - initTime
    rtUniform.set('frame', frame)
    rtUniform.set('time', time)
    rtUniform.set('aspectRatio', canvas.width / canvas.height)
    rtUniform.set('width', canvas.width)
    rtUniform.set('height', canvas.height)
    rtUniform.set('camPosX', camera.pos.x)
    rtUniform.set('camPosY', camera.pos.y)
    rtUniform.set('camPosZ', camera.pos.z)
    rtUniform.set('camSphericalR', camera.spherical.radius)
    rtUniform.set('camSphericalT', camera.spherical.theta)
    rtUniform.set('camSphericalP', camera.spherical.phi)
    rtUniform.set('camFov', camera.fov)
  }

  const texBufGroupEntries: GPUBindGroupEntry[] = rtTexture.getTextureEntries()
  if (rtBuffer) {
    rtBuffer.getBufferEntries().forEach((entry, i) => {
      texBufGroupEntries.push({
        binding: i + rtTexture.length(),
        resource: entry.resource,
      })
    })
  }

  const textureBindGroup = device.createBindGroup({
    layout: renderPipeline.getBindGroupLayout(1),
    entries: texBufGroupEntries,
  })

  function render({ camera }: RenderProps) {
    updateSceneUniforms(camera)

    const commandEncoder = device.createCommandEncoder()

    // ── Compute scene pre-pass (distance map) ──
    if (rtComputeScene) {
      rtComputeScene.encodePass(commandEncoder)
    }

    const currentView = rtInterlacing
      ? rtInterlacing.halfTextureView
      : rtPingPong
        ? rtPingPong.currentWriteTextureView
        : context.getCurrentTexture().createView()

    const renderPassDescriptor: GPURenderPassDescriptor = {
      colorAttachments: [
        {
          view: currentView,
          loadOp: 'clear',
          clearValue: { r: 0, g: 0, b: 0, a: transparent ? 0 : 1 },
          storeOp: 'store',
        },
      ],
    }

    const renderPass = commandEncoder.beginRenderPass(renderPassDescriptor)

    renderPass.setPipeline(renderPipeline)

    renderPass.setBindGroup(0, rtUniform.uniformBindGroup)
    renderPass.setBindGroup(1, textureBindGroup)

    if (rtPingPong && prevFrameGroupIndex !== undefined) {
      renderPass.setBindGroup(
        prevFrameGroupIndex,
        rtPingPong.currentBindGroupIn
      )
    }

    if (rtComputeScene && distMapGroupIndex !== undefined) {
      renderPass.setBindGroup(
        distMapGroupIndex,
        rtComputeScene.distMapReadBindGroup
      )
    }

    renderPass.draw(4, 1, 0, 0)
    renderPass.end()

    if (rtInterlacing) {
      rtInterlacing.encodeResolvePass(commandEncoder, transparent)
    }

    if (rtPingPong) {
      commandEncoder.copyTextureToTexture(
        { texture: rtPingPong.currentWriteTexture },
        { texture: context.getCurrentTexture() },
        rtPingPong.offscreenTextureSize
      )
    }

    device.queue.submit([commandEncoder.finish()])

    if (rtPingPong) {
      rtPingPong.swap()
    }

    frame++
  }

  return render
}

export default getRender
