// QueueReviewConsole.jsx - Queue list and caller trigger interface with auto-campaign execution.
import { useState } from 'react';

// Helper to calculate age from birthdate
const calculateAge = (dobString) => {
  if (!dobString || dobString === 'Unknown') return 'N/A';
  try {
    const dob = new Date(dobString);
    if (isNaN(dob.getTime())) return 'N/A';
    const today = new Date();
    let age = today.getFullYear() - dob.getFullYear();
    const m = today.getMonth() - dob.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) {
      age--;
    }
    return age >= 0 ? age : 'N/A';
  } catch (e) {
    return 'N/A';
  }
};

// Formats patient name details like: ADAMS, CATHY | 05-24-1862 | 64 | F
const formatPatientDetails = (name, dob, sex) => {
  const safeName = name ? String(name).trim() : 'UNKNOWN PATIENT';
  const parts = safeName.split(/\s+/);
  let formattedName = safeName.toUpperCase();
  if (parts.length >= 2) {
    const lastName = parts[parts.length - 1].toUpperCase();
    const firstName = parts.slice(0, parts.length - 1).join(' ').toUpperCase();
    formattedName = `${lastName}, ${firstName}`;
  }
  const age = calculateAge(dob);
  const genderCode = sex ? String(sex).charAt(0).toUpperCase() : 'U';
  const normalizedDob = dob ? String(dob).replace(/\//g, '-') : 'N/A';
  return `${formattedName} | ${normalizedDob} | ${age} | ${genderCode}`;
};

export function QueueReviewConsole({ 
  queue, 
  activeItemId, 
  callState, 
  onStartCall, 
  onRemoveItem,
  isCampaignRunning,
  setIsCampaignRunning,
  onViewDetails
}) {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredQueue = queue.filter(item => 
    (item.patientName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (item.practice || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (item.pcp || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (item.phone || '').includes(searchTerm)
  );

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'Pending': return 'bg-secondary bg-opacity-10 text-secondary border border-secondary border-opacity-25';
      case 'Calling': return 'bg-primary bg-opacity-10 text-primary border border-primary border-opacity-25 pulse-active';
      case 'Retry Scheduled': return 'bg-warning bg-opacity-10 text-warning border border-warning border-opacity-25';
      case 'Completed': return 'bg-success bg-opacity-10 text-success border border-success border-opacity-25';
      case 'Failed': return 'bg-danger bg-opacity-10 text-danger border border-danger border-opacity-25';
      default: return 'bg-light text-dark';
    }
  };

  const totalInQueue = queue.length;
  const processedCount = queue.filter(item => item.status === 'Completed' || item.status === 'Failed').length;
  const progressPercent = totalInQueue > 0 ? Math.round((processedCount / totalInQueue) * 100) : 0;

  return (
    <div className="card border-0 shadow-sm mb-4">
      <div className="card-header bg-white border-bottom py-3 d-flex justify-content-between align-items-center flex-wrap gap-2">
        <div className="text-start">
          <h6 className="mb-0 fw-bold text-dark text-uppercase font-monospace text-xs" style={{ letterSpacing: '0.5px' }}>
            Active Patient Calling Queue
          </h6>
          <small className="text-muted">Review patient calling lists and manage sequential campaign dialing</small>
        </div>

        {/* Campaign Execution Controls */}
        <div className="d-flex align-items-center gap-2">
          {isCampaignRunning ? (
            <button 
              type="button" 
              className="btn btn-danger btn-sm d-flex align-items-center gap-1 shadow-sm"
              onClick={() => setIsCampaignRunning(false)}
            >
              <i className="bi bi-pause-circle-fill"></i> Pause Campaign
            </button>
          ) : (
            <button 
              type="button" 
              className="btn btn-primary btn-sm d-flex align-items-center gap-1 shadow-sm"
              disabled={queue.length === 0 || queue.every(item => item.status === 'Completed' || item.status === 'Failed')}
              onClick={() => setIsCampaignRunning(true)}
            >
              <i className="bi bi-play-circle-fill"></i> Start Campaign (Auto)
            </button>
          )}
          <span className="badge bg-light text-dark border fw-bold font-monospace">{totalInQueue} Total</span>
        </div>
      </div>
      
      <div className="card-body p-0">
        
        {/* Campaign Progress Bar */}
        {totalInQueue > 0 && (
          <div className="px-3 py-2 bg-light border-bottom d-flex align-items-center justify-content-between gap-3 flex-wrap border-top">
            <div className="d-flex align-items-center gap-2 flex-grow-1" style={{ minWidth: '200px' }}>
              <span className="small text-secondary font-monospace text-xs">Progress:</span>
              <div className="progress flex-grow-1" style={{ height: '8px' }}>
                <div 
                  className={`progress-bar ${isCampaignRunning ? 'progress-bar-striped progress-bar-animated bg-success' : 'bg-primary'}`} 
                  role="progressbar" 
                  style={{ width: `${progressPercent}%` }}
                ></div>
              </div>
              <span className="small fw-bold text-dark font-monospace text-xs">{progressPercent}%</span>
            </div>
            <div className="small text-secondary font-monospace text-xs">
              Processed: <strong>{processedCount}</strong> / <strong>{totalInQueue}</strong> patients
            </div>
          </div>
        )}

        {/* Search Bar */}
        <div className="p-3 border-bottom d-flex gap-2">
          <div className="position-relative flex-grow-1">
            <span className="position-absolute text-muted small" style={{ left: '10px', top: '7px' }}>
              <i className="bi bi-search"></i>
            </span>
            <input 
              type="text" 
              className="form-control form-control-sm ps-4" 
              placeholder="Search queue by patient, practice, PCP, or phone..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {/* Queue Table */}
        <div className="table-responsive" style={{ maxHeight: '380px' }}>
          <table className="table align-middle mb-0 text-sm">
            <thead className="table-light text-xs font-monospace">
              <tr>
                <th className="ps-3" style={{ width: '100px' }}>Patient ID</th>
                <th>Patient</th>
                <th>Practice</th>
                <th>PCP</th>
                <th>Phone</th>
                <th className="text-center">Attempts</th>
                <th>Status</th>
                <th>Outcome</th>
                <th className="text-end pe-3" style={{ width: '130px' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredQueue.length === 0 ? (
                <tr>
                  <td colSpan="9" className="text-center py-4 text-muted small">
                    <i className="bi bi-inbox me-1"></i> No patients found matching criteria.
                  </td>
                </tr>
              ) : (
                filteredQueue.map((item) => {
                  const isActive = activeItemId === item.id;
                  return (
                    <tr key={item.id} className={isActive ? 'table-primary bg-opacity-25 border-start border-4 border-primary fw-semibold' : ''}>
                      <td className="ps-3 font-monospace text-xs text-secondary">{item.patientId}</td>
                      <td>
                        <div className="text-dark small fw-semibold">
                          {formatPatientDetails(item.patientName, item.dob, item.sex)}
                        </div>
                      </td>
                      <td>
                        <span className="text-secondary small">{item.practice}</span>
                      </td>
                      <td>
                        <span className="text-dark small">{item.pcp}</span>
                      </td>
                      <td className="font-monospace text-xs">{item.phone}</td>
                      <td className="text-center font-monospace small">{item.attempts}</td>
                      <td>
                        <span className={`badge px-2 py-1 ${getStatusBadgeClass(item.status)}`}>
                          {item.status}
                        </span>
                      </td>
                      <td>
                        {item.outcome ? (
                          <span className="badge bg-light text-dark border font-monospace text-xs">
                            {item.outcome}
                          </span>
                        ) : (
                          <span className="text-muted text-xs">—</span>
                        )}
                      </td>
                      <td className="text-end pe-3">
                        <div className="d-flex gap-1 justify-content-end align-items-center">
                          <button
                            type="button"
                            className={`btn btn-xs ${isActive ? 'btn-warning' : 'btn-primary'} d-flex align-items-center gap-1`}
                            disabled={callState !== 'idle' || item.status === 'Completed' || item.status === 'Failed'}
                            onClick={() => onStartCall(item)}
                          >
                            <i className="bi bi-telephone-outbound-fill" style={{ fontSize: '0.75rem' }}></i>
                            {isActive ? 'Calling' : 'Call'}
                          </button>
                          <i 
                            className="bi bi-file-earmark-text text-secondary cursor-pointer ms-2 fs-6" 
                            title="View Call Details / Logs"
                            onClick={() => onViewDetails && onViewDetails(item)}
                          ></i>
                          <i className="bi bi-person text-secondary cursor-pointer ms-2 fs-5" title="Demographics"></i>
                          <i className="bi bi-three-dots-vertical text-secondary cursor-pointer ms-1 fs-6" title="More Actions"></i>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

      </div>
    </div>
  );
}

export default QueueReviewConsole;
