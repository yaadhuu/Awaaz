/** Mix synthetic speech with a radio-noise bed in the browser at a signal-to-noise ratio (dB). */

const cache = new Map<string, Promise<AudioBuffer>>()

function load(ctx: AudioContext, url: string): Promise<AudioBuffer> {
  if (!cache.has(url)) {
    cache.set(
      url,
      fetch(url)
        .then((r) => r.arrayBuffer())
        .then((b) => ctx.decodeAudioData(b)),
    )
  }
  return cache.get(url)!
}

export function rms(buf: AudioBuffer): number {
  const d = buf.getChannelData(0)
  let s = 0
  for (let i = 0; i < d.length; i++) s += d[i] * d[i]
  return Math.sqrt(s / Math.max(1, d.length))
}

/** Bed gain so that speech power / noise power equals 10^(snr/10). */
export function bedGain(speechRms: number, bedRms: number, snrDb: number): number {
  if (bedRms <= 0) return 0
  return speechRms / (bedRms * 10 ** (snrDb / 20))
}

let ctx: AudioContext | null = null
let playing: AudioBufferSourceNode[] = []

export function stopMix() {
  playing.forEach((s) => {
    try {
      s.stop()
    } catch {
      // already stopped
    }
  })
  playing = []
}

export async function playMix(speechUrl: string, bedUrl: string | null, snrDb: number, onEnd: () => void) {
  stopMix()
  ctx ??= new AudioContext()
  await ctx.resume()
  const speech = await load(ctx, speechUrl)
  const s = ctx.createBufferSource()
  s.buffer = speech
  s.connect(ctx.destination)
  s.onended = () => {
    stopMix()
    onEnd()
  }
  playing.push(s)
  if (bedUrl) {
    const bed = await load(ctx, bedUrl)
    const b = ctx.createBufferSource()
    b.buffer = bed
    b.loop = true
    const g = ctx.createGain()
    g.gain.value = bedGain(rms(speech), rms(bed), snrDb)
    b.connect(g).connect(ctx.destination)
    b.start()
    playing.push(b)
  }
  s.start()
}
