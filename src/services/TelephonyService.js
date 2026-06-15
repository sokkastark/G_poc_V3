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
    
    // Simulate Ringing after 1s
    const ringTimeout = setTimeout(() => {
      onStatusChange("ringing");
      
      // Simulate Connection after another 1.5s
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
      if (this.activeCall.timeouts) {
        this.activeCall.timeouts.forEach(clearTimeout);
      }
      this.activeCall.onDisconnect?.();
      this.activeCall = null;
    }
  }

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
  }

  async dial(phoneNumber, callbacks) {
    const { onStatusChange, onConnect, onDisconnect } = callbacks;
    onStatusChange("dialing");

    try {
      // 1. Fetch capability token from local node server or relative API path
      const apiBase = window.location.origin.includes('localhost') ? 'http://localhost:5000' : '';
      const res = await fetch(`${apiBase}/api/telephony/token`);
      if (!res.ok) {
        throw new Error("Local token server returned status error.");
      }
      const data = await res.json();
      if (!data.token) {
        throw new Error("No token returned from server.");
      }

      // 2. Initialize Twilio Client Device
      this.device = new Device(data.token, {
        logLevel: 'debug',
        codecPreferences: ['pcmu', 'opus']
      });

      this.device.on('error', (err) => {
        console.error('[Twilio Device Error]', err);
        onStatusChange("ended");
        onDisconnect?.();
      });

      await this.device.register();

      // 3. Connect outbound call
      const call = await this.device.connect({
        params: { To: phoneNumber }
      });

      this.activeCall = call;

      call.on('accept', () => {
        onStatusChange("in-progress");
        onConnect?.({ id: call.parameters.CallSid || `twilio-${Date.now()}` });
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
      console.warn("[Twilio] Real calling failed or not configured, falling back to Mock Telephony:", err.message);
      
      // Instantiate a mock fallback so campaign behaves identically
      this.fallbackAdapter = new MockTelephonyAdapter();
      this.fallbackAdapter.dial(phoneNumber, callbacks);
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
      this.device.destroy();
      this.device = null;
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
    this.adapters = {
      mock: new MockTelephonyAdapter(),
      twilio: new TwilioAdapter()
    };
    this.activeProvider = 'mock';
  }

  setProvider(provider) {
    if (this.adapters[provider]) {
      this.activeProvider = provider;
    }
  }

  getProvider() {
    return this.adapters[this.activeProvider];
  }

  dial(phoneNumber, callbacks) {
    this.getProvider().dial(phoneNumber, callbacks);
  }

  hangup() {
    this.getProvider().hangup();
  }

  getLogs(phoneNumber) {
    return this.getProvider().getLogs(phoneNumber);
  }
}

export const telephonyService = new TelephonyService();
export default telephonyService;
