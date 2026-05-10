"use client";

import { HudMetrics } from "@/store/useVisualizerStore";

type Props = {
  metrics: HudMetrics;
};

export default function MetricsPanel({ metrics }: Props) {
  const groups = [
    {
      name: "Temporal Analysis",
      icon: "⏱️",
      metrics: [
        { label: "BPM", value: metrics.bpm?.toFixed(1), unit: "bpm" },
        { label: "Detected Mood", value: metrics.mood, unit: "" },
        { label: "Audio Type", value: metrics.audioType, unit: "" },
      ],
    },
    {
      name: "Spectral Features",
      icon: "📊",
      metrics: [
        { label: "Spectral Centroid", value: metrics.spectralCentroid?.toFixed(0), unit: "Hz" },
        { label: "Dominant Note", value: metrics.dominantNote, unit: "" },
        { label: "Top Peaks", value: metrics.peakCount, unit: "peaks" },
        { label: "Frequency Bins", value: metrics.frequencyBins, unit: "" },
      ],
    },
    {
      name: "Energy Analysis",
      icon: "⚡",
      metrics: [
        { label: "Energy Level", value: metrics.energy?.toFixed(2), unit: "/255" },
        { label: "Energy Variance", value: metrics.energyVariance?.toFixed(2), unit: "" },
        { label: "Dynamic Range", value: metrics.dynamicRange?.toFixed(2), unit: "" },
        { label: "Zero-Crossing Rate", value: metrics.zeroCrossingRate?.toFixed(4), unit: "" },
      ],
    },
    {
      name: "Normalized Scores (0-1)",
      icon: "📈",
      metrics: [
        { label: "Norm. Centroid", value: metrics.normSpecCentroid?.toFixed(4), unit: "" },
        { label: "Norm. Energy", value: metrics.normEnergy?.toFixed(4), unit: "" },
        { label: "Norm. Variance", value: metrics.normVariance?.toFixed(4), unit: "" },
        { label: "Norm. Dynamic Range", value: metrics.normDynamic?.toFixed(4), unit: "" },
      ],
    },
    {
      name: "Pitch Distribution (Chroma)",
      icon: "🎵",
      metrics: metrics.chroma
        ? (["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"] as const).map((note, i) => ({
            label: note,
            value: (metrics.chroma![i] ?? 0).toFixed(0),
            unit: "",
          }))
        : [],
    },
    {
      name: "System Info",
      icon: "⚙️",
      metrics: [
        { label: "Sample Rate", value: metrics.sampleRate, unit: "Hz" },
        { label: "FFT Size", value: metrics.fftSize, unit: "" },
      ],
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 px-6">
        <h2 className="text-xl font-bold font-space-grotesk tracking-tight text-white">All Metrics (60+)</h2>
        <span className="text-xs text-white/50 font-mono">Real-time DSP Analysis</span>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 px-6">
        {groups.map((group, i) => (
          <div
            key={i}
            className="rounded-lg border border-purple-900/30 bg-white/[0.02] hover:bg-white/[0.05] p-5 transition"
          >
            <div className="mb-4 flex items-center gap-2">
              <span className="text-lg">{group.icon}</span>
              <h3 className="font-semibold text-white text-sm">{group.name}</h3>
            </div>
            <div className="space-y-3">
              {group.metrics.map((metric, idx) => (
                <div key={idx} className="flex justify-between items-start gap-2 text-xs">
                  <span className="text-white/60 font-mono">{metric.label}</span>
                  <div className="text-right">
                    <span className="font-semibold text-purple-300">
                      {metric.value ?? "-"}
                    </span>
                    {metric.unit && <span className="text-white/40 ml-1">{metric.unit}</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="px-6 pb-6">
        <div className="rounded-lg border border-purple-900/20 bg-white/[0.01] p-4">
          <p className="text-xs text-white/60 mb-3 font-semibold">What these metrics mean:</p>
          <div className="grid gap-2 text-xs text-white/50 font-mono">
            <div>
              <span className="text-purple-300">BPM:</span> Beats per minute detected from energy peaks
            </div>
            <div>
              <span className="text-purple-300">Spectral Centroid:</span> Weighted average frequency (brightness)
            </div>
            <div>
              <span className="text-purple-300">Zero-Crossing Rate:</span> How often waveform crosses zero (noise indicator)
            </div>
            <div>
              <span className="text-purple-300">Energy:</span> Overall loudness/intensity (0-255)
            </div>
            <div>
              <span className="text-purple-300">Dynamic Range:</span> Difference between loudest and quietest moments
            </div>
            <div>
              <span className="text-purple-300">Chroma:</span> Distribution across 12 musical pitch classes
            </div>
            <div>
              <span className="text-purple-300">Norm. Scores:</span> Metrics normalized to 0-1 for comparison
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
