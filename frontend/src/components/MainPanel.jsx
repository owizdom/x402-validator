import { useState } from 'react'
import { ethers } from 'ethers'
import axios from 'axios'
import './MainPanel.css'

const CONTRACTS = {
  PaymentVerifier: '0x5FbDB2315678afecb367f032d93F642f64180aa3',
  NodeToken: '0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0'
}

const RPC_URL = 'http://localhost:8545'
const FACILITATOR_URL = 'http://localhost:3000'
const PRIVATE_KEY = '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80'

function MainPanel({ isConnected, status }) {
  const [amount, setAmount] = useState('100')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)

  const handleVerify = async () => {
    setLoading(true)
    setError(null)
    setResult(null)

    try {
      const provider = new ethers.JsonRpcProvider(RPC_URL)
      const wallet = new ethers.Wallet(PRIVATE_KEY, provider)

      const client = wallet.address
      const token = CONTRACTS.NodeToken
      const amountWei = ethers.parseUnits(amount, 18)
      const nonce = Date.now()
      const deadline = Math.floor(Date.now() / 1000) + 3600

      const domain = {
        name: 'x402-PaymentVerifier',
        version: '1',
        chainId: 31337,
        verifyingContract: CONTRACTS.PaymentVerifier
      }

      const types = {
        PaymentAuthorization: [
          { name: 'client', type: 'address' },
          { name: 'token', type: 'address' },
          { name: 'amount', type: 'uint256' },
          { name: 'nonce', type: 'uint256' },
          { name: 'deadline', type: 'uint256' }
        ]
      }

      const message = { client, token, amount: amountWei, nonce, deadline }
      const signature = await wallet.signTypedData(domain, types, message)

      const response = await axios.post(`${FACILITATOR_URL}/api/payment/verify`, {
        client,
        token,
        amount: amountWei.toString(),
        nonce: nonce.toString(),
        deadline: deadline.toString(),
        signature
      })

      setResult({
        success: true,
        data: response.data,
        signature: signature.substring(0, 20) + '...'
      })
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Verification failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="main-panel">
      <div className="panel-header">
        <h2>PAYMENT VERIFICATION</h2>
        <div className="status-indicator">
          <span className={`status-dot ${isConnected ? 'online' : 'offline'}`}></span>
          {isConnected ? 'CONNECTED' : 'DISCONNECTED'}
        </div>
      </div>

      <div className="panel-content">
        <div className="input-group">
          <label>Amount (NODE)</label>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="100"
            min="0"
            step="0.01"
          />
        </div>

        <button
          className="btn-primary"
          onClick={handleVerify}
          disabled={loading || !isConnected}
        >
          {loading ? 'VERIFYING...' : 'PRESS START'}
        </button>

        {error && (
          <div className="result error">
            <strong>ERROR:</strong> {error}
          </div>
        )}

        {result && result.success && (
          <div className="result success">
            <strong>VERIFIED</strong>
            <div className="result-details">
              <p>Status: {result.data.status}</p>
              <p>Latency: {result.data.latency}ms</p>
              <p>Signature: {result.signature}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default MainPanel

