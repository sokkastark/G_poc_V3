// AppointmentTable.jsx - Presentational grid rendering the schedule list
// Contains status badges and triggers to initiate simulated browser voice calling.


export function AppointmentTable({ appointments = [], activeAptId = null, callState = 'idle', onStartCall, onViewLogs }) {
  
  const getStatusBadge = (status) => {
    switch (status) {
      case 'Confirmed':
        return <span className="badge badge-confirmed"><i className="bi bi-check-circle me-1"></i>Confirmed</span>;
      case 'Cancelled':
        return <span className="badge badge-cancelled"><i className="bi bi-x-circle me-1"></i>Cancelled</span>;
      case 'Rescheduled':
        return <span className="badge badge-rescheduled"><i className="bi bi-arrow-repeat me-1"></i>Rescheduled</span>;
      case 'Wrong Number':
        return <span className="badge badge-wrong-number"><i className="bi bi-telephone-x me-1"></i>Wrong Number</span>;
      case 'Message Left':
        return <span className="badge badge-message-left"><i className="bi bi-chat-dots me-1"></i>Msg Left</span>;
      default:
        return <span className="badge badge-pending"><i className="bi bi-clock me-1"></i>Pending</span>;
    }
  };

  return (
    <div className="glass-card h-100 d-flex flex-column overflow-hidden text-dark">
      <div className="p-3 border-bottom d-flex justify-content-between align-items-center bg-light bg-opacity-50">
        <h5 className="mb-0 fw-bold d-flex align-items-center text-primary">
          <i className="bi bi-calendar2-range text-primary me-2"></i>
          Appointment Outbound Queue
        </h5>
        <span className="badge bg-primary bg-opacity-10 text-primary border border-primary border-opacity-25">
          {appointments.length} Scheduled Today
        </span>
      </div>

      <div className="table-responsive custom-scroll flex-grow-1">
        <table className="table table-hover align-middle mb-0" style={{ '--bs-table-bg': 'transparent' }}>
          <thead>
            <tr className="text-secondary small uppercase">
              <th className="ps-3 py-3 border-bottom">Patient</th>
              <th className="py-3 border-bottom">Doctor</th>
              <th className="py-3 border-bottom">Schedule Details</th>
              <th className="py-3 border-bottom">Phone Number</th>
              <th className="py-3 border-bottom">Status</th>
              <th className="pe-3 py-3 border-bottom text-end">Actions</th>
            </tr>
          </thead>
          <tbody>
            {appointments.length === 0 ? (
              <tr>
                <td colSpan="6" className="text-center py-5 text-secondary">
                  <i className="bi bi-folder-x fs-1 mb-2 d-block"></i>
                  No appointments found. Reset the DB to restore data.
                </td>
              </tr>
            ) : (
              appointments.map((apt) => {
                const isActive = activeAptId === apt.id && callState !== 'idle';
                
                return (
                  <tr key={apt.id} className={isActive ? 'table-active border-primary border-opacity-25' : ''}>
                    <td className="ps-3 py-3 fw-semibold text-dark">
                      {apt.patientName}
                    </td>
                    <td className="py-3 text-secondary-emphasis">
                      <div className="fw-semibold text-dark">{apt.doctorName}</div>
                    </td>
                    <td className="py-3">
                      <div className="text-primary fw-semibold">{apt.time}</div>
                      <div className="small text-secondary">{apt.date}</div>
                    </td>
                    <td className="py-3 text-secondary">
                      {apt.phoneNumber}
                    </td>
                    <td className="py-3">
                      {getStatusBadge(apt.status)}
                    </td>
                    <td className="pe-3 py-3 text-end">
                      <div className="d-inline-flex gap-2">
                        <button
                          type="button"
                          className={`btn btn-sm btn-outline-info`}
                          onClick={() => onViewLogs(apt)}
                          title="View Transcripts"
                        >
                          <i className="bi bi-chat-left-text"></i>
                        </button>
                        
                        <button
                          type="button"
                          className={`btn btn-sm ${
                            isActive
                              ? 'btn-danger pulse-active'
                              : apt.status === 'Pending'
                              ? 'btn-primary'
                              : 'btn-outline-secondary'
                          }`}
                          disabled={callState !== 'idle' && !isActive}
                          onClick={() => onStartCall(apt)}
                        >
                          {isActive ? (
                            <>
                              <span className="spinner-grow spinner-grow-sm me-1" role="status"></span>
                              Calling...
                            </>
                          ) : (
                            <>
                              <i className="bi bi-telephone-fill me-1"></i>
                              {apt.status === 'Pending' ? 'Start Call' : 'Recall'}
                            </>
                          )}
                        </button>
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
  );
}

export default AppointmentTable;
