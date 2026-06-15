// TopNavbar.jsx - Brand header matching real application screenshots.
export function TopNavbar({ search, onSearchChange }) {
  return (
    <header className="velzon-navbar d-flex justify-content-between align-items-center bg-white border-bottom py-2 px-4 shadow-sm w-100">
      
      {/* Brand area */}
      <div className="d-flex align-items-center gap-2">
        <span style={{ fontSize: '1.4rem', fontWeight: 'bold', color: '#5A2C82', letterSpacing: '-0.5px' }}>guardian</span>
        <div className="border-start mx-2" style={{ height: '20px', borderColor: '#e2e8f0' }}></div>
        <span className="text-secondary small fw-semibold d-flex align-items-center gap-1">
          <i className="bi bi-telephone-outbound text-primary"></i> Automated Calling
        </span>
      </div>

      {/* Center search area */}
      <div className="flex-grow-1 d-flex justify-content-center mx-4">
        <div className="position-relative" style={{ width: '400px' }}>
          <i className="bi bi-search position-absolute text-muted" style={{ left: '12px', top: '10px', fontSize: '0.85rem' }}></i>
          <input 
            type="text" 
            className="form-control form-control-sm ps-5 bg-light border-0" 
            placeholder="Search Patients..." 
            value={search} 
            onChange={(e) => onSearchChange(e.target.value)}
            style={{ borderRadius: '20px', height: '35px' }}
          />
        </div>
      </div>

      {/* Right side profile icons */}
      <div className="d-flex align-items-center gap-3 text-secondary">
        <i className="bi bi-person-fill cursor-pointer fs-5" title="Profile"></i>
        <i className="bi bi-grid-3x3-gap-fill cursor-pointer fs-5" title="Grid"></i>
        <i className="bi bi-fullscreen cursor-pointer fs-6" title="Fullscreen"></i>
        <i className="bi bi-bell-fill cursor-pointer fs-5" title="Notifications"></i>
        <div className="d-flex align-items-center gap-2 border-start ps-3 ms-1">
          <div className="bg-primary text-white rounded-circle d-flex align-items-center justify-content-center fw-bold font-monospace" style={{ width: '32px', height: '32px', fontSize: '0.85rem' }}>
            MS
          </div>
          <div className="d-none d-md-block text-start leading-none">
            <div className="fw-semibold text-dark mb-0" style={{ fontSize: '0.8rem', lineHeight: '1.1' }}>MARIA STARK</div>
            <small className="text-muted" style={{ fontSize: '0.65rem' }}>FACS</small>
          </div>
        </div>
      </div>

    </header>
  );
}

export default TopNavbar;
