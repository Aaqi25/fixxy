import { AppError } from '../auth/auth.service';
import { AttemptRepository, attemptRepository } from './attempt.repository';
import { SubmitAttemptRequest, SubmitAttemptResponse, AttemptRecord } from './attempt.types';
import { sessionService } from '../sessions/session.service';
import { masteryService } from '../mastery/mastery.service';

export class ValidationError extends AppError {
  constructor(message: string, errors?: Record<string, string>) {
    super(400, message, errors);
    this.name = 'ValidationError';
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string = 'Authentication required') {
    super(401, message);
    this.name = 'UnauthorizedError';
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string = 'Forbidden') {
    super(403, message);
    this.name = 'ForbiddenError';
  }
}

export class NotFoundError extends AppError {
  constructor(message: string = 'Resource not found') {
    super(404, message);
    this.name = 'NotFoundError';
  }
}

export class ConflictError extends AppError {
  constructor(message: string = 'Conflict') {
    super(409, message);
    this.name = 'ConflictError';
  }
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export class AttemptService {
  constructor(private readonly repo: AttemptRepository = attemptRepository) {}

  /**
   * Validate UUID string format.
   */
  isValidUuid(id: unknown): id is string {
    return typeof id === 'string' && UUID_REGEX.test(id.trim());
  }

  /**
   * Submit an answer to be validated and recorded on the server.
   * Server determines correctness; client-supplied correctness flags are strictly ignored.
   */
  async submitAnswer(
    authenticatedStudentId: string | undefined,
    body: SubmitAttemptRequest
  ): Promise<SubmitAttemptResponse> {
    // 1. Verify authentication
    if (!authenticatedStudentId || !this.isValidUuid(authenticatedStudentId)) {
      throw new UnauthorizedError('Authentication required');
    }

    // 2. Validate input parameters presence
    if (!body || typeof body !== 'object') {
      throw new ValidationError('Request body must be a valid JSON object');
    }

    const { questionId, selectedOptionId, sessionId } = body;

    const errors: Record<string, string> = {};

    if (!questionId || typeof questionId !== 'string' || !questionId.trim()) {
      errors.questionId = 'questionId is required';
    } else if (!this.isValidUuid(questionId)) {
      errors.questionId = 'questionId must be a valid UUID';
    }

    if (!selectedOptionId || typeof selectedOptionId !== 'string' || !selectedOptionId.trim()) {
      errors.selectedOptionId = 'selectedOptionId is required';
    } else if (!this.isValidUuid(selectedOptionId)) {
      errors.selectedOptionId = 'selectedOptionId must be a valid UUID';
    }

    if (sessionId !== undefined && sessionId !== null && sessionId !== '') {
      if (!this.isValidUuid(sessionId)) {
        errors.sessionId = 'sessionId must be a valid UUID';
      }
    }

    if (Object.keys(errors).length > 0) {
      throw new ValidationError('Invalid submission payload', errors);
    }

    const cleanQuestionId = questionId.trim();
    const cleanOptionId = selectedOptionId.trim();
    const cleanSessionId = sessionId && typeof sessionId === 'string' && sessionId.trim() ? sessionId.trim() : null;

    // 3. Question existence lookup
    const question = await this.repo.findQuestionById(cleanQuestionId);
    if (!question) {
      throw new NotFoundError(`Question with ID ${cleanQuestionId} not found`);
    }

    // 4. Option existence lookup
    const option = await this.repo.findOptionById(cleanOptionId);
    if (!option) {
      throw new NotFoundError(`Option with ID ${cleanOptionId} not found`);
    }

    // 5. Verify option-question relationship
    if (option.questionId !== question.id) {
      throw new ValidationError('Selected option does not belong to the specified question');
    }

    // 6. Verify session ownership and context if sessionId provided
    if (cleanSessionId) {
      const session = await this.repo.findSessionById(cleanSessionId);
      if (!session) {
        throw new NotFoundError(`Learning session with ID ${cleanSessionId} not found`);
      }

      if (session.studentId !== authenticatedStudentId) {
        throw new ForbiddenError('Unauthorized: session does not belong to the authenticated student');
      }

      if (session.conceptId !== question.conceptId) {
        throw new ValidationError('Question does not belong to the active session concept');
      }

      if (session.status === 'complete') {
        throw new ConflictError('Learning session is already completed');
      }
    }

    // 7. Check for accidental rapid duplicate submissions (debounce window: 2s)
    const duplicate = await this.repo.findRecentDuplicateAttempt(
      authenticatedStudentId,
      question.id,
      option.id,
      2
    );
    if (duplicate) {
      throw new ConflictError('Duplicate submission detected. Please wait before submitting again.');
    }

    // 8. Server-side correctness calculation: database is authoritative
    const isCorrect = Boolean(option.isCorrect);

    // 9. Determine attempt number for this student on this question
    const previousAttemptsCount = await this.repo.countPreviousAttempts(
      authenticatedStudentId,
      question.id,
      cleanSessionId
    );
    const attemptNumber = previousAttemptsCount + 1;

    // 10. Persist attempt record to PostgreSQL
    const createdAttempt = await this.repo.createAttempt({
      studentId: authenticatedStudentId,
      questionId: question.id,
      selectedOptionId: option.id,
      sessionId: cleanSessionId,
      isCorrect,
      attemptNumber,
      phase: question.phase,
    });

    // 11. Update session stage and learning outcome if session context provided
    let sessionInfo: { id: string; stage: string; status: string } | undefined = undefined;
    if (cleanSessionId) {
      try {
        const outcome = await sessionService.handleAttemptOutcome(
          authenticatedStudentId,
          cleanSessionId,
          question.id,
          isCorrect,
          question.phase,
          option.id
        );
        sessionInfo = {
          id: cleanSessionId,
          stage: outcome.stage,
          status: outcome.status,
        };
      } catch {
        // Keep attempt recorded even if session progression encounters an issue
      }
    }

    // 12. Automatically recalculate and persist student mastery for this concept
    try {
      await masteryService.refreshConceptMastery(authenticatedStudentId, question.conceptId);
    } catch {
      // Don't fail the attempt response if mastery cache refresh encounters an issue
    }

    // 13. Return response shaped according to FIXXY contract
    return {
      attempt: {
        id: createdAttempt.id,
        questionId: createdAttempt.questionId,
        selectedOptionId: createdAttempt.selectedOptionId,
        sessionId: createdAttempt.sessionId,
        isCorrect: createdAttempt.isCorrect,
        attemptNumber: createdAttempt.attemptNumber,
        submittedAt: createdAttempt.submittedAt,
      },
      result: {
        correct: isCorrect,
      },
      session: sessionInfo,
    };
  }

  /**
   * Get student's attempt history.
   */
  async getStudentAttempts(studentId: string | undefined): Promise<AttemptRecord[]> {
    if (!studentId || !this.isValidUuid(studentId)) {
      throw new UnauthorizedError('Authentication required');
    }
    return this.repo.findAttemptsByStudent(studentId);
  }
}

export const attemptService = new AttemptService();
