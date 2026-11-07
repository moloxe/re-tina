import{t as e}from"./_lib.D4YYebGq.js";async function t(e){let t=e.startsWith(`/`)&&!e.startsWith(`/re-tina`)?`/re-tina${e}`:e,n=document.createElement(`img`);n.src=t,await n.decode();let r=document.createElement(`canvas`);r.width=n.width,r.height=n.height;let i=r.getContext(`2d`);if(!i)throw Error(`No canvas context found`);i.drawImage(n,0,0,r.width,r.height);let a=i.getImageData(0,0,r.width,r.height),o=new Uint8Array(n.width*n.height*4);for(let e=0;e<n.width*n.height*4;e++)o[e]=a.data[e];return{textureData:o,width:n.width,height:n.height}}var n=await t(`/img/tina.jpeg`),r=new e({fps:24,height:128,texs:[{width:n.width,height:n.height}],usePrevFrameTex:!0,functions:`
    fn isPixAlive(pos: vec2f) -> vec3f {
      return step(vec3f(0.5), getPrevFrameTexSample(pos).rgb);
    }
    fn golRule(_isAlive: f32, _nCount: f32) -> f32 {
      let isAlive = round(_isAlive) > 0.5;
      let nCount = round(_nCount);
      if isAlive {
        if nCount == 2 || nCount == 3 {
          return 1f;
        }
      } else if nCount == 3 {
        return 1f;
      }
      return 0f;
    }
  `,main:`
    if (U.time < 1) {
      return getTex0Sample(uv);
    } else {
      let res = vec2f(U.width, U.height);
      var nCount = vec3f(0);
      for (var i = -1; i <= 1; i = i + 1) {
        for (var j = -1; j <= 1; j = j + 1) {
          if (i == 0 && j == 0) {
            continue;
          }
          let pos = uv + vec2f(f32(i), f32(j)) / res;
          nCount += isPixAlive(pos);
        }
      }
      let isAlive = isPixAlive(uv);
      let newState = vec3f(
        golRule(isAlive.x, nCount.x),
        golRule(isAlive.y, nCount.y),
        golRule(isAlive.z, nCount.z)
      );
      return vec4f(newState, 1);
    }
  `});r.start({onBuild(){r.setTex(0,n.textureData)}});