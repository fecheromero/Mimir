import { useState, FormEvent, ChangeEvent } from 'react'
import { Play, Upload } from 'lucide-react'
import BrowserSettings from './BrowserSettings'

interface ReplayUploaderProps {
  onReplay: (data: {
    file: File
    userEmail: string | null
    userPassword: string | null
    headless: boolean
  }) => Promise<void>
  loading: boolean
}

export default function ReplayUploader({ onReplay, loading }: ReplayUploaderProps): JSX.Element {
  const [file, setFile] = useState<File | null>(null)
  const [userEmail, setUserEmail] = useState<string>('')
  const [userPassword, setUserPassword] = useState<string>('')
  const [showCredentials, setShowCredentials] = useState<boolean>(false)
  const [headless, setHeadless] = useState<boolean>(false)

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>): void => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile && selectedFile.type === 'application/json') {
      setFile(selectedFile)
    } else {
      alert('Please select a valid JSON file')
      e.target.value = ''
    }
  }

  const handleSubmit = async (e: FormEvent<HTMLFormElement>): Promise<void> => {
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
    <div className="bg-[#0F1419] border border-gray-800 rounded-lg p-6 hover:border-gray-700 transition-colors">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-purple-500/20 rounded-lg">
          <Play className="w-6 h-6 text-purple-400" />
        </div>
        <div>
          <h2 className="text-xl font-semibold text-white">
            Execute Replay Actions
          </h2>
          <p className="text-sm text-gray-400">Re-execute saved test actions</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* File Upload */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Replay Actions File (JSON)
          </label>
          <div className="flex items-center gap-2">
            <label className="flex-1 flex items-center justify-center px-4 py-4 border-2 border-dashed border-gray-700 rounded-lg cursor-pointer hover:border-purple-500 hover:bg-purple-500/10 transition-all">
              <Upload className="w-5 h-5 text-purple-400 mr-2" />
              <span className="text-sm text-gray-300 font-medium">
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
          <p className="text-xs text-gray-400 mt-2">
            Upload the replay_actions.json file from a previous test execution
          </p>
        </div>

        {/* Optional Credentials Toggle */}
        <div className="pt-2">
          <label className="flex items-center gap-2 cursor-pointer group">
            <input
              type="checkbox"
              checked={showCredentials}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setShowCredentials(e.target.checked)}
              className="rounded border-gray-700 text-purple-500 focus:ring-purple-500 w-4 h-4 bg-[#0A0E14]"
              disabled={loading}
            />
            <span className="text-sm font-medium text-gray-300 group-hover:text-purple-400 transition-colors">
              Include login credentials (optional)
            </span>
          </label>
        </div>

        {/* Credentials Fields */}
        {showCredentials && (
          <div className="space-y-4 pl-6 border-l-2 border-purple-500 bg-purple-500/10 py-4 pr-4 rounded-r-lg">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Email
              </label>
              <input
                type="email"
                value={userEmail}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setUserEmail(e.target.value)}
                placeholder="user@example.com"
                className="w-full px-4 py-2 bg-[#0A0E14] border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                disabled={loading}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Password
              </label>
              <input
                type="password"
                value={userPassword}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setUserPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-2 bg-[#0A0E14] border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
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
          className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white px-6 py-3 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
        >
          <Play className="w-5 h-5" />
          {loading ? 'Starting Replay...' : 'Execute Replay'}
        </button>
      </form>
    </div>
  )
}
