import { useState, FormEvent, ChangeEvent } from 'react'
import { Upload, Loader2 } from 'lucide-react'
import BrowserSettings from './BrowserSettings'

interface TestCaseUploaderProps {
  onUpload: (data: {
    file: File
    url: string
    userEmail: string | null
    userPassword: string | null
    headless: boolean
  }) => void
  loading: boolean
}

export default function TestCaseUploader({ onUpload, loading }: TestCaseUploaderProps): JSX.Element {
  const [file, setFile] = useState<File | null>(null)
  const [url, setUrl] = useState<string>('')
  const [userEmail, setUserEmail] = useState<string>('')
  const [userPassword, setUserPassword] = useState<string>('')
  const [showCredentials, setShowCredentials] = useState<boolean>(false)
  const [headless, setHeadless] = useState<boolean>(false)

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>): void => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile && selectedFile.type === 'application/json') {
      setFile(selectedFile)
    } else {
      alert('Please select a JSON file')
    }
  }

  const handleSubmit = (e: FormEvent<HTMLFormElement>): void => {
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
    <div className="bg-[#0F1419] border border-gray-800 rounded-lg p-6 hover:border-gray-700 transition-colors">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-green-500/20 rounded-lg">
          <Upload className="w-6 h-6 text-green-400" />
        </div>
        <div>
          <h2 className="text-xl font-semibold text-white">Re-run Existing Test Cases</h2>
          <p className="text-sm text-gray-400">Upload and execute saved test cases</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Upload Test Case File (.json)
          </label>
          <input
            type="file"
            accept=".json"
            onChange={handleFileChange}
            className="w-full px-4 py-2 bg-[#0A0E14] border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-green-500 transition-all file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-green-500/20 file:text-green-400 hover:file:bg-green-500/30"
            required
          />
          {file && (
            <p className="mt-2 text-sm text-green-400 flex items-center gap-1">
              <span className="w-1 h-1 bg-green-400 rounded-full"></span>
              Selected: {file.name}
            </p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Test URL (optional - uses URL from file if not provided)
          </label>
          <input
            type="url"
            value={url}
            onChange={(e: ChangeEvent<HTMLInputElement>) => setUrl(e.target.value)}
            className="w-full px-4 py-2 bg-[#0A0E14] border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500"
            placeholder="https://example.com"
          />
        </div>

        {/* Optional Credentials Toggle */}
        <div className="pt-2">
          <label className="flex items-center gap-2 cursor-pointer group">
            <input
              type="checkbox"
              checked={showCredentials}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setShowCredentials(e.target.checked)}
              className="rounded border-gray-700 text-green-500 focus:ring-green-500 w-4 h-4 bg-[#0A0E14]"
              disabled={loading}
            />
            <span className="text-sm font-medium text-gray-300 group-hover:text-green-400 transition-colors">
              Include login credentials (optional)
            </span>
          </label>
        </div>

        {/* Credentials Fields */}
        {showCredentials && (
          <div className="space-y-4 pl-6 border-l-2 border-green-500 bg-green-500/10 py-4 pr-4 rounded-r-lg">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Email
              </label>
              <input
                type="email"
                value={userEmail}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setUserEmail(e.target.value)}
                placeholder="user@example.com"
                className="w-full px-4 py-2 bg-[#0A0E14] border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
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
                className="w-full px-4 py-2 bg-[#0A0E14] border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
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
          className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white px-6 py-3 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
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
