// @ts-check
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'astro/config'
import preact from '@astrojs/preact'
import { build as viteBuild } from 'vite'

// https://astro.build/config
export default defineConfig({
  build: {
    assetsPrefix: '/re-tina',
  },
  vite: {
    plugins: [tailwindcss(), reTinaLibPlugin()],
  },
  integrations: [preact({ compat: true })],
  devToolbar: {
    enabled: false,
  },
})

function reTinaLibPlugin() {
  const virtualModuleId = 'virtual:re-tina-code'
  const resolvedVirtualModuleId = '\0' + virtualModuleId
  return {
    name: 'vite-plugin-retina-lib',
    /**
     * @param {string} id
     */
    resolveId(id) {
      if (id === virtualModuleId) {
        return resolvedVirtualModuleId
      }
    },
    /**
     * @param {string} id
     */
    async load(id) {
      if (id === resolvedVirtualModuleId) {
        const result = await viteBuild({
          build: {
            lib: {
              entry: './src/pages/_lib/index.ts',
              formats: ['es'],
              fileName: 'lib',
            },
            write: false,
            minify: true,
          },
          configFile: false,
        })
        // @ts-ignore - El output de Vite build lib es un array
        const code = result[0].output[0].code
        return `export default ${JSON.stringify(code)};`
      }
    },
  }
}
