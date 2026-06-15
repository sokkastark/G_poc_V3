// HistoricLogsModal.jsx - Reusable modal showing past call transcripts and audio playbacks.
import TranscriptView from './TranscriptView';

export function HistoricLogsModal({ isOpen, onClose, appointment, transcripts }) {
  if (!isOpen || !appointment) return null;

  return (
    <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', zIndex: 1060 }}>
      <div className="modal-dialog modal-dialog-centered modal-dialog-scrollable">
        <div className="modal-content bg-white text-dark border-0 shadow-lg">
          <div className="modal-header border-bottom py-3">
            <h6 className="modal-title fw-bold text-primary mb-0 d-flex align-items-center gap-2">
              <i className="bi bi-chat-left-text-fill"></i>
              Conversation History
            </h6>
            <button type="button" className="btn-close" onClick={onClose} aria-label="Close"></button>
          </div>
          
          <div className="modal-body p-4" style={{ maxHeight: '60vh', overflowY: 'auto' }}>
            <div className="mb-3 p-3 bg-light rounded border border-light">
              <div className="row g-2 small text-secondary">
                <div className="col-12"><strong>Patient:</strong> <span className="text-dark">{appointment.patientName}</span></div>
                <div className="col-6"><strong>PCP/Doctor:</strong> <span className="text-dark">{appointment.doctorName || appointment.pcp || 'N/A'}</span></div>
                <div className="col-6">
                  <strong>Status:</strong>{' '}
                  <span className="badge bg-secondary bg-opacity-10 text-secondary border border-secondary border-opacity-25 ms-1">
                    {appointment.status}
                  </span>
                </div>
              </div>
            </div>

            {appointment.recordingUrl && (
              <div className="mb-3 bg-light p-3 rounded border border-primary border-opacity-10">
                <label className="form-label small fw-bold text-primary mb-2 d-flex align-items-center gap-1">
                  <i className="bi bi-play-circle-fill"></i> Call Recording Playback
                </label>
                <audio src={appointment.recordingUrl} className="w-100" controls />
              </div>
            )}

            <h6 className="small fw-bold text-secondary text-uppercase font-monospace mb-3">Transcript Trace</h6>
            <div className="border rounded p-3 bg-light bg-opacity-50">
              <TranscriptView transcript={transcripts} />
            </div>
          </div>

          <div className="modal-footer border-top py-2">
            <button type="button" className="btn btn-secondary btn-sm" onClick={onClose}>Close</button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default HistoricLogsModal;
