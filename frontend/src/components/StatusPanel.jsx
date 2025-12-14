import './StatusPanel.css'

function StatusPanel({ isConnected, status }) {
  return (
    <div className="status-panel">
      <div className="panel-header">
        <h2>SYSTEM STATUS</h2>
      </div>

      <div className="panel-content">
        <div className="status-item">
          <span className="status-label">FACILITATOR</span>
          <span className={`status-value ${isConnected ? 'online' : 'offline'}`}>
            {isConnected ? 'ONLINE' : 'OFFLINE'}
          </span>
        </div>

        {status && (
          <>
            <div className="status-item">
              <span className="status-label">UPTIME</span>
              <span className="status-value">
                {Math.floor(status.uptime / 60)}m {status.uptime % 60}s
              </span>
            </div>

            <div className="status-item">
              <span className="status-label">VERSION</span>
              <span className="status-value">{status.version}</span>
            </div>

            <div className="status-item">
              <span className="status-label">STATUS</span>
              <span className="status-value">{status.status.toUpperCase()}</span>
            </div>
          </>
        )}

        <div className="contracts-section">
          <h3>CONTRACTS</h3>
          <div className="contract-list">
            <div className="contract-item">
              <span className="contract-name">PaymentVerifier</span>
              <span className="contract-address">0x5FbD...80aa3</span>
            </div>
            <div className="contract-item">
              <span className="contract-name">Settlement</span>
              <span className="contract-address">0xe7f1...0512</span>
            </div>
            <div className="contract-item">
              <span className="contract-name">ValidatorRegistry</span>
              <span className="contract-address">0xCf7E...0Fc9</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default StatusPanel

