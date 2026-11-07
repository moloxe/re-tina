import{t as e}from"./getFFTGetter.B1DvvLCV.js";import{t}from"./_lib.D4YYebGq.js";var n=1024,r=new t({showFps:!0,height:600,useInterlacing:!0,buffers:[{size:n*4}],main:`
    let scene = calcScene(uv);
    var color = hsv2rgb(vec3f(0.6, 0.4, 0.1));
    let t = U.time;

    if scene.dist > 0 {
      color = max(scene.color.rgb, color);
    } else {
      let rd = scene.rd;
      let starStatic = smoothstep(0.85, 1f, snoise3d(vec3f(rd * 100.)));
      let starMoving = smoothstep(0.85, 1f,
        snoise3d(rotate(rd, vec3f(-t, t, 0) * 0.01) * 50.)
      );
      color = color + (starStatic + starMoving);
    }

    var xy = uv * 2f - 1f; xy *= vec2f(U.width / U.height, -1f);
    let pMoon = vec2f(0, 0.65);
    let dMoon = smoothstep(.01, 0., length(xy - pMoon) - 0.08);
    let dHalo = smoothstep(.04, 0., length(xy - pMoon) - 0.08);
    var cTex = snoise(vec2f(xy * 10.)) * 2f;
    cTex = snoise3d(vec3f(xy * 10., cTex + t * 0.2)) +
           snoise3d(vec3f(xy * 20., cTex + t * 0.2));
    var cMoon = (dHalo - dMoon * cTex * 0.2) * (lightColor + 0.1);
    color = cMoon + color * (1. - dMoon);

    color = pow(color, vec3f(1.2));
    color = max(color, vec3f(0, 0.05, 0.15));
    return vec4f(color, 1.0);
  `,functions:`
    const lakeColor = vec3f(0.0, 1f, 0.7) * 0.4;
    const lightColor = vec3f(1.0, 0.9, 0.9);
    const lightPos = vec3f(0, 200.0, -400.0);
    fn sdFFTBars(pos: vec3f) -> f32 {
      var dBars = 1e9;
      let nBars = 28i;
      for (var i = 0i; i <= nBars; i++) {
        let val = getBuffer0(i);
        let h = max(val - 0.8f, 0) * 80f;
        let ang = ((-f32(i) - 0.5f) / f32(nBars + 1i)) * TWO_PI;
        let x = sin(ang) * 20f;
        let z = -50f + cos(ang) * 20f;
        let bPos1 = vec3f(x, -8f, z);
        let bPos2 = vec3f(x, h - 8f, z);
        let bDist = sdCapsule(pos, bPos1, bPos2, 1.4f);
        dBars = opSmoothUnion(dBars, bDist, 3.5f);
      }
      return dBars;
    }
    fn lakeLight(pos: vec3f, normal: vec3f, rd: vec3f, lightPos: vec3f) -> vec3f {
      let viewDir = -rd;
      let lightDir = normalize(lightPos - pos);
      let lambertian = dot(normal, lightDir);

      var specular1 = 0.;
      var specular2 = 0.;
      if lambertian > 0. {
          let halfDir = normalize(lightDir + viewDir);
          let specAngle = max(dot(halfDir, normal), 0.);
          specular1 = min(pow(specAngle + 0.02, 100f), 1.);
          specular2 = min(pow(specAngle + 0.001, 1000f), 1.);
      }

      let colorLinear = (
          lakeColor * lambertian * lightColor * 1.2 +
          specular1 * lakeColor  * lightColor * 0.5 +
          specular2 * lightColor * 2f);

      return colorLinear;
    }
  `}),i=28,a=22050,o=65,s=14e3,c=Array.from({length:29},(e,t)=>{let r=o*(s/o)**(t/29),i=o*(s/o)**((t+1)/29),c=Math.max(1,Math.floor(r/a*n));return[c,Math.max(c+1,Math.min(1023,Math.ceil(i/a*n)))]}),l=new Float32Array(29),u=new Float32Array(29);for(let e=0;e<=i;e++){let t=e/i;u[e]=.16*(1-t)**.6+.04}var d=new Float32Array(n),f=await e({bufferSize:n});r.registerMaterial({sdFunc:`
    let water = pos.y;
    let dFFTBars = sdFFTBars(pos);
    return opSmoothUnion(water, dFFTBars, 6f);
  `,lightFunc:`
    let t = U.time;
    let wave1 = snoise3d(vec3f(pos.x * 0.6  + t * 0.6, pos.z * 0.6, t * 2f)) * 0.06;
    let wave2 = snoise3d(vec3f(pos.x * 0.2  + t * 0.6, pos.z * 0.2, t * 0.1)) * 0.1;
    let _normal = normalize(normal + wave1 + wave2);
    let color1 = lakeLight(pos, _normal, rd, lightPos);
    let color2 = lakeLight(pos, _normal, rd, vec3f(-lightPos.x, 1f, -lightPos.z));
    let finalColor = max(color1, color2);
    return vec4f(finalColor, 1.0);
  `}),r.camera.fov=60,r.camera.pos.y=8,r.camera.spherical={radius:3,theta:0,phi:-.1},r.start({onFrame(){let e=f();if(e){for(let t=0;t<=i;t++){let[n,r]=c[t],a=0,o=0,s=r-n+1;for(let t=n;t<=r;t++){let n=e[t]/255;a+=n,n>o&&(o=n)}let f=a/s,p=.7*o+.3*f;p<u[t]?u[t]=u[t]*.92+p*.08:u[t]=u[t]*.999+p*.001;let m=u[t]+.035,h=0;p>m&&(h=(p-m)/(1-m));let g=1+.85*(t/i)**.65,_=Math.min(1,h**.75*g*1.5);_>l[t]?l[t]+=(_-l[t])*.45:l[t]+=(_-l[t])*.11,l[t]<.002&&(l[t]=0),d[t]=l[t]}r.setBuffer(0,d)}}});