import { useState } from 'react'
import { Play, Upload } from 'lucide-react'

export default function ReplayUploader({ onReplay, loading }) {
  const [file, setFile] = useState(null)
  const [userEmail, setUserEmail] = useState('')
  const [userPassword, setUserPassword] = useState('')
  const [showCredentials, setShowCredentials] = useState(false)

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
    })
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center gap-2 mb-4">
        <Play className="w-6 h-6 text-purple-600" />
        <h2 className="text-xl font-semibold text-gray-900">
          Execute Replay Actions
        </h2>
      </div>

      <p className="text-gray-600 mb-6">
        Upload a previously saved replay actions JSON file to re-execute the same test steps.
        The file includes the URL and test expectations automatically.
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* File Upload */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Replay Actions File (JSON)
          </label>
          <div className="flex items-center gap-2">
            <label className="flex-1 flex items-center justify-center px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-purple-400 transition-colors">
              <Upload className="w-5 h-5 text-gray-400 mr-2" />
              <span className="text-sm text-gray-600">
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
          <p className="text-xs text-gray-500 mt-1">
            Upload the replay_actions.json file from a previous test execution
          </p>
        </div>

        {/* Optional Credentials Toggle */}
        <div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={showCredentials}
              onChange={(e) => setShowCredentials(e.target.checked)}
              className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
              disabled={loading}
            />
            <span className="text-sm font-medium text-gray-700">
              Include login credentials (optional)
            </span>
          </label>
        </div>

        {/* Credentials Fields */}
        {showCredentials && (
          <div className="space-y-4 pl-6 border-l-2 border-purple-200">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email
              </label>
              <input
                type="email"
                value={userEmail}
                onChange={(e) => setUserEmail(e.target.value)}
                placeholder="user@example.com"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
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
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                disabled={loading}
              />
            </div>
          </div>
        )}

        {/* Submit Button */}
        <button
          type="submit"
          disabled={loading || !file}
          className="w-full bg-purple-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-purple-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
        >
          <Play className="w-5 h-5" />
          {loading ? 'Starting Replay...' : 'Execute Replay'}
        </button>
      </form>
    </div>
  )
}
