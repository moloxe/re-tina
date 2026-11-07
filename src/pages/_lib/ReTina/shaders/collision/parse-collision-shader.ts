import type { RTMaterialFuncs } from '../../types'
import parseCommonShader from '../parse-common-shader'

type Props = {
  functions?: string
  rtUniformKeys: string[]
  materialFuncs: RTMaterialFuncs[]
  nTextures: number
  nBuffers?: number
  usePrevFrameTex?: boolean
  bufferGroupIndex?: number
  dynamicGroupIndex: number
}

// TODO: Using opIntersection would be more "accurate".
function parseCollisionShader({
  functions,
  rtUniformKeys,
  materialFuncs,
  nTextures,
  nBuffers,
  usePrevFrameTex,
  bufferGroupIndex,
  dynamicGroupIndex,
}: Props) {
  const commonWGSL = parseCommonShader({
    functions,
    materialFuncs,
    nTextures,
    nBuffers,
    rtUniformKeys,
    usePrevFrameTex,
    bufferGroupIndex,
  })

  const materialSdFunctions = materialFuncs.map((m) => m.sdFunc)

  function parseSdMaterials(index: number, condition: '==' | '!=') {
    return /* wgsl */ `
      curDist = sdMaterial${index}(pos);
      if curDist < material.dist && i32(U.material${index}CollisionGroup) ${condition} params.collisionGroup {
        material.index = ${index};
        material.dist = curDist;
        material.pos = vec3f(
          U.material${index}Px,
          U.material${index}Py,
          U.material${index}Pz
        );
        material.color = vec3f(
          U.material${index}Cr,
          U.material${index}Cg,
          U.material${index}Cb
        );
      }`
  }

  const colWGSL = /* wgsl */ `
    ${commonWGSL}
    
    struct CollisionParams {
      collisionGroup: i32,
      pos: vec3f,
    }

    @group(${dynamicGroupIndex}) @binding(0) var<uniform> params: CollisionParams;

    fn sdInternalCollisionGroup(pos: vec3f) -> SdMaterial {
      var material = SdMaterial(-1, INF, vec3f(0.), vec3f(0.));
      var curDist: f32;

      ${materialSdFunctions
        .map((_, index) => parseSdMaterials(index, '=='))
        .join('\n')}

      return material;
    }

    fn sdExternalCollisionGroup(pos: vec3f) -> SdMaterial {
      var material = SdMaterial(-1, INF, vec3f(0.), vec3f(0.));
      var curDist: f32;

      ${materialSdFunctions
        .map((_, index) => parseSdMaterials(index, '!='))
        .join('\n')}

      return material;
    }

    fn calcExternalNormal(pos: vec3f) -> vec3f {
      var h = 1e-4;
      var k = vec2f(1., -1.);
      return normalize(
          k.xyy * sdExternalCollisionGroup(pos + k.xyy * h).dist +
          k.yyx * sdExternalCollisionGroup(pos + k.yyx * h).dist +
          k.yxy * sdExternalCollisionGroup(pos + k.yxy * h).dist +
          k.xxx * sdExternalCollisionGroup(pos + k.xxx * h).dist
      );
    }


    @compute @workgroup_size(1)
    fn main(@builtin(global_invocation_id) globalId: vec3<u32>) {
      let pos = params.pos;

      // Single O(1) SDF evaluation — no loop needed.
      // The SDF already encodes exact signed distance and analytic gradient at any point.
      // Negative dist  → pos is inside/penetrating the geometry.
      // Positive dist  → pos is outside; value = clearance before contact.
      let externalMaterial = sdExternalCollisionGroup(pos);
      let normal = calcExternalNormal(pos);

      arbitrary_result[0] = f32(externalMaterial.index);
      arbitrary_result[1] = externalMaterial.dist;
      arbitrary_result[2] = normal.x;
      arbitrary_result[3] = normal.y;
      arbitrary_result[4] = normal.z;
    }
  `

  return colWGSL
}

export default parseCollisionShader
