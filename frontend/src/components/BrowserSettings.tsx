import { Monitor, MonitorOff } from 'lucide-react'

interface BrowserSettingsProps {
  headless: boolean
  setHeadless: (headless: boolean) => void
  disabled?: boolean
}

export default function BrowserSettings({
  headless,
  setHeadless,
  disabled = false
}: BrowserSettingsProps): JSX.Element {
  return (
    <div className="space-y-4 p-5 bg-gradient-to-br from-gray-50 to-gray-100/50 rounded-lg border border-gray-200">
      <h3 className="text-sm font-semibold text-[#111827] flex items-center gap-2">
        <Monitor className="w-4 h-4" />
        Browser Settings
      </h3>

      {/* Headless Mode */}
      <div>
        <label className="block text-sm font-medium text-[#6B7280] mb-3">
          Display Mode
        </label>
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => setHeadless(false)}
            disabled={disabled}
            className={`flex items-center justify-center gap-2 px-4 py-3 rounded-lg border-2 transition-all ${
              !headless
                ? 'border-[#10B981] bg-green-50 text-[#10B981] shadow-sm'
                : 'border-gray-300 bg-white text-[#6B7280] hover:border-gray-400 hover:shadow-sm'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            <Monitor className="w-4 h-4" />
            <span className="text-sm font-medium">With UI</span>
          </button>

          <button
            type="button"
            onClick={() => setHeadless(true)}
            disabled={disabled}
            className={`flex items-center justify-center gap-2 px-4 py-3 rounded-lg border-2 transition-all ${
              headless
                ? 'border-[#10B981] bg-green-50 text-[#10B981] shadow-sm'
                : 'border-gray-300 bg-white text-[#6B7280] hover:border-gray-400 hover:shadow-sm'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            <MonitorOff className="w-4 h-4" />
            <span className="text-sm font-medium">Headless</span>
          </button>
        </div>
        <p className="text-xs text-[#6B7280] mt-3 leading-relaxed">
          {headless
            ? 'Browser runs in background (faster, no visual feedback)'
            : 'Browser window visible (slower, can see test execution)'
          }
        </p>
      </div>
    </div>
  )
}
