import type RTUniform from './rt-uniform'
import type RTPingPong from './rt-ping-pong'

export type RTInterlacingProps = {
  device: GPUDevice
  canvas: HTMLCanvasElement
  presentationFormat: GPUTextureFormat
  rtUniform: RTUniform
  rtPingPong: RTPingPong
}

class RTInterlacing {
  private device: GPUDevice
  private presentationFormat: GPUTextureFormat
  private rtUniform: RTUniform
  private rtPingPong: RTPingPong

  halfTexture: GPUTexture
  halfTextureView: GPUTextureView
  halfTextureSize: [number, number, number]

  private resolvePipeline: GPURenderPipeline
  private resolveBindGroupLayout: GPUBindGroupLayout
  private resolveBindGroupPing: GPUBindGroup
  private resolveBindGroupPong: GPUBindGroup

  constructor({
    device,
    canvas,
    presentationFormat,
    rtUniform,
    rtPingPong,
  }: RTInterlacingProps) {
    this.device = device
    this.presentationFormat = presentationFormat
    this.rtUniform = rtUniform
    this.rtPingPong = rtPingPong

    const resolveWGSL = /* wgsl */ `
      struct GlobalUniform {
        frame: f32,
        time: f32,
        aspectRatio: f32,
        width: f32,
        height: f32,
      };

      @group(0) @binding(0) var<uniform> U: GlobalUniform;
      @group(0) @binding(1) var u_sampler: sampler;

      @group(1) @binding(0) var halfTex: texture_2d<f32>;
      @group(1) @binding(1) var prevFullTex: texture_2d<f32>;

      @vertex
      fn vs_main(@builtin(vertex_index) VertexIndex: u32) -> @builtin(position) vec4f {
        var pos = array<vec2f, 4>(
          vec2f(-1.0, 1.0),
          vec2f(-1.0, -1.0),
          vec2f(1.0, 1.0),
          vec2f(1.0, -1.0)
        );
        return vec4f(pos[VertexIndex], 0.0, 1.0);
      }

      @fragment
      fn fs_main(@builtin(position) fragPos: vec4f) -> @location(0) vec4f {
        let coord = vec2i(fragPos.xy);
        let frame = i32(U.frame);
        let isNewRow = (coord.y & 1) == (frame & 1);

        if (frame == 0 || isNewRow) {
          let halfDim = vec2i(textureDimensions(halfTex));
          let halfY = clamp(coord.y / 2, 0, halfDim.y - 1);
          let halfCoord = vec2i(clamp(coord.x, 0, halfDim.x - 1), halfY);
          return textureLoad(halfTex, halfCoord, 0);
        } else {
          return textureLoad(prevFullTex, coord, 0);
        }
      }
    `

    this.resolveBindGroupLayout = device.createBindGroupLayout({
      entries: [
        {
          binding: 0,
          visibility: GPUShaderStage.FRAGMENT,
          texture: { sampleType: 'unfilterable-float' },
        },
        {
          binding: 1,
          visibility: GPUShaderStage.FRAGMENT,
          texture: { sampleType: 'unfilterable-float' },
        },
      ],
    })

    const shaderModule = device.createShaderModule({ code: resolveWGSL })

    this.resolvePipeline = device.createRenderPipeline({
      layout: device.createPipelineLayout({
        bindGroupLayouts: [
          rtUniform.uniformBindGroupLayout,
          this.resolveBindGroupLayout,
        ],
      }),
      vertex: {
        module: shaderModule,
        entryPoint: 'vs_main',
      },
      fragment: {
        module: shaderModule,
        entryPoint: 'fs_main',
        targets: [{ format: presentationFormat }],
      },
      primitive: {
        topology: 'triangle-strip',
        frontFace: 'ccw',
        stripIndexFormat: 'uint32',
      },
    })

    this.halfTexture = {} as any
    this.halfTextureView = {} as any
    this.halfTextureSize = [0, 0, 1]
    this.resolveBindGroupPing = {} as any
    this.resolveBindGroupPong = {} as any

    this.initTextures(canvas.width, canvas.height)
  }

  private initTextures(width: number, height: number) {
    const halfHeight = Math.max(1, Math.ceil(height / 2))
    this.halfTextureSize = [width, halfHeight, 1]

    this.halfTexture = this.device.createTexture({
      size: this.halfTextureSize,
      format: this.presentationFormat,
      usage:
        GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING,
    })
    this.halfTextureView = this.halfTexture.createView()

    this.resolveBindGroupPing = this.device.createBindGroup({
      layout: this.resolveBindGroupLayout,
      entries: [
        { binding: 0, resource: this.halfTextureView },
        { binding: 1, resource: this.rtPingPong.pingTextureView },
      ],
    })

    this.resolveBindGroupPong = this.device.createBindGroup({
      layout: this.resolveBindGroupLayout,
      entries: [
        { binding: 0, resource: this.halfTextureView },
        { binding: 1, resource: this.rtPingPong.pongTextureView },
      ],
    })
  }

  resize(width: number, height: number) {
    this.halfTexture.destroy()
    this.initTextures(width, height)
  }

  encodeResolvePass(commandEncoder: GPUCommandEncoder, transparent?: boolean) {
    const resolvePass = commandEncoder.beginRenderPass({
      colorAttachments: [
        {
          view: this.rtPingPong.currentWriteTextureView,
          loadOp: 'clear',
          clearValue: { r: 0, g: 0, b: 0, a: transparent ? 0 : 1 },
          storeOp: 'store',
        },
      ],
    })

    resolvePass.setPipeline(this.resolvePipeline)
    resolvePass.setBindGroup(0, this.rtUniform.uniformBindGroup)

    const resolveGroup =
      this.rtPingPong.currentReadTextureView === this.rtPingPong.pingTextureView
        ? this.resolveBindGroupPing
        : this.resolveBindGroupPong

    resolvePass.setBindGroup(1, resolveGroup)
    resolvePass.draw(4, 1, 0, 0)
    resolvePass.end()
  }
}

export default RTInterlacing
