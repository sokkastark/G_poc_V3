// useSpeech.js - Hook managing simulated and real voice calls using Telephony and Voice Services
import { useState, useEffect, useCallback, useRef } from 'react';
import geminiVoiceService from '../services/GeminiVoiceService';
import telephonyService from '../services/TelephonyService';
import db from '../services/DbService';
import { GEMINI_API_KEY } from '../config';

export function useSpeech(activeFlow, onOutcomeCaptured) {
  const [callState, setCallState] = useState('idle');
  const [transcript, setTranscript] = useState([]);
  const [detectedIntent, setDetectedIntent] = useState(null);
  const [activeItem, setActiveItem] = useState(null);
  const [speechError, setSpeechError] = useState(null);
  const [telephonyLogs, setTelephonyLogs] = useState([]);

  const activeItemRef = useRef(null);
  const activeFlowRef = useRef(activeFlow);
  const onOutcomeCapturedRef = useRef(onOutcomeCaptured);
  const silenceTimeoutRef = useRef(null);
  const hasAskedAgain = useRef(false);
  const callStartTimeRef = useRef(null);
  const callConnectedTimeRef = useRef(null);
  const outcomeCapturedRef = useRef(false);

  useEffect(() => {
    activeItemRef.current = activeItem;
    activeFlowRef.current = activeFlow;
    onOutcomeCapturedRef.current = onOutcomeCaptured;
  }, [activeItem, activeFlow, onOutcomeCaptured]);

  useEffect(() => {
    return () => {
      geminiVoiceService.endSession();
      telephonyService.hangup();
      if (silenceTimeoutRef.current) clearTimeout(silenceTimeoutRef.current);
    };
  }, []);

  const clearSilenceTimer = useCallback(() => {
    if (silenceTimeoutRef.current) {
      clearTimeout(silenceTimeoutRef.current);
      silenceTimeoutRef.current = null;
    }
  }, []);

  const getDuration = () => {
    if (!callConnectedTimeRef.current) return 0;
    return Math.round((Date.now() - callConnectedTimeRef.current) / 1000);
  };

  const startSilenceTimer = useCallback(() => {
    clearSilenceTimer();
    silenceTimeoutRef.current = setTimeout(() => {
      if (hasAskedAgain.current) {
        addMessage('agent', "No response received. Disconnecting call.");
        const duration = getDuration();
        outcomeCapturedRef.current = true;
        onOutcomeCapturedRef.current?.(activeItemRef.current?.id, 'No Answer', duration);
        endCall();
      } else {
        hasAskedAgain.current = true;
        addMessage('agent', "Hello? Are you still there? Please confirm or reschedule your appointment.");
        geminiVoiceService.sendPrompt("Are you still there? Please say if you want to confirm, cancel or reschedule.");
      }
    }, 10000);
  }, [clearSilenceTimer]);

  const addMessage = useCallback((role, message) => {
    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setTranscript(prev => [...prev, { id: `tr-${Date.now()}`, role, message, timestamp }]);
    if (activeItemRef.current) db.addTranscript(activeItemRef.current.id, role, message);
    if (role === 'patient' || role === 'user') {
      hasAskedAgain.current = false;
      if (silenceTimeoutRef.current) startSilenceTimer();
    }
  }, [startSilenceTimer]);

  useEffect(() => {
    if (callState === 'listening') startSilenceTimer();
    else clearSilenceTimer();
    if (callState === 'idle') hasAskedAgain.current = false;
  }, [callState, startSilenceTimer, clearSilenceTimer]);

  const handleFunctionCall = useCallback((name, args) => {
    const item = activeItemRef.current;
    if (!item) return;
    let outcome = 'Other';
    if (name === 'confirm_appointment') { setDetectedIntent('CONFIRM'); outcome = 'Confirmed'; }
    else if (name === 'cancel_appointment') { setDetectedIntent('CANCEL'); outcome = 'Cancelled'; }
    else if (name === 'reschedule_appointment') { setDetectedIntent('RESCHEDULE'); outcome = 'Rescheduled'; }
    else if (name === 'wrong_number') { setDetectedIntent('WRONG_NUMBER'); outcome = 'Wrong Number'; }
    else if (name === 'left_message') { setDetectedIntent('LEFT_MESSAGE'); outcome = 'Left Message'; }
    else if (name === 'hang_up') {
      const delay = geminiVoiceService.getRemainingPlaybackTime();
      setTimeout(() => endCall(), delay + 800);
      return;
    }
    const duration = getDuration();
    outcomeCapturedRef.current = true;
    onOutcomeCapturedRef.current?.(item.id, outcome, duration);
  }, []);

  function startCall(queueItem) {
    setActiveItem(queueItem);
    activeItemRef.current = queueItem;
    setTranscript([]);
    setDetectedIntent(null);
    setSpeechError(null);
    callStartTimeRef.current = Date.now();
    callConnectedTimeRef.current = null;
    outcomeCapturedRef.current = false;

    db.addActivityLog(`Call started to ${queueItem.patientName} (${queueItem.phone})`);
    const logs = telephonyService.getLogs(queueItem.phone);
    setTelephonyLogs(logs);

    telephonyService.dial(queueItem.phone, {
      onStatusChange: (status) => {
        setCallState(status);
        setTelephonyLogs(prev => [...prev, { timestamp: new Date().toLocaleTimeString(), message: `Telephony Status: ${status.toUpperCase()}` }]);
      },
      onError: (err) => {
        setSpeechError("Telephony Error: " + err);
        setTelephonyLogs(prev => [...prev, { timestamp: new Date().toLocaleTimeString(), message: `Telephony Error: ${err}` }]);
        onOutcomeCapturedRef.current?.(queueItem.id, 'No Answer', 0);
      },
      onConnect: (session) => {
        setCallState('active');
        callConnectedTimeRef.current = Date.now();
        db.addActivityLog(`Call connected to ${queueItem.patientName}`);
        const flow = activeFlowRef.current;
        const slotsDesc = "ID: slot-1: Monday 10:00 AM, ID: slot-2: Monday 12:00 PM, ID: slot-3: Tuesday 09:00 AM";
        const isMock = telephonyService.activeProvider === 'mock';
        const waitRule = isMock ? '' : `
          - TELEPHONY CALL ENVIRONMENT (REAL OUTBOUND CALL CONTEXT):
            1. You are on a real phone call via Twilio.
            2. At first, you will hear a Twilio Trial / Demo Warning (e.g. "You are using a Twilio trial account. Upgrade to remove this..."). You MUST ignore this warning completely and remain silent!
            3. After the warning, you will hear phone ringing tones. You MUST ignore these ringing sounds completely and remain silent!
            4. DO NOT speak first. Do not say your greeting when the call connects, during the warning, or during the ringing.
            5. Wait until a human answers the call and speaks (e.g. says "Hello?", "Yes?", "Who is this?"). Only then, respond with the Greeting.
            6. If you hear an automated operator, busy tone, or IVR message indicating the number is unreachable or busy (e.g. "The number you have dialed is not reachable", "is busy", "is out of service"), or if there is no response/silence at all from the other side, you MUST immediately call the "wrong_number" tool to update the status, and then call the "hang_up" tool to disconnect.
        `;
        
        const instruction = `
          You are "Guardian", a warm, empathetic care coordinator. Calling regarding "${flow.name}" for patient "${queueItem.patientName}".
          Greeting: "${flow.initialGreeting(queueItem.patientName)}"
          Steps:
          ${Object.entries(flow.steps).map(([k, s]) => `- ${k}: "${s.question}"`).join('\n')}
          Reschedule Slots: ${slotsDesc}
          Rules:
          ${waitRule}
          - Speak naturally. Keep responses short (1-2 sentences).
          - Map patient replies to these tools:
            - Confirm -> "confirm_appointment"
            - Cancel -> "cancel_appointment"
            - Reschedule -> "reschedule_appointment" with slot_id
            - Wrong number -> "wrong_number"
            - Message left -> "left_message"
            - End call -> "hang_up"
        `;

        geminiVoiceService.startSession(GEMINI_API_KEY, queueItem, instruction, {
          onCallStateChange: (state) => setCallState(state),
          onTranscriptUpdate: (role, text) => addMessage(role, text),
          onFunctionCall: (name, args) => handleFunctionCall(name, args),
          // CRITICAL: This fires AFTER startRecording() completes inside ws.onopen,
          // so agentAudioDestination is guaranteed to exist at this point.
          // This is the correct moment to route Gemini's audio output to Twilio.
          onAudioOutputReady: (audioStream) => {
            if (audioStream) {
              console.log('[useSpeech] Gemini audio output stream ready → routing to Twilio.');
              telephonyService.setAudioInputStream(audioStream);
            }
          },
          onRecordingComplete: (dataUrl) => {
            if (activeItemRef.current) db.addCallRecording(activeItemRef.current.id, dataUrl);
          },
          onError: (err) => {
            setSpeechError(err);
            setCallState('ended');
            const duration = getDuration();
            outcomeCapturedRef.current = true;
            onOutcomeCapturedRef.current?.(queueItem.id, 'No Answer', duration);
            setTimeout(() => { setCallState('idle'); setActiveItem(null); }, 2000);
          }
        }, session?.remoteStream, !isMock);
        // NOTE: Do NOT call getAudioOutputStream() here — it returns null because
        // the WebSocket hasn't opened yet. Use onAudioOutputReady callback instead.

      },
      onDisconnect: () => { endCall(); }
    });
  }

  function endCall() {
    // Immediately clear silence timers and reset refs so the UI responds instantly
    clearSilenceTimer();
    const duration = getDuration();
    const item = activeItemRef.current;
    // Clear the ref immediately to prevent double-calls
    activeItemRef.current = null;
    callConnectedTimeRef.current = null;
    if (item && !outcomeCapturedRef.current) {
      outcomeCapturedRef.current = true;
      const finalOutcome = callConnectedTimeRef.current ? 'Other' : 'No Answer';
      onOutcomeCapturedRef.current?.(item.id, finalOutcome, duration);
      db.addActivityLog(`Call ended to ${item.patientName}. Duration: ${duration}s. Outcome: ${finalOutcome}.`);
    } else if (item) {
      db.addActivityLog(`Call ended to ${item.patientName}. Duration: ${duration}s.`);
    }
    // Hang up telephony first (kills the Twilio WebRTC call), then clean up Gemini
    telephonyService.setAudioInputStream(null);
    telephonyService.hangup();
    geminiVoiceService.endSession();
    setCallState('ended');
    setTimeout(() => { setCallState('idle'); setActiveItem(null); }, 1500);
  }

  return {
    callState, transcript, detectedIntent, activeItem, speechError, telephonyLogs, startCall, endCall
  };
}
export default useSpeech;
