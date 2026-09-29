#!/usr/bin/env node
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const fixture = fileURLToPath(new URL('./codex-readiness-fixture.ts', import.meta.url))
const result = spawnSync('npx', ['--yes', 'tsx', fixture], { stdio: 'inherit' })
if (result.error) {
  console.error(result.error.message)
  process.exit(1)
}
process.exit(result.status ?? 1)
