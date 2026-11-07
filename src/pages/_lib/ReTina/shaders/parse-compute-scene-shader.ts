import parseCommonShader from './parse-common-shader'
import type { RTMaterialFuncs, RTRaymarchOptions } from '../types'

type Props = {
  rtUniformKeys: string[]
  materialFuncs: RTMaterialFuncs[]
  nTextures: number
  nBuffers?: number
  usePrevFrameTex?: boolean
  functions?: string
  workgroupSize: number
  bufferGroupIndex?: number
  distMapGroupIndex: number
  coneTile: number
  raymarchOptions?: RTRaymarchOptions
}

function parseComputeSceneShader({
  rtUniformKeys,
  materialFuncs,
  nTextures,
  nBuffers,
  usePrevFrameTex,
  functions,
  workgroupSize,
  bufferGroupIndex,
  distMapGroupIndex,
  coneTile,
  raymarchOptions,
}: Props) {
  let commonWGSL = parseCommonShader({
    functions,
    materialFuncs,
    nTextures,
    nBuffers,
    rtUniformKeys,
    usePrevFrameTex,
    bufferGroupIndex,
    raymarchOptions,
  })

  // Remove the distance map placeholders — they are for fragment only
  commonWGSL = commonWGSL.replace('// #DISTANCE_MAP_BINDING', '')
  commonWGSL = commonWGSL.replace('// #DISTANCE_MAP_ADVANCE', '')

  return /* wgsl */ `
    ${commonWGSL}

    @group(${distMapGroupIndex}) @binding(0) var distMap: texture_storage_2d<r32float, write>;

    @compute @workgroup_size(${workgroupSize}, ${workgroupSize})
    fn main(@builtin(global_invocation_id) gid: vec3<u32>) {
      let dim = textureDimensions(distMap);
      if (gid.x >= dim.x || gid.y >= dim.y) { return; }

      let tileSize = f32(${coneTile});
      let uv = (vec2f(f32(gid.x), f32(gid.y)) + 0.5) * tileSize / vec2f(U.width, U.height);
      let ray = getCameraRay(uv);

      // Angular radius of the cone encompassing the tile plus conservative margin
      let coneK = ray.pixelAngle * (tileSize * 0.7071 + 0.5);

      var dist = 0.0;
      var safeDist = 0.0;
      for (var i: i32 = 0; i < 48; i = i + 1) {
        let p = ray.ro + ray.rd * dist;
        let d = map(p);
        let r = dist * coneK;
        if (d < r * 1.2 + RM_MIN_DIST) { break; }
        safeDist = max(0.0, dist - 0.05);
        let step = max(0.0, (d - r) / (1.0 + coneK)) * 0.7;
        dist += step;
        if (dist > RM_MAX_DIST) {
          safeDist = RM_MAX_DIST;
          break;
        }
      }

      textureStore(distMap, vec2i(i32(gid.x), i32(gid.y)), vec4f(safeDist, 0.0, 0.0, 0.0));
    }
  `
}

export default parseComputeSceneShader
