import { defineConfig } from 'vite'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import electron from 'vite-plugin-electron/simple'
import react from '@vitejs/plugin-react'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const isMonitoringMode = mode === 'monitoring'

  return {
    server: {
      host: '0.0.0.0',
      open: isMonitoringMode,
    },
    plugins: [
      react(),
      ...(!isMonitoringMode
        ? [
            electron({
              main: {
                entry: 'electron/main.ts',
              },
              preload: {
                input: path.join(__dirname, 'electron/preload.ts'),
              },
              renderer: {},
            }),
          ]
        : []),
    ],
  }
})
