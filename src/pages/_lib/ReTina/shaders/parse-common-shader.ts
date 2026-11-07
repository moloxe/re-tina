import commonTemplateWGSL from './../shaders/common.wgsl?raw'
import parseSDWGSL from './raymarch/parse-sd-wgsl'
import type { RTMaterialFuncs, RTRaymarchOptions } from '../types'

type Props = {
  rtUniformKeys: string[]
  functions?: string
  materialFuncs: RTMaterialFuncs[]
  nTextures: number
  nBuffers?: number
  usePrevFrameTex?: boolean
  bufferGroupIndex?: number
  prevFrameGroupIndex?: number
  raymarchOptions?: RTRaymarchOptions
}

function parseCommonShader({
  functions,
  rtUniformKeys,
  materialFuncs,
  nTextures,
  nBuffers = 0,
  usePrevFrameTex,
  bufferGroupIndex,
  prevFrameGroupIndex,
  raymarchOptions,
}: Props) {
  let fragWGSL = commonTemplateWGSL

  fragWGSL = fragWGSL.replace(
    'UNIFORMS: f32, // #UNIFORMS',
    rtUniformKeys.map((u) => `${u}: f32,`).join('\n')
  )

  if (nTextures > 0) {
    function parseTexture(i: number) {
      return /* wgsl */ `
        @group(1) @binding(${i}) var tex${i}: texture_2d<f32>;
        fn getTex${i}Sample(uv: vec2<f32>) -> vec4<f32> {
          return textureSample(tex${i}, u_sampler, uv);
        }`
    }
    const textures = new Array(nTextures)
      .fill(0)
      .map((_, i) => parseTexture(i))
      .join('\n')
    fragWGSL = fragWGSL.replace('// #GROUP-1-BINDING-X', textures)
  }

  if (nBuffers > 0 && bufferGroupIndex !== undefined) {
    function parseBuffer(i: number) {
      return /* wgsl */ `
        @group(${bufferGroupIndex}) @binding(${i + nTextures}) var<storage, read> buffer${i}: array<f32>;
        fn getBuffer${i}(idx: i32) -> f32 {
          return buffer${i}[idx];
        }`
    }
    const buffers = new Array(nBuffers)
      .fill(0)
      .map((_, i) => parseBuffer(i))
      .join('\n')
    fragWGSL = fragWGSL.replace(
      '// #GROUP-1-BINDING-X',
      '// #GROUP-1-BINDING-X\n' + buffers
    )
  }

  if (usePrevFrameTex) {
    const groupIdx = prevFrameGroupIndex ?? 2
    const prevFrameFrag = /* wgsl */ `
      @group(${groupIdx}) @binding(0) var prevFrameTex: texture_2d<f32>;
      fn getPrevFrameTexSample(uv: vec2<f32>) -> vec4<f32> {
        return textureSample(prevFrameTex, u_sampler, uv);
      }`
    fragWGSL = fragWGSL.replace('// #GROUP-2-BINDING-X', prevFrameFrag)
  }

  if (functions) {
    fragWGSL = fragWGSL.replace('// #FUNCTIONS', functions)
  }

  if (materialFuncs.length > 0) {
    const sdWGSL = parseSDWGSL(materialFuncs, raymarchOptions)
    fragWGSL = fragWGSL.replace('// #RAY_MARCH_FUNCTIONS', sdWGSL)
  }

  return fragWGSL
}

export default parseCommonShader
