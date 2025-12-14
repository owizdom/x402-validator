import './TestResultsCard.css'

function TestResultsCard({ results, onClose }) {
  if (!results) return null

  const allPassed = results.tests?.every(t => t.passed) || false
  const timestamp = new Date().toLocaleString()

  const formatDetails = (details) => {
    if (!details) return ''
    // Split by lines and format
    return details.split('\n').filter(line => line.trim())
  }

  return (
    <div className="test-card-overlay" onClick={onClose}>
      <div className="test-receipt" onClick={(e) => e.stopPropagation()}>
        <div className="receipt-header">
          <div className="receipt-store-name">x402 VALIDATOR</div>
          <div className="receipt-subtitle">Test Results Receipt</div>
          <div className="receipt-date">{timestamp}</div>
        </div>

        <div className="receipt-divider"></div>

        <div className="receipt-body">
          <div className="receipt-section">
            <div className="receipt-section-title">TEST SUMMARY</div>
            <div className="receipt-line">
              <span className="receipt-label">Status:</span>
              <span className={`receipt-value ${allPassed ? 'status-pass' : 'status-fail'}`}>
                {allPassed ? 'PASSED' : 'FAILED'}
              </span>
            </div>
            {results.summary && (
              <>
                <div className="receipt-line">
                  <span className="receipt-label">Total Tests:</span>
                  <span className="receipt-value">{results.summary.total}</span>
                </div>
                <div className="receipt-line">
                  <span className="receipt-label">Passed:</span>
                  <span className="receipt-value status-pass">{results.summary.passed}</span>
                </div>
                <div className="receipt-line">
                  <span className="receipt-label">Failed:</span>
                  <span className="receipt-value status-fail">{results.summary.failed}</span>
                </div>
              </>
            )}
          </div>

          <div className="receipt-divider"></div>

          <div className="receipt-section">
            <div className="receipt-section-title">TEST DETAILS</div>
            {results.tests?.map((test, index) => (
              <div key={index} className="receipt-test-item">
                <div className="receipt-line">
                  <span className={`receipt-test-status ${test.passed ? 'status-pass' : 'status-fail'}`}>
                    {test.passed ? '✓' : '✗'}
                  </span>
                  <span className="receipt-test-name">{test.name}</span>
                </div>
                {test.details && (
                  <div className="receipt-test-details">
                    {formatDetails(test.details).map((line, i) => (
                      <div key={i} className="receipt-detail-line">{line}</div>
                    ))}
                  </div>
                )}
                {test.client && (
                  <div className="receipt-test-details">
                    <div className="receipt-detail-line">Client: {test.client}</div>
                    <div className="receipt-detail-line">Token: {test.token}</div>
                    <div className="receipt-detail-line">Amount: {test.amount}</div>
                    {test.nonce && <div className="receipt-detail-line">Nonce: {test.nonce}</div>}
                    {test.signature && (
                      <div className="receipt-detail-line">Signature: {test.signature.substring(0, 20)}...</div>
                    )}
                  </div>
                )}
                {test.latency && (
                  <div className="receipt-detail-line">Latency: {test.latency}ms</div>
                )}
              </div>
            ))}
          </div>

          <div className="receipt-divider"></div>

          <div className="receipt-section">
            <div className="receipt-line receipt-total">
              <span className="receipt-label">FINAL RESULT</span>
              <span className={`receipt-value ${allPassed ? 'status-pass' : 'status-fail'}`}>
                {allPassed ? 'ALL TESTS PASSED' : 'SOME TESTS FAILED'}
              </span>
            </div>
          </div>

          <div className="receipt-divider"></div>

          <div className="receipt-footer">
            <div className="receipt-thank-you">Thank you for testing!</div>
            <div className="receipt-info">x402 Validator Terminal</div>
            <div className="receipt-info">by wisdom</div>
          </div>
        </div>

        <button className="receipt-close" onClick={onClose}>Close</button>
      </div>
    </div>
  )
}

export default TestResultsCard

