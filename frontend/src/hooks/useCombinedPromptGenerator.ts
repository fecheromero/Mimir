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
  title: string
  repo: string
  number: number
  author: string
  url: string
  base_branch: string
  head_branch: string
  body?: string
}

interface UseCombinedPromptGeneratorResult {
  prompt: string
  additionalContext: string
  setAdditionalContext: (context: string) => void
  generatePrompt: () => string
  copyToClipboard: () => Promise<void>
  copied: boolean
}

export function useCombinedPromptGenerator(
  improvements: Improvement[],
  pr: PRInfo,
  category: 'medium' | 'experimental'
): UseCombinedPromptGeneratorResult {
  const [additionalContext, setAdditionalContext] = useState('')
  const [copied, setCopied] = useState(false)

  const generatePrompt = useCallback(() => {
    if (improvements.length === 0) return ''

    // Collect all unique files
    const allFiles = new Set<string>()
    improvements.forEach(imp => {
      if (imp.file_path) allFiles.add(imp.file_path)
      if (imp.files) imp.files.forEach(f => allFiles.add(f))
    })

    const categoryLabel = category === 'medium' ? 'Medium Complexity' : 'Experimental'
    const riskLevel = category === 'medium' ? 'Moderate' : 'High'

    let prompt = `# PR Code Improvements - Batch Application

## PR Context

- **Repository**: ${pr.repo}
- **PR #${pr.number}**: "${pr.title}"
- **Author**: ${pr.author}
- **Branch**: ${pr.base_branch} ← ${pr.head_branch}
- **PR URL**: ${pr.url}
${pr.body ? `\n**Description**:\n${pr.body}\n` : ''}

## Batch Details

- **Category**: ${categoryLabel}
- **Risk Level**: ${riskLevel}
- **Improvements to Apply**: ${improvements.length}
- **Files Affected**: ${allFiles.size}

## All Files to Modify

${Array.from(allFiles).map(file => `- \`${file}\``).join('\n')}

## Improvements to Apply

${improvements.map((imp, index) => {
  const files = imp.files || (imp.file_path ? [imp.file_path] : [])
  const locationInfo = imp.line_start
    ? `:${imp.line_start}${imp.line_end ? `-${imp.line_end}` : ''}`
    : ''

  return `### ${index + 1}. ${imp.title}

**Type**: ${imp.type || 'Code improvement'}
${imp.impact ? `**Impact**: ${imp.impact}` : ''}
${imp.risk ? `**Risk**: ${imp.risk}` : ''}
${imp.effort ? `**Effort**: ${imp.effort}` : ''}

**Description**:
${imp.description}

${imp.rationale ? `**Rationale**:\n${imp.rationale}\n` : ''}

**Affected Files**:
${files.map(file => `- \`${file}${file === imp.file_path ? locationInfo : ''}\``).join('\n')}

${imp.current_content ? `**Current Implementation**:
\`\`\`
${imp.current_content}
\`\`\`
` : ''}

${imp.suggested_content ? `**Suggested Implementation**:
\`\`\`
${imp.suggested_content}
\`\`\`
` : ''}

---
`}).join('\n')}

${additionalContext ? `
## Additional Context

${additionalContext}

` : ''}

## Implementation Instructions

Apply all ${improvements.length} improvements following this strategy:

### 1. Preparation
- Read all ${allFiles.size} affected files listed above
- Understand the current implementation and dependencies
- Identify potential conflicts between improvements

### 2. Implementation Order
- Apply improvements in the order listed above (1 → ${improvements.length})
- If conflicts arise, resolve them intelligently
- Ensure each improvement is compatible with previous ones

### 3. Quality Standards
- Follow the project's coding philosophy and patterns
- Maintain backward compatibility where applicable
- Add appropriate error handling and edge case coverage
- Keep existing code style and conventions

### 4. Validation
- After applying all improvements, verify:
  - No syntax errors introduced
  - All improvements are correctly applied
  - No unintended side effects
  - Code remains readable and maintainable

## ⚠️ Important Notes

- This is a **${categoryLabel.toLowerCase()}** batch with **${riskLevel.toLowerCase()} risk**
- Review each change carefully before committing
- Test thoroughly after applying all improvements
- Be prepared to roll back if issues arise
- Consider creating a backup branch before applying

## Suggested Commit Message

\`\`\`
Apply ${improvements.length} ${category} improvements to ${pr.title}

${improvements.map((imp, i) => `${i + 1}. ${imp.title}`).join('\n')}

PR: ${pr.url}
\`\`\`
`

    return prompt
  }, [improvements, pr, category, additionalContext])

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
