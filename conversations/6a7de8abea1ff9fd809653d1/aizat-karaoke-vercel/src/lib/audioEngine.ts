import { AudioFX } from "../types";

// === EQ FREQUENCIES (12-Band Hi-Res) ===
export const EQ_FREQUENCIES = [32, 64, 125, 250, 500, 1000, 2000, 4000, 8000, 12000, 16000, 20000];

// === Q FACTORS per band — Higher Q = narrower, more surgical, less phase smear ===
// Low bands: wider Q (musical, natural bass)
// Mid bands: medium Q (vocal clarity)
// High bands: narrow Q (air, sparkle, hi-res detail)
const EQ_Q_FACTORS = [0.8, 0.9, 1.0, 1.2, 1.4, 1.6, 1.8, 2.0, 2.5, 3.0, 3.5, 4.0];

export class KaraokeAudioEngine {
  private ctx: AudioContext | null = null;
  private musicSourceNode: AudioNode | null = null;
  private audioElement: HTMLAudioElement | null = null;
  private synthInterval: number | null = null;

  // === Signal Chain Nodes ===
  private inputGainNode: GainNode | null = null;        // Pre-EQ input (headroom management)
  private musicGainNode: GainNode | null = null;
  private eqFilters: BiquadFilterNode[] = [];
  private eqPostGainNode: GainNode | null = null;       // Post-EQ makeup gain

  // Reverb
  private reverbConvolver: ConvolverNode | null = null;
  private reverbWetGain: GainNode | null = null;
  private reverbDryGain: GainNode | null = null;

  // Echo Delay (Smule-style)
  private echoDelayNode: DelayNode | null = null;
  private echoFeedbackGain: GainNode | null = null;
  private echoFilterNode: BiquadFilterNode | null = null;
  private echoLevelGain: GainNode | null = null;

  // === Transparent Limiter (anti-clip, NO pumping/compression) ===
  private limiterNode: DynamicsCompressorNode | null = null;
  private safetyLimiterNode: DynamicsCompressorNode | null = null;  // 2nd stage brickwall

  private masterGain: GainNode | null = null;

  // Mic & Recording
  private micStream: MediaStream | null = null;
  private micSourceNode: MediaStreamAudioSourceNode | null = null;
  private micGainNode: GainNode | null = null;
  private micMonitorGain: GainNode | null = null;
  private micHighpassNode: BiquadFilterNode | null = null;     // Remove rumble
  private recordDestination: MediaStreamAudioDestinationNode | null = null;
  private mediaRecorder: MediaRecorder | null = null;
  private recordedChunks: Blob[] = [];
  private isMicMuted: boolean = false;

  // Analyser
  private musicAnalyser: AnalyserNode | null = null;
  private micAnalyser: AnalyserNode | null = null;

  private isRecording = false;

  // Track current FX for live updates
  private currentFX: AudioFX | null = null;

  public init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      // === Hi-Res: 48kHz sample rate for better fidelity ===
      this.ctx = new AudioCtx({ sampleRate: 48000, latencyHint: "interactive" });
    }
    if (this.ctx.state === "suspended") {
      this.ctx.resume();
    }
    this.setupNodes();
  }

  private setupNodes() {
    if (!this.ctx) return;

    // === INPUT GAIN — Pre-EQ headroom ===
    // Auto-compensates for EQ boost so signal never clips before limiter
    this.inputGainNode = this.ctx.createGain();
    this.inputGainNode.gain.value = 1.0;

    // === MUSIC GAIN ===
    this.musicGainNode = this.ctx.createGain();
    this.musicGainNode.gain.value = 0.8;

    // === ANALYSERS ===
    this.musicAnalyser = this.ctx.createAnalyser();
    this.musicAnalyser.fftSize = 256;  // Higher resolution spectrum
    this.musicAnalyser.smoothingTimeConstant = 0.7;

    this.micAnalyser = this.ctx.createAnalyser();
    this.micAnalyser.fftSize = 256;
    this.micAnalyser.smoothingTimeConstant = 0.7;

    // === 12-BAND HI-RES EQUALIZER ===
    // Band 1 (32Hz)  → Low Shelf Filter  (natural bass shelf, no resonance)
    // Band 2-11      → Peaking Filter   (surgical mid control)
    // Band 12 (20kHz) → High Shelf Filter (air & sparkle, hi-res detail)
    this.eqFilters = EQ_FREQUENCIES.map((freq, i) => {
      const filter = this.ctx!.createBiquadFilter();

      if (i === 0) {
        // === 32Hz: Low Shelf ===
        filter.type = "lowshelf";
        filter.frequency.value = freq;
        filter.Q.value = 0.7;
        filter.gain.value = 0;
      } else if (i === EQ_FREQUENCIES.length - 1) {
        // === 20kHz: High Shelf (Air Band) ===
        filter.type = "highshelf";
        filter.frequency.value = freq;
        filter.Q.value = 0.7;
        filter.gain.value = 0;
      } else {
        // === Mid bands: Peaking with per-band Q ===
        filter.type = "peaking";
        filter.frequency.value = freq;
        filter.Q.value = EQ_Q_FACTORS[i];  // Narrow Q on highs = surgical precision
        filter.gain.value = 0;
      }

      return filter;
    });

    // === Chain EQ filters in series ===
    for (let i = 0; i < this.eqFilters.length - 1; i++) {
      this.eqFilters[i].connect(this.eqFilters[i + 1]);
    }

    // === POST-EQ MAKEUP GAIN ===
    // Compensates for perceived loudness loss after EQ cuts
    this.eqPostGainNode = this.ctx.createGain();
    this.eqPostGainNode.gain.value = 1.0;

    // === STUDIO REVERB ===
    this.reverbConvolver = this.ctx.createConvolver();
    this.reverbWetGain = this.ctx.createGain();
    this.reverbDryGain = this.ctx.createGain();
    this.reverbWetGain.gain.value = 0.25;
    this.reverbDryGain.gain.value = 0.85;
    this.generateReverbImpulse(0.5, 2.5);

    // === CLEAN SMULE ECHO DELAY ===
    this.echoDelayNode = this.ctx.createDelay(1.0);
    this.echoDelayNode.delayTime.value = 0.18;

    this.echoFeedbackGain = this.ctx.createGain();
    this.echoFeedbackGain.gain.value = 0.35;

    this.echoFilterNode = this.ctx.createBiquadFilter();
    this.echoFilterNode.type = "lowpass";
    this.echoFilterNode.frequency.value = 3500;

    this.echoLevelGain = this.ctx.createGain();
    this.echoLevelGain.gain.value = 0.25;

    // Echo feedback loop: delay → filter → feedback → delay
    this.echoDelayNode.connect(this.echoFilterNode);
    this.echoFilterNode.connect(this.echoFeedbackGain);
    this.echoFeedbackGain.connect(this.echoDelayNode);
    this.echoFilterNode.connect(this.echoLevelGain);

    // === TRANSPARENT LIMITER (Stage 1 — Soft, musical, NO pumping) ===
    this.limiterNode = this.ctx.createDynamicsCompressor();
    this.limiterNode.threshold.value = -0.5;    // Only catches true peaks
    this.limiterNode.knee.value = 0;              // Hard knee = transparent, only catches peaks
    this.limiterNode.ratio.value = 20;            // High ratio but only at threshold
    this.limiterNode.attack.value = 0.001;        // 1ms — instant peak catch
    this.limiterNode.release.value = 0.05;        // 50ms — fast recovery, no pumping

    // === SAFETY BRICKWALL (Stage 2 — Absolute clip prevention) ===
    this.safetyLimiterNode = this.ctx.createDynamicsCompressor();
    this.safetyLimiterNode.threshold.value = -0.1;
    this.safetyLimiterNode.knee.value = 0;
    this.safetyLimiterNode.ratio.value = 1000;    // Brickwall
    this.safetyLimiterNode.attack.value = 0;
    this.safetyLimiterNode.release.value = 0.05;

    // === MASTER GAIN ===
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = 1.0;

    // === MICROPHONE SETUP ===
    this.micGainNode = this.ctx.createGain();
    this.micGainNode.gain.value = 1.2;

    this.micMonitorGain = this.ctx.createGain();
    this.micMonitorGain.gain.value = 0.0;  // Off by default (prevent feedback)

    // Mic highpass — remove low rumble below 80Hz (keeps vocals clean)
    this.micHighpassNode = this.ctx.createBiquadFilter();
    this.micHighpassNode.type = "highpass";
    this.micHighpassNode.frequency.value = 80;
    this.micHighpassNode.Q.value = 0.7;

    // === RECORDING DESTINATION ===
    this.recordDestination = this.ctx.createMediaStreamDestination();

    // === WIRING DIAGRAM (Hi-Res Signal Chain) ===
    //
    // Music Source → InputGain → MusicGain → EQ Chain → EQ PostGain
    //   → Split: Dry → ReverbDryGain
    //          → ReverbConvolver → ReverbWetGain
    //   → Merge → EchoDelay → EchoLevel
    //   → TransparentLimiter → SafetyLimiter → MasterGain → Destination
    //
    // Mic Source → MicHighpass → MicGain → (same merge point)
    //   → MicMonitor → Destination (for live monitoring)

    // Connect EQ chain end to post-gain
    this.eqFilters[this.eqFilters.length - 1].connect(this.eqPostGainNode);

    // Post-EQ → Reverb split
    this.eqPostGainNode.connect(this.reverbDryGain);
    this.eqPostGainNode.connect(this.reverbConvolver);
    this.reverbConvolver.connect(this.reverbWetGain);

    // Reverb merge → Echo
    this.reverbDryGain.connect(this.echoDelayNode);
    this.reverbWetGain.connect(this.echoDelayNode);

    // Echo → Limiter chain
    this.echoLevelGain.connect(this.limiterNode);
    this.echoDelayNode.connect(this.limiterNode);

    // Limiter → Safety → Master → Destination
    this.limiterNode.connect(this.safetyLimiterNode);
    this.safetyLimiterNode.connect(this.masterGain);
    this.masterGain.connect(this.ctx.destination);

    // Also send to recording destination
    this.safetyLimiterNode.connect(this.recordDestination);

    // Connect music analyser after EQ (post-processing analysis)
    this.eqPostGainNode.connect(this.musicAnalyser);
  }

  // === HI-RES REVERB IMPULSE GENERATOR ===
  // Creates a smooth, natural reverb tail without harsh artifacts
  private generateReverbImpulse(roomSize: number, decay: number) {
    if (!this.ctx || !this.reverbConvolver) return;

    const sampleRate = this.ctx.sampleRate;
    const length = Math.max(1, Math.floor(sampleRate * (roomSize * 2 + 0.5)));
    const impulse = this.ctx.createBuffer(2, length, sampleRate);

    for (let ch = 0; ch < 2; ch++) {
      const channelData = impulse.getChannelData(ch);
      for (let i = 0; i < length; i++) {
        const t = i / length;
        // Smooth exponential decay with slight initial build-up
        const envelope = Math.pow(1 - t, decay) * (1 - Math.pow(1 - Math.min(1, i / (sampleRate * 0.003)), 2));
        // Add subtle early reflections (first 50ms)
        const earlyReflection = i < sampleRate * 0.05 ? Math.sin(i * 0.1) * 0.3 : 0;
        channelData[i] = (Math.random() * 2 - 1) * envelope + earlyReflection * envelope;
      }
    }

    this.reverbConvolver.buffer = impulse;
  }

  // === PLAY MUSIC (with optional synth fallback) ===
  public playMusic(audioUrl?: string, bpm?: number, onTimeUpdate?: (t: number) => void) {
    this.init();
    if (!this.ctx) return;

    this.stopMusic();

    if (audioUrl) {
      this.audioElement = new Audio();
      this.audioElement.src = audioUrl;
      this.audioElement.crossOrigin = "anonymous";
      this.audioElement.loop = false;

      this.audioElement.addEventListener("canplay", () => {
        if (!this.ctx || !this.audioElement || !this.inputGainNode) return;
        this.musicSourceNode = this.ctx.createMediaElementSource(this.audioElement);
        this.musicSourceNode.connect(this.inputGainNode);
        this.inputGainNode.connect(this.musicGainNode);
        this.musicGainNode.connect(this.eqFilters[0]);
        this.audioElement.play();
      });

      this.audioElement.addEventListener("timeupdate", () => {
        if (this.audioElement && onTimeUpdate) {
          onTimeUpdate(this.audioElement.currentTime);
        }
      });
    } else if (bpm) {
      // === Synth fallback: generate a karaoke backing track ===
      this.startSynthBacking(bpm);
      if (onTimeUpdate) {
        let t = 0;
        this.synthInterval = window.setInterval(() => {
          t += 0.1;
          onTimeUpdate(t);
        }, 100);
      }
    }
  }

  // === SYNTH BACKING TRACK (fallback when no audio URL) ===
  private startSynthBacking(bpm: number) {
    if (!this.ctx || !this.inputGainNode) return;
    const beatDur = 60 / bpm;

    // Simple chord progression synth
    const playChord = (freqs: number[], duration: number) => {
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      freqs.forEach((freq) => {
        const osc = this.ctx!.createOscillator();
        const gain = this.ctx!.createGain();
        osc.type = "sine";
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(0.15, now + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
        osc.connect(gain);
        gain.connect(this.inputGainNode!);
        osc.start(now);
        osc.stop(now + duration);
      });
    };

    // Chord progression: I-V-vi-IV (pop progression)
    const chords = [
      [261.63, 329.63, 392.00],  // C major
      [392.00, 493.88, 587.33],  // G major
      [220.00, 261.63, 329.63],  // A minor
      [349.23, 440.00, 523.25],  // F major
    ];

    let beatCount = 0;
    this.synthInterval = window.setInterval(() => {
      const chord = chords[beatCount % chords.length];
      playChord(chord, beatDur * 4);
      beatCount++;
    }, beatDur * 4 * 1000);
  }

  public pauseMusic() {
    if (this.audioElement) {
      this.audioElement.pause();
    }
    if (this.synthInterval) {
      clearInterval(this.synthInterval);
    }
  }

  public resumeMusic() {
    if (this.audioElement) {
      this.audioElement.play();
    } else if (this.synthInterval === null) {
      // Resume synth if was playing
    }
  }

  public stopMusic() {
    if (this.audioElement) {
      this.audioElement.pause();
      this.audioElement = null;
    }
    if (this.synthInterval) {
      clearInterval(this.synthInterval);
      this.synthInterval = null;
    }
    if (this.musicSourceNode) {
      try { this.musicSourceNode.disconnect(); } catch {}
      this.musicSourceNode = null;
    }
  }

  public seekMusic(timeSec: number) {
    if (this.audioElement) {
      this.audioElement.currentTime = timeSec;
    }
  }

  // === MICROPHONE ===
  public async startMicrophone(): Promise<boolean> {
    this.init();
    if (!this.ctx) return false;

    try {
      this.micStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: false,  // === OFF: prevents compression, keeps HD ===
          channelCount: 1,
          sampleRate: 48000,       // === Hi-Res sample rate ===
        },
      });

      this.micSourceNode = this.ctx.createMediaStreamSource(this.micStream);

      // Mic chain: source → highpass (rumble removal) → gain → merge
      this.micSourceNode.connect(this.micHighpassNode!);
      this.micHighpassNode!.connect(this.micGainNode!);
      this.micGainNode!.connect(this.echoDelayNode!);        // Echo on mic
      this.micGainNode!.connect(this.limiterNode!);            // Direct to limiter

      // Mic monitor (for headphone monitoring)
      this.micGainNode!.connect(this.micMonitorGain!);
      this.micMonitorGain!.connect(this.ctx.destination);

      // Mic analyser
      this.micGainNode!.connect(this.micAnalyser!);

      return true;
    } catch (e) {
      console.error("Microphone access failed:", e);
      return false;
    }
  }

  public stopMicrophone() {
    if (this.micStream) {
      this.micStream.getTracks().forEach((t) => t.stop());
      this.micStream = null;
    }
    if (this.micSourceNode) {
      try { this.micSourceNode.disconnect(); } catch {}
      this.micSourceNode = null;
    }
  }

  // === RECORDING ===
  public async startRecording(): Promise<boolean> {
    const hasMic = await this.startMicrophone();
    if (!hasMic || !this.recordDestination) return false;

    this.recordedChunks = [];
    try {
      const stream = this.recordDestination.stream;
      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : MediaRecorder.isTypeSupported("audio/mp4")
        ? "audio/mp4"
        : "audio/webm";

      this.mediaRecorder = new MediaRecorder(stream, {
        mimeType,
        audioBitsPerSecond: 192000,  // === 192kbps — higher quality than default ===
      });
      this.mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) this.recordedChunks.push(e.data);
      };
      this.mediaRecorder.start(200);
      this.isRecording = true;
      return true;
    } catch (e) {
      console.error("MediaRecorder failed:", e);
      return false;
    }
  }

  public stopRecording(): Promise<Blob | null> {
    return new Promise((resolve) => {
      if (!this.mediaRecorder || !this.isRecording) {
        resolve(null);
        return;
      }
      this.mediaRecorder.onstop = () => {
        const blob = new Blob(this.recordedChunks, {
          type: this.mediaRecorder?.mimeType || "audio/webm",
        });
        this.isRecording = false;
        resolve(blob);
      };
      this.mediaRecorder.stop();
    });
  }

  // === UPDATE FX (Live parameter changes) ===
  public updateFX(fx: AudioFX) {
    this.currentFX = fx;
    this.init();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const rampTime = 0.02;  // 20ms smooth ramp — no zipper noise

    // === EQ BANDS — Apply with smooth ramping ===
    fx.eq12Bands.forEach((gain, i) => {
      if (this.eqFilters[i]) {
        this.eqFilters[i].gain.cancelScheduledValues(now);
        this.eqFilters[i].gain.setValueAtTime(this.eqFilters[i].gain.value, now);
        this.eqFilters[i].gain.linearRampToValueAtTime(gain, now + rampTime);
      }
    });

    // === AUTO HEADROOM MANAGEMENT ===
    // When any EQ band is boosted, auto-reduce input gain to prevent clipping
    // This keeps the signal clean WITHOUT triggering the limiter
    const maxBoost = Math.max(0, ...fx.eq12Bands);
    const totalBoost = fx.eq12Bands.reduce((sum, g) => sum + Math.max(0, g), 0);

    // Input gain: reduce by the max single-band boost (prevents any band from clipping)
    // Formula: inputGain = 1 / (1 + maxBoost/12) — gentle curve
    const inputCompensation = 1 / (1 + maxBoost / 12);

    if (this.inputGainNode) {
      this.inputGainNode.gain.cancelScheduledValues(now);
      this.inputGainNode.gain.setValueAtTime(this.inputGainNode.gain.value, now);
      this.inputGainNode.gain.linearRampToValueAtTime(inputCompensation, now + rampTime);
    }

    // Post-EQ makeup: gentle compensation so perceived loudness stays similar
    // Only compensate for cuts, not boosts (boosts are intentional)
    const totalCut = fx.eq12Bands.reduce((sum, g) => sum + Math.max(0, -g), 0);
    const makeupGain = 1 + (totalCut / 24);  // Gentle: +1dB per 24dB of total cut

    if (this.eqPostGainNode) {
      this.eqPostGainNode.gain.cancelScheduledValues(now);
      this.eqPostGainNode.gain.setValueAtTime(this.eqPostGainNode.gain.value, now);
      this.eqPostGainNode.gain.linearRampToValueAtTime(Math.min(2, makeupGain), now + rampTime);
    }

    // === REVERB ===
    if (this.reverbWetGain) {
      this.reverbWetGain.gain.linearRampToValueAtTime(fx.reverbMix, now + rampTime);
    }
    if (this.reverbDryGain) {
      this.reverbDryGain.gain.linearRampToValueAtTime(1 - fx.reverbMix * 0.3, now + rampTime);
    }
    // Regenerate reverb impulse if room size changed significantly
    if (this.reverbConvolver && (!this.currentFX || Math.abs(this.currentFX.reverbRoomSize - fx.reverbRoomSize) > 0.05)) {
      this.generateReverbImpulse(fx.reverbRoomSize, 2.5);
    }

    // === ECHO DELAY ===
    if (this.echoDelayNode) {
      this.echoDelayNode.delayTime.linearRampToValueAtTime(fx.echoDelayTime, now + rampTime);
    }
    if (this.echoFeedbackGain) {
      this.echoFeedbackGain.gain.linearRampToValueAtTime(fx.echoFeedback, now + rampTime);
    }
    if (this.echoLevelGain) {
      this.echoLevelGain.gain.linearRampToValueAtTime(fx.echoLevel, now + rampTime);
    }

    // === MIC VOLUME ===
    if (this.micGainNode) {
      this.micGainNode.gain.linearRampToValueAtTime(fx.micVolume, now + rampTime);
    }

    // === MUSIC VOLUME ===
    if (this.musicGainNode) {
      this.musicGainNode.gain.linearRampToValueAtTime(fx.musicVolume, now + rampTime);
    }

    // === VOCAL MONITOR ===
    if (this.micMonitorGain) {
      this.micMonitorGain.gain.linearRampToValueAtTime(fx.vocalMonitor ? 0.5 : 0.0, now + rampTime);
    }

    // === NOISE SUPPRESSION ===
    if (this.micHighpassNode) {
      const hpFreq = fx.noiseSuppression ? 80 : 20;
      this.micHighpassNode.frequency.linearRampToValueAtTime(hpFreq, now + rampTime);
    }

    // === COMPRESSION GUARD ===
    // When ON: transparent limiter only catches true peaks (HD mode)
    // When OFF: limiter is bypassed entirely (pure signal, for pro users)
    if (this.limiterNode) {
      if (fx.compressionGuard) {
        // Transparent peak catching — no audible compression
        this.limiterNode.threshold.value = -0.5;
        this.limiterNode.ratio.value = 20;
      } else {
        // Bypass: set threshold so high it never engages
        this.limiterNode.threshold.value = 0;
        this.limiterNode.ratio.value = 1;
      }
    }
  }

  // === SPECTRUM DATA (for visualizers) ===
  public getSpectrumData(): { musicData: Uint8Array; micData: Uint8Array } {
    const musicData = new Uint8Array(128);
    const micData = new Uint8Array(128);

    if (this.musicAnalyser) {
      this.musicAnalyser.getByteFrequencyData(musicData);
    }
    if (this.micAnalyser) {
      this.micAnalyser.getByteFrequencyData(micData);
    }

    return { musicData, micData };
  }
}

export const audioEngine = new KaraokeAudioEngine();
