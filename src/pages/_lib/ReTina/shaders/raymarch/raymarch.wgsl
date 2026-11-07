struct SdMaterial {
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
