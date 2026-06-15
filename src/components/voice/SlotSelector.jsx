// SlotSelector.jsx - Interactive component rendering available reschedule slots
// Displays choice grid matching patient requirements.


export function SlotSelector({ slots = [], onSelect }) {
  if (slots.length === 0) {
    return (
      <div className="text-center py-2 small text-secondary">
        No slots available.
      </div>
    );
  }

  return (
    <div className="row g-2">
      {slots.map((slot) => (
        <div key={slot.id} className="col-12">
          <button
            type="button"
            className="btn btn-sm btn-outline-warning w-100 text-start d-flex align-items-center justify-content-between p-2"
            onClick={() => onSelect(slot)}
          >
            <span className="d-flex align-items-center">
              <i className="bi bi-calendar-check me-2"></i>
              <span className="fw-semibold">{slot.date}</span>
            </span>
            <span className="badge bg-warning bg-opacity-10 text-warning border border-warning border-opacity-25">
              {slot.time}
            </span>
          </button>
        </div>
      ))}
    </div>
  );
}

export default SlotSelector;
