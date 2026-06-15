// ConsoleOverlay.jsx - Simulated voice workspace modal
// Slide-out panel showing wave indicators, detected intents, transcripts, and disconnection triggers.
import TranscriptView from './TranscriptView';
import SlotSelector from './SlotSelector';

export function ConsoleOverlay({
  callState = 'idle',
  transcript = [],
  detectedIntent = null,
  activeApt = null,
  rescheduleSlots = [],
  speechError = null,
  onEndCall,
  onExecuteReschedule
}) {
  if (callState === 'idle') return null;

  const getStatusColor = () => {
    switch (callState) {
      case 'calling': return 'bg-info text-dark';
      case 'speaking': return 'bg-success text-dark';
      case 'listening': return 'bg-primary text-white pulse-active';
      case 'ended': return 'bg-danger text-white';
      default: return 'bg-secondary text-white';
    }
  };

  const getStatusText = () => {
    switch (callState) {
      case 'calling': return 'DIALING PATIENT...';
      case 'speaking': return 'GUARDIAN IS SPEAKING...';
      case 'listening': return 'LISTENING FOR RESPONSE...';
      case 'ended': return 'CALL COMPLETED';
      default: return callState.toUpperCase();
    }
  };

  return (
    <>
      <div className="console-backdrop" onClick={onEndCall}></div>
      
      <div className="console-overlay-container active d-flex flex-column text-dark">
        {/* Header */}
        <div className="p-3 border-bottom d-flex justify-content-between align-items-center bg-light bg-opacity-50">
          <div>
            <h6 className="mb-0 fw-bold text-primary">Guardian Voice Session</h6>
            <small className="text-secondary">Patient: {activeApt?.patientName}</small>
          </div>
          <button 
            type="button" 
            className="btn-close" 
            onClick={onEndCall}
            aria-label="Close"
          ></button>
        </div>

        {/* State Banner */}
        <div className={`p-2 text-center small fw-bold tracking-wider ${getStatusColor()}`}>
          {getStatusText()}
        </div>

        {/* Visual indicators */}
        <div className="p-3 text-center border-bottom">
          {callState === 'speaking' && (
            <div className="wave-container">
              <div className="bar"></div>
              <div className="bar"></div>
              <div className="bar"></div>
              <div className="bar"></div>
              <div className="bar"></div>
            </div>
          )}
          {callState === 'listening' && (
            <div className="d-flex align-items-center justify-content-center gap-2">
              <span className="spinner-grow spinner-grow-sm text-success animate-pulse" role="status"></span>
              <span className="small text-success fw-semibold animate-pulse">Microphone Active - Speak Now</span>
            </div>
          )}
          {callState === 'calling' && (
            <div className="small text-secondary-emphasis">Connecting secure outbound line...</div>
          )}
          {callState === 'ended' && (
            <div className="small text-danger fw-semibold">Disconnecting channel...</div>
          )}
        </div>

        {/* Speech/Permission Diagnostic Warning */}
        {speechError && (
          <div className="mx-3 mt-2 p-2 rounded bg-danger bg-opacity-10 border border-danger border-opacity-25 text-danger small">
            <i className="bi bi-exclamation-triangle-fill me-1"></i>
            <span><strong>Voice Session Error:</strong> {speechError}</span>
          </div>
        )}

        {/* Transcripts Panel */}
        <div className="flex-grow-1 p-3 overflow-hidden d-flex flex-column">
          <label className="text-secondary small text-uppercase mb-2 fw-semibold">Live Transcript</label>
          <div className="flex-grow-1 overflow-auto custom-scroll mb-2">
            <TranscriptView transcript={transcript} />
          </div>

          {/* Reschedule Slot Options */}
          {detectedIntent === 'RESCHEDULE' && rescheduleSlots.length > 0 && (
            <div className="p-2 mb-2 rounded bg-warning bg-opacity-10 border border-warning border-opacity-25">
              <small className="text-warning d-block mb-2 fw-semibold">Available Reschedule Slots:</small>
              <SlotSelector slots={rescheduleSlots} onSelect={onExecuteReschedule} />
            </div>
          )}

          {/* Intent parsed preview */}
          {detectedIntent && (
            <div className="p-2 mb-2 rounded bg-light border d-flex justify-content-between align-items-center">
              <span className="small text-secondary">Detected Patient Intent:</span>
              <span className={`badge bg-${
                detectedIntent === 'CONFIRM' ? 'success' : 
                detectedIntent === 'CANCEL' ? 'danger' : 
                detectedIntent === 'WRONG_NUMBER' ? 'secondary' : 
                detectedIntent === 'LEFT_MESSAGE' ? 'info' : 'warning'
              } text-${
                detectedIntent === 'CONFIRM' || detectedIntent === 'CANCEL' || detectedIntent === 'WRONG_NUMBER' || detectedIntent === 'LEFT_MESSAGE' ? 'white' : 'dark'
              } uppercase`}>
                {detectedIntent.replace('_', ' ')}
              </span>
            </div>
          )}
        </div>

        {/* Bottom controls */}
        <div className="p-3 border-top bg-light bg-opacity-50">
          <div className="text-center mb-3" style={{ fontSize: '0.75rem' }}>
            <span className="text-success"><i className="bi bi-mic-fill me-1"></i> Continuous Bi-directional Voice Stream Active</span>
          </div>
          <div>
            <button 
              type="button" 
              className="btn btn-danger w-100 d-flex align-items-center justify-content-center"
              onClick={onEndCall}
            >
              <i className="bi bi-telephone-x-fill me-2"></i>
              Disconnect Call
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

export default ConsoleOverlay;
