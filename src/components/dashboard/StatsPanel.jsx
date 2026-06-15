// StatsPanel.jsx - Presentational component displaying appointment status statistics
// Standard Bootstrap classes with premium glassmorphism layouts.


export function StatsPanel({ appointments = [] }) {
  const total = appointments.length;
  const pending = appointments.filter(a => a.status === 'Pending').length;
  const confirmed = appointments.filter(a => a.status === 'Confirmed').length;
  const cancelled = appointments.filter(a => a.status === 'Cancelled').length;
  const rescheduled = appointments.filter(a => a.status === 'Rescheduled').length;

  const stats = [
    {
      title: 'Total Schedules',
      value: total,
      icon: 'bi-calendar-event',
      colorClass: 'text-primary',
      bgClass: 'rgba(14, 165, 233, 0.1)'
    },
    {
      title: 'Pending Outreach',
      value: pending,
      icon: 'bi-telephone-outbound',
      colorClass: 'text-slate-300',
      bgClass: 'rgba(148, 163, 184, 0.1)'
    },
    {
      title: 'Confirmed Attendances',
      value: confirmed,
      icon: 'bi-check-circle-fill',
      colorClass: 'text-success',
      bgClass: 'rgba(16, 185, 129, 0.1)'
    },
    {
      title: 'Cancelled Bookings',
      value: cancelled,
      icon: 'bi-x-circle-fill',
      colorClass: 'text-danger',
      bgClass: 'rgba(244, 63, 94, 0.1)'
    },
    {
      title: 'Rescheduled Slots',
      value: rescheduled,
      icon: 'bi-arrow-repeat',
      colorClass: 'text-warning',
      bgClass: 'rgba(245, 158, 11, 0.1)'
    }
  ];

  return (
    <div className="row g-3 mb-4">
      {stats.map((stat, idx) => (
        <div key={idx} className="col-12 col-md-6 col-lg-2-4" style={{ flex: total > 0 ? '1' : 'none' }}>
          <div className="glass-card p-3 h-100 d-flex align-items-center justify-content-between">
            <div>
              <p className="text-secondary mb-1 small text-uppercase tracking-wider">{stat.title}</p>
              <h3 className="mb-0 fw-bold">{stat.value}</h3>
            </div>
            <div 
              className={`d-flex align-items-center justify-content-center rounded-circle ${stat.colorClass}`}
              style={{ width: '48px', height: '48px', backgroundColor: stat.bgClass, fontSize: '1.25rem' }}
            >
              <i className={`bi ${stat.icon}`}></i>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export default StatsPanel;
