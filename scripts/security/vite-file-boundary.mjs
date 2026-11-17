import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, mkdir, writeFile, rm, realpath, readFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const lock = JSON.parse(await readFile(join(projectRoot, 'package-lock.json'), 'utf8'))
const vitePaths = Object.keys(lock.packages).filter(path => /(^|\/)node_modules\/vite$/.test(path))
assert.ok(vitePaths.length, 'the lockfile must include Vite')

// Check every installed copy, including dependencies of the test runner.
// Only synthetic files are served; project configuration and env files are disabled.
for (const vitePath of vitePaths) {
  test('Vite filesystem protections: ' + vitePath, async t => {
    const { createServer } = await import(pathToFileURL(join(projectRoot, vitePath, 'dist/node/index.js')))
    const fixture = await realpath(await mkdtemp(join(tmpdir(), 'z13-vite-boundary-')))
    const root = join(fixture, 'project')
    const outside = join(fixture, 'outside-marker.js')
    const decoy = resolve(root, '.' + outside)
    let server
    try {
      await mkdir(root, { recursive: true })
      await writeFile(join(root, 'allowed.txt'), 'ALLOWED_SYNTHETIC_CONTROL')
      await writeFile(join(root, 'assets.js'), 'import raw from "./allowed.txt?raw"; import url from "./allowed.txt?url"; console.log(raw, url)')
      await writeFile(join(root, 'blocked.pem'), 'DENIED_SYNTHETIC_MARKER')
      if (process.platform !== 'win32') {
        await mkdir(dirname(decoy), { recursive: true })
        await writeFile(outside, 'export default "OUTSIDE_SYNTHETIC_MARKER"')
        await writeFile(decoy, 'export default "INSIDE_SYNTHETIC_CONTROL"')
        await writeFile(join(root, 'main.js'), 'import control from ' + JSON.stringify('.' + outside) + '; console.log(control)')
      }
      server = await createServer({
        root, configFile: false, envFile: false, publicDir: false, logLevel: 'silent',
        cacheDir: join(fixture, 'cache'), optimizeDeps: { noDiscovery: true },
        server: { host: '127.0.0.1', port: 0, hmr: false, watch: null, fs: { strict: true, allow: [root] } },
      })
      // Vite 5 treats port 0 as its default port; bind the HTTP server directly
      // to obtain an OS-assigned port without touching another project's server.
      assert.ok(server.httpServer)
      await new Promise((resolve, reject) => {
        server.httpServer.once('error', reject)
        server.httpServer.listen(0, '127.0.0.1', () => {
          server.httpServer.removeListener('error', reject)
          resolve()
        })
      })
      const address = server.httpServer.address()
      assert.ok(address && typeof address !== 'string')
      const origin = 'http://127.0.0.1:' + address.port
      const request = async path => {
        const response = await fetch(origin + path, { signal: AbortSignal.timeout(5000) })
        return { status: response.status, body: await response.text() }
      }
      await t.test('ordinary raw and URL asset imports remain available', async () => {
        const entry = await request('/assets.js')
        assert.equal(entry.status, 200)
        const rawImport = entry.body.match(/import raw from ["']([^"']+)["']/)
        const urlImport = entry.body.match(/import url from ["']([^"']+)["']/)
        assert.ok(rawImport && urlImport)
        const raw = await request(rawImport[1])
        assert.equal(raw.status, 200)
        assert.match(raw.body, /ALLOWED_SYNTHETIC_CONTROL/)
        assert.match(raw.body, /export default/)
        const url = await request(urlImport[1])
        assert.equal(url.status, 200)
        assert.match(url.body, /allowed\.txt/)
      })
      await t.test('denied files stay blocked through query and path aliases', async () => {
        const filePath = join(root, 'blocked.pem').replaceAll('\\', '/')
        for (const path of ['/blocked.pem', '/%62locked.pem', '/@fs/' + filePath.replace(/^\//, '')]) {
          for (const query of ['', '?raw', '?import&raw', '?import&url&inline']) {
            const denied = await request(path + query)
            assert.equal(denied.status, 403, 'denied file must stay blocked: ' + path + query)
            assert.doesNotMatch(denied.body, /DENIED_SYNTHETIC_MARKER/)
          }
        }
      })
      await t.test('imported browser paths cannot authorize outside host files', { skip: process.platform === 'win32' }, async () => {
        const outsideUrl = '/@fs' + encodeURI(outside)
        assert.equal((await request(outsideUrl)).status, 403, 'outside file is initially blocked')
        const entry = await request('/main.js')
        assert.equal(entry.status, 200)
        const imported = entry.body.match(/import control from ["']([^"']+)["']/)
        assert.ok(imported && imported[1].startsWith('/'))
        const control = await request(imported[1])
        assert.equal(control.status, 200)
        assert.match(control.body, /INSIDE_SYNTHETIC_CONTROL/)
        for (const path of [outsideUrl, outsideUrl + '?raw', outsideUrl + '?import&raw', outsideUrl.replace('outside', '%6Futside')]) {
          const denied = await request(path)
          assert.equal(denied.status, 403, 'an in-root import must not authorize a host file')
          assert.doesNotMatch(denied.body, /OUTSIDE_SYNTHETIC_MARKER/)
        }
      })
    } finally {
      await server?.close()
      await rm(fixture, { recursive: true, force: true })
    }
  })
}
