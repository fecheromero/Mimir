import { useState } from 'react'
import { Play, Upload } from 'lucide-react'
import BrowserSettings from './BrowserSettings'

export default function ReplayUploader({ onReplay, loading }) {
  const [file, setFile] = useState(null)
  const [userEmail, setUserEmail] = useState('')
  const [userPassword, setUserPassword] = useState('')
  const [showCredentials, setShowCredentials] = useState(false)
  const [headless, setHeadless] = useState(false)

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0]
    if (selectedFile && selectedFile.type === 'application/json') {
      setFile(selectedFile)
    } else {
      alert('Please select a valid JSON file')
      e.target.value = null
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!file) {
      alert('Please select a replay actions JSON file')
      return
    }

    await onReplay({
      file,
      userEmail: showCredentials ? userEmail : null,
      userPassword: showCredentials ? userPassword : null,
      headless,
    })
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-purple-50 rounded-lg">
          <Play className="w-6 h-6 text-purple-600" />
        </div>
        <div>
          <h2 className="text-xl font-semibold text-[#111827]">
            Execute Replay Actions
          </h2>
          <p className="text-sm text-[#6B7280]">Re-execute saved test actions</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* File Upload */}
        <div>
          <label className="block text-sm font-semibold text-[#111827] mb-2">
            Replay Actions File (JSON)
          </label>
          <div className="flex items-center gap-2">
            <label className="flex-1 flex items-center justify-center px-4 py-4 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-purple-500 hover:bg-purple-50/30 transition-all">
              <Upload className="w-5 h-5 text-purple-600 mr-2" />
              <span className="text-sm text-[#111827] font-medium">
                {file ? file.name : 'Click to upload JSON file'}
              </span>
              <input
                type="file"
                accept=".json,application/json"
                onChange={handleFileChange}
                className="hidden"
                disabled={loading}
              />
            </label>
          </div>
          <p className="text-xs text-[#6B7280] mt-2">
            Upload the replay_actions.json file from a previous test execution
          </p>
        </div>

        {/* Optional Credentials Toggle */}
        <div className="pt-2">
          <label className="flex items-center gap-2 cursor-pointer group">
            <input
              type="checkbox"
              checked={showCredentials}
              onChange={(e) => setShowCredentials(e.target.checked)}
              className="rounded border-gray-300 text-purple-600 focus:ring-purple-500 w-4 h-4"
              disabled={loading}
            />
            <span className="text-sm font-medium text-[#111827] group-hover:text-purple-600 transition-colors">
              Include login credentials (optional)
            </span>
          </label>
        </div>

        {/* Credentials Fields */}
        {showCredentials && (
          <div className="space-y-4 pl-6 border-l-2 border-purple-500 bg-purple-50/30 py-4 pr-4 rounded-r-lg">
            <div>
              <label className="block text-sm font-semibold text-[#111827] mb-2">
                Email
              </label>
              <input
                type="email"
                value={userEmail}
                onChange={(e) => setUserEmail(e.target.value)}
                placeholder="user@example.com"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
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
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
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

        {/* Submit Button */}
        <button
          type="submit"
          disabled={loading || !file}
          className="w-full bg-purple-600 text-white py-3 px-6 rounded-lg font-medium hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 shadow-sm hover:shadow-md"
        >
          <Play className="w-5 h-5" />
          {loading ? 'Starting Replay...' : 'Execute Replay'}
        </button>
      </form>
    </div>
  )
}
