import { Copy, Check } from 'lucide-react'

interface PromptPreviewProps {
  prompt: string
  onCopy: () => void
  copied: boolean
}

export default function PromptPreview({ prompt, onCopy, copied }: PromptPreviewProps): JSX.Element {
  return (
    <div className="mt-4 bg-gray-900 border border-gray-700 rounded-lg overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2 bg-gray-800 border-b border-gray-700">
        <span className="text-sm font-medium text-gray-300">Generated Prompt</span>
        <button
          onClick={onCopy}
          className={`flex items-center gap-2 px-3 py-1 rounded text-sm font-medium transition-colors ${
            copied
              ? 'bg-green-600 text-white'
              : 'bg-blue-600 hover:bg-blue-700 text-white'
          }`}
        >
          {copied ? (
            <>
              <Check className="w-4 h-4" />
              Copied!
            </>
          ) : (
            <>
              <Copy className="w-4 h-4" />
              Copy to Clipboard
            </>
          )}
        </button>
      </div>

      <div className="p-4 max-h-96 overflow-y-auto">
        <pre className="text-xs text-gray-300 whitespace-pre-wrap font-mono leading-relaxed">
          {prompt}
        </pre>
      </div>

      <div className="px-4 py-3 bg-gray-800 border-t border-gray-700">
        <p className="text-xs text-gray-400">
          💡 Tip: Copy this prompt and paste it into Claude Code to implement the improvement with AI assistance
        </p>
      </div>
    </div>
  )
}
