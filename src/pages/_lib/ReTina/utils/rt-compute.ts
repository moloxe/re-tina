import parseComputeShader from '../shaders/parse-compute-shader'

type SupportedTypedArray =
  Float32Array<ArrayBuffer> | Uint32Array<ArrayBuffer> | Int32Array<ArrayBuffer>

type RTComputeBufferDescriptor = {
  name: string
  data: SupportedTypedArray
  readOnly?: boolean
}

type RTComputeOptions = {
  device: GPUDevice
  buffers: RTComputeBufferDescriptor[]
} & (
  | {
      /** User provides only the body of fn main. Bindings & constants are auto-generated. */
      main: string
      functions?: string
      workgroupSize?: number
      code?: never
    }
  | {
      /** Raw WGSL fallback — used as-is, no auto-generation. */
      code: string
      main?: never
      functions?: never
      workgroupSize?: never
    }
)

/** Options for the static RTCompute.dispatch() helper. */
type RTDispatchOptions = {
  device: GPUDevice
  pipeline: GPUComputePipeline
  bindGroups: { index: number; group: GPUBindGroup }[]
  workgroups: [number, number?, number?]
  /** STORAGE buffer whose content will be copied back to the CPU. */
  resultBuffer: GPUBuffer
  /** Byte size of resultBuffer. */
  resultSize: number
  /**
   * Optional non-blocking guard. If provided and already `true`, dispatch
   * returns `null` immediately. RTCompute.run() uses this internally;
   * RTCollision intentionally omits it so concurrent per-material checks
   * always run independently (matching original behaviour).
   */
  runningRef?: { value: boolean }
}

function inferWgslType(arr: SupportedTypedArray): 'f32' | 'u32' | 'i32' {
  if (arr instanceof Float32Array) return 'f32'
  if (arr instanceof Uint32Array) return 'u32'
  return 'i32'
}

class RTCompute {
  private device: GPUDevice
  private pipeline: GPUComputePipeline
  private bindGroup: GPUBindGroup
  private storageBuffers: GPUBuffer[] = []
  private readBuffers: GPUBuffer[] = []
  private bufferSizes: number[] = []
  private destroyed = false
  private runningRef = { value: false }

  constructor(options: RTComputeOptions) {
    const { device, buffers } = options
    this.device = device

    const layoutEntries: GPUBindGroupLayoutEntry[] = []
    const groupEntries: GPUBindGroupEntry[] = []

    for (let i = 0; i < buffers.length; i++) {
      const { data, readOnly } = buffers[i]
      const byteLength = data.byteLength
      this.bufferSizes.push(byteLength)

      // Storage buffer (lives in VRAM, read/write from shader)
      const storageBuffer = device.createBuffer({
        size: byteLength,
        usage:
          GPUBufferUsage.STORAGE |
          GPUBufferUsage.COPY_SRC |
          GPUBufferUsage.COPY_DST,
      })

      device.queue.writeBuffer(storageBuffer, 0, data)
      this.storageBuffers.push(storageBuffer)

      // Staging buffer (mappable to CPU for read-back)
      const readBuffer = device.createBuffer({
        size: byteLength,
        usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST,
      })
      this.readBuffers.push(readBuffer)

      // Auto-generate bind group layout entry: @group(0) @binding(N)
      layoutEntries.push({
        binding: i,
        visibility: GPUShaderStage.COMPUTE,
        buffer: { type: readOnly ? 'read-only-storage' : 'storage' },
      })

      groupEntries.push({
        binding: i,
        resource: { buffer: storageBuffer },
      })
    }

    // ── Build WGSL ──────────────────────────────────────────
    let shaderCode: string

    if ('main' in options && options.main) {
      shaderCode = parseComputeShader({
        buffers: buffers.map((b) => ({
          name: b.name,
          wgslType: inferWgslType(b.data),
          readOnly: b.readOnly ?? false,
        })),
        main: options.main,
        functions: options.functions,
        workgroupSize: options.workgroupSize ?? 64,
      })
    } else {
      shaderCode = (options as { code: string }).code
    }

    const bindGroupLayout = device.createBindGroupLayout({
      entries: layoutEntries,
    })

    this.pipeline = device.createComputePipeline({
      layout: device.createPipelineLayout({
        bindGroupLayouts: [bindGroupLayout],
      }),
      compute: {
        module: device.createShaderModule({ code: shaderCode }),
        entryPoint: 'main',
      },
    })

    this.bindGroup = device.createBindGroup({
      layout: bindGroupLayout,
      entries: groupEntries,
    })
  }

  /**
   * Re-upload data to a specific buffer before the next `run()`.
   */
  updateBuffer(index: number, data: SupportedTypedArray) {
    if (this.destroyed) throw new Error('RTCompute: already destroyed')
    if (index < 0 || index >= this.storageBuffers.length) {
      throw new Error(`RTCompute: buffer index ${index} out of range`)
    }
    this.device.queue.writeBuffer(this.storageBuffers[index], 0, data)
  }

  /**
   * Dispatch the compute pipeline, copy results back and return them.
   * Returns `null` if a previous run is still in flight (non-blocking guard).
   *
   * @param x Workgroups in X
   * @param y Workgroups in Y (default 1)
   * @param z Workgroups in Z (default 1)
   * @returns One `ArrayBuffer` per buffer descriptor, in the same order, or `null` if busy.
   */
  async run(x: number, y = 1, z = 1): Promise<ArrayBuffer[] | null> {
    if (this.destroyed) throw new Error('RTCompute: already destroyed')
    if (this.runningRef.value) return null

    this.runningRef.value = true

    try {
      const encoder = this.device.createCommandEncoder()

      const pass = encoder.beginComputePass()
      pass.setPipeline(this.pipeline)
      pass.setBindGroup(0, this.bindGroup)
      pass.dispatchWorkgroups(x, y, z)
      pass.end()

      // Copy storage → staging for every buffer
      for (let i = 0; i < this.storageBuffers.length; i++) {
        encoder.copyBufferToBuffer(
          this.storageBuffers[i],
          0,
          this.readBuffers[i],
          0,
          this.bufferSizes[i]
        )
      }

      this.device.queue.submit([encoder.finish()])

      // Map all staging buffers concurrently
      const results = await Promise.all(
        this.readBuffers.map(async (buf) => {
          await buf.mapAsync(GPUMapMode.READ)
          // Clone the data — the mapped range becomes invalid after unmap()
          const copy = buf.getMappedRange().slice(0)
          buf.unmap()
          return copy
        })
      )

      return results
    } finally {
      this.runningRef.value = false
    }
  }

  /**
   * Release all GPU buffers explicitly.
   */
  destroy() {
    if (this.destroyed) return
    this.destroyed = true
    for (const buf of this.storageBuffers) buf.destroy()
    for (const buf of this.readBuffers) buf.destroy()
    this.storageBuffers = []
    this.readBuffers = []
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Static helper — shared dispatch + readback core used by RTCollision
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Low-level GPU dispatch + readback helper.
   *
   * Encodes a compute pass with the given pipeline and bind groups, copies
   * `resultBuffer` into a fresh MAP_READ staging buffer, submits, and maps
   * the staging buffer back to the CPU.
   *
   * A new staging buffer is created per call so that concurrent dispatches
   * (e.g. multiple materials calling checkCollision() in parallel) never share
   * mapped memory and cannot corrupt each other's results.
   *
   * Returns `null` (non-blocking) if `runningRef` is supplied and already
   * `true`. RTCompute.run() passes its own internal ref; RTCollision omits it
   * so each per-material call always runs independently.
   */
  static async dispatch({
    device,
    pipeline,
    bindGroups,
    workgroups,
    resultBuffer,
    resultSize,
    runningRef,
  }: RTDispatchOptions): Promise<Float32Array | null> {
    if (runningRef) {
      if (runningRef.value) return null
      runningRef.value = true
    }

    // Fresh staging buffer per call — avoids shared-mapped-memory conflicts
    // when multiple dispatches run concurrently.
    const readBuffer = device.createBuffer({
      size: resultSize,
      usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ,
    })

    try {
      const encoder = device.createCommandEncoder()

      const pass = encoder.beginComputePass()
      pass.setPipeline(pipeline)
      for (const { index, group } of bindGroups) {
        pass.setBindGroup(index, group)
      }
      pass.dispatchWorkgroups(...workgroups)
      pass.end()

      encoder.copyBufferToBuffer(resultBuffer, 0, readBuffer, 0, resultSize)

      device.queue.submit([encoder.finish()])

      await readBuffer.mapAsync(GPUMapMode.READ)
      const result = new Float32Array(readBuffer.getMappedRange().slice(0))
      readBuffer.unmap()

      return result
    } finally {
      readBuffer.destroy()
      if (runningRef) runningRef.value = false
    }
  }
}

export default RTCompute
