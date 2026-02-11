import { Link } from 'react-router-dom'
import { Brain } from 'lucide-react'

export default function Header() {
  return (
    <header className="bg-white shadow">
      <div className="container mx-auto px-4 py-6">
        <Link to="/" className="flex items-center space-x-2">
          <Brain className="w-8 h-8 text-blue-600" />
          <h1 className="text-2xl font-bold text-gray-900">Mimir</h1>
          <span className="text-sm text-gray-500">AI-Powered QA Testing</span>
        </Link>
      </div>
    </header>
  )
}
