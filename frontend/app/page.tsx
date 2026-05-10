import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      {/* Navigation */}
      <nav className="border-b border-purple-900/30 sticky top-0 z-50 backdrop-blur-md bg-black/50">
        <div className="container mx-auto flex items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center gap-2 group">
            <div className="w-7 h-7 bg-gradient-to-br from-purple-500 to-pink-500 rounded-sm"></div>
            <span className="text-lg font-bold tracking-wider font-space-grotesk">SONICLAB</span>
          </Link>
          <div className="flex gap-2">
            <Link href="/info">
              <Button variant="ghost" className="text-white/70 hover:text-white text-sm font-medium">
                Features
              </Button>
            </Link>
            <Link href="/login">
              <Button size="sm" className="bg-purple-600 hover:bg-purple-700 text-white font-medium">
                Sign In
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <div className="flex-1 flex items-center justify-center px-6 py-20 border-b border-purple-900/20">
        <div className="max-w-4xl w-full space-y-8">
          <div className="space-y-6">
            <div className="inline-block">
              <div className="text-xs font-mono text-purple-400 tracking-widest uppercase">Next-gen audio tech</div>
            </div>
            <h1 className="text-6xl md:text-7xl font-bold tracking-tight leading-tight font-space-grotesk">
              Sonic <span className="bg-gradient-to-r from-purple-400 via-pink-400 to-purple-400 bg-clip-text text-transparent">Intelligence</span>
            </h1>
            <p className="text-lg text-white/60 max-w-2xl font-light">
              Real-time audio analysis and visualization engine. Spectral processing, mood detection, and 60+ metrics in one minimal platform.
            </p>
          </div>

          <div className="flex flex-wrap gap-3 pt-6">
            <Link href="/register">
              <Button size="lg" className="bg-white text-black hover:bg-white/90 font-semibold">
                Start Free
              </Button>
            </Link>
            <Link href="/info">
              <Button size="lg" variant="outline" className="border-purple-600/50 text-white hover:bg-purple-600/10 font-semibold">
                Learn More
              </Button>
            </Link>
          </div>

          {/* Metrics */}
          <div className="grid grid-cols-3 gap-8 pt-16 border-t border-purple-900/20">
            <div>
              <div className="text-3xl font-bold text-purple-400">5</div>
              <p className="text-sm text-white/50 mt-1">Visualization Modes</p>
            </div>
            <div>
              <div className="text-3xl font-bold text-purple-400">60+</div>
              <p className="text-sm text-white/50 mt-1">Real-Time DSP Metrics</p>
            </div>
            <div>
              <div className="text-3xl font-bold text-purple-400">∞</div>
              <p className="text-sm text-white/50 mt-1">Live Analysis</p>
            </div>
          </div>
        </div>
      </div>

      {/* Feature Preview */}
      <div className="px-6 py-20 border-b border-purple-900/20">
        <div className="container mx-auto">
          <div className="mb-16">
            <h2 className="text-4xl font-bold font-space-grotesk tracking-tight">What's Included</h2>
            <div className="h-1 w-12 bg-gradient-to-r from-purple-500 to-pink-500 mt-4"></div>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {[
              { name: "Spectrogram", tech: "Time-Frequency Analysis", desc: "Continuous frequency heatmap. Shows how frequencies change over time - the key to understanding audio evolution." },
              { name: "Spectrum Analyzer", tech: "FFT Magnitude Display", desc: "Breaks audio into frequency bands. See which frequencies are loud and which are quiet right now." },
              { name: "Chromagram", tech: "Pitch Class Detection", desc: "Maps all frequencies to 12 musical notes. Identifies which notes are most prominent in the audio." },
              { name: "Peak Constellation", tech: "Spectral Peak Tracking", desc: "Tracks the 24 strongest frequency peaks. Useful for identifying harmonics and overtones in instruments." },
              { name: "FFT Graph", tech: "Frequency Domain Visualization", desc: "Smooth curve showing the exact frequency spectrum. Better for seeing the overall shape of sound frequencies." },
              { name: "BPM Detection", tech: "Beat Tracking Algorithm", desc: "Estimates tempo in beats per minute. Analyzes energy changes to find the rhythm." },
              { name: "Spectral Centroid", tech: "Brightness Measurement", desc: "Calculates the weighted average frequency. High values = bright sound, low values = dark sound." },
              { name: "Zero-Crossing Rate", tech: "Signal Noisiness", desc: "Counts how often the waveform crosses zero. High ZCR indicates noise or unvoiced speech; low = pitch." },
              { name: "Energy & Dynamics", tech: "Loudness Analysis", desc: "Measures audio intensity and how much it varies. Tracks peaks and dynamic range for compression suggestions." },
              { name: "Mood Detection", tech: "Emotion Classification", desc: "Combines multiple metrics to classify audio mood. Happy = bright, energetic. Sad = dark, smooth." },
              { name: "Audio Type Classification", tech: "Signal Categorization", desc: "Detects if audio is music, speech, or noise. Uses spectral and temporal characteristics." },
              { name: "Session History", tech: "Data Persistence", desc: "All analysis results automatically saved. Track trends in your audio analysis over time with full metadata." },
            ].map((feature, i) => (
              <div key={i} className="group rounded-lg border border-purple-900/30 hover:border-purple-600/50 bg-white/[0.02] hover:bg-white/[0.05] p-5 transition">
                <div className="mb-3 space-y-1">
                  <h3 className="font-semibold text-white group-hover:text-purple-300 transition">{feature.name}</h3>
                  <p className="text-xs text-purple-400 font-mono">{feature.tech}</p>
                </div>
                <p className="text-sm text-white/60 leading-relaxed">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* CTA */}
      <div className="px-6 py-16 text-center space-y-6">
        <h2 className="text-3xl font-bold font-space-grotesk">Begin Your Analysis</h2>
        <p className="text-white/60 max-w-md mx-auto">
          No credit card required. Start analyzing audio in seconds.
        </p>
        <Link href="/register">
          <Button size="lg" className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-semibold">
            Create Account
          </Button>
        </Link>
      </div>

      {/* Footer */}
      <div className="border-t border-purple-900/20 bg-black/50 backdrop-blur">
        <div className="container mx-auto px-6 py-6 text-center text-xs text-white/40">
          <p>© 2026 SonicLab. Minimal. Futuristic. Powerful.</p>
        </div>
      </div>
    </div>
  );
}
