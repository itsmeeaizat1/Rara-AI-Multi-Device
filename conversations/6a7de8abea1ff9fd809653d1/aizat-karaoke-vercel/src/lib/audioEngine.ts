import { AudioFX } from "../types";

// === EQ FREQUENCIES (12-Band Hi-Res) ===
export const EQ_FREQUENCIES = [32, 64, 125, 250, 500, 1000, 2000, 4000, 8000, 12000, 16000, 20000];

// === Q FACTORS per band — Higher Q = narrower, more surgical, less phase smear ===
const EQ_Q_FACTORS = [0.8, 0.9, 1.0, 1.2, 1.4, 1.6, 1.8, 2.0, 2.5, 3.0, 3.5, 4.0];

// === YouTube IFrame API Types ===
declare global {
  interface Window {
    YT?: any;
    onYouTubeIframeAPIReady?: () => void;
  }
}

let ytApiLoaded = false;
let ytApiCallbacks: (() => void)[] = [];

function loadYouTubeAPI(): Promise<void> {
  return new Promise((resolve) => {
    if (ytApiLoaded && window.YT && window.YT.Player) {
      resolve();
      return;
    }
    ytApiCallbacks.push(resolve);
    if (!document.getElementById("youtube-iframe-api")) {
      const tag = document.createElement("script");
      tag.id = "youtube-iframe-api";
      tag.src = "https://www.youtube.com/iframe_api";
      document.head.appendChild(tag);
      window.onYouTubeIframeAPIReady = () => {
        ytApiLoaded = true;
        ytApiCallbacks.forEach((cb) => cb());
        ytApiCallbacks = [];
      };
    }
  });
}

export class KaraokeAudioEngine {
  private ctx: AudioContext | null = null;
  private musicSourceNode: AudioNode | null = null;
  private audioElement: HTMLAudioElement | null = null;
  private synthInterval: number | null = null;

  // === YouTube Player ===
  private ytPlayer: any = null;
  private ytContainer: HTMLDivElement | null = null;
  private ytTimeInterval: number | null = null;
  private ytReady: boolean = false;
  private ytOnReady: (() => void) | null = null;

  // === Signal Chain Nodes ===
  private inputGainNode: GainNode | null = null;
  private musicGainNode: GainNode | null = null;
  private eqFilters: BiquadFilterNode[] = [];
  private eqPostGainNode: GainNode | null = null;

  // Reverb
  private reverbConvolver: ConvolverNode | null = null;
  private reverbWetGain: GainNode | null = null;
  private reverbDryGain: GainNode | null = null;

  // Echo Delay (Smule-style)
  private echoDelayNode: DelayNode | null = null;
  private echoFeedbackGain: GainNode | null = null;
  private echoFilterNode: BiquadFilterNode | null = null;
  private echoLevelGain: GainNode | null = null;

  // === Transparent Limiter ===
  private limiterNode: DynamicsCompressorNode | null = null;
  private safetyLimiterNode: DynamicsCompressorNode | null = null;

  private masterGain: GainNode | null = null;

  // Mic & Recording
  private micStream: MediaStream | null = null;
  private micSourceNode: MediaStreamAudioSourceNode | null = null;
  private micGainNode: GainNode | null = null;
  private micMonitorGain: GainNode | null = null;
  private micHighpassNode: BiquadFilterNode | null = null;
  private recordDestination: MediaStreamAudioDestinationNode | null = null;
  private mediaRecorder: MediaRecorder | null = null;
  private recordedChunks: Blob[] = [];
  private isMicMuted: boolean = false;

  // Analyser
  private musicAnalyser: AnalyserNode | null = null;
  private micAnalyser: AnalyserNode | null = null;

  private isRecording = false;
  private currentFX: AudioFX | null = null;

  // Track current playback mode
  private playMode: "audio" | "youtube" | "synth" = "synth";

  public init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      this.ctx = new AudioCtx({ sampleRate: 48000, latencyHint: "interactive" });
    }
    if (this.ctx.state === "suspended") {
      this.ctx.resume();
    }
    this.setupNodes();
  }

  private setupNodes() {
    if (!this.ctx) return;

    this.inputGainNode = this.ctx.createGain();
    this.inputGainNode.gain.value = 1.0;

    this.musicGainNode = this.ctx.createGain();
    this.musicGainNode.gain.value = 0.8;

    this.musicAnalyser = this.ctx.createAnalyser();
    this.musicAnalyser.fftSize = 256;
    this.musicAnalyser.smoothingTimeConstant = 0.7;

    this.micAnalyser = this.ctx.createAnalyser();
    this.micAnalyser.fftSize = 256;
    this.micAnalyser.smoothingTimeConstant = 0.7;

    this.eqFilters = EQ_FREQUENCIES.map((freq, i) => {
      const filter = this.ctx!.createBiquadFilter();
      if (i === 0) {
        filter.type = "lowshelf";
        filter.frequency.value = freq;
        filter.Q.value = 0.7;
        filter.gain.value = 0;
      } else if (i === EQ_FREQUENCIES.length - 1) {
        filter.type = "highshelf";
        filter.frequency.value = freq;
        filter.Q.value = 0.7;
        filter.gain.value = 0;
      } else {
        filter.type = "peaking";
        filter.frequency.value = freq;
        filter.Q.value = EQ_Q_FACTORS[i];
        filter.gain.value = 0;
      }
      return filter;
    });

    for (let i = 0; i < this.eqFilters.length - 1; i++) {
      this.eqFilters[i].connect(this.eqFilters[i + 1]);
    }

    this.eqPostGainNode = this.ctx.createGain();
    this.eqPostGainNode.gain.value = 1.0;

    this.reverbConvolver = this.ctx.createConvolver();
    this.reverbWetGain = this.ctx.createGain();
    this.reverbDryGain = this.ctx.createGain();
    this.reverbWetGain.gain.value = 0.25;
    this.reverbDryGain.gain.value = 0.85;
    this.generateReverbImpulse(0.5, 2.5);

    this.echoDelayNode = this.ctx.createDelay(1.0);
    this.echoDelayNode.delayTime.value = 0.18;
    this.echoFeedbackGain = this.ctx.createGain();
    this.echoFeedbackGain.gain.value = 0.35;
    this.echoFilterNode = this.ctx.createBiquadFilter();
    this.echoFilterNode.type = "lowpass";
    this.echoFilterNode.frequency.value = 3500;
    this.echoLevelGain = this.ctx.createGain();
    this.echoLevelGain.gain.value = 0.25;

    this.echoDelayNode.connect(this.echoFilterNode);
    this.echoFilterNode.connect(this.echoFeedbackGain);
    this.echoFeedbackGain.connect(this.echoDelayNode);
    this.echoFilterNode.connect(this.echoLevelGain);

    this.limiterNode = this.ctx.createDynamicsCompressor();
    this.limiterNode.threshold.value = -0.5;
    this.limiterNode.knee.value = 0;
    this.limiterNode.ratio.value = 20;
    this.limiterNode.attack.value = 0.001;
    this.limiterNode.release.value = 0.05;

    this.safetyLimiterNode = this.ctx.createDynamicsCompressor();
    this.safetyLimiterNode.threshold.value = -0.1;
    this.safetyLimiterNode.knee.value = 0;
    this.safetyLimiterNode.ratio.value = 1000;
    this.safetyLimiterNode.attack.value = 0;
    this.safetyLimiterNode.release.value = 0.05;

    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = 1.0;

    this.micGainNode = this.ctx.createGain();
    this.micGainNode.gain.value = 1.2;
    this.micMonitorGain = this.ctx.createGain();
    this.micMonitorGain.gain.value = 0.0;
    this.micHighpassNode = this.ctx.createBiquadFilter();
    this.micHighpassNode.type = "highpass";
    this.micHighpassNode.frequency.value = 80;
    this.micHighpassNode.Q.value = 0.7;

    this.recordDestination = this.ctx.createMediaStreamDestination();

    // Wiring
    this.eqFilters[this.eqFilters.length - 1].connect(this.eqPostGainNode);
    this.eqPostGainNode.connect(this.reverbDryGain);
    this.eqPostGainNode.connect(this.reverbConvolver);
    this.reverbConvolver.connect(this.reverbWetGain);
    this.reverbDryGain.connect(this.echoDelayNode);
    this.reverbWetGain.connect(this.echoDelayNode);
    this.echoLevelGain.connect(this.limiterNode);
    this.echoDelayNode.connect(this.limiterNode);
    this.limiterNode.connect(this.safetyLimiterNode);
    this.safetyLimiterNode.connect(this.masterGain);
    this.masterGain.connect(this.ctx.destination);
    this.safetyLimiterNode.connect(this.recordDestination);
    this.eqPostGainNode.connect(this.musicAnalyser);
  }

  private generateReverbImpulse(roomSize: number, decay: number) {
    if (!this.ctx || !this.reverbConvolver) return;
    const sampleRate = this.ctx.sampleRate;
    const length = Math.max(1, Math.floor(sampleRate * (roomSize * 2 + 0.5)));
    const impulse = this.ctx.createBuffer(2, length, sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const channelData = impulse.getChannelData(ch);
      for (let i = 0; i < length; i++) {
        const t = i / length;
        const envelope = Math.pow(1 - t, decay) * (1 - Math.pow(1 - Math.min(1, i / (sampleRate * 0.003)), 2));
        channelData[i] = (Math.random() * 2 - 1) * envelope;
      }
    }
    this.reverbConvolver.buffer = impulse;
  }

  // === PLAY MUSIC — Now supports YouTube IFrame API ===
  public async playMusic(
    audioUrl?: string,
    bpm?: number,
    onTimeUpdate?: (t: number) => void,
    youtubeVideoId?: string
  ) {
    this.init();
    if (!this.ctx) return;

    this.stopMusic();

    // Priority 1: YouTube video → stream audio via IFrame API (like YouTube Music)
    if (youtubeVideoId) {
      this.playMode = "youtube";
      await this.playYouTube(youtubeVideoId, onTimeUpdate);
      return;
    }

    // Priority 2: Direct audio URL
    if (audioUrl) {
      this.playMode = "audio";
      this.audioElement = new Audio();
      this.audioElement.src = audioUrl;
      this.audioElement.crossOrigin = "anonymous";
      this.audioElement.loop = false;

      this.audioElement.addEventListener("canplay", () => {
        if (!this.ctx || !this.audioElement || !this.inputGainNode) return;
        try {
          this.musicSourceNode = this.ctx.createMediaElementSource(this.audioElement);
          this.musicSourceNode.connect(this.inputGainNode);
          this.inputGainNode.connect(this.musicGainNode);
          this.musicGainNode.connect(this.eqFilters[0]);
        } catch (e) {
          // Element already connected, just play
          console.warn("Audio source reconnect:", e);
        }
        this.audioElement.play();
      });

      this.audioElement.addEventListener("timeupdate", () => {
        if (this.audioElement && onTimeUpdate) {
          onTimeUpdate(this.audioElement.currentTime);
        }
      });
      return;
    }

    // Priority 3: Synth fallback
    if (bpm) {
      this.playMode = "synth";
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

  // === YOUTUBE IFRAME PLAYER ===
  private async playYouTube(videoId: string, onTimeUpdate?: (t: number) => void) {
    await loadYouTubeAPI();

    // Create hidden container for YouTube iframe
    if (!this.ytContainer) {
      this.ytContainer = document.createElement("div");
      this.ytContainer.id = "yt-audio-player";
      this.ytContainer.style.cssText = "position:fixed;width:1px;height:1px;left:-9999px;top:-9999px;opacity:0;pointer-events:none;";
      document.body.appendChild(this.ytContainer);
    }

    // Destroy old player if exists
    if (this.ytPlayer) {
      try { this.ytPlayer.destroy(); } catch {}
      this.ytPlayer = null;
    }

    this.ytReady = false;

    this.ytPlayer = new window.YT.Player("yt-audio-player", {
      videoId,
      playerVars: {
        autoplay: 1,
        controls: 0,
        disablekb: 1,
        fs: 0,
        modestbranding: 1,
        playsinline: 1,
        // No video, just audio streaming
      },
      events: {
        onReady: () => {
          this.ytReady = true;
          this.ytPlayer.playVideo();
          // Start time tracking
          if (this.ytTimeInterval) clearInterval(this.ytTimeInterval);
          this.ytTimeInterval = window.setInterval(() => {
            if (this.ytPlayer && this.ytReady && onTimeUpdate) {
              try {
                const t = this.ytPlayer.getCurrentTime();
                onTimeUpdate(t);
              } catch {}
            }
          }, 200);
        },
        onStateChange: (event: any) => {
          // 0 = ended, 1 = playing, 2 = paused, 3 = buffering
          if (event.data === 0 && this.ytTimeInterval) {
            clearInterval(this.ytTimeInterval);
          }
        },
        onError: (event: any) => {
          console.error("YouTube player error:", event.data);
        },
      },
    });
  }

  private startSynthBacking(bpm: number) {
    if (!this.ctx || !this.inputGainNode) return;
    const beatDur = 60 / bpm;
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
    const chords = [
      [261.63, 329.63, 392.00],
      [392.00, 493.88, 587.33],
      [220.00, 261.63, 329.63],
      [349.23, 440.00, 523.25],
    ];
    let beatCount = 0;
    this.synthInterval = window.setInterval(() => {
      playChord(chords[beatCount % chords.length], beatDur * 4);
      beatCount++;
    }, beatDur * 4 * 1000);
  }

  public pauseMusic() {
    if (this.playMode === "youtube" && this.ytPlayer && this.ytReady) {
      this.ytPlayer.pauseVideo();
    }
    if (this.audioElement) {
      this.audioElement.pause();
    }
    if (this.synthInterval) {
      clearInterval(this.synthInterval);
    }
  }

  public resumeMusic() {
    if (this.playMode === "youtube" && this.ytPlayer && this.ytReady) {
      this.ytPlayer.playVideo();
    }
    if (this.audioElement) {
      this.audioElement.play();
    }
  }

  public stopMusic() {
    if (this.ytPlayer) {
      try { this.ytPlayer.stopVideo(); } catch {}
      try { this.ytPlayer.destroy(); } catch {}
      this.ytPlayer = null;
    }
    if (this.ytTimeInterval) {
      clearInterval(this.ytTimeInterval);
      this.ytTimeInterval = null;
    }
    this.ytReady = false;

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
    this.playMode = "synth";
  }

  public seekMusic(timeSec: number) {
    if (this.playMode === "youtube" && this.ytPlayer && this.ytReady) {
      this.ytPlayer.seekTo(timeSec, true);
    }
    if (this.audioElement) {
      this.audioElement.currentTime = timeSec;
    }
  }

  // === Get current track duration ===
  public getDuration(): number {
    if (this.playMode === "youtube" && this.ytPlayer && this.ytReady) {
      try { return this.ytPlayer.getDuration(); } catch {}
    }
    if (this.audioElement) {
      return this.audioElement.duration || 0;
    }
    return 0;
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
          autoGainControl: false,
          channelCount: 1,
          sampleRate: 48000,
        },
      });
      this.micSourceNode = this.ctx.createMediaStreamSource(this.micStream);
      this.micSourceNode.connect(this.micHighpassNode!);
      this.micHighpassNode!.connect(this.micGainNode!);
      this.micGainNode!.connect(this.echoDelayNode!);
      this.micGainNode!.connect(this.limiterNode!);
      this.micGainNode!.connect(this.micMonitorGain!);
      this.micMonitorGain!.connect(this.ctx.destination);
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
        audioBitsPerSecond: 192000,
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

  // === UPDATE FX ===
  public updateFX(fx: AudioFX) {
    this.currentFX = fx;
    this.init();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const rampTime = 0.02;

    fx.eq12Bands.forEach((gain, i) => {
      if (this.eqFilters[i]) {
        this.eqFilters[i].gain.cancelScheduledValues(now);
        this.eqFilters[i].gain.setValueAtTime(this.eqFilters[i].gain.value, now);
        this.eqFilters[i].gain.linearRampToValueAtTime(gain, now + rampTime);
      }
    });

    const maxBoost = Math.max(0, ...fx.eq12Bands);
    const inputCompensation = 1 / (1 + maxBoost / 12);
    if (this.inputGainNode) {
      this.inputGainNode.gain.cancelScheduledValues(now);
      this.inputGainNode.gain.setValueAtTime(this.inputGainNode.gain.value, now);
      this.inputGainNode.gain.linearRampToValueAtTime(inputCompensation, now + rampTime);
    }

    const totalCut = fx.eq12Bands.reduce((sum, g) => sum + Math.max(0, -g), 0);
    const makeupGain = 1 + (totalCut / 24);
    if (this.eqPostGainNode) {
      this.eqPostGainNode.gain.cancelScheduledValues(now);
      this.eqPostGainNode.gain.setValueAtTime(this.eqPostGainNode.gain.value, now);
      this.eqPostGainNode.gain.linearRampToValueAtTime(Math.min(2, makeupGain), now + rampTime);
    }

    if (this.reverbWetGain) this.reverbWetGain.gain.linearRampToValueAtTime(fx.reverbMix, now + rampTime);
    if (this.reverbDryGain) this.reverbDryGain.gain.linearRampToValueAtTime(1 - fx.reverbMix * 0.3, now + rampTime);
    if (this.reverbConvolver && (!this.currentFX || Math.abs(this.currentFX.reverbRoomSize - fx.reverbRoomSize) > 0.05)) {
      this.generateReverbImpulse(fx.reverbRoomSize, 2.5);
    }
    if (this.echoDelayNode) this.echoDelayNode.delayTime.linearRampToValueAtTime(fx.echoDelayTime, now + rampTime);
    if (this.echoFeedbackGain) this.echoFeedbackGain.gain.linearRampToValueAtTime(fx.echoFeedback, now + rampTime);
    if (this.echoLevelGain) this.echoLevelGain.gain.linearRampToValueAtTime(fx.echoLevel, now + rampTime);
    if (this.micGainNode) this.micGainNode.gain.linearRampToValueAtTime(fx.micVolume, now + rampTime);
    if (this.musicGainNode) this.musicGainNode.gain.linearRampToValueAtTime(fx.musicVolume, now + rampTime);
    if (this.micMonitorGain) this.micMonitorGain.gain.linearRampToValueAtTime(fx.vocalMonitor ? 0.5 : 0.0, now + rampTime);
    if (this.micHighpassNode) {
      const hpFreq = fx.noiseSuppression ? 80 : 20;
      this.micHighpassNode.frequency.linearRampToValueAtTime(hpFreq, now + rampTime);
    }
    if (this.limiterNode) {
      if (fx.compressionGuard) {
        this.limiterNode.threshold.value = -0.5;
        this.limiterNode.ratio.value = 20;
      } else {
        this.limiterNode.threshold.value = 0;
        this.limiterNode.ratio.value = 1;
      }
    }
  }

  public getSpectrumData(): { musicData: Uint8Array; micData: Uint8Array } {
    const musicData = new Uint8Array(128);
    const micData = new Uint8Array(128);
    if (this.musicAnalyser) this.musicAnalyser.getByteFrequencyData(musicData);
    if (this.micAnalyser) this.micAnalyser.getByteFrequencyData(micData);
    return { musicData, micData };
  }
}

export const audioEngine = new KaraokeAudioEngine();
