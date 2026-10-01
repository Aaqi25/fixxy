import { AppError } from '../auth/auth.service';
import { ValidationError, UnauthorizedError, ForbiddenError, NotFoundError, ConflictError } from '../attempts/attempt.service';
import { SessionRepository, sessionRepository, DbSessionRow } from './session.repository';
import {
  LearningSessionDto,
  SessionStage,
  TeachingContent,
  SessionAttemptSummary,
} from './session.types';
import { getTeachingContent } from './teaching.provider';
import { pool } from '../../config/db';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export class SessionService {
  constructor(private readonly repo: SessionRepository = sessionRepository) {}

  isValidUuid(id: unknown): id is string {
    return typeof id === 'string' && UUID_REGEX.test(id.trim());
  }

  /**
   * Get complete current learning session state for an authenticated student.
   * Restores exact stage on refresh without exposing correct answers.
   */
  async getSessionState(studentId: string | undefined, sessionId: string): Promise<LearningSessionDto> {
    if (!studentId || !this.isValidUuid(studentId)) {
      throw new UnauthorizedError('Authentication required');
    }
    if (!sessionId || !this.isValidUuid(sessionId)) {
      throw new ValidationError('Valid session ID is required');
    }

    const session = await this.repo.findSessionById(sessionId.trim());
    if (!session) {
      throw new NotFoundError(`Learning session with ID ${sessionId} not found`);
    }

    if (session.student_id !== studentId) {
      throw new ForbiddenError('Unauthorized: session does not belong to the authenticated student');
    }

    return this.buildSessionDto(session);
  }

  /**
   * Get active session by concept slug or create one if none active.
   */
  async getOrCreateSessionForConcept(
    studentId: string | undefined,
    conceptSlug: string
  ): Promise<LearningSessionDto> {
    if (!studentId || !this.isValidUuid(studentId)) {
      throw new UnauthorizedError('Authentication required');
    }
    if (!conceptSlug || typeof conceptSlug !== 'string' || !conceptSlug.trim()) {
      throw new ValidationError('Concept slug is required');
    }

    const slug = conceptSlug.trim().toLowerCase();

    // Check active session
    let session = await this.repo.findActiveSessionByConceptSlug(studentId, slug);

    if (!session) {
      // Find concept
      const cRes = await pool.query('SELECT id, slug, title FROM concepts WHERE slug = $1', [slug]);
      if (cRes.rows.length === 0) {
        throw new NotFoundError(`Concept "${slug}" not found`);
      }
      const concept = cRes.rows[0];
      session = await this.repo.createSession(studentId, concept.id, 'PRACTICE');
    }

    return this.buildSessionDto(session);
  }

  /**
   * Advance session to the next stage (e.g. from TEACHING to RETRY, or RETEACHING to RETRY/TRANSFER).
   */
  async advanceSession(
    studentId: string | undefined,
    sessionId: string,
    targetStage?: 'RETRY' | 'TRANSFER'
  ): Promise<LearningSessionDto> {
    if (!studentId || !this.isValidUuid(studentId)) {
      throw new UnauthorizedError('Authentication required');
    }
    if (!sessionId || !this.isValidUuid(sessionId)) {
      throw new ValidationError('Valid session ID is required');
    }

    const session = await this.repo.findSessionById(sessionId.trim());
    if (!session) {
      throw new NotFoundError(`Learning session with ID ${sessionId} not found`);
    }

    if (session.student_id !== studentId) {
      throw new ForbiddenError('Unauthorized: session does not belong to the authenticated student');
    }

    if (session.status === 'complete' || session.stage === 'COMPLETED') {
      throw new ConflictError('Learning session is already completed');
    }

    const currentStage = session.stage.toUpperCase() as SessionStage;

    if (currentStage === 'TEACHING') {
      // Advance from TEACHING to RETRY
      const retryQuestion = await this.repo.findQuestionByConceptAndPhase(session.concept_id, 'retry');
      await this.repo.updateSessionStage(
        session.id,
        'RETRY',
        'retry',
        retryQuestion ? retryQuestion.id : null,
        session.metadata
      );
    } else if (currentStage === 'RETEACHING') {
      // Advance from RETEACHING to RETRY or TRANSFER
      const attempts = await this.repo.findAttemptsForSession(session.id);
      const lastAttempt = attempts[attempts.length - 1];
      const target = targetStage || (lastAttempt?.phase === 'transfer' ? 'TRANSFER' : 'RETRY');

      if (target === 'TRANSFER') {
        const transferQuestion = await this.repo.findQuestionByConceptAndPhase(session.concept_id, 'transfer');
        await this.repo.updateSessionStage(
          session.id,
          'TRANSFER',
          'transfer',
          transferQuestion ? transferQuestion.id : null,
          session.metadata
        );
      } else {
        const retryQuestion = await this.repo.findQuestionByConceptAndPhase(session.concept_id, 'retry');
        await this.repo.updateSessionStage(
          session.id,
          'RETRY',
          'retry',
          retryQuestion ? retryQuestion.id : null,
          session.metadata
        );
      }
    } else if (currentStage === 'RETRY') {
      // If student manually requests advance to transfer after correct retry
      const attempts = await this.repo.findAttemptsForSession(session.id);
      const retryAttempts = attempts.filter((a) => a.phase === 'retry');
      const latestRetry = retryAttempts[retryAttempts.length - 1];

      if (latestRetry && latestRetry.isCorrect) {
        const transferQuestion = await this.repo.findQuestionByConceptAndPhase(session.concept_id, 'transfer');
        await this.repo.updateSessionStage(
          session.id,
          'TRANSFER',
          'transfer',
          transferQuestion ? transferQuestion.id : null,
          session.metadata
        );
      }
    }

    const updated = await this.repo.findSessionById(sessionId.trim());
    return this.buildSessionDto(updated!);
  }

  /**
   * Handle attempt evaluation outcome and update learning session state accordingly.
   * Invoked automatically by Module 5 Answer Submission.
   */
  async handleAttemptOutcome(
    studentId: string,
    sessionId: string,
    questionId: string,
    isCorrect: boolean,
    phase: string,
    selectedOptionId?: string
  ): Promise<{ stage: SessionStage; status: string }> {
    const session = await this.repo.findSessionById(sessionId);
    if (!session || session.student_id !== studentId) {
      return { stage: 'PRACTICE', status: 'practice' };
    }

    const normPhase = phase.toLowerCase();
    let nextStage: SessionStage = session.stage;
    let nextStatus: string = session.status;
    let metadata = session.metadata || {};

    if (normPhase === 'practice') {
      if (!isCorrect) {
        // Wrong practice answer -> TEACHING
        nextStage = 'TEACHING';
        nextStatus = 'teaching';

        // Check if a misconception was triggered
        let miscInfo = selectedOptionId ? await this.repo.findOptionMisconceptionCode(selectedOptionId) : null;
        const teaching = getTeachingContent(session.concept_slug, miscInfo?.code, false);

        metadata = {
          ...metadata,
          teaching,
          misconceptionCode: miscInfo?.code,
          misconceptionTitle: miscInfo?.title || teaching.misconceptionTitle,
          failedPracticeQuestionId: questionId,
        };
      }
    } else if (normPhase === 'retry') {
      if (isCorrect) {
        // Retry correct -> TRANSFER
        nextStage = 'TRANSFER';
        nextStatus = 'transfer';
        const transferQuestion = await this.repo.findQuestionByConceptAndPhase(session.concept_id, 'transfer');
        metadata = {
          ...metadata,
          retryPassed: true,
          activeTransferQuestionId: transferQuestion?.id,
        };
      } else {
        // Retry wrong -> RETEACHING
        nextStage = 'RETEACHING';
        nextStatus = 'reteaching';
        const teaching = getTeachingContent(session.concept_slug, metadata.misconceptionCode, true);
        metadata = {
          ...metadata,
          teaching,
          reteachCount: (metadata.reteachCount || 0) + 1,
        };
      }
    } else if (normPhase === 'transfer') {
      if (isCorrect) {
        // Transfer correct -> COMPLETED
        nextStage = 'COMPLETED';
        nextStatus = 'complete';
        await this.repo.markSessionComplete(session.id);
        return { stage: 'COMPLETED', status: 'complete' };
      } else {
        // Transfer wrong -> RETEACHING
        nextStage = 'RETEACHING';
        nextStatus = 'reteaching';
        const teaching = getTeachingContent(session.concept_slug, metadata.misconceptionCode, true);
        metadata = {
          ...metadata,
          teaching,
          reteachCount: (metadata.reteachCount || 0) + 1,
        };
      }
    }

    await this.repo.updateSessionStage(session.id, nextStage, nextStatus, null, metadata);
    return { stage: nextStage, status: nextStatus };
  }

  /**
   * Helper to build safe LearningSessionDto with no answers exposed.
   */
  private async buildSessionDto(session: DbSessionRow): Promise<LearningSessionDto> {
    const history = await this.repo.findAttemptsForSession(session.id);
    const isCompleted = session.status === 'complete' || session.stage === 'COMPLETED';

    // Normalize stage string
    let currentStage = (session.stage ? session.stage.toUpperCase() : 'PRACTICE') as SessionStage;
    if (session.status === 'complete') currentStage = 'COMPLETED';

    // Teaching content
    let teaching: TeachingContent | undefined = session.metadata?.teaching;
    if (!teaching) {
      const isReteach = currentStage === 'RETEACHING';
      teaching = getTeachingContent(
        session.concept_slug,
        session.metadata?.misconceptionCode,
        isReteach
      );
    }

    // Active question selection based on current stage
    let question = undefined;
    let originalQuestion = undefined;

    if (session.metadata?.failedPracticeQuestionId) {
      originalQuestion = await this.repo.findQuestionDtoById(session.metadata.failedPracticeQuestionId);
    } else {
      // Find default practice question for concept
      originalQuestion = await this.repo.findQuestionByConceptAndPhase(session.concept_id, 'practice');
    }

    if (currentStage === 'RETRY') {
      question = await this.repo.findQuestionByConceptAndPhase(session.concept_id, 'retry');
    } else if (currentStage === 'TRANSFER') {
      question = await this.repo.findQuestionByConceptAndPhase(session.concept_id, 'transfer');
    } else if (currentStage === 'RETEACHING') {
      // In reteaching, provide the question that was failed (retry or transfer)
      const lastAttempt = history[history.length - 1];
      if (lastAttempt?.phase === 'transfer') {
        question = await this.repo.findQuestionByConceptAndPhase(session.concept_id, 'transfer');
      } else {
        question = await this.repo.findQuestionByConceptAndPhase(session.concept_id, 'retry');
      }
    } else if (currentStage === 'TEACHING') {
      // In teaching stage, fetch retry question for upcoming preview
      question = await this.repo.findQuestionByConceptAndPhase(session.concept_id, 'retry');
    }

    return {
      id: session.id,
      studentId: session.student_id,
      conceptId: session.concept_id,
      conceptSlug: session.concept_slug,
      conceptTitle: session.concept_title,
      status: session.status,
      stage: currentStage,
      startedAt: new Date(session.started_at).toISOString(),
      completedAt: session.completed_at ? new Date(session.completed_at).toISOString() : null,
      teaching,
      question: question || undefined,
      originalQuestion: originalQuestion || undefined,
      history,
      isCompleted,
    };
  }
}

export const sessionService = new SessionService();
