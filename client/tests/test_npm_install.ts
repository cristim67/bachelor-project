import { it, expect } from 'vitest'
import { execSync } from 'child_process'

it('unit test: npm install', () => {
  try {
    const output = execSync('npm install', { stdio: 'pipe', encoding: 'utf-8' })

    expect(output).not.toContain('ERR!') 
    expect(output).not.toContain('npm ERR!')
  } catch (error) {
    console.error('npm install failed:', error)
    throw error
  }
})