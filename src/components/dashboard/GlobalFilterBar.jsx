// GlobalFilterBar.jsx - Component containing the global campaign controls and filters.
import { useMemo } from 'react';

export function GlobalFilterBar({ queue, filters, onFilterChange }) {
  // Dynamically extract unique values from queue
  const practices = useMemo(() => {
    return [...new Set(queue.map(item => item.practice))].filter(Boolean);
  }, [queue]);

  const pcps = useMemo(() => {
    return [...new Set(queue.map(item => item.pcp))].filter(Boolean);
  }, [queue]);

  const handleChange = (key, value) => {
    onFilterChange({ ...filters, [key]: value });
  };

  const clearFilters = () => {
    onFilterChange({
      dateRange: 'all',
      practice: 'all',
      pcp: 'all',
      status: 'all',
      outcome: 'all',
      search: ''
    });
  };

  const hasActiveFilters = Object.entries(filters).some(([k, v]) => k !== 'search' && v !== 'all') || filters.search !== '';

  return (
    <div className="card border glass-card mb-4 shadow-sm">
      <div className="card-body p-3">
        <div className="row g-2 align-items-center">
          
          {/* Search Input */}
          <div className="col-12 col-md-3 col-lg-2">
            <label className="text-secondary text-xs font-monospace uppercase mb-1 d-block">Search Patient</label>
            <input
              type="text"
              className="form-control form-control-sm"
              placeholder="Name, MRN, phone..."
              value={filters.search}
              onChange={(e) => handleChange('search', e.target.value)}
            />
          </div>

          {/* Date Range Filter */}
          <div className="col-6 col-md-2 col-lg-2">
            <label className="text-secondary text-xs font-monospace uppercase mb-1 d-block">Date Range</label>
            <select
              className="form-select form-select-sm"
              value={filters.dateRange}
              onChange={(e) => handleChange('dateRange', e.target.value)}
            >
              <option value="all">All Dates</option>
              <option value="today">Today</option>
              <option value="3days">Last 3 Days</option>
              <option value="7days">Last 7 Days</option>
            </select>
          </div>

          {/* Practice Filter */}
          <div className="col-6 col-md-2 col-lg-2">
            <label className="text-secondary text-xs font-monospace uppercase mb-1 d-block">Practice</label>
            <select
              className="form-select form-select-sm"
              value={filters.practice}
              onChange={(e) => handleChange('practice', e.target.value)}
            >
              <option value="all">All Practices</option>
              {practices.map(p => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>

          {/* PCP Filter */}
          <div className="col-6 col-md-2 col-lg-2">
            <label className="text-secondary text-xs font-monospace uppercase mb-1 d-block">PCP / Doctor</label>
            <select
              className="form-select form-select-sm"
              value={filters.pcp}
              onChange={(e) => handleChange('pcp', e.target.value)}
            >
              <option value="all">All PCPs</option>
              {pcps.map(doc => (
                <option key={doc} value={doc}>{doc}</option>
              ))}
            </select>
          </div>

          {/* Campaign Status Filter */}
          <div className="col-6 col-md-2 col-lg-2">
            <label className="text-secondary text-xs font-monospace uppercase mb-1 d-block">Call Status</label>
            <select
              className="form-select form-select-sm"
              value={filters.status}
              onChange={(e) => handleChange('status', e.target.value)}
            >
              <option value="all">All Statuses</option>
              <option value="Pending">Pending</option>
              <option value="Calling">Calling</option>
              <option value="Retry Scheduled">Retry Scheduled</option>
              <option value="Completed">Completed</option>
              <option value="Failed">Failed</option>
            </select>
          </div>

          {/* Outcome Filter */}
          <div className="col-12 col-md-3 col-lg-2 d-flex align-items-end gap-2">
            <div className="flex-grow-1">
              <label className="text-secondary text-xs font-monospace uppercase mb-1 d-block">Outcome</label>
              <select
                className="form-select form-select-sm"
                value={filters.outcome}
                onChange={(e) => handleChange('outcome', e.target.value)}
              >
                <option value="all">All Outcomes</option>
                <option value="Confirmed">Confirmed</option>
                <option value="Cancelled">Cancelled</option>
                <option value="Rescheduled">Rescheduled</option>
                <option value="No Answer">No Answer</option>
                <option value="Wrong Number">Wrong Number</option>
                <option value="Left Message">Left Message</option>
                <option value="Other">Other</option>
              </select>
            </div>
            
            {hasActiveFilters && (
              <button
                type="button"
                className="btn btn-sm btn-outline-danger"
                onClick={clearFilters}
                title="Clear Filters"
                style={{ height: '31px' }}
              >
                <i className="bi bi-x-lg"></i>
              </button>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}

export default GlobalFilterBar;
