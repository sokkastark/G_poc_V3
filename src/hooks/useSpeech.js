// useSpeech.js - Hook managing real voice calls using Gemini Live WebSocket API
import { useState, useEffect, useCallback, useRef } from 'react';
import db from '../services/DbService';
import notificationService from '../services/NotificationService';
import geminiVoiceService from '../services/GeminiVoiceService';
import { GEMINI_API_KEY } from '../config';

export function useSpeech(onCallEndCallback) {
  const [callState, setCallState] = useState('idle'); // idle, calling, active, ended, speaking, listening
  const [transcript, setTranscript] = useState([]);
  const [detectedIntent, setDetectedIntent] = useState(null);
  const [activeApt, setActiveApt] = useState(null);
  const [speechError, setSpeechError] = useState(null);
  const [rescheduleSlots, setRescheduleSlots] = useState([]);

  const activeAptRef = useRef(null);
  const onCallEndCallbackRef = useRef(null);

  useEffect(() => {
    activeAptRef.current = activeApt;
    onCallEndCallbackRef.current = onCallEndCallback;
  }, [activeApt, onCallEndCallback]);

  useEffect(() => {
    return () => {
      geminiVoiceService.endSession();
    };
  }, []);

  const addMessage = useCallback((role, message) => {
    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setTranscript(prev => [...prev, { id: `tr-${Date.now()}`, role, message, timestamp }]);
    if (activeAptRef.current) {
      db.addTranscript(activeAptRef.current.id, role, message);
    }
  }, []);

  function handleGeminiFunctionCall(name, args) {
    const apt = activeAptRef.current;
    if (!apt) return;
    if (name === 'confirm_appointment') {
      setDetectedIntent('CONFIRM');
      db.updateAppointmentStatus(apt.id, 'Confirmed');
      notificationService.notifyDoctor(apt, 'Confirmed');
      db.addActivityLog(`Gemini Live: Patient confirmed appointment.`);
    } else if (name === 'cancel_appointment') {
      setDetectedIntent('CANCEL');
      db.updateAppointmentStatus(apt.id, 'Cancelled');
      notificationService.notifyDoctor(apt, 'Cancelled', args.reason);
      db.addActivityLog(`Gemini Live: Patient cancelled. Reason: ${args.reason}`);
    } else if (name === 'reschedule_appointment') {
      setDetectedIntent('RESCHEDULE');
      const slots = db.getAvailableSlots();
      const slot = slots.find(s => s.id === args.slot_id) || slots[0];
      db.rescheduleAppointment(apt.id, slot.id);
      db.addActivityLog(`Gemini Live: Rescheduled to ${slot.date} at ${slot.time}`);
    } else if (name === 'wrong_number') {
      setDetectedIntent('WRONG_NUMBER');
      db.updateAppointmentStatus(apt.id, 'Wrong Number');
      db.addActivityLog(`Gemini Live: Reported wrong number.`);
    } else if (name === 'left_message') {
      setDetectedIntent('LEFT_MESSAGE');
      db.updateAppointmentStatus(apt.id, 'Message Left');
      db.addActivityLog(`Gemini Live: Message left for patient.`);
    } else if (name === 'hang_up') {
      const delay = geminiVoiceService.getRemainingPlaybackTime();
      setTimeout(() => endCall(), delay + 800);
    }
  }

  function startCall(appointment) {
    setActiveApt(appointment);
    activeAptRef.current = appointment;
    setTranscript([]);
    setDetectedIntent(null);
    setSpeechError(null);
    setRescheduleSlots(db.getAvailableSlots());

    db.addActivityLog(`Outgoing Gemini Live call initiated for ${appointment.patientName}.`);
    
    geminiVoiceService.startSession(GEMINI_API_KEY, appointment, db.getAvailableSlots(), {
      onCallStateChange: (state) => setCallState(state),
      onTranscriptUpdate: (role, text) => addMessage(role, text),
      onFunctionCall: (name, args) => handleGeminiFunctionCall(name, args),
      onRecordingComplete: (dataUrl) => {
        if (activeAptRef.current) {
          db.addCallRecording(activeAptRef.current.id, dataUrl);
        }
      },
      onError: (err) => {
        setSpeechError(err);
        setCallState('ended');
        setTimeout(() => setCallState('idle'), 2000);
      }
    });
  }

  function endCall() {
    geminiVoiceService.endSession();
    setCallState('ended');
    setTimeout(() => setCallState('idle'), 1500);
    db.addActivityLog(`Call ended for patient ${activeAptRef.current?.patientName || ''}.`);
    if (onCallEndCallbackRef.current) onCallEndCallbackRef.current();
  }

  // Fallback for manual scheduling clicked on overlay
  function executeReschedule(slot) {
    const apt = activeAptRef.current;
    if (apt) {
      db.rescheduleAppointment(apt.id, slot.id);
      db.addActivityLog(`Manual dashboard rescheduling to ${slot.date} at ${slot.time}`);
      geminiVoiceService.endSession();
      setCallState('ended');
      setTimeout(() => setCallState('idle'), 1500);
    }
  }

  return {
    callState, transcript, detectedIntent, activeApt, speechError, rescheduleSlots,
    startCall, endCall, executeReschedule
  };
}

export default useSpeech;
