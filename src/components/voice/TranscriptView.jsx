import { useEffect, useRef } from 'react';


export function TranscriptView({ transcript = [] }) {
  const bottomRef = useRef(null);

  // Auto-scroll to the bottom when a new speech item is appended
  useEffect(() => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [transcript]);

  if (transcript.length === 0) {
    return (
      <div className="d-flex h-100 flex-column align-items-center justify-content-center text-secondary py-5">
        <i className="bi bi-chat-dots fs-3 mb-2"></i>
        <small>Dialing initiated. Transcript will start shortly.</small>
      </div>
    );
  }

  return (
    <div className="d-flex flex-column gap-2">
      {transcript.map((item) => {
        const isAgent = item.role === 'agent';
        
        return (
          <div 
            key={item.id}
            className={`d-flex flex-column ${isAgent ? 'align-items-start' : 'align-items-end'}`}
          >
            <div 
              className={`p-3 rounded-3 max-w-75 ${
                isAgent 
                  ? 'bg-primary text-white' 
                  : 'bg-light text-dark border border-secondary border-opacity-10'
              }`}
              style={{ maxWidth: '85%' }}
            >
              <div className="d-flex align-items-center mb-1">
                <span className={`fw-bold small ${isAgent ? 'text-white' : 'text-primary'}`}>
                  {isAgent ? 'Guardian AI' : 'Patient'}
                </span>
                <span className={`ms-2 ${isAgent ? 'text-white-50' : 'text-muted'}`} style={{ fontSize: '0.7rem' }}>
                  {item.timestamp}
                </span>
              </div>
              <p className="mb-0 small" style={{ lineHeight: '1.4' }}>
                {item.message}
              </p>
            </div>
          </div>
        );
      })}
      <div ref={bottomRef} />
    </div>
  );
}

export default TranscriptView;
