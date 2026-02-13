import { useState } from 'react'
import { Upload, Loader2 } from 'lucide-react'
import BrowserSettings from './BrowserSettings'

export default function TestCaseUploader({ onUpload, loading }) {
  const [file, setFile] = useState(null)
  const [url, setUrl] = useState('')
  const [userEmail, setUserEmail] = useState('')
  const [userPassword, setUserPassword] = useState('')
  const [showCredentials, setShowCredentials] = useState(false)
  const [browserMode, setBrowserMode] = useState('new')
  const [headless, setHeadless] = useState(false)
  const [cdpUrl, setCdpUrl] = useState('http://localhost:9222')

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
      browserMode,
      headless,
      cdpUrl: browserMode === 'existing' ? cdpUrl : null,
    })
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center space-x-2 mb-4">
        <Upload className="w-6 h-6 text-blue-600" />
        <h2 className="text-xl font-semibold">Re-run Existing Test Cases</h2>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Upload Test Case File (.json)
          </label>
          <input
            type="file"
            accept=".json"
            onChange={handleFileChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
          {file && (
            <p className="mt-1 text-sm text-green-600">
              Selected: {file.name}
            </p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Test URL (optional - uses URL from file if not provided)
          </label>
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="https://example.com"
          />
        </div>

        {/* Optional Credentials Toggle */}
        <div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={showCredentials}
              onChange={(e) => setShowCredentials(e.target.checked)}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              disabled={loading}
            />
            <span className="text-sm font-medium text-gray-700">
              Include login credentials (optional)
            </span>
          </label>
        </div>

        {/* Credentials Fields */}
        {showCredentials && (
          <div className="space-y-4 pl-6 border-l-2 border-blue-200">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email
              </label>
              <input
                type="email"
                value={userEmail}
                onChange={(e) => setUserEmail(e.target.value)}
                placeholder="user@example.com"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={loading}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Password
              </label>
              <input
                type="password"
                value={userPassword}
                onChange={(e) => setUserPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={loading}
              />
            </div>
          </div>
        )}

        <BrowserSettings
          browserMode={browserMode}
          setBrowserMode={setBrowserMode}
          headless={headless}
          setHeadless={setHeadless}
          cdpUrl={cdpUrl}
          setCdpUrl={setCdpUrl}
          disabled={loading}
        />

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
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
