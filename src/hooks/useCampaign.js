// useCampaign.js - Custom React hook encapsulating campaign queue state and filters
import { useState, useEffect, useMemo, useCallback } from 'react';
import useSpeech from './useSpeech';
import ConversationFlowService from '../services/DialogueManager'; // Wait, let's verify DialogueManager vs ConversationFlowService
import ConversationFlowServiceV2 from '../services/ConversationFlowService';
import telephonyService from '../services/TelephonyService';
import db from '../services/DbService';

export function useCampaign() {
  const [activeFlowId, setActiveFlowId] = useState('TOC_FOLLOW_UP');
  const [telephonyProvider, setTelephonyProvider] = useState('mock');
  const [queue, setQueue] = useState([]);
  const [rawCount, setRawCount] = useState(0);
  const [isQueueLocked, setIsQueueLocked] = useState(false);
  const [isCampaignRunning, setIsCampaignRunning] = useState(false);
  const [activeTab, setActiveTab] = useState('queue');
  const [viewingApt, setViewingApt] = useState(null);

  const [filters, setFilters] = useState({
    dateRange: 'all', practice: 'all', pcp: 'all', status: 'all', outcome: 'all', search: ''
  });

  const activeFlow = ConversationFlowServiceV2.getFlowById(activeFlowId);

  const handleOutcomeCaptured = useCallback((itemId, outcome, duration = null) => {
    setQueue(prev => {
      const item = prev.find(i => i.id === itemId);
      if (!item) return prev;
      import('../services/WorkflowEngine').then(({ WorkflowEngine }) => {
        const next = prev.map(i => i.id === itemId ? WorkflowEngine.processCallOutcome(item, outcome, 2, duration) : i);
        db.setAppointments(next);
        setQueue(next);
      });
      return prev;
    });
  }, []);


  const {
    callState, transcript, detectedIntent, activeItem, speechError, telephonyLogs,
    startCall, endCall
  } = useSpeech(activeFlow, handleOutcomeCaptured);

  const filteredQueue = useMemo(() => {
    return queue.filter(item => {
      if (filters.search) {
        const q = filters.search.toLowerCase();
        const n = String(item.patientName || '').toLowerCase(), p = String(item.patientId || '').toLowerCase(), ph = String(item.phone || '');
        if (!n.includes(q) && !p.includes(q) && !ph.includes(q)) return false;
      }
      if (filters.practice !== 'all' && item.practice !== filters.practice) return false;
      if (filters.pcp !== 'all' && item.pcp !== filters.pcp) return false;
      if (filters.status !== 'all' && item.status !== filters.status) return false;
      if (filters.outcome !== 'all') {
        if (filters.outcome === 'Pending' && item.outcome !== null) return false;
        if (filters.outcome !== 'Pending' && item.outcome !== filters.outcome) return false;
      }
      if (filters.dateRange !== 'all') {
        const itemDate = new Date(item.date), today = new Date();
        today.setHours(0, 0, 0, 0);
        const diffDays = Math.ceil(Math.abs(today - itemDate) / 86400000);
        if (filters.dateRange === 'today' && itemDate.toDateString() !== today.toDateString()) return false;
        if (filters.dateRange === '3days' && diffDays > 3) return false;
        if (filters.dateRange === '7days' && diffDays > 7) return false;
      }
      return true;
    });
  }, [queue, filters]);

  useEffect(() => {
    if (isCampaignRunning && callState === 'idle') {
      const nextItem = filteredQueue.find(item => item.status === 'Pending' || item.status === 'Retry Scheduled');
      if (nextItem) {
        const timer = setTimeout(() => handleStartCall(nextItem), 4000);
        return () => clearTimeout(timer);
      } else {
        setIsCampaignRunning(false);
      }
    }
  }, [isCampaignRunning, callState, filteredQueue]);

  const handleStartCall = (item) => {
    const nextQueue = queue.map(i => i.id === item.id ? { ...i, status: 'Calling' } : i);
    db.setAppointments(nextQueue);
    setQueue(nextQueue);
    startCall(item);
  };

  const handleQueueGenerated = (generatedQueue, initialRawCount) => {
    db.setAppointments(generatedQueue);
    setQueue(generatedQueue);
    setRawCount(initialRawCount);
    setIsQueueLocked(true);
  };

  const handleResetQueue = () => {
    setQueue([]);
    setRawCount(0);
    setIsQueueLocked(false);
    setIsCampaignRunning(false);
    telephonyService.hangup();
  };

  const handleRemoveQueueItem = (itemId) => {
    const nextQueue = queue.filter(i => i.id !== itemId);
    db.setAppointments(nextQueue);
    setQueue(nextQueue);
  };

  return {
    activeFlowId, setActiveFlowId,
    telephonyProvider, setTelephonyProvider,
    queue, setQueue,
    rawCount, setRawCount,
    isQueueLocked, setIsQueueLocked,
    isCampaignRunning, setIsCampaignRunning,
    activeTab, setActiveTab,
    viewingApt, setViewingApt,
    filters, setFilters,
    filteredQueue,
    activeFlow,
    callState, transcript, detectedIntent, activeItem, speechError, telephonyLogs,
    startCall, endCall,
    handleStartCall, handleQueueGenerated, handleResetQueue, handleRemoveQueueItem, handleOutcomeCaptured
  };
}

export default useCampaign;
