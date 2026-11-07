import{t as e}from"./_lib.D4YYebGq.js";var t=new e({showFps:!0});t.registerMaterial({color:{r:.5,g:.5,b:.5},sdFunc:`
    let dBox = sdBox(pos, vec3<f32>(0.26, 0.14, 0.08));
    let dSphere = sdSphere(pos, 0.1);
    return opSmoothUnion(dBox, dSphere, 0.5);
  `,lightFunc:`
    let minBright = 0.5;
    let diffuseColor = color;
    let shininess = 256.;
    let lightPos = toCartesian(vec3f(1.3, PI / 2., PI / 2.));
    let lightColor = vec3f(1);
    let power = 1.;
    let light = blinnPhong(
      // Environment
      rd, normal, minBright,
      // Material
      pos, diffuseColor, shininess,
      // Light
      lightPos, lightColor, power,
    );
    return vec4f(light, 1.);
  `}),t.registerMaterial({pos:{x:0,y:.03,z:.22},color:{r:0,g:0,b:0},sdFunc:`
    let left  = sdBox(pos - vec3<f32>(0.15, 0.0, 0.0), vec3<f32>(0.12, 0.08, 0.001));
    let right = sdBox(pos - vec3<f32>(-0.15, 0.0, 0.0), vec3<f32>(0.12, 0.08, 0.001));
    let mid = sdCapsule(pos - vec3<f32>(0.0, 0.04, 0.0), vec3<f32>(0.05, 0, 0), vec3<f32>(-0.05, 0, 0), 0.01);
    return opSmoothUnion(min(left, right), mid, 0.02);
  `,lightFunc:`
    let minBright = 0.;
    let diffuseColor = color;
    let shininess = 2056.;
    let lightPos = toCartesian(vec3f(1.3, 0, 0));
    let lightColor = vec3f(1);
    let power = 2.;
    let light = blinnPhong(
      // Environment
      rd, normal, minBright,
      // Material
      pos, diffuseColor, shininess,
      // Light
      lightPos, lightColor, power,
    );
    return vec4f(light, 1.);
  `}),t.registerMaterial({sdFunc:`
    let dBody = sdCapsule(pos, vec3<f32>(0, -0.32, 0), vec3<f32>(0, -0.4, 0), 0.08);
    let leftLeg = sdCapsule(pos, vec3<f32>(-0.04, -0.45, 0), vec3<f32>(-0.07, -0.55, 0), 0.05);
    let rightLeg = sdCapsule(pos, vec3<f32>(0.04, -0.45, 0), vec3<f32>(0.07, -0.55, 0), 0.05);
    let dLegs = min(leftLeg, rightLeg);
    return opSmoothUnion(dBody, dLegs, 0.04);
  `,lightFunc:`
    var n = snoise3d(pos * 20.);
    n = snoise3d(vec3<f32>(pos.xy, n + U.time)) * 0.5 + 0.5;
    n = pow(n, 2.0);
    let c = hsv2rgb(vec3<f32>(pos.y + U.time, 1.0 - n, n));
    let lambertian = dot(normal, -rd);
    return vec4<f32>(c * lambertian, 1.);
  `}),t.registerMaterial({color:{r:.4,g:.6,b:.6},sdFunc:`
    let dFloor = sdBox(pos - vec3<f32>(0, -0.6, 0), vec3<f32>(1, 0.01, 0.3));
    let dWall = sdBox(pos - vec3<f32>(0, 0, -0.3), vec3<f32>(1, 0.6, 0.01));
    return min(dFloor, dWall);
  `}),t.camera.fov=60,t.camera.spherical.radius=1.2,t.camera.spherical.theta=.3,t.setControlsToFree(),t.start();