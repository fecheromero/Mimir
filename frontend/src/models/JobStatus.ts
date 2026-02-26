export enum JobStatus {
  GENERATING = 'generating',
  GENERATED = 'generated',
  EXECUTING = 'executing',
  PROCESSING = 'processing',
  PASSED = 'passed',
  UNSUCCESSFUL = 'unsuccessful',
  FAILED = 'failed',
  COMPLETED = 'completed'
}

export class JobStatusHelper {
  static isTerminal(status: string): boolean {
    return [
      JobStatus.COMPLETED,
      JobStatus.GENERATED,
      JobStatus.PASSED,
      JobStatus.UNSUCCESSFUL,
      JobStatus.FAILED
    ].includes(status as JobStatus)
  }

  static isSuccess(status: string): boolean {
    return [
      JobStatus.GENERATED,
      JobStatus.PASSED,
      JobStatus.COMPLETED
    ].includes(status as JobStatus)
  }

  static isFailure(status: string): boolean {
    return [
      JobStatus.UNSUCCESSFUL,
      JobStatus.FAILED
    ].includes(status as JobStatus)
  }

  static isProcessing(status: string): boolean {
    return [
      JobStatus.GENERATING,
      JobStatus.EXECUTING,
      JobStatus.PROCESSING
    ].includes(status as JobStatus)
  }
}
