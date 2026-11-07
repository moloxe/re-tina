// src/pages/_lib/utils/loadImage.ts
async function e(e) {
	let t = e.startsWith("/") && !e.startsWith("/re-tina") ? `/re-tina${e}` : e, n = document.createElement("img");
	n.src = t, await n.decode();
	let r = document.createElement("canvas");
	r.width = n.width, r.height = n.height;
	let i = r.getContext("2d");
	if (!i) throw Error("No canvas context found");
	i.drawImage(n, 0, 0, r.width, r.height);
	let a = i.getImageData(0, 0, r.width, r.height), o = new Uint8Array(n.width * n.height * 4);
	for (let e = 0; e < n.width * n.height * 4; e++) o[e] = a.data[e];
	return {
		textureData: o,
		width: n.width,
		height: n.height
	};
}
// src/pages/_lib/utils/getFFTGetter.ts
async function t(e) {
	let t = await navigator.mediaDevices.getUserMedia({ audio: {
		echoCancellation: !1,
		noiseSuppression: !1,
		autoGainControl: !1
	} }), n = new window.AudioContext(), r = n.createMediaStreamSource(t), i = n.createAnalyser();
	i.fftSize = e * 2;
	let a = i.frequencyBinCount, o = new Uint8Array(a);
	r.connect(i);
	function s() {
		return i.getByteFrequencyData(o), o;
	}
	return s;
}
var n = async ({ bufferSize: e } = {}) => {
	try {
		if (navigator.mediaDevices) return await t(e ?? 256);
		let n = document.createElement("div");
		return n.innerHTML = "\n      <p style=\"color: #fff; font-size: 1.4rem;\">\n        Click anywhere to enable microphone recording.\n      </p>", document.body.appendChild(n), new Promise((r) => {
			document.addEventListener("click", async () => {
				n.remove(), r(await t(e ?? 256));
			}, { once: !0 });
		});
	} catch (e) {
		throw console.error("Error al acceder al micrófono:", e), e;
	}
}, r = "struct VSOut {\n    @builtin(position) Position: vec4<f32>,\n    @location(0)       uvs: vec2<f32>\n};\n\n@vertex\nfn main(@builtin(vertex_index) VertexIndex: u32) -> VSOut {\n    var pos = array<vec2<f32>, 4>(vec2<f32>(-1.0, 1.0),\n        vec2<f32>(-1.0, -1.0),\n        vec2<f32>(1.0, 1.0),\n        vec2<f32>(1.0, -1.0));\n\n    var uvs = array<vec2<f32>, 4>(vec2<f32>(1.0, 1.0),\n        vec2<f32>(1.0, -1.0),\n        vec2<f32>(-1.0, 1.0),\n        vec2<f32>(-1.0, -1.0));\n\n    var vsOut: VSOut;\n    vsOut.Position = vec4<f32>(pos[ VertexIndex ], 0.0, 1.0);\n    vsOut.uvs = uvs[ VertexIndex ] * 0.5 + 0.5;\n    return vsOut;\n}\n", i = "struct GlobalUniform {\n    UNIFORMS: f32, // #UNIFORMS\n};\n\n@group(0) @binding(0) var <uniform> U: GlobalUniform;\n@group(0) @binding(1) var u_sampler: sampler;\n@group(0) @binding(2) var<storage, read_write> arbitrary_result: array<f32>;\n\n// Textures template:\n// #GROUP-1-BINDING-X\n// Prev. frame (ping-pong) template:\n// #GROUP-2-BINDING-X\n\nconst PI     = f32(3.1415926535897932384626433832795);\nconst TWO_PI = f32(6.283185307179586476925286766559);\nconst E      = f32(2.71828182845904523536028747135266);\nconst INF    = f32(1e10);\n\nfn toSpherical(pos: vec3<f32>) -> vec3<f32> {\n    let r = length(pos);\n    let theta = acos(pos.z / r);\n    let phi = atan2(pos.y, pos.x);\n    return vec3<f32>(r, theta, phi);\n}\n\nfn toCartesian(sph: vec3<f32>) -> vec3<f32> {\n    let r = sph.x;\n    let theta = sph.y;\n    let phi = sph.z;\n    let sinTheta = sin(theta);\n    return vec3<f32>(\n        r * sinTheta * cos(phi),\n        r * sinTheta * sin(phi),\n        r * cos(theta)\n    );\n}\n\nfn rotate2d(pos: vec2f, rot: f32) -> vec2f {\n    return vec2f(\n        pos.x * cos(rot) - pos.y * sin(rot),\n        pos.x * sin(rot) + pos.y * cos(rot)\n    );\n}\n\nfn rotate(pos: vec3<f32>, rot: vec3<f32>) -> vec3<f32> {\n    var result = pos;\n    // Rotation around the Z axis\n    let sinZ = sin(rot.z);\n    let cosZ = cos(rot.z);\n    var temp_x = result.x * cosZ - result.y * sinZ;\n    var temp_y = result.x * sinZ + result.y * cosZ;\n    result.x = temp_x;\n    result.y = temp_y;\n    // Rotation around the Y axis\n    let sinY = sin(rot.y);\n    let cosY = cos(rot.y);\n    temp_x = result.x * cosY + result.z * sinY;\n    var temp_z = result.z * cosY - result.x * sinY;\n    result.x = temp_x;\n    result.z = temp_z;\n    // Rotation around the X axis\n    let sinX = sin(rot.x);\n    let cosX = cos(rot.x);\n    temp_y = result.y * cosX - result.z * sinX;\n    temp_z = result.y * sinX + result.z * cosX;\n    result.y = temp_y;\n    result.z = temp_z;\n    return result;\n}\n\nfn rotateXY(vec: vec3f, aX: f32, aY: f32) -> vec3f {\n    // Rotation around the X axis\n    let sinX = sin(aX);\n    let cosX = cos(aX);\n    let temp_y = vec.y * cosX - vec.z * sinX;\n    let temp_z = vec.y * sinX + vec.z * cosX;\n    let rotatedX = vec3f(vec.x, temp_y, temp_z);\n    // Rotation around the Y axis (applied to the result of the X rotation)\n    let sinY = sin(aY);\n    let cosY = cos(aY);\n    let temp_x = rotatedX.x * cosY + rotatedX.z * sinY;\n    let temp_z_final = rotatedX.z * cosY - rotatedX.x * sinY;\n    return vec3f(temp_x, rotatedX.y, temp_z_final);\n}\n\nfn hsv2rgb(c: vec3f) -> vec3<f32> {\n    let K = vec4<f32>(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);\n    let p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);\n    return c.z * mix(K.xxx, clamp(p - K.xxx, vec3<f32>(0.0), vec3<f32>(1.0)), c.y);\n}\n\nfn rgb2hsv(c: vec3f) -> vec3<f32> {\n    let K = vec4<f32>(0.0, -1.0 / 3.0, 2.0 / 3.0, -1.0);\n    let p = mix(vec4<f32>(c.zy, K.wz), vec4<f32>(c.yz, K.xy), step(c.b, c.g));\n    let q = mix(vec4<f32>(p.xyw, c.r), vec4<f32>(c.r, p.yzx), step(p.x, c.r));\n    let d = q.x - min(q.w, q.y);\n    let e = 1.0e-10;\n    return vec3<f32>(abs(q.z + (q.w - q.y) / (6.0 * d + e)), d / (q.x + e), q.x);\n}\n\nfn blinnPhong(\n  // Environment\n    rd: vec3<f32>,\n    normal: vec3<f32>,\n    minBright: f32,\n  // Material\n    pos: vec3<f32>,\n    diffuseColor: vec3<f32>,\n    shininess: f32,\n  // Light\n    lightPos: vec3<f32>,\n    lightColor: vec3<f32>,\n    power: f32,\n) -> vec3<f32> {\n    let viewDir = -rd;\n    var lightDir = lightPos - pos;\n    var distance = length(lightDir); distance *= distance;\n    lightDir = normalize(lightDir);\n    let lambertian = dot(normal, lightDir);\n\n    var specular = 0.;\n    if lambertian > 0. {\n        let halfDir = normalize(lightDir + viewDir);\n        let specAngle = max(dot(halfDir, normal), 0.);\n        specular = pow(specAngle, shininess);\n    }\n\n    let lightPower = lightColor * power / distance;\n    let ambientColor = minBright * mix(diffuseColor, lightColor, .5);\n\n    let colorLinear = ambientColor + (diffuseColor * lambertian * lightPower + /* specColor * */ specular * lightPower);\n\n    return colorLinear;\n}\n\n// https://iquilezles.org/articles/distfunctions/ 💪\n\nfn sdTorus(p: vec3f, t: vec2f) -> f32 {\n    let q = vec2(length(p.xz) - t.x, p.y);\n    return length(q) - t.y;\n}\n\nfn sdSphere(p: vec3f, s: f32) -> f32 {\n    return length(p) - s;\n}\n\nfn sdCutSphere(p: vec3f, r: f32, h: f32) -> f32 {\n    let w = sqrt(r * r - h * h);\n    let q = vec2f(length(p.xz), p.y);\n    let s = max((h - r) * q.x * q.x + w * w * (h + r - 2.0 * q.y), h * q.x - w * q.y);\n    if (s < 0.0) {\n        return length(q) - r;\n    } else if (q.x < w) {\n        return h - q.y;\n    } else {\n        return length(q - vec2f(w, h));\n    }\n}\n\nfn sdBox(p: vec3f, b: vec3f) -> f32 {\n    let q = abs(p) - b;\n    return length(max(q, vec3<f32>(0.0))) + min(max(q.x, max(q.y, q.z)), 0.0);\n}\n\nfn sdCapsule(p: vec3f, a: vec3f, b: vec3f, r: f32) -> f32 {\n    let pa = p - a;\n    let ba = b - a;\n    let h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);\n    return length(pa - ba * h) - r;\n}\n\nfn opSmoothUnion(d1: f32, d2: f32, k: f32) -> f32 {\n    let h = clamp(0.5 + 0.5 * (d2 - d1) / k, 0.0, 1.0);\n    return mix(d2, d1, h) - k * h * (1.0 - h);\n}\n\nfn opSmoothSubtraction(d1: f32, d2: f32, k: f32) -> f32 {\n    return -opSmoothUnion(d1, -d2, k);\n}\n\n// https://gist.github.com/munrocket/236ed5ba7e409b8bdf1ff6eca5dcdc39#simplex-noise\n\n//  MIT License. © Ian McEwan, Stefan Gustavson, Munrocket, Johan Helsing\nfn mod289(x: vec2f) -> vec2f {\n    return x - floor(x * (1. / 289.)) * 289.;\n}\n\nfn mod289_3(x: vec3f) -> vec3f {\n    return x - floor(x * (1. / 289.)) * 289.;\n}\n\nfn permute3(x: vec3f) -> vec3f {\n    return mod289_3(((x * 34.) + 1.) * x);\n}\n//  MIT License. © Ian McEwan, Stefan Gustavson, Munrocket\nfn snoise(v: vec2f) -> f32 {\n    let C = vec4(\n        0.211324865405187, // (3.0-sqrt(3.0))/6.0\n        0.366025403784439, // 0.5*(sqrt(3.0)-1.0)\n        -0.577350269189626, // -1.0 + 2.0 * C.x\n        0.024390243902439 // 1.0 / 41.0\n    );\n\n    // First corner\n    var i = floor(v + dot(v, C.yy));\n    let x0 = v - i + dot(i, C.xx);\n\n    // Other corners\n    var i1 = select(vec2(0., 1.), vec2(1., 0.), x0.x > x0.y);\n\n    // x0 = x0 - 0.0 + 0.0 * C.xx ;\n    // x1 = x0 - i1 + 1.0 * C.xx ;\n    // x2 = x0 - 1.0 + 2.0 * C.xx ;\n    var x12 = x0.xyxy + C.xxzz;\n    x12.x = x12.x - i1.x;\n    x12.y = x12.y - i1.y;\n\n    // Permutations\n    i = mod289(i); // Avoid truncation effects in permutation\n\n    var p = permute3(permute3(i.y + vec3(0., i1.y, 1.)) + i.x + vec3(0., i1.x, 1.));\n    var m = max(0.5 - vec3(dot(x0, x0), dot(x12.xy, x12.xy), dot(x12.zw, x12.zw)), vec3(0.));\n    m *= m;\n    m *= m;\n\n    // Gradients: 41 points uniformly over a line, mapped onto a diamond.\n    // The ring size 17*17 = 289 is close to a multiple of 41 (41*7 = 287)\n    let x = 2. * fract(p * C.www) - 1.;\n    let h = abs(x) - 0.5;\n    let ox = floor(x + 0.5);\n    let a0 = x - ox;\n\n    // Normalize gradients implicitly by scaling m\n    // Approximation of: m *= inversesqrt( a0*a0 + h*h );\n    m *= 1.79284291400159 - 0.85373472095314 * (a0 * a0 + h * h);\n\n    // Compute final noise value at P\n    let g = vec3(a0.x * x0.x + h.x * x0.y, a0.yz * x12.xz + h.yz * x12.yw);\n    return 130. * dot(m, g);\n}\n\n// Translated from:\n// https://github.com/ashima/webgl-noise/blob/master/src/noise3D.glsl\nfn mod289_v3(x: vec3<f32>) -> vec3<f32> {\n    return x - floor(x * (1.0 / 289.0)) * 289.0;\n}\nfn mod289_v4(x: vec4<f32>) -> vec4<f32> {\n    return x - floor(x * (1.0 / 289.0)) * 289.0;\n}\nfn permute(x: vec4<f32>) -> vec4<f32> {\n    return mod289_v4((x * 34.0 + 10.0) * x);\n}\nfn taylorInvSqrt(r: vec4<f32>) -> vec4<f32> {\n    return 1.79284291400159 - 0.85373472095314 * r;\n}\nfn snoise3d(v: vec3<f32>) -> f32 {\n    let C: vec2<f32> = vec2<f32>(1.0 / 6.0, 1.0 / 3.0);\n    let D: vec4<f32> = vec4<f32>(0.0, 0.5, 1.0, 2.0);\n    var i: vec3<f32> = floor(v + dot(v, vec3<f32>(C.y)));\n    let x0: vec3<f32> = v - i + dot(i, vec3<f32>(C.x));\n    let g: vec3<f32> = step(x0.yzx, x0.xyz);\n    let l: vec3<f32> = 1.0 - g;\n    let i1: vec3<f32> = min(g.xyz, l.zxy);\n    let i2: vec3<f32> = max(g.xyz, l.zxy);\n    let x1: vec3<f32> = x0 - i1 + vec3<f32>(C.x);\n    let x2: vec3<f32> = x0 - i2 + vec3<f32>(C.y);\n    let x3: vec3<f32> = x0 - vec3<f32>(D.y);\n    i = mod289_v3(i);\n    let p: vec4<f32> = permute(permute(permute(\n        i.z + vec4<f32>(0.0, i1.z, i2.z, 1.0)\n    ) + i.y + vec4<f32>(0.0, i1.y, i2.y, 1.0)) + i.x + vec4<f32>(0.0, i1.x, i2.x, 1.0));\n    let n_: f32 = 0.142857142857;\n    let ns: vec3<f32> = n_ * D.wyz - D.xzx;\n    let j: vec4<f32> = p - 49.0 * floor(p * ns.z * ns.z);\n    let x_: vec4<f32> = floor(j * ns.z);\n    let y_: vec4<f32> = floor(j - 7.0 * x_);\n    let x: vec4<f32> = x_ * ns.x + vec4<f32>(ns.y);\n    let y: vec4<f32> = y_ * ns.x + vec4<f32>(ns.y);\n    let h: vec4<f32> = 1.0 - abs(x) - abs(y);\n    let b0: vec4<f32> = vec4<f32>(x.xy, y.xy);\n    let b1: vec4<f32> = vec4<f32>(x.zw, y.zw);\n    let s0: vec4<f32> = floor(b0) * 2.0 + 1.0;\n    let s1: vec4<f32> = floor(b1) * 2.0 + 1.0;\n    let sh: vec4<f32> = -step(h, vec4<f32>(0.0));\n    let a0: vec4<f32> = b0.xzyw + s0.xzyw * sh.xxyy;\n    let a1: vec4<f32> = b1.xzyw + s1.xzyw * sh.zzww;\n    let p0: vec3<f32> = vec3<f32>(a0.xy, h.x);\n    let p1: vec3<f32> = vec3<f32>(a0.zw, h.y);\n    let p2: vec3<f32> = vec3<f32>(a1.xy, h.z);\n    let p3: vec3<f32> = vec3<f32>(a1.zw, h.w);\n    let norm: vec4<f32> = taylorInvSqrt(vec4<f32>(dot(p0, p0), dot(p1, p1), dot(p2, p2), dot(p3, p3)));\n    let p0_norm: vec3<f32> = p0 * norm.x;\n    let p1_norm: vec3<f32> = p1 * norm.y;\n    let p2_norm: vec3<f32> = p2 * norm.z;\n    let p3_norm: vec3<f32> = p3 * norm.w;\n    var m: vec4<f32> = max(0.5 - vec4<f32>(dot(x0, x0), dot(x1, x1), dot(x2, x2), dot(x3, x3)), vec4<f32>(0.0));\n    m = m * m;\n    return 105.0 * dot(m * m, vec4<f32>(dot(p0_norm, x0), dot(p1_norm, x1), dot(p2_norm, x2), dot(p3_norm, x3)));\n}\n\n// #FUNCTIONS\n// #RAY_MARCH_FUNCTIONS\n", a = "struct SdMaterial {\n    index: i32,\n    dist: f32,\n    pos: vec3<f32>,\n    color: vec3<f32>,\n}\n\n// #SD-INDIVIDUAL-MATERIALS\n\nfn sdMaterials(pos: vec3<f32>) -> SdMaterial {\n    // #SD-MATERIALS-FUNC\n}\n\nfn map(pos: vec3<f32>) -> f32 {\n    // #MAP\n}\n\nfn calcNormalWithEps(pos: vec3<f32>, h: f32) -> vec3<f32> {\n    let ZERO = min(u32(U.frame), 0u);\n    var n = vec3<f32>(0.0);\n    for (var i = ZERO; i < 4u; i = i + 1u) {\n        let e = 0.5773 * (2.0 * vec3<f32>(\n            f32(((i + 3u) >> 1u) & 1u),\n            f32((i >> 1u) & 1u),\n            f32(i & 1u)\n        ) - 1.0);\n        n = n + e * map(pos + e * h);\n    }\n    return normalize(n);\n}\n\nfn calcNormal(pos: vec3<f32>) -> vec3<f32> {\n    return calcNormalWithEps(pos, 1e-4);\n}\n\n// #LIGHT-INDIVIDUAL-MATERIALS\n\nfn calcLight(\n    uv: vec2<f32>,\n    ro: vec3<f32>,\n    rd: vec3<f32>,\n    pos: vec3<f32>,\n    normal: vec3<f32>,\n    color: vec3<f32>,\n    materialIndex: i32\n) -> vec4<f32> {\n    // #LIGHT-MATERIALS-FUNC\n}\n\nconst RM_MAX_ITER: i32 = /*#RM_MAX_ITER*/;\nconst RM_MIN_DIST: f32 = 1e-4;\nconst RM_MAX_DIST: f32 = /*#RM_MAX_DIST*/;\nconst RM_PIXEL_EPS: f32 = /*#RM_PIXEL_EPS*/;\nconst RM_RELAX: f32 = /*#RM_RELAX*/;\nconst RM_AO_SAMPLES: i32 = /*#RM_AO_SAMPLES*/;\nconst RM_DEBUG_STEPS: bool = /*#RM_DEBUG_STEPS*/;\n\nstruct RayHit {\n    dist: f32,\n    steps: i32,\n    hit: bool,\n}\n\nfn rayMarchWithCone(ro: vec3<f32>, rd: vec3<f32>, startDist: f32, pixK: f32) -> RayHit {\n    var totalDist = max(startDist, 0.0);\n    var omega: f32 = RM_RELAX;\n    var prevDist: f32 = 0.0;\n    var stepLength: f32 = 0.0;\n    var bestDist: f32 = totalDist;\n    var bestRatio: f32 = INF;\n    var steps: i32 = 0;\n\n    for (var i: i32 = 0; i < RM_MAX_ITER; i = i + 1) {\n        steps = i;\n        let pos = ro + rd * totalDist;\n        let currDist = map(pos);\n\n        // Enhanced Sphere Tracing (Keinert et al.): overshoot check\n        if (omega > 1.0 && stepLength > 0.0 && (currDist + prevDist) < stepLength) {\n            totalDist -= stepLength - prevDist;\n            stepLength = 0.0;\n            prevDist = 0.0;\n            omega = 1.0;\n            continue;\n        }\n\n        let eps = max(RM_MIN_DIST, totalDist * pixK);\n        if (currDist < eps) {\n            return RayHit(totalDist, steps, true);\n        }\n\n        let ratio = currDist / eps;\n        if (ratio < bestRatio) {\n            bestRatio = ratio;\n            bestDist = totalDist;\n        }\n\n        if (totalDist > RM_MAX_DIST) {\n            return RayHit(-1.0, steps, false);\n        }\n\n        prevDist = currDist;\n        stepLength = currDist * omega;\n        totalDist += stepLength;\n    }\n\n    if (bestRatio < 4.0) {\n        return RayHit(bestDist, steps, true);\n    }\n\n    return RayHit(-1.0, steps, false);\n}\n\nfn rayMarch(ro: vec3<f32>, rd: vec3<f32>, startDist: f32) -> SdMaterial {\n    let hit = rayMarchWithCone(ro, rd, startDist, 0.0);\n    if (!hit.hit) {\n        return SdMaterial(-1, -1.0, vec3<f32>(0.0), vec3<f32>(0.0));\n    }\n    var mat = sdMaterials(ro + rd * hit.dist);\n    mat.dist = hit.dist;\n    return mat;\n}\n\nfn rayMarchDDA(ro: vec3<f32>, rd: vec3<f32>, voxelSize: f32, startDist: f32) -> SdMaterial {\n    let advanced_ro = ro + rd * startDist;\n    let ro_grid = advanced_ro / voxelSize;\n    var mapPos = floor(ro_grid);\n    let deltaDist = abs(vec3<f32>(1.0) / rd);\n    let rayStep = sign(rd);\n    var sideDist = (rayStep * (mapPos - ro_grid) + (rayStep * 0.5) + 0.5) * deltaDist;\n    var mask = vec3<f32>(0.0);\n\n    for (var i: i32 = 0; i < RM_MAX_ITER; i = i + 1) {\n        if any(mapPos < vec3<f32>(-100.0 / voxelSize)) || any(mapPos > vec3<f32>(100.0 / voxelSize)) { break; }\n\n        let voxelCenter = (mapPos + 0.5) * voxelSize;\n        let d = map(voxelCenter);\n\n        if d < (voxelSize * 0.5) {\n            var dist = 0.0;\n            if mask.x > 0.5 { dist = sideDist.x - deltaDist.x; } else if mask.y > 0.5 { dist = sideDist.y - deltaDist.y; } else { dist = sideDist.z - deltaDist.z; }\n            var mat = sdMaterials(voxelCenter);\n            mat.dist = dist * voxelSize;\n            return mat;\n        }\n\n        if sideDist.x < sideDist.y {\n            if sideDist.x < sideDist.z {\n                sideDist.x += deltaDist.x;\n                mapPos.x += rayStep.x;\n                mask = vec3<f32>(1.0, 0.0, 0.0);\n            } else {\n                sideDist.z += deltaDist.z;\n                mapPos.z += rayStep.z;\n                mask = vec3<f32>(0.0, 0.0, 1.0);\n            }\n        } else {\n            if sideDist.y < sideDist.z {\n                sideDist.y += deltaDist.y;\n                mapPos.y += rayStep.y;\n                mask = vec3<f32>(0.0, 1.0, 0.0);\n            } else {\n                sideDist.z += deltaDist.z;\n                mapPos.z += rayStep.z;\n                mask = vec3<f32>(0.0, 0.0, 1.0);\n            }\n        }\n    }\n\n    return SdMaterial(-1, -1.0, vec3<f32>(0.0), vec3<f32>(0.0));\n}\n\nfn calculateDFAO(pos: vec3<f32>, normal: vec3<f32>) -> f32 {\n    let AO_RADIUS = 1.;\n    let AO_EPSILON = 1e-4;\n    let numSamples = RM_AO_SAMPLES;\n    var aoSum = 0.0;\n    for (var i: i32 = 0; i < numSamples; i = i + 1) {\n        let t_ratio = f32(i + 1) / f32(numSamples);\n        let t_real_dist = AO_EPSILON + t_ratio * (AO_RADIUS - AO_EPSILON);\n        let samplePos = pos + normal * t_real_dist;\n        let dist = map(samplePos);\n        let visibility = clamp(dist / t_real_dist, 0f, 1f);\n        aoSum += (1f - visibility) * (1f - t_ratio * 0.5);\n    }\n    let aoFactor = 1f - aoSum / f32(numSamples);\n    return clamp(aoFactor, 0f, 1f);\n}\n\nstruct Ray {\n    ro: vec3<f32>,\n    rd: vec3<f32>,\n    pixelAngle: f32,\n}\n\nfn getCameraRay(uv: vec2<f32>) -> Ray {\n    var dir2d = vec2<f32>(uv.x, 1. - uv.y) * 2. - 1.;\n    dir2d.x *= U.aspectRatio;\n\n    let pos = vec3<f32>(U.camPosX, U.camPosY, U.camPosZ);\n    let spherical = vec3<f32>(U.camSphericalR, U.camSphericalT, U.camSphericalP);\n\n    let radFoc = radians(U.camFov);\n    let focalLength = 1. / tan(radFoc * .5);\n\n    var ro = vec3<f32>(0.);\n    ro.z += spherical.x;\n    ro = rotateXY(ro, spherical.z, spherical.y);\n    ro += pos;\n\n    var rd = normalize(vec3<f32>(dir2d, -focalLength));\n    rd = rotateXY(rd, spherical.z, spherical.y);\n\n    let pixelAngle = 2.0 / (focalLength * max(U.height, 1.0));\n\n    return Ray(ro, rd, pixelAngle);\n}\n\nstruct Scene {\n    dist: f32,\n    pos: vec3<f32>,\n    normal: vec3<f32>,\n    color: vec4<f32>,\n    rd: vec3<f32>,\n};\n\n// #DISTANCE_MAP_BINDING\n\nfn calcScene(uv: vec2<f32>) -> Scene {\n    let ray = getCameraRay(uv);\n    let pixK = ray.pixelAngle * RM_PIXEL_EPS;\n\n    var _startDist: f32 = 0.0;\n    // #DISTANCE_MAP_ADVANCE\n\n    var finalDist = -1.0;\n    var finalPos = vec3<f32>(0.0);\n    var finalNormal = vec3<f32>(0.0);\n    var finalColor = vec4<f32>(0.0, 0.0, 0.0, 1.0);\n\n    if (_startDist < RM_MAX_DIST) {\n        let marchStart = max(0.0, _startDist - 0.1);\n        let hit = rayMarchWithCone(ray.ro, ray.rd, marchStart, pixK);\n\n        if (RM_DEBUG_STEPS) {\n            let heat = f32(hit.steps) / f32(RM_MAX_ITER);\n            let heatColor = vec3<f32>(heat, 1.0 - abs(heat - 0.5) * 2.0, 1.0 - heat);\n            return Scene(hit.dist, ray.ro + ray.rd * hit.dist, vec3<f32>(0.0, 1.0, 0.0), vec4<f32>(heatColor, 1.0), ray.rd);\n        }\n\n        if (hit.hit) {\n            finalDist = hit.dist;\n            finalPos = ray.ro + ray.rd * hit.dist;\n            let normalEps = max(RM_MIN_DIST, hit.dist * pixK);\n            finalNormal = calcNormalWithEps(finalPos, normalEps);\n            let material = sdMaterials(finalPos);\n            finalColor = calcLight(\n                uv,\n                ray.ro,\n                ray.rd,\n                finalPos,\n                finalNormal,\n                material.color,\n                material.index\n            );\n        }\n    }\n\n    return Scene(finalDist, finalPos, finalNormal, finalColor, ray.rd);\n}\n";
// src/pages/_lib/ReTina/shaders/raymarch/parse-sd-wgsl.ts
function o({ sdWGSL: e, materialSdFunctions: t }) {
	function n(e, t) {
		let n = `vec3<f32>(U.material${t}Px, U.material${t}Py, U.material${t}Pz)`;
		return `
        fn sdMaterial${t}(posIn: vec3<f32>) -> f32 {
          let mRotation = ${`vec3<f32>(U.material${t}Rx, U.material${t}Ry, U.material${t}Rz)`};
          var pos = posIn - ${n};
          if length(mRotation) != 0.0 {
            pos = rotate(pos, mRotation);
          }
          ${e}
        }`;
	}
	let r = t.map(n).join("\n");
	e = e.replace("// #SD-INDIVIDUAL-MATERIALS", r);
	function i(e) {
		return `
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
        }`;
	}
	let a = `
      var material = SdMaterial(-1, INF, vec3<f32>(0.), vec3<f32>(0.));
      var curDist: f32;

      ${t.map((e, t) => i(t)).join("\n")}

      return material;
    `;
	return e = e.replace("// #SD-MATERIALS-FUNC", a), e;
}
function s({ materialSdFunctions: e, sdWGSL: t }) {
	function n(e) {
		return `dist = min(dist, sdMaterial${e}(pos));`;
	}
	let r = `
      var dist: f32 = INF;

      ${e.map((e, t) => n(t)).join("\n")}

      return dist;`;
	return t = t.replace("// #MAP", r), t;
}
function c({ materialLightFunctions: e, sdWGSL: t }) {
	function n(e, t) {
		return e ||= "\n          let lamb = dot(normal, -rd); // Camera as light\n          let aoFactor = calculateDFAO(pos, normal);\n          let finalColor = color * sqrt(lamb) * aoFactor;\n          return vec4f(finalColor, 1f);", `
        fn calcLightMaterial${t}(
          uv: vec2<f32>,
          ro: vec3<f32>,
          rd: vec3<f32>,
          pos: vec3<f32>,
          normal: vec3<f32>,
          color: vec3<f32>,
        ) -> vec4<f32> {
            ${e}
        }`;
	}
	let r = e.map(n).join("\n");
	t = t.replace("// #LIGHT-INDIVIDUAL-MATERIALS", r);
	function i(e) {
		return `
        if(materialIndex == ${e}) {
          finalColor = calcLightMaterial${e}(uv, ro, rd, pos, normal, color);
        }`;
	}
	let a = `
      var finalColor = vec4<f32>(0.0);
      ${e.map((e, t) => i(t)).join("\n")}
      return finalColor;`;
	return t = t.replace("// #LIGHT-MATERIALS-FUNC", a), t;
}
function l(e, t) {
	let n = a, r = e.map((e) => e.sdFunc), i = e.map((e) => e.lightFunc), l = t?.maxSteps ?? 256, u = t?.maxDist ?? 500, d = t?.pixelEps ?? .5, f = t?.relaxation ?? 1.2, p = t?.aoSamples ?? 5, m = t?.debugSteps ?? !1;
	return n = n.replace("/*#RM_MAX_ITER*/", `${l}`).replace("/*#RM_MAX_DIST*/", `${u}f`).replace("/*#RM_PIXEL_EPS*/", `${d}f`).replace("/*#RM_RELAX*/", `${f}f`).replace("/*#RM_AO_SAMPLES*/", `${p}`).replace("/*#RM_DEBUG_STEPS*/", `${m ? "true" : "false"}`), n = o({
		sdWGSL: n,
		materialSdFunctions: r,
		materialLightFunctions: i
	}), n = s({
		materialSdFunctions: r,
		sdWGSL: n,
		materialLightFunctions: i
	}), n = c({
		materialSdFunctions: r,
		sdWGSL: n,
		materialLightFunctions: i
	}), n;
}
// src/pages/_lib/ReTina/shaders/parse-common-shader.ts
function u({ functions: e, rtUniformKeys: t, materialFuncs: n, nTextures: r, nBuffers: a = 0, usePrevFrameTex: o, bufferGroupIndex: s, prevFrameGroupIndex: c, raymarchOptions: u }) {
	let d = i;
	if (d = d.replace("UNIFORMS: f32, // #UNIFORMS", t.map((e) => `${e}: f32,`).join("\n")), r > 0) {
		function e(e) {
			return `
        @group(1) @binding(${e}) var tex${e}: texture_2d<f32>;
        fn getTex${e}Sample(uv: vec2<f32>) -> vec4<f32> {
          return textureSample(tex${e}, u_sampler, uv);
        }`;
		}
		let t = Array(r).fill(0).map((t, n) => e(n)).join("\n");
		d = d.replace("// #GROUP-1-BINDING-X", t);
	}
	if (a > 0 && s !== void 0) {
		function e(e) {
			return `
        @group(${s}) @binding(${e + r}) var<storage, read> buffer${e}: array<f32>;
        fn getBuffer${e}(idx: i32) -> f32 {
          return buffer${e}[idx];
        }`;
		}
		let t = Array(a).fill(0).map((t, n) => e(n)).join("\n");
		d = d.replace("// #GROUP-1-BINDING-X", "// #GROUP-1-BINDING-X\n" + t);
	}
	if (o) {
		let e = `
      @group(${c ?? 2}) @binding(0) var prevFrameTex: texture_2d<f32>;
      fn getPrevFrameTexSample(uv: vec2<f32>) -> vec4<f32> {
        return textureSample(prevFrameTex, u_sampler, uv);
      }`;
		d = d.replace("// #GROUP-2-BINDING-X", e);
	}
	if (e && (d = d.replace("// #FUNCTIONS", e)), n.length > 0) {
		let e = l(n, u);
		d = d.replace("// #RAY_MARCH_FUNCTIONS", e);
	}
	return d;
}
// src/pages/_lib/ReTina/shaders/parse-fragment-shader.ts
function d({ main: e, functions: t, rtUniformKeys: n, materialFuncs: r, nTextures: i, nBuffers: a, usePrevFrameTex: o, useInterlacing: s, bufferGroupIndex: c, prevFrameGroupIndex: l, distMapGroupIndex: d, raymarchOptions: f }) {
	let p = u({
		functions: t,
		materialFuncs: r,
		nTextures: i,
		nBuffers: a,
		rtUniformKeys: n,
		usePrevFrameTex: o,
		bufferGroupIndex: c,
		prevFrameGroupIndex: l,
		raymarchOptions: f
	});
	r.length > 0 && !e && (e = "\n      let scene = calcScene(uv);\n      return vec4f(scene.color.rgb, 1.0);\n    ");
	let m = `
    ${p}
    @fragment
    fn main(@builtin(position) fragPos: vec4f, @location(0) fragCoord: vec2f) -> @location(0) vec4f {
        var uv = 1. - fragCoord.xy;
        // #INTERLACING
        ${e ?? "return vec4f(0, 0, 0, 1);"}
    }
  `;
	if (s && (m = m.replace("// #INTERLACING", "\n      let _fullY = min(i32(fragPos.y) * 2 + (i32(U.frame) & 1), i32(U.height) - 1);\n      uv = vec2f(uv.x, (f32(_fullY) + 0.5) / U.height);\n    ")), d !== void 0) {
		let e = `
      @group(${d}) @binding(0) var distMapTex: texture_2d<f32>;
    `;
		m = m.replace("// #DISTANCE_MAP_BINDING", e);
		let t = typeof f?.coneTile == "number" ? f.coneTile : 8, n = `
      let _dmDim = textureDimensions(distMapTex);
      let _dmCoord = clamp(vec2i(i32(uv.x * U.width) / ${t}, i32(uv.y * U.height) / ${t}), vec2i(0), vec2i(_dmDim) - vec2i(1));
      _startDist = textureLoad(distMapTex, _dmCoord, 0).r;
    `;
		m = m.replace("// #DISTANCE_MAP_ADVANCE", n);
	}
	return m;
}
// src/pages/_lib/ReTina/utils/rt-uniform.ts
var f = class {
	device;
	buffer;
	uniform = {};
	uniformBindGroupLayout;
	uniformBindGroup;
	constructor(e, t) {
		this.device = e;
		let n = Object.keys(t);
		this.buffer = e.createBuffer({
			size: n.length * 4,
			usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
		}), n.forEach((e, n) => {
			this.uniform[e] = {
				value: t[e],
				offSet: n * 4
			}, this.set(e, t[e]);
		}), this.uniformBindGroupLayout = e.createBindGroupLayout({ entries: [{
			binding: 0,
			visibility: GPUShaderStage.FRAGMENT,
			buffer: { type: "uniform" }
		}, {
			binding: 1,
			visibility: GPUShaderStage.FRAGMENT,
			sampler: { type: "non-filtering" }
		}] }), this.uniformBindGroup = this.device.createBindGroup({
			layout: this.uniformBindGroupLayout,
			entries: [{
				binding: 0,
				resource: { buffer: this.getBuffer() }
			}, {
				binding: 1,
				resource: this.device.createSampler({
					addressModeU: "repeat",
					addressModeV: "repeat",
					magFilter: "nearest",
					minFilter: "nearest"
				})
			}]
		});
	}
	getBuffer() {
		return this.buffer;
	}
	getKeysSortedByOffset() {
		return Object.keys(this.uniform).toSorted((e, t) => this.uniform[e].offSet - this.uniform[t].offSet);
	}
	set(e, t) {
		if (!this.uniform[e]) throw Error(`Uniform ${e} not found`);
		this.uniform[e].value = t, this.device.queue.writeBuffer(this.buffer, this.uniform[e].offSet, new Float32Array([t]));
	}
	get(e) {
		if (!this.uniform[e]) throw Error(`Uniform ${e} not found`);
		return this.uniform[e].value;
	}
	getCustomBindingsForCollisions(e) {
		let t = this.device.createBindGroupLayout({ entries: [
			{
				binding: 0,
				visibility: GPUShaderStage.COMPUTE,
				buffer: { type: "uniform" }
			},
			{
				binding: 1,
				visibility: GPUShaderStage.COMPUTE,
				sampler: { type: "non-filtering" }
			},
			{
				binding: 2,
				visibility: GPUShaderStage.COMPUTE,
				buffer: { type: "storage" }
			}
		] });
		return {
			uniformBindGroupLayout: t,
			uniformBindGroup: this.device.createBindGroup({
				layout: t,
				entries: [
					{
						binding: 0,
						resource: { buffer: this.getBuffer() }
					},
					{
						binding: 1,
						resource: this.device.createSampler({
							addressModeU: "repeat",
							addressModeV: "repeat",
							magFilter: "nearest",
							minFilter: "nearest"
						})
					},
					{
						binding: 2,
						resource: { buffer: e }
					}
				]
			})
		};
	}
}, p = class {
	texs;
	device;
	textures;
	textureEntries;
	textureBindGroupLayout;
	constructor(e, t) {
		this.texs = t, this.device = e, this.textures = this.texs.map(({ width: e, height: t }) => this.device.createTexture({
			size: [
				e,
				t,
				1
			],
			format: "rgba8unorm",
			usage: GPUTextureUsage.COPY_DST | GPUTextureUsage.TEXTURE_BINDING
		})), this.textureEntries = this.textures.map((e, t) => ({
			binding: t,
			resource: e.createView()
		})), this.textureBindGroupLayout = e.createBindGroupLayout({ entries: t.map((e, t) => ({
			binding: t,
			visibility: GPUShaderStage.FRAGMENT,
			texture: { sampleType: "unfilterable-float" }
		})) });
	}
	setTexture(e, t) {
		let n = this.texs[e].width, r = this.texs[e].height, i = this.textures[e];
		this.device.queue.writeTexture({ texture: i }, t, {
			offset: 0,
			bytesPerRow: n * 4,
			rowsPerImage: r
		}, [
			n,
			r,
			1
		]);
	}
	getTextureEntries() {
		return this.textureEntries;
	}
	length() {
		return this.texs.length;
	}
}, m = class {
	pingPongBindGroupLayout;
	bindGroupPingIn;
	bindGroupPongIn;
	pingTextureView;
	pongTextureView;
	currentReadTexture;
	currentReadTextureView;
	currentWriteTexture;
	currentWriteTextureView;
	currentBindGroupIn;
	offscreenTextureSize;
	constructor(e, t, n) {
		this.pingPongBindGroupLayout = t.createBindGroupLayout({ entries: [{
			binding: 0,
			visibility: GPUShaderStage.FRAGMENT,
			texture: { sampleType: "unfilterable-float" }
		}] }), this.bindGroupPingIn = {}, this.bindGroupPongIn = {}, this.pingTextureView = {}, this.pongTextureView = {}, this.currentReadTexture = {}, this.currentReadTextureView = {}, this.currentWriteTexture = {}, this.currentWriteTextureView = {}, this.currentBindGroupIn = {}, this.offscreenTextureSize = [
			0,
			0,
			1
		], this.init(e.width, e.height, t, n);
	}
	preSubmit() {}
	swap() {
		let e = this.currentReadTexture, t = this.currentReadTextureView, n = this.currentBindGroupIn;
		this.currentReadTexture = this.currentWriteTexture, this.currentReadTextureView = this.currentWriteTextureView, this.currentBindGroupIn = n === this.bindGroupPingIn ? this.bindGroupPongIn : this.bindGroupPingIn, this.currentWriteTexture = e, this.currentWriteTextureView = t;
	}
	resize(e, t, n, r) {
		this.currentReadTexture.destroy(), this.currentWriteTexture.destroy(), this.init(e, t, n, r);
	}
	init(e, t, n, r) {
		this.offscreenTextureSize = [
			e,
			t,
			1
		];
		let i = n.createTexture({
			size: this.offscreenTextureSize,
			format: r,
			usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_SRC
		}), a = n.createTexture({
			size: this.offscreenTextureSize,
			format: r,
			usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_SRC
		}), o = i.createView(), s = a.createView();
		this.pingTextureView = o, this.pongTextureView = s, this.bindGroupPingIn = n.createBindGroup({
			layout: this.pingPongBindGroupLayout,
			entries: [{
				binding: 0,
				resource: o
			}]
		}), this.bindGroupPongIn = n.createBindGroup({
			layout: this.pingPongBindGroupLayout,
			entries: [{
				binding: 0,
				resource: s
			}]
		}), this.currentReadTexture = i, this.currentReadTextureView = o, this.currentWriteTexture = a, this.currentWriteTextureView = s, this.currentBindGroupIn = this.bindGroupPingIn;
	}
};
// src/pages/_lib/ReTina/device/get-render.ts
async function h({ device: e, presentationFormat: t, context: n, canvas: i, main: a, materialFuncs: o, functions: s, rtUniform: c, rtTexture: l, rtBuffer: u, usePrevFrameTex: f, useInterlacing: p, bindGroupLayouts: m, prevFrameGroupIndex: h, rtPingPong: g, rtInterlacing: _, transparent: v, rtComputeScene: y, distMapGroupIndex: b, raymarchOptions: x }) {
	let S = d({
		main: a,
		functions: s,
		materialFuncs: o,
		rtUniformKeys: c.getKeysSortedByOffset(),
		nTextures: l.length(),
		nBuffers: u ? u.length() : 0,
		bufferGroupIndex: 1,
		prevFrameGroupIndex: h,
		usePrevFrameTex: f,
		useInterlacing: p,
		distMapGroupIndex: b,
		raymarchOptions: x
	}), C = e.createRenderPipeline({
		layout: e.createPipelineLayout({ bindGroupLayouts: m }),
		vertex: {
			module: e.createShaderModule({ code: r }),
			entryPoint: "main"
		},
		fragment: {
			module: e.createShaderModule({ code: S }),
			entryPoint: "main",
			targets: [{ format: t }]
		},
		primitive: {
			topology: "triangle-strip",
			frontFace: "ccw",
			stripIndexFormat: "uint32"
		}
	}), w = 0, T = null;
	function E(e) {
		let t = performance.now() / 1e3;
		T === null && (T = performance.now() / 1e3);
		let n = t - T;
		c.set("frame", w), c.set("time", n), c.set("aspectRatio", i.width / i.height), c.set("width", i.width), c.set("height", i.height), c.set("camPosX", e.pos.x), c.set("camPosY", e.pos.y), c.set("camPosZ", e.pos.z), c.set("camSphericalR", e.spherical.radius), c.set("camSphericalT", e.spherical.theta), c.set("camSphericalP", e.spherical.phi), c.set("camFov", e.fov);
	}
	let D = l.getTextureEntries();
	u && u.getBufferEntries().forEach((e, t) => {
		D.push({
			binding: t + l.length(),
			resource: e.resource
		});
	});
	let O = e.createBindGroup({
		layout: C.getBindGroupLayout(1),
		entries: D
	});
	function k({ camera: t }) {
		E(t);
		let r = e.createCommandEncoder();
		y && y.encodePass(r);
		let i = { colorAttachments: [{
			view: _ ? _.halfTextureView : g ? g.currentWriteTextureView : n.getCurrentTexture().createView(),
			loadOp: "clear",
			clearValue: {
				r: 0,
				g: 0,
				b: 0,
				a: +!v
			},
			storeOp: "store"
		}] }, a = r.beginRenderPass(i);
		a.setPipeline(C), a.setBindGroup(0, c.uniformBindGroup), a.setBindGroup(1, O), g && h !== void 0 && a.setBindGroup(h, g.currentBindGroupIn), y && b !== void 0 && a.setBindGroup(b, y.distMapReadBindGroup), a.draw(4, 1, 0, 0), a.end(), _ && _.encodeResolvePass(r, v), g && r.copyTextureToTexture({ texture: g.currentWriteTexture }, { texture: n.getCurrentTexture() }, g.offscreenTextureSize), e.queue.submit([r.finish()]), g && g.swap(), w++;
	}
	return k;
}
// src/pages/_lib/ReTina/device/get-device.ts
async function g() {
	let e = await navigator.gpu.requestAdapter({ powerPreference: "high-performance" });
	if (!e) throw Error("No adapter found");
	let t = e.features.has("shader-f16");
	return t || console.warn("shader-f16 not available"), {
		device: await e.requestDevice({
			requiredFeatures: t ? ["shader-f16"] : [],
			requiredLimits: { maxBindGroups: e.limits.maxBindGroups }
		}),
		presentationFormat: navigator.gpu.getPreferredCanvasFormat()
	};
}
// src/pages/_lib/ReTina/utils/rt-material.ts
var _ = class {
	setPos;
	getPos;
	setRot;
	setColor;
	setCollisionGroup;
	checkForCollisions;
	collisionGroup = -1;
	index;
	rt;
	constructor({ material: e, rt: t, index: n }) {
		this.rt = t, e.pos ||= {
			x: 0,
			y: 0,
			z: 0
		}, e.color ||= {
			r: 1,
			g: 1,
			b: 1
		}, e.rotation ||= {
			x: 0,
			y: 0,
			z: 0
		};
		let { set: r, get: i } = t.registerUniform(`material${n}Px`, e.pos.x), { set: a, get: o } = t.registerUniform(`material${n}Py`, e.pos.y), { set: s, get: c } = t.registerUniform(`material${n}Pz`, e.pos.z);
		this.getPos = () => ({
			x: i(),
			y: o(),
			z: c()
		}), this.setPos = (e) => {
			e.x !== void 0 && r(e.x), e.y !== void 0 && a(e.y), e.z !== void 0 && s(e.z);
		};
		let l = t.registerUniform(`material${n}Rx`, e.rotation.x).set, u = t.registerUniform(`material${n}Ry`, e.rotation.y).set, d = t.registerUniform(`material${n}Rz`, e.rotation.z).set;
		this.setRot = (e) => {
			e.x !== void 0 && l(e.x), e.y !== void 0 && u(e.y), e.z !== void 0 && d(e.z);
		};
		let f = t.registerUniform(`material${n}Cr`, e.color.r).set, p = t.registerUniform(`material${n}Cg`, e.color.g).set, m = t.registerUniform(`material${n}Cb`, e.color.b).set;
		this.setColor = (e) => {
			e.r !== void 0 && f(e.r), e.g !== void 0 && p(e.g), e.b !== void 0 && m(e.b);
		}, e.enableCollisions && (this.collisionGroup = n), this.setCollisionGroup = t.registerUniform(`material${n}CollisionGroup`, this.collisionGroup).set, this.index = n;
	}
	checkCollision(e) {
		return this.rt.checkCollision(this.index, e);
	}
	getIndex() {
		return this.index;
	}
};
// src/pages/_lib/ReTina/shaders/collision/parse-collision-shader.ts
function v({ functions: e, rtUniformKeys: t, materialFuncs: n, nTextures: r, nBuffers: i, usePrevFrameTex: a, bufferGroupIndex: o, dynamicGroupIndex: s }) {
	let c = u({
		functions: e,
		materialFuncs: n,
		nTextures: r,
		nBuffers: i,
		rtUniformKeys: t,
		usePrevFrameTex: a,
		bufferGroupIndex: o
	}), l = n.map((e) => e.sdFunc);
	function d(e, t) {
		return `
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
      }`;
	}
	return `
    ${c}
    
    struct CollisionParams {
      collisionGroup: i32,
      pos: vec3f,
    }

    @group(${s}) @binding(0) var<uniform> params: CollisionParams;

    fn sdInternalCollisionGroup(pos: vec3f) -> SdMaterial {
      var material = SdMaterial(-1, INF, vec3f(0.), vec3f(0.));
      var curDist: f32;

      ${l.map((e, t) => d(t, "==")).join("\n")}

      return material;
    }

    fn sdExternalCollisionGroup(pos: vec3f) -> SdMaterial {
      var material = SdMaterial(-1, INF, vec3f(0.), vec3f(0.));
      var curDist: f32;

      ${l.map((e, t) => d(t, "!=")).join("\n")}

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
  `;
}
// src/pages/_lib/ReTina/shaders/parse-compute-shader.ts
function y({ buffers: e, main: t, functions: n, workgroupSize: r }) {
	return [
		"\n    const PI     = f32(3.1415926535897932384626433832795);\n    const TWO_PI = f32(6.283185307179586476925286766559);\n    const E      = f32(2.71828182845904523536028747135266);\n    const INF    = f32(1e10);\n  ",
		e.map((e, t) => `@group(0) @binding(${t}) var<storage, ${e.readOnly ? "read" : "read_write"}> ${e.name}: array<${e.wgslType}>;`).join("\n"),
		n ?? "",
		`
@compute @workgroup_size(${r})
fn main(@builtin(global_invocation_id) gid: vec3<u32>) {
${t}
}
`
	].join("\n");
}
// src/pages/_lib/ReTina/utils/rt-compute.ts
function b(e) {
	return e instanceof Float32Array ? "f32" : e instanceof Uint32Array ? "u32" : "i32";
}
var x = class {
	device;
	pipeline;
	bindGroup;
	storageBuffers = [];
	readBuffers = [];
	bufferSizes = [];
	destroyed = !1;
	runningRef = { value: !1 };
	constructor(e) {
		let { device: t, buffers: n } = e;
		this.device = t;
		let r = [], i = [];
		for (let e = 0; e < n.length; e++) {
			let { data: a, readOnly: o } = n[e], s = a.byteLength;
			this.bufferSizes.push(s);
			let c = t.createBuffer({
				size: s,
				usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC | GPUBufferUsage.COPY_DST
			});
			t.queue.writeBuffer(c, 0, a), this.storageBuffers.push(c);
			let l = t.createBuffer({
				size: s,
				usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST
			});
			this.readBuffers.push(l), r.push({
				binding: e,
				visibility: GPUShaderStage.COMPUTE,
				buffer: { type: o ? "read-only-storage" : "storage" }
			}), i.push({
				binding: e,
				resource: { buffer: c }
			});
		}
		let a;
		a = "main" in e && e.main ? y({
			buffers: n.map((e) => ({
				name: e.name,
				wgslType: b(e.data),
				readOnly: e.readOnly ?? !1
			})),
			main: e.main,
			functions: e.functions,
			workgroupSize: e.workgroupSize ?? 64
		}) : e.code;
		let o = t.createBindGroupLayout({ entries: r });
		this.pipeline = t.createComputePipeline({
			layout: t.createPipelineLayout({ bindGroupLayouts: [o] }),
			compute: {
				module: t.createShaderModule({ code: a }),
				entryPoint: "main"
			}
		}), this.bindGroup = t.createBindGroup({
			layout: o,
			entries: i
		});
	}
	updateBuffer(e, t) {
		if (this.destroyed) throw Error("RTCompute: already destroyed");
		if (e < 0 || e >= this.storageBuffers.length) throw Error(`RTCompute: buffer index ${e} out of range`);
		this.device.queue.writeBuffer(this.storageBuffers[e], 0, t);
	}
	async run(e, t = 1, n = 1) {
		if (this.destroyed) throw Error("RTCompute: already destroyed");
		if (this.runningRef.value) return null;
		this.runningRef.value = !0;
		try {
			let r = this.device.createCommandEncoder(), i = r.beginComputePass();
			i.setPipeline(this.pipeline), i.setBindGroup(0, this.bindGroup), i.dispatchWorkgroups(e, t, n), i.end();
			for (let e = 0; e < this.storageBuffers.length; e++) r.copyBufferToBuffer(this.storageBuffers[e], 0, this.readBuffers[e], 0, this.bufferSizes[e]);
			return this.device.queue.submit([r.finish()]), await Promise.all(this.readBuffers.map(async (e) => {
				await e.mapAsync(GPUMapMode.READ);
				let t = e.getMappedRange().slice(0);
				return e.unmap(), t;
			}));
		} finally {
			this.runningRef.value = !1;
		}
	}
	destroy() {
		if (!this.destroyed) {
			this.destroyed = !0;
			for (let e of this.storageBuffers) e.destroy();
			for (let e of this.readBuffers) e.destroy();
			this.storageBuffers = [], this.readBuffers = [];
		}
	}
	static async dispatch({ device: e, pipeline: t, bindGroups: n, workgroups: r, resultBuffer: i, resultSize: a, runningRef: o }) {
		if (o) {
			if (o.value) return null;
			o.value = !0;
		}
		let s = e.createBuffer({
			size: a,
			usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ
		});
		try {
			let o = e.createCommandEncoder(), c = o.beginComputePass();
			c.setPipeline(t);
			for (let { index: e, group: t } of n) c.setBindGroup(e, t);
			c.dispatchWorkgroups(...r), c.end(), o.copyBufferToBuffer(i, 0, s, 0, a), e.queue.submit([o.finish()]), await s.mapAsync(GPUMapMode.READ);
			let l = new Float32Array(s.getMappedRange().slice(0));
			return s.unmap(), l;
		} finally {
			s.destroy(), o && (o.value = !1);
		}
	}
}, S = class {
	device;
	computePipeline;
	paramsBindGroup;
	paramsBuffer;
	uniformBindGroup;
	resultBufferSize;
	resultBuffer;
	rtTexture;
	rtBuffer;
	nTextures;
	computeBindGroupsTemplate = [];
	constructor({ device: e, functions: t, rtUniformKeys: n, materialFuncs: r, nTextures: i, usePrevFrameTex: a, rtUniform: o, rtTexture: s, rtBuffer: c }) {
		this.device = e, this.rtTexture = s, this.rtBuffer = c, this.nTextures = i, this.resultBufferSize = Float32Array.BYTES_PER_ELEMENT * 5, this.resultBuffer = e.createBuffer({
			size: this.resultBufferSize,
			usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC
		});
		let { uniformBindGroupLayout: l, uniformBindGroup: u } = o.getCustomBindingsForCollisions(this.resultBuffer);
		this.uniformBindGroup = u, this.paramsBuffer = e.createBuffer({
			size: 32,
			usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
		});
		let d = e.createBindGroupLayout({ entries: [{
			binding: 0,
			visibility: GPUShaderStage.COMPUTE,
			buffer: { type: "uniform" }
		}] });
		this.paramsBindGroup = e.createBindGroup({
			layout: d,
			entries: [{
				binding: 0,
				resource: { buffer: this.paramsBuffer }
			}]
		});
		let f = Array.from({ length: i }, (e, t) => ({
			binding: t,
			visibility: GPUShaderStage.COMPUTE,
			texture: { sampleType: "unfilterable-float" }
		}));
		c && Array.from({ length: c.length() }, (e, t) => {
			f.push({
				binding: t + i,
				visibility: GPUShaderStage.COMPUTE,
				buffer: { type: "read-only-storage" }
			});
		});
		let p = [l, e.createBindGroupLayout({ entries: f })];
		this.computeBindGroupsTemplate.push({
			index: 0,
			group: u
		});
		let m = p.length;
		p.push(d), this.computeBindGroupsTemplate.push({
			index: m,
			group: this.paramsBindGroup
		});
		let h = v({
			functions: t,
			rtUniformKeys: n,
			materialFuncs: r,
			nTextures: i,
			nBuffers: c ? c.length() : 0,
			bufferGroupIndex: 1,
			dynamicGroupIndex: m,
			usePrevFrameTex: a
		});
		this.computePipeline = e.createComputePipeline({
			layout: e.createPipelineLayout({ bindGroupLayouts: p }),
			compute: {
				module: e.createShaderModule({ code: h }),
				entryPoint: "main"
			}
		});
	}
	async checkCollision(e, t) {
		this.device.queue.writeBuffer(this.paramsBuffer, 0, new Int32Array([e])), this.device.queue.writeBuffer(this.paramsBuffer, 16, new Float32Array([
			t.x,
			t.y,
			t.z
		]));
		let n = [...this.rtTexture.getTextureEntries()];
		this.rtBuffer && this.rtBuffer.getBufferEntries().forEach((e, t) => {
			n.push({
				binding: t + this.nTextures,
				resource: e.resource
			});
		});
		let r = this.device.createBindGroup({
			layout: this.computePipeline.getBindGroupLayout(1),
			entries: n
		}), i = [...this.computeBindGroupsTemplate];
		i.push({
			index: 1,
			group: r
		});
		let a = await x.dispatch({
			device: this.device,
			pipeline: this.computePipeline,
			bindGroups: i,
			workgroups: [1],
			resultBuffer: this.resultBuffer,
			resultSize: this.resultBufferSize
		});
		return a === null ? {
			materialIndex: -1,
			collisionDist: Infinity,
			collisionNormal: {
				x: 0,
				y: 0,
				z: 0
			}
		} : {
			materialIndex: a[0],
			collisionDist: a[1],
			collisionNormal: {
				x: a[2],
				y: a[3],
				z: a[4]
			}
		};
	}
}, C = class {
	shoot;
	fps;
	fpsCounter = 0;
	showFps;
	cb;
	constructor({ cb: e, shoot: t, fps: n, showFps: r }) {
		this.shoot = t, this.cb = e, this.fps = n, this.showFps = r;
	}
	startFpsCounter() {
		let e = document.createElement("div");
		e.setAttribute("style", " position: absolute;\n        top: 0;\n        left: 0;\n        color: green;\n        background: black;\n        font-size: 16px;\n        font-family: monospace;\n        pointer-events: none;"), document.body.appendChild(e), setInterval(() => {
			e.innerText = `FPS: ${this.fpsCounter}`, this.fpsCounter = 0;
		}, 1e3);
	}
	start() {
		this.showFps && this.startFpsCounter();
		let e = this.cb, t = this.shoot, n = () => {
			this.fpsCounter++;
		}, r = this.fps, i = async () => {
			requestAnimationFrame(i), await e(), t(), n();
		};
		if (r !== void 0) {
			let a = 1e3 / r, o = 0;
			i = async (r) => {
				requestAnimationFrame(i);
				let s = r - o;
				s > a && (o = r - s % a, await e(), t(), n());
			};
		}
		requestAnimationFrame(i);
	}
};
// src/pages/_lib/ReTina/utils/utils.ts
function w(e, t) {
	let n = t ?? window.innerHeight, r = n * (window.innerWidth / window.innerHeight);
	e.height = Math.max(1, n), e.width = Math.max(1, r);
}
function T(e, t, n) {
	let r = document.createElement("canvas");
	return w(r, e), r.style.position = "fixed", r.style.top = "50%", r.style.left = "50%", r.style.transform = "translate(-50%, -50%)", r.style.width = "100svw", r.style.height = "100svh", t && (r.style.pointerEvents = "none"), n ? r.style.imageRendering = n : e && e < window.innerHeight && (r.style.imageRendering = "pixelated"), document.body.appendChild(r), r;
}
// src/pages/_lib/ReTina/utils/rt-interlacing.ts
var E = class {
	device;
	presentationFormat;
	rtUniform;
	rtPingPong;
	halfTexture;
	halfTextureView;
	halfTextureSize;
	resolvePipeline;
	resolveBindGroupLayout;
	resolveBindGroupPing;
	resolveBindGroupPong;
	constructor({ device: e, canvas: t, presentationFormat: n, rtUniform: r, rtPingPong: i }) {
		this.device = e, this.presentationFormat = n, this.rtUniform = r, this.rtPingPong = i, this.resolveBindGroupLayout = e.createBindGroupLayout({ entries: [{
			binding: 0,
			visibility: GPUShaderStage.FRAGMENT,
			texture: { sampleType: "unfilterable-float" }
		}, {
			binding: 1,
			visibility: GPUShaderStage.FRAGMENT,
			texture: { sampleType: "unfilterable-float" }
		}] });
		let a = e.createShaderModule({ code: "\n      struct GlobalUniform {\n        frame: f32,\n        time: f32,\n        aspectRatio: f32,\n        width: f32,\n        height: f32,\n      };\n\n      @group(0) @binding(0) var<uniform> U: GlobalUniform;\n      @group(0) @binding(1) var u_sampler: sampler;\n\n      @group(1) @binding(0) var halfTex: texture_2d<f32>;\n      @group(1) @binding(1) var prevFullTex: texture_2d<f32>;\n\n      @vertex\n      fn vs_main(@builtin(vertex_index) VertexIndex: u32) -> @builtin(position) vec4f {\n        var pos = array<vec2f, 4>(\n          vec2f(-1.0, 1.0),\n          vec2f(-1.0, -1.0),\n          vec2f(1.0, 1.0),\n          vec2f(1.0, -1.0)\n        );\n        return vec4f(pos[VertexIndex], 0.0, 1.0);\n      }\n\n      @fragment\n      fn fs_main(@builtin(position) fragPos: vec4f) -> @location(0) vec4f {\n        let coord = vec2i(fragPos.xy);\n        let frame = i32(U.frame);\n        let isNewRow = (coord.y & 1) == (frame & 1);\n\n        if (frame == 0 || isNewRow) {\n          let halfDim = vec2i(textureDimensions(halfTex));\n          let halfY = clamp(coord.y / 2, 0, halfDim.y - 1);\n          let halfCoord = vec2i(clamp(coord.x, 0, halfDim.x - 1), halfY);\n          return textureLoad(halfTex, halfCoord, 0);\n        } else {\n          return textureLoad(prevFullTex, coord, 0);\n        }\n      }\n    " });
		this.resolvePipeline = e.createRenderPipeline({
			layout: e.createPipelineLayout({ bindGroupLayouts: [r.uniformBindGroupLayout, this.resolveBindGroupLayout] }),
			vertex: {
				module: a,
				entryPoint: "vs_main"
			},
			fragment: {
				module: a,
				entryPoint: "fs_main",
				targets: [{ format: n }]
			},
			primitive: {
				topology: "triangle-strip",
				frontFace: "ccw",
				stripIndexFormat: "uint32"
			}
		}), this.halfTexture = {}, this.halfTextureView = {}, this.halfTextureSize = [
			0,
			0,
			1
		], this.resolveBindGroupPing = {}, this.resolveBindGroupPong = {}, this.initTextures(t.width, t.height);
	}
	initTextures(e, t) {
		let n = Math.max(1, Math.ceil(t / 2));
		this.halfTextureSize = [
			e,
			n,
			1
		], this.halfTexture = this.device.createTexture({
			size: this.halfTextureSize,
			format: this.presentationFormat,
			usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING
		}), this.halfTextureView = this.halfTexture.createView(), this.resolveBindGroupPing = this.device.createBindGroup({
			layout: this.resolveBindGroupLayout,
			entries: [{
				binding: 0,
				resource: this.halfTextureView
			}, {
				binding: 1,
				resource: this.rtPingPong.pingTextureView
			}]
		}), this.resolveBindGroupPong = this.device.createBindGroup({
			layout: this.resolveBindGroupLayout,
			entries: [{
				binding: 0,
				resource: this.halfTextureView
			}, {
				binding: 1,
				resource: this.rtPingPong.pongTextureView
			}]
		});
	}
	resize(e, t) {
		this.halfTexture.destroy(), this.initTextures(e, t);
	}
	encodeResolvePass(e, t) {
		let n = e.beginRenderPass({ colorAttachments: [{
			view: this.rtPingPong.currentWriteTextureView,
			loadOp: "clear",
			clearValue: {
				r: 0,
				g: 0,
				b: 0,
				a: +!t
			},
			storeOp: "store"
		}] });
		n.setPipeline(this.resolvePipeline), n.setBindGroup(0, this.rtUniform.uniformBindGroup);
		let r = this.rtPingPong.currentReadTextureView === this.rtPingPong.pingTextureView ? this.resolveBindGroupPing : this.resolveBindGroupPong;
		n.setBindGroup(1, r), n.draw(4, 1, 0, 0), n.end();
	}
};
// src/pages/_lib/ReTina/shaders/parse-compute-scene-shader.ts
function D({ rtUniformKeys: e, materialFuncs: t, nTextures: n, nBuffers: r, usePrevFrameTex: i, functions: a, workgroupSize: o, bufferGroupIndex: s, distMapGroupIndex: c, coneTile: l, raymarchOptions: d }) {
	let f = u({
		functions: a,
		materialFuncs: t,
		nTextures: n,
		nBuffers: r,
		rtUniformKeys: e,
		usePrevFrameTex: i,
		bufferGroupIndex: s,
		raymarchOptions: d
	});
	return f = f.replace("// #DISTANCE_MAP_BINDING", ""), f = f.replace("// #DISTANCE_MAP_ADVANCE", ""), `
    ${f}

    @group(${c}) @binding(0) var distMap: texture_storage_2d<r32float, write>;

    @compute @workgroup_size(${o}, ${o})
    fn main(@builtin(global_invocation_id) gid: vec3<u32>) {
      let dim = textureDimensions(distMap);
      if (gid.x >= dim.x || gid.y >= dim.y) { return; }

      let tileSize = f32(${l});
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
  `;
}
// src/pages/_lib/ReTina/utils/rt-compute-scene.ts
var O = class {
	device;
	computePipeline;
	computeUniformBindGroup;
	computeTextureBindGroup;
	distMapBindGroup;
	distMapWriteLayout;
	distMapTexture;
	distMapGroupIndex;
	workgroupsX;
	workgroupsY;
	workgroupSize;
	coneTile;
	distMapReadLayout;
	distMapReadBindGroup;
	computeBindGroups = [];
	constructor({ device: e, canvas: t, rtUniform: n, rtTexture: r, materialFuncs: i, functions: a, usePrevFrameTex: o, workgroupSize: s = 8, rtBuffer: c, coneTile: l = 8, raymarchOptions: u }) {
		this.device = e, this.coneTile = l, this.workgroupSize = s;
		let d = t.width, f = t.height, p = Math.max(1, Math.ceil(d / l)), m = Math.max(1, Math.ceil(f / l));
		this.distMapTexture = e.createTexture({
			size: [p, m],
			format: "r32float",
			usage: GPUTextureUsage.STORAGE_BINDING | GPUTextureUsage.TEXTURE_BINDING
		});
		let h = e.createBindGroupLayout({ entries: [{
			binding: 0,
			visibility: GPUShaderStage.COMPUTE,
			buffer: { type: "uniform" }
		}, {
			binding: 1,
			visibility: GPUShaderStage.COMPUTE,
			sampler: { type: "non-filtering" }
		}] });
		this.computeUniformBindGroup = e.createBindGroup({
			layout: h,
			entries: [{
				binding: 0,
				resource: { buffer: n.getBuffer() }
			}, {
				binding: 1,
				resource: e.createSampler({
					addressModeU: "repeat",
					addressModeV: "repeat",
					magFilter: "nearest",
					minFilter: "nearest"
				})
			}]
		});
		let g = r.length(), _ = Array.from({ length: g }, (e, t) => ({
			binding: t,
			visibility: GPUShaderStage.COMPUTE,
			texture: { sampleType: "unfilterable-float" }
		}));
		c && Array.from({ length: c.length() }, (e, t) => {
			_.push({
				binding: t + g,
				visibility: GPUShaderStage.COMPUTE,
				buffer: { type: "read-only-storage" }
			});
		});
		let v = e.createBindGroupLayout({ entries: _ }), y = [...r.getTextureEntries()];
		c && c.getBufferEntries().forEach((e, t) => {
			y.push({
				binding: t + g,
				resource: e.resource
			});
		}), this.computeTextureBindGroup = e.createBindGroup({
			layout: v,
			entries: y
		});
		let b = [h, v];
		this.computeBindGroups.push(this.computeUniformBindGroup), this.computeBindGroups.push(this.computeTextureBindGroup), this.distMapGroupIndex = b.length, this.distMapWriteLayout = e.createBindGroupLayout({ entries: [{
			binding: 0,
			visibility: GPUShaderStage.COMPUTE,
			storageTexture: {
				access: "write-only",
				format: "r32float",
				viewDimension: "2d"
			}
		}] }), this.distMapBindGroup = e.createBindGroup({
			layout: this.distMapWriteLayout,
			entries: [{
				binding: 0,
				resource: this.distMapTexture.createView()
			}]
		}), b.push(this.distMapWriteLayout), this.computeBindGroups.push(this.distMapBindGroup), this.distMapReadLayout = e.createBindGroupLayout({ entries: [{
			binding: 0,
			visibility: GPUShaderStage.FRAGMENT,
			texture: { sampleType: "unfilterable-float" }
		}] }), this.distMapReadBindGroup = e.createBindGroup({
			layout: this.distMapReadLayout,
			entries: [{
				binding: 0,
				resource: this.distMapTexture.createView()
			}]
		});
		let x = D({
			rtUniformKeys: n.getKeysSortedByOffset(),
			materialFuncs: i,
			nTextures: g,
			nBuffers: c ? c.length() : 0,
			usePrevFrameTex: o,
			functions: a,
			workgroupSize: s,
			bufferGroupIndex: 1,
			distMapGroupIndex: this.distMapGroupIndex,
			coneTile: l,
			raymarchOptions: u
		});
		this.computePipeline = e.createComputePipeline({
			layout: e.createPipelineLayout({ bindGroupLayouts: b }),
			compute: {
				module: e.createShaderModule({ code: x }),
				entryPoint: "main"
			}
		}), this.workgroupsX = Math.ceil(p / s), this.workgroupsY = Math.ceil(m / s);
	}
	resize(e, t) {
		this.distMapTexture.destroy();
		let n = Math.max(1, Math.ceil(e / this.coneTile)), r = Math.max(1, Math.ceil(t / this.coneTile));
		this.distMapTexture = this.device.createTexture({
			size: [n, r],
			format: "r32float",
			usage: GPUTextureUsage.STORAGE_BINDING | GPUTextureUsage.TEXTURE_BINDING
		});
		let i = this.distMapTexture.createView();
		this.distMapBindGroup = this.device.createBindGroup({
			layout: this.distMapWriteLayout,
			entries: [{
				binding: 0,
				resource: i
			}]
		}), this.computeBindGroups[this.distMapGroupIndex] = this.distMapBindGroup, this.distMapReadBindGroup = this.device.createBindGroup({
			layout: this.distMapReadLayout,
			entries: [{
				binding: 0,
				resource: i
			}]
		}), this.workgroupsX = Math.ceil(n / this.workgroupSize), this.workgroupsY = Math.ceil(r / this.workgroupSize);
	}
	encodePass(e) {
		let t = e.beginComputePass();
		t.setPipeline(this.computePipeline), this.computeBindGroups.forEach((e, n) => t.setBindGroup(n, e)), t.dispatchWorkgroups(this.workgroupsX, this.workgroupsY), t.end();
	}
}, k = class {
	buffers;
	device;
	gpuBuffers;
	bufferEntries;
	bufferBindGroupLayout;
	bufferBindGroup;
	constructor(e, t) {
		this.buffers = t, this.device = e, this.gpuBuffers = this.buffers.map(({ size: e }) => this.device.createBuffer({
			size: e,
			usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST
		})), this.bufferEntries = this.gpuBuffers.map((e, t) => ({
			binding: t,
			resource: { buffer: e }
		})), this.bufferBindGroupLayout = e.createBindGroupLayout({ entries: t.map((e, t) => ({
			binding: t,
			visibility: GPUShaderStage.FRAGMENT | GPUShaderStage.COMPUTE,
			buffer: { type: "read-only-storage" }
		})) }), this.bufferBindGroup = e.createBindGroup({
			layout: this.bufferBindGroupLayout,
			entries: this.bufferEntries
		});
	}
	setBuffer(e, t) {
		let n = this.gpuBuffers[e];
		this.device.queue.writeBuffer(n, 0, t);
	}
	getBufferEntries() {
		return this.bufferEntries;
	}
	length() {
		return this.buffers.length;
	}
};
// src/pages/_lib/utils/keyboardListener.ts
function A(e) {
	let t = {};
	window.addEventListener("keydown", (e) => {
		e.preventDefault(), t[e.code] = !0;
	}), window.addEventListener("keyup", (e) => {
		e.preventDefault(), t[e.code] = !1;
	});
	function n() {
		e({
			UP: t.KeyE,
			DOWN: t.KeyQ,
			FRONT: t.KeyW,
			BACK: t.KeyS,
			LEFT: t.KeyA,
			RIGHT: t.KeyD,
			SPACE: t.Space
		}), requestAnimationFrame(n);
	}
	n();
}
// src/pages/_lib/utils/freeControls.ts
function j(e, t) {
	let n = e.canvas;
	n.style.cursor = "grab", n.style.userSelect = "none", n.style.touchAction = "manipulation";
	let r = !1, i, a;
	function o(e) {
		r = !0, i = e.x, a = e.y;
	}
	document.addEventListener("mousedown", ({ clientX: e, clientY: t }) => {
		o({
			x: e,
			y: t
		}), n.style.cursor = "grabbing";
	}), document.addEventListener("touchstart", ({ changedTouches: e }) => {
		let t = e[0];
		o({
			x: t.clientX,
			y: t.clientY
		});
	});
	function s(t) {
		e.camera.spherical.theta += 3 * (i - t.x) / window.innerWidth, e.camera.spherical.phi += 3 * (a - t.y) / window.innerHeight, i = t.x, a = t.y;
	}
	document.addEventListener("mousemove", (e) => {
		r && s({
			x: e.clientX,
			y: e.clientY
		});
	}), document.addEventListener("touchmove", (e) => {
		if (!r) return;
		let t = e.changedTouches[0];
		s({
			x: t.clientX,
			y: t.clientY
		});
	}), document.addEventListener("mouseup", () => {
		r = !1, n.style.cursor = "grab";
	}), document.addEventListener("touchend", () => {
		r = !1;
	}), document.addEventListener("wheel", (n) => {
		t?.blockZoom || (e.camera.spherical.radius += n.deltaY * .001);
	});
	let c = [
		0,
		0,
		0
	], l = t?.speed ?? .002;
	return A((n) => {
		let r = e.camera.spherical.theta;
		n.UP && !t?.blockY && (c[1] += l), n.DOWN && !t?.blockY && (c[1] -= l), n.FRONT && (c[0] -= l * Math.sin(r), c[2] -= l * Math.cos(r)), n.BACK && (c[0] += l * Math.sin(r), c[2] += l * Math.cos(r)), n.LEFT && (c[0] -= l * Math.cos(r), c[2] += l * Math.sin(r)), n.RIGHT && (c[0] += l * Math.cos(r), c[2] -= l * Math.sin(r)), n.SPACE && t?.onSpace?.(), e.camera.pos.x += c[0], t?.blockY || (e.camera.pos.y += c[1]), e.camera.pos.z += c[2], c[0] *= t?.slowDown?.x ?? .9, t?.blockY || (c[1] *= t?.slowDown?.y ?? .9), c[2] *= t?.slowDown?.z ?? .9;
	}), {
		applyForce(e) {
			c[0] += e.x ?? 0, c[1] += e.y ?? 0, c[2] += e.z ?? 0;
		},
		getVelocity() {
			return {
				x: c[0],
				y: c[1],
				z: c[2]
			};
		},
		setVelocity(e) {
			e.x !== void 0 && (c[0] = e.x), e.y !== void 0 && (c[1] = e.y), e.z !== void 0 && (c[2] = e.z);
		}
	};
}
// src/pages/_lib/utils/thirdPersonControls.ts
function M(e, t) {
	let n = Object.freeze({
		x: t?.initPos?.x ?? e.camera.pos.x ?? 0,
		y: t?.initPos?.y ?? e.camera.pos.y ?? 2,
		z: t?.initPos?.z ?? e.camera.pos.z ?? 4
	});
	e.camera.pos = { ...n }, e.camera.spherical.radius = t?.radius ?? 2, e.camera.spherical.theta = t?.theta ?? .2, t?.fov !== void 0 && (e.camera.fov = t.fov);
	let r = e.registerMaterial({
		enableCollisions: !0,
		sdFunc: t?.sdFunc ?? "\n    let camPos = vec3f(U.camPosX, U.camPosY, U.camPosZ);\n    let offset = vec3f(0, -0.4, 0);\n    let head = sdSphere(pos - camPos - offset, 0.3);\n    let body = sdCapsule(pos - camPos - offset, vec3f(0, 0, 0), vec3f(0, -0.6, 0), 0.2);\n    return opSmoothUnion(head, body, 0.2);\n  ",
		lightFunc: t?.lightFunc
	}), i = t?.gravity ?? .003, a = t?.jumpForce ?? .08, o = t?.terminalVel ?? -.2, s = t?.floorSkin ?? .2, c = t?.wallSkin ?? .28, l = t?.groundDot ?? .65, u = t?.ceilingDot ?? -.65, d = !1, f = null, p = e.setControlsToFree({
		speed: t?.speed ?? .004,
		slowDown: t?.slowDown ?? {
			x: .88,
			y: 1,
			z: .88
		},
		blockY: !0,
		onSpace: () => {
			d &&= (p.setVelocity({ y: a }), !1);
		}
	});
	function m(t, n) {
		let { materialIndex: i, collisionDist: a, collisionNormal: o } = t;
		if (i === -1) return;
		let f = o.y > l, m = o.y < u, h = f ? s : c;
		if (a >= h) {
			f && a > s * 1.5 && (d = !1);
			return;
		}
		let g = h - a, _ = n.y + o.y * g;
		f ? e.camera.pos.y = Math.max(e.camera.pos.y, _) : m ? e.camera.pos.y = Math.min(e.camera.pos.y, _) : e.camera.pos.y += o.y * g, e.camera.pos.x += o.x * g, e.camera.pos.z += o.z * g;
		let v = p.getVelocity();
		if (f) d = !0, r.setColor({
			r: 0,
			g: 1,
			b: 0
		}), v.y < 0 && p.setVelocity({ y: 0 });
		else if (m) d = !1, r.setColor({
			r: 1,
			g: 0,
			b: 0
		}), v.y > 0 && p.setVelocity({ y: 0 });
		else {
			r.setColor({
				r: 0,
				g: 0,
				b: 1
			});
			let e = v.x * o.x + v.y * o.y + v.z * o.z;
			e < 0 && p.setVelocity({
				x: v.x - e * o.x,
				y: v.y - e * o.y,
				z: v.z - e * o.z
			});
		}
	}
	function h() {
		let a = e.camera.pos;
		if (d ? p.getVelocity().y < 0 && p.setVelocity({ y: 0 }) : (p.applyForce({ y: -i }), p.getVelocity().y < o && p.setVelocity({ y: o })), a.y += p.getVelocity().y, t?.respawnY !== void 0 && a.y < t.respawnY) {
			e.camera.pos = { ...n }, p.setVelocity({
				x: 0,
				y: 0,
				z: 0
			}), d = !1;
			return;
		}
		if (f) return;
		let s = {
			x: a.x,
			y: a.y,
			z: a.z
		}, l = {
			x: a.x,
			y: a.y - 1,
			z: a.z
		}, u = {
			x: a.x,
			y: a.y + .1,
			z: a.z
		};
		f = (async () => {
			let e = await r.checkCollision(l), t = await r.checkCollision(u), n = e.collisionDist <= t.collisionDist ? e : t, i = n.collisionDist;
			(n.materialIndex === -1 || i > c) && r.setColor({
				r: 1,
				g: 1,
				b: 1
			}), m(n, s), f = null;
		})().catch(() => {
			f = null;
		});
	}
	return {
		player: r,
		controls: p,
		update: h,
		getIsOnGround: () => d,
		resetPosition: () => {
			e.camera.pos = { ...n }, p.setVelocity({
				x: 0,
				y: 0,
				z: 0
			}), d = !1;
		}
	};
}
// src/pages/_lib/index.ts
var N = class {
	canvas;
	main;
	functions;
	render;
	initalCustomUniforms = {};
	setUniform;
	getUniform;
	materialFuncs = [];
	usePrevFrameTex;
	useInterlacing;
	setDeviceTexure;
	setDeviceBuffer;
	texs;
	buffers;
	fps;
	showFps;
	transparent;
	rtCollision;
	rtUniform;
	rtPingPong;
	rtInterlacing;
	rtComputeScene;
	raymarch;
	device;
	presentationFormat;
	frameCallbacks = [];
	camera = {
		pos: {
			x: 0,
			y: 0,
			z: 0
		},
		spherical: {
			radius: 0,
			theta: 0,
			phi: 0
		},
		fov: 90
	};
	constructor({ main: e, functions: t, texs: n, buffers: r, usePrevFrameTex: i, useInterlacing: a, fps: o, height: s, showFps: c, transparent: l, imageRendering: u, raymarch: d } = {}) {
		this.canvas = T(s, l, u), this.main = e, this.functions = t, this.texs = n ?? [], this.buffers = r ?? [], this.useInterlacing = a, this.usePrevFrameTex = i, this.fps = o, this.showFps = c, this.transparent = l, this.raymarch = d;
	}
	registerMaterial(e) {
		if (this.render) throw Error("Render already built");
		let t = this.materialFuncs.length, n = new _({
			rt: this,
			material: e,
			index: t
		});
		return this.materialFuncs.push({
			sdFunc: e.sdFunc,
			lightFunc: e.lightFunc
		}), n;
	}
	setTex(e, t) {
		if (!this.setDeviceTexure) throw Error("Render not built");
		this.setDeviceTexure(e, t);
	}
	setBuffer(e, t) {
		if (!this.setDeviceBuffer) throw Error("Render not built");
		this.setDeviceBuffer(e, t);
	}
	registerUniform(e, t) {
		if (this.render) throw Error("Render already built");
		return this.initalCustomUniforms[e] = t ?? 0, {
			set: (t) => {
				if (!this.setUniform) throw Error("Render not built");
				this.setUniform(e, t), this.initalCustomUniforms[e] = t;
			},
			get: () => {
				if (!this.getUniform) throw Error("Render not built");
				return this.getUniform(e);
			}
		};
	}
	async build() {
		let { device: e, presentationFormat: t } = await this.getDevice(), n = this.canvas.getContext("webgpu");
		if (!n) throw Error("No context found");
		n.configure({
			device: e,
			format: t,
			alphaMode: this.transparent ? "premultiplied" : "opaque",
			usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.COPY_DST
		});
		let r = new f(e, {
			frame: 0,
			time: 0,
			aspectRatio: this.canvas.width / this.canvas.height,
			width: this.canvas.width,
			height: this.canvas.height,
			camPosX: this.camera.pos.x ?? 0,
			camPosY: this.camera.pos.y ?? 0,
			camPosZ: this.camera.pos.z ?? 0,
			camSphericalR: this.camera.spherical.radius ?? 0,
			camSphericalT: this.camera.spherical.theta ?? 0,
			camSphericalP: this.camera.spherical.phi ?? 0,
			camFov: this.camera.fov ?? 90,
			...this.initalCustomUniforms
		});
		this.rtUniform = r;
		let i = new p(e, this.texs), a;
		this.buffers.length > 0 && (a = new k(e, this.buffers));
		let o = [];
		this.texs.forEach((e, t) => {
			o.push({
				binding: t,
				visibility: GPUShaderStage.FRAGMENT,
				texture: { sampleType: "unfilterable-float" }
			});
		}), a && this.buffers.forEach((e, t) => {
			o.push({
				binding: t + this.texs.length,
				visibility: GPUShaderStage.FRAGMENT | GPUShaderStage.COMPUTE,
				buffer: { type: "read-only-storage" }
			});
		});
		let s = e.createBindGroupLayout({ entries: o }), c = [r.uniformBindGroupLayout, s], l;
		(this.usePrevFrameTex || this.useInterlacing) && (this.rtPingPong = new m(this.canvas, e, t), this.usePrevFrameTex && (l = c.length, c.push(this.rtPingPong.pingPongBindGroupLayout)));
		let u, d, g = this.raymarch?.coneTile !== !1;
		if (this.materialFuncs.length > 0 && g) {
			let t = typeof this.raymarch?.coneTile == "number" ? this.raymarch.coneTile : 8;
			u = new O({
				device: e,
				canvas: this.canvas,
				rtUniform: r,
				rtTexture: i,
				rtBuffer: a,
				materialFuncs: this.materialFuncs,
				functions: this.functions,
				usePrevFrameTex: this.usePrevFrameTex,
				coneTile: t,
				raymarchOptions: this.raymarch
			}), this.rtComputeScene = u, d = c.length, c.push(u.distMapReadLayout);
		}
		let _;
		this.useInterlacing && this.rtPingPong && (_ = new E({
			device: e,
			canvas: this.canvas,
			presentationFormat: t,
			rtUniform: r,
			rtPingPong: this.rtPingPong
		}), this.rtInterlacing = _), this.render = await h({
			device: e,
			bindGroupLayouts: c,
			presentationFormat: t,
			context: n,
			canvas: this.canvas,
			main: this.main,
			materialFuncs: this.materialFuncs,
			functions: this.functions,
			rtUniform: r,
			rtTexture: i,
			rtBuffer: a,
			usePrevFrameTex: this.usePrevFrameTex,
			useInterlacing: this.useInterlacing,
			prevFrameGroupIndex: l,
			rtPingPong: this.rtPingPong,
			rtInterlacing: this.rtInterlacing,
			transparent: this.transparent,
			rtComputeScene: u,
			distMapGroupIndex: d,
			raymarchOptions: this.raymarch
		}), this.setUniform = (e, t) => {
			r.set(e, t);
		}, this.getUniform = (e) => r.get(e), this.setDeviceTexure = (e, t) => {
			i.setTexture(e, t);
		}, this.setDeviceBuffer = (e, t) => {
			a?.setBuffer(e, t);
		}, this.materialFuncs.length > 0 && (this.rtCollision = new S({
			device: e,
			rtUniformKeys: r.getKeysSortedByOffset(),
			functions: this.functions,
			materialFuncs: this.materialFuncs,
			nTextures: this.texs.length,
			usePrevFrameTex: this.usePrevFrameTex,
			rtUniform: r,
			rtTexture: i,
			rtBuffer: a
		}));
	}
	checkCollision(e, t) {
		if (!this.rtCollision || !this.rtUniform) throw Error("Render not built");
		let n = t ?? {
			x: this.rtUniform.get("camPosX"),
			y: this.rtUniform.get("camPosY"),
			z: this.rtUniform.get("camPosZ")
		};
		return this.rtCollision.checkCollision(e, n);
	}
	async start(e) {
		await this.build(), e?.onBuild?.(), e?.once ? this.render?.({ camera: this.camera }) : (new C({
			cb: () => {
				for (let e of this.frameCallbacks) e();
				e?.onFrame?.();
			},
			shoot: () => {
				this.render?.({ camera: this.camera });
			},
			fps: this.fps,
			showFps: this.showFps
		}).start(), window.addEventListener("resize", () => {
			this.resize();
		}));
	}
	async getDevice() {
		if (!this.device || !this.presentationFormat) {
			let { device: e, presentationFormat: t } = await g();
			this.device = e, this.presentationFormat = t;
		}
		return {
			device: this.device,
			presentationFormat: this.presentationFormat
		};
	}
	resize() {
		w(this.canvas, this.canvas.height), this.rtPingPong && this.device && this.presentationFormat && this.rtPingPong.resize(this.canvas.width, this.canvas.height, this.device, this.presentationFormat), this.rtInterlacing && this.rtInterlacing.resize(this.canvas.width, this.canvas.height), this.rtComputeScene && this.rtComputeScene.resize(this.canvas.width, this.canvas.height);
	}
	isBuilt() {
		return this.render !== void 0;
	}
	setControlsToFree(e) {
		return j(this, e);
	}
	setControlsTo3rdPerson(e) {
		let t = M(this, e);
		return this.frameCallbacks.push(t.update), t;
	}
};
export { x as RTCompute, N as default, n as getFFTGetter, e as loadImage };
