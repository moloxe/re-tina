type RTComputeBufferMeta = {
  name: string
  wgslType: 'f32' | 'u32' | 'i32'
  readOnly: boolean
}

type Props = {
  buffers: RTComputeBufferMeta[]
  main: string
  functions?: string
  workgroupSize: number
}

function parseComputeShader({
  buffers,
  main,
  functions,
  workgroupSize,
}: Props) {
  // 1. Constants (subset of common.wgsl, standalone — no uniforms/textures)
  const constants = /* wgsl */ `
    const PI     = f32(3.1415926535897932384626433832795);
    const TWO_PI = f32(6.283185307179586476925286766559);
    const E      = f32(2.71828182845904523536028747135266);
    const INF    = f32(1e10);
  `

  // 2. Auto-generated bindings
  const bindings = buffers
    .map((b, i) => {
      const access = b.readOnly ? 'read' : 'read_write'
      return `@group(0) @binding(${i}) var<storage, ${access}> ${b.name}: array<${b.wgslType}>;`
    })
    .join('\n')

  // 3. Custom functions
  const fnBlock = functions ?? ''

  // 4. Entry point wrapping user's main body
  const entryPoint = /* wgsl */ `
@compute @workgroup_size(${workgroupSize})
fn main(@builtin(global_invocation_id) gid: vec3<u32>) {
${main}
}
`

  return [constants, bindings, fnBlock, entryPoint].join('\n')
}

export default parseComputeShader
