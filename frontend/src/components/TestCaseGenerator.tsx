import { useState, useEffect, FormEvent, ChangeEvent } from 'react'
import { FileText, Loader2, X } from 'lucide-react'

const STORAGE_KEY = 'mimir_ticket_description'

interface TestCaseGeneratorProps {
  onGenerate: (data: {
    description: string
    url: string
    userEmail: string | null
    userPassword: string | null
  }) => void
  loading: boolean
}

export default function TestCaseGenerator({ onGenerate, loading }: TestCaseGeneratorProps): JSX.Element {
  const [description, setDescription] = useState<string>('')
  const [url, setUrl] = useState<string>('')
  const [userEmail, setUserEmail] = useState<string>('')
  const [userPassword, setUserPassword] = useState<string>('')
  const [showCredentials, setShowCredentials] = useState<boolean>(false)

  // Load from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) {
      setDescription(saved)
    }
  }, [])

  // Save to localStorage whenever description changes
  useEffect(() => {
    if (description) {
      localStorage.setItem(STORAGE_KEY, description)
    }
  }, [description])

  const handleClearDescription = (): void => {
    setDescription('')
    localStorage.removeItem(STORAGE_KEY)
  }

  const handleSubmit = (e: FormEvent<HTMLFormElement>): void => {
    e.preventDefault()
    onGenerate({
      description,
      url,
      userEmail: showCredentials ? userEmail : null,
      userPassword: showCredentials ? userPassword : null,
    })
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-blue-50 rounded-lg">
          <FileText className="w-6 h-6 text-[#3B82F6]" />
        </div>
        <div>
          <h2 className="text-xl font-semibold text-[#111827]">Generate Test Cases</h2>
          <p className="text-sm text-[#6B7280]">Create test cases from ticket descriptions</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="block text-sm font-semibold text-[#111827]">
              Ticket Description (Markdown supported)
            </label>
            {description && (
              <button
                type="button"
                onClick={handleClearDescription}
                className="text-xs text-[#6B7280] hover:text-red-600 flex items-center gap-1 transition-colors"
              >
                <X className="w-3 h-3" />
                Clear
              </button>
            )}
          </div>
          <textarea
            value={description}
            onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setDescription(e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3B82F6] focus:border-transparent font-mono text-sm transition-all"
            rows={10}
            placeholder="Paste ticket description from Notion..."
            required
          />
          {description && (
            <p className="text-xs text-[#10B981] mt-2 flex items-center gap-1">
              <span className="w-1 h-1 bg-[#10B981] rounded-full"></span>
              Saved locally - will be restored if you refresh the page
            </p>
          )}
        </div>

        <div>
          <label className="block text-sm font-semibold text-[#111827] mb-2">
            Test URL
          </label>
          <input
            type="url"
            value={url}
            onChange={(e: ChangeEvent<HTMLInputElement>) => setUrl(e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3B82F6] focus:border-transparent transition-all"
            placeholder="https://example.com"
            required
          />
        </div>

        {/* Optional Credentials Toggle */}
        <div className="pt-2">
          <label className="flex items-center gap-2 cursor-pointer group">
            <input
              type="checkbox"
              checked={showCredentials}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setShowCredentials(e.target.checked)}
              className="rounded border-gray-300 text-[#3B82F6] focus:ring-[#3B82F6] w-4 h-4"
              disabled={loading}
            />
            <span className="text-sm font-medium text-[#111827] group-hover:text-[#3B82F6] transition-colors">
              Include login credentials (optional)
            </span>
          </label>
        </div>

        {/* Credentials Fields */}
        {showCredentials && (
          <div className="space-y-4 pl-6 border-l-2 border-[#3B82F6] bg-blue-50/30 py-4 pr-4 rounded-r-lg">
            <div>
              <label className="block text-sm font-semibold text-[#111827] mb-2">
                Email
              </label>
              <input
                type="email"
                value={userEmail}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setUserEmail(e.target.value)}
                placeholder="user@example.com"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3B82F6] focus:border-transparent transition-all"
                disabled={loading}
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-[#111827] mb-2">
                Password
              </label>
              <input
                type="password"
                value={userPassword}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setUserPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3B82F6] focus:border-transparent transition-all"
                disabled={loading}
              />
            </div>
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-[#3B82F6] text-white py-3 px-6 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2 font-medium transition-all shadow-sm hover:shadow-md"
        >
          {loading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>Generating...</span>
            </>
          ) : (
            <span>Generate Test Cases</span>
          )}
        </button>
      </form>
    </div>
  )
}
