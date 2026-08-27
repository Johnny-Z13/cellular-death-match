// @ts-expect-error Vitest runs this test in Node; the app tsconfig intentionally omits Node types.
import { createHash } from 'node:crypto'
// @ts-expect-error Vitest runs this test in Node; the app tsconfig intentionally omits Node types.
import { execFileSync } from 'node:child_process'
// @ts-expect-error Vitest runs this test in Node; the app tsconfig intentionally omits Node types.
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const registryPath = 'docs/publishing/evidence/crazygames-asset-attributions.json'
const reportPath = 'docs/publishing/evidence/crazygames-asset-attributions.generated.json'
const rightsPath = 'docs/publishing/evidence/crazygames-v1-rights-provenance.md'
const creditsPath = 'public/ASSET_CREDITS.txt'
const mediaExtensions = new Set([
  '.aac', '.avif', '.flac', '.gif', '.jpeg', '.jpg', '.m4a', '.mov',
  '.mp3', '.mp4', '.ogg', '.png', '.svg', '.wav', '.webm', '.webp',
])

type AssetDeclaration = {
  path: string
  kind: 'audio' | 'image' | 'video'
  sha256: string
  status: 'blocked' | 'cleared' | 'provider-declared' | 'review-required'
  provider: string
  evidence: string
}

type Registry = {
  scanRoots: string[]
  assets: AssetDeclaration[]
}

type Report = {
  summary: {
    observedAssets: number
    releaseReady: boolean
    releaseBlockers: Array<{ path: string }>
  }
  assets: Array<{
    path: string
    sha256: string | null
    expectedSha256: string | null
    integrity: string
  }>
}

type AudioManifest = {
  provider: string
  modelId: string
  outputFormat: string
  generator: string
  terms: string
  assets: Array<{
    file: string
    provider: string
    modelId: string
    outputFormat: string
    prompt: string
    sha256: string
  }>
}

function listMedia(directory: string): string[] {
  if (!existsSync(directory)) return []
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry: {
    name: string
    isDirectory(): boolean
    isFile(): boolean
  }) => {
    const filePath = `${directory}/${entry.name}`
    if (entry.isDirectory()) return listMedia(filePath)
    const extensionIndex = entry.name.lastIndexOf('.')
    const extension = extensionIndex >= 0 ? entry.name.slice(extensionIndex).toLowerCase() : ''
    if (!entry.isFile() || !mediaExtensions.has(extension)) return []
    return [filePath]
  }).sort()
}

function sha256(filePath: string): string {
  return createHash('sha256').update(readFileSync(filePath)).digest('hex')
}

describe('CrazyGames asset provenance', () => {
  it('registers and digest-pins every shipped media file', () => {
    expect(() => execFileSync(
      'node',
      ['scripts/sync-crazygames-attributions.mjs', '--check'],
      { encoding: 'utf8', stdio: 'pipe' },
    )).not.toThrow()

    const registry = JSON.parse(readFileSync(registryPath, 'utf8')) as Registry
    const report = JSON.parse(readFileSync(reportPath, 'utf8')) as Report
    const rights = readFileSync(rightsPath, 'utf8')
    const credits = readFileSync(creditsPath, 'utf8')
    const observed = registry.scanRoots.flatMap(listMedia).sort()

    expect(observed).toHaveLength(37)
    expect(report.summary.observedAssets).toBe(observed.length)
    expect(report.assets.filter((asset) => asset.integrity === 'matched')).toHaveLength(observed.length)

    for (const filePath of observed) {
      const declaration = registry.assets.find((asset) => asset.path === filePath)
      const reported = report.assets.find((asset) => asset.path === filePath)
      expect(declaration, `${filePath} must be declared`).toBeTruthy()
      expect(declaration?.sha256).toBe(sha256(filePath))
      expect(reported?.sha256).toBe(declaration?.sha256)
      expect(reported?.expectedSha256).toBe(declaration?.sha256)
      expect(existsSync(declaration?.evidence ?? '')).toBe(true)
      expect(rights).toContain(`\`${filePath}\``)
      expect(credits).toContain(filePath)
    }
  })

  it('preserves provider, prompt, model and digest evidence for all ElevenLabs sounds', () => {
    const registry = JSON.parse(readFileSync(registryPath, 'utf8')) as Registry
    const manifest = JSON.parse(readFileSync('public/audio/generated/manifest.json', 'utf8')) as AudioManifest
    const audioAssets = registry.assets.filter((asset) => asset.kind === 'audio')

    expect(audioAssets).toHaveLength(21)
    expect(manifest.assets).toHaveLength(21)
    expect(manifest.provider).toBe('ElevenLabs')
    expect(manifest.modelId).toBe('eleven_text_to_sound_v2')
    expect(manifest.outputFormat).toBe('mp3_22050_32')
    expect(manifest.generator).toBe('scripts/generate-audio-assets.mjs')
    expect(manifest.terms).toBe('https://elevenlabs.io/terms-of-use')

    for (const asset of manifest.assets) {
      const filePath = `public${asset.file}`
      const declaration = audioAssets.find((item) => item.path === filePath)
      expect(asset.provider).toBe('ElevenLabs')
      expect(asset.modelId).toBe('eleven_text_to_sound_v2')
      expect(asset.outputFormat).toBe('mp3_22050_32')
      expect(asset.prompt.trim().length).toBeGreaterThan(20)
      expect(asset.sha256).toBe(sha256(filePath))
      expect(declaration?.sha256).toBe(asset.sha256)
      expect(declaration?.status).toBe('provider-declared')
    }
  })

  it('keeps unresolved release decisions explicit', () => {
    const registry = JSON.parse(readFileSync(registryPath, 'utf8')) as Registry
    const report = JSON.parse(readFileSync(reportPath, 'utf8')) as Report
    const nonCleared = registry.assets.filter((asset) => asset.status !== 'cleared')
    const pointer = registry.assets.find((asset) => asset.path === 'public/art/ui/onboarding-pointer.png')

    expect(report.summary.releaseReady).toBe(false)
    expect(report.summary.releaseBlockers).toHaveLength(nonCleared.length)
    expect(pointer?.status).toBe('review-required')
    expect(pointer?.evidence).toBe('docs/publishing/evidence/onboarding-pointer-provenance.md')
  })
})
