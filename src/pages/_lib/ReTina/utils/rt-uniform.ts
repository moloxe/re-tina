class RTUniform {
  private device: GPUDevice
  private buffer: GPUBuffer
  private uniform: { [key: string]: { value: number; offSet: number } } = {}
  uniformBindGroupLayout: GPUBindGroupLayout
  uniformBindGroup: GPUBindGroup

  constructor(
    device: GPUDevice,
    uniform: {
      [key: string]: number
    }
  ) {
    this.device = device
    const keys = Object.keys(uniform)
    this.buffer = device.createBuffer({
      size: keys.length * 4, // 4 bytes per float
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    })
    keys.forEach((key, index) => {
      this.uniform[key] = {
        value: uniform[key],
        offSet: index * 4,
      }
      this.set(key, uniform[key])
    })
    this.uniformBindGroupLayout = device.createBindGroupLayout({
      entries: [
        {
          binding: 0,
          visibility: GPUShaderStage.FRAGMENT,
          buffer: { type: 'uniform' },
        },
        {
          binding: 1,
          visibility: GPUShaderStage.FRAGMENT,
          sampler: { type: 'non-filtering' },
        },
      ],
    })
    this.uniformBindGroup = this.device.createBindGroup({
      layout: this.uniformBindGroupLayout,
      entries: [
        { binding: 0, resource: { buffer: this.getBuffer() } },
        {
          binding: 1,
          resource: this.device.createSampler({
            addressModeU: 'repeat',
            addressModeV: 'repeat',
            magFilter: 'nearest',
            minFilter: 'nearest',
          }),
        },
      ],
    })
  }
  getBuffer() {
    return this.buffer
  }
  getKeysSortedByOffset() {
    return Object.keys(this.uniform).toSorted((a, b) => {
      return this.uniform[a].offSet - this.uniform[b].offSet
    })
  }
  set(key: string, value: number) {
    if (!this.uniform[key]) throw new Error(`Uniform ${key} not found`)
    this.uniform[key].value = value
    this.device.queue.writeBuffer(
      this.buffer,
      this.uniform[key].offSet,
      new Float32Array([value])
    )
  }
  get(key: string) {
    if (!this.uniform[key]) throw new Error(`Uniform ${key} not found`)
    return this.uniform[key].value
  }
  getCustomBindingsForCollisions(resultBuffer: GPUBuffer) {
    const uniformBindGroupLayout = this.device.createBindGroupLayout({
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
        {
          binding: 2,
          visibility: GPUShaderStage.COMPUTE,
          buffer: { type: 'storage' },
        },
      ],
    })

    const uniformBindGroup = this.device.createBindGroup({
      layout: uniformBindGroupLayout,
      entries: [
        { binding: 0, resource: { buffer: this.getBuffer() } },
        {
          binding: 1,
          resource: this.device.createSampler({
            addressModeU: 'repeat',
            addressModeV: 'repeat',
            magFilter: 'nearest',
            minFilter: 'nearest',
          }),
        },
        { binding: 2, resource: { buffer: resultBuffer } },
      ],
    })

    return {
      uniformBindGroupLayout,
      uniformBindGroup,
    }
  }
}

export default RTUniform
