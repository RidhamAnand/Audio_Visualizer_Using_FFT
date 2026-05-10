"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function InfoPage() {
  const features = [
    {
      name: "Spectrogram",
      tech: "Time-Frequency Analysis",
      description: "Continuous frequency heatmap. Shows how frequencies change over time - the key to understanding audio evolution."
    },
    {
      name: "Spectrum Analyzer",
      tech: "FFT Magnitude Display",
      description: "Breaks audio into frequency bands. See which frequencies are loud and which are quiet right now."
    },
    {
      name: "Chromagram",
      tech: "Pitch Class Detection",
      description: "Maps all frequencies to 12 musical notes. Identifies which notes are most prominent in the audio."
    },
    {
      name: "Peak Constellation",
      tech: "Spectral Peak Tracking",
      description: "Tracks the 24 strongest frequency peaks. Useful for identifying harmonics and overtones in instruments."
    },
    {
      name: "FFT Graph",
      tech: "Frequency Domain Visualization",
      description: "Smooth curve showing the exact frequency spectrum. Better for seeing the overall shape of sound frequencies."
    },
    {
      name: "BPM Detection",
      tech: "Beat Tracking Algorithm",
      description: "Estimates tempo in beats per minute. Analyzes energy changes to find the rhythm."
    },
    {
      name: "Spectral Centroid",
      tech: "Brightness Measurement",
      description: "Calculates the weighted average frequency. High values = bright sound, low values = dark sound."
    },
    {
      name: "Zero-Crossing Rate",
      tech: "Signal Noisiness",
      description: "Counts how often the waveform crosses zero. High ZCR indicates noise or unvoiced speech; low = pitch."
    },
    {
      name: "Energy & Dynamics",
      tech: "Loudness Analysis",
      description: "Measures audio intensity and how much it varies. Tracks peaks and dynamic range for compression suggestions."
    },
    {
      name: "Mood Detection",
      tech: "Emotion Classification",
      description: "Combines multiple metrics to classify audio mood. Happy = bright, energetic. Sad = dark, smooth."
    },
    {
      name: "Audio Type Classification",
      tech: "Signal Categorization",
      description: "Detects if audio is music, speech, or noise. Uses spectral and temporal characteristics."
    },
    {
      name: "Session History",
      tech: "Data Persistence",
      description: "All analysis results automatically saved. Track trends in your audio analysis over time with full metadata."
    },
  ];

  return (
    <div className="min-h-screen bg-black">
      {/* Navigation */}
      <nav className="border-b border-purple-900/30 sticky top-0 z-50 backdrop-blur-md bg-black/50">
        <div className="container mx-auto flex items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center gap-2 group">
            <div className="w-7 h-7 bg-gradient-to-br from-purple-500 to-pink-500 rounded-sm"></div>
            <span className="text-lg font-bold tracking-wider font-space-grotesk">SONICLAB</span>
          </Link>
          <div className="flex gap-2">
            <Link href="/">
              <Button variant="ghost" className="text-white/70 hover:text-white text-sm font-medium">
                Home
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

      {/* Header */}
      <div className="container mx-auto px-6 py-16 border-b border-purple-900/20">
        <div className="max-w-3xl space-y-4">
          <h1 className="text-5xl font-bold font-space-grotesk tracking-tight">Features & Technology</h1>
          <p className="text-lg text-white/60">What each visualization does and how it works</p>
          <div className="h-1 w-12 bg-gradient-to-r from-purple-500 to-pink-500 mt-6"></div>
        </div>
      </div>

      {/* Features Grid */}
      <div className="container mx-auto px-6 py-16">
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {features.map((feature, idx) => (
            <div
              key={idx}
              className="group rounded-lg border border-purple-900/30 hover:border-purple-600/50 bg-white/[0.02] hover:bg-white/[0.05] p-6 transition"
            >
              <div className="mb-3 space-y-1">
                <h3 className="font-semibold text-white group-hover:text-purple-300 transition">{feature.name}</h3>
                <p className="text-xs text-purple-400 font-mono">{feature.tech}</p>
              </div>
              <p className="text-sm text-white/60 leading-relaxed">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>

      {/* How It Works */}
      <div className="container mx-auto px-6 py-16 border-t border-purple-900/20">
        <h2 className="text-3xl font-bold font-space-grotesk mb-12">How To Use</h2>
        <div className="space-y-5 max-w-3xl">
          {[
            {
              num: "01",
              title: "Create Account",
              desc: "Sign up to save preferences and session history."
            },
            {
              num: "02",
              title: "Choose Input Source",
              desc: "Select live microphone or upload an audio file (MP3/WAV)."
            },
            {
              num: "03",
              title: "Pick Visualization Mode",
              desc: "Choose one of 5 modes: spectrogram, bars, chromagram, constellation, or FFT graph."
            },
            {
              num: "04",
              title: "Start Analysis",
              desc: "Press play. Watch real-time visualization and 60+ metrics update as audio plays."
            },
            {
              num: "05",
              title: "End & Review",
              desc: "Stop when finished. All session data (BPM, mood, energy, peaks) saves automatically."
            },
          ].map((step, i) => (
            <div key={i} className="flex gap-6 group">
              <div className="flex-shrink-0">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg border border-purple-600/50 bg-purple-600/10 group-hover:bg-purple-600/20 transition">
                  <span className="text-sm font-bold text-purple-400">{step.num}</span>
                </div>
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-white mb-1 group-hover:text-purple-300 transition">{step.title}</h3>
                <p className="text-white/60 text-sm">{step.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Use Cases */}
      <div className="container mx-auto px-6 py-16 border-t border-purple-900/20">
        <h2 className="text-3xl font-bold font-space-grotesk mb-12">Who Uses This</h2>
        <div className="grid gap-8 md:grid-cols-2">
          {[
            {
              role: "Musicians & Producers",
              use: "Analyze frequencies to make mixing decisions, find dominant pitches, detect beat timing, identify problematic frequencies."
            },
            {
              role: "Audio Engineers",
              use: "Examine spectral content with FFT, track frequency peaks, classify audio types, optimize compression settings."
            },
            {
              role: "Students & Researchers",
              use: "Learn DSP visually: spectral centroid, zero-crossing rate, chromagrams, and beat detection algorithms in real-time."
            },
            {
              role: "Content Creators",
              use: "Analyze background music, optimize audio levels, detect energy and mood, identify problematic frequencies."
            },
          ].map((item, i) => (
            <div key={i} className="rounded-lg border border-purple-900/30 bg-white/[0.02] p-6">
              <h3 className="font-semibold text-white mb-2">{item.role}</h3>
              <p className="text-sm text-white/60">{item.use}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Technical Stack */}
      <div className="container mx-auto px-6 py-16 border-t border-purple-900/20">
        <h2 className="text-3xl font-bold font-space-grotesk mb-12">Built With Modern Tech</h2>
        <div className="grid gap-4 md:grid-cols-3 max-w-2xl">
          {[
            { name: "Web Audio API", desc: "Real-time audio processing in the browser" },
            { name: "FFT Algorithm", desc: "Fast Fourier Transform for frequency analysis" },
            { name: "WebGL Canvas", desc: "GPU-accelerated visualization rendering" },
            { name: "FastAPI Backend", desc: "High-performance async Python server" },
            { name: "PostgreSQL", desc: "Persistent session and user data storage" },
            { name: "Redis Caching", desc: "Lightning-fast metric computation" },
          ].map((tech, i) => (
            <div key={i} className="rounded-lg border border-purple-900/30 bg-white/[0.02] p-4">
              <p className="font-mono text-xs text-purple-400 mb-1">{tech.name}</p>
              <p className="text-xs text-white/60">{tech.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* CTA */}
      <div className="container mx-auto px-6 py-16 text-center border-t border-purple-900/20">
        <h2 className="text-3xl font-bold font-space-grotesk mb-6">Ready to Analyze?</h2>
        <Link href="/register">
          <Button size="lg" className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-semibold">
            Start Your Journey
          </Button>
        </Link>
      </div>

      {/* Footer */}
      <div className="border-t border-purple-900/20 bg-black/50 backdrop-blur">
        <div className="container mx-auto px-6 py-6 text-center text-xs text-white/40">
          <p>© 2026 SonicLab. Advanced audio analysis for everyone.</p>
        </div>
      </div>
    </div>
  );
}
