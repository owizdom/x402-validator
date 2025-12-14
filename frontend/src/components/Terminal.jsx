import { useEffect, useRef, useState } from 'react'
import { Terminal as XTerm } from '@xterm/xterm'
import { FitAddon } from '@xterm/addon-fit'
import { WebLinksAddon } from '@xterm/addon-web-links'
import '@xterm/xterm/css/xterm.css'
import axios from 'axios'
import TestResultsCard from './TestResultsCard'
import './Terminal.css'

const PROMPT = '$ '
const FACILITATOR_URL = 'http://localhost:3000'

function Terminal() {
  const terminalRef = useRef(null)
  const xtermRef = useRef(null)
  const fitAddonRef = useRef(null)
  const [commandHistory, setCommandHistory] = useState([])
  const [historyIndex, setHistoryIndex] = useState(-1)
  const [testResults, setTestResults] = useState(null)
  const currentCommandRef = useRef('')

  useEffect(() => {
    if (!terminalRef.current) return

    const xterm = new XTerm({
      cursorBlink: true,
      fontSize: 13,
      fontFamily: 'Courier New, Monaco, monospace',
      lineHeight: 1.3,
      letterSpacing: 0.3,
      wordWrap: true,
      convertEol: true,
      theme: {
        background: '#ffffff',
        foreground: '#000000',
        cursor: '#000000',
        selection: '#00000020',
        black: '#000000',
        red: '#cc0000',
        green: '#00aa00',
        yellow: '#cc6600',
        blue: '#0066cc',
        magenta: '#6600cc',
        cyan: '#006666',
        white: '#000000',
        brightBlack: '#666666',
        brightRed: '#cc0000',
        brightGreen: '#00aa00',
        brightYellow: '#cc6600',
        brightBlue: '#0066cc',
        brightMagenta: '#6600cc',
        brightCyan: '#006666',
        brightWhite: '#000000'
      },
      allowProposedApi: true
    })

    const fitAddon = new FitAddon()
    const webLinksAddon = new WebLinksAddon()

    xterm.loadAddon(fitAddon)
    xterm.loadAddon(webLinksAddon)
    xterm.open(terminalRef.current)

    fitAddon.fit()

    xtermRef.current = xterm
    fitAddonRef.current = fitAddon

    // Welcome message
    xterm.writeln('x402 Validator Terminal')
    xterm.writeln('Type "help" for available commands')
    xterm.writeln('')
    writePrompt(xterm)

    // Check Anvil status silently (don't show error if it fails)
    checkAnvilStatus(xterm, true)

    // Handle input
    let currentLine = ''
    xterm.onData((data) => {
      if (data === '\r') {
        // Enter pressed
        xterm.write('\r\n')
        handleCommand(currentLine.trim(), xterm)
        if (currentLine.trim()) {
          setCommandHistory(prev => [...prev, currentLine.trim()])
        }
        currentLine = ''
        currentCommandRef.current = ''
        setHistoryIndex(-1)
        writePrompt(xterm)
      } else if (data === '\x7f' || data === '\b') {
        // Backspace
        if (currentLine.length > 0) {
          currentLine = currentLine.slice(0, -1)
          xterm.write('\b \b')
        }
      } else if (data === '\x1b[A') {
        // Up arrow - history
        if (commandHistory.length > 0) {
          const newIndex = historyIndex === -1 
            ? commandHistory.length - 1 
            : Math.max(0, historyIndex - 1)
          setHistoryIndex(newIndex)
          const cmd = commandHistory[newIndex]
          // Clear current line and write history
          xterm.write('\r' + PROMPT + ' '.repeat(currentLine.length))
          xterm.write('\r' + PROMPT + cmd)
          currentLine = cmd
          currentCommandRef.current = cmd
        }
      } else if (data === '\x1b[B') {
        // Down arrow - history
        if (historyIndex !== -1) {
          const newIndex = historyIndex + 1
          if (newIndex >= commandHistory.length) {
            setHistoryIndex(-1)
            xterm.write('\r' + PROMPT + ' '.repeat(currentLine.length))
            xterm.write('\r' + PROMPT)
            currentLine = ''
            currentCommandRef.current = ''
          } else {
            setHistoryIndex(newIndex)
            const cmd = commandHistory[newIndex]
            xterm.write('\r' + PROMPT + ' '.repeat(currentLine.length))
            xterm.write('\r' + PROMPT + cmd)
            currentLine = cmd
            currentCommandRef.current = cmd
          }
        }
      } else if (data >= ' ') {
        // Printable character
        currentLine += data
        currentCommandRef.current = currentLine
        xterm.write(data)
      }
    })

    // Handle window resize
    const handleResize = () => {
      fitAddon.fit()
    }
    window.addEventListener('resize', handleResize)


    return () => {
      window.removeEventListener('resize', handleResize)
      xterm.dispose()
    }
  }, [])

  const writePrompt = (xterm) => {
    xterm.write(PROMPT)
  }

  const checkAnvilStatus = async (xterm, silent = false) => {
    try {
      const response = await axios.get(`${FACILITATOR_URL}/api/terminal/status`, {
        timeout: 1000
      })
      if (response.data.anvilRunning && !silent) {
        xterm.writeln('\x1b[32m[OK]\x1b[0m Anvil is running')
      } else if (!response.data.anvilRunning && !silent) {
        xterm.writeln('\x1b[31m[!]\x1b[0m Anvil is not running. Start it with: anvil')
      }
    } catch (error) {
      // Silently fail - don't show error message
      if (!silent) {
        // Only show error if explicitly checking status
      }
    }
  }

  const handleCommand = async (command, xterm) => {
    if (!command) return

    // Handle clear
    if (command === 'clear') {
      xterm.clear()
      writePrompt(xterm)
      return
    }

    // Show command being executed
    try {
      const response = await axios.post(`${FACILITATOR_URL}/api/terminal/execute`, {
        command
      })

      // Show test results card if available
      if (command === 'test' && response.data.testResults) {
        setTestResults(response.data.testResults);
      }

      if (response.data.output) {
        // Write output with proper formatting
        let output = response.data.output;
        // Ensure proper line breaks
        if (!output.endsWith('\n')) {
          output += '\n';
        }
        // Write output line by line to ensure proper wrapping
        const lines = output.split('\n');
        lines.forEach((line, index) => {
          if (line) {
            xterm.writeln(line);
          } else if (index < lines.length - 1) {
            xterm.writeln('');
          }
        });
      }

      // Reset color after output
      if (response.data.exitCode !== 0) {
        xterm.write('\x1b[0m')
      }
    } catch (error) {
      xterm.writeln(`\x1b[31mError: ${error.response?.data?.error || error.message}\x1b[0m`)
    }
  }

  return (
    <>
      <div className="terminal-container">
        <div className="terminal-header">
          <div className="terminal-title">x402 Validator Terminal by wisdom</div>
          <div className="terminal-controls">
            <span className="control-dot red"></span>
            <span className="control-dot yellow"></span>
            <span className="control-dot green"></span>
          </div>
        </div>
        <div ref={terminalRef} className="terminal"></div>
      </div>
      {testResults && (
        <TestResultsCard 
          results={testResults} 
          onClose={() => setTestResults(null)} 
        />
      )}
    </>
  )
}

export default Terminal

