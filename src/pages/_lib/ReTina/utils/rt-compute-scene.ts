import parseComputeSceneShader from '../shaders/parse-compute-scene-shader'
import type { RTMaterialFuncs, RTRaymarchOptions } from '../types'
import type RTTexture from './rt-texture'
import type RTUniform from './rt-uniform'
import type RTBuffer from './rt-buffer'

export type RTComputeSceneProps = {
  device: GPUDevice
  canvas: HTMLCanvasElement
  rtUniform: RTUniform
  rtTexture: RTTexture
  materialFuncs: RTMaterialFuncs[]
  functions?: string
  usePrevFrameTex?: boolean
  workgroupSize?: number
  rtBuffer?: RTBuffer
  coneTile?: number
  raymarchOptions?: RTRaymarchOptions
}

class RTComputeScene {
  private device: GPUDevice
  private computePipeline: GPUComputePipeline
  private computeUniformBindGroup: GPUBindGroup
  private computeTextureBindGroup: GPUBindGroup
  private distMapBindGroup: GPUBindGroup
  private distMapWriteLayout: GPUBindGroupLayout
  private distMapTexture: GPUTexture
  private distMapGroupIndex: number
  private workgroupsX: number
  private workgroupsY: number
  private workgroupSize: number
  private coneTile: number

  /** Fragment-side bind group layout for reading the distance map */
  distMapReadLayout: GPUBindGroupLayout
  /** Fragment-side bind group for reading the distance map */
  distMapReadBindGroup: GPUBindGroup
  private computeBindGroups: GPUBindGroup[] = []

  constructor({
    device,
    canvas,
    rtUniform,
    rtTexture,
    materialFuncs,
    functions,
    usePrevFrameTex,
    workgroupSize = 8,
    rtBuffer,
    coneTile = 8,
    raymarchOptions,
  }: RTComputeSceneProps) {
    this.device = device
    this.coneTile = coneTile
    this.workgroupSize = workgroupSize

    const width = canvas.width
    const height = canvas.height
    const tileW = Math.max(1, Math.ceil(width / coneTile))
    const tileH = Math.max(1, Math.ceil(height / coneTile))

    // ── Distance map texture: r32float at tile resolution ──
    this.distMapTexture = device.createTexture({
      size: [tileW, tileH],
      format: 'r32float',
      usage: GPUTextureUsage.STORAGE_BINDING | GPUTextureUsage.TEXTURE_BINDING,
    })

    // ── Group 0: Uniforms + sampler (COMPUTE visibility) ──
    const computeUniformLayout = device.createBindGroupLayout({
      entries: [
        {
          binding: 0,
          visibility: GPUShaderStage.COMPUTE,
          buffer: { type: 'uniform' },
        },
        {
          binding: 1,
          visibility: GPUShaderStage.COMPUTE,
          sampler: { type: 'non-filtering' },
        },
      ],
    })

    this.computeUniformBindGroup = device.createBindGroup({
      layout: computeUniformLayout,
      entries: [
        { binding: 0, resource: { buffer: rtUniform.getBuffer() } },
        {
          binding: 1,
          resource: device.createSampler({
            addressModeU: 'repeat',
            addressModeV: 'repeat',
            magFilter: 'nearest',
            minFilter: 'nearest',
          }),
        },
      ],
    })

    // ── Group 1: Textures (COMPUTE visibility) ──
    const nTextures = rtTexture.length()
    const texBufLayoutEntries: GPUBindGroupLayoutEntry[] = Array.from(
      { length: nTextures },
      (_, binding) => ({
        binding,
        visibility: GPUShaderStage.COMPUTE,
        texture: { sampleType: 'unfilterable-float' as const },
      })
    )

    if (rtBuffer) {
      Array.from({ length: rtBuffer.length() }, (_, i) => {
        texBufLayoutEntries.push({
          binding: i + nTextures,
          visibility: GPUShaderStage.COMPUTE,
          buffer: { type: 'read-only-storage' },
        })
      })
    }

    const computeTextureLayout = device.createBindGroupLayout({
      entries: texBufLayoutEntries,
    })

    const texBufGroupEntries = [...rtTexture.getTextureEntries()]
    if (rtBuffer) {
      rtBuffer.getBufferEntries().forEach((entry, i) => {
        texBufGroupEntries.push({
          binding: i + nTextures,
          resource: entry.resource,
        })
      })
    }

    this.computeTextureBindGroup = device.createBindGroup({
      layout: computeTextureLayout,
      entries: texBufGroupEntries,
    })

    const bindGroupLayouts = [computeUniformLayout, computeTextureLayout]
    this.computeBindGroups.push(this.computeUniformBindGroup)
    this.computeBindGroups.push(this.computeTextureBindGroup)

    // ── Group dynamic: Distance map storage texture (write from compute) ──
    this.distMapGroupIndex = bindGroupLayouts.length
    this.distMapWriteLayout = device.createBindGroupLayout({
      entries: [
        {
          binding: 0,
          visibility: GPUShaderStage.COMPUTE,
          storageTexture: {
            access: 'write-only',
            format: 'r32float',
            viewDimension: '2d',
          },
        },
      ],
    })

    this.distMapBindGroup = device.createBindGroup({
      layout: this.distMapWriteLayout,
      entries: [{ binding: 0, resource: this.distMapTexture.createView() }],
    })
    bindGroupLayouts.push(this.distMapWriteLayout)
    this.computeBindGroups.push(this.distMapBindGroup)

    // ── Fragment-side: distance map as readable texture ──
    this.distMapReadLayout = device.createBindGroupLayout({
      entries: [
        {
          binding: 0,
          visibility: GPUShaderStage.FRAGMENT,
          texture: { sampleType: 'unfilterable-float' },
        },
      ],
    })

    this.distMapReadBindGroup = device.createBindGroup({
      layout: this.distMapReadLayout,
      entries: [{ binding: 0, resource: this.distMapTexture.createView() }],
    })

    // ── Build compute shader (cone march body) ──
    const shaderCode = parseComputeSceneShader({
      rtUniformKeys: rtUniform.getKeysSortedByOffset(),
      materialFuncs,
      nTextures,
      nBuffers: rtBuffer ? rtBuffer.length() : 0,
      usePrevFrameTex,
      functions,
      workgroupSize,
      bufferGroupIndex: 1,
      distMapGroupIndex: this.distMapGroupIndex,
      coneTile,
      raymarchOptions,
    })

    // ── Create pipeline ──
    this.computePipeline = device.createComputePipeline({
      layout: device.createPipelineLayout({ bindGroupLayouts }),
      compute: {
        module: device.createShaderModule({ code: shaderCode }),
        entryPoint: 'main',
      },
    })

    this.workgroupsX = Math.ceil(tileW / workgroupSize)
    this.workgroupsY = Math.ceil(tileH / workgroupSize)
  }

  resize(width: number, height: number) {
    this.distMapTexture.destroy()

    const tileW = Math.max(1, Math.ceil(width / this.coneTile))
    const tileH = Math.max(1, Math.ceil(height / this.coneTile))

    this.distMapTexture = this.device.createTexture({
      size: [tileW, tileH],
      format: 'r32float',
      usage: GPUTextureUsage.STORAGE_BINDING | GPUTextureUsage.TEXTURE_BINDING,
    })

    const view = this.distMapTexture.createView()

    this.distMapBindGroup = this.device.createBindGroup({
      layout: this.distMapWriteLayout,
      entries: [{ binding: 0, resource: view }],
    })
    this.computeBindGroups[this.distMapGroupIndex] = this.distMapBindGroup

    this.distMapReadBindGroup = this.device.createBindGroup({
      layout: this.distMapReadLayout,
      entries: [{ binding: 0, resource: view }],
    })

    this.workgroupsX = Math.ceil(tileW / this.workgroupSize)
    this.workgroupsY = Math.ceil(tileH / this.workgroupSize)
  }

  /**
   * Encode the compute pass into an existing command encoder.
   * Call this BEFORE the render pass in the same encoder.
   */
  encodePass(commandEncoder: GPUCommandEncoder) {
    const pass = commandEncoder.beginComputePass()
    pass.setPipeline(this.computePipeline)
    this.computeBindGroups.forEach((group, index) =>
      pass.setBindGroup(index, group)
    )
    pass.dispatchWorkgroups(this.workgroupsX, this.workgroupsY)
    pass.end()
  }
}

export default RTComputeScene
