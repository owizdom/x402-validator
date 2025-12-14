import './Sidebar.css'

function Sidebar() {
  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <h3>QUICK START</h3>
      </div>
      <div className="sidebar-content">
        <div className="step">
          <div className="step-number">1</div>
          <div className="step-content">
            <div className="step-title">Start Anvil</div>
            <div className="step-description">
              Open a terminal and run:
            </div>
            <div className="step-command">anvil</div>
          </div>
        </div>

        <div className="step">
          <div className="step-number">2</div>
          <div className="step-content">
            <div className="step-title">Deploy Contracts</div>
            <div className="step-description">
              In this terminal, type:
            </div>
            <div className="step-command">deploy</div>
          </div>
        </div>

        <div className="step">
          <div className="step-number">3</div>
          <div className="step-content">
            <div className="step-title">Build Contracts</div>
            <div className="step-description">
              Compile contracts:
            </div>
            <div className="step-command">build</div>
          </div>
        </div>

        <div className="step">
          <div className="step-number">4</div>
          <div className="step-content">
            <div className="step-title">Check Status</div>
            <div className="step-description">
              Verify Anvil is running:
            </div>
            <div className="step-command">status</div>
          </div>
        </div>

        <div className="step">
          <div className="step-number">5</div>
          <div className="step-content">
            <div className="step-title">Test Validator</div>
            <div className="step-description">
              Run validator tests:
            </div>
            <div className="step-command">test</div>
          </div>
        </div>

        <div className="step">
          <div className="step-number">6</div>
          <div className="step-content">
            <div className="step-title">Get Help</div>
            <div className="step-description">
              See all commands:
            </div>
            <div className="step-command">help</div>
          </div>
        </div>
      </div>

      <div className="sidebar-footer">
        <div className="info-box">
          <strong>Note:</strong> Make sure Anvil is running before deploying contracts.
        </div>
      </div>
    </div>
  )
}

export default Sidebar

