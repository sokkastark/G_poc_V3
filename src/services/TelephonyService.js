// TelephonyService.js - Abstraction layer for telephony providers (Mock & optional Twilio WebRTC)
import { Device } from '@twilio/voice-sdk';

class MockTelephonyAdapter {
  constructor() {
    this.name = "Mock Telephony Provider";
    this.activeCall = null;
  }
  dial(phoneNumber, { onStatusChange, onConnect, onDisconnect }) {
    onStatusChange("dialing");
    const t1 = setTimeout(() => {
      onStatusChange("ringing");
      const t2 = setTimeout(() => {
        onStatusChange("in-progress");
        this.activeCall = { id: `call-${Math.random().toString(36).substring(2, 11)}`, phone: phoneNumber };
        onConnect?.(this.activeCall);
      }, 1500);
      this.activeCall.timeouts.push(t2);
    }, 1000);
    this.activeCall = { id: 'pending', phone: phoneNumber, timeouts: [t1], onDisconnect };
  }
  hangup() {
    if (this.activeCall) {
      this.activeCall.timeouts?.forEach(clearTimeout);
      this.activeCall.onDisconnect?.();
      this.activeCall = null;
    }
  }
  setAudioInputStream(stream) {}
  getLogs(phoneNumber) {
    const t = () => new Date().toLocaleTimeString();
    return [
      { timestamp: t(), message: `[Mock] Initializing SIP invite to ${phoneNumber}` },
      { timestamp: t(), message: `[Mock] Status 100 Trying` },
      { timestamp: t(), message: `[Mock] Status 180 Ringing` },
      { timestamp: t(), message: `[Mock] Call answered. Bridging audio channels.` }
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
    this._originalGUM = null;
    this._silentGUMCtx = null;
  }

  _patchGUM() {
    if (this._originalGUM) return;
    this._originalGUM = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
    navigator.mediaDevices.getUserMedia = async (c) => {
      if (c?.audio) {
        this._silentGUMCtx = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 16000 });
        return this._silentGUMCtx.createMediaStreamDestination().stream;
      }
      return this._originalGUM(c);
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
    const { onStatusChange, onDisconnect } = callbacks;
    onStatusChange("dialing");

    // Twilio webhooks require a publicly accessible HTTPS URL.
    // On localhost, Twilio cannot call back — block immediately with a clear message.
    if (window.location.origin.includes('localhost') || window.location.origin.includes('127.0.0.1')) {
      console.warn('[Twilio] Blocked: Twilio does not work on localhost. Deploy to Vercel to use Twilio mode.');
      onStatusChange("ended");
      onDisconnect?.();
      callbacks.onError?.('Twilio Voice only works on the live deployed site (Vercel). Please switch to Mock Telephony for local development.');
      return;
    }

    try {
      const apiBase = '';
      const res = await fetch(`${apiBase}/api/telephony/token`);
      if (!res.ok) throw new Error("Local token server returned status error.");
      const data = await res.json();
      if (!data.token) throw new Error("No token returned from server.");

      let country = '91';
      try {
        const statusRes = await fetch(`${apiBase}/api/telephony/status`);
        if (statusRes.ok) {
          const statusData = await statusRes.json();
          const cid = statusData.callerId || '';
          if (cid.startsWith('+1')) country = '1';
          else if (cid.startsWith('+91')) country = '91';
          else {
            const m = cid.match(/^\+(\d{1,3})/);
            if (m) country = m[1];
          }
        }
      } catch (e) {
        console.warn('[Twilio] Error fetching callerId status:', e);
      }

      this.device = new Device(data.token, { logLevel: 'debug', codecPreferences: ['pcmu', 'opus'] });
      this.device.on('error', (err) => {
        console.error('[Twilio Device Error]', err);
        onStatusChange("ended");
        onDisconnect?.();
      });
      await this.device.register();

      let targetNumber = phoneNumber.trim();
      const hasPlus = targetNumber.startsWith('+');
      const digits = targetNumber.replace(/\D/g, '');
      targetNumber = (hasPlus ? '+' : '') + digits;
      if (!targetNumber.startsWith('+')) {
        if (digits.length === 10) targetNumber = `+${country}${digits}`;
        else if (digits.length === (10 + country.length) && digits.startsWith(country)) targetNumber = `+${digits}`;
        else if (digits.length === 11 && digits.startsWith('1')) targetNumber = `+${digits}`;
        else if (digits.length === 12 && digits.startsWith('91')) targetNumber = `+${digits}`;
        else targetNumber = `+${digits}`;
      }

      this._patchGUM();
      const call = await this.device.connect({ params: { tocall: targetNumber } });
      this.activeCall = call;

      call.on('accept', () => {
        onStatusChange("in-progress");
        const callId = call.parameters?.CallSid || `twilio-${Date.now()}`;
        let resolved = false;

        const finish = (stream) => {
          if (resolved) return;
          resolved = true;
          onConnect?.({ id: callId, remoteStream: stream });
        };

        const attachTrackListener = () => {
          const pc = call._mediaHandler?.version?.pc
                   || call._mediaHandler?._pc
                   || call._peerConnection
                   || call._mediaHandler?.peerConnection;
          if (!pc) return false;
          const existing = (pc.getReceivers?.() || []).map(r => r.track).filter(t => t?.kind === 'audio');
          if (existing.length) {
            finish(new MediaStream(existing));
            return true;
          }
          pc.addEventListener('track', (ev) => {
            const s = ev.streams?.[0] || (ev.track ? new MediaStream([ev.track]) : null);
            if (s) finish(s);
          });
          return true;
        };

        if (!attachTrackListener()) {
          let ticks = 0;
          const poll = setInterval(() => {
            if (attachTrackListener() || ++ticks > 30) clearInterval(poll);
          }, 100);
        }

        setTimeout(() => finish(null), 5000);
      });

      const cleanup = () => { onStatusChange("ended"); onDisconnect?.(); this.activeCall = null; };
      call.on('disconnect', cleanup);
      call.on('reject', cleanup);
      onStatusChange("ringing");
    } catch (err) {
      console.error("[Twilio] Real calling failed:", err.message);
      onStatusChange("ended");
      onDisconnect?.();
      callbacks.onError?.(err.message);
    }
  }

  hangup() {
    this._restoreGUM();
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
    if (this.fallbackAdapter) return this.fallbackAdapter.setAudioInputStream(stream);
    if (!this.device) return;
    if (this.currentProcessor) {
      try { this.device.audio.removeProcessor(this.currentProcessor, false); } catch (e) {}
      this.currentProcessor = null;
    }
    if (stream) {
      this.currentProcessor = { createProcessedStream: async () => stream, destroyProcessedStream: async () => {} };
      this.device.audio.addProcessor(this.currentProcessor, false);
    }
  }

  getLogs(phoneNumber) {
    const t = () => new Date().toLocaleTimeString();
    if (this.fallbackAdapter) {
      return [
        { timestamp: t(), message: `[Twilio fallback ➔ Mock] Real calling unavailable. Defaulting to mock trace.` },
        ...this.fallbackAdapter.getLogs(phoneNumber)
      ];
    }
    return [
      { timestamp: t(), message: `[Twilio WebRTC] Querying capability token from helper server...` },
      { timestamp: t(), message: `[Twilio WebRTC] Device registered. WebRTC audio bridge ready.` },
      { timestamp: t(), message: `[Twilio WebRTC] Outbound SIP dial initiated to ${phoneNumber}` }
    ];
  }
}

export class TelephonyService {
  constructor() {
    this.adapters = { mock: new MockTelephonyAdapter(), twilio: new TwilioAdapter() };
    this.activeProvider = 'mock';
  }
  /** Returns true when running on localhost (Twilio won't work here). */
  static isLocalhost() {
    return window.location.origin.includes('localhost') || window.location.origin.includes('127.0.0.1');
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
