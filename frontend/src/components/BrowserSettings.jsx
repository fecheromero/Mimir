import { Monitor, MonitorOff } from 'lucide-react'

export default function BrowserSettings({
  headless,
  setHeadless,
  disabled = false
}) {
  return (
    <div className="space-y-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
      <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
        <Monitor className="w-4 h-4" />
        Browser Settings
      </h3>

      {/* Headless Mode */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Display Mode
        </label>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setHeadless(false)}
            disabled={disabled}
            className={`flex items-center justify-center gap-2 px-4 py-2 rounded-lg border-2 transition-colors ${
              !headless
                ? 'border-green-500 bg-green-50 text-green-700'
                : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            <Monitor className="w-4 h-4" />
            <span className="text-sm font-medium">With UI</span>
          </button>

          <button
            type="button"
            onClick={() => setHeadless(true)}
            disabled={disabled}
            className={`flex items-center justify-center gap-2 px-4 py-2 rounded-lg border-2 transition-colors ${
              headless
                ? 'border-green-500 bg-green-50 text-green-700'
                : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            <MonitorOff className="w-4 h-4" />
            <span className="text-sm font-medium">Headless</span>
          </button>
        </div>
        <p className="text-xs text-gray-500 mt-2">
          {headless
            ? 'Browser runs in background (faster, no visual feedback)'
            : 'Browser window visible (slower, can see test execution)'
          }
        </p>
      </div>
    </div>
  )
}
