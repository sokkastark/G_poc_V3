// App.jsx - Main Application Coordinator Page
import { useState } from 'react';
import useLocalDb from './hooks/useLocalDb';
import useSpeech from './hooks/useSpeech';

// UI components
import StatsPanel from './components/dashboard/StatsPanel';
import AppointmentTable from './components/dashboard/AppointmentTable';
import NotificationPanel from './components/dashboard/NotificationPanel';
import ConsoleOverlay from './components/voice/ConsoleOverlay';
import TranscriptView from './components/voice/TranscriptView';

import './styles/main.scss';

export function App() {
  const { appointments, notifications, activityLogs, resetDatabase } = useLocalDb();
  const [viewingApt, setViewingApt] = useState(null);

  const {
    callState, transcript, detectedIntent, activeApt, speechError, rescheduleSlots,
    startCall, endCall, executeReschedule
  } = useSpeech();

  const getHistoricalTranscript = () => {
    if (!viewingApt) return [];
    return window.localStorage.getItem('guardian_voice_db') 
      ? JSON.parse(window.localStorage.getItem('guardian_voice_db')).transcripts.filter(t => t.appointmentId === viewingApt.id)
      : [];
  };

  return (
    <div className="d-flex w-100 min-vh-100">
      
      {/* 1. Velzon Vertical Left Sidebar */}
      <aside className="velzon-sidebar">
        <div className="sidebar-logo-container py-4 px-3 d-flex align-items-center gap-2">
          <div 
            className="bg-primary rounded-circle d-flex align-items-center justify-content-center text-white font-monospace fw-bold"
            style={{ width: '32px', height: '32px', fontSize: '1.1rem' }}
          >
            G
          </div>
          <div>
            <h6 className="mb-0 fw-bold text-white tracking-wider">GUARDIAN</h6>
            <small className="text-white-50" style={{ fontSize: '0.65rem' }}>HEALTHCARE SYSTEMS</small>
          </div>
        </div>

        <nav className="mt-4 flex-grow-1">
          <a href="#" className="sidebar-link active">
            <i className="bi bi-speedometer2"></i>
            <span>Analytics Dashboard</span>
          </a>
          <a href="#" className="sidebar-link">
            <i className="bi bi-person-lines-fill"></i>
            <span>Patient Database</span>
          </a>
          <a href="#" className="sidebar-link">
            <i className="bi bi-telephone-inbound"></i>
            <span>Voice Console</span>
          </a>
          <a href="#" className="sidebar-link">
            <i className="bi bi-gear"></i>
            <span>System Settings</span>
          </a>
        </nav>
        
        <div className="p-3 border-top border-light border-opacity-10 text-center">
          <small className="text-secondary" style={{ fontSize: '0.7rem' }}>POC Client v1.0.0</small>
        </div>
      </aside>

      {/* 2. Velzon Right Side Container */}
      <div className="velzon-main-content flex-grow-1">
        
        {/* Top Navbar */}
        <header className="velzon-navbar d-flex justify-content-between align-items-center">
          <div className="position-relative d-flex align-items-center">
            <span className="position-absolute text-secondary" style={{ left: '12px', top: '9px', zIndex: 5 }}>
              <i className="bi bi-search"></i>
            </span>
            <input 
              type="text" 
              className="form-control form-control-sm velzon-search-input" 
              placeholder="Search appointments, patients..." 
              style={{ width: '280px' }}
              disabled
            />
          </div>

          <div className="d-flex gap-2 align-items-center">
            <span className="badge bg-success bg-opacity-10 text-success border border-success border-opacity-25 py-2 px-3 d-flex align-items-center gap-1">
              <span className="pulse-active rounded-circle bg-success d-inline-block" style={{ width: '8px', height: '8px' }}></span>
              Gemini 2.0 Live Voice Agent
            </span>
            <button 
              type="button" 
              className="btn btn-sm btn-outline-danger border-opacity-50"
              onClick={resetDatabase}
            >
              <i className="bi bi-arrow-counterclockwise me-1"></i>
              Reset DB
            </button>
          </div>
        </header>

        {/* Page Content Workspace */}
        <main className="p-4 flex-grow-1">
          {/* Breadcrumb Header */}
          <div className="d-flex justify-content-between align-items-center mb-4">
            <div>
              <h5 className="mb-0 fw-bold text-dark uppercase tracking-wider">ANALYTICS</h5>
              <div className="small text-secondary" style={{ fontSize: '0.75rem' }}>
                <span className="text-primary">Guardian</span> / <span className="text-secondary">Dashboard</span>
              </div>
            </div>
            <div className="text-secondary small">
              <i className="bi bi-calendar-day me-1"></i> Today's Schedule Board
            </div>
          </div>

          {/* Stats Section */}
          <StatsPanel appointments={appointments} />

          {/* Table & Timeline Queue Grid */}
          <div className="row g-4 align-items-stretch" style={{ minHeight: 'calc(100vh - 270px)' }}>
            <div className="col-12 col-lg-8">
              <AppointmentTable
                appointments={appointments}
                activeAptId={activeApt?.id}
                callState={callState}
                onStartCall={startCall}
                onViewLogs={setViewingApt}
              />
            </div>
            
            <div className="col-12 col-lg-4">
              <NotificationPanel
                notifications={notifications}
                activityLogs={activityLogs}
              />
            </div>
          </div>
        </main>
      </div>

      {/* Voice Call overlay console */}
      <ConsoleOverlay
        callState={callState}
        transcript={transcript}
        detectedIntent={detectedIntent}
        activeApt={activeApt}
        rescheduleSlots={rescheduleSlots}
        speechError={speechError}
        onEndCall={endCall}
        onExecuteReschedule={executeReschedule}
      />

      {/* Historic Logs Modal */}
      {viewingApt && (() => {
        const currentViewingApt = appointments.find(a => a.id === viewingApt.id) || viewingApt;
        return (
          <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(3px)', zIndex: 1060 }}>
            <div className="modal-dialog modal-dialog-centered modal-dialog-scrollable">
              <div className="modal-content bg-white text-dark border glass-card">
                <div className="modal-header card-header-velzon">
                  <h6 className="modal-title fw-bold text-primary mb-0">
                    <i className="bi bi-chat-left-text me-2"></i>
                    Conversation History
                  </h6>
                  <button type="button" className="btn-close" onClick={() => setViewingApt(null)} aria-label="Close"></button>
                </div>
                <div className="modal-body custom-scroll">
                  <div className="mb-3 text-secondary small">
                    <div><strong>Patient:</strong> {currentViewingApt.patientName}</div>
                    <div><strong>Doctor:</strong> {currentViewingApt.doctorName}</div>
                    <div><strong>Current Status:</strong> {currentViewingApt.status}</div>
                  </div>
                  {currentViewingApt.recordingUrl && (
                    <div className="mb-3 bg-light p-3 rounded border">
                      <label className="form-label small fw-bold text-primary mb-2 d-flex align-items-center gap-1">
                        <i className="bi bi-play-circle-fill"></i> Call Recording Playback
                      </label>
                      <audio src={currentViewingApt.recordingUrl} className="w-100" controls />
                    </div>
                  )}
                  <hr />
                  <TranscriptView transcript={getHistoricalTranscript()} />
                </div>
                <div className="modal-footer border-top">
                  <button type="button" className="btn btn-secondary" onClick={() => setViewingApt(null)}>Close</button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}

export default App;
