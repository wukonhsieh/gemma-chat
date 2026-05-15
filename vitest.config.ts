import { defineConfig } from 'vitest/config'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  test: {
    environment: 'node',
    include: ['test/security/**/*.test.ts'],
    testTimeout: 30_000,
    pool: 'threads',
    alias: {
      electron: resolve(__dirname, 'test/__mocks__/electron.ts')
    }
  }
})
