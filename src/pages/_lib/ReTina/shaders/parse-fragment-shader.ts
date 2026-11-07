import type { RTMaterialFuncs, RTRaymarchOptions } from '../types'
import parseCommonShader from './parse-common-shader'

type Props = {
  main?: string
  rtUniformKeys: string[]
  functions?: string
  materialFuncs: RTMaterialFuncs[]
  nTextures: number
  nBuffers?: number
  usePrevFrameTex?: boolean
  useInterlacing?: boolean
  bufferGroupIndex?: number
  prevFrameGroupIndex?: number
  distMapGroupIndex?: number
  raymarchOptions?: RTRaymarchOptions
}

function parseFragmentShader({
  main,
  functions,
  rtUniformKeys,
  materialFuncs,
  nTextures,
  nBuffers,
  usePrevFrameTex,
  useInterlacing,
  bufferGroupIndex,
  prevFrameGroupIndex,
  distMapGroupIndex,
  raymarchOptions,
}: Props) {
  const commonWGSL = parseCommonShader({
    functions,
    materialFuncs,
    nTextures,
    nBuffers,
    rtUniformKeys,
    usePrevFrameTex,
    bufferGroupIndex,
    prevFrameGroupIndex,
    raymarchOptions,
  })

  if (materialFuncs.length > 0 && !main) {
    main = /* wgsl */ `
      let scene = calcScene(uv);
      return vec4f(scene.color.rgb, 1.0);
    `
  }

  let fragWGSL = /* wgsl */ `
    ${commonWGSL}
    @fragment
    fn main(@builtin(position) fragPos: vec4f, @location(0) fragCoord: vec2f) -> @location(0) vec4f {
        var uv = 1. - fragCoord.xy;
        // #INTERLACING
        ${main ?? 'return vec4f(0, 0, 0, 1);'}
    }
  `

  if (useInterlacing) {
    const interlacingFrag = /* wgsl */ `
      let _fullY = min(i32(fragPos.y) * 2 + (i32(U.frame) & 1), i32(U.height) - 1);
      uv = vec2f(uv.x, (f32(_fullY) + 0.5) / U.height);
    `
    fragWGSL = fragWGSL.replace('// #INTERLACING', interlacingFrag)
  }

  // ── Distance map integration ──
  if (distMapGroupIndex !== undefined) {
    const binding = /* wgsl */ `
      @group(${distMapGroupIndex}) @binding(0) var distMapTex: texture_2d<f32>;
    `
    fragWGSL = fragWGSL.replace('// #DISTANCE_MAP_BINDING', binding)

    const coneTile =
      typeof raymarchOptions?.coneTile === 'number'
        ? raymarchOptions.coneTile
        : 8

    const advance = /* wgsl */ `
      let _dmDim = textureDimensions(distMapTex);
      let _dmCoord = clamp(vec2i(i32(uv.x * U.width) / ${coneTile}, i32(uv.y * U.height) / ${coneTile}), vec2i(0), vec2i(_dmDim) - vec2i(1));
      _startDist = textureLoad(distMapTex, _dmCoord, 0).r;
    `
    fragWGSL = fragWGSL.replace('// #DISTANCE_MAP_ADVANCE', advance)
  }

  return fragWGSL
}

export default parseFragmentShader
