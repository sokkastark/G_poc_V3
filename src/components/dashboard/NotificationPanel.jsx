// NotificationPanel.jsx - Renders simulated Doctor Notification queues and System Audit Logs
// Uses tabbed dashboard selectors with vertical timelines.

import { useState } from 'react';


export function NotificationPanel({ notifications = [], activityLogs = [] }) {
  const [activeTab, setActiveTab] = useState('alerts'); // 'alerts' or 'system'

  return (
    <div className="glass-card h-100 d-flex flex-column overflow-hidden text-dark">
      <div className="p-3 border-bottom bg-light bg-opacity-50 d-flex justify-content-between align-items-center">
        <h5 className="mb-0 fw-bold d-flex align-items-center text-primary">
          <i className="bi bi-bell-fill text-warning me-2"></i>
          Alerts & Logs
        </h5>
        
        <div className="btn-group btn-group-sm" role="group">
          <button
            type="button"
            className={`btn ${activeTab === 'alerts' ? 'btn-primary text-white' : 'btn-outline-secondary'}`}
            onClick={() => setActiveTab('alerts')}
          >
            Doctor Alerts ({notifications.length})
          </button>
          <button
            type="button"
            className={`btn ${activeTab === 'system' ? 'btn-primary text-white' : 'btn-outline-secondary'}`}
            onClick={() => setActiveTab('system')}
          >
            System Logs
          </button>
        </div>
      </div>

      <div className="p-3 flex-grow-1 custom-scroll">
        {activeTab === 'alerts' ? (
          notifications.length === 0 ? (
            <div className="text-center py-5 text-secondary">
              <i className="bi bi-mailbox2 fs-2 mb-2 d-block"></i>
              No alert dispatches yet. Run calls to trigger notifications.
            </div>
          ) : (
            <div className="d-flex flex-column gap-3">
              {notifications.map((notif) => (
                <div key={notif.id} className="p-3 rounded bg-light bg-opacity-50 border position-relative">
                  <div className="d-flex justify-content-between align-items-center mb-2">
                    <span className="badge bg-warning bg-opacity-10 text-warning border border-warning border-opacity-25 uppercase small">
                      {notif.channel}
                    </span>
                    <span className="text-secondary small">{notif.timestamp}</span>
                  </div>
                  <h6 className="mb-1 text-primary fw-semibold">{notif.doctorName}</h6>
                  <p className="mb-0 small text-secondary" style={{ fontSize: '0.875rem' }}>
                    {notif.details}
                  </p>
                  <span className="position-absolute bottom-0 end-0 m-2 badge bg-success bg-opacity-10 text-success border border-success border-opacity-25">
                    Dispatched
                  </span>
                </div>
              ))}
            </div>
          )
        ) : (
          activityLogs.length === 0 ? (
            <div className="text-center py-5 text-secondary">
              No system activity recorded.
            </div>
          ) : (
            <div className="position-relative ps-3 border-start border-secondary border-opacity-25 ms-2 py-2">
              {activityLogs.map((log) => (
                <div key={log.id} className="position-relative mb-4">
                  {/* Timeline point indicator */}
                  <div 
                    className="position-absolute rounded-circle bg-primary"
                    style={{ width: '10px', height: '10px', left: '-21px', top: '5px', border: '2px solid #f3f3f9' }}
                  ></div>
                  <div className="d-flex justify-content-between align-items-start">
                    <p className="mb-0 small fw-semibold text-dark">{log.message}</p>
                    <span className="text-secondary small ms-2" style={{ fontSize: '0.75rem', whiteSpace: 'nowrap' }}>
                      {log.timestamp}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )
        )}
      </div>
    </div>
  );
}

export default NotificationPanel;
