// AudioEngine.js - Web Audio API polyphonic synthesis engine
// Supports multi-voice chords and tension-driven harmonic filter sweeps

// ---- Configurable audio constants ----
const BASE_FREQ = 110;
const OPENNESS_FREQ_MULT = 440;
const MAX_GAIN = 0.15;
const GAIN_VELOCITY_MULT = 0.04;
const FILTER_BASE = 400;
const FILTER_VELOCITY_MULT = 1200;
const FILTER_TENSION_MULT = 2000;
const FREQ_RAMP_TIME = 0.1;
const FILTER_RAMP_TIME = 0.1;
const GAIN_RAMP_TIME = 0.15;
const VOICE_COUNT = 3;
// Major chord intervals: root, major third, perfect fifth
const VOICE_INTERVALS = [1.0, 1.25, 1.5];
// Subtle detune per voice (cents) for analog warmth
const VOICE_DETUNE = [0, -7, 5];

class AudioEngine {
  constructor() {
    this.enabled = false;
    this.ctx = null;
    this.oscillators = [];
    this.voiceGains = [];
    this.masterGain = null;
    this.filterNode = null;
    this.tension = 1.0;
  }

  init() {
    if (this.ctx) return;

    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    this.ctx = new AudioContextClass();

    // Master gain and filter
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.setValueAtTime(0.0, this.ctx.currentTime);

    this.filterNode = this.ctx.createBiquadFilter();
    this.filterNode.type = 'lowpass';
    this.filterNode.frequency.setValueAtTime(FILTER_BASE, this.ctx.currentTime);
    this.filterNode.Q.setValueAtTime(2.0, this.ctx.currentTime);

    // Chain: oscillators -> voice gains -> filter -> master -> destination
    this.filterNode.connect(this.masterGain);
    this.masterGain.connect(this.ctx.destination);

    // Create polyphonic voices
    this.oscillators = [];
    this.voiceGains = [];
    for (let i = 0; i < VOICE_COUNT; i++) {
      const osc = this.ctx.createOscillator();
      osc.type = i === 0 ? 'sine' : 'triangle';
      osc.frequency.setValueAtTime(BASE_FREQ * VOICE_INTERVALS[i], this.ctx.currentTime);
      osc.detune.setValueAtTime(VOICE_DETUNE[i], this.ctx.currentTime);

      const voiceGain = this.ctx.createGain();
      // Root voice slightly louder, harmonics softer
      voiceGain.gain.setValueAtTime(1.0 - (i * 0.2), this.ctx.currentTime);

      osc.connect(voiceGain);
      voiceGain.connect(this.filterNode);
      osc.start(0);

      this.oscillators.push(osc);
      this.voiceGains.push(voiceGain);
    }
  }

  updateParameters(openness, velocity, tension) {
    if (!this.enabled || !this.ctx) return;

    this.tension = tension;

    // Map gesture dynamics to synth parameters
    const targetGain = Math.min(velocity * GAIN_VELOCITY_MULT, MAX_GAIN);

    // Filter sweep: velocity opens the filter, tension adds harmonic brightness
    const filterFreq = FILTER_BASE + (velocity * FILTER_VELOCITY_MULT) + (tension * FILTER_TENSION_MULT);

    const now = this.ctx.currentTime;

    // Update each voice frequency based on openness (pitch scaling)
    for (let i = 0; i < VOICE_COUNT; i++) {
      const targetFreq = (BASE_FREQ + openness * OPENNESS_FREQ_MULT) * VOICE_INTERVALS[i];
      this.oscillators[i].frequency.setTargetAtTime(targetFreq, now, FREQ_RAMP_TIME);
    }

    // Smooth filter sweep for harmonic movement
    this.filterNode.frequency.setTargetAtTime(filterFreq, now, FILTER_RAMP_TIME);

    // Master gain follows velocity
    this.masterGain.gain.setTargetAtTime(targetGain, now, GAIN_RAMP_TIME);
  }

  toggle() {
    this.enabled = !this.enabled;
    if (this.enabled) {
      this.init();
      if (this.ctx.state === 'suspended') {
        this.ctx.resume();
      }
    } else {
      if (this.masterGain) {
        this.masterGain.gain.setTargetAtTime(0.0, this.ctx.currentTime, 0.05);
      }
    }
  }

  cleanup() {
    for (let i = 0; i < this.oscillators.length; i++) {
      try { this.oscillators[i].stop(); } catch(e) {}
      this.oscillators[i].disconnect();
    }
    this.oscillators = [];
    this.voiceGains = [];
    if (this.ctx) {
      this.ctx.close();
    }
    this.ctx = null;
  }
}

export { AudioEngine };
