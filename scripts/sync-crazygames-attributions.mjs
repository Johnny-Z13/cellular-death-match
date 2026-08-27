import { createHash } from 'node:crypto'
import { access, mkdir, readFile, readdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'

const projectRoot = process.cwd()
const registryPath = 'docs/publishing/evidence/crazygames-asset-attributions.json'
const reportPath = 'docs/publishing/evidence/crazygames-asset-attributions.generated.json'
const rightsInventoryPath = 'docs/publishing/evidence/crazygames-v1-rights-provenance.md'
const publicCreditsPath = 'public/ASSET_CREDITS.txt'
const markerStart = '<!-- BEGIN GENERATED CRAZYGAMES ASSET ATTRIBUTIONS -->'
const markerEnd = '<!-- END GENERATED CRAZYGAMES ASSET ATTRIBUTIONS -->'
const writeMode = process.argv.includes('--write')
const checkMode = process.argv.includes('--check')

if (writeMode === checkMode) {
  console.error('Use exactly one mode: --write or --check')
  process.exit(1)
}

const mediaKinds = new Map([
  ['.aac', 'audio'], ['.avif', 'image'], ['.flac', 'audio'],
  ['.gif', 'image'], ['.jpeg', 'image'], ['.jpg', 'image'],
  ['.m4a', 'audio'], ['.mov', 'video'], ['.mp3', 'audio'],
  ['.mp4', 'video'], ['.ogg', 'audio'], ['.png', 'image'],
  ['.svg', 'image'], ['.wav', 'audio'], ['.webm', 'video'],
  ['.webp', 'image'],
])

const validStatuses = new Set([
  'blocked', 'cleared', 'provider-declared', 'review-required',
])

const statusLabels = {
  blocked: 'Blocked',
  cleared: 'Cleared',
  'provider-declared': 'Provider route declared; evidence and approval pending',
  'review-required': 'Source, originality, or approval review required',
  'changed-unreviewed': 'Changed bytes; provenance review required',
  missing: 'Registered file missing; update the register',
  unregistered: 'Unregistered; release blocking',
}

function normalisePath(filePath) {
  return filePath.split(path.sep).join('/')
}

function sha256(buffer) {
  return createHash('sha256').update(buffer).digest('hex')
}

function escapeMarkdown(value) {
  return String(value).replaceAll('|', '\\|').replaceAll('\n', ' ')
}

async function pathExists(filePath) {
  try {
    await access(filePath)
    return true
  } catch {
    return false
  }
}

async function listMediaFiles(directory, root = projectRoot) {
  if (!await pathExists(directory)) return []
  const entries = await readdir(directory, { withFileTypes: true })
  const files = []
  for (const entry of entries) {
    const absolutePath = path.join(directory, entry.name)
    if (entry.isDirectory()) {
      files.push(...await listMediaFiles(absolutePath, root))
      continue
    }
    if (!entry.isFile()) continue
    const kind = mediaKinds.get(path.extname(entry.name).toLowerCase())
    if (!kind) continue
    files.push({ path: normalisePath(path.relative(root, absolutePath)), kind })
  }
  return files
}

function validateRegistry(registry) {
  const errors = []
  if (registry.schemaVersion !== 1) errors.push('registry schemaVersion must be 1')
  if (!Array.isArray(registry.scanRoots) || registry.scanRoots.length === 0) {
    errors.push('registry scanRoots must be a non-empty array')
  }
  if (!Array.isArray(registry.assets)) errors.push('registry assets must be an array')

  const seen = new Set()
  for (const [index, asset] of (registry.assets ?? []).entries()) {
    const prefix = `assets[${index}]`
    for (const field of ['path', 'kind', 'sha256', 'status', 'creator', 'provider', 'credit', 'terms', 'evidence']) {
      if (typeof asset[field] !== 'string' || !asset[field].trim()) {
        errors.push(`${prefix}.${field} must be a non-empty string`)
      }
    }
    if (seen.has(asset.path)) errors.push(`${prefix}.path duplicates ${asset.path}`)
    seen.add(asset.path)
    if (!/^[a-f0-9]{64}$/.test(asset.sha256 ?? '')) {
      errors.push(`${prefix}.sha256 must be a lowercase SHA-256 digest`)
    }
    if (!validStatuses.has(asset.status)) {
      errors.push(`${prefix}.status "${asset.status}" is unsupported`)
    }
    const inferredKind = mediaKinds.get(path.extname(asset.path ?? '').toLowerCase())
    if (inferredKind && asset.kind !== inferredKind) {
      errors.push(`${prefix}.kind "${asset.kind}" does not match ${inferredKind}`)
    }
  }
  if (errors.length) throw new Error(errors.join('\n'))
}

async function evaluateAssets(registry) {
  const observedFiles = (await Promise.all(
    registry.scanRoots.map((root) => listMediaFiles(path.resolve(projectRoot, root))),
  )).flat().sort((a, b) => a.path.localeCompare(b.path))
  const registryByPath = new Map(registry.assets.map((asset) => [asset.path, asset]))
  const observedPaths = new Set(observedFiles.map((asset) => asset.path))
  const evaluated = []

  for (const observed of observedFiles) {
    const bytes = await readFile(path.resolve(projectRoot, observed.path))
    const digest = sha256(bytes)
    const declaration = registryByPath.get(observed.path)
    if (!declaration) {
      evaluated.push({
        path: observed.path, kind: observed.kind, bytes: bytes.byteLength,
        sha256: digest, expectedSha256: null, integrity: 'unregistered',
        declaredStatus: null, effectiveStatus: 'unregistered',
        creator: 'Unregistered', provider: 'Unregistered',
        credit: 'No attribution record exists yet.',
        terms: 'Release blocked until this asset is registered and reviewed.',
        evidence: registryPath,
      })
      continue
    }
    const matches = declaration.sha256 === digest
    evaluated.push({
      ...declaration,
      bytes: bytes.byteLength,
      expectedSha256: declaration.sha256,
      sha256: digest,
      integrity: matches ? 'matched' : 'changed',
      declaredStatus: declaration.status,
      effectiveStatus: matches ? declaration.status : 'changed-unreviewed',
    })
  }

  for (const declaration of registry.assets) {
    if (observedPaths.has(declaration.path)) continue
    evaluated.push({
      ...declaration, bytes: null, expectedSha256: declaration.sha256,
      sha256: null, integrity: 'missing', declaredStatus: declaration.status,
      effectiveStatus: 'missing',
    })
  }
  return evaluated.sort((a, b) => a.path.localeCompare(b.path))
}

function summarise(assets) {
  const statusCounts = {}
  const integrityCounts = {}
  for (const asset of assets) {
    statusCounts[asset.effectiveStatus] = (statusCounts[asset.effectiveStatus] ?? 0) + 1
    integrityCounts[asset.integrity] = (integrityCounts[asset.integrity] ?? 0) + 1
  }
  const observed = assets.filter((asset) => asset.integrity !== 'missing')
  const releaseBlockers = assets
    .filter((asset) => asset.effectiveStatus !== 'cleared')
    .map((asset) => ({
      path: asset.path,
      status: asset.effectiveStatus,
      reason: statusLabels[asset.effectiveStatus],
    }))
  return {
    registeredAssets: assets.filter((asset) => asset.integrity !== 'unregistered').length,
    observedAssets: observed.length,
    releaseClearedAssets: observed.filter((asset) => asset.effectiveStatus === 'cleared').length,
    statusCounts,
    integrityCounts,
    releaseReady: releaseBlockers.length === 0,
    releaseBlockers,
  }
}

function renderRightsBlock(report) {
  const lines = [
    markerStart,
    '',
    '_Generated by `npm run credits:crazygames`. Do not edit this block by hand._',
    '',
    `- Declaration register: \`${registryPath}\``,
    `- Observed distributable media: **${report.summary.observedAssets}**`,
    `- Digest-matched records: **${report.summary.integrityCounts.matched ?? 0}**`,
    `- Release-cleared media: **${report.summary.releaseClearedAssets}**`,
    `- Release blockers or pending approvals: **${report.summary.releaseBlockers.length}**`,
    '',
    '| Asset | Current SHA-256 | Type | Creator / provider | Evidence and terms | Release status |',
    '| --- | --- | --- | --- | --- | --- |',
  ]
  for (const asset of report.assets) {
    const digest = asset.sha256 ? `\`${asset.sha256}\`` : '—'
    lines.push(
      `| \`${escapeMarkdown(asset.path)}\` | ${digest} | ${escapeMarkdown(asset.kind)} | ` +
      `${escapeMarkdown(asset.creator)} / ${escapeMarkdown(asset.provider)} | ` +
      `${escapeMarkdown(`${asset.evidence}; ${asset.terms}`)} | ` +
      `**${escapeMarkdown(statusLabels[asset.effectiveStatus])}** |`,
    )
  }
  lines.push('', markerEnd)
  return lines.join('\n')
}

function renderPublicCredits(report) {
  const lines = [
    'Cellular Death Match - Asset Credits and Attribution Register',
    '',
    'Generated from the repository provenance register. It covers bundled media.',
    'Provider names are included for transparency and do not imply endorsement.',
    '',
  ]
  for (const asset of report.assets.filter((item) => item.integrity !== 'missing')) {
    lines.push(
      asset.path,
      `  Credit: ${asset.credit}`,
      `  Provider: ${asset.provider}`,
      `  Terms/evidence: ${asset.terms} ${asset.evidence}`,
      `  Release status: ${statusLabels[asset.effectiveStatus]}`,
      `  SHA-256: ${asset.sha256}`,
      '',
    )
  }
  return `${lines.join('\n').trimEnd()}\n`
}

function replaceGeneratedBlock(document, block) {
  const start = document.indexOf(markerStart)
  const end = document.indexOf(markerEnd)
  if (start === -1 || end === -1 || end < start) {
    throw new Error(`Missing generated attribution markers in ${rightsInventoryPath}`)
  }
  return `${document.slice(0, start)}${block}${document.slice(end + markerEnd.length)}`
}

async function readOrEmpty(filePath) {
  try {
    return await readFile(path.resolve(projectRoot, filePath), 'utf8')
  } catch (error) {
    if (error.code === 'ENOENT') return ''
    throw error
  }
}

async function writeOutput(filePath, content) {
  const absolutePath = path.resolve(projectRoot, filePath)
  await mkdir(path.dirname(absolutePath), { recursive: true })
  await writeFile(absolutePath, content, 'utf8')
}

const registryText = await readFile(path.resolve(projectRoot, registryPath), 'utf8')
const registry = JSON.parse(registryText)
validateRegistry(registry)
const assets = await evaluateAssets(registry)
const summary = summarise(assets)
const report = {
  schemaVersion: 1,
  registry: registryPath,
  registrySha256: sha256(Buffer.from(registryText)),
  scanRoots: registry.scanRoots,
  summary,
  assets,
}
const reportText = `${JSON.stringify(report, null, 2)}\n`
const publicCredits = renderPublicCredits(report)
const currentRightsInventory = await readFile(path.resolve(projectRoot, rightsInventoryPath), 'utf8')
const rightsInventory = replaceGeneratedBlock(currentRightsInventory, renderRightsBlock(report))
const expectedOutputs = new Map([
  [reportPath, reportText],
  [publicCreditsPath, publicCredits],
  [rightsInventoryPath, rightsInventory],
])
const staleOutputs = []
for (const [filePath, expected] of expectedOutputs) {
  const actual = await readOrEmpty(filePath)
  if (actual !== expected) staleOutputs.push(filePath)
}

if (writeMode) {
  for (const [filePath, content] of expectedOutputs) await writeOutput(filePath, content)
} else if (staleOutputs.length) {
  console.error(
    `CrazyGames attribution outputs are stale:\n${staleOutputs.map((item) => `- ${item}`).join('\n')}\n` +
    'Run npm run credits:crazygames and review the result.',
  )
  process.exit(1)
}

const integrityIssues = assets.filter((asset) => asset.integrity !== 'matched')
if (integrityIssues.length) {
  console.error(
    `CrazyGames attribution integrity failed:\n${integrityIssues.map((asset) =>
      `- ${asset.path}: ${statusLabels[asset.effectiveStatus]}`
    ).join('\n')}\nUpdate the declaration register and its evidence before release work continues.`,
  )
  process.exit(1)
}

console.log(JSON.stringify({
  ok: true,
  mode: writeMode ? 'write' : 'check',
  observedAssets: summary.observedAssets,
  digestMatched: summary.integrityCounts.matched ?? 0,
  releaseReady: summary.releaseReady,
  releaseBlockers: summary.releaseBlockers.length,
  outputsUpdated: writeMode ? staleOutputs : [],
}, null, 2))
