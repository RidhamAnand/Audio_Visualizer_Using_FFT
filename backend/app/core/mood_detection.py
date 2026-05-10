"""
Mood detection module using audio feature analysis.

Classification:
- Happy: High energy, high spectral brightness, fast tempo, varied dynamics
- Sad: Low energy, low spectral brightness, slow tempo, stable smooth dynamics
- Energetic: Very high energy, wide frequency range, fast tempo, high dynamic range
- Calm: Low-to-moderate energy, smooth spectral profile, moderate tempo, low variance
"""


def detect_mood(
    bpm: float,
    spectral_centroid: float,
    zero_crossing_rate: float,
    energy: float,
    energy_variance: float,
    dynamic_range: float,
) -> str:
    """
    Detect mood from audio features using heuristic rules.

    Args:
        bpm: Beats per minute (40-220)
        spectral_centroid: Average frequency (Hz), typically 1000-5000
        zero_crossing_rate: ZCR normalized (0-1), higher = more noise/high-freq
        energy: Average energy/magnitude (0-255 scale)
        energy_variance: Variance of energy over time
        dynamic_range: Difference between loudest and quietest parts (dB)

    Returns:
        str: One of "happy", "sad", "energetic", or "calm"
    """

    # Normalize spectral centroid to 0-1 scale (assuming typical range 100-8000 Hz)
    norm_centroid = min(spectral_centroid / 8000, 1.0)

    # Normalize energy to 0-1
    norm_energy = min(energy / 255, 1.0)

    # Normalize BPM (40-220 range)
    norm_bpm = (bpm - 40) / 180 if bpm > 40 else 0

    # Normalize variance and dynamic range
    norm_variance = min(energy_variance / 1000, 1.0)
    norm_dynamic = min(dynamic_range / 60, 1.0)

    # Scoring system
    scores = {
        "happy": 0.0,
        "sad": 0.0,
        "energetic": 0.0,
        "calm": 0.0,
    }

    # Happy: Moderate-high energy, bright (high centroid), fast tempo, varied dynamics
    scores["happy"] += norm_energy * 0.3  # Moderate-high energy
    scores["happy"] += norm_centroid * 0.25  # Bright frequencies
    scores["happy"] += norm_bpm * 0.25  # Faster tempo
    scores["happy"] += norm_variance * 0.2  # Some variation

    # Sad: Low energy, dark (low centroid), slow tempo, smooth dynamics
    scores["sad"] += (1 - norm_energy) * 0.35  # Low energy
    scores["sad"] += (1 - norm_centroid) * 0.3  # Dark frequencies
    scores["sad"] += (1 - norm_bpm) * 0.2  # Slow tempo
    scores["sad"] += (1 - norm_variance) * 0.15  # Smooth/stable

    # Energetic: Very high energy, wide spectrum, fast tempo, high variance
    scores["energetic"] += norm_energy * 0.4  # High energy
    scores["energetic"] += norm_dynamic * 0.3  # Wide dynamic range
    scores["energetic"] += norm_bpm * 0.2  # Fast tempo
    scores["energetic"] += norm_variance * 0.1  # Some jumpiness

    # Calm: Low-moderate energy, smooth, moderate tempo, low variance
    scores["calm"] += (1 - norm_energy) * 0.25  # Low-moderate energy
    scores["calm"] += (1 - norm_variance) * 0.3  # Smooth/stable
    scores["calm"] += abs(norm_bpm - 0.4) * 0.2  # Moderate tempo (~100 BPM)
    scores["calm"] += zero_crossing_rate * 0.25  # Lower noise floor

    # Find highest score
    mood = max(scores, key=scores.get)

    return mood
