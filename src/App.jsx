// App.jsx - Main Coordinator for Guardian TOC Voice Agent V3
import useCampaign from './hooks/useCampaign';
import PipelineWizard from './components/dashboard/PipelineWizard';
import QueueReviewConsole from './components/dashboard/QueueReviewConsole';
import ResultsDashboard from './components/dashboard/ResultsDashboard';
import GlobalFilterBar from './components/dashboard/GlobalFilterBar';
import TopNavbar from './components/dashboard/TopNavbar';
import ConversationFlowService from './services/ConversationFlowService';
import telephonyService, { TelephonyService } from './services/TelephonyService';
import ConsoleOverlay from './components/voice/ConsoleOverlay';
import HistoricLogsModal from './components/voice/HistoricLogsModal';
import db from './services/DbService';

import './styles/main.scss';

export function App() {
  const {
    activeFlowId, setActiveFlowId,
    telephonyProvider, setTelephonyProvider,
    queue, rawCount, isQueueLocked,
    isCampaignRunning, setIsCampaignRunning,
    activeTab, setActiveTab,
    viewingApt, setViewingApt,
    filters, setFilters,
    filteredQueue,
    callState, transcript, detectedIntent, activeItem, speechError, telephonyLogs,
    endCall,
    handleStartCall, handleQueueGenerated, handleResetQueue, handleRemoveQueueItem
  } = useCampaign();

  return (
    <div className="d-flex flex-column w-100 min-vh-100 bg-light">
      <TopNavbar search={filters.search} onSearchChange={(val) => setFilters(prev => ({ ...prev, search: val }))} />

      <div className="velzon-main-content flex-grow-1 d-flex flex-column">
        <header className="bg-white border-bottom py-2 px-4 d-flex justify-content-between align-items-center flex-wrap gap-2">
          <div className="d-flex align-items-center gap-3 flex-wrap">
            <div className="d-flex align-items-center gap-2">
              <span className="small text-muted font-monospace uppercase">Telephony Adapter:</span>
              <select 
                className="form-select form-select-sm py-1 font-monospace" style={{ width: '180px' }}
                value={telephonyProvider} onChange={(e) => {
                  setTelephonyProvider(e.target.value);
                  telephonyService.setProvider(e.target.value);
                }}
              >
                <option value="mock">Mock Telephony (Dev)</option>
                <option value="twilio">Twilio Voice API</option>
              </select>
            </div>

            {telephonyProvider === 'mock' ? (
              <span className="badge bg-secondary bg-opacity-10 text-secondary border border-secondary border-opacity-25 font-monospace text-xs py-1 px-2 d-flex align-items-center gap-1">
                <span className="rounded-circle bg-secondary d-inline-block" style={{ width: '6px', height: '6px' }}></span>
                Mock Telephony Active
              </span>
            ) : TelephonyService.isLocalhost() ? (
              <span
                className="badge bg-warning bg-opacity-15 text-warning border border-warning border-opacity-50 font-monospace text-xs py-1 px-2 d-flex align-items-center gap-1"
                title="Twilio webhooks require a public HTTPS URL. Deploy to Vercel to make real calls. Use Mock Telephony for local development."
                style={{ cursor: 'help' }}
              >
                <i className="bi bi-exclamation-triangle-fill me-1"></i>
                Twilio — Live Only ⚠
              </span>
            ) : (
              <span className="badge bg-success bg-opacity-10 text-success border border-success border-opacity-25 font-monospace text-xs py-1 px-2 d-flex align-items-center gap-1">
                <span className="pulse-active rounded-circle bg-success d-inline-block" style={{ width: '6px', height: '6px' }}></span>
                Twilio Connected
              </span>
            )}

            <div className="d-flex align-items-center gap-2 ms-2">
              <span className="small text-muted font-monospace uppercase">Outbound Campaign:</span>
              <select 
                className="form-select form-select-sm" style={{ width: '220px' }}
                value={activeFlowId} onChange={(e) => setActiveFlowId(e.target.value)}
              >
                {ConversationFlowService.getFlows().map(f => (
                  <option key={f.id} value={f.id}>{f.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="d-flex gap-2 align-items-center">
            <span className="badge bg-success bg-opacity-10 text-success border border-success border-opacity-25 py-2 px-3 d-flex align-items-center gap-1">
              <span className="pulse-active rounded-circle bg-success d-inline-block" style={{ width: '8px', height: '8px' }}></span>
              Gemini Live Voice Layer
            </span>
            {isQueueLocked && (
              <button type="button" className="btn btn-sm btn-outline-danger" onClick={handleResetQueue}>
                <i className="bi bi-arrow-counterclockwise me-1"></i> Reset Campaign
              </button>
            )}
          </div>
        </header>

        <main className="p-4 flex-grow-1 overflow-auto">
          {!isQueueLocked ? (
            <div className="row justify-content-center">
              <div className="col-12 col-md-8 col-lg-7">
                <PipelineWizard onQueueGenerated={handleQueueGenerated} />
              </div>
            </div>
          ) : (
            <div className="row g-3">
              <div className="col-12">
                <GlobalFilterBar queue={queue} filters={filters} onFilterChange={setFilters} />
              </div>

              {/* Navigation Tabs */}
              <div className="col-12 border-bottom mb-3">
                <ul className="nav nav-tabs border-bottom-0">
                  <li className="nav-item">
                    <button 
                      className={`nav-link border-0 fw-semibold px-4 py-2 ${activeTab === 'queue' ? 'active text-primary border-bottom border-2 border-primary fw-bold' : 'text-secondary'}`}
                      onClick={() => setActiveTab('queue')} style={{ background: 'transparent' }}
                    >
                      Campaign Call Queue
                    </button>
                  </li>
                  <li className="nav-item">
                    <button 
                      className={`nav-link border-0 fw-semibold px-4 py-2 ${activeTab === 'outcomes' ? 'active text-primary border-bottom border-2 border-primary fw-bold' : 'text-secondary'}`}
                      onClick={() => setActiveTab('outcomes')} style={{ background: 'transparent' }}
                    >
                      Outcomes & Analytics
                    </button>
                  </li>
                </ul>
              </div>

              {/* Conditional Tab Rendering */}
              {activeTab === 'queue' ? (
                <>
                  <div className="col-12">
                    <ResultsDashboard queue={filteredQueue} rawCount={rawCount} view="queue" onViewDetails={setViewingApt} />
                  </div>
                  <div className="col-12 col-lg-8">
                    <QueueReviewConsole 
                      queue={filteredQueue} activeItemId={activeItem?.id} callState={callState}
                      onStartCall={handleStartCall} onRemoveItem={handleRemoveQueueItem}
                      isCampaignRunning={isCampaignRunning} setIsCampaignRunning={setIsCampaignRunning}
                      onViewDetails={setViewingApt}
                    />
                  </div>
                  <div className="col-12 col-lg-4">
                    <div className="card border-0 shadow-sm" style={{ minHeight: '300px' }}>
                      <div className="card-header bg-white border-bottom py-3">
                        <h6 className="mb-0 text-dark fw-bold text-uppercase font-monospace text-xs" style={{ letterSpacing: '0.5px' }}>
                          Telephony Diagnostics
                        </h6>
                      </div>
                      <div className="card-body bg-light text-dark p-3 font-monospace text-xs rounded-bottom border-top" style={{ minHeight: '300px', maxHeight: '420px', overflowY: 'auto' }}>
                        <div className="text-muted mb-2">// Active Outbound SIP Signaling Trace</div>
                        {telephonyLogs.map((log, idx) => (
                          <div key={idx} className="mb-1">
                            <span className="text-primary fw-semibold">[{log.timestamp}]</span> <span className="text-secondary">{log.message}</span>
                          </div>
                        ))}
                        {callState === 'idle' && filteredQueue.length > 0 && (
                          <div className="text-muted text-center mt-5">Waiting to initiate call sequence...</div>
                        )}
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <div className="col-12 animate-fade-in">
                  <ResultsDashboard queue={filteredQueue} rawCount={rawCount} view="outcomes" onViewDetails={setViewingApt} />
                </div>
              )}
            </div>
          )}
        </main>
      </div>

      <ConsoleOverlay
        callState={callState} transcript={transcript} detectedIntent={detectedIntent}
        activeApt={activeItem} rescheduleSlots={[]} speechError={speechError}
        onEndCall={endCall} onExecuteReschedule={() => {}}
      />

      <HistoricLogsModal
        isOpen={!!viewingApt} onClose={() => setViewingApt(null)}
        appointment={viewingApt ? db.getAppointments().find(a => a.id === viewingApt.id) || viewingApt : null}
        transcripts={viewingApt ? db.getTranscripts(viewingApt.id) : []}
      />
    </div>
  );
}

export default App;
