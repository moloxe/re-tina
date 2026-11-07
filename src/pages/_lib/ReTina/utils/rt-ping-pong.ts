class RTPingPong {
  pingPongBindGroupLayout: GPUBindGroupLayout
  bindGroupPingIn: GPUBindGroup
  bindGroupPongIn: GPUBindGroup
  pingTextureView: GPUTextureView
  pongTextureView: GPUTextureView
  currentReadTexture: GPUTexture
  currentReadTextureView: GPUTextureView
  currentWriteTexture: GPUTexture
  currentWriteTextureView: GPUTextureView
  currentBindGroupIn: GPUBindGroup
  offscreenTextureSize: [number, number, number]

  constructor(
    canvas: HTMLCanvasElement,
    device: GPUDevice,
    presentationFormat: GPUTextureFormat
  ) {
    this.pingPongBindGroupLayout = device.createBindGroupLayout({
      entries: [
        {
          binding: 0,
          visibility: GPUShaderStage.FRAGMENT,
          texture: { sampleType: 'unfilterable-float' },
        },
      ],
    })

    // Temporary initialization to satisfy Typescript, will be overwritten by init
    // Or we can just use ! assertions but better to assign logic.
    // Actually we can just call init. But we need to assign properties to satisfy TS strict initialization if not !
    // Let's use ! for properties or initialize them in constructor via init.
    // Since init sets them, we can just call this.init(...)
    // However, TS complier might complain about fields not being initialized in constructor.
    // Let's rely on init() doing it.

    // We need to initialize properties before calling init if strict property initialization is on, or use assertion.
    // Given existing code didn't use !, I 'll assume standard strictness.
    // To be safe and clean, I will just copy the init logic into constructor effectively by calling it,
    // but I need to handle the "definite assignment assertion" or just accept that I am modifying the class structure.
    // Wait, I can't easily change property definitions to add '!' with replace_file_content on the constructor block only.
    // I already modified the bottom part to add `init`.
    // Now I am replacing the constructor.

    // Let's just update the constructor to call init.
    this.bindGroupPingIn = {} as any
    this.bindGroupPongIn = {} as any
    this.pingTextureView = {} as any
    this.pongTextureView = {} as any
    this.currentReadTexture = {} as any
    this.currentReadTextureView = {} as any
    this.currentWriteTexture = {} as any
    this.currentWriteTextureView = {} as any
    this.currentBindGroupIn = {} as any
    this.offscreenTextureSize = [0, 0, 1]

    this.init(canvas.width, canvas.height, device, presentationFormat)
  }

  preSubmit() {}

  swap() {
    const tempTexture = this.currentReadTexture
    const tempView = this.currentReadTextureView
    const tempBindGroup = this.currentBindGroupIn

    this.currentReadTexture = this.currentWriteTexture
    this.currentReadTextureView = this.currentWriteTextureView
    this.currentBindGroupIn =
      tempBindGroup === this.bindGroupPingIn
        ? this.bindGroupPongIn
        : this.bindGroupPingIn

    this.currentWriteTexture = tempTexture
    this.currentWriteTextureView = tempView
  }

  resize(
    width: number,
    height: number,
    device: GPUDevice,
    presentationFormat: GPUTextureFormat
  ) {
    // Destroy old textures
    this.currentReadTexture.destroy()
    this.currentWriteTexture.destroy()

    this.init(width, height, device, presentationFormat)
  }

  private init(
    width: number,
    height: number,
    device: GPUDevice,
    presentationFormat: GPUTextureFormat
  ) {
    this.offscreenTextureSize = [width, height, 1]

    const pingTexture = device.createTexture({
      size: this.offscreenTextureSize,
      format: presentationFormat,
      usage:
        GPUTextureUsage.RENDER_ATTACHMENT |
        GPUTextureUsage.TEXTURE_BINDING |
        GPUTextureUsage.COPY_SRC,
    })

    const pongTexture = device.createTexture({
      size: this.offscreenTextureSize,
      format: presentationFormat,
      usage:
        GPUTextureUsage.RENDER_ATTACHMENT |
        GPUTextureUsage.TEXTURE_BINDING |
        GPUTextureUsage.COPY_SRC,
    })

    const pingTextureView = pingTexture.createView()
    const pongTextureView = pongTexture.createView()
    this.pingTextureView = pingTextureView
    this.pongTextureView = pongTextureView

    this.bindGroupPingIn = device.createBindGroup({
      layout: this.pingPongBindGroupLayout,
      entries: [{ binding: 0, resource: pingTextureView }],
    })

    this.bindGroupPongIn = device.createBindGroup({
      layout: this.pingPongBindGroupLayout,
      entries: [{ binding: 0, resource: pongTextureView }],
    })

    this.currentReadTexture = pingTexture
    this.currentReadTextureView = pingTextureView
    this.currentWriteTexture = pongTexture
    this.currentWriteTextureView = pongTextureView
    this.currentBindGroupIn = this.bindGroupPingIn
  }
}

export default RTPingPong
