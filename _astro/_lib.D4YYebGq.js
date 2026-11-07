function e({sdWGSL:e,materialSdFunctions:t}){function n(e,t){let n=`vec3<f32>(U.material${t}Px, U.material${t}Py, U.material${t}Pz)`;return`
        fn sdMaterial${t}(posIn: vec3<f32>) -> f32 {
          let mRotation = ${`vec3<f32>(U.material${t}Rx, U.material${t}Ry, U.material${t}Rz)`};
          var pos = posIn - ${n};
          if length(mRotation) != 0.0 {
            pos = rotate(pos, mRotation);
          }
          ${e}
        }`}let r=t.map(n).join(`
`);e=e.replace(`// #SD-INDIVIDUAL-MATERIALS`,r);function i(e){return`
        curDist = sdMaterial${e}(pos);
        if curDist < material.dist {
          material.index = ${e};
          material.dist = curDist;
          material.pos = vec3<f32>(
            U.material${e}Px,
            U.material${e}Py,
            U.material${e}Pz
          );
          material.color = vec3<f32>(
            U.material${e}Cr,
            U.material${e}Cg,
            U.material${e}Cb
          );
        }`}let a=`
      var material = SdMaterial(-1, INF, vec3<f32>(0.), vec3<f32>(0.));
      var curDist: f32;

      ${t.map((e,t)=>i(t)).join(`
`)}

      return material;
    `;return e=e.replace(`// #SD-MATERIALS-FUNC`,a),e}function t({materialSdFunctions:e,sdWGSL:t}){function n(e){return`dist = min(dist, sdMaterial${e}(pos));`}let r=`
      var dist: f32 = INF;

      ${e.map((e,t)=>n(t)).join(`
`)}

      return dist;`;return t=t.replace(`// #MAP`,r),t}function n({materialLightFunctions:e,sdWGSL:t}){function n(e,t){return e||=`
          let lamb = dot(normal, -rd); // Camera as light
          let aoFactor = calculateDFAO(pos, normal);
          let finalColor = color * sqrt(lamb) * aoFactor;
          return vec4f(finalColor, 1f);`,`
        fn calcLightMaterial${t}(
          uv: vec2<f32>,
          ro: vec3<f32>,
          rd: vec3<f32>,
          pos: vec3<f32>,
          normal: vec3<f32>,
          color: vec3<f32>,
        ) -> vec4<f32> {
            ${e}
        }`}let r=e.map(n).join(`
`);t=t.replace(`// #LIGHT-INDIVIDUAL-MATERIALS`,r);function i(e){return`
        if(materialIndex == ${e}) {
          finalColor = calcLightMaterial${e}(uv, ro, rd, pos, normal, color);
        }`}let a=`
      var finalColor = vec4<f32>(0.0);
      ${e.map((e,t)=>i(t)).join(`
`)}
      return finalColor;`;return t=t.replace(`// #LIGHT-MATERIALS-FUNC`,a),t}function r(r,i){let a=`struct SdMaterial {
    index: i32,
    dist: f32,
    pos: vec3<f32>,
    color: vec3<f32>,
}

// #SD-INDIVIDUAL-MATERIALS

fn sdMaterials(pos: vec3<f32>) -> SdMaterial {
    // #SD-MATERIALS-FUNC
}

fn map(pos: vec3<f32>) -> f32 {
    // #MAP
}

fn calcNormalWithEps(pos: vec3<f32>, h: f32) -> vec3<f32> {
    let ZERO = min(u32(U.frame), 0u);
    var n = vec3<f32>(0.0);
    for (var i = ZERO; i < 4u; i = i + 1u) {
        let e = 0.5773 * (2.0 * vec3<f32>(
            f32(((i + 3u) >> 1u) & 1u),
            f32((i >> 1u) & 1u),
            f32(i & 1u)
        ) - 1.0);
        n = n + e * map(pos + e * h);
    }
    return normalize(n);
}

fn calcNormal(pos: vec3<f32>) -> vec3<f32> {
    return calcNormalWithEps(pos, 1e-4);
}

// #LIGHT-INDIVIDUAL-MATERIALS

fn calcLight(
    uv: vec2<f32>,
    ro: vec3<f32>,
    rd: vec3<f32>,
    pos: vec3<f32>,
    normal: vec3<f32>,
    color: vec3<f32>,
    materialIndex: i32
) -> vec4<f32> {
    // #LIGHT-MATERIALS-FUNC
}

const RM_MAX_ITER: i32 = /*#RM_MAX_ITER*/;
const RM_MIN_DIST: f32 = 1e-4;
const RM_MAX_DIST: f32 = /*#RM_MAX_DIST*/;
const RM_PIXEL_EPS: f32 = /*#RM_PIXEL_EPS*/;
const RM_RELAX: f32 = /*#RM_RELAX*/;
const RM_AO_SAMPLES: i32 = /*#RM_AO_SAMPLES*/;
const RM_DEBUG_STEPS: bool = /*#RM_DEBUG_STEPS*/;

struct RayHit {
    dist: f32,
    steps: i32,
    hit: bool,
}

fn rayMarchWithCone(ro: vec3<f32>, rd: vec3<f32>, startDist: f32, pixK: f32) -> RayHit {
    var totalDist = max(startDist, 0.0);
    var omega: f32 = RM_RELAX;
    var prevDist: f32 = 0.0;
    var stepLength: f32 = 0.0;
    var bestDist: f32 = totalDist;
    var bestRatio: f32 = INF;
    var steps: i32 = 0;

    for (var i: i32 = 0; i < RM_MAX_ITER; i = i + 1) {
        steps = i;
        let pos = ro + rd * totalDist;
        let currDist = map(pos);

        // Enhanced Sphere Tracing (Keinert et al.): overshoot check
        if (omega > 1.0 && stepLength > 0.0 && (currDist + prevDist) < stepLength) {
            totalDist -= stepLength - prevDist;
            stepLength = 0.0;
            prevDist = 0.0;
            omega = 1.0;
            continue;
        }

        let eps = max(RM_MIN_DIST, totalDist * pixK);
        if (currDist < eps) {
            return RayHit(totalDist, steps, true);
        }

        let ratio = currDist / eps;
        if (ratio < bestRatio) {
            bestRatio = ratio;
            bestDist = totalDist;
        }

        if (totalDist > RM_MAX_DIST) {
            return RayHit(-1.0, steps, false);
        }

        prevDist = currDist;
        stepLength = currDist * omega;
        totalDist += stepLength;
    }

    if (bestRatio < 4.0) {
        return RayHit(bestDist, steps, true);
    }

    return RayHit(-1.0, steps, false);
}

fn rayMarch(ro: vec3<f32>, rd: vec3<f32>, startDist: f32) -> SdMaterial {
    let hit = rayMarchWithCone(ro, rd, startDist, 0.0);
    if (!hit.hit) {
        return SdMaterial(-1, -1.0, vec3<f32>(0.0), vec3<f32>(0.0));
    }
    var mat = sdMaterials(ro + rd * hit.dist);
    mat.dist = hit.dist;
    return mat;
}

fn rayMarchDDA(ro: vec3<f32>, rd: vec3<f32>, voxelSize: f32, startDist: f32) -> SdMaterial {
    let advanced_ro = ro + rd * startDist;
    let ro_grid = advanced_ro / voxelSize;
    var mapPos = floor(ro_grid);
    let deltaDist = abs(vec3<f32>(1.0) / rd);
    let rayStep = sign(rd);
    var sideDist = (rayStep * (mapPos - ro_grid) + (rayStep * 0.5) + 0.5) * deltaDist;
    var mask = vec3<f32>(0.0);

    for (var i: i32 = 0; i < RM_MAX_ITER; i = i + 1) {
        if any(mapPos < vec3<f32>(-100.0 / voxelSize)) || any(mapPos > vec3<f32>(100.0 / voxelSize)) { break; }

        let voxelCenter = (mapPos + 0.5) * voxelSize;
        let d = map(voxelCenter);

        if d < (voxelSize * 0.5) {
            var dist = 0.0;
            if mask.x > 0.5 { dist = sideDist.x - deltaDist.x; } else if mask.y > 0.5 { dist = sideDist.y - deltaDist.y; } else { dist = sideDist.z - deltaDist.z; }
            var mat = sdMaterials(voxelCenter);
            mat.dist = dist * voxelSize;
            return mat;
        }

        if sideDist.x < sideDist.y {
            if sideDist.x < sideDist.z {
                sideDist.x += deltaDist.x;
                mapPos.x += rayStep.x;
                mask = vec3<f32>(1.0, 0.0, 0.0);
            } else {
                sideDist.z += deltaDist.z;
                mapPos.z += rayStep.z;
                mask = vec3<f32>(0.0, 0.0, 1.0);
            }
        } else {
            if sideDist.y < sideDist.z {
                sideDist.y += deltaDist.y;
                mapPos.y += rayStep.y;
                mask = vec3<f32>(0.0, 1.0, 0.0);
            } else {
                sideDist.z += deltaDist.z;
                mapPos.z += rayStep.z;
                mask = vec3<f32>(0.0, 0.0, 1.0);
            }
        }
    }

    return SdMaterial(-1, -1.0, vec3<f32>(0.0), vec3<f32>(0.0));
}

fn calculateDFAO(pos: vec3<f32>, normal: vec3<f32>) -> f32 {
    let AO_RADIUS = 1.;
    let AO_EPSILON = 1e-4;
    let numSamples = RM_AO_SAMPLES;
    var aoSum = 0.0;
    for (var i: i32 = 0; i < numSamples; i = i + 1) {
        let t_ratio = f32(i + 1) / f32(numSamples);
        let t_real_dist = AO_EPSILON + t_ratio * (AO_RADIUS - AO_EPSILON);
        let samplePos = pos + normal * t_real_dist;
        let dist = map(samplePos);
        let visibility = clamp(dist / t_real_dist, 0f, 1f);
        aoSum += (1f - visibility) * (1f - t_ratio * 0.5);
    }
    let aoFactor = 1f - aoSum / f32(numSamples);
    return clamp(aoFactor, 0f, 1f);
}

struct Ray {
    ro: vec3<f32>,
    rd: vec3<f32>,
    pixelAngle: f32,
}

fn getCameraRay(uv: vec2<f32>) -> Ray {
    var dir2d = vec2<f32>(uv.x, 1. - uv.y) * 2. - 1.;
    dir2d.x *= U.aspectRatio;

    let pos = vec3<f32>(U.camPosX, U.camPosY, U.camPosZ);
    let spherical = vec3<f32>(U.camSphericalR, U.camSphericalT, U.camSphericalP);

    let radFoc = radians(U.camFov);
    let focalLength = 1. / tan(radFoc * .5);

    var ro = vec3<f32>(0.);
    ro.z += spherical.x;
    ro = rotateXY(ro, spherical.z, spherical.y);
    ro += pos;

    var rd = normalize(vec3<f32>(dir2d, -focalLength));
    rd = rotateXY(rd, spherical.z, spherical.y);

    let pixelAngle = 2.0 / (focalLength * max(U.height, 1.0));

    return Ray(ro, rd, pixelAngle);
}

struct Scene {
    dist: f32,
    pos: vec3<f32>,
    normal: vec3<f32>,
    color: vec4<f32>,
    rd: vec3<f32>,
};

// #DISTANCE_MAP_BINDING

fn calcScene(uv: vec2<f32>) -> Scene {
    let ray = getCameraRay(uv);
    let pixK = ray.pixelAngle * RM_PIXEL_EPS;

    var _startDist: f32 = 0.0;
    // #DISTANCE_MAP_ADVANCE

    var finalDist = -1.0;
    var finalPos = vec3<f32>(0.0);
    var finalNormal = vec3<f32>(0.0);
    var finalColor = vec4<f32>(0.0, 0.0, 0.0, 1.0);

    if (_startDist < RM_MAX_DIST) {
        let marchStart = max(0.0, _startDist - 0.1);
        let hit = rayMarchWithCone(ray.ro, ray.rd, marchStart, pixK);

        if (RM_DEBUG_STEPS) {
            let heat = f32(hit.steps) / f32(RM_MAX_ITER);
            let heatColor = vec3<f32>(heat, 1.0 - abs(heat - 0.5) * 2.0, 1.0 - heat);
            return Scene(hit.dist, ray.ro + ray.rd * hit.dist, vec3<f32>(0.0, 1.0, 0.0), vec4<f32>(heatColor, 1.0), ray.rd);
        }

        if (hit.hit) {
            finalDist = hit.dist;
            finalPos = ray.ro + ray.rd * hit.dist;
            let normalEps = max(RM_MIN_DIST, hit.dist * pixK);
            finalNormal = calcNormalWithEps(finalPos, normalEps);
            let material = sdMaterials(finalPos);
            finalColor = calcLight(
                uv,
                ray.ro,
                ray.rd,
                finalPos,
                finalNormal,
                material.color,
                material.index
            );
        }
    }

    return Scene(finalDist, finalPos, finalNormal, finalColor, ray.rd);
}
`,o=r.map(e=>e.sdFunc),s=r.map(e=>e.lightFunc),c=i?.maxSteps??256,l=i?.maxDist??500,u=i?.pixelEps??.5,d=i?.relaxation??1.2,f=i?.aoSamples??5,p=i?.debugSteps??!1;return a=a.replace(`/*#RM_MAX_ITER*/`,`${c}`).replace(`/*#RM_MAX_DIST*/`,`${l}f`).replace(`/*#RM_PIXEL_EPS*/`,`${u}f`).replace(`/*#RM_RELAX*/`,`${d}f`).replace(`/*#RM_AO_SAMPLES*/`,`${f}`).replace(`/*#RM_DEBUG_STEPS*/`,`${p?`true`:`false`}`),a=e({sdWGSL:a,materialSdFunctions:o,materialLightFunctions:s}),a=t({materialSdFunctions:o,sdWGSL:a,materialLightFunctions:s}),a=n({materialSdFunctions:o,sdWGSL:a,materialLightFunctions:s}),a}function i({functions:e,rtUniformKeys:t,materialFuncs:n,nTextures:i,nBuffers:a=0,usePrevFrameTex:o,bufferGroupIndex:s,prevFrameGroupIndex:c,raymarchOptions:l}){let u=`struct GlobalUniform {
    UNIFORMS: f32, // #UNIFORMS
};

@group(0) @binding(0) var <uniform> U: GlobalUniform;
@group(0) @binding(1) var u_sampler: sampler;
@group(0) @binding(2) var<storage, read_write> arbitrary_result: array<f32>;

// Textures template:
// #GROUP-1-BINDING-X
// Prev. frame (ping-pong) template:
// #GROUP-2-BINDING-X

const PI     = f32(3.1415926535897932384626433832795);
const TWO_PI = f32(6.283185307179586476925286766559);
const E      = f32(2.71828182845904523536028747135266);
const INF    = f32(1e10);

fn toSpherical(pos: vec3<f32>) -> vec3<f32> {
    let r = length(pos);
    let theta = acos(pos.z / r);
    let phi = atan2(pos.y, pos.x);
    return vec3<f32>(r, theta, phi);
}

fn toCartesian(sph: vec3<f32>) -> vec3<f32> {
    let r = sph.x;
    let theta = sph.y;
    let phi = sph.z;
    let sinTheta = sin(theta);
    return vec3<f32>(
        r * sinTheta * cos(phi),
        r * sinTheta * sin(phi),
        r * cos(theta)
    );
}

fn rotate2d(pos: vec2f, rot: f32) -> vec2f {
    return vec2f(
        pos.x * cos(rot) - pos.y * sin(rot),
        pos.x * sin(rot) + pos.y * cos(rot)
    );
}

fn rotate(pos: vec3<f32>, rot: vec3<f32>) -> vec3<f32> {
    var result = pos;
    // Rotation around the Z axis
    let sinZ = sin(rot.z);
    let cosZ = cos(rot.z);
    var temp_x = result.x * cosZ - result.y * sinZ;
    var temp_y = result.x * sinZ + result.y * cosZ;
    result.x = temp_x;
    result.y = temp_y;
    // Rotation around the Y axis
    let sinY = sin(rot.y);
    let cosY = cos(rot.y);
    temp_x = result.x * cosY + result.z * sinY;
    var temp_z = result.z * cosY - result.x * sinY;
    result.x = temp_x;
    result.z = temp_z;
    // Rotation around the X axis
    let sinX = sin(rot.x);
    let cosX = cos(rot.x);
    temp_y = result.y * cosX - result.z * sinX;
    temp_z = result.y * sinX + result.z * cosX;
    result.y = temp_y;
    result.z = temp_z;
    return result;
}

fn rotateXY(vec: vec3f, aX: f32, aY: f32) -> vec3f {
    // Rotation around the X axis
    let sinX = sin(aX);
    let cosX = cos(aX);
    let temp_y = vec.y * cosX - vec.z * sinX;
    let temp_z = vec.y * sinX + vec.z * cosX;
    let rotatedX = vec3f(vec.x, temp_y, temp_z);
    // Rotation around the Y axis (applied to the result of the X rotation)
    let sinY = sin(aY);
    let cosY = cos(aY);
    let temp_x = rotatedX.x * cosY + rotatedX.z * sinY;
    let temp_z_final = rotatedX.z * cosY - rotatedX.x * sinY;
    return vec3f(temp_x, rotatedX.y, temp_z_final);
}

fn hsv2rgb(c: vec3f) -> vec3<f32> {
    let K = vec4<f32>(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
    let p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
    return c.z * mix(K.xxx, clamp(p - K.xxx, vec3<f32>(0.0), vec3<f32>(1.0)), c.y);
}

fn rgb2hsv(c: vec3f) -> vec3<f32> {
    let K = vec4<f32>(0.0, -1.0 / 3.0, 2.0 / 3.0, -1.0);
    let p = mix(vec4<f32>(c.zy, K.wz), vec4<f32>(c.yz, K.xy), step(c.b, c.g));
    let q = mix(vec4<f32>(p.xyw, c.r), vec4<f32>(c.r, p.yzx), step(p.x, c.r));
    let d = q.x - min(q.w, q.y);
    let e = 1.0e-10;
    return vec3<f32>(abs(q.z + (q.w - q.y) / (6.0 * d + e)), d / (q.x + e), q.x);
}

fn blinnPhong(
  // Environment
    rd: vec3<f32>,
    normal: vec3<f32>,
    minBright: f32,
  // Material
    pos: vec3<f32>,
    diffuseColor: vec3<f32>,
    shininess: f32,
  // Light
    lightPos: vec3<f32>,
    lightColor: vec3<f32>,
    power: f32,
) -> vec3<f32> {
    let viewDir = -rd;
    var lightDir = lightPos - pos;
    var distance = length(lightDir); distance *= distance;
    lightDir = normalize(lightDir);
    let lambertian = dot(normal, lightDir);

    var specular = 0.;
    if lambertian > 0. {
        let halfDir = normalize(lightDir + viewDir);
        let specAngle = max(dot(halfDir, normal), 0.);
        specular = pow(specAngle, shininess);
    }

    let lightPower = lightColor * power / distance;
    let ambientColor = minBright * mix(diffuseColor, lightColor, .5);

    let colorLinear = ambientColor + (diffuseColor * lambertian * lightPower + /* specColor * */ specular * lightPower);

    return colorLinear;
}

// https://iquilezles.org/articles/distfunctions/ 💪

fn sdTorus(p: vec3f, t: vec2f) -> f32 {
    let q = vec2(length(p.xz) - t.x, p.y);
    return length(q) - t.y;
}

fn sdSphere(p: vec3f, s: f32) -> f32 {
    return length(p) - s;
}

fn sdCutSphere(p: vec3f, r: f32, h: f32) -> f32 {
    let w = sqrt(r * r - h * h);
    let q = vec2f(length(p.xz), p.y);
    let s = max((h - r) * q.x * q.x + w * w * (h + r - 2.0 * q.y), h * q.x - w * q.y);
    if (s < 0.0) {
        return length(q) - r;
    } else if (q.x < w) {
        return h - q.y;
    } else {
        return length(q - vec2f(w, h));
    }
}

fn sdBox(p: vec3f, b: vec3f) -> f32 {
    let q = abs(p) - b;
    return length(max(q, vec3<f32>(0.0))) + min(max(q.x, max(q.y, q.z)), 0.0);
}

fn sdCapsule(p: vec3f, a: vec3f, b: vec3f, r: f32) -> f32 {
    let pa = p - a;
    let ba = b - a;
    let h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
    return length(pa - ba * h) - r;
}

fn opSmoothUnion(d1: f32, d2: f32, k: f32) -> f32 {
    let h = clamp(0.5 + 0.5 * (d2 - d1) / k, 0.0, 1.0);
    return mix(d2, d1, h) - k * h * (1.0 - h);
}

fn opSmoothSubtraction(d1: f32, d2: f32, k: f32) -> f32 {
    return -opSmoothUnion(d1, -d2, k);
}

// https://gist.github.com/munrocket/236ed5ba7e409b8bdf1ff6eca5dcdc39#simplex-noise

//  MIT License. © Ian McEwan, Stefan Gustavson, Munrocket, Johan Helsing
fn mod289(x: vec2f) -> vec2f {
    return x - floor(x * (1. / 289.)) * 289.;
}

fn mod289_3(x: vec3f) -> vec3f {
    return x - floor(x * (1. / 289.)) * 289.;
}

fn permute3(x: vec3f) -> vec3f {
    return mod289_3(((x * 34.) + 1.) * x);
}
//  MIT License. © Ian McEwan, Stefan Gustavson, Munrocket
fn snoise(v: vec2f) -> f32 {
    let C = vec4(
        0.211324865405187, // (3.0-sqrt(3.0))/6.0
        0.366025403784439, // 0.5*(sqrt(3.0)-1.0)
        -0.577350269189626, // -1.0 + 2.0 * C.x
        0.024390243902439 // 1.0 / 41.0
    );

    // First corner
    var i = floor(v + dot(v, C.yy));
    let x0 = v - i + dot(i, C.xx);

    // Other corners
    var i1 = select(vec2(0., 1.), vec2(1., 0.), x0.x > x0.y);

    // x0 = x0 - 0.0 + 0.0 * C.xx ;
    // x1 = x0 - i1 + 1.0 * C.xx ;
    // x2 = x0 - 1.0 + 2.0 * C.xx ;
    var x12 = x0.xyxy + C.xxzz;
    x12.x = x12.x - i1.x;
    x12.y = x12.y - i1.y;

    // Permutations
    i = mod289(i); // Avoid truncation effects in permutation

    var p = permute3(permute3(i.y + vec3(0., i1.y, 1.)) + i.x + vec3(0., i1.x, 1.));
    var m = max(0.5 - vec3(dot(x0, x0), dot(x12.xy, x12.xy), dot(x12.zw, x12.zw)), vec3(0.));
    m *= m;
    m *= m;

    // Gradients: 41 points uniformly over a line, mapped onto a diamond.
    // The ring size 17*17 = 289 is close to a multiple of 41 (41*7 = 287)
    let x = 2. * fract(p * C.www) - 1.;
    let h = abs(x) - 0.5;
    let ox = floor(x + 0.5);
    let a0 = x - ox;

    // Normalize gradients implicitly by scaling m
    // Approximation of: m *= inversesqrt( a0*a0 + h*h );
    m *= 1.79284291400159 - 0.85373472095314 * (a0 * a0 + h * h);

    // Compute final noise value at P
    let g = vec3(a0.x * x0.x + h.x * x0.y, a0.yz * x12.xz + h.yz * x12.yw);
    return 130. * dot(m, g);
}

// Translated from:
// https://github.com/ashima/webgl-noise/blob/master/src/noise3D.glsl
fn mod289_v3(x: vec3<f32>) -> vec3<f32> {
    return x - floor(x * (1.0 / 289.0)) * 289.0;
}
fn mod289_v4(x: vec4<f32>) -> vec4<f32> {
    return x - floor(x * (1.0 / 289.0)) * 289.0;
}
fn permute(x: vec4<f32>) -> vec4<f32> {
    return mod289_v4((x * 34.0 + 10.0) * x);
}
fn taylorInvSqrt(r: vec4<f32>) -> vec4<f32> {
    return 1.79284291400159 - 0.85373472095314 * r;
}
fn snoise3d(v: vec3<f32>) -> f32 {
    let C: vec2<f32> = vec2<f32>(1.0 / 6.0, 1.0 / 3.0);
    let D: vec4<f32> = vec4<f32>(0.0, 0.5, 1.0, 2.0);
    var i: vec3<f32> = floor(v + dot(v, vec3<f32>(C.y)));
    let x0: vec3<f32> = v - i + dot(i, vec3<f32>(C.x));
    let g: vec3<f32> = step(x0.yzx, x0.xyz);
    let l: vec3<f32> = 1.0 - g;
    let i1: vec3<f32> = min(g.xyz, l.zxy);
    let i2: vec3<f32> = max(g.xyz, l.zxy);
    let x1: vec3<f32> = x0 - i1 + vec3<f32>(C.x);
    let x2: vec3<f32> = x0 - i2 + vec3<f32>(C.y);
    let x3: vec3<f32> = x0 - vec3<f32>(D.y);
    i = mod289_v3(i);
    let p: vec4<f32> = permute(permute(permute(
        i.z + vec4<f32>(0.0, i1.z, i2.z, 1.0)
    ) + i.y + vec4<f32>(0.0, i1.y, i2.y, 1.0)) + i.x + vec4<f32>(0.0, i1.x, i2.x, 1.0));
    let n_: f32 = 0.142857142857;
    let ns: vec3<f32> = n_ * D.wyz - D.xzx;
    let j: vec4<f32> = p - 49.0 * floor(p * ns.z * ns.z);
    let x_: vec4<f32> = floor(j * ns.z);
    let y_: vec4<f32> = floor(j - 7.0 * x_);
    let x: vec4<f32> = x_ * ns.x + vec4<f32>(ns.y);
    let y: vec4<f32> = y_ * ns.x + vec4<f32>(ns.y);
    let h: vec4<f32> = 1.0 - abs(x) - abs(y);
    let b0: vec4<f32> = vec4<f32>(x.xy, y.xy);
    let b1: vec4<f32> = vec4<f32>(x.zw, y.zw);
    let s0: vec4<f32> = floor(b0) * 2.0 + 1.0;
    let s1: vec4<f32> = floor(b1) * 2.0 + 1.0;
    let sh: vec4<f32> = -step(h, vec4<f32>(0.0));
    let a0: vec4<f32> = b0.xzyw + s0.xzyw * sh.xxyy;
    let a1: vec4<f32> = b1.xzyw + s1.xzyw * sh.zzww;
    let p0: vec3<f32> = vec3<f32>(a0.xy, h.x);
    let p1: vec3<f32> = vec3<f32>(a0.zw, h.y);
    let p2: vec3<f32> = vec3<f32>(a1.xy, h.z);
    let p3: vec3<f32> = vec3<f32>(a1.zw, h.w);
    let norm: vec4<f32> = taylorInvSqrt(vec4<f32>(dot(p0, p0), dot(p1, p1), dot(p2, p2), dot(p3, p3)));
    let p0_norm: vec3<f32> = p0 * norm.x;
    let p1_norm: vec3<f32> = p1 * norm.y;
    let p2_norm: vec3<f32> = p2 * norm.z;
    let p3_norm: vec3<f32> = p3 * norm.w;
    var m: vec4<f32> = max(0.5 - vec4<f32>(dot(x0, x0), dot(x1, x1), dot(x2, x2), dot(x3, x3)), vec4<f32>(0.0));
    m = m * m;
    return 105.0 * dot(m * m, vec4<f32>(dot(p0_norm, x0), dot(p1_norm, x1), dot(p2_norm, x2), dot(p3_norm, x3)));
}

// #FUNCTIONS
// #RAY_MARCH_FUNCTIONS
`;if(u=u.replace(`UNIFORMS: f32, // #UNIFORMS`,t.map(e=>`${e}: f32,`).join(`
`)),i>0){function e(e){return`
        @group(1) @binding(${e}) var tex${e}: texture_2d<f32>;
        fn getTex${e}Sample(uv: vec2<f32>) -> vec4<f32> {
          return textureSample(tex${e}, u_sampler, uv);
        }`}let t=Array(i).fill(0).map((t,n)=>e(n)).join(`
`);u=u.replace(`// #GROUP-1-BINDING-X`,t)}if(a>0&&s!==void 0){function e(e){return`
        @group(${s}) @binding(${e+i}) var<storage, read> buffer${e}: array<f32>;
        fn getBuffer${e}(idx: i32) -> f32 {
          return buffer${e}[idx];
        }`}let t=Array(a).fill(0).map((t,n)=>e(n)).join(`
`);u=u.replace(`// #GROUP-1-BINDING-X`,`// #GROUP-1-BINDING-X
`+t)}if(o){let e=`
      @group(${c??2}) @binding(0) var prevFrameTex: texture_2d<f32>;
      fn getPrevFrameTexSample(uv: vec2<f32>) -> vec4<f32> {
        return textureSample(prevFrameTex, u_sampler, uv);
      }`;u=u.replace(`// #GROUP-2-BINDING-X`,e)}if(e&&(u=u.replace(`// #FUNCTIONS`,e)),n.length>0){let e=r(n,l);u=u.replace(`// #RAY_MARCH_FUNCTIONS`,e)}return u}function a({main:e,functions:t,rtUniformKeys:n,materialFuncs:r,nTextures:a,nBuffers:o,usePrevFrameTex:s,useInterlacing:c,bufferGroupIndex:l,prevFrameGroupIndex:u,distMapGroupIndex:d,raymarchOptions:f}){let p=i({functions:t,materialFuncs:r,nTextures:a,nBuffers:o,rtUniformKeys:n,usePrevFrameTex:s,bufferGroupIndex:l,prevFrameGroupIndex:u,raymarchOptions:f});r.length>0&&!e&&(e=`
      let scene = calcScene(uv);
      return vec4f(scene.color.rgb, 1.0);
    `);let m=`
    ${p}
    @fragment
    fn main(@builtin(position) fragPos: vec4f, @location(0) fragCoord: vec2f) -> @location(0) vec4f {
        var uv = 1. - fragCoord.xy;
        // #INTERLACING
        ${e??`return vec4f(0, 0, 0, 1);`}
    }
  `;if(c&&(m=m.replace(`// #INTERLACING`,`
      let _fullY = min(i32(fragPos.y) * 2 + (i32(U.frame) & 1), i32(U.height) - 1);
      uv = vec2f(uv.x, (f32(_fullY) + 0.5) / U.height);
    `)),d!==void 0){let e=`
      @group(${d}) @binding(0) var distMapTex: texture_2d<f32>;
    `;m=m.replace(`// #DISTANCE_MAP_BINDING`,e);let t=typeof f?.coneTile==`number`?f.coneTile:8,n=`
      let _dmDim = textureDimensions(distMapTex);
      let _dmCoord = clamp(vec2i(i32(uv.x * U.width) / ${t}, i32(uv.y * U.height) / ${t}), vec2i(0), vec2i(_dmDim) - vec2i(1));
      _startDist = textureLoad(distMapTex, _dmCoord, 0).r;
    `;m=m.replace(`// #DISTANCE_MAP_ADVANCE`,n)}return m}var o=class{device;buffer;uniform={};uniformBindGroupLayout;uniformBindGroup;constructor(e,t){this.device=e;let n=Object.keys(t);this.buffer=e.createBuffer({size:n.length*4,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST}),n.forEach((e,n)=>{this.uniform[e]={value:t[e],offSet:n*4},this.set(e,t[e])}),this.uniformBindGroupLayout=e.createBindGroupLayout({entries:[{binding:0,visibility:GPUShaderStage.FRAGMENT,buffer:{type:`uniform`}},{binding:1,visibility:GPUShaderStage.FRAGMENT,sampler:{type:`non-filtering`}}]}),this.uniformBindGroup=this.device.createBindGroup({layout:this.uniformBindGroupLayout,entries:[{binding:0,resource:{buffer:this.getBuffer()}},{binding:1,resource:this.device.createSampler({addressModeU:`repeat`,addressModeV:`repeat`,magFilter:`nearest`,minFilter:`nearest`})}]})}getBuffer(){return this.buffer}getKeysSortedByOffset(){return Object.keys(this.uniform).toSorted((e,t)=>this.uniform[e].offSet-this.uniform[t].offSet)}set(e,t){if(!this.uniform[e])throw Error(`Uniform ${e} not found`);this.uniform[e].value=t,this.device.queue.writeBuffer(this.buffer,this.uniform[e].offSet,new Float32Array([t]))}get(e){if(!this.uniform[e])throw Error(`Uniform ${e} not found`);return this.uniform[e].value}getCustomBindingsForCollisions(e){let t=this.device.createBindGroupLayout({entries:[{binding:0,visibility:GPUShaderStage.COMPUTE,buffer:{type:`uniform`}},{binding:1,visibility:GPUShaderStage.COMPUTE,sampler:{type:`non-filtering`}},{binding:2,visibility:GPUShaderStage.COMPUTE,buffer:{type:`storage`}}]});return{uniformBindGroupLayout:t,uniformBindGroup:this.device.createBindGroup({layout:t,entries:[{binding:0,resource:{buffer:this.getBuffer()}},{binding:1,resource:this.device.createSampler({addressModeU:`repeat`,addressModeV:`repeat`,magFilter:`nearest`,minFilter:`nearest`})},{binding:2,resource:{buffer:e}}]})}}},s=class{texs;device;textures;textureEntries;textureBindGroupLayout;constructor(e,t){this.texs=t,this.device=e,this.textures=this.texs.map(({width:e,height:t})=>this.device.createTexture({size:[e,t,1],format:`rgba8unorm`,usage:GPUTextureUsage.COPY_DST|GPUTextureUsage.TEXTURE_BINDING})),this.textureEntries=this.textures.map((e,t)=>({binding:t,resource:e.createView()})),this.textureBindGroupLayout=e.createBindGroupLayout({entries:t.map((e,t)=>({binding:t,visibility:GPUShaderStage.FRAGMENT,texture:{sampleType:`unfilterable-float`}}))})}setTexture(e,t){let n=this.texs[e].width,r=this.texs[e].height,i=this.textures[e];this.device.queue.writeTexture({texture:i},t,{offset:0,bytesPerRow:n*4,rowsPerImage:r},[n,r,1])}getTextureEntries(){return this.textureEntries}length(){return this.texs.length}},c=class{pingPongBindGroupLayout;bindGroupPingIn;bindGroupPongIn;pingTextureView;pongTextureView;currentReadTexture;currentReadTextureView;currentWriteTexture;currentWriteTextureView;currentBindGroupIn;offscreenTextureSize;constructor(e,t,n){this.pingPongBindGroupLayout=t.createBindGroupLayout({entries:[{binding:0,visibility:GPUShaderStage.FRAGMENT,texture:{sampleType:`unfilterable-float`}}]}),this.bindGroupPingIn={},this.bindGroupPongIn={},this.pingTextureView={},this.pongTextureView={},this.currentReadTexture={},this.currentReadTextureView={},this.currentWriteTexture={},this.currentWriteTextureView={},this.currentBindGroupIn={},this.offscreenTextureSize=[0,0,1],this.init(e.width,e.height,t,n)}preSubmit(){}swap(){let e=this.currentReadTexture,t=this.currentReadTextureView,n=this.currentBindGroupIn;this.currentReadTexture=this.currentWriteTexture,this.currentReadTextureView=this.currentWriteTextureView,this.currentBindGroupIn=n===this.bindGroupPingIn?this.bindGroupPongIn:this.bindGroupPingIn,this.currentWriteTexture=e,this.currentWriteTextureView=t}resize(e,t,n,r){this.currentReadTexture.destroy(),this.currentWriteTexture.destroy(),this.init(e,t,n,r)}init(e,t,n,r){this.offscreenTextureSize=[e,t,1];let i=n.createTexture({size:this.offscreenTextureSize,format:r,usage:GPUTextureUsage.RENDER_ATTACHMENT|GPUTextureUsage.TEXTURE_BINDING|GPUTextureUsage.COPY_SRC}),a=n.createTexture({size:this.offscreenTextureSize,format:r,usage:GPUTextureUsage.RENDER_ATTACHMENT|GPUTextureUsage.TEXTURE_BINDING|GPUTextureUsage.COPY_SRC}),o=i.createView(),s=a.createView();this.pingTextureView=o,this.pongTextureView=s,this.bindGroupPingIn=n.createBindGroup({layout:this.pingPongBindGroupLayout,entries:[{binding:0,resource:o}]}),this.bindGroupPongIn=n.createBindGroup({layout:this.pingPongBindGroupLayout,entries:[{binding:0,resource:s}]}),this.currentReadTexture=i,this.currentReadTextureView=o,this.currentWriteTexture=a,this.currentWriteTextureView=s,this.currentBindGroupIn=this.bindGroupPingIn}};async function l({device:e,presentationFormat:t,context:n,canvas:r,main:i,materialFuncs:o,functions:s,rtUniform:c,rtTexture:l,rtBuffer:u,usePrevFrameTex:d,useInterlacing:f,bindGroupLayouts:p,prevFrameGroupIndex:m,rtPingPong:h,rtInterlacing:g,transparent:_,rtComputeScene:v,distMapGroupIndex:y,raymarchOptions:b}){let x=a({main:i,functions:s,materialFuncs:o,rtUniformKeys:c.getKeysSortedByOffset(),nTextures:l.length(),nBuffers:u?u.length():0,bufferGroupIndex:1,prevFrameGroupIndex:m,usePrevFrameTex:d,useInterlacing:f,distMapGroupIndex:y,raymarchOptions:b}),S=e.createRenderPipeline({layout:e.createPipelineLayout({bindGroupLayouts:p}),vertex:{module:e.createShaderModule({code:`struct VSOut {
    @builtin(position) Position: vec4<f32>,
    @location(0)       uvs: vec2<f32>
};

@vertex
fn main(@builtin(vertex_index) VertexIndex: u32) -> VSOut {
    var pos = array<vec2<f32>, 4>(vec2<f32>(-1.0, 1.0),
        vec2<f32>(-1.0, -1.0),
        vec2<f32>(1.0, 1.0),
        vec2<f32>(1.0, -1.0));

    var uvs = array<vec2<f32>, 4>(vec2<f32>(1.0, 1.0),
        vec2<f32>(1.0, -1.0),
        vec2<f32>(-1.0, 1.0),
        vec2<f32>(-1.0, -1.0));

    var vsOut: VSOut;
    vsOut.Position = vec4<f32>(pos[ VertexIndex ], 0.0, 1.0);
    vsOut.uvs = uvs[ VertexIndex ] * 0.5 + 0.5;
    return vsOut;
}
`}),entryPoint:`main`},fragment:{module:e.createShaderModule({code:x}),entryPoint:`main`,targets:[{format:t}]},primitive:{topology:`triangle-strip`,frontFace:`ccw`,stripIndexFormat:`uint32`}}),C=0,w=null;function T(e){let t=performance.now()/1e3;w===null&&(w=performance.now()/1e3);let n=t-w;c.set(`frame`,C),c.set(`time`,n),c.set(`aspectRatio`,r.width/r.height),c.set(`width`,r.width),c.set(`height`,r.height),c.set(`camPosX`,e.pos.x),c.set(`camPosY`,e.pos.y),c.set(`camPosZ`,e.pos.z),c.set(`camSphericalR`,e.spherical.radius),c.set(`camSphericalT`,e.spherical.theta),c.set(`camSphericalP`,e.spherical.phi),c.set(`camFov`,e.fov)}let E=l.getTextureEntries();u&&u.getBufferEntries().forEach((e,t)=>{E.push({binding:t+l.length(),resource:e.resource})});let D=e.createBindGroup({layout:S.getBindGroupLayout(1),entries:E});function O({camera:t}){T(t);let r=e.createCommandEncoder();v&&v.encodePass(r);let i={colorAttachments:[{view:g?g.halfTextureView:h?h.currentWriteTextureView:n.getCurrentTexture().createView(),loadOp:`clear`,clearValue:{r:0,g:0,b:0,a:+!_},storeOp:`store`}]},a=r.beginRenderPass(i);a.setPipeline(S),a.setBindGroup(0,c.uniformBindGroup),a.setBindGroup(1,D),h&&m!==void 0&&a.setBindGroup(m,h.currentBindGroupIn),v&&y!==void 0&&a.setBindGroup(y,v.distMapReadBindGroup),a.draw(4,1,0,0),a.end(),g&&g.encodeResolvePass(r,_),h&&r.copyTextureToTexture({texture:h.currentWriteTexture},{texture:n.getCurrentTexture()},h.offscreenTextureSize),e.queue.submit([r.finish()]),h&&h.swap(),C++}return O}async function u(){let e=await navigator.gpu.requestAdapter({powerPreference:`high-performance`});if(!e)throw Error(`No adapter found`);let t=e.features.has(`shader-f16`);return t||console.warn(`shader-f16 not available`),{device:await e.requestDevice({requiredFeatures:t?[`shader-f16`]:[],requiredLimits:{maxBindGroups:e.limits.maxBindGroups}}),presentationFormat:navigator.gpu.getPreferredCanvasFormat()}}var d=class{setPos;getPos;setRot;setColor;setCollisionGroup;checkForCollisions;collisionGroup=-1;index;rt;constructor({material:e,rt:t,index:n}){this.rt=t,e.pos||={x:0,y:0,z:0},e.color||={r:1,g:1,b:1},e.rotation||={x:0,y:0,z:0};let{set:r,get:i}=t.registerUniform(`material${n}Px`,e.pos.x),{set:a,get:o}=t.registerUniform(`material${n}Py`,e.pos.y),{set:s,get:c}=t.registerUniform(`material${n}Pz`,e.pos.z);this.getPos=()=>({x:i(),y:o(),z:c()}),this.setPos=e=>{e.x!==void 0&&r(e.x),e.y!==void 0&&a(e.y),e.z!==void 0&&s(e.z)};let l=t.registerUniform(`material${n}Rx`,e.rotation.x).set,u=t.registerUniform(`material${n}Ry`,e.rotation.y).set,d=t.registerUniform(`material${n}Rz`,e.rotation.z).set;this.setRot=e=>{e.x!==void 0&&l(e.x),e.y!==void 0&&u(e.y),e.z!==void 0&&d(e.z)};let f=t.registerUniform(`material${n}Cr`,e.color.r).set,p=t.registerUniform(`material${n}Cg`,e.color.g).set,m=t.registerUniform(`material${n}Cb`,e.color.b).set;this.setColor=e=>{e.r!==void 0&&f(e.r),e.g!==void 0&&p(e.g),e.b!==void 0&&m(e.b)},e.enableCollisions&&(this.collisionGroup=n),this.setCollisionGroup=t.registerUniform(`material${n}CollisionGroup`,this.collisionGroup).set,this.index=n}checkCollision(e){return this.rt.checkCollision(this.index,e)}getIndex(){return this.index}};function f({functions:e,rtUniformKeys:t,materialFuncs:n,nTextures:r,nBuffers:a,usePrevFrameTex:o,bufferGroupIndex:s,dynamicGroupIndex:c}){let l=i({functions:e,materialFuncs:n,nTextures:r,nBuffers:a,rtUniformKeys:t,usePrevFrameTex:o,bufferGroupIndex:s}),u=n.map(e=>e.sdFunc);function d(e,t){return`
      curDist = sdMaterial${e}(pos);
      if curDist < material.dist && i32(U.material${e}CollisionGroup) ${t} params.collisionGroup {
        material.index = ${e};
        material.dist = curDist;
        material.pos = vec3f(
          U.material${e}Px,
          U.material${e}Py,
          U.material${e}Pz
        );
        material.color = vec3f(
          U.material${e}Cr,
          U.material${e}Cg,
          U.material${e}Cb
        );
      }`}return`
    ${l}
    
    struct CollisionParams {
      collisionGroup: i32,
      pos: vec3f,
    }

    @group(${c}) @binding(0) var<uniform> params: CollisionParams;

    fn sdInternalCollisionGroup(pos: vec3f) -> SdMaterial {
      var material = SdMaterial(-1, INF, vec3f(0.), vec3f(0.));
      var curDist: f32;

      ${u.map((e,t)=>d(t,`==`)).join(`
`)}

      return material;
    }

    fn sdExternalCollisionGroup(pos: vec3f) -> SdMaterial {
      var material = SdMaterial(-1, INF, vec3f(0.), vec3f(0.));
      var curDist: f32;

      ${u.map((e,t)=>d(t,`!=`)).join(`
`)}

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
  `}function p({buffers:e,main:t,functions:n,workgroupSize:r}){return[`
    const PI     = f32(3.1415926535897932384626433832795);
    const TWO_PI = f32(6.283185307179586476925286766559);
    const E      = f32(2.71828182845904523536028747135266);
    const INF    = f32(1e10);
  `,e.map((e,t)=>`@group(0) @binding(${t}) var<storage, ${e.readOnly?`read`:`read_write`}> ${e.name}: array<${e.wgslType}>;`).join(`
`),n??``,`
@compute @workgroup_size(${r})
fn main(@builtin(global_invocation_id) gid: vec3<u32>) {
${t}
}
`].join(`
`)}function m(e){return e instanceof Float32Array?`f32`:e instanceof Uint32Array?`u32`:`i32`}var h=class{device;pipeline;bindGroup;storageBuffers=[];readBuffers=[];bufferSizes=[];destroyed=!1;runningRef={value:!1};constructor(e){let{device:t,buffers:n}=e;this.device=t;let r=[],i=[];for(let e=0;e<n.length;e++){let{data:a,readOnly:o}=n[e],s=a.byteLength;this.bufferSizes.push(s);let c=t.createBuffer({size:s,usage:GPUBufferUsage.STORAGE|GPUBufferUsage.COPY_SRC|GPUBufferUsage.COPY_DST});t.queue.writeBuffer(c,0,a),this.storageBuffers.push(c);let l=t.createBuffer({size:s,usage:GPUBufferUsage.MAP_READ|GPUBufferUsage.COPY_DST});this.readBuffers.push(l),r.push({binding:e,visibility:GPUShaderStage.COMPUTE,buffer:{type:o?`read-only-storage`:`storage`}}),i.push({binding:e,resource:{buffer:c}})}let a;a=`main`in e&&e.main?p({buffers:n.map(e=>({name:e.name,wgslType:m(e.data),readOnly:e.readOnly??!1})),main:e.main,functions:e.functions,workgroupSize:e.workgroupSize??64}):e.code;let o=t.createBindGroupLayout({entries:r});this.pipeline=t.createComputePipeline({layout:t.createPipelineLayout({bindGroupLayouts:[o]}),compute:{module:t.createShaderModule({code:a}),entryPoint:`main`}}),this.bindGroup=t.createBindGroup({layout:o,entries:i})}updateBuffer(e,t){if(this.destroyed)throw Error(`RTCompute: already destroyed`);if(e<0||e>=this.storageBuffers.length)throw Error(`RTCompute: buffer index ${e} out of range`);this.device.queue.writeBuffer(this.storageBuffers[e],0,t)}async run(e,t=1,n=1){if(this.destroyed)throw Error(`RTCompute: already destroyed`);if(this.runningRef.value)return null;this.runningRef.value=!0;try{let r=this.device.createCommandEncoder(),i=r.beginComputePass();i.setPipeline(this.pipeline),i.setBindGroup(0,this.bindGroup),i.dispatchWorkgroups(e,t,n),i.end();for(let e=0;e<this.storageBuffers.length;e++)r.copyBufferToBuffer(this.storageBuffers[e],0,this.readBuffers[e],0,this.bufferSizes[e]);return this.device.queue.submit([r.finish()]),await Promise.all(this.readBuffers.map(async e=>{await e.mapAsync(GPUMapMode.READ);let t=e.getMappedRange().slice(0);return e.unmap(),t}))}finally{this.runningRef.value=!1}}destroy(){if(!this.destroyed){this.destroyed=!0;for(let e of this.storageBuffers)e.destroy();for(let e of this.readBuffers)e.destroy();this.storageBuffers=[],this.readBuffers=[]}}static async dispatch({device:e,pipeline:t,bindGroups:n,workgroups:r,resultBuffer:i,resultSize:a,runningRef:o}){if(o){if(o.value)return null;o.value=!0}let s=e.createBuffer({size:a,usage:GPUBufferUsage.COPY_DST|GPUBufferUsage.MAP_READ});try{let o=e.createCommandEncoder(),c=o.beginComputePass();c.setPipeline(t);for(let{index:e,group:t}of n)c.setBindGroup(e,t);c.dispatchWorkgroups(...r),c.end(),o.copyBufferToBuffer(i,0,s,0,a),e.queue.submit([o.finish()]),await s.mapAsync(GPUMapMode.READ);let l=new Float32Array(s.getMappedRange().slice(0));return s.unmap(),l}finally{s.destroy(),o&&(o.value=!1)}}},g=class{device;computePipeline;paramsBindGroup;paramsBuffer;uniformBindGroup;resultBufferSize;resultBuffer;rtTexture;rtBuffer;nTextures;computeBindGroupsTemplate=[];constructor({device:e,functions:t,rtUniformKeys:n,materialFuncs:r,nTextures:i,usePrevFrameTex:a,rtUniform:o,rtTexture:s,rtBuffer:c}){this.device=e,this.rtTexture=s,this.rtBuffer=c,this.nTextures=i,this.resultBufferSize=Float32Array.BYTES_PER_ELEMENT*5,this.resultBuffer=e.createBuffer({size:this.resultBufferSize,usage:GPUBufferUsage.STORAGE|GPUBufferUsage.COPY_SRC});let{uniformBindGroupLayout:l,uniformBindGroup:u}=o.getCustomBindingsForCollisions(this.resultBuffer);this.uniformBindGroup=u,this.paramsBuffer=e.createBuffer({size:32,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST});let d=e.createBindGroupLayout({entries:[{binding:0,visibility:GPUShaderStage.COMPUTE,buffer:{type:`uniform`}}]});this.paramsBindGroup=e.createBindGroup({layout:d,entries:[{binding:0,resource:{buffer:this.paramsBuffer}}]});let p=Array.from({length:i},(e,t)=>({binding:t,visibility:GPUShaderStage.COMPUTE,texture:{sampleType:`unfilterable-float`}}));c&&Array.from({length:c.length()},(e,t)=>{p.push({binding:t+i,visibility:GPUShaderStage.COMPUTE,buffer:{type:`read-only-storage`}})});let m=[l,e.createBindGroupLayout({entries:p})];this.computeBindGroupsTemplate.push({index:0,group:u});let h=m.length;m.push(d),this.computeBindGroupsTemplate.push({index:h,group:this.paramsBindGroup});let g=f({functions:t,rtUniformKeys:n,materialFuncs:r,nTextures:i,nBuffers:c?c.length():0,bufferGroupIndex:1,dynamicGroupIndex:h,usePrevFrameTex:a});this.computePipeline=e.createComputePipeline({layout:e.createPipelineLayout({bindGroupLayouts:m}),compute:{module:e.createShaderModule({code:g}),entryPoint:`main`}})}async checkCollision(e,t){this.device.queue.writeBuffer(this.paramsBuffer,0,new Int32Array([e])),this.device.queue.writeBuffer(this.paramsBuffer,16,new Float32Array([t.x,t.y,t.z]));let n=[...this.rtTexture.getTextureEntries()];this.rtBuffer&&this.rtBuffer.getBufferEntries().forEach((e,t)=>{n.push({binding:t+this.nTextures,resource:e.resource})});let r=this.device.createBindGroup({layout:this.computePipeline.getBindGroupLayout(1),entries:n}),i=[...this.computeBindGroupsTemplate];i.push({index:1,group:r});let a=await h.dispatch({device:this.device,pipeline:this.computePipeline,bindGroups:i,workgroups:[1],resultBuffer:this.resultBuffer,resultSize:this.resultBufferSize});return a===null?{materialIndex:-1,collisionDist:1/0,collisionNormal:{x:0,y:0,z:0}}:{materialIndex:a[0],collisionDist:a[1],collisionNormal:{x:a[2],y:a[3],z:a[4]}}}},_=class{shoot;fps;fpsCounter=0;showFps;cb;constructor({cb:e,shoot:t,fps:n,showFps:r}){this.shoot=t,this.cb=e,this.fps=n,this.showFps=r}startFpsCounter(){let e=document.createElement(`div`);e.setAttribute(`style`,` position: absolute;
        top: 0;
        left: 0;
        color: green;
        background: black;
        font-size: 16px;
        font-family: monospace;
        pointer-events: none;`),document.body.appendChild(e),setInterval(()=>{e.innerText=`FPS: ${this.fpsCounter}`,this.fpsCounter=0},1e3)}start(){this.showFps&&this.startFpsCounter();let e=this.cb,t=this.shoot,n=()=>{this.fpsCounter++},r=this.fps,i=async()=>{requestAnimationFrame(i),await e(),t(),n()};if(r!==void 0){let a=1e3/r,o=0;i=async r=>{requestAnimationFrame(i);let s=r-o;s>a&&(o=r-s%a,await e(),t(),n())}}requestAnimationFrame(i)}};function v(e,t){let n=t??window.innerHeight,r=n*(window.innerWidth/window.innerHeight);e.height=Math.max(1,n),e.width=Math.max(1,r)}function y(e,t,n){let r=document.createElement(`canvas`);return v(r,e),r.style.position=`fixed`,r.style.top=`50%`,r.style.left=`50%`,r.style.transform=`translate(-50%, -50%)`,r.style.width=`100svw`,r.style.height=`100svh`,t&&(r.style.pointerEvents=`none`),n?r.style.imageRendering=n:e&&e<window.innerHeight&&(r.style.imageRendering=`pixelated`),document.body.appendChild(r),r}var b=class{device;presentationFormat;rtUniform;rtPingPong;halfTexture;halfTextureView;halfTextureSize;resolvePipeline;resolveBindGroupLayout;resolveBindGroupPing;resolveBindGroupPong;constructor({device:e,canvas:t,presentationFormat:n,rtUniform:r,rtPingPong:i}){this.device=e,this.presentationFormat=n,this.rtUniform=r,this.rtPingPong=i,this.resolveBindGroupLayout=e.createBindGroupLayout({entries:[{binding:0,visibility:GPUShaderStage.FRAGMENT,texture:{sampleType:`unfilterable-float`}},{binding:1,visibility:GPUShaderStage.FRAGMENT,texture:{sampleType:`unfilterable-float`}}]});let a=e.createShaderModule({code:`
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
    `});this.resolvePipeline=e.createRenderPipeline({layout:e.createPipelineLayout({bindGroupLayouts:[r.uniformBindGroupLayout,this.resolveBindGroupLayout]}),vertex:{module:a,entryPoint:`vs_main`},fragment:{module:a,entryPoint:`fs_main`,targets:[{format:n}]},primitive:{topology:`triangle-strip`,frontFace:`ccw`,stripIndexFormat:`uint32`}}),this.halfTexture={},this.halfTextureView={},this.halfTextureSize=[0,0,1],this.resolveBindGroupPing={},this.resolveBindGroupPong={},this.initTextures(t.width,t.height)}initTextures(e,t){let n=Math.max(1,Math.ceil(t/2));this.halfTextureSize=[e,n,1],this.halfTexture=this.device.createTexture({size:this.halfTextureSize,format:this.presentationFormat,usage:GPUTextureUsage.RENDER_ATTACHMENT|GPUTextureUsage.TEXTURE_BINDING}),this.halfTextureView=this.halfTexture.createView(),this.resolveBindGroupPing=this.device.createBindGroup({layout:this.resolveBindGroupLayout,entries:[{binding:0,resource:this.halfTextureView},{binding:1,resource:this.rtPingPong.pingTextureView}]}),this.resolveBindGroupPong=this.device.createBindGroup({layout:this.resolveBindGroupLayout,entries:[{binding:0,resource:this.halfTextureView},{binding:1,resource:this.rtPingPong.pongTextureView}]})}resize(e,t){this.halfTexture.destroy(),this.initTextures(e,t)}encodeResolvePass(e,t){let n=e.beginRenderPass({colorAttachments:[{view:this.rtPingPong.currentWriteTextureView,loadOp:`clear`,clearValue:{r:0,g:0,b:0,a:+!t},storeOp:`store`}]});n.setPipeline(this.resolvePipeline),n.setBindGroup(0,this.rtUniform.uniformBindGroup);let r=this.rtPingPong.currentReadTextureView===this.rtPingPong.pingTextureView?this.resolveBindGroupPing:this.resolveBindGroupPong;n.setBindGroup(1,r),n.draw(4,1,0,0),n.end()}};function x({rtUniformKeys:e,materialFuncs:t,nTextures:n,nBuffers:r,usePrevFrameTex:a,functions:o,workgroupSize:s,bufferGroupIndex:c,distMapGroupIndex:l,coneTile:u,raymarchOptions:d}){let f=i({functions:o,materialFuncs:t,nTextures:n,nBuffers:r,rtUniformKeys:e,usePrevFrameTex:a,bufferGroupIndex:c,raymarchOptions:d});return f=f.replace(`// #DISTANCE_MAP_BINDING`,``),f=f.replace(`// #DISTANCE_MAP_ADVANCE`,``),`
    ${f}

    @group(${l}) @binding(0) var distMap: texture_storage_2d<r32float, write>;

    @compute @workgroup_size(${s}, ${s})
    fn main(@builtin(global_invocation_id) gid: vec3<u32>) {
      let dim = textureDimensions(distMap);
      if (gid.x >= dim.x || gid.y >= dim.y) { return; }

      let tileSize = f32(${u});
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
  `}var S=class{device;computePipeline;computeUniformBindGroup;computeTextureBindGroup;distMapBindGroup;distMapWriteLayout;distMapTexture;distMapGroupIndex;workgroupsX;workgroupsY;workgroupSize;coneTile;distMapReadLayout;distMapReadBindGroup;computeBindGroups=[];constructor({device:e,canvas:t,rtUniform:n,rtTexture:r,materialFuncs:i,functions:a,usePrevFrameTex:o,workgroupSize:s=8,rtBuffer:c,coneTile:l=8,raymarchOptions:u}){this.device=e,this.coneTile=l,this.workgroupSize=s;let d=t.width,f=t.height,p=Math.max(1,Math.ceil(d/l)),m=Math.max(1,Math.ceil(f/l));this.distMapTexture=e.createTexture({size:[p,m],format:`r32float`,usage:GPUTextureUsage.STORAGE_BINDING|GPUTextureUsage.TEXTURE_BINDING});let h=e.createBindGroupLayout({entries:[{binding:0,visibility:GPUShaderStage.COMPUTE,buffer:{type:`uniform`}},{binding:1,visibility:GPUShaderStage.COMPUTE,sampler:{type:`non-filtering`}}]});this.computeUniformBindGroup=e.createBindGroup({layout:h,entries:[{binding:0,resource:{buffer:n.getBuffer()}},{binding:1,resource:e.createSampler({addressModeU:`repeat`,addressModeV:`repeat`,magFilter:`nearest`,minFilter:`nearest`})}]});let g=r.length(),_=Array.from({length:g},(e,t)=>({binding:t,visibility:GPUShaderStage.COMPUTE,texture:{sampleType:`unfilterable-float`}}));c&&Array.from({length:c.length()},(e,t)=>{_.push({binding:t+g,visibility:GPUShaderStage.COMPUTE,buffer:{type:`read-only-storage`}})});let v=e.createBindGroupLayout({entries:_}),y=[...r.getTextureEntries()];c&&c.getBufferEntries().forEach((e,t)=>{y.push({binding:t+g,resource:e.resource})}),this.computeTextureBindGroup=e.createBindGroup({layout:v,entries:y});let b=[h,v];this.computeBindGroups.push(this.computeUniformBindGroup),this.computeBindGroups.push(this.computeTextureBindGroup),this.distMapGroupIndex=b.length,this.distMapWriteLayout=e.createBindGroupLayout({entries:[{binding:0,visibility:GPUShaderStage.COMPUTE,storageTexture:{access:`write-only`,format:`r32float`,viewDimension:`2d`}}]}),this.distMapBindGroup=e.createBindGroup({layout:this.distMapWriteLayout,entries:[{binding:0,resource:this.distMapTexture.createView()}]}),b.push(this.distMapWriteLayout),this.computeBindGroups.push(this.distMapBindGroup),this.distMapReadLayout=e.createBindGroupLayout({entries:[{binding:0,visibility:GPUShaderStage.FRAGMENT,texture:{sampleType:`unfilterable-float`}}]}),this.distMapReadBindGroup=e.createBindGroup({layout:this.distMapReadLayout,entries:[{binding:0,resource:this.distMapTexture.createView()}]});let S=x({rtUniformKeys:n.getKeysSortedByOffset(),materialFuncs:i,nTextures:g,nBuffers:c?c.length():0,usePrevFrameTex:o,functions:a,workgroupSize:s,bufferGroupIndex:1,distMapGroupIndex:this.distMapGroupIndex,coneTile:l,raymarchOptions:u});this.computePipeline=e.createComputePipeline({layout:e.createPipelineLayout({bindGroupLayouts:b}),compute:{module:e.createShaderModule({code:S}),entryPoint:`main`}}),this.workgroupsX=Math.ceil(p/s),this.workgroupsY=Math.ceil(m/s)}resize(e,t){this.distMapTexture.destroy();let n=Math.max(1,Math.ceil(e/this.coneTile)),r=Math.max(1,Math.ceil(t/this.coneTile));this.distMapTexture=this.device.createTexture({size:[n,r],format:`r32float`,usage:GPUTextureUsage.STORAGE_BINDING|GPUTextureUsage.TEXTURE_BINDING});let i=this.distMapTexture.createView();this.distMapBindGroup=this.device.createBindGroup({layout:this.distMapWriteLayout,entries:[{binding:0,resource:i}]}),this.computeBindGroups[this.distMapGroupIndex]=this.distMapBindGroup,this.distMapReadBindGroup=this.device.createBindGroup({layout:this.distMapReadLayout,entries:[{binding:0,resource:i}]}),this.workgroupsX=Math.ceil(n/this.workgroupSize),this.workgroupsY=Math.ceil(r/this.workgroupSize)}encodePass(e){let t=e.beginComputePass();t.setPipeline(this.computePipeline),this.computeBindGroups.forEach((e,n)=>t.setBindGroup(n,e)),t.dispatchWorkgroups(this.workgroupsX,this.workgroupsY),t.end()}},C=class{buffers;device;gpuBuffers;bufferEntries;bufferBindGroupLayout;bufferBindGroup;constructor(e,t){this.buffers=t,this.device=e,this.gpuBuffers=this.buffers.map(({size:e})=>this.device.createBuffer({size:e,usage:GPUBufferUsage.STORAGE|GPUBufferUsage.COPY_DST})),this.bufferEntries=this.gpuBuffers.map((e,t)=>({binding:t,resource:{buffer:e}})),this.bufferBindGroupLayout=e.createBindGroupLayout({entries:t.map((e,t)=>({binding:t,visibility:GPUShaderStage.FRAGMENT|GPUShaderStage.COMPUTE,buffer:{type:`read-only-storage`}}))}),this.bufferBindGroup=e.createBindGroup({layout:this.bufferBindGroupLayout,entries:this.bufferEntries})}setBuffer(e,t){let n=this.gpuBuffers[e];this.device.queue.writeBuffer(n,0,t)}getBufferEntries(){return this.bufferEntries}length(){return this.buffers.length}};function w(e){let t={};window.addEventListener(`keydown`,e=>{e.preventDefault(),t[e.code]=!0}),window.addEventListener(`keyup`,e=>{e.preventDefault(),t[e.code]=!1});function n(){e({UP:t.KeyE,DOWN:t.KeyQ,FRONT:t.KeyW,BACK:t.KeyS,LEFT:t.KeyA,RIGHT:t.KeyD,SPACE:t.Space}),requestAnimationFrame(n)}n()}function T(e,t){let n=e.canvas;n.style.cursor=`grab`,n.style.userSelect=`none`,n.style.touchAction=`manipulation`;let r=!1,i,a;function o(e){r=!0,i=e.x,a=e.y}document.addEventListener(`mousedown`,({clientX:e,clientY:t})=>{o({x:e,y:t}),n.style.cursor=`grabbing`}),document.addEventListener(`touchstart`,({changedTouches:e})=>{let t=e[0];o({x:t.clientX,y:t.clientY})});function s(t){e.camera.spherical.theta+=3*(i-t.x)/window.innerWidth,e.camera.spherical.phi+=3*(a-t.y)/window.innerHeight,i=t.x,a=t.y}document.addEventListener(`mousemove`,e=>{r&&s({x:e.clientX,y:e.clientY})}),document.addEventListener(`touchmove`,e=>{if(!r)return;let t=e.changedTouches[0];s({x:t.clientX,y:t.clientY})}),document.addEventListener(`mouseup`,()=>{r=!1,n.style.cursor=`grab`}),document.addEventListener(`touchend`,()=>{r=!1}),document.addEventListener(`wheel`,n=>{t?.blockZoom||(e.camera.spherical.radius+=n.deltaY*.001)});let c=[0,0,0],l=t?.speed??.002;return w(n=>{let r=e.camera.spherical.theta;n.UP&&!t?.blockY&&(c[1]+=l),n.DOWN&&!t?.blockY&&(c[1]-=l),n.FRONT&&(c[0]-=l*Math.sin(r),c[2]-=l*Math.cos(r)),n.BACK&&(c[0]+=l*Math.sin(r),c[2]+=l*Math.cos(r)),n.LEFT&&(c[0]-=l*Math.cos(r),c[2]+=l*Math.sin(r)),n.RIGHT&&(c[0]+=l*Math.cos(r),c[2]-=l*Math.sin(r)),n.SPACE&&t?.onSpace?.(),e.camera.pos.x+=c[0],t?.blockY||(e.camera.pos.y+=c[1]),e.camera.pos.z+=c[2],c[0]*=t?.slowDown?.x??.9,t?.blockY||(c[1]*=t?.slowDown?.y??.9),c[2]*=t?.slowDown?.z??.9}),{applyForce(e){c[0]+=e.x??0,c[1]+=e.y??0,c[2]+=e.z??0},getVelocity(){return{x:c[0],y:c[1],z:c[2]}},setVelocity(e){e.x!==void 0&&(c[0]=e.x),e.y!==void 0&&(c[1]=e.y),e.z!==void 0&&(c[2]=e.z)}}}function E(e,t){let n=Object.freeze({x:t?.initPos?.x??e.camera.pos.x??0,y:t?.initPos?.y??e.camera.pos.y??2,z:t?.initPos?.z??e.camera.pos.z??4});e.camera.pos={...n},e.camera.spherical.radius=t?.radius??2,e.camera.spherical.theta=t?.theta??.2,t?.fov!==void 0&&(e.camera.fov=t.fov);let r=e.registerMaterial({enableCollisions:!0,sdFunc:t?.sdFunc??`
    let camPos = vec3f(U.camPosX, U.camPosY, U.camPosZ);
    let offset = vec3f(0, -0.4, 0);
    let head = sdSphere(pos - camPos - offset, 0.3);
    let body = sdCapsule(pos - camPos - offset, vec3f(0, 0, 0), vec3f(0, -0.6, 0), 0.2);
    return opSmoothUnion(head, body, 0.2);
  `,lightFunc:t?.lightFunc}),i=t?.gravity??.003,a=t?.jumpForce??.08,o=t?.terminalVel??-.2,s=t?.floorSkin??.2,c=t?.wallSkin??.28,l=t?.groundDot??.65,u=t?.ceilingDot??-.65,d=!1,f=null,p=e.setControlsToFree({speed:t?.speed??.004,slowDown:t?.slowDown??{x:.88,y:1,z:.88},blockY:!0,onSpace:()=>{d&&=(p.setVelocity({y:a}),!1)}});function m(t,n){let{materialIndex:i,collisionDist:a,collisionNormal:o}=t;if(i===-1)return;let f=o.y>l,m=o.y<u,h=f?s:c;if(a>=h){f&&a>s*1.5&&(d=!1);return}let g=h-a,_=n.y+o.y*g;f?e.camera.pos.y=Math.max(e.camera.pos.y,_):m?e.camera.pos.y=Math.min(e.camera.pos.y,_):e.camera.pos.y+=o.y*g,e.camera.pos.x+=o.x*g,e.camera.pos.z+=o.z*g;let v=p.getVelocity();if(f)d=!0,r.setColor({r:0,g:1,b:0}),v.y<0&&p.setVelocity({y:0});else if(m)d=!1,r.setColor({r:1,g:0,b:0}),v.y>0&&p.setVelocity({y:0});else{r.setColor({r:0,g:0,b:1});let e=v.x*o.x+v.y*o.y+v.z*o.z;e<0&&p.setVelocity({x:v.x-e*o.x,y:v.y-e*o.y,z:v.z-e*o.z})}}function h(){let a=e.camera.pos;if(d?p.getVelocity().y<0&&p.setVelocity({y:0}):(p.applyForce({y:-i}),p.getVelocity().y<o&&p.setVelocity({y:o})),a.y+=p.getVelocity().y,t?.respawnY!==void 0&&a.y<t.respawnY){e.camera.pos={...n},p.setVelocity({x:0,y:0,z:0}),d=!1;return}if(f)return;let s={x:a.x,y:a.y,z:a.z},l={x:a.x,y:a.y-1,z:a.z},u={x:a.x,y:a.y+.1,z:a.z};f=(async()=>{let e=await r.checkCollision(l),t=await r.checkCollision(u),n=e.collisionDist<=t.collisionDist?e:t,i=n.collisionDist;(n.materialIndex===-1||i>c)&&r.setColor({r:1,g:1,b:1}),m(n,s),f=null})().catch(()=>{f=null})}return{player:r,controls:p,update:h,getIsOnGround:()=>d,resetPosition:()=>{e.camera.pos={...n},p.setVelocity({x:0,y:0,z:0}),d=!1}}}var D=class{canvas;main;functions;render;initalCustomUniforms={};setUniform;getUniform;materialFuncs=[];usePrevFrameTex;useInterlacing;setDeviceTexure;setDeviceBuffer;texs;buffers;fps;showFps;transparent;rtCollision;rtUniform;rtPingPong;rtInterlacing;rtComputeScene;raymarch;device;presentationFormat;frameCallbacks=[];camera={pos:{x:0,y:0,z:0},spherical:{radius:0,theta:0,phi:0},fov:90};constructor({main:e,functions:t,texs:n,buffers:r,usePrevFrameTex:i,useInterlacing:a,fps:o,height:s,showFps:c,transparent:l,imageRendering:u,raymarch:d}={}){this.canvas=y(s,l,u),this.main=e,this.functions=t,this.texs=n??[],this.buffers=r??[],this.useInterlacing=a,this.usePrevFrameTex=i,this.fps=o,this.showFps=c,this.transparent=l,this.raymarch=d}registerMaterial(e){if(this.render)throw Error(`Render already built`);let t=this.materialFuncs.length,n=new d({rt:this,material:e,index:t});return this.materialFuncs.push({sdFunc:e.sdFunc,lightFunc:e.lightFunc}),n}setTex(e,t){if(!this.setDeviceTexure)throw Error(`Render not built`);this.setDeviceTexure(e,t)}setBuffer(e,t){if(!this.setDeviceBuffer)throw Error(`Render not built`);this.setDeviceBuffer(e,t)}registerUniform(e,t){if(this.render)throw Error(`Render already built`);return this.initalCustomUniforms[e]=t??0,{set:t=>{if(!this.setUniform)throw Error(`Render not built`);this.setUniform(e,t),this.initalCustomUniforms[e]=t},get:()=>{if(!this.getUniform)throw Error(`Render not built`);return this.getUniform(e)}}}async build(){let{device:e,presentationFormat:t}=await this.getDevice(),n=this.canvas.getContext(`webgpu`);if(!n)throw Error(`No context found`);n.configure({device:e,format:t,alphaMode:this.transparent?`premultiplied`:`opaque`,usage:GPUTextureUsage.RENDER_ATTACHMENT|GPUTextureUsage.COPY_DST});let r=new o(e,{frame:0,time:0,aspectRatio:this.canvas.width/this.canvas.height,width:this.canvas.width,height:this.canvas.height,camPosX:this.camera.pos.x??0,camPosY:this.camera.pos.y??0,camPosZ:this.camera.pos.z??0,camSphericalR:this.camera.spherical.radius??0,camSphericalT:this.camera.spherical.theta??0,camSphericalP:this.camera.spherical.phi??0,camFov:this.camera.fov??90,...this.initalCustomUniforms});this.rtUniform=r;let i=new s(e,this.texs),a;this.buffers.length>0&&(a=new C(e,this.buffers));let u=[];this.texs.forEach((e,t)=>{u.push({binding:t,visibility:GPUShaderStage.FRAGMENT,texture:{sampleType:`unfilterable-float`}})}),a&&this.buffers.forEach((e,t)=>{u.push({binding:t+this.texs.length,visibility:GPUShaderStage.FRAGMENT|GPUShaderStage.COMPUTE,buffer:{type:`read-only-storage`}})});let d=e.createBindGroupLayout({entries:u}),f=[r.uniformBindGroupLayout,d],p;(this.usePrevFrameTex||this.useInterlacing)&&(this.rtPingPong=new c(this.canvas,e,t),this.usePrevFrameTex&&(p=f.length,f.push(this.rtPingPong.pingPongBindGroupLayout)));let m,h,_=this.raymarch?.coneTile!==!1;if(this.materialFuncs.length>0&&_){let t=typeof this.raymarch?.coneTile==`number`?this.raymarch.coneTile:8;m=new S({device:e,canvas:this.canvas,rtUniform:r,rtTexture:i,rtBuffer:a,materialFuncs:this.materialFuncs,functions:this.functions,usePrevFrameTex:this.usePrevFrameTex,coneTile:t,raymarchOptions:this.raymarch}),this.rtComputeScene=m,h=f.length,f.push(m.distMapReadLayout)}let v;this.useInterlacing&&this.rtPingPong&&(v=new b({device:e,canvas:this.canvas,presentationFormat:t,rtUniform:r,rtPingPong:this.rtPingPong}),this.rtInterlacing=v),this.render=await l({device:e,bindGroupLayouts:f,presentationFormat:t,context:n,canvas:this.canvas,main:this.main,materialFuncs:this.materialFuncs,functions:this.functions,rtUniform:r,rtTexture:i,rtBuffer:a,usePrevFrameTex:this.usePrevFrameTex,useInterlacing:this.useInterlacing,prevFrameGroupIndex:p,rtPingPong:this.rtPingPong,rtInterlacing:this.rtInterlacing,transparent:this.transparent,rtComputeScene:m,distMapGroupIndex:h,raymarchOptions:this.raymarch}),this.setUniform=(e,t)=>{r.set(e,t)},this.getUniform=e=>r.get(e),this.setDeviceTexure=(e,t)=>{i.setTexture(e,t)},this.setDeviceBuffer=(e,t)=>{a?.setBuffer(e,t)},this.materialFuncs.length>0&&(this.rtCollision=new g({device:e,rtUniformKeys:r.getKeysSortedByOffset(),functions:this.functions,materialFuncs:this.materialFuncs,nTextures:this.texs.length,usePrevFrameTex:this.usePrevFrameTex,rtUniform:r,rtTexture:i,rtBuffer:a}))}checkCollision(e,t){if(!this.rtCollision||!this.rtUniform)throw Error(`Render not built`);let n=t??{x:this.rtUniform.get(`camPosX`),y:this.rtUniform.get(`camPosY`),z:this.rtUniform.get(`camPosZ`)};return this.rtCollision.checkCollision(e,n)}async start(e){await this.build(),e?.onBuild?.(),e?.once?this.render?.({camera:this.camera}):(new _({cb:()=>{for(let e of this.frameCallbacks)e();e?.onFrame?.()},shoot:()=>{this.render?.({camera:this.camera})},fps:this.fps,showFps:this.showFps}).start(),window.addEventListener(`resize`,()=>{this.resize()}))}async getDevice(){if(!this.device||!this.presentationFormat){let{device:e,presentationFormat:t}=await u();this.device=e,this.presentationFormat=t}return{device:this.device,presentationFormat:this.presentationFormat}}resize(){v(this.canvas,this.canvas.height),this.rtPingPong&&this.device&&this.presentationFormat&&this.rtPingPong.resize(this.canvas.width,this.canvas.height,this.device,this.presentationFormat),this.rtInterlacing&&this.rtInterlacing.resize(this.canvas.width,this.canvas.height),this.rtComputeScene&&this.rtComputeScene.resize(this.canvas.width,this.canvas.height)}isBuilt(){return this.render!==void 0}setControlsToFree(e){return T(this,e)}setControlsTo3rdPerson(e){let t=E(this,e);return this.frameCallbacks.push(t.update),t}};export{D as t};