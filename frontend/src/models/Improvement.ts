export type ImprovementCategory = 'dummy' | 'medium' | 'experimental'
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
    public readonly rationale: string | null
  ) {}

  static fromJson(data: any, category: ImprovementCategory): Improvement {
    return new Improvement(
      data.id,
      category,
      data.title,
      data.description,
      data.confidence || 0,
      data.type || null,
      data.file_path || null,
      data.files || [],
      data.line_start || null,
      data.line_end || null,
      data.current_content || null,
      data.replacement || null,
      data.diff || null,
      data.impact || null,
      data.risk || null,
      data.effort || null,
      data.files_affected_count || null,
      data.rationale || null
    )
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
      rationale: this.rationale
    }
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
    return this.isDummy && this.confidence >= 0.85 && this.diff !== null
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
