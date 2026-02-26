import {useState} from 'react'
import {useNavigate} from 'react-router-dom'
import ReactMarkdown from 'react-markdown'
import {FileText, FileJson, Play} from 'lucide-react'
import {testCasesApi} from '../services/api'

interface Action {
    [key: string]: unknown
}

interface TestResults {
    replay_actions?: Action[]
    url: string
    test_case_text?: string
    test_expectations?: string
    expected_outcome?: string
    final_result: string
    actions?: Action[]
    executed_at: string
}

interface ResultsViewerProps {
    results: TestResults | null
    jobId: string
}

export default function ResultsViewer({results, jobId}: ResultsViewerProps): JSX.Element | null {
    const [executing, setExecuting] = useState<boolean>(false)
    const navigate = useNavigate()

    if (!results) return null


    const downloadReplayActions = (): void => {
        try {
            const replayData = {
                version: "1.0",
                actions: results.replay_actions,
                url: results.url,
                test_case_text: results.test_case_text,
                test_expectations: results.test_expectations,
                expected_outcome: results.expected_outcome,
                created_at: results.executed_at
            }
            const blob = new Blob([JSON.stringify(replayData, null, 2)], {
                type: 'application/json'
            })
            const url = URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            a.download = `replay_actions_${jobId}.json`
            document.body.appendChild(a)
            a.click()
            document.body.removeChild(a)
            URL.revokeObjectURL(url)
        } catch (error) {
            console.error('Error generating replay actions file:', error)
            alert('Failed to download replay actions. Please try again.')
        }
    }

    const downloadReportFile = (): void => {
        try {
            const reportContent = results.final_result || 'No report available'
            const blob = new Blob([reportContent], {
                type: 'text/markdown'
            })
            const url = URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            a.download = `report_${jobId}.md`
            document.body.appendChild(a)
            a.click()
            document.body.removeChild(a)
            URL.revokeObjectURL(url)
        } catch (error) {
            console.error('Error generating report file:', error)
            alert('Failed to download report. Please try again.')
        }
    }

    const executeReplay = async (): Promise<void> => {
        // Fallback to results.actions if replay_actions not available
        // replay_actions: filtered version (excludes "done" action, only reproducible interactions)
        // actions: complete history (includes "done" with final report)
        // See CLAUDE.md for details on dual-action structure
        const actionsToReplay = results.replay_actions || results.actions
        if (!actionsToReplay || actionsToReplay.length === 0) {
            alert('No replay actions available')
            return
        }

        try {
            setExecuting(true)
            const response = await testCasesApi.replayActions(
                actionsToReplay,
                results.url,
                null, // user_email
                null, // user_password
                results.test_case_text || null, // test instructions
                results.test_expectations || null, // success criteria
                results.expected_outcome || null, // expected outcome
                false, // headless
                jobId // parent_job_id for tracking replays
            )

            // Navigate to replay job
            navigate(`/jobs/${response.job_id}`, {
                state: {mode: 'replay'}
            })
        } catch (error) {
            console.error('Error executing replay:', error)
            alert('Failed to execute replay. Please try again.')
        } finally {
            setExecuting(false)
        }
    }

    return (
        <div className="bg-[#0F1419] border border-gray-800 rounded-lg p-6">
            <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-semibold text-white">Test Results</h2>
                <div className="flex gap-2 flex-wrap justify-end">
                    {(results.replay_actions && results.replay_actions?.length > 0) || (results.actions && results.actions?.length > 0) && (
                        <>
                            <button
                                onClick={executeReplay}
                                disabled={executing}
                                className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 transition-colors"
                            >
                                <Play className="w-4 h-4"/>
                                <span className="font-medium">{executing ? 'Replaying...' : 'Execute Replay'}</span>
                            </button>
                            <button
                                onClick={downloadReplayActions}
                                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                            >
                                <FileJson className="w-4 h-4"/>
                                <span className="font-medium">Replay Actions</span>
                            </button>
                        </>
                    )}
                    <button
                        onClick={downloadReportFile}
                        className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                    >
                        <FileText className="w-4 h-4"/>
                        <span className="font-medium">Report MD</span>
                    </button>
                </div>
            </div>

            {/* Test Report */}
            <div className="border border-gray-700 rounded-lg p-6 bg-[#0A0E14] mb-6">
                <h3 className="text-lg font-semibold text-white mb-4">Test Report</h3>
                <div className="markdown-content text-gray-300 leading-relaxed">
                    <ReactMarkdown
                        components={{
                            h1: ({node, ...props}) => <h1
                                className="text-2xl font-bold text-white mb-4 mt-6 first:mt-0" {...props} />,
                            h2: ({node, ...props}) => <h2
                                className="text-xl font-bold text-white mb-3 mt-5 first:mt-0" {...props} />,
                            h3: ({node, ...props}) => <h3
                                className="text-lg font-semibold text-white mb-2 mt-4 first:mt-0" {...props} />,
                            p: ({node, ...props}) => <p className="mb-4 text-gray-300" {...props} />,
                            ul: ({node, ...props}) => <ul
                                className="list-disc list-inside mb-4 space-y-2 text-gray-300" {...props} />,
                            ol: ({node, ...props}) => <ol
                                className="list-decimal list-inside mb-4 space-y-2 text-gray-300" {...props} />,
                            li: ({node, ...props}) => <li className="text-gray-300" {...props} />,
                            code: ({node, inline, ...props}: any) =>
                                inline
                                    ? <code
                                        className="bg-gray-800 text-blue-400 px-1.5 py-0.5 rounded text-sm" {...props} />
                                    : <code
                                        className="block bg-gray-800 text-gray-300 p-4 rounded-lg overflow-x-auto text-sm" {...props} />,
                            pre: ({node, ...props}) => <pre className="mb-4" {...props} />,
                            strong: ({node, ...props}) => <strong className="font-semibold text-white" {...props} />,
                            em: ({node, ...props}) => <em className="italic text-gray-300" {...props} />,
                            a: ({node, ...props}) => <a
                                className="text-blue-400 hover:text-blue-300 underline" {...props} />,
                        }}
                    >
                        {results.final_result}
                    </ReactMarkdown>
                </div>
            </div>

            {/* Actions Summary */}
            <div className="border border-gray-700 rounded-lg p-6 bg-[#0A0E14]">
                <h3 className="text-lg font-semibold text-white mb-4">Actions Performed</h3>
                <div className="text-sm text-gray-300">
                    <p className="mb-3 font-medium">Total actions: {results.actions?.length || 0}</p>
                    <details className="cursor-pointer group">
                        <summary className="font-medium text-blue-400 hover:text-blue-300 transition-colors">
                            View detailed actions
                        </summary>
                        <pre
                            className="mt-3 p-4 bg-[#0F1419] rounded-lg border border-gray-700 overflow-x-auto text-xs">
              {JSON.stringify(results.actions, null, 2)}
            </pre>
                    </details>
                </div>
            </div>

            <div className="mt-6 pt-6 border-t border-gray-800 text-sm text-gray-400 space-y-1">
                <p>Executed: {new Date(results.executed_at).toLocaleString()}</p>
                <p>URL: {results.url}</p>
            </div>
        </div>
    )
}
