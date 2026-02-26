import { Link, useLocation } from 'react-router-dom'
import { TestTube2, GitPullRequest, History } from 'lucide-react'

export default function Sidebar(): JSX.Element {
  const location = useLocation()
  const isQAActive = location.pathname === '/'
  const isPRActive = location.pathname.startsWith('/pr-reviewer')
  const isHistoryActive = location.pathname.startsWith('/qa-run-history')

  return (
    <aside className="w-64 bg-[#0F1419] min-h-screen flex flex-col">
      {/* Logo Section */}
      <div className="p-6 border-b border-gray-800">
        <div className="flex flex-col items-center">
          {/* SVG Logo */}
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 500" className="w-32 h-32 mb-2">
            <defs>
              <clipPath id="circleClip">
                <circle cx="250" cy="190" r="140" />
              </clipPath>
              <linearGradient id="waterGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#0ea5e9" />
                <stop offset="100%" stopColor="#0284c7" />
              </linearGradient>
              <linearGradient id="skyGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#0f172a" />
                <stop offset="100%" stopColor="#1e293b" />
              </linearGradient>
            </defs>
            <circle cx="250" cy="190" r="145" fill="#e2e8f0" />
            <g clipPath="url(#circleClip)">
              <rect x="0" y="0" width="500" height="240" fill="url(#skyGrad)" />
              <path d="M 120,230 C 130,100 180,60 250,60 C 320,60 370,100 380,230 Z" fill="#1e293b" />
              <path d="M 250,60 C 190,60 140,110 120,180 C 110,210 80,215 50,220 L 140,220 C 150,160 180,100 250,85 Z" fill="#334155" />
              <path d="M 250,60 C 310,60 360,110 380,180 C 390,210 420,215 450,220 L 360,220 C 350,160 320,100 250,85 Z" fill="#334155" />
              <path d="M 230,65 C 180,90 150,150 135,220" stroke="#475569" strokeWidth="2.5" fill="none" />
              <path d="M 210,75 C 170,110 160,170 150,220" stroke="#475569" strokeWidth="2" fill="none" />
              <path d="M 270,65 C 320,90 350,150 365,220" stroke="#475569" strokeWidth="2.5" fill="none" />
              <path d="M 290,75 C 330,110 340,170 350,220" stroke="#475569" strokeWidth="2" fill="none" />
              <path d="M 175,220 L 175,160 C 175,100 210,80 250,80 C 290,80 325,100 325,160 L 325,220 Z" fill="#f8fafc" />
              <path d="M 175,160 Q 195,180 195,220" stroke="#e2e8f0" strokeWidth="3" fill="none" />
              <path d="M 325,160 Q 305,180 305,220" stroke="#e2e8f0" strokeWidth="3" fill="none" />
              <path d="M 220,115 Q 250,120 280,115 M 230,105 Q 250,110 270,105 M 225,125 Q 250,130 275,125" stroke="#cbd5e1" strokeWidth="2" fill="none" strokeLinecap="round" />
              <path d="M 195,155 Q 215,145 235,150 M 305,155 Q 285,145 265,150" stroke="#64748b" strokeWidth="6" fill="none" strokeLinecap="round" />
              <path d="M 200,175 Q 215,185 230,175 M 300,175 Q 285,185 270,175" stroke="#0f172a" strokeWidth="3.5" fill="none" strokeLinecap="round" />
              <path d="M 240,150 Q 235,180 230,210 M 260,150 Q 265,180 270,210" stroke="#94a3b8" strokeWidth="2" fill="none" strokeLinecap="round" />
              <path d="M 230,210 Q 250,225 270,210" stroke="#94a3b8" strokeWidth="2.5" fill="none" strokeLinecap="round" />
              <rect x="0" y="220" width="500" height="200" fill="url(#waterGrad)" />
              <path d="M 175,220 C 175,320 325,320 325,220 Z" fill="#ffffff" opacity="0.1" />
              <path d="M 50,220 Q 250,225 450,220" stroke="#bae6fd" strokeWidth="4" fill="none" />
              <path d="M 100,235 Q 250,240 400,235" stroke="#7dd3fc" strokeWidth="2" fill="none" opacity="0.6" />
            </g>
          </svg>

          {/* Brand Text */}
          <h1 className="text-white text-2xl font-bold tracking-[0.3em]">MIMIR</h1>
          <p className="text-gray-400 text-xs tracking-[0.2em] mt-1">DEV TOOLS</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-2">
        <Link
          to="/"
          className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
            isQAActive
              ? 'bg-blue-600 text-white'
              : 'text-gray-300 hover:bg-gray-800 hover:text-white'
          }`}
        >
          <TestTube2 className="w-5 h-5" />
          <span className="font-medium">QA Assistant</span>
        </Link>

        <Link
          to="/qa-run-history"
          className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
            isHistoryActive
              ? 'bg-blue-600 text-white'
              : 'text-gray-300 hover:bg-gray-800 hover:text-white'
          }`}
        >
          <History className="w-5 h-5" />
          <span className="font-medium">QA Run History</span>
        </Link>

        <Link
          to="/pr-reviewer"
          className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
            isPRActive
              ? 'bg-blue-600 text-white'
              : 'text-gray-300 hover:bg-gray-800 hover:text-white'
          }`}
        >
          <GitPullRequest className="w-5 h-5" />
          <span className="font-medium">PR Reviewer</span>
        </Link>
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-gray-800">
        <p className="text-gray-500 text-xs text-center">
          AI-Powered Testing Platform
        </p>
      </div>
    </aside>
  )
}
