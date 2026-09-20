import { useState, useEffect, useRef } from 'react'

const API_BASE = 'http://localhost:3001/api';

function App() {
  const [url, setUrl] = useState('');
  const [jobId, setJobId] = useState(null);
  const [status, setStatus] = useState(null); // { status, files, logs }
  const [error, setError] = useState('');
  const logsEndRef = useRef(null);

  // Auto-scroll logs
  useEffect(() => {
    if (logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [status?.logs]);

  // Polling for status
  useEffect(() => {
    let interval;
    if (jobId && status?.status !== 'completed' && status?.status !== 'failed') {
      interval = setInterval(async () => {
        try {
          const res = await fetch(`${API_BASE}/status/${jobId}`);
          if (!res.ok) throw new Error('Failed to fetch status');
          const data = await res.json();
          setStatus(data);
          
          if (data.status === 'completed' || data.status === 'failed') {
            clearInterval(interval);
          }
        } catch (err) {
          console.error(err);
        }
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [jobId, status?.status]);

  const handleScrape = async (e) => {
    e.preventDefault();
    if (!url) return;
    
    // Attempt to extract domain from url
    let domain = '';
    try {
      const parsedUrl = new URL(url);
      domain = parsedUrl.hostname.replace(/^www\./, '');
    } catch(err) {
      setError('Please enter a valid URL.');
      return;
    }

    setError('');
    setStatus(null);
    setJobId(null);

    try {
      const res = await fetch(`${API_BASE}/scrape`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, domain })
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to start');
      
      setJobId(data.jobId);
      setStatus({ status: 'initializing', files: 0, logs: [] });
    } catch (err) {
      setError(err.message);
    }
  };

  const isScraping = status && status.status !== 'completed' && status.status !== 'failed';

  return (
    <div className="app-container">
      <div className="background-glow"></div>
      
      <main className="glass-panel">
        <header className="header">
          <h1>Asset Extractor</h1>
          <p>Extract all assets, UI elements, and source code from any website</p>
        </header>

        <form onSubmit={handleScrape} className="input-group">
          <input 
            type="url" 
            placeholder="https://example.com"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            disabled={isScraping}
            required
            className="url-input"
          />
          <button 
            type="submit" 
            className={`scrape-btn ${isScraping ? 'scraping' : ''}`}
            disabled={isScraping || !url}
          >
            {isScraping ? 'Extracting...' : 'Extract'}
          </button>
        </form>

        {error && <div className="error-message">{error}</div>}

        {status && (
          <div className="status-panel">
            <div className="status-header">
              <span className={`status-badge ${status.status}`}>{status.status.replace('_', ' ').toUpperCase()}</span>
              <span className="file-count">{status.files} files captured</span>
            </div>

            {status.status === 'failed' && status.error && (
              <div className="error-message" style={{ margin: '1rem' }}>
                {status.error}
              </div>
            )}

            <div className="logs-container">
              {status.logs?.map((log, i) => (
                <div key={i} className="log-entry">
                  <span className="log-time">{new Date().toLocaleTimeString()}</span>
                  <span className="log-text">{log}</span>
                </div>
              ))}
              <div ref={logsEndRef} />
            </div>

            {status.status === 'completed' && (
              <a href={`${API_BASE}/download/${jobId}`} className="download-btn">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                Download ZIP
              </a>
            )}
          </div>
        )}
      </main>
    </div>
  )
}

export default App
