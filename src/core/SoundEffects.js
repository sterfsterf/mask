// Sound Effects - MIDI-style audio using Web Audio API
export class SoundEffects {
  constructor() {
    this.audioCtx = null;
    this.enabled = true;
  }

  init() {
    if (!this.audioCtx) {
      this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
  }

  playTone(frequency, duration, volume = 0.3, type = 'sine', delay = 0) {
    if (!this.enabled || !this.audioCtx) return;

    const oscillator = this.audioCtx.createOscillator();
    const gainNode = this.audioCtx.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(this.audioCtx.destination);
    
    oscillator.frequency.value = frequency;
    oscillator.type = type;
    
    const startTime = this.audioCtx.currentTime + delay;
    gainNode.gain.setValueAtTime(volume, startTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + duration);
    
    oscillator.start(startTime);
    oscillator.stop(startTime + duration);
  }

  // Button click - short blip
  buttonClick() {
    this.init();
    this.playTone(800, 0.05, 0.2, 'square');
  }

  // Button hover - subtle tone
  buttonHover() {
    this.init();
    this.playTone(600, 0.03, 0.1, 'sine');
  }

  // Card play - whoosh with pitch sweep
  cardPlay() {
    this.init();
    this.playTone(400, 0.15, 0.25, 'triangle');
    this.playTone(600, 0.1, 0.2, 'sine', 0.05);
  }

  // Card hover - gentle chime
  cardHover() {
    this.init();
    this.playTone(700, 0.08, 0.15, 'sine');
  }

  // Shrine twinkle - magical sparkle sound
  shrineTwinkle() {
    this.init();
    // Multiple high-pitched tones for twinkle effect
    this.playTone(1200, 0.3, 0.15, 'sine', 0);
    this.playTone(1600, 0.25, 0.12, 'sine', 0.05);
    this.playTone(2000, 0.2, 0.1, 'sine', 0.1);
    this.playTone(1400, 0.35, 0.08, 'triangle', 0.15);
  }

  // Shrine continuous ambience - play random twinkles
  startShrineAmbience() {
    this.init();
    const playRandomTwinkle = () => {
      if (!this.shrineAmbienceActive) return;
      
      // Random high notes
      const baseFreq = 1000 + Math.random() * 1200;
      this.playTone(baseFreq, 0.2 + Math.random() * 0.3, 0.08, 'sine');
      
      // Random delay between twinkles (2-5 seconds)
      setTimeout(playRandomTwinkle, 2000 + Math.random() * 3000);
    };
    
    this.shrineAmbienceActive = true;
    playRandomTwinkle();
  }

  stopShrineAmbience() {
    this.shrineAmbienceActive = false;
  }

  // Positive action - ascending arpeggio
  positive() {
    this.init();
    const notes = [523, 659, 784]; // C, E, G major chord
    notes.forEach((freq, i) => {
      this.playTone(freq, 0.15, 0.2, 'triangle', i * 0.08);
    });
  }

  // Negative action - descending tone
  negative() {
    this.init();
    this.playTone(400, 0.2, 0.25, 'sawtooth');
    this.playTone(300, 0.25, 0.2, 'square', 0.1);
  }

  // Error - harsh buzz
  error() {
    this.init();
    this.playTone(200, 0.15, 0.3, 'sawtooth');
  }

  // Purchase - cash register ding
  purchase() {
    this.init();
    this.playTone(1000, 0.1, 0.25, 'sine');
    this.playTone(1200, 0.15, 0.2, 'sine', 0.05);
  }

  // Attack - fierce grumbly sound
  attack() {
    this.init();
    // Low growl with distortion
    this.playTone(120, 0.2, 0.35, 'sawtooth');
    this.playTone(180, 0.18, 0.3, 'square', 0.02);
    // Impact punch
    this.playTone(80, 0.1, 0.4, 'sawtooth', 0.15);
  }

  // Block/Shield tink - metallic deflect sound
  blockTink() {
    this.init();
    // High pitched metallic ring
    this.playTone(2400, 0.08, 0.25, 'triangle');
    this.playTone(2800, 0.06, 0.2, 'sine', 0.02);
    // Quick decay to simulate metal ring
    this.playTone(1800, 0.12, 0.15, 'triangle', 0.04);
  }

  // Void swell - building tension sound that swells over time
  // Returns oscillators and gain nodes so they can be controlled dynamically
  startVoidSwell(duration = 1.2) {
    this.init();
    
    const oscillators = [];
    const gainNodes = [];
    const startTime = this.audioCtx.currentTime;
    
    // Base drone - deep rumbling
    const bass = this.audioCtx.createOscillator();
    const bassGain = this.audioCtx.createGain();
    bass.connect(bassGain);
    bassGain.connect(this.audioCtx.destination);
    bass.type = 'sawtooth';
    bass.frequency.value = 80;
    bassGain.gain.setValueAtTime(0.01, startTime);
    bassGain.gain.exponentialRampToValueAtTime(0.3, startTime + duration);
    bass.start(startTime);
    bass.stop(startTime + duration);
    oscillators.push(bass);
    gainNodes.push(bassGain);
    
    // Mid-range swelling tone
    const mid = this.audioCtx.createOscillator();
    const midGain = this.audioCtx.createGain();
    mid.connect(midGain);
    midGain.connect(this.audioCtx.destination);
    mid.type = 'triangle';
    mid.frequency.setValueAtTime(200, startTime);
    mid.frequency.exponentialRampToValueAtTime(400, startTime + duration);
    midGain.gain.setValueAtTime(0.01, startTime);
    midGain.gain.exponentialRampToValueAtTime(0.25, startTime + duration);
    mid.start(startTime);
    mid.stop(startTime + duration);
    oscillators.push(mid);
    gainNodes.push(midGain);
    
    // High ethereal tone
    const high = this.audioCtx.createOscillator();
    const highGain = this.audioCtx.createGain();
    high.connect(highGain);
    highGain.connect(this.audioCtx.destination);
    high.type = 'sine';
    high.frequency.setValueAtTime(600, startTime);
    high.frequency.exponentialRampToValueAtTime(1200, startTime + duration);
    highGain.gain.setValueAtTime(0.01, startTime);
    highGain.gain.exponentialRampToValueAtTime(0.2, startTime + duration);
    high.start(startTime);
    high.stop(startTime + duration);
    oscillators.push(high);
    gainNodes.push(highGain);
    
    return { oscillators, gainNodes, startTime, duration };
  }

  toggle(enabled) {
    this.enabled = enabled;
  }
}

// Global instance
export const sfx = new SoundEffects();
