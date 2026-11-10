import { Link } from 'react-router-dom'

export default function HowItWorks() {
  return (
    <div className="max-w-3xl mx-auto py-12 px-6 space-y-12">
      <header className="space-y-3">
        <span className="font-mono text-xs uppercase px-2 py-0.5 border border-rule bg-card">
          METHODOLOGY & HONEST SCOPE
        </span>
        <h1 className="display text-4xl">How Awaaz Works</h1>
        <p className="text-lg text-muted">
          Awaaz explores sending compressed voice, a packed transcript, or recognised critical facts across a simulated weak link.
        </p>
      </header>

      <section className="space-y-4">
        <h2 className="display text-2xl">Three-Tier Architecture</h2>
        <div className="grid md:grid-cols-3 gap-4">
          <div className="p-4 border border-rule bg-card space-y-2">
            <div className="font-mono text-sm text-vermilion font-bold">L0 Nominal (Tier A)</div>
            <p className="text-sm">
              Codec2 2400 bps compressed voice over clean links. Delivers real acoustic speech at ~300 bytes per second.
            </p>
          </div>
          <div className="p-4 border border-rule bg-card space-y-2">
            <div className="font-mono text-sm text-teal font-bold">L1 Degraded (Tier B)</div>
            <p className="text-sm">
              STT transcript packed with domain codebooks and dev-split zstd dictionary. Transmits full text in ~26 bytes.
            </p>
          </div>
          <div className="p-4 border border-rule bg-card space-y-2">
            <div className="font-mono text-sm text-turmeric font-bold">L2 Critical (Tier C)</div>
            <p className="text-sm">
              Recognised places, quantities with units, and times packed into a few bytes. Delivery depends on the simulated loss and retry result; it is never guaranteed.
            </p>
          </div>
        </div>
      </section>

      <section className="space-y-4 border-t border-rule pt-8">
        <h2 className="display text-2xl">Spoken Teach-Back Loop</h2>
        <p className="text-sm leading-relaxed text-muted">
          Awaaz can read facts aloud with Timbre and compare a read-back transcript with the sent facts.
          The landing page demonstrates the comparison locally. The measured teach-back results use saved
          Prisma transcripts as a stand-in for spoken read-back; they do not establish live field reliability.
        </p>
      </section>

      <section className="space-y-4 border-t border-rule pt-8">
        <h2 className="display text-2xl">Honest Scope & Limits</h2>
        <ul className="list-disc pl-5 text-sm space-y-2 text-muted">
          <li><strong>Simulated Link:</strong> Software two-state Gilbert-Elliott loss model at 2, 5, 10 kbps; 0–30% packet loss. No field radio test is claimed.</li>
          <li><strong>Synthetic Speech:</strong> All test speech generated with Gnani Timbre; no real humans recorded.</li>
          <li><strong>Language Badging:</strong> Only en, hi, and ml are claimed as Measured with Wilson intervals. Other languages remain Supported, not tested.</li>
          <li><strong>Extraction coverage:</strong> The current fact lexicons cover English, Hindi and Malayalam and a closed set of places and units. Speech-service language support does not imply equivalent fact-extraction coverage.</li>
        </ul>
      </section>

      <div className="pt-4 flex gap-4">
        <Link to="/try" className="btn no-underline">Try Awaaz</Link>
        <Link to="/inspect" className="btn btn-ghost no-underline">Open Reviewer View</Link>
      </div>
    </div>
  )
}

