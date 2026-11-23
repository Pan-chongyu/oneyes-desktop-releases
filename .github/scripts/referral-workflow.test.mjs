import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'

const workflow = name => readFileSync(new URL(`../workflows/${name}.yml`, import.meta.url), 'utf8')
const personalized = workflow('referral')
function matrix(source) {
  return [...source.matchAll(/- platform: ([\w-]+)\s+os: ([\w.-]+)\s+target: ([^\r\n]+)/g)]
    .map(([,platform,os,target]) => ({ platform, os, target }))
}

test('personalized builds use the same supported native runners as stable releases', () => {
  const expected = matrix(workflow('release'))
  assert.equal(expected.length, 4)
  assert.deepEqual(matrix(personalized), expected)
  assert.doesNotMatch(personalized, /os: macos-14\b/)
})

test('personalized build attempts are bound to both claim and report callbacks', () => {
  assert.match(personalized, /attempt:\s+description:/)
  assert.equal([...personalized.matchAll(/REFERRAL_ATTEMPT: \$\{\{ inputs.attempt \}\}/g)].length, 2)
  for (const value of ['', '0', '-1', '4', 'NaN', '2.1']) {
    const result = spawnSync(process.execPath, [fileURLToPath(new URL('referral-worker.mjs', import.meta.url))], {
      encoding: 'utf8', env: { ...process.env, REFERRAL_JOB: 'a248820b-e4e8-45cb-8876-570b65833f83', REFERRAL_BUILD_CALLBACK_KEY: 'test-key-with-no-production-permissions', REFERRAL_ATTEMPT: value },
    })
    assert.notEqual(result.status, 0)
    assert.match(result.stderr, /Invalid build attempt/)
  }
})

test('personalized installers keep signed platform artifacts and stable OTA isolated', () => {
  assert.match(personalized, /npm run release:assets/)
  assert.match(personalized, /release-signing\.mjs summary/)
  assert.match(personalized, /test "\$\{#files\[@\]\}" -eq 17/)
  assert.match(personalized, /--prerelease --latest=false/)
  assert.match(personalized, /tag="referral-\$REFERRAL_JOB"/)
  assert.doesNotMatch(personalized, /build-update-manifest|build-sparkle-appcast|release create "\$RELEASE_TAG"/)
})
