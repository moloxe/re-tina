# ReTina

A lightweight, native **WebGPU** raymarching engine and interactive shader toolkit.

ReTina enables high-performance 2D procedural shaders and 3D Signed Distance Field (SDF) raymarching directly in modern browsers without external graphics libraries. Built from scratch with **TypeScript** and **WGSL**, it provides a streamlined API for lighting, compute passes, physics collisions, and dynamic buffer management.

> **Note:** For the previous p5.js and WebGL generation, see [Tina](https://moloxe.github.io/tina/).

---

## What It Offers

### 1. Core WebGPU & WGSL Pipeline

- **Zero-Boilerplate Setup**: Automatically discovers the GPU adapter, requests a device, configures swapchains, compiles WGSL shaders, and handles canvas resize/DPR.
- **Pure Web Standards**: Built without external rendering libraries (Three.js, Babylon, or p5.js), maximizing execution speed and GPU throughput.
- **Universal Library Bundle**: Exports `ReTina` as a standalone ES module (`/lib.js`) that can be imported directly into any web page or web worker.

### 2. 3D Raymarching & SDF Engine

- **Analytic Primitives & Combinators**: Built-in distance functions (`sdSphere`, `sdBox`, `sdTorus`, `sdCapsule`, `sdCutSphere`) and smooth CSG operations (`opSmoothUnion`, `opSmoothSubtraction`, `opSmoothIntersection`).
- **Enhanced Sphere Tracing**: High-speed raymarching convergence with configurable step counts, distance thresholds, and distance-field ambient occlusion (DFAO).
- **Material & Lighting Pipeline**: Register multiple materials with custom signed-distance functions (`sdFunc`) and custom illumination logic (`lightFunc`), including Blinn-Phong reflections, normal calculation, and shadows.

### 3. GPU Compute & Distance Field Acceleration

- **GPGPU Compute Passes (`RTCompute`)**: Run compute shaders with uniform, storage, and texture bindings.
- **Compute Scene Acceleration (`RTComputeScene`)**: Computes safe distance jump maps to drastically accelerate raymarching steps through dense geometry.

### 4. GPU-Driven Collisions & Controls

- **Hardware Collision Queries**: Evaluates the mathematical distance field on the GPU to detect collisions and calculate reaction normals.
- **Camera & Character Controls**: Built-in orbital/free camera (`freeControls`) and third-person platformer physics (`thirdPersonControls`) with gravity, jumping, floor/wall collision response, and smooth velocity damping.

### 5. Dynamic Variables, Textures & Ping-Pong Buffers

- **Automatic & Custom Uniforms**: Built-in uniforms for `time`, `width`, `height`, camera coordinates, and frame counts, plus dynamic custom uniforms updateable at 60+ FPS.
- **Multi-Texture & Audio Support**: Asynchronous image loader (`loadImage`) and microphone FFT audio frequency streamer (`getFFTGetter`).
- **Ping-Pong Feedback**: Easily read the previous frame's render buffer (`usePrevFrameTex: true`) to create cellular automata, fluid flow, motion blur, and temporal trails.

### 6. Performance Controls

- **Scanline Interlacing**: Alternate vertical/horizontal rendering passes (`useInterlacing: true`) to double framerates on computationally heavy scenes.
- **Decoupled Resolution**: Render complex shaders at lower internal heights (`height: 256`) while scaling smoothly to full window dimensions.
- **FPS Throttling**: Run simulations at fixed framerates (`fps: 24` or `fps: 40`) to balance fidelity with power consumption.

---

## Quick Start

### 1. Using from CDN / URL

You can import ReTina directly as an ES module:

```html
<!doctype html>
<html>
  <body>
    <script type="module">
      import ReTina from 'https://moloxe.github.io/re-tina/lib.js'

      const rt = new ReTina({
        main: `
          let st = uv * 2.0 - 1.0;
          let d = length(st) - 0.5 + sin(U.time * 2.0) * 0.1;
          let col = vec3f(smoothstep(0.01, 0.0, abs(d)));
          return vec4f(col, 1.0);
        `,
      })

      rt.start()
    </script>
  </body>
</html>
```

---

### 2. 2D Procedural Shader

```typescript
import ReTina from '@ReTina'

const rt = new ReTina({
  main: /* wgsl */ `
    let st = uv * 2.0 - 1.0;
    let d = length(st) - 0.5 + sin(U.time * 2.0) * 0.1;
    let col = vec3f(smoothstep(0.01, 0.0, abs(d)));
    return vec4f(col, 1.0);
  `,
})

rt.start()
```

---

### 3. 3D Raymarched Scene

```typescript
import ReTina from '@ReTina'

const rt = new ReTina()

rt.registerMaterial({
  color: { r: 0.2, g: 0.8, b: 0.7 },
  sdFunc: /* wgsl */ `
    let t = U.time * 0.1;
    pos = rotate(pos, vec3f(0.0, t, -t));
    return (sin(pos.y) - (cos(pos.x) + cos(pos.y) + cos(pos.z))) * 0.67;
  `,
  lightFunc: /* wgsl */ `
    let lamb = dot(normal, -rd);
    var c = (normal * 0.5 + 0.5) * sqrt(lamb);
    let dist = length(pos - ro);
    let bri = pow(max(0.0, sin(dist * PI / 6.0)), 6.0) + 0.2;
    return vec4f(c * bri, 1.0);
  `,
})

rt.setControlsToFree()
rt.start()
```

---

## Included Sketches

Interactive sketches located under `src/pages/_sketches/`:

| Sketch | Type | Description |
| --- | --- | --- |
| `2D-game-of-life.ts` | 2D | Cellular automata simulation with custom initial texture state |
| `2D-magnets.ts` | 2D | Magnetic field lines and interference patterns |
| `2D-microphone-fft.ts` | 2D | Audio-reactive frequency waterfall visualizer via microphone input |
| `2D-pattern.ts` | 2D | Sine/wave interference patterns and continuous trigonometric functions |
| `2D-vector-field.ts` | 2D | Dynamic 2D vector field visualization with complex numbers math |
| `2D-voronoi.ts` | 2D | GPU-accelerated Voronoi diagram and distance metrics |
| `3D-collisions-physics-1.ts` | 3D | Physics simulation with multiple bouncing capsules, floor collision and nebula background |
| `3D-collisions-physics-2.ts` | 3D | Interactive character physics with terrain collision and third-person controls |
| `3D-collisions.ts` | 3D | Real-time GPU collision detection between orbital spheres and obstacle box |
| `3D-fractal-bm-terrain.ts` | 3D | Procedural mountainous terrain generated with Fractal Brownian Motion and volumetric fog |
| `3D-fractal-mandelbulb.ts` | 3D | 3D Mandelbulb fractal rendered with iterative spherical coordinates |
| `3D-fractal-trees.ts` | 3D | Infinite recursive 3D fractal branching tree structure |
| `3D-fractal-world.ts` | 3D | Infinite folding space fractal world with Lambertian shading |
| `3D-modeling.ts` | 3D | Smooth-unioned geometric primitives forming an avatar with Blinn-Phong lighting |
| `3D-morphology-abstract.ts` | 3D | Abstract morphing geometry with smooth boolean subtractions |
| `3D-morphology.ts` | 3D | Morphing interpolation between torus and box shapes |
| `3D-periodic-surface-beat.ts` | 3D | Periodic triply minimal surface animated with rhythmic BPM timing |
| `3D-periodic-surface.ts` | 3D | Infinite repeating mathematical periodic gyroid/Schwarz minimal surface |
| `3D-simplex-noise-ocean-fft.ts` | 3D | Audio-reactive ocean surface with starry sky and moon reflection |
| `3D-simplex-noise-ocean.ts` | 3D | Layered 3D simplex noise ocean waves with specular lighting |
| `3D-simplex-noise-terrain.ts` | 3D | Endless undulating landscape with carved dynamic light capsule |

---

## Previous Generation: Tina

ReTina is the WebGPU successor to **[Tina](https://moloxe.github.io/tina/)**, which was built on WebGL and p5.js. ReTina delivers higher frame rates, direct compute shaders, enhanced sphere tracing, and native TypeScript architecture without third-party runtime dependencies.

---

## Local Development

```bash
# Install dependencies
bun install

# Start local dev server
bun dev

# Build production assets
bun build
```

---

## License

All content and sketches are licensed under [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/).
