import Terminal from './components/Terminal'
import Sidebar from './components/Sidebar'
import './App.css'

function App() {
  return (
    <div className="app">
      <div className="bg-animated"></div>
      <div className="main-container">
        <Sidebar />
        <div className="terminal-wrapper">
          <Terminal />
        </div>
      </div>
    </div>
  )
}

export default App

