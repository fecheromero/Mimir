import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import Dashboard from './pages/Dashboard'
import JobResults from './pages/JobResults'
import Sidebar from './components/Sidebar'

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-[#F9FAFB] flex">
        <Sidebar />
        <main className="flex-1 overflow-auto">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/jobs/:jobId" element={<JobResults />} />
          </Routes>
        </main>
      </div>
    </Router>
  )
}

export default App
