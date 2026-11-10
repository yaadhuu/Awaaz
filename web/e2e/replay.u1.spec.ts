import { test, expect } from '@playwright/test'

for (const width of [320, 390, 768, 1280, 1920]) {
  test(`Awaaz story fits ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 })
    await page.goto('/')
    await expect(page.getByRole('heading', { level: 1, name: /Every voice deserves to reach/ })).toBeVisible()
    await page.evaluate(() => document.fonts.ready)
    for (const selector of ['.aw-hero', '.aw-intro', '.aw-journey', '.aw-verification', '.aw-radio-section', '.aw-languages', '.aw-final', '.aw-evidence']) {
      await page.locator(selector).scrollIntoViewIfNeeded()
      expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1)
    }
    await page.screenshot({ path: `test-results/awaaz-${width}-end.png` })
  })
}

test('public actions reach the demo, method and evidence', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('link', { name: 'Try Awaaz', exact: true }).last().click()
  await expect(page).toHaveURL(/#\/try/)
  await expect(page.getByRole('heading', { level: 1, name: /Your voice, under pressure/ })).toBeVisible()
  await page.getByRole('link', { name: 'Behind the signal' }).click()
  await expect(page.getByRole('heading', { level: 1, name: 'Results' })).toBeVisible()
  await page.goto('/#/how')
  await expect(page.getByRole('heading', { name: 'How Awaaz Works' })).toBeVisible()
})

test('skip link focuses content without changing the hash route', async ({ page }) => {
  await page.goto('/')
  await page.keyboard.press('Tab')
  await page.getByRole('link', { name: 'Skip to content' }).press('Enter')
  await expect(page.locator('main')).toBeFocused()
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Every voice')
  expect(new URL(page.url()).hash).not.toBe('#main')
})

test('Lenis and scroll-linked signal transforms respond to story progress', async ({ page }) => {
  await page.goto('/')
  await expect(page.locator('html')).toHaveClass(/lenis/)
  const packet = page.locator('.aw-travelling-signal rect').first()
  const before = await packet.evaluate((el) => getComputedStyle(el).transform)
  await page.locator('.aw-journey').evaluate((el) => window.scrollTo({ top: el.getBoundingClientRect().top + scrollY + (el.clientHeight - innerHeight) * .75, behavior: 'instant' }))
  await expect.poll(() => packet.evaluate((el) => getComputedStyle(el).transform)).not.toBe(before)
})

test('connection control changes the playable channel sample and measured payloads', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(e.message))
  await page.goto('/')
  const control = page.getByRole('slider', { name: 'Simulated packet loss' })
  await control.scrollIntoViewIfNeeded()
  await page.getByText('Inspect the saved payloads', { exact: false }).click()
  await expect(page.getByRole('button', { name: /^Key facts/ })).toBeVisible()
  await control.fill('20')
  await expect(page.locator('.aw-console audio')).toHaveAttribute('src', /A20\.mp3$/)
  await page.getByRole('button', { name: /^Transcript/ }).click()
  await expect(page.locator('.aw-fact-result')).toContainText('Aluva')
  await page.getByRole('button', { name: 'हिन्दी', exact: true }).click()
  await expect(page.locator('.aw-console blockquote')).toHaveAttribute('lang', 'hi')
  await expect(page.locator('.aw-console blockquote')).not.toContainText('Flood warning')
  await expect(page.locator('.aw-console audio')).toHaveAttribute('src', /workspace-medical-hi_A20\.mp3$/)
  expect(errors).toEqual([])
})

test('read-back detects a changed number and recovers', async ({ page }) => {
  await page.goto('/')
  const result = page.locator('.aw-check-result')
  await page.getByRole('button', { name: 'What if a number changes?' }).click()
  await expect(result).toContainText('One number changed')
  await expect(result).toContainText('Sent: 35 people. Read back: 53 people.')
  await page.getByRole('button', { name: 'Restore the original number' }).click()
  await expect(result).toContainText('The key facts match.')
})

test('radio reference is opt-in, playable, and credited', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Listen to a real radio exchange' }).click()
  await expect(page.getByRole('link', { name: 'Source & licence' })).toHaveAttribute('href', /Ham_Contest_Exchange/)
  const play = page.getByRole('button', { name: 'Play amateur-radio exchange' })
  await play.click()
  await expect(page.getByRole('button', { name: 'Pause amateur-radio exchange' })).toBeVisible()
  await expect.poll(() => page.locator('#aw-radio-reference audio').evaluate((a) => (a as HTMLAudioElement).duration)).toBeGreaterThan(20)
  await page.getByRole('button', { name: 'Close the recording' }).click()
  await expect(page.locator('#aw-radio-reference audio')).toHaveCount(0)
})

test('saved-data failure offers retry without losing the story', async ({ page }) => {
  await page.route('**/data/story-examples.json', (r) => r.fulfill({ status: 503, body: '{}' }))
  await page.goto('/')
  await expect(page.getByRole('button', { name: 'Retry example' })).toBeVisible()
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  await page.unroute('**/data/story-examples.json')
  await page.getByRole('button', { name: 'Retry example' }).click()
  await expect(page.locator('.aw-console blockquote')).toContainText('35 people need medical help')
})

test('reduced motion retains content and keyboard controls', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/')
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  const loss = page.getByRole('slider', { name: 'Simulated packet loss' })
  await loss.focus()
  await page.keyboard.press('Home')
  await expect(loss).toHaveValue('0')
  await page.keyboard.press('ArrowRight')
  await expect(loss).toHaveValue('10')
  const animations = await page.evaluate(() => document.getAnimations().filter((a) => a.playState === 'running' && Number(a.effect?.getTiming().duration) > 20).length)
  expect(animations).toBe(0)
})

test('ten-language text and enlarged headings remain inside their containers', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/')
  const samples = [
    ['en', 'Flood warning for Wayanad. Water level will reach 5 metres by 7 pm.'],
    ['hi', 'वायनाड के लिए बाढ़ की चेतावनी। जलस्तर शाम सात बजे तक पाँच मीटर होगा।'],
    ['ml', 'വയനാട് പ്രദേശത്ത് വെള്ളപ്പൊക്ക മുന്നറിയിപ്പ്. വൈകുന്നേരം ഏഴ് മണിയോടെ ജലനിരപ്പ് ഉയരും.'],
    ['bn', 'সতর্কবার্তা। জরুরি তথ্য মনোযোগ দিয়ে শুনুন এবং নিশ্চিত করুন।'],
    ['gu', 'ચેતવણી. મહત્વની માહિતી ધ્યાનથી સાંભળો અને ખાતરી કરો.'],
    ['kn', 'ಎಚ್ಚರಿಕೆ. ಪ್ರಮುಖ ಮಾಹಿತಿಯನ್ನು ಗಮನದಿಂದ ಕೇಳಿ ಮತ್ತು ಖಚಿತಪಡಿಸಿ.'],
    ['mr', 'इशारा. महत्त्वाची माहिती काळजीपूर्वक ऐका आणि खात्री करा.'],
    ['pa', 'ਚੇਤਾਵਨੀ। ਮਹੱਤਵਪੂਰਨ ਜਾਣਕਾਰੀ ਧਿਆਨ ਨਾਲ ਸੁਣੋ ਅਤੇ ਪੁਸ਼ਟੀ ਕਰੋ।'],
    ['ta', 'எச்சரிக்கை. முக்கியமான தகவலை கவனமாகக் கேட்டு உறுதிப்படுத்தவும்.'],
    ['te', 'హెచ్చరిక. ముఖ్యమైన సమాచారాన్ని జాగ్రత్తగా విని నిర్ధారించండి.'],
  ]
  await page.locator('.aw-console blockquote').scrollIntoViewIfNeeded()
  await expect(page.locator('.aw-console blockquote')).toContainText('Aluva')
  for (const [lang, text] of samples) {
    // Typography-only stress test; not a claim of recognition/parser coverage.
    const fits = await page.locator('.aw-console blockquote').evaluate((el, value) => {
      el.setAttribute('lang', value.lang)
      el.textContent = value.text
      return el.scrollWidth <= el.clientWidth + 1 && el.scrollHeight <= el.clientHeight + 1
    }, { lang, text })
    expect(fits, `${lang} text overflow`).toBe(true)
  }
  await page.evaluate(() => { document.documentElement.style.fontSize = '200%' })
  expect(await page.locator('h1').evaluate((el) => el.scrollWidth <= el.clientWidth + 1)).toBe(true)
})
