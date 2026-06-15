// GeminiVoiceService.js - Connects to Gemini Live API dynamically using systemInstructions from Configurable Flows
import { arrayBufferToBase64, base64ToArrayBuffer } from '../utils/audioUtils';

// TWILIO_GUARD_MS: Minimum milliseconds after session start before wrong_number/hang_up are allowed.
// This prevents Gemini from treating the Twilio trial warning and ringing as an IVR and hanging up prematurely.
const TWILIO_GUARD_MS = 28000;

class GeminiVoiceService {
  constructor() {
    this.ws = null;
    this.audioContext = null;
    this.mediaStream = null;
    this.scriptProcessor = null;
    this.playbackContext = null;
    this.nextPlayTime = 0;
    this.activeSources = [];
    this.currentAgentTranscript = "";
    this.recordDestination = null;
    this.agentAudioDestination = null;
    this.mediaRecorder = null;
    this.recordedChunks = [];
    this.onRecordingComplete = null;
    this.sessionStartTime = null; // tracks when session started for guard logic
    this.isTwilioMode = false;    // flag to enable the Twilio guard
  }

  isSupported() { return !!(window.AudioContext || window.webkitAudioContext); }

  startSession(apiKey, queueItem, systemInstructions, callbacks, customInputStream, isTwilioMode) {
    const { onCallStateChange, onError } = callbacks;
    if (!apiKey) return onError?.("Gemini API Key is missing in Settings.");
    onCallStateChange('calling');
    this.onRecordingComplete = callbacks.onRecordingComplete;
    this.sessionStartTime = Date.now();
    this.isTwilioMode = !!isTwilioMode;
    const url = `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent?key=${apiKey}`;

    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      this.playbackContext = new AC({ sampleRate: 24000 });
      this.audioContext = new AC({ sampleRate: 16000 });
      this.nextPlayTime = 0; 
      this.activeSources = []; 
      this.currentAgentTranscript = "";
      this.ws = new WebSocket(url);
    } catch (err) {
      onError?.("Failed to initialize audio or connect: " + err.message);
      onCallStateChange('ended'); return;
    }

    this.ws.onopen = async () => {
      try {
        this.ws.send(JSON.stringify(this.buildSetupMessage(queueItem, systemInstructions)));
        await this.startRecording(customInputStream, isTwilioMode);
        // CRITICAL: Notify caller that the audio output stream is now ready.
        // This must happen after startRecording so agentAudioDestination exists.
        if (this.agentAudioDestination?.stream) {
          callbacks.onAudioOutputReady?.(this.agentAudioDestination.stream);
        }
        onCallStateChange(isTwilioMode ? 'active' : 'speaking');
      } catch (err) {
        onError?.("Failed to start voice stream: " + err.message);
        this.ws.close();
      }
    };

    this.ws.onmessage = async (e) => {
      try {
        const txt = e.data instanceof Blob ? await e.data.text() : e.data instanceof ArrayBuffer ? new TextDecoder().decode(e.data) : e.data;
        this.handleMessage(JSON.parse(txt), callbacks);
      } catch (err) { console.error("Error parsing socket message:", err); }
    };

    this.ws.onerror = () => onError?.("Gemini connection error occurred.");
    this.ws.onclose = () => { this.cleanup(); onCallStateChange('ended'); };
  }

  endSession() { this.ws?.close(); this.ws = null; this.cleanup(); }

  cleanup() {
    if (this.scriptProcessor) { this.scriptProcessor.disconnect(); this.scriptProcessor = null; }
    this.stopPlayback();
    const closeContexts = () => {
      if (this.mediaStream) { this.mediaStream.getTracks().forEach(t => t.stop()); this.mediaStream = null; }
      if (this.audioContext) { this.audioContext.close(); this.audioContext = null; }
      if (this.playbackContext) { this.playbackContext.close(); this.playbackContext = null; }
    };
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      this.mediaRecorder.onstop = () => {
        const blob = new Blob(this.recordedChunks, { type: this.mediaRecorder?.mimeType || 'audio/webm' });
        const reader = new FileReader();
        reader.onloadend = () => {
          if (this.onRecordingComplete) this.onRecordingComplete(reader.result);
          closeContexts();
        };
        reader.readAsDataURL(blob);
      };
      try { this.mediaRecorder.stop(); } catch (err) { closeContexts(); }
      this.mediaRecorder = null;
    } else { closeContexts(); }
  }

  async startRecording(customInputStream, isTwilioMode) {
    if (customInputStream) {
      // Use the provided stream directly (Twilio remote stream or other)
      this.mediaStream = customInputStream;
      console.log('[Gemini] Using provided remote stream as audio input.');
    } else if (isTwilioMode) {
      // Twilio remote stream was unavailable — fall back to getUserMedia.
      // Gemini will hear the call audio playing through the headset/speaker (loopback).
      // The 28-second guard timer (TWILIO_GUARD_MS) prevents it from acting on
      // Twilio's trial warning or ringing sounds during this phase.
      console.warn('[Gemini] Twilio remote stream unavailable. Falling back to getUserMedia (loopback mode). Guard timer active.');
      this.mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } else {
      this.mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    }
    this.recordDestination = this.playbackContext.createMediaStreamDestination();
    this.agentAudioDestination = this.playbackContext.createMediaStreamDestination();
    const micSource = this.playbackContext.createMediaStreamSource(this.mediaStream);
    micSource.connect(this.recordDestination);

    this.recordedChunks = [];
    try {
      this.mediaRecorder = new MediaRecorder(this.recordDestination.stream, { mimeType: 'audio/webm' });
    } catch (err) {
      this.mediaRecorder = new MediaRecorder(this.recordDestination.stream);
    }
    this.mediaRecorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) this.recordedChunks.push(e.data);
    };
    this.mediaRecorder.start();

    const src = this.audioContext.createMediaStreamSource(this.mediaStream);
    this.scriptProcessor = this.audioContext.createScriptProcessor(2048, 1, 1);
    src.connect(this.scriptProcessor);
    this.scriptProcessor.connect(this.audioContext.destination);
    this.scriptProcessor.onaudioprocess = (ev) => {
      if (this.ws?.readyState !== 1) return;
      const input = ev.inputBuffer.getChannelData(0), pcm16 = new Int16Array(input.length);
      for (let i = 0; i < input.length; i++) {
        const s = Math.max(-1, Math.min(1, input[i]));
        pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
      }
      this.ws.send(JSON.stringify({ realtimeInput: { audio: { mimeType: "audio/pcm;rate=16000", data: arrayBufferToBase64(pcm16.buffer) } } }));
    };
  }

  getAudioOutputStream() {
    return this.agentAudioDestination ? this.agentAudioDestination.stream : null;
  }

  playPCMChunk(base64Data) {
    if (!this.playbackContext) return;
    const pcm16 = new Int16Array(base64ToArrayBuffer(base64Data)), f32 = new Float32Array(pcm16.length);
    for (let i = 0; i < pcm16.length; i++) f32[i] = pcm16[i] / 32768.0;
    const buf = this.playbackContext.createBuffer(1, f32.length, 24000);
    buf.copyToChannel(f32, 0);
    const src = this.playbackContext.createBufferSource();
    src.buffer = buf;
    src.connect(this.playbackContext.destination);
    if (this.recordDestination) src.connect(this.recordDestination);
    if (this.agentAudioDestination) src.connect(this.agentAudioDestination);
    src.onended = () => {
      const idx = this.activeSources.indexOf(src);
      if (idx > -1) this.activeSources.splice(idx, 1);
    };
    this.activeSources.push(src);
    const now = this.playbackContext.currentTime;
    if (this.nextPlayTime < now) this.nextPlayTime = now;
    src.start(this.nextPlayTime);
    this.nextPlayTime += buf.duration;
  }

  stopPlayback() {
    this.activeSources.forEach(s => { try { s.stop(); } catch (err) {} });
    this.activeSources = []; this.nextPlayTime = 0;
  }

  getRemainingPlaybackTime() {
    if (!this.playbackContext) return 0;
    const diff = (this.nextPlayTime - this.playbackContext.currentTime) * 1000;
    return diff > 0 ? diff : 0;
  }

  handleMessage(msg, callbacks) {
    const { onTranscriptUpdate, onFunctionCall, onCallStateChange } = callbacks;
    if (msg.setupComplete) return this.sendInitialGreeting();
    if (msg.serverContent) {
      const c = msg.serverContent;
      if (c.interrupted) {
        this.stopPlayback();
        if (this.currentAgentTranscript) {
          onTranscriptUpdate('agent', this.currentAgentTranscript + "... [Interrupted]");
          this.currentAgentTranscript = "";
        }
        onCallStateChange('listening');
      }
      if (c.inputTranscription?.text) onTranscriptUpdate('patient', c.inputTranscription.text);
      if (c.outputTranscription?.text) this.currentAgentTranscript += c.outputTranscription.text;
      if (c.modelTurn?.parts) {
        onCallStateChange('speaking');
        c.modelTurn.parts.forEach(p => p.inlineData?.mimeType?.startsWith('audio/pcm') && this.playPCMChunk(p.inlineData.data));
      }
      if (c.turnComplete) {
        if (this.currentAgentTranscript) {
          onTranscriptUpdate('agent', this.currentAgentTranscript);
          this.currentAgentTranscript = "";
        }
        onCallStateChange('listening');
      }
    }
    if (msg.toolCall?.functionCalls) {
      const elapsedMs = this.sessionStartTime ? Date.now() - this.sessionStartTime : Infinity;
      const guardActive = this.isTwilioMode && elapsedMs < TWILIO_GUARD_MS;
      msg.toolCall.functionCalls.forEach(fn => {
        // In Twilio mode, block wrong_number and hang_up during the guard window
        // so the Twilio trial warning + ringing tones don't fool Gemini into hanging up.
        if (guardActive && (fn.name === 'wrong_number' || fn.name === 'hang_up')) {
          console.warn(`[Guardian] Blocked premature ${fn.name} call at ${Math.round(elapsedMs/1000)}s (guard active for ${TWILIO_GUARD_MS/1000}s)`);
          // Still send tool response to keep Gemini alive, but suppress the UI action
          this.ws?.readyState === 1 && this.ws.send(JSON.stringify({
            toolResponse: { functionResponses: [{ response: { output: { status: "blocked_guard", reason: "Twilio warning phase, call not yet connected to patient." } }, id: fn.id }] }
          }));
          return;
        }
        onFunctionCall?.(fn.name, fn.args);
        this.ws?.readyState === 1 && this.ws.send(JSON.stringify({
          toolResponse: { functionResponses: [{ response: { output: { status: "success" } }, id: fn.id }] }
        }));
      });
    }
  }

  sendInitialGreeting() {
    // In Twilio mode, do NOT proactively greet.
    // Gemini listens passively; it will respond when the patient speaks first.
    if (this.isTwilioMode) {
      console.log('[Gemini] Twilio mode: initial greeting suppressed. Listening for patient...');
      return;
    }
    this.ws?.readyState === 1 && this.ws.send(JSON.stringify({ clientContent: { turns: [{ role: "user", parts: [{ text: "Hello" }] }], turnComplete: true } }));
  }

  sendPrompt(text) {
    this.ws?.readyState === 1 && this.ws.send(JSON.stringify({ clientContent: { turns: [{ role: "user", parts: [{ text }] }], turnComplete: true } }));
  }

  buildSetupMessage(queueItem, systemInstructions) {
    return {
      setup: {
        model: "models/gemini-3.1-flash-live-preview",
        generationConfig: {
          responseModalities: ["AUDIO"],
          speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: "Aoede" } } }
        },
        systemInstruction: { parts: [{ text: systemInstructions }] },
        inputAudioTranscription: {},
        outputAudioTranscription: {},
        tools: [{
          functionDeclarations: [
            { name: "confirm_appointment", description: "Call when the patient confirms or completes the flow requirement." },
            { name: "cancel_appointment", description: "Call when the patient cancels or rejects the request." },
            { name: "reschedule_appointment", description: "Call when the patient requests to reschedule.", parameters: { type: "OBJECT", properties: { slot_id: { type: "STRING" } } } },
            { name: "wrong_number", description: "Call if the number is wrong." },
            { name: "left_message", description: "Call when leaving a message." },
            { name: "hang_up", description: "Call to hang up and end the session." }
          ]
        }]
      }
    };
  }
}

export const geminiVoiceService = new GeminiVoiceService();
export default geminiVoiceService;


