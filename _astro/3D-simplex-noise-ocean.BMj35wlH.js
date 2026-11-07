import{t as e}from"./_lib.D4YYebGq.js";var t=new e({useInterlacing:!0,showFps:!0,height:256,main:`
    let scene = calcScene(uv);
    var color = hsv2rgb(vec3f(0.6, 0.4, 0.1));

    if scene.dist > 0 {
      color = max(scene.color.rgb, color);
    } else {
      let time = U.time;
      let rd = scene.rd;
      var v = snoise3d(rd * 2.0 + vec3f(0.0, 0.0, time * 0.1));
      v = snoise3d(rd * 4.0 + vec3f(v, v, time * 0.2));
      v = snoise3d(rd * 8.0 + vec3f(v, v, time * 0.3));
      v = max(v, 0.0);
      color = mix(color, vec3f(0.25) + pow(v, 16.0), v);
    }

    color = round(color * 16.0) / 16.0;
    return vec4f(color, 1.0);
  `,functions:`
    const lightColor = vec3f(1.0, 0.8, 0.6);
    const lightPower1 = 3e5;
    const lightPower2 = 1e5;
    const lightPos1 = vec3f(200.0, 200.0, 400.0);
    const lightPos2 = -lightPos1;
  `});t.registerMaterial({sdFunc:`return sdSphere((pos - lightPos1), 80.);`,lightFunc:`return vec4f(1);`}),t.registerMaterial({sdFunc:`
    let time = U.time;
    let wave1 = snoise3d(vec3f(pos.x * 0.1 + time * 0.8, pos.z * 0.1, time * 0.5)) * 0.6;
    let wave2 = snoise3d(vec3f(pos.x * 0.6 + time * 0.6, pos.z * 0.8, time * 2.0)) * 0.01;
    let water = (pos.y + wave1 + wave2) * 0.9;

    let localPos = pos - vec3f(0.0, 2.0, 0.0);
    let noiseVal = snoise3d(localPos - time * 0.5);
    let thing = (length(localPos) - pow(noiseVal + 1.0, 0.3)) * 0.6;

    return opSmoothUnion(water, thing, 1.4f);
  `,lightFunc:`
    let diffuseColor = vec3f(0.0, 1.0, 0.9);
    let shininess = 1000f;
    let light1 = blinnPhong(
      rd, normal, 0,
      pos, diffuseColor, shininess,
      lightPos1, lightColor, lightPower1
    );
    let light2 = blinnPhong(
      rd, normal, 0,
      pos, diffuseColor, shininess,
      lightPos2, lightColor, lightPower2
    );
    return vec4f(max(light1, light2), 1.0);
  `}),t.camera.fov=120,t.camera.pos.y=2,t.camera.spherical={radius:3,theta:-2,phi:0},t.start({onFrame(){t.camera.spherical.theta+=.001}});