import { useState } from 'react'
import { ChevronDown, ChevronRight, Zap, Wrench, Beaker, CheckSquare } from 'lucide-react'
import ImprovementCard from './ImprovementCard'

export default function StructuredReview({ reviewData }) {
  const [expandedSections, setExpandedSections] = useState({
    dummy: true,
    medium: false,
    experimental: false
  })

  const [selectedImprovements, setSelectedImprovements] = useState([])

  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }))
  }

  const handleToggleImprovement = (improvementId, checked) => {
    setSelectedImprovements(prev => {
      if (checked) {
        return [...prev, improvementId]
      } else {
        return prev.filter(id => id !== improvementId)
      }
    })
  }

  const dummyCount = reviewData.dummy_improvements?.length || 0
  const mediumCount = reviewData.medium_improvements?.length || 0
  const experimentalCount = reviewData.experimental_improvements?.length || 0

  return (
    <div className="space-y-6">
      {/* Summary */}
      {reviewData.summary && (
        <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
          <h3 className="text-blue-400 font-semibold mb-2">Review Summary</h3>
          <p className="text-gray-300 text-sm">{reviewData.summary}</p>
        </div>
      )}

      {/* Dummy Improvements */}
      <div className="bg-[#0F1419] border border-gray-800 rounded-lg">
        <button
          onClick={() => toggleSection('dummy')}
          className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-800/50 transition-colors"
        >
          <div className="flex items-center gap-3">
            {expandedSections.dummy ? (
              <ChevronDown className="w-5 h-5 text-gray-400" />
            ) : (
              <ChevronRight className="w-5 h-5 text-gray-400" />
            )}
            <Zap className="w-5 h-5 text-green-400" />
            <div>
              <h3 className="text-white font-semibold">Dummy Improvements</h3>
              <p className="text-gray-400 text-xs">Safe, trivial changes - Auto-applicable</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {dummyCount > 0 && selectedImprovements.length > 0 && (
              <span className="text-xs text-blue-400">
                {selectedImprovements.length} selected
              </span>
            )}
            <span className="bg-green-500/20 text-green-400 px-2 py-1 rounded text-sm">
              {dummyCount}
            </span>
          </div>
        </button>

        {expandedSections.dummy && (
          <div className="p-4 pt-0 border-t border-gray-800">
            {dummyCount === 0 ? (
              <p className="text-gray-500 text-sm italic text-center py-4">
                No dummy improvements found
              </p>
            ) : (
              <>
                {reviewData.dummy_improvements.map((improvement) => (
                  <ImprovementCard
                    key={improvement.id}
                    improvement={improvement}
                    category="dummy"
                    selected={selectedImprovements.includes(improvement.id)}
                    onToggle={handleToggleImprovement}
                    showCheckbox={true}
                  />
                ))}

                {selectedImprovements.length > 0 && (
                  <div className="mt-4 flex items-center justify-between p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                    <span className="text-blue-400 text-sm">
                      {selectedImprovements.length} improvement(s) selected
                    </span>
                    <button
                      disabled
                      className="px-4 py-2 bg-green-600 text-white rounded-lg font-medium opacity-50 cursor-not-allowed flex items-center gap-2"
                      title="Coming in Phase 3"
                    >
                      <CheckSquare className="w-4 h-4" />
                      Apply Selected (Coming Soon)
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {/* Medium Improvements */}
      <div className="bg-[#0F1419] border border-gray-800 rounded-lg">
        <button
          onClick={() => toggleSection('medium')}
          className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-800/50 transition-colors"
        >
          <div className="flex items-center gap-3">
            {expandedSections.medium ? (
              <ChevronDown className="w-5 h-5 text-gray-400" />
            ) : (
              <ChevronRight className="w-5 h-5 text-gray-400" />
            )}
            <Wrench className="w-5 h-5 text-yellow-400" />
            <div>
              <h3 className="text-white font-semibold">Medium Improvements</h3>
              <p className="text-gray-400 text-xs">Moderate complexity - Requires review</p>
            </div>
          </div>
          <span className="bg-yellow-500/20 text-yellow-400 px-2 py-1 rounded text-sm">
            {mediumCount}
          </span>
        </button>

        {expandedSections.medium && (
          <div className="p-4 pt-0 border-t border-gray-800">
            {mediumCount === 0 ? (
              <p className="text-gray-500 text-sm italic text-center py-4">
                No medium improvements found
              </p>
            ) : (
              reviewData.medium_improvements.map((improvement) => (
                <ImprovementCard
                  key={improvement.id}
                  improvement={improvement}
                  category="medium"
                />
              ))
            )}
          </div>
        )}
      </div>

      {/* Experimental Improvements */}
      <div className="bg-[#0F1419] border border-gray-800 rounded-lg">
        <button
          onClick={() => toggleSection('experimental')}
          className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-800/50 transition-colors"
        >
          <div className="flex items-center gap-3">
            {expandedSections.experimental ? (
              <ChevronDown className="w-5 h-5 text-gray-400" />
            ) : (
              <ChevronRight className="w-5 h-5 text-gray-400" />
            )}
            <Beaker className="w-5 h-5 text-purple-400" />
            <div>
              <h3 className="text-white font-semibold">Experimental Zone</h3>
              <p className="text-gray-400 text-xs">High risk/effort - Consider carefully</p>
            </div>
          </div>
          <span className="bg-purple-500/20 text-purple-400 px-2 py-1 rounded text-sm">
            {experimentalCount}
          </span>
        </button>

        {expandedSections.experimental && (
          <div className="p-4 pt-0 border-t border-gray-800">
            {experimentalCount === 0 ? (
              <p className="text-gray-500 text-sm italic text-center py-4">
                No experimental improvements found
              </p>
            ) : (
              reviewData.experimental_improvements.map((improvement) => (
                <ImprovementCard
                  key={improvement.id}
                  improvement={improvement}
                  category="experimental"
                />
              ))
            )}
          </div>
        )}
      </div>
    </div>
  )
}
