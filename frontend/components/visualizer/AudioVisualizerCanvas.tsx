"use client";

import { ChangeEvent, useEffect, useMemo, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { type HudMetrics, type VisualizerMode, useVisualizerStore } from "@/store/useVisualizerStore";

const NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
const TOP_N_PEAKS = 24;

type MoodType = "happy" | "sad" | "energetic" | "calm";

const detectMood = (
  bpm: number,
  centroid: number,
  zcr: number,
  energy: number,
  energyVariance: number,
  dynamicRange: number
): MoodType => {
  // Normalize features to 0-1 scale
  const normCentroid = Math.min(centroid / 8000, 1);
  const normEnergy = Math.min(energy / 255, 1);
  const normBpm = Math.min(Math.max((bpm - 40) / 180, 0), 1);
  const normVariance = Math.min(energyVariance / 1000, 1);
  const normDynamic = Math.min(dynamicRange / 60, 1);

  // Score each mood
  const scores = {
    happy: normEnergy * 0.3 + normCentroid * 0.25 + normBpm * 0.25 + normVariance * 0.2,
    sad: (1 - normEnergy) * 0.35 + (1 - normCentroid) * 0.3 + (1 - normBpm) * 0.2 + (1 - normVariance) * 0.15,
    energetic: normEnergy * 0.4 + normDynamic * 0.3 + normBpm * 0.2 + normVariance * 0.1,
    calm: (1 - normEnergy) * 0.25 + (1 - normVariance) * 0.3 + Math.abs(normBpm - 0.4) * 0.2 + zcr * 0.25,
  };

  return (Object.entries(scores).reduce((best, [mood, score]) => (score > scores[best as MoodType] ? (mood as MoodType) : best)) as MoodType);
};

type Props = {
  onSessionEnd: (payload: {
    mode: string;
    audio_type: string;
    bpm: number;
    peak_count: number;
    duration_seconds: number;
    mood?: string;
    notes?: string;
  }) => Promise<void>;
};

type PeakFrame = {
  t: number;
  peaks: number[];
};

export default function AudioVisualizerCanvas({ onSessionEnd }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileAudioRef = useRef<HTMLAudioElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const contextRef = useRef<AudioContext | null>(null);
  const sourceNodeRef = useRef<MediaElementAudioSourceNode | MediaStreamAudioSourceNode | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);

  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sessionStart, setSessionStart] = useState<number | null>(null);

  const setRunning = useVisualizerStore((s) => s.setRunning);
  const setHud = useVisualizerStore((s) => s.setHud);
  const sourceMode = useVisualizerStore((s) => s.sourceMode);
  const setSourceMode = useVisualizerStore((s) => s.setSourceMode);
  const visualizerMode = useVisualizerStore((s) => s.visualizerMode);
  const setVisualizerMode = useVisualizerStore((s) => s.setVisualizerMode);
  const colorTheme = useVisualizerStore((s) => s.colorTheme);

  const energyWindowRef = useRef<number[]>([]);
  const beatTimestampsRef = useRef<number[]>([]);
  const peaksTimelineRef = useRef<PeakFrame[]>([]);
  const allEnergyValuesRef = useRef<number[]>([]);
  const currentMoodRef = useRef<MoodType | null>(null);

  const accentColor = useMemo(() => {
    if (colorTheme === "emerald") return "#10b981";
    if (colorTheme === "amber") return "#f59e0b";
    if (colorTheme === "rose") return "#f43f5e";
    return "#06b6d4";
  }, [colorTheme]);

  const resetEngine = () => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }

    sourceNodeRef.current?.disconnect();
    analyserRef.current?.disconnect();

    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }

    if (fileAudioRef.current) {
      fileAudioRef.current.pause();
      fileAudioRef.current.currentTime = 0;
    }

    energyWindowRef.current = [];
    allEnergyValuesRef.current = [];
    currentMoodRef.current = null;

    setRunning(false);
  };

  const stopSession = async () => {
    if (!sessionStart) return;

    const elapsed = (performance.now() - sessionStart) / 1000;
    const hud = useVisualizerStore.getState().hud;

    // Calculate energy variance and dynamic range for mood
    const energyValues = allEnergyValuesRef.current;
    let energyVariance = 0;
    let dynamicRange = 0;

    if (energyValues.length > 1) {
      const meanEnergy = energyValues.reduce((a, b) => a + b, 0) / energyValues.length;
      energyVariance = energyValues.reduce((acc, e) => acc + Math.pow(e - meanEnergy, 2), 0) / energyValues.length;
      dynamicRange = Math.max(...energyValues) - Math.min(...energyValues);
    }

    await onSessionEnd({
      mode: visualizerMode,
      audio_type: hud.audioType,
      bpm: hud.bpm,
      peak_count: hud.peakCount,
      duration_seconds: Number(elapsed.toFixed(2)),
      mood: currentMoodRef.current || undefined,
      notes: `dominant_note=${hud.dominantNote}`,
    });
    setSessionStart(null);
  };

  const teardown = async () => {
    await stopSession();
    resetEngine();
  };

  useEffect(() => {
    return () => {
      void teardown();
      if (fileUrl) {
        URL.revokeObjectURL(fileUrl);
      }
      if (contextRef.current) {
        void contextRef.current.close();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const classifyAudioType = (centroid: number, zcr: number): "speech" | "music" | "noise" => {
    if (zcr > 0.2 && centroid > 3500) return "noise";
    if (zcr > 0.08 && centroid < 2500) return "speech";
    return "music";
  };

  const drawLoop = (mode: VisualizerMode) => {
    const analyser = analyserRef.current;
    const canvas = canvasRef.current;
    if (!analyser || !canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const frequencyData = new Uint8Array(analyser.frequencyBinCount);
    const timeData = new Uint8Array(analyser.fftSize);

    const render = () => {
      analyser.getByteFrequencyData(frequencyData);
      analyser.getByteTimeDomainData(timeData);

      const width = canvas.width;
      const height = canvas.height;

      const mags = Array.from(frequencyData);
      const totalMag = mags.reduce((acc, n) => acc + n, 0) || 1;
      // spectral centroid = sum(f * magnitude) / sum(magnitude)
      const centroid = mags.reduce((acc, n, i) => {
        const freq = (i * (contextRef.current?.sampleRate ?? 44100)) / analyser.fftSize;
        return acc + freq * n;
      }, 0) / totalMag;

      const normalizedTime = Array.from(timeData).map((v) => (v - 128) / 128);
      let zeroCrossings = 0;
      for (let i = 1; i < normalizedTime.length; i += 1) {
        if (
          (normalizedTime[i - 1] >= 0 && normalizedTime[i] < 0) ||
          (normalizedTime[i - 1] < 0 && normalizedTime[i] >= 0)
        ) {
          zeroCrossings += 1;
        }
      }
      const zcr = zeroCrossings / normalizedTime.length;

      const energy = totalMag / mags.length;
      const rolling = energyWindowRef.current;
      rolling.push(energy);
      if (rolling.length > 40) rolling.shift();
      const avgEnergy = rolling.reduce((acc, n) => acc + n, 0) / Math.max(rolling.length, 1);

      const now = performance.now();
      if (energy > avgEnergy * 1.35) {
        const beats = beatTimestampsRef.current;
        beats.push(now);
        while (beats.length > 0 && now - beats[0] > 10000) beats.shift();
      }

      const intervals: number[] = [];
      for (let i = 1; i < beatTimestampsRef.current.length; i += 1) {
        intervals.push(beatTimestampsRef.current[i] - beatTimestampsRef.current[i - 1]);
      }
      const avgInterval = intervals.length
        ? intervals.reduce((acc, n) => acc + n, 0) / intervals.length
        : Number.POSITIVE_INFINITY;
      const bpm = Number.isFinite(avgInterval) && avgInterval > 0 ? Math.max(40, Math.min(220, 60000 / avgInterval)) : 0;

      const chroma = new Array(12).fill(0);
      for (let i = 1; i < mags.length; i += 1) {
        const freq = (i * (contextRef.current?.sampleRate ?? 44100)) / analyser.fftSize;
        if (freq < 40 || freq > 5000) continue;
        const midi = Math.round(69 + 12 * Math.log2(freq / 440));
        const pc = ((midi % 12) + 12) % 12;
        chroma[pc] += mags[i];
      }
      const dominantPc = chroma.reduce((best, value, idx, arr) => (value > arr[best] ? idx : best), 0);
      const dominantNote = NOTE_NAMES[dominantPc];

      const sortedPeaks = mags
        .map((value, index) => ({ value, index }))
        .sort((a, b) => b.value - a.value)
        .slice(0, TOP_N_PEAKS)
        .map((item) => item.index);

      peaksTimelineRef.current.push({ t: now, peaks: sortedPeaks });
      while (peaksTimelineRef.current.length > 180) peaksTimelineRef.current.shift();

      // Track energy for mood detection
      allEnergyValuesRef.current.push(energy);
      if (allEnergyValuesRef.current.length > 1000) {
        allEnergyValuesRef.current.shift();
      }

      const audioType = classifyAudioType(centroid, zcr);

      // Calculate mood
      const energyValues = allEnergyValuesRef.current;
      let energyVariance = 0;
      let dynamicRange = 0;
      if (energyValues.length > 1) {
        const meanEnergy = energyValues.reduce((a, b) => a + b, 0) / energyValues.length;
        energyVariance = energyValues.reduce((acc, e) => acc + Math.pow(e - meanEnergy, 2), 0) / energyValues.length;
        dynamicRange = Math.max(...energyValues) - Math.min(...energyValues);
      }
      const mood = detectMood(bpm, centroid, zcr, energy, energyVariance, dynamicRange);
      currentMoodRef.current = mood;

      // Normalize metrics for display
      const normCentroid = Math.min(centroid / 8000, 1);
      const normEnergy = Math.min(energy / 255, 1);
      const normBpm = Math.min(Math.max((bpm - 40) / 180, 0), 1);
      const normVariance = Math.min(energyVariance / 1000, 1);
      const normDynamic = Math.min(dynamicRange / 60, 1);

      const hud: HudMetrics = {
        bpm: Number(bpm.toFixed(1)),
        audioType,
        dominantNote,
        peakCount: sortedPeaks.length,
        mood,
        // Extended metrics
        spectralCentroid: Number(centroid.toFixed(2)),
        zeroCrossingRate: Number(zcr.toFixed(4)),
        energy: Number(energy.toFixed(2)),
        energyVariance: Number(energyVariance.toFixed(2)),
        dynamicRange: Number(dynamicRange.toFixed(2)),
        chroma,
        topPeaks: sortedPeaks,
        sampleRate: contextRef.current?.sampleRate ?? 44100,
        fftSize: analyser.fftSize,
        frequencyBins: analyser.frequencyBinCount,
        normSpecCentroid: Number(normCentroid.toFixed(4)),
        normEnergy: Number(normEnergy.toFixed(4)),
        normZcr: Number(zcr.toFixed(4)),
        normVariance: Number(normVariance.toFixed(4)),
        normDynamic: Number(normDynamic.toFixed(4)),
      };
      setHud(hud);

      if (mode === "spectrogram") {
        const image = ctx.getImageData(1, 0, width - 1, height);
        ctx.putImageData(image, 0, 0);
        for (let y = 0; y < height; y += 1) {
          const idx = Math.floor((y / height) * frequencyData.length);
          const intensity = frequencyData[frequencyData.length - 1 - idx] / 255;
          ctx.fillStyle = `rgba(${Math.floor(20 + 220 * intensity)}, ${Math.floor(80 + 120 * intensity)}, ${Math.floor(
            255 * intensity
          )}, 1)`;
          ctx.fillRect(width - 1, y, 1, 1);
        }
      } else if (mode === "bars") {
        ctx.clearRect(0, 0, width, height);
        ctx.fillStyle = "rgba(7, 10, 17, 1)";
        ctx.fillRect(0, 0, width, height);

        const barCount = 64;
        const barWidth = width / barCount;
        const pulse = energy > avgEnergy * 1.35 ? 1.15 : 1;
        for (let i = 0; i < barCount; i += 1) {
          const idx = Math.floor((i / barCount) * frequencyData.length);
          const value = frequencyData[idx] / 255;
          const barHeight = value * height * pulse;
          ctx.fillStyle = accentColor;
          ctx.fillRect(i * barWidth + 1, height - barHeight, Math.max(2, barWidth - 2), barHeight);
        }
      } else if (mode === "chromagram") {
        ctx.clearRect(0, 0, width, height);
        const cx = width / 2;
        const cy = height / 2;
        const radius = Math.min(width, height) * 0.35;

        const max = Math.max(...chroma, 1);
        for (let i = 0; i < 12; i += 1) {
          const start = (-Math.PI / 2) + (i * 2 * Math.PI) / 12;
          const end = (-Math.PI / 2) + ((i + 1) * 2 * Math.PI) / 12;
          const alpha = chroma[i] / max;

          ctx.beginPath();
          ctx.moveTo(cx, cy);
          ctx.arc(cx, cy, radius, start, end);
          ctx.closePath();
          ctx.fillStyle = `rgba(6, 182, 212, ${Math.max(0.1, alpha)})`;
          ctx.fill();

          const labelAngle = (start + end) / 2;
          const lx = cx + Math.cos(labelAngle) * (radius + 18);
          const ly = cy + Math.sin(labelAngle) * (radius + 18);
          ctx.fillStyle = i === dominantPc ? "#ffffff" : "#94a3b8";
          ctx.font = "12px ui-sans-serif";
          ctx.fillText(NOTE_NAMES[i], lx - 8, ly + 4);
        }
      } else if (mode === "constellation") {
        ctx.clearRect(0, 0, width, height);
        ctx.fillStyle = "rgba(7, 10, 17, 1)";
        ctx.fillRect(0, 0, width, height);

        const timeline = peaksTimelineRef.current;
        const maxFreqIndex = frequencyData.length - 1;
        timeline.forEach((frame, frameIndex) => {
          const x = (frameIndex / Math.max(1, timeline.length - 1)) * width;
          frame.peaks.forEach((peak) => {
            const y = height - (peak / maxFreqIndex) * height;
            ctx.fillStyle = accentColor;
            ctx.beginPath();
            ctx.arc(x, y, 1.8, 0, 2 * Math.PI);
            ctx.fill();
          });
        });
      } else if (mode === "fft") {
        ctx.clearRect(0, 0, width, height);
        ctx.fillStyle = "rgba(7, 10, 17, 1)";
        ctx.fillRect(0, 0, width, height);

        // Draw grid lines
        ctx.strokeStyle = "rgba(100, 116, 139, 0.2)";
        ctx.lineWidth = 1;
        for (let i = 0; i <= 4; i += 1) {
          const y = (i / 4) * height;
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(width, y);
          ctx.stroke();
        }

        // Draw FFT graph as a line
        ctx.strokeStyle = accentColor;
        ctx.lineWidth = 2;
        ctx.beginPath();

        const binCount = frequencyData.length;
        for (let i = 0; i < binCount; i += 1) {
          const x = (i / (binCount - 1)) * width;
          const normalized = frequencyData[i] / 255;
          const y = height - normalized * height * 0.9;

          if (i === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
        }
        ctx.stroke();

        // Fill area under curve
        ctx.lineTo(width, height);
        ctx.lineTo(0, height);
        ctx.closePath();
        ctx.fillStyle = `rgba(${accentColor === "#10b981" ? "16, 185, 129" : accentColor === "#f59e0b" ? "245, 158, 11" : accentColor === "#f43f5e" ? "244, 63, 94" : "6, 182, 212"}, 0.2)`;
        ctx.fill();

        // Draw axis labels
        ctx.fillStyle = "#94a3b8";
        ctx.font = "11px ui-sans-serif";
        ctx.textAlign = "left";
        ctx.fillText("0 Hz", 5, height - 5);
        const nyquist = (contextRef.current?.sampleRate ?? 44100) / 2;
        ctx.textAlign = "right";
        ctx.fillText(`${Math.round(nyquist)} Hz`, width - 10, height - 5);
        ctx.textAlign = "left";
        ctx.fillText("100%", 5, 12);
        ctx.fillText("0%", 5, height - 5);
      }

      rafRef.current = requestAnimationFrame(render);
    };

    render();
  };

  const startEngine = async () => {
    setError(null);
    resetEngine();

    if (!contextRef.current || contextRef.current.state === "closed") {
      contextRef.current = new AudioContext();
    }

    const ctx = contextRef.current;
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 2048;
    analyser.smoothingTimeConstant = 0.82;

    analyserRef.current = analyser;

    try {
      if (sourceMode === "microphone") {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaStreamRef.current = stream;
        sourceNodeRef.current = ctx.createMediaStreamSource(stream);
      } else {
        if (!fileAudioRef.current || !fileUrl) {
          throw new Error("Please upload an audio file before starting.");
        }
        // Only create MediaElementAudioSourceNode if we haven't already for this audio element.
        if (
          !sourceNodeRef.current ||
          !(sourceNodeRef.current instanceof MediaElementAudioSourceNode)
        ) {
          sourceNodeRef.current = ctx.createMediaElementSource(fileAudioRef.current);
        }
        await fileAudioRef.current.play();
      }

      sourceNodeRef.current.connect(analyser);
      analyser.connect(ctx.destination);

      energyWindowRef.current = [];
      beatTimestampsRef.current = [];
      peaksTimelineRef.current = [];

      setSessionStart(performance.now());
      setRunning(true);
      drawLoop(visualizerMode);
    } catch (err) {
      setRunning(false);
      setError(err instanceof Error ? err.message : "Could not start audio engine.");
    }
  };

  const onFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const selected = event.target.files?.[0];
    if (!selected) return;

    if (fileUrl) {
      URL.revokeObjectURL(fileUrl);
    }
    setFileUrl(URL.createObjectURL(selected));
  };

  return (
    <div className="space-y-4">
      <div className="rounded-lg bg-slate-800/30 border border-slate-800 p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 items-end">
          <div>
            <label className="text-xs uppercase tracking-widest text-slate-400 block mb-2">Input Source</label>
            <select
              className="w-full h-9 rounded-lg border border-slate-700 bg-slate-800 px-3 text-sm text-white focus:border-cyan-500 focus:outline-none"
              value={sourceMode}
              onChange={(e) => setSourceMode(e.target.value as "microphone" | "file")}
            >
              <option value="microphone">Microphone</option>
              <option value="file">Audio File</option>
            </select>
          </div>

          <div>
            <label className="text-xs uppercase tracking-widest text-slate-400 block mb-2">Mode</label>
            <select
              className="w-full h-9 rounded-lg border border-slate-700 bg-slate-800 px-3 text-sm text-white focus:border-cyan-500 focus:outline-none"
              value={visualizerMode}
              onChange={(e) => setVisualizerMode(e.target.value as VisualizerMode)}
            >
              <option value="spectrogram">Spectrogram</option>
              <option value="bars">Spectrum</option>
              <option value="chromagram">Chromagram</option>
              <option value="constellation">Constellation</option>
              <option value="fft">FFT Graph</option>
            </select>
          </div>

          {sourceMode === "file" && (
            <div>
              <label className="text-xs uppercase tracking-widest text-slate-400 block mb-2">Upload</label>
              <Input 
                type="file" 
                accept=".mp3,.wav,audio/mpeg,audio/wav" 
                onChange={onFileChange}
                className="h-9"
              />
            </div>
          )}

          <div className="md:col-span-2 lg:col-span-1 flex gap-2 lg:ml-auto">
            <Button 
              variant="outline" 
              onClick={() => void teardown()}
              className="flex-1 border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white"
            >
              Stop
            </Button>
            <Button 
              onClick={() => void startEngine()}
              className="flex-1 bg-cyan-600 hover:bg-cyan-700 text-white"
            >
              Start
            </Button>
          </div>
        </div>
      </div>

      {error && (
        <div className="rounded-lg bg-red-900/20 border border-red-900/50 p-3">
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      <div className="relative overflow-hidden rounded-xl border border-slate-800 bg-black scanline">
        <canvas ref={canvasRef} width={1200} height={520} className="h-[420px] w-full md:h-[520px]" />
      </div>

      {fileUrl ? <audio ref={fileAudioRef} src={fileUrl} className="hidden" crossOrigin="anonymous" /> : null}
    </div>
  );
}
