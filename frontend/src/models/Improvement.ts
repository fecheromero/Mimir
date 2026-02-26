import { MODEL_PARSE_ERRORS, CONFIDENCE_THRESHOLDS } from '../utils/constants'

export type ImprovementCategory = 'danger' | 'dummy' | 'medium' | 'experimental'
export type ImprovementType =
  | 'remove_unused_import'
  | 'fix_typo'
  | 'remove_debug'
  | 'refactor'
  | 'architecture'
  | 'other'

export class Improvement {
  constructor(
    public readonly id: string,
    public readonly category: ImprovementCategory,
    public readonly title: string,
    public readonly description: string,
    public readonly confidence: number,
    public readonly type: ImprovementType | null,
    public readonly filePath: string | null,
    public readonly files: string[],
    public readonly lineStart: number | null,
    public readonly lineEnd: number | null,
    public readonly currentContent: string | null,
    public readonly replacement: string | null,
    public readonly diff: string | null,
    public readonly impact: string | null,
    public readonly risk: string | null,
    public readonly effort: string | null,
    public readonly filesAffectedCount: number | null,
    public readonly rationale: string | null,
    public readonly severity: string | null,
    public readonly whatBreaks: string | null,
    public readonly reproductionSteps: string | null,
    public readonly suggestedFix: string | null
  ) {}

  static fromJson(data: any, category: ImprovementCategory): Improvement {
    try {
      // Validate required fields
      if (!data.id || !data.title || !data.description) {
        throw new Error('Missing required fields: id, title, or description')
      }

      // Type guard: validate category-specific fields
      if (category === 'danger') {
        if (!data.severity) {
          console.warn(`Danger zone improvement ${data.id} missing severity field`)
        }
        if (!data.what_breaks && !data.reproduction_steps) {
          console.warn(`Danger zone improvement ${data.id} missing critical diagnostic fields`)
        }
      } else if (category === 'dummy') {
        if (!data.diff && !data.file_path) {
          console.warn(`Dummy improvement ${data.id} missing diff or file_path for auto-application`)
        }
      }

      return new Improvement(
        String(data.id),
        category,
        String(data.title),
        String(data.description),
        Number(data.confidence || 0),
        data.type || null,
        data.file_path || null,
        Array.isArray(data.files) ? data.files : [],
        data.line_start ? Number(data.line_start) : null,
        data.line_end ? Number(data.line_end) : null,
        data.current_content || null,
        data.replacement || null,
        data.diff || null,
        data.impact || null,
        data.risk || null,
        data.effort || null,
        data.files_affected_count ? Number(data.files_affected_count) : null,
        data.rationale || null,
        data.severity || null,
        data.what_breaks || null,
        data.reproduction_steps || null,
        data.suggested_fix || null
      )
    } catch (error) {
      console.error(MODEL_PARSE_ERRORS.IMPROVEMENT, error)
      throw new Error(`${MODEL_PARSE_ERRORS.IMPROVEMENT}: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  toJson(): Record<string, any> {
    return {
      id: this.id,
      title: this.title,
      description: this.description,
      confidence: this.confidence,
      type: this.type,
      file_path: this.filePath,
      files: this.files,
      line_start: this.lineStart,
      line_end: this.lineEnd,
      current_content: this.currentContent,
      replacement: this.replacement,
      diff: this.diff,
      impact: this.impact,
      risk: this.risk,
      effort: this.effort,
      files_affected_count: this.filesAffectedCount,
      rationale: this.rationale,
      severity: this.severity,
      what_breaks: this.whatBreaks,
      reproduction_steps: this.reproductionSteps,
      suggested_fix: this.suggestedFix
    }
  }

  get isDanger(): boolean {
    return this.category === 'danger'
  }

  get isDummy(): boolean {
    return this.category === 'dummy'
  }

  get isMedium(): boolean {
    return this.category === 'medium'
  }

  get isExperimental(): boolean {
    return this.category === 'experimental'
  }

  get isAutoApplicable(): boolean {
    return this.isDummy && this.confidence >= CONFIDENCE_THRESHOLDS.AUTO_APPLY && this.diff !== null
  }

  get confidencePercentage(): number {
    return Math.round(this.confidence * 100)
  }

  get hasLocation(): boolean {
    return this.filePath !== null && this.lineStart !== null
  }

  get locationDisplay(): string | null {
    if (!this.filePath) return null
    if (!this.lineStart) return this.filePath
    return `${this.filePath}:${this.lineStart}`
  }

  affectsFile(filePath: string): boolean {
    if (this.filePath === filePath) return true
    return this.files.includes(filePath)
  }
}
