// ResultsDashboard.jsx - Campaign summary statistics and outcomes drill-down
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

export function ResultsDashboard({ queue, rawCount, view = 'outcomes', onViewDetails }) {
  const [selectedCategory, setSelectedCategory] = useState(null);

  // Stats calculation
  const totalImported = rawCount || queue.length;
  const eligibleCount = queue.length;
  const completedCount = queue.filter(item => item.status === 'Completed').length;
  const pendingCount = queue.filter(item => item.status === 'Pending' || item.status === 'Retry Scheduled').length;
  const callingCount = queue.filter(item => item.status === 'Calling').length;
  const failedCount = queue.filter(item => item.status === 'Failed').length;

  const getOutcomeCount = (outcome) => queue.filter(item => item.outcome === outcome).length;

  const categories = [
    { name: 'Confirmed', count: getOutcomeCount('Confirmed'), color: 'success', icon: 'bi-check-circle-fill' },
    { name: 'Cancelled', count: getOutcomeCount('Cancelled'), color: 'danger', icon: 'bi-x-circle-fill' },
    { name: 'Rescheduled', count: getOutcomeCount('Rescheduled'), color: 'info', icon: 'bi-arrow-repeat' },
    { name: 'No Answer', count: getOutcomeCount('No Answer'), color: 'warning', icon: 'bi-phone-vibrate' },
    { name: 'Wrong Number', count: getOutcomeCount('Wrong Number'), color: 'dark', icon: 'bi-exclamation-triangle' },
    { name: 'Left Message', count: getOutcomeCount('Left Message'), color: 'primary', icon: 'bi-envelope-paper' },
    { name: 'Other', count: getOutcomeCount('Other'), color: 'secondary', icon: 'bi-question-circle' }
  ];

  const filteredItems = selectedCategory 
    ? queue.filter(item => item.outcome === selectedCategory) 
    : queue;

  return (
    <div className="w-100 text-start">
      
      {/* View Mode 1: Campaign Queue stats (Operational cards only) */}
      {view === 'queue' && (
        <div className="mb-2">
          <h6 className="text-secondary font-monospace text-xs uppercase mb-3 fw-bold">
            <i className="bi bi-graph-up me-1"></i> Today's Campaign Performance
          </h6>
          <div className="row g-3">
            <div className="col-6 col-md-4 col-lg-2">
              <div className="card border-0 shadow-sm text-center py-3 h-100">
                <small className="text-secondary font-monospace text-xs uppercase">Imported</small>
                <h3 className="mb-0 fw-bold text-dark">{totalImported}</h3>
              </div>
            </div>
            <div className="col-6 col-md-4 col-lg-2">
              <div className="card border-0 shadow-sm text-center py-3 h-100 bg-white">
                <small className="text-secondary font-monospace text-xs uppercase">Eligible</small>
                <h3 className="mb-0 fw-bold text-primary">{eligibleCount}</h3>
              </div>
            </div>
            <div className="col-6 col-md-4 col-lg-2">
              <div className="card border-0 shadow-sm text-center py-3 h-100 bg-success bg-opacity-10">
                <small className="text-success font-monospace text-xs uppercase fw-semibold">Completed</small>
                <h3 className="mb-0 fw-bold text-success">{completedCount}</h3>
              </div>
            </div>
            <div className="col-6 col-md-4 col-lg-2">
              <div className="card border-0 shadow-sm text-center py-3 h-100 bg-secondary bg-opacity-10">
                <small className="text-secondary font-monospace text-xs uppercase">Pending</small>
                <h3 className="mb-0 fw-bold text-secondary">{pendingCount}</h3>
              </div>
            </div>
            <div className="col-6 col-md-4 col-lg-2">
              <div className="card border-0 shadow-sm text-center py-3 h-100 bg-primary bg-opacity-10">
                <small className="text-primary font-monospace text-xs uppercase fw-semibold">In Progress</small>
                <h3 className="mb-0 fw-bold text-primary pulse-active">{callingCount}</h3>
              </div>
            </div>
            <div className="col-6 col-md-4 col-lg-2">
              <div className="card border-0 shadow-sm text-center py-3 h-100 bg-danger bg-opacity-10">
                <small className="text-danger font-monospace text-xs uppercase fw-semibold">Failed</small>
                <h3 className="mb-0 fw-bold text-danger">{failedCount}</h3>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* View Mode 2: Outcomes Reporting Drill-down cards + Detailed table */}
      {view === 'outcomes' && (
        <div className="mb-4">
          <h6 className="text-secondary font-monospace text-xs uppercase mb-3 fw-bold">
            <i className="bi bi-funnel me-1"></i> Patient Response Breakdown (Click card to filter table below)
          </h6>
          
          <div className="row g-2 mb-4">
            {categories.map((cat) => (
              <div key={cat.name} className="col-6 col-md-3 col-lg-3 flex-grow-1">
                <div 
                  className={`card cursor-pointer border-0 shadow-sm hover-shadow transition-all ${selectedCategory === cat.name ? 'bg-' + cat.color + ' bg-opacity-10 shadow-sm' : ''}`}
                  onClick={() => setSelectedCategory(selectedCategory === cat.name ? null : cat.name)}
                  style={{ minHeight: '75px' }}
                >
                  <div className="card-body p-3 d-flex align-items-center justify-content-between">
                    <div>
                      <small className="text-secondary font-monospace text-xs uppercase">{cat.name}</small>
                      <h4 className={`mb-0 fw-bold text-${cat.color}`}>{cat.count}</h4>
                    </div>
                    <div className={`fs-4 text-${cat.color} opacity-75`}>
                      <i className={`bi ${cat.icon}`}></i>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="card border-0 shadow-sm">
            <div className="card-header bg-white border-bottom py-3 d-flex justify-content-between align-items-center">
              <div>
                <h6 className="mb-0 fw-bold text-dark text-uppercase font-monospace text-xs" style={{ letterSpacing: '0.5px' }}>
                  {selectedCategory ? `Campaign Outcomes: ${selectedCategory}` : 'All Campaign Outcomes'}
                </h6>
                <small className="text-muted">
                  {selectedCategory ? `Drilled down to show ${filteredItems.length} records` : 'Showing outcomes of all patients matching filters'}
                </small>
              </div>
              {selectedCategory && (
                <button className="btn btn-xs btn-outline-secondary" onClick={() => setSelectedCategory(null)}>
                  Clear Filter
                </button>
              )}
            </div>
            
            <div className="card-body p-0">
              <div className="table-responsive" style={{ maxHeight: '350px' }}>
                <table className="table align-middle mb-0 text-sm">
                  <thead className="table-light text-xs font-monospace">
                    <tr>
                      <th className="ps-3">Patient</th>
                      <th>Practice</th>
                      <th>Phone</th>
                      <th className="text-center">Attempts</th>
                      <th>Final Outcome</th>
                      <th>Call History Logs</th>
                      <th className="pe-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredItems.length === 0 ? (
                      <tr>
                        <td colSpan="7" className="text-center py-4 text-muted small">
                          No outcomes found in this category.
                        </td>
                      </tr>
                    ) : (
                      filteredItems.map((item) => (
                        <tr key={item.id}>
                          <td className="ps-3">
                            <div className="text-dark small fw-semibold">
                              {formatPatientDetails(item.patientName, item.dob, item.sex)}
                            </div>
                            <div className="text-xs text-muted">ID: {item.patientId}</div>
                          </td>
                          <td><span className="text-secondary small">{item.practice}</span></td>
                          <td className="font-monospace text-xs">{item.phone}</td>
                          <td className="text-center font-monospace">{item.attempts}</td>
                          <td>
                            <span className={`badge bg-${categories.find(c => c.name === item.outcome)?.color || 'secondary'} text-white`}>
                              {item.outcome || 'Pending'}
                            </span>
                          </td>
                          <td>
                            {item.history && item.history.length > 0 ? (
                               <div className="text-xs font-monospace text-secondary text-start">
                                 {item.history.map((h, i) => (
                                   <div key={i}>
                                     Attempt {h.attempt}: {h.outcome} at {h.timestamp} {h.duration !== undefined && h.duration !== null ? `(${h.duration}s)` : ''}
                                   </div>
                                 ))}
                               </div>
                             ) : (
                               <span className="text-muted text-xs">No call attempts logged</span>
                             )}
                          </td>
                          <td className="pe-3">
                            <button
                              type="button"
                              className="btn btn-xs btn-outline-primary d-flex align-items-center gap-1"
                              onClick={() => onViewDetails && onViewDetails(item)}
                            >
                              <i className="bi bi-chat-left-text" style={{ fontSize: '0.75rem' }}></i> View Logs
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

export default ResultsDashboard;
