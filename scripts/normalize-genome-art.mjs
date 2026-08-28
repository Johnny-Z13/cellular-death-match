import { createHash } from 'node:crypto'
import { mkdir, readFile } from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'

const projectRoot = process.cwd()
const sourceFlag = process.argv.indexOf('--source-dir')
if (sourceFlag === -1 || !process.argv[sourceFlag + 1]) {
  throw new Error('Usage: node scripts/normalize-genome-art.mjs --source-dir <raw-image-directory>')
}

const sourceDir = path.resolve(process.argv[sourceFlag + 1])
const manifestPath = path.resolve(projectRoot, 'docs/assets/genomes/generation-manifest.json')
const manifest = JSON.parse(await readFile(manifestPath, 'utf8'))

for (const asset of manifest.assets) {
  const inputPath = path.join(sourceDir, asset.sourceFile)
  const source = await readFile(inputPath)
  const digest = createHash('sha256').update(source).digest('hex')
  if (digest !== asset.sourceSha256) {
    throw new Error(`${asset.id}: source digest ${digest} does not match manifest ${asset.sourceSha256}`)
  }

  const { data, info } = await sharp(source)
    .resize(48, 48, { fit: 'fill', kernel: sharp.kernel.nearest })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })

  const pixels = []
  for (let offset = 0; offset < data.length; offset += info.channels) {
    const rgb = [data[offset], data[offset + 1], data[offset + 2]]
    const max = Math.max(...rgb)
    const min = Math.min(...rgb)
    const saturation = max === 0 ? 0 : (max - min) / max
    const foreground = saturation >= 0.055 || max < 185
    pixels.push({ rgb, max, min, saturation, foreground })
  }

  const coloredValues = pixels
    .filter((pixel) => pixel.foreground && pixel.saturation >= 0.055 && pixel.max >= 80)
    .map((pixel) => pixel.max)
    .sort((a, b) => a - b)
  const darkCut = quantile(coloredValues, 0.24)
  const lightCut = quantile(coloredValues, 0.82)
  const primary = asset.canonicalPrimary
  const dark = primary.map((channel) => Math.round(channel * 0.54))
  const light = primary.map((channel) => Math.round(channel + (255 - channel) * 0.38))
  const pale = primary.map((channel) => Math.round(channel + (255 - channel) * 0.68))
  const ink = [2, 8, 10]
  const output = Buffer.alloc(pixels.length * 4)

  for (let index = 0; index < pixels.length; index++) {
    const pixel = pixels[index]
    const offset = index * 4
    if (!pixel.foreground) {
      output[offset + 3] = 0
      continue
    }

    let mapped
    if (pixel.max < 78 && pixel.min < 54) mapped = ink
    else if (pixel.saturation < 0.055) mapped = pixel.max >= 215 ? pale : ink
    else if (pixel.max <= darkCut) mapped = dark
    else if (pixel.max >= lightCut) mapped = light
    else mapped = primary

    output[offset] = mapped[0]
    output[offset + 1] = mapped[1]
    output[offset + 2] = mapped[2]
    output[offset + 3] = 255
  }

  // The canonical egg/CA color is the identity anchor, not merely one shade
  // in the ramp. Promote the minimum number of pixels needed to make it the
  // strictly dominant visible RGB after normalization.
  makeCanonicalPrimaryDominant(output, primary)

  const outputPath = path.resolve(projectRoot, asset.output)
  await mkdir(path.dirname(outputPath), { recursive: true })
  await sharp(output, { raw: { width: 48, height: 48, channels: 4 } })
    .resize(384, 384, { kernel: sharp.kernel.nearest })
    .png({ compressionLevel: 9, palette: true, colors: 8, dither: 0 })
    .toFile(outputPath)
  process.stdout.write(`${asset.id} -> ${path.relative(projectRoot, outputPath)}\n`)
}

function quantile(values, fraction) {
  if (values.length === 0) return 0
  return values[Math.min(values.length - 1, Math.floor((values.length - 1) * fraction))]
}

function makeCanonicalPrimaryDominant(output, primary) {
  const primaryKey = primary.join(',')
  const counts = new Map()
  for (let offset = 0; offset < output.length; offset += 4) {
    if (output[offset + 3] === 0) continue
    const key = `${output[offset]},${output[offset + 1]},${output[offset + 2]}`
    counts.set(key, (counts.get(key) ?? 0) + 1)
  }
  let primaryCount = counts.get(primaryKey) ?? 0
  const strongestOther = [...counts.entries()]
    .filter(([key]) => key !== primaryKey)
    .sort((a, b) => b[1] - a[1])[0]
  if (!strongestOther || primaryCount > strongestOther[1]) return

  const [otherKey, otherCount] = strongestOther
  let remaining = Math.floor((otherCount - primaryCount) / 2) + 1
  for (let offset = 0; offset < output.length && remaining > 0; offset += 4) {
    if (output[offset + 3] === 0) continue
    const key = `${output[offset]},${output[offset + 1]},${output[offset + 2]}`
    if (key !== otherKey) continue
    output[offset] = primary[0]
    output[offset + 1] = primary[1]
    output[offset + 2] = primary[2]
    primaryCount += 1
    remaining -= 1
  }
}
