import { useState } from 'react'
import { Upload, Loader2 } from 'lucide-react'
import BrowserSettings from './BrowserSettings'

export default function TestCaseUploader({ onUpload, loading }) {
  const [file, setFile] = useState(null)
  const [url, setUrl] = useState('')
  const [userEmail, setUserEmail] = useState('')
  const [userPassword, setUserPassword] = useState('')
  const [showCredentials, setShowCredentials] = useState(false)
  const [headless, setHeadless] = useState(false)

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0]
    if (selectedFile && selectedFile.type === 'application/json') {
      setFile(selectedFile)
    } else {
      alert('Please select a JSON file')
    }
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!file) {
      alert('Please select a file')
      return
    }
    onUpload({
      file,
      url,
      userEmail: showCredentials ? userEmail : null,
      userPassword: showCredentials ? userPassword : null,
      headless,
    })
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-green-50 rounded-lg">
          <Upload className="w-6 h-6 text-[#10B981]" />
        </div>
        <div>
          <h2 className="text-xl font-semibold text-[#111827]">Re-run Existing Test Cases</h2>
          <p className="text-sm text-[#6B7280]">Upload and execute saved test cases</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="block text-sm font-semibold text-[#111827] mb-2">
            Upload Test Case File (.json)
          </label>
          <input
            type="file"
            accept=".json"
            onChange={handleFileChange}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#10B981] focus:border-transparent transition-all file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-green-50 file:text-[#10B981] hover:file:bg-green-100"
            required
          />
          {file && (
            <p className="mt-2 text-sm text-[#10B981] flex items-center gap-1">
              <span className="w-1 h-1 bg-[#10B981] rounded-full"></span>
              Selected: {file.name}
            </p>
          )}
        </div>

        <div>
          <label className="block text-sm font-semibold text-[#111827] mb-2">
            Test URL (optional - uses URL from file if not provided)
          </label>
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#10B981] focus:border-transparent transition-all"
            placeholder="https://example.com"
          />
        </div>

        {/* Optional Credentials Toggle */}
        <div className="pt-2">
          <label className="flex items-center gap-2 cursor-pointer group">
            <input
              type="checkbox"
              checked={showCredentials}
              onChange={(e) => setShowCredentials(e.target.checked)}
              className="rounded border-gray-300 text-[#10B981] focus:ring-[#10B981] w-4 h-4"
              disabled={loading}
            />
            <span className="text-sm font-medium text-[#111827] group-hover:text-[#10B981] transition-colors">
              Include login credentials (optional)
            </span>
          </label>
        </div>

        {/* Credentials Fields */}
        {showCredentials && (
          <div className="space-y-4 pl-6 border-l-2 border-[#10B981] bg-green-50/30 py-4 pr-4 rounded-r-lg">
            <div>
              <label className="block text-sm font-semibold text-[#111827] mb-2">
                Email
              </label>
              <input
                type="email"
                value={userEmail}
                onChange={(e) => setUserEmail(e.target.value)}
                placeholder="user@example.com"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#10B981] focus:border-transparent transition-all"
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
                onChange={(e) => setUserPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#10B981] focus:border-transparent transition-all"
                disabled={loading}
              />
            </div>
          </div>
        )}

        <BrowserSettings
          headless={headless}
          setHeadless={setHeadless}
          disabled={loading}
        />

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-[#10B981] text-white py-3 px-6 rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2 font-medium transition-all shadow-sm hover:shadow-md"
        >
          {loading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>Executing...</span>
            </>
          ) : (
            <span>Execute Test Cases</span>
          )}
        </button>
      </form>
    </div>
  )
}
