import { useState, useCallback } from 'react'

interface Improvement {
  id: string
  title: string
  description: string
  file_path?: string
  files?: string[]
  line_start?: number
  line_end?: number
  current_content?: string
  suggested_content?: string
  rationale?: string
  type?: string
  impact?: string
  risk?: string
  effort?: string
}

interface PRInfo {
  title?: string
  repo?: string
  number?: number
  author?: string
  url: string
  base_branch?: string
  head_branch: string
  body?: string
}

interface UsePromptGeneratorResult {
  prompt: string
  additionalContext: string
  setAdditionalContext: (context: string) => void
  generatePrompt: () => string
  copyToClipboard: () => Promise<void>
  copied: boolean
}

export function usePromptGenerator(
  improvement: Improvement,
  pr: PRInfo,
  category: string
): UsePromptGeneratorResult {
  const [additionalContext, setAdditionalContext] = useState('')
  const [copied, setCopied] = useState(false)

  const generatePrompt = useCallback(() => {
    const files = improvement.files || (improvement.file_path ? [improvement.file_path] : [])
    const locationInfo = improvement.line_start
      ? `:${improvement.line_start}${improvement.line_end ? `-${improvement.line_end}` : ''}`
      : ''

    const categoryLabel = category === 'medium' ? 'Medium Complexity' : 'Experimental'
    const riskLevel = category === 'medium' ? 'Moderate' : 'High'

    let prompt = `# PR Code Improvement Task

## PR Context
- **Repository**: ${pr.repo}
- **PR #${pr.number}**: "${pr.title}"
- **Author**: ${pr.author}
- **Branch**: ${pr.base_branch} ← ${pr.head_branch}
- **PR URL**: ${pr.url}
${pr.body ? `\n**Description**:\n${pr.body}\n` : ''}

## Improvement Request

**Category**: ${categoryLabel}
**Type**: ${improvement.type || 'Code improvement'}
${improvement.impact ? `**Impact**: ${improvement.impact}` : ''}
${improvement.risk ? `**Risk**: ${improvement.risk || riskLevel}` : ''}
${improvement.effort ? `**Effort**: ${improvement.effort}` : ''}

### ${improvement.title}

${improvement.description}

${improvement.rationale ? `\n**Rationale**:\n${improvement.rationale}\n` : ''}

## Files to Modify

${files.map(file => `- \`${file}${file === improvement.file_path ? locationInfo : ''}\``).join('\n')}

${improvement.current_content ? `
## Current Implementation

\`\`\`
${improvement.current_content}
\`\`\`
` : ''}

${improvement.suggested_content ? `
## Suggested Implementation

\`\`\`
${improvement.suggested_content}
\`\`\`
` : ''}

${additionalContext ? `
## Additional Context

${additionalContext}
` : ''}

## Instructions

1. Read the affected files listed above
2. Understand the current implementation and context
3. Implement the suggested improvement following the project's coding philosophy
4. Ensure backward compatibility where applicable
5. Add appropriate error handling and edge case coverage
6. Follow the existing code style and patterns in the project

**Important**: This is a ${categoryLabel.toLowerCase()} improvement with ${riskLevel.toLowerCase()} risk. Please review carefully before applying changes.
`

    return prompt
  }, [improvement, pr, category, additionalContext])

  const copyToClipboard = useCallback(async () => {
    const prompt = generatePrompt()

    try {
      await navigator.clipboard.writeText(prompt)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy to clipboard:', err)
      // Fallback: create temporary textarea
      const textarea = document.createElement('textarea')
      textarea.value = prompt
      textarea.style.position = 'fixed'
      textarea.style.opacity = '0'
      document.body.appendChild(textarea)
      textarea.select()
      document.execCommand('copy')
      document.body.removeChild(textarea)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }, [generatePrompt])

  return {
    prompt: generatePrompt(),
    additionalContext,
    setAdditionalContext,
    generatePrompt,
    copyToClipboard,
    copied
  }
}
