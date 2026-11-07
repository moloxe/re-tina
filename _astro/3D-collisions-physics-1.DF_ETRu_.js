import{t as e}from"./_lib.D4YYebGq.js";var t=new e({showFps:!0,height:400,fps:40,useInterlacing:!0,main:`
    let scene = calcScene(uv);
    var color = scene.color.rgb;
    if scene.dist < 0 {
      var seed = toSpherical(scene.rd);
      seed.z += U.time * 0.1; seed.y += U.time * 0.1;
      seed = toCartesian(seed);
      let n = (
        (snoise3d(vec3f(seed * 10.)) + 1f) / 2f +
        (snoise3d(vec3f(seed * 20.)) + 1f) / 2f
      ) / 2f;
      let nebula = hsv2rgb(vec3f(n, 0.4, 6. * (n - 0.6)));
      color = mix(
        vec3f(0, 0, 0.1),
        nebula,
        min(pow(max(scene.rd.y + 0.8, 0.), 8.), 1.)
      );
    }
    return vec4f(color, 1);
  `});t.registerMaterial({sdFunc:`
    var d1 = max(pos.y, -(pos.y + 0.1));
    d1 = max(d1, -sdSphere(pos, 3.));
    let t = U.time * 0.2;
    let n = snoise3d(vec3f(pos.x * 0.2, pos.z * 0.2 + t, t));
    let d2 = max(-pos.y, pos.y - n * 0.8 - 1.);
    let shape = smoothstep(0., 2.0, abs(pos.x) - 5f);
    return mix(d1, d2, shape);
  `}),t.registerMaterial({color:{r:1,g:0,b:1},sdFunc:`
    let t = U.time;
    pos = pos - vec3f(3., 0.6 - sin(t) * 0.2, 0);
    pos = rotate(pos, vec3f(0, t, 0));
    return sdBox(pos, vec3f(1, 0.1, 1));
  `}),t.registerMaterial({pos:{x:-4,y:1,z:0},sdFunc:`
    return sdBox(pos, vec3f(0.01, 1., 2.));
  `});var n=.4,r=[,,,,].fill(0).map(()=>t.registerMaterial({sdFunc:`return sdSphere(pos, ${n});`,enableCollisions:!0})),i=0;async function a(){let e=performance.now()/1e3;for(let t=0;t<r.length;t++){let n=-e/2+2*Math.PI*t/r.length,i=Math.cos(n)*1.5-4,a=Math.sin(n)*1.5+3;r[t].setPos({x:i,y:a,z:-.5})}if(!(!t.isBuilt()||i>0))for(let e=0;e<r.length;e++){let t=r[e],a=t.getPos();i++;let o=await t.checkCollision(a),s={r:1,g:1,b:1};o.materialIndex!==-1&&o.collisionDist<=n&&(s={r:.3,g:.9,b:.3}),t.setColor(s),i--}}t.setControlsTo3rdPerson({initPos:{x:0,y:2,z:4},respawnY:-10}),t.start({onFrame:()=>{a()}});