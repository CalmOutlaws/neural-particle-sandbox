// AudioEngine.js - Web Audio API Synthesis Engine for Neural Sandbox
class AudioEngine {
  constructor() {
    this.enabled = false;
    this.ctx = null;
    this.osc = null;
    this.gainNode = null;
    this.filterNode = null;
  }

  init() {
    if (this.ctx) return;
    
    // Create Audio Context
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    this.ctx = new AudioContextClass();

    // Setup audio chain nodes
    this.osc = this.ctx.createOscillator();
    this.gainNode = this.ctx.createGain();
    this.filterNode = this.ctx.createBiquadFilter();

    // Configure synth tone profiles
    this.osc.type = 'sine';
    this.osc.frequency.setValueAtTime(220, this.ctx.currentTime);
    
    this.filterNode.type = 'lowpass';
    this.filterNode.frequency.setValueAtTime(800, this.ctx.currentTime);

    this.gainNode.gain.setValueAtTime(0.0, this.ctx.currentTime);

    // Bind chain
    this.osc.connect(this.filterNode);
    this.filterNode.connect(this.gainNode);
    this.gainNode.connect(this.ctx.destination);

    this.osc.start(0);
    console.log("AudioEngine Web Context initialized.");
  }

  updateParameters(openness, velocity) {
    if (!this.enabled || !this.ctx) return;

    // Map gesture dynamics to synthesizer frequencies and gains safely
    const targetFreq = 110 + (openness * 440);
    const targetGain = Math.min(velocity * 0.04, 0.15);
    const filterFreq = 400 + (velocity * 1200);

    this.osc.frequency.setTargetAtTime(targetFreq, this.ctx.currentTime, 0.1);
    this.filterNode.frequency.setTargetAtTime(filterFreq, this.ctx.currentTime, 0.1);
    this.gainNode.gain.setTargetAtTime(targetGain, this.ctx.currentTime, 0.15);
  }

  toggle() {
    this.enabled = !this.enabled;
    if (this.enabled) {
      this.init();
      if (this.ctx.state === 'suspended') {
        this.ctx.resume();
      }
    } else {
      if (this.gainNode) {
        this.gainNode.gain.setTargetAtTime(0.0, this.ctx.currentTime, 0.05);
      }
    }
  }

  cleanup() {
    if (this.osc) {
      try { this.osc.stop(); } catch(e){}
      this.osc.disconnect();
    }
    if (this.ctx) {
      this.ctx.close();
    }
    this.ctx = null;
  }
}

export { AudioEngine };