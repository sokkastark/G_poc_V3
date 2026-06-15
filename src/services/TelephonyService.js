// TelephonyService.js - Abstraction layer for telephony providers (Mock & optional Twilio WebRTC)
import { Device } from '@twilio/voice-sdk';

class MockTelephonyAdapter {
  constructor() {
    this.name = "Mock Telephony Provider";
    this.activeCall = null;
  }
  dial(phoneNumber, callbacks) {
    const { onStatusChange, onConnect, onDisconnect } = callbacks;
    onStatusChange("dialing");
    const ringTimeout = setTimeout(() => {
      onStatusChange("ringing");
      const connectTimeout = setTimeout(() => {
        onStatusChange("in-progress");
        this.activeCall = { id: `call-${Math.random().toString(36).substr(2, 9)}`, phone: phoneNumber };
        onConnect?.(this.activeCall);
      }, 1500);
      this.activeCall = { ...this.activeCall, timeouts: [connectTimeout] };
    }, 1000);
    this.activeCall = { id: 'pending', phone: phoneNumber, timeouts: [ringTimeout], onDisconnect };
  }
  hangup() {
    if (this.activeCall) {
      if (this.activeCall.timeouts) this.activeCall.timeouts.forEach(clearTimeout);
      this.activeCall.onDisconnect?.();
      this.activeCall = null;
    }
  }
  setAudioInputStream(stream) {}
  getLogs(phoneNumber) {
    return [
      { timestamp: new Date().toLocaleTimeString(), message: `[Mock] Initializing SIP invite to ${phoneNumber}` },
      { timestamp: new Date().toLocaleTimeString(), message: `[Mock] Status 100 Trying` },
      { timestamp: new Date().toLocaleTimeString(), message: `[Mock] Status 180 Ringing` },
      { timestamp: new Date().toLocaleTimeString(), message: `[Mock] Call answered. Bridging audio channels.` }
    ];
  }
}

class TwilioAdapter {
  constructor() {
    this.name = "Twilio Voice Adapter";
    this.activeCall = null;
    this.device = null;
    this.fallbackAdapter = null;
    this.currentProcessor = null;
  }
  async dial(phoneNumber, callbacks) {
    const { onStatusChange, onConnect, onDisconnect } = callbacks;
    onStatusChange("dialing");
    try {
      const apiBase = window.location.origin.includes('localhost') ? 'http://localhost:5000' : '';
      const res = await fetch(`${apiBase}/api/telephony/token`);
      if (!res.ok) throw new Error("Local token server returned status error.");
      const data = await res.json();
      if (!data.token) throw new Error("No token returned from server.");
      this.device = new Device(data.token, { logLevel: 'debug', codecPreferences: ['pcmu', 'opus'] });
      this.device.on('error', (err) => {
        console.error('[Twilio Device Error]', err);
        onStatusChange("ended");
        onDisconnect?.();
      });
      await this.device.register();
      let targetNumber = phoneNumber.trim();
      const digits = targetNumber.replace(/\D/g, '');
      if (!targetNumber.startsWith('+')) {
        if (digits.length === 10) targetNumber = `+91${digits}`;
        else if (digits.length === 12 && digits.startsWith('91')) targetNumber = `+${digits}`;
        else if (digits.length === 11 && digits.startsWith('1')) targetNumber = `+${digits}`;
        else targetNumber = `+${digits}`;
      }
      const call = await this.device.connect({ params: { tocall: targetNumber } });
      this.activeCall = call;
      call.on('accept', () => {
        onStatusChange("in-progress");
        const callId = call.parameters?.CallSid || `twilio-${Date.now()}`;
        // Store call ref for stream detection
        this._pendingCall = call;
        
        // Strategy: Get Twilio remote audio stream via 3 escalating approaches.
        // We wait 1500ms so WebRTC has time to negotiate and attach remote tracks.
        const tryGetRemoteStream = () => {
          // Strategy 1 (BEST): Access the RTCPeerConnection receivers directly from Twilio internals.
          // This gives us the raw MediaStream from the remote phone leg.
          try {
            const pc = call._mediaHandler?.version?.pc
                     || call._mediaHandler?._pc
                     || call._peerConnection;
            if (pc && typeof pc.getReceivers === 'function') {
              const tracks = pc.getReceivers().map(r => r.track).filter(Boolean);
              if (tracks.length > 0) {
                console.log('[Twilio] Remote stream via RTCPeerConnection receivers ✓');
                return new MediaStream(tracks);
              }
            }
          } catch (e) { console.warn('[Twilio] RTCPeerConnection strategy failed:', e.message); }

          // Strategy 2: Scan DOM for Twilio's hidden <audio> element with srcObject set
          try {
            const audioEls = document.querySelectorAll('audio');
            for (const el of audioEls) {
              if (el.srcObject instanceof MediaStream) {
                const tracks = el.srcObject.getTracks();
                if (tracks.length > 0) {
                  console.log('[Twilio] Remote stream via DOM audio element ✓');
                  return typeof el.captureStream === 'function' ? el.captureStream() : el.srcObject;
                }
              }
            }
          } catch (e) {}

          // Strategy 3: SDK method (may exist on some versions)
          try {
            if (typeof call.getRemoteStream === 'function') {
              const s = call.getRemoteStream();
              if (s && s.getTracks().length > 0) {
                console.log('[Twilio] Remote stream via call.getRemoteStream() ✓');
                return s;
              }
            }
          } catch (e) {}

          console.warn('[Twilio] No remote stream found. Gemini will use browser mic as fallback.');
          return null;
        };

        setTimeout(() => {
          const remoteStream = tryGetRemoteStream();
          onConnect?.({ id: callId, remoteStream });
        }, 1500);
      });
      call.on('disconnect', () => {
        onStatusChange("ended");
        onDisconnect?.();
        this.activeCall = null;
      });
      call.on('reject', () => {
        onStatusChange("ended");
        onDisconnect?.();
        this.activeCall = null;
      });
      onStatusChange("ringing");
    } catch (err) {
      console.error("[Twilio] Real calling failed:", err.message);
      onStatusChange("ended");
      onDisconnect?.();
      callbacks.onError?.(err.message);
    }
  }
  hangup() {
    if (this.fallbackAdapter) {
      this.fallbackAdapter.hangup();
      this.fallbackAdapter = null;
      return;
    }
    if (this.activeCall) {
      this.activeCall.disconnect();
      this.activeCall = null;
    }
    if (this.device) {
      if (this.currentProcessor) {
        try { this.device.audio.removeProcessor(this.currentProcessor, false); } catch (e) {}
        this.currentProcessor = null;
      }
      this.device.destroy();
      this.device = null;
    }
  }
  setAudioInputStream(stream) {
    if (this.fallbackAdapter) {
      this.fallbackAdapter.setAudioInputStream(stream);
      return;
    }
    if (!this.device) return;
    if (this.currentProcessor) {
      try { this.device.audio.removeProcessor(this.currentProcessor, false); } catch (e) {}
      this.currentProcessor = null;
    }
    if (stream) {
      this.currentProcessor = {
        async createProcessedStream() {
          const AC = window.AudioContext || window.webkitAudioContext;
          const ctx = new AC();
          const dest = ctx.createMediaStreamDestination();
          const source1 = ctx.createMediaStreamSource(stream);
          source1.connect(dest);
          this.ctx = ctx;
          return dest.stream;
        },
        async destroyProcessedStream() {
          if (this.ctx) {
            await this.ctx.close();
            this.ctx = null;
          }
        }
      };
      this.device.audio.addProcessor(this.currentProcessor, false);
    }
  }
  getLogs(phoneNumber) {
    if (this.fallbackAdapter) {
      return [
        { timestamp: new Date().toLocaleTimeString(), message: `[Twilio fallback ➔ Mock] Real calling unavailable. Defaulting to mock trace.` },
        ...this.fallbackAdapter.getLogs(phoneNumber)
      ];
    }
    return [
      { timestamp: new Date().toLocaleTimeString(), message: `[Twilio WebRTC] Querying capability token from helper server...` },
      { timestamp: new Date().toLocaleTimeString(), message: `[Twilio WebRTC] Device registered. WebRTC audio bridge ready.` },
      { timestamp: new Date().toLocaleTimeString(), message: `[Twilio WebRTC] Outbound SIP dial initiated to ${phoneNumber}` }
    ];
  }
}

export class TelephonyService {
  constructor() {
    this.adapters = { mock: new MockTelephonyAdapter(), twilio: new TwilioAdapter() };
    this.activeProvider = 'mock';
  }
  setProvider(provider) {
    if (this.adapters[provider]) this.activeProvider = provider;
  }
  getProvider() { return this.adapters[this.activeProvider]; }
  dial(phoneNumber, callbacks) { this.getProvider().dial(phoneNumber, callbacks); }
  hangup() { this.getProvider().hangup(); }
  setAudioInputStream(stream) { this.getProvider().setAudioInputStream(stream); }
  getLogs(phoneNumber) { return this.getProvider().getLogs(phoneNumber); }
}

export const telephonyService = new TelephonyService();
export default telephonyService;
