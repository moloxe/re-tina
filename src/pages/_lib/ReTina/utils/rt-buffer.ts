import type { RTBufferType } from '../types'

class RTBuffer {
  private buffers: RTBufferType[]
  private device: GPUDevice
  private gpuBuffers: GPUBuffer[]
  private bufferEntries: GPUBindGroupEntry[]
  bufferBindGroupLayout: GPUBindGroupLayout
  bufferBindGroup: GPUBindGroup

  constructor(device: GPUDevice, buffers: RTBufferType[]) {
    this.buffers = buffers
    this.device = device
    this.gpuBuffers = this.buffers.map(({ size }) =>
      this.device.createBuffer({
        size: size,
        usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
      })
    )
    this.bufferEntries = this.gpuBuffers.map((buffer, binding) => ({
      binding,
      resource: { buffer },
    }))
    this.bufferBindGroupLayout = device.createBindGroupLayout({
      entries: buffers.map((_, binding) => ({
        binding,
        visibility: GPUShaderStage.FRAGMENT | GPUShaderStage.COMPUTE,
        buffer: { type: 'read-only-storage' },
      })),
    })
    this.bufferBindGroup = device.createBindGroup({
      layout: this.bufferBindGroupLayout,
      entries: this.bufferEntries,
    })
  }

  setBuffer(index: number, bufferData: BufferSource) {
    const buffer = this.gpuBuffers[index]
    this.device.queue.writeBuffer(buffer, 0, bufferData)
  }

  getBufferEntries() {
    return this.bufferEntries
  }

  length() {
    return this.buffers.length
  }
}

export default RTBuffer
