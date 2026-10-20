import { createHmac } from 'node:crypto'
import { appendFileSync } from 'node:fs'

const id = process.env.REFERRAL_JOB
if (!/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/.test(id || '')) throw new Error('Invalid job ID')
const secret = process.env.REFERRAL_BUILD_CALLBACK_KEY
if (!secret || secret.length < 32) throw new Error('Missing callback key')
const data = { id, action: process.env.REFERRAL_ACTION, run_id: process.env.GITHUB_RUN_ID }
if (data.action === 'report') {
  data.success = process.env.BUILD_RESULT === 'success'
  if (data.success) {
    const response = await fetch(`https://api.github.com/repos/Pan-chongyu/oneyes-desktop-releases/releases/tags/referral-${id}`, {
      headers: { Authorization: `Bearer ${process.env.GH_TOKEN}`, Accept: 'application/vnd.github+json' }, signal: AbortSignal.timeout(20000), redirect: 'error',
    })
    if (!response.ok) throw new Error('Release lookup failed')
    const release = await response.json()
    if (!release.prerelease || release.draft) throw new Error('Referral release must be a published prerelease')
    data.assets = release.assets.map(a => ({ name: a.name, size: a.size, digest: a.digest, url: a.browser_download_url }))
  }
} else if (data.action !== 'claim') throw new Error('Invalid action')

let result
for (let attempt = 0; attempt < 4; attempt++) {
  const timestamp = String(Date.now())
  const signature = createHmac('sha256', secret).update(timestamp + '.' + JSON.stringify(data)).digest('hex')
  try {
    const response = await fetch('https://admin.oneyes.ai/api/build-worker', {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Build-Time': timestamp, 'X-Build-Signature': signature },
      body: JSON.stringify(data), signal: AbortSignal.timeout(25000), redirect: 'error',
    })
    if (!response.ok) throw new Error(`Callback failed (${response.status})`)
    result = await response.json(); break
  } catch (error) {
    if (attempt === 3) throw error
    await new Promise(resolve => setTimeout(resolve, 2000 * 2 ** attempt))
  }
}
if (data.action === 'claim') {
  if (!/^[a-f0-9]{40}$/.test(result.commit || '') || !/^v\d+\.\d+\.\d+$/.test(result.version || '')) throw new Error('Invalid claimed source')
  appendFileSync(process.env.GITHUB_OUTPUT, `commit=${result.commit}\ntag=${result.version}\n`)
}
