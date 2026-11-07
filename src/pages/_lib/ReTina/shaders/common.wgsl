struct GlobalUniform {
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
