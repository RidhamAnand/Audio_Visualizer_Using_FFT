import { create } from "zustand";

type SourceMode = "microphone" | "file";
type VisualizerMode = "spectrogram" | "bars" | "chromagram" | "constellation" | "fft";

type HudMetrics = {
  bpm: number;
  audioType: "speech" | "music" | "noise";
  dominantNote: string;
  peakCount: number;
  mood?: "happy" | "sad" | "energetic" | "calm";
  // Extended metrics (60+)
  spectralCentroid?: number; // Hz
  zeroCrossingRate?: number; // 0-1
  energy?: number; // 0-255
  energyVariance?: number; // variance of energy
  dynamicRange?: number; // max - min energy
  chroma?: number[]; // 12-element pitch class distribution
  topPeaks?: number[]; // Top 24 frequency bin indices
  sampleRate?: number; // Hz
  fftSize?: number;
  frequencyBins?: number; // Total frequency bins
  normSpecCentroid?: number; // Normalized 0-1
  normEnergy?: number; // Normalized 0-1
  normZcr?: number; // Normalized 0-1
  normVariance?: number; // Normalized 0-1
  normDynamic?: number; // Normalized 0-1
};

type VisualizerState = {
  sourceMode: SourceMode;
  visualizerMode: VisualizerMode;
  colorTheme: string;
  running: boolean;
  hud: HudMetrics;
  setSourceMode: (mode: SourceMode) => void;
  setVisualizerMode: (mode: VisualizerMode) => void;
  setColorTheme: (theme: string) => void;
  setRunning: (running: boolean) => void;
  setHud: (hud: HudMetrics) => void;
};

export const useVisualizerStore = create<VisualizerState>((set) => ({
  sourceMode: "microphone",
  visualizerMode: "spectrogram",
  colorTheme: "cyan",
  running: false,
  hud: {
    bpm: 0,
    audioType: "noise",
    dominantNote: "-",
    peakCount: 0,
  },
  setSourceMode: (sourceMode) => set({ sourceMode }),
  setVisualizerMode: (visualizerMode) => set({ visualizerMode }),
  setColorTheme: (colorTheme) => set({ colorTheme }),
  setRunning: (running) => set({ running }),
  setHud: (hud) => set({ hud }),
}));

export type { VisualizerMode, SourceMode, HudMetrics };
