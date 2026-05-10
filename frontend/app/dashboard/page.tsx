"use client";

import { useEffect, useState } from "react";

import AudioVisualizerCanvas from "@/components/visualizer/AudioVisualizerCanvas";
import MetricsPanel from "@/components/visualizer/MetricsPanel";
import { Button } from "@/components/ui/button";
import { api, type SessionItem } from "@/lib/api";
import { useVisualizerStore } from "@/store/useVisualizerStore";

export default function DashboardPage() {
  const [sessions, setSessions] = useState<SessionItem[]>([]);
  const [settingsStatus, setSettingsStatus] = useState<string>("");
  const [showMetricsPanel, setShowMetricsPanel] = useState<boolean>(false);

  const hud = useVisualizerStore((s) => s.hud);
  const visualizerMode = useVisualizerStore((s) => s.visualizerMode);
  const colorTheme = useVisualizerStore((s) => s.colorTheme);
  const setVisualizerMode = useVisualizerStore((s) => s.setVisualizerMode);
  const setColorTheme = useVisualizerStore((s) => s.setColorTheme);

  useEffect(() => {
    void Promise.all([api.getSettings(), api.listSessions()])
      .then(([settings, sessionsData]) => {
        setVisualizerMode(settings.preferred_mode as "spectrogram" | "bars" | "chromagram" | "constellation");
        setColorTheme(settings.color_theme);
        setSessions(sessionsData);
      })
      .catch(() => {
        setSettingsStatus("Could not fetch user settings from backend.");
      });
  }, [setColorTheme, setVisualizerMode]);

  const saveSettings = async () => {
    try {
      await api.updateSettings({ preferred_mode: visualizerMode, color_theme: colorTheme });
      setSettingsStatus("Settings saved.");
    } catch {
      setSettingsStatus("Failed to save settings.");
    }
  };

  const handleSessionEnd = async (payload: {
    mode: string;
    audio_type: string;
    bpm: number;
    peak_count: number;
    duration_seconds: number;
    mood?: string;
    notes?: string;
  }) => {
    try {
      const created = await api.createSession(payload);
      setSessions((prev) => [created, ...prev].slice(0, 20));
    } catch {
      setSettingsStatus("Session ended, but logging to backend failed.");
    }
  };

  return (
    <div className="space-y-6">
      {/* Main Visualizer */}
      <div className="rounded-lg border border-purple-900/30 bg-black/50 overflow-hidden">
        <div className="border-b border-purple-900/30 px-6 py-4">
          <h1 className="text-2xl font-bold font-space-grotesk tracking-tight">Audio Analysis Studio</h1>
          <p className="text-xs text-white/60 mt-1">Real-time spectral visualization & DSP processing</p>
        </div>
        <div className="p-6">
          <AudioVisualizerCanvas onSessionEnd={handleSessionEnd} />
        </div>
      </div>

      {/* Grid: Metrics + Settings + History */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Live Metrics */}
        <div className="rounded-lg border border-purple-900/30 bg-black/50 overflow-hidden">
          <div className="border-b border-purple-900/30 px-6 py-4">
            <h2 className="font-semibold text-white">Live Metrics</h2>
            <p className="text-xs text-white/50 mt-1">Real-time analysis</p>
          </div>
          <div className="p-6 space-y-5">
            <div>
              <p className="text-xs text-white/50 font-mono uppercase tracking-wider mb-2">BPM</p>
              <p className="text-4xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">{hud.bpm.toFixed(1)}</p>
            </div>
            <div className="border-t border-purple-900/20 pt-4">
              <p className="text-xs text-white/50 font-mono uppercase tracking-wider mb-2">Audio Type</p>
              <p className="text-sm font-semibold text-white capitalize">{hud.audioType}</p>
            </div>
            <div className="border-t border-purple-900/20 pt-4">
              <p className="text-xs text-white/50 font-mono uppercase tracking-wider mb-2">Dominant Note</p>
              <p className="text-sm font-semibold text-white">{hud.dominantNote}</p>
            </div>
            <div className="border-t border-purple-900/20 pt-4">
              <p className="text-xs text-white/50 font-mono uppercase tracking-wider mb-2">Peaks</p>
              <p className="text-sm font-semibold text-white">{hud.peakCount}</p>
            </div>
            {hud.mood && (
              <div className="border-t border-purple-900/20 pt-4">
                <p className="text-xs text-white/50 font-mono uppercase tracking-wider mb-2">Mood</p>
                <div className="inline-block bg-gradient-to-r from-purple-600/20 to-pink-600/20 border border-purple-600/50 rounded px-3 py-1 text-xs font-semibold text-purple-300 capitalize">
                  {hud.mood}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Settings */}
        <div className="rounded-lg border border-purple-900/30 bg-black/50 overflow-hidden">
          <div className="border-b border-purple-900/30 px-6 py-4">
            <h2 className="font-semibold text-white">Preferences</h2>
            <p className="text-xs text-white/50 mt-1">Customize workspace</p>
          </div>
          <div className="p-6 space-y-4">
            <div>
              <label className="text-xs text-white/60 font-mono uppercase tracking-wider block mb-2">Visualization</label>
              <select
                className="w-full h-8 rounded-md border border-purple-900/40 bg-white/5 px-2 text-xs text-white focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500/20"
                value={visualizerMode}
                onChange={(e) =>
                  setVisualizerMode(e.target.value as "spectrogram" | "bars" | "chromagram" | "constellation" | "fft")
                }
              >
                <option value="spectrogram">Spectrogram</option>
                <option value="bars">Spectrum Analyzer</option>
                <option value="chromagram">Chromagram</option>
                <option value="constellation">Peak Constellation</option>
                <option value="fft">FFT Graph</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-white/60 font-mono uppercase tracking-wider block mb-2">Theme</label>
              <select
                className="w-full h-8 rounded-md border border-purple-900/40 bg-white/5 px-2 text-xs text-white focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500/20"
                value={colorTheme}
                onChange={(e) => setColorTheme(e.target.value)}
              >
                <option value="cyan">Cyan</option>
                <option value="emerald">Emerald</option>
                <option value="amber">Amber</option>
                <option value="rose">Rose</option>
              </select>
            </div>
            <Button 
              onClick={() => void saveSettings()} 
              className="w-full h-8 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white text-xs font-semibold rounded-md transition"
            >
              Save
            </Button>
            {settingsStatus && (
              <p className="text-xs text-white/50 text-center mt-2">{settingsStatus}</p>
            )}
          </div>
        </div>

        {/* Session History */}
        <div className="rounded-lg border border-purple-900/30 bg-black/50 overflow-hidden flex flex-col">
          <div className="border-b border-purple-900/30 px-6 py-4">
            <h2 className="font-semibold text-white">Session History</h2>
            <p className="text-xs text-white/50 mt-1">Last 20 sessions</p>
          </div>
          <div className="flex-1 overflow-y-auto">
            {sessions.length === 0 ? (
              <div className="p-6 text-center">
                <p className="text-white/50 text-xs">No sessions yet</p>
              </div>
            ) : (
              <div className="p-4 space-y-2">
                {sessions.map((session) => (
                  <div key={session.id} className="rounded-md border border-purple-900/20 bg-white/[0.02] hover:bg-white/[0.05] p-3 text-xs transition group">
                    <div className="font-semibold text-white capitalize group-hover:text-purple-300 transition mb-2">{session.mode}</div>
                    <div className="text-white/60 space-y-1 text-xs">
                      <div className="flex justify-between">
                        <span>Type:</span>
                        <span className="capitalize">{session.audio_type}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>BPM:</span>
                        <span>{session.bpm.toFixed(1)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Dur:</span>
                        <span>{session.duration_seconds.toFixed(2)}s</span>
                      </div>
                      {session.mood && (
                        <div className="flex justify-between">
                          <span>Mood:</span>
                          <span className="capitalize">{session.mood}</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Metrics Panel Toggle */}
      <div className="flex justify-center">
        <Button
          onClick={() => setShowMetricsPanel(!showMetricsPanel)}
          className="bg-gradient-to-r from-purple-600/50 to-pink-600/50 hover:from-purple-600/70 hover:to-pink-600/70 border border-purple-600/30 text-white text-sm font-semibold px-6 py-2 rounded-lg transition"
        >
          {showMetricsPanel ? "Hide Advanced Metrics" : "Show All 60+ Metrics"}
        </Button>
      </div>

      {/* Extended Metrics Panel */}
      {showMetricsPanel && (
        <div className="rounded-lg border border-purple-900/30 bg-black/50 overflow-hidden">
          <MetricsPanel metrics={hud} />
        </div>
      )}
    </div>
  );
}
