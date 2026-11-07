var e=`import ReTina from '@ReTina'

const rt = new ReTina()

rt.registerMaterial({
  sdFunc: \`
    let t = U.time * .1;
    pos = rotate(pos, vec3<f32>(0, t, -t));
    pos += vec3<f32>(cos(-t) * 16, 2.4, sin(-t) * 16);
    return (sin(pos.y) - (cos(pos.x) + cos(pos.y) + cos(pos.z))) * 0.67;
  \`,
  lightFunc: \`
    let lamb = dot(normal, -rd);
    var c = (normal * .5 + .5) * sqrt(lamb);
    let dist = length(pos - ro);
    let bri = pow(max(0, sin(dist * PI / 6.)), 6.) + 0.2;
    c *= bri;
    return vec4(c, 1.);
  \`,
})

rt.setControlsToFree()

rt.start()
`;export{e as default};