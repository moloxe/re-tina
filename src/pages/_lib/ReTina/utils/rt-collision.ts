import parseCollisionShader from '../shaders/collision/parse-collision-shader'
import type { RTMaterialFuncs } from '../types'
import type RTTexture from './rt-texture'
import type RTUniform from './rt-uniform'
import RTCompute from './rt-compute'
import type RTBuffer from './rt-buffer'

export type RTCollisionProps = {
  device: GPUDevice
  rtUniformKeys: string[]
  functions?: string
  materialFuncs: RTMaterialFuncs[]
  nTextures: number
  usePrevFrameTex?: boolean
  rtUniform: RTUniform
  rtTexture: RTTexture
  rtBuffer?: RTBuffer
}

class RTCollision {
  private device: GPUDevice
  private computePipeline: GPUComputePipeline
  private paramsBindGroup: GPUBindGroup
  private paramsBuffer: GPUBuffer
  private uniformBindGroup: GPUBindGroup
  private resultBufferSize: number
  private resultBuffer: GPUBuffer
  private rtTexture: RTTexture
  private rtBuffer?: RTBuffer
  private nTextures: number
  private computeBindGroupsTemplate: { index: number; group: GPUBindGroup }[] =
    []

  constructor({
    device,
    functions,
    rtUniformKeys,
    materialFuncs,
    nTextures,
    usePrevFrameTex,
    rtUniform,
    rtTexture,
    rtBuffer,
  }: RTCollisionProps) {
    this.device = device
    this.rtTexture = rtTexture
    this.rtBuffer = rtBuffer
    this.nTextures = nTextures

    // 1: Material-Index
    // 1: Collision-Dist
    // 3: Collision-Normal
    const elements = 1 + 1 + 3
    this.resultBufferSize = Float32Array.BYTES_PER_ELEMENT * elements
    this.resultBuffer = device.createBuffer({
      size: this.resultBufferSize,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC,
    })

    const { uniformBindGroupLayout, uniformBindGroup } =
      rtUniform.getCustomBindingsForCollisions(this.resultBuffer)
    this.uniformBindGroup = uniformBindGroup

    this.paramsBuffer = device.createBuffer({
      size: 32, // Struct { i32, vec3f } -> 4 (i32) + 12 (padding) + 12 (vec3) + 4 (padding to 16 byte align) = 32? Actually WGSL alignment rules for structs.
      // struct CollisionParams { collisionGroup: i32, pos: vec3f }
      // collisionGroup: offset 0, size 4.
      // pos: offset 16 (vec3 alignment is 16), size 12.
      // total size 28 -> rounded to 32?
      // Let's be safe and use 32.
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    })

    // Create BindGroup 2 for Params
    const paramsBindGroupLayout = device.createBindGroupLayout({
      entries: [
        {
          binding: 0,
          visibility: GPUShaderStage.COMPUTE,
          buffer: { type: 'uniform' },
        },
      ],
    })

    this.paramsBindGroup = device.createBindGroup({
      layout: paramsBindGroupLayout,
      entries: [{ binding: 0, resource: { buffer: this.paramsBuffer } }],
    })

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

    const bindGroupLayouts = [uniformBindGroupLayout, computeTextureLayout]
    this.computeBindGroupsTemplate.push({ index: 0, group: uniformBindGroup })

    const dynamicGroupIndex = bindGroupLayouts.length
    bindGroupLayouts.push(paramsBindGroupLayout)
    this.computeBindGroupsTemplate.push({
      index: dynamicGroupIndex,
      group: this.paramsBindGroup,
    })

    const collisionShader = parseCollisionShader({
      functions,
      rtUniformKeys,
      materialFuncs,
      nTextures,
      nBuffers: rtBuffer ? rtBuffer.length() : 0,
      bufferGroupIndex: 1,
      dynamicGroupIndex,
      usePrevFrameTex,
    })

    this.computePipeline = device.createComputePipeline({
      layout: device.createPipelineLayout({
        bindGroupLayouts,
      }),
      compute: {
        module: device.createShaderModule({ code: collisionShader }),
        entryPoint: 'main',
      },
    })
  }

  async checkCollision(
    collisionGroup: number,
    pos: { x: number; y: number; z: number }
  ) {
    // Update params buffer
    // i32 at offset 0
    this.device.queue.writeBuffer(
      this.paramsBuffer,
      0,
      new Int32Array([collisionGroup])
    )
    // vec3f at offset 16 (16-byte alignment for vec3 in uniform)
    this.device.queue.writeBuffer(
      this.paramsBuffer,
      16,
      new Float32Array([pos.x, pos.y, pos.z])
    )

    const texBufGroupEntries = [...this.rtTexture.getTextureEntries()]
    if (this.rtBuffer) {
      this.rtBuffer.getBufferEntries().forEach((entry, i) => {
        texBufGroupEntries.push({
          binding: i + this.nTextures,
          resource: entry.resource,
        })
      })
    }

    const textureBindGroup = this.device.createBindGroup({
      layout: this.computePipeline.getBindGroupLayout(1),
      entries: texBufGroupEntries,
    })

    const bindGroups = [...this.computeBindGroupsTemplate]
    bindGroups.push({ index: 1, group: textureBindGroup })

    const result = await RTCompute.dispatch({
      device: this.device,
      pipeline: this.computePipeline,
      bindGroups,
      workgroups: [1],
      resultBuffer: this.resultBuffer,
      resultSize: this.resultBufferSize,
    })

    // If a dispatch is already in flight, return a neutral "no collision" result
    // to preserve backward compatibility with callers that don't null-check.
    if (result === null) {
      return {
        materialIndex: -1,
        collisionDist: Infinity,
        collisionNormal: { x: 0, y: 0, z: 0 },
      }
    }

    return {
      materialIndex: result[0],
      collisionDist: result[1],
      collisionNormal: {
        x: result[2],
        y: result[3],
        z: result[4],
      },
    }
  }
}

export default RTCollision
