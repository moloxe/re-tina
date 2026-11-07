import{t as e}from"./_lib.D4YYebGq.js";var t=new e;t.registerMaterial({color:{r:0,g:.9,b:.8},sdFunc:`
    let bounce = pow(sin(U.time * .2), 2.);
    let d1 = sdTorus(pos, vec2(.8, .2));
    let d2 = sdBox(pos, vec3(.6));
    return d1 * bounce + d2 * (1. - bounce);
  `}),t.camera.fov=100,t.camera.spherical.radius=2,t.start({onFrame(){t.camera.spherical.phi+=.006,t.camera.spherical.theta+=.006}});