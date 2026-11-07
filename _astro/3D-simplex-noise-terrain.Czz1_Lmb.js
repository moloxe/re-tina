import{t as e}from"./_lib.D4YYebGq.js";var t=new e({useInterlacing:!0,height:256,main:`
    let scene = calcScene(uv);
    var color = vec3f(0);
    if scene.dist > 0 {
        color = round(scene.color.rgb * 16) / 16;
    }
    return vec4f(color, 1);
  `,functions:`
    fn getLightPos() -> vec3f {
      return vec3f(0, 2, U.camPosZ - 10);
    }
  `});t.registerMaterial({sdFunc:`return sdSphere((pos - getLightPos()), 1);`,lightFunc:`return vec4f(1);`}),t.registerMaterial({sdFunc:`
    let terrain = (pos.y - snoise3d(vec3f(pos.xz, pos.y - U.time / 10))) / 6;
    let capsule = sdCapsule(pos, vec3f(U.camPosX, U.camPosY, U.camPosZ), getLightPos(), 0.2);
    return opSmoothSubtraction(capsule, terrain, .1);
  `,lightFunc:`
    let minBright = 0.1;
    let diffuseColor = color;
    let shininess = 1024f;
    let lightPos = getLightPos();
    let lightColor = vec3f(0.8, 0.9, 0.9);
    let power = 128f;
    let light = blinnPhong(
      // Environment
      rd, normal, minBright,
      // Material
      pos, diffuseColor, shininess,
      // Light
      lightPos, lightColor, power,
    );
    return vec4f(light, 1);
  `}),t.start({onFrame(){let e=performance.now()/1e3;t.camera.pos={x:0,y:.6,z:-e/4},t.camera.spherical={radius:.1,theta:Math.sin(e/2)/2,phi:-.3}}});