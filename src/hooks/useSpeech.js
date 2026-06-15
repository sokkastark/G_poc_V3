// useSpeech.js - Hook managing simulated and real voice calls using Telephony and Voice Services
import { useState, useEffect, useCallback, useRef } from 'react';
import geminiVoiceService from '../services/GeminiVoiceService';
import telephonyService from '../services/TelephonyService';
import db from '../services/DbService';
import { GEMINI_API_KEY } from '../config';

export function useSpeech(activeFlow, onOutcomeCaptured) {
  const [callState, setCallState] = useState('idle'); // idle, dialing, ringing, active, speaking, listening, ended
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

  const startSilenceTimer = useCallback(() => {
    clearSilenceTimer();
    silenceTimeoutRef.current = setTimeout(() => {
      if (hasAskedAgain.current) {
        addMessage('agent', "No response received. Disconnecting call.");
        if (onOutcomeCapturedRef.current && activeItemRef.current) {
          onOutcomeCapturedRef.current(activeItemRef.current.id, 'No Answer');
        }
        endCall();
      } else {
        hasAskedAgain.current = true;
        addMessage('agent', "Hello? Are you still there? Please confirm or reschedule your appointment.");
        geminiVoiceService.sendPrompt("Are you still there? Please say if you want to confirm, cancel or reschedule.");
      }
    }, 10000); // 10 seconds timeout
  }, [clearSilenceTimer]);

  const addMessage = useCallback((role, message) => {
    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setTranscript(prev => [...prev, { id: `tr-${Date.now()}`, role, message, timestamp }]);
    
    if (activeItemRef.current) {
      db.addTranscript(activeItemRef.current.id, role, message);
    }

    if (role === 'patient' || role === 'user') {
      hasAskedAgain.current = false;
      // Restart timer if currently listening
      if (silenceTimeoutRef.current) {
        startSilenceTimer();
      }
    }
  }, [startSilenceTimer]);

  useEffect(() => {
    if (callState === 'listening') {
      startSilenceTimer();
    } else {
      clearSilenceTimer();
    }
    if (callState === 'idle') {
      hasAskedAgain.current = false;
    }
  }, [callState, startSilenceTimer, clearSilenceTimer]);

  const handleFunctionCall = useCallback((name, args) => {
    const item = activeItemRef.current;
    if (!item) return;

    let outcome = 'Other';
    if (name === 'confirm_appointment') {
      setDetectedIntent('CONFIRM');
      outcome = 'Confirmed';
    } else if (name === 'cancel_appointment') {
      setDetectedIntent('CANCEL');
      outcome = 'Cancelled';
    } else if (name === 'reschedule_appointment') {
      setDetectedIntent('RESCHEDULE');
      outcome = 'Rescheduled';
    } else if (name === 'wrong_number') {
      setDetectedIntent('WRONG_NUMBER');
      outcome = 'Wrong Number';
    } else if (name === 'left_message') {
      setDetectedIntent('LEFT_MESSAGE');
      outcome = 'Left Message';
    } else if (name === 'hang_up') {
      const delay = geminiVoiceService.getRemainingPlaybackTime();
      setTimeout(() => endCall(), delay + 800);
      return;
    }

    if (onOutcomeCapturedRef.current) {
      onOutcomeCapturedRef.current(item.id, outcome);
    }
  }, []);

  function startCall(queueItem) {
    setActiveItem(queueItem);
    activeItemRef.current = queueItem;
    setTranscript([]);
    setDetectedIntent(null);
    setSpeechError(null);

    // Refresh Telephony Logs
    const logs = telephonyService.getLogs(queueItem.phone);
    setTelephonyLogs(logs);

    // Start dialing via TelephonyService
    telephonyService.dial(queueItem.phone, {
      onStatusChange: (status) => {
        setCallState(status);
        setTelephonyLogs(prev => [
          ...prev, 
          { timestamp: new Date().toLocaleTimeString(), message: `Telephony Status: ${status.toUpperCase()}` }
        ]);
      },
      onConnect: (session) => {
        setCallState('active');
        
        // Build dynamic system instruction
        const flow = activeFlowRef.current;
        const slotsDesc = "ID: slot-1: Monday 10:00 AM, ID: slot-2: Monday 12:00 PM, ID: slot-3: Tuesday 09:00 AM";
        const instruction = `
          You are "Guardian", a warm, empathetic automated care coordinator. 
          You are calling regarding: "${flow.name}" for patient "${queueItem.patientName}".
          
          Call Greeting: "${flow.initialGreeting(queueItem.patientName)}"
          
          Dialogue Flow Configuration Steps:
          ${Object.entries(flow.steps).map(([k, s]) => `- ${k}: "${s.question}"`).join('\n')}
          
          Available Reschedule Slots:
          ${slotsDesc}

          Dialogue Rules:
          - Speak naturally with a warm phone presence. Keep responses short (1-2 sentences).
          - Match patient replies to these intents and trigger tool calls:
            - If they confirm, call "confirm_appointment".
            - If they cancel, call "cancel_appointment".
            - If they request rescheduling, offer slots and call "reschedule_appointment" with slot_id.
            - If they say it is a wrong number, call "wrong_number".
            - If you leave a message, call "left_message".
            - When finished, say goodbye and call "hang_up".
        `;

        // Start Gemini Voice stream session
        geminiVoiceService.startSession(GEMINI_API_KEY, queueItem, instruction, {
          onCallStateChange: (state) => setCallState(state),
          onTranscriptUpdate: (role, text) => addMessage(role, text),
          onFunctionCall: (name, args) => handleFunctionCall(name, args),
          onRecordingComplete: (dataUrl) => {
            if (activeItemRef.current) {
              db.addCallRecording(activeItemRef.current.id, dataUrl);
            }
          },
          onError: (err) => {
            setSpeechError(err);
            setCallState('ended');
            if (onOutcomeCapturedRef.current) {
              onOutcomeCapturedRef.current(queueItem.id, 'No Answer');
            }
            setTimeout(() => {
              setCallState('idle');
              setActiveItem(null);
            }, 2000);
          }
        });
      },
      onDisconnect: () => {
        endCall();
      }
    });
  }

  function endCall() {
    geminiVoiceService.endSession();
    telephonyService.hangup();
    setCallState('ended');
    setTimeout(() => {
      setCallState('idle');
      setActiveItem(null);
    }, 1500);
  }

  return {
    callState,
    transcript,
    detectedIntent,
    activeItem,
    speechError,
    telephonyLogs,
    startCall,
    endCall
  };
}
export default useSpeech;
