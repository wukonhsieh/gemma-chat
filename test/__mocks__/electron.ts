import os from 'os'
import { join } from 'path'

export const app = {
  getPath: (_name: string): string => join(os.tmpdir(), 'gemma-test-stub')
}
