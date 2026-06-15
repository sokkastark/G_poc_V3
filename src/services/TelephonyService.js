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
    this._originalGUM = null;   // saved real getUserMedia
    this._silentGUMCtx = null;  // AudioContext for silent mic stream
  }

  // Intercept navigator.mediaDevices.getUserMedia so Twilio SDK gets a
  // silent MediaStream instead of requesting real mic permission.
  // In Twilio outbound-call mode, no one speaks from the browser —
  // Gemini's voice is routed to the patient via the Twilio AudioProcessor.
  _patchGUM() {
    if (this._originalGUM) return;
    this._originalGUM = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
    const self = this;
    navigator.mediaDevices.getUserMedia = async (constraints) => {
      if (constraints?.audio) {
        console.log('[Twilio] getUserMedia intercepted → returning silent stream (no mic permission needed)');
        self._silentGUMCtx = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 16000 });
        return self._silentGUMCtx.createMediaStreamDestination().stream;
      }
      return self._originalGUM(constraints);
    };
  }

  _restoreGUM() {
    if (this._originalGUM) {
      navigator.mediaDevices.getUserMedia = this._originalGUM;
      this._originalGUM = null;
    }
    if (this._silentGUMCtx) {
      try { this._silentGUMCtx.close(); } catch (e) {}
      this._silentGUMCtx = null;
    }
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
      // Patch getUserMedia BEFORE device.connect() so Twilio SDK never
      // requests real mic permission. The silent stream is used as the
      // "local mic" while Gemini's audio reaches the patient via AudioProcessor.
      this._patchGUM();
      const call = await this.device.connect({ params: { tocall: targetNumber } });
      this.activeCall = call;
      call.on('accept', () => {
        onStatusChange("in-progress");
        const callId = call.parameters?.CallSid || `twilio-${Date.now()}`;
        let resolved = false;

        // Resolve once — called with remoteStream (or null if unreachable/timeout)
        const finish = (stream) => {
          if (resolved) return;
          resolved = true;
          console.log('[Twilio] onConnect with remote stream:', stream ? 'YES ✓' : 'NULL (silent mode)');
          onConnect?.({ id: callId, remoteStream: stream });
        };

        // Attach ontrack listener to RTCPeerConnection.
        // This event fires exactly when Twilio negotiates the remote audio track.
        const attachTrackListener = () => {
          const pc = call._mediaHandler?.version?.pc
                   || call._mediaHandler?._pc
                   || call._peerConnection
                   || call._mediaHandler?.peerConnection;
          if (!pc) return false;
          // Check if tracks already exist (call was fast)
          const existing = (pc.getReceivers?.() || [])
            .map(r => r.track).filter(t => t?.kind === 'audio');
          if (existing.length) {
            finish(new MediaStream(existing));
            return true;
          }
          // Listen for the remote audio track
          pc.addEventListener('track', (ev) => {
            const s = ev.streams?.[0] || (ev.track ? new MediaStream([ev.track]) : null);
            if (s) finish(s);
          });
          return true;
        };

        // Try immediately; if PC not ready yet, poll briefly (max 3s)
        if (!attachTrackListener()) {
          let ticks = 0;
          const poll = setInterval(() => {
            if (attachTrackListener() || ++ticks > 30) clearInterval(poll);
          }, 100);
        }

        // 5-second hard timeout → null stream (unreachable, busy, no audio)
        setTimeout(() => finish(null), 5000);
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
    this._restoreGUM(); // Always restore getUserMedia on hangup
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
