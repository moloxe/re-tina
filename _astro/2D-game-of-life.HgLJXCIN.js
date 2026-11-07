import{t as e}from"./_lib.D4YYebGq.js";async function t(e){let t=document.createElement(`img`);t.src=e,await t.decode();let n=document.createElement(`canvas`);n.width=t.width,n.height=t.height;let r=n.getContext(`2d`);if(!r)throw Error(`No canvas context found`);r.drawImage(t,0,0,n.width,n.height);let i=r.getImageData(0,0,n.width,n.height),a=new Uint8Array(t.width*t.height*4);for(let e=0;e<t.width*t.height*4;e++)a[e]=i.data[e];return{textureData:a,width:t.width,height:t.height}}var n=await t(`/re-tina/img/tina.jpeg`),r=new e({fps:24,height:128,texs:[{width:n.width,height:n.height}],usePrevFrameTex:!0,functions:`
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