/**
 * FIXXY Module 8 — Learning Flow Orchestration Service
 *
 * Conductor Principle:
 * Module 8 coordinates the learning loop across Modules 1–7.
 * It does NOT duplicate correctness checking (M5), question selection (M4),
 * curriculum models (M3), student authentication (M1), or mastery formulas (M7).
 */

import { pool } from '../../config/db';
import { attemptService } from '../attempts/attempt.service';
import { masteryService } from '../mastery/mastery.service';
import { sessionRepository, SessionRepository, DbSessionRow } from '../sessions/session.repository';
import { sessionService } from '../sessions/session.service';
import { aiClient, AiClient } from './orchestration.ai.client';
import {
  ValidationError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
  AiServiceError,
} from './orchestration.errors';
import {
  CreateSessionRequest,
  CreateSessionResponse,
  AnswerRequest,
  AnswerResponse,
  SessionRestorationDto,
  QuestionSafeDto,
  OrchestrationLearningState,
  AttemptSummaryDto,
  TeachingContentDto,
} from './orchestration.types';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export class OrchestrationService {
  constructor(
    private readonly repo: SessionRepository = sessionRepository,
    private readonly ai: AiClient = aiClient
  ) {}

  private isValidUuid(id: unknown): id is string {
    return typeof id === 'string' && UUID_REGEX.test(id.trim());
  }

  /**
   * Safe mapping from DB question row to safe DTO (no answer keys exposed).
   */
  private formatQuestionSafeDto(q: any): QuestionSafeDto {
    return {
      id: q.id,
      conceptId: q.conceptId || q.concept_id,
      code: q.code,
      phase: q.phase,
      prompt: q.prompt,
      questionText: q.prompt,
      difficulty: q.difficulty,
      options: (q.options || []).map((o: any) => ({
        id: o.id,
        position: o.position,
        text: o.optionText || o.option_text || o.text || '',
        optionText: o.optionText || o.option_text || o.text || '',
      })),
    };
  }

  /**
   * Start or retrieve an active learning session for a student and concept.
   * Endpoints: POST /api/learning/sessions
   */
  async startOrGetSession(
    studentId: string | undefined,
    payload: CreateSessionRequest
  ): Promise<CreateSessionResponse> {
    if (!studentId || !this.isValidUuid(studentId)) {
      throw new UnauthorizedError('Authentication required');
    }

    if (!payload || (!payload.conceptId && !payload.conceptSlug)) {
      throw new ValidationError('conceptId or conceptSlug is required');
    }

    // Resolve concept from database
    let conceptRow: any = null;
    if (payload.conceptId) {
      if (!this.isValidUuid(payload.conceptId)) {
        throw new ValidationError('conceptId must be a valid UUID');
      }
      const res = await pool.query('SELECT id, slug, title FROM concepts WHERE id = $1', [payload.conceptId.trim()]);
      conceptRow = res.rows[0];
    } else if (payload.conceptSlug) {
      const slug = payload.conceptSlug.trim().toLowerCase();
      const res = await pool.query('SELECT id, slug, title FROM concepts WHERE slug = $1', [slug]);
      conceptRow = res.rows[0];
    }

    if (!conceptRow) {
      throw new NotFoundError('Curriculum concept not found');
    }

    // Look for active session
    let session = await this.repo.findActiveSessionByConceptSlug(studentId, conceptRow.slug);
    if (!session) {
      session = await this.repo.createSession(studentId, conceptRow.id, 'PRACTICE');
    }

    // Fetch active question for PRACTICE (or current stage)
    const practiceQuestionRaw = await this.repo.findQuestionByConceptAndPhase(conceptRow.id, 'practice');
    const questionSafe = practiceQuestionRaw ? this.formatQuestionSafeDto(practiceQuestionRaw) : null;

    // Fetch history
    const historyRows = await this.repo.findAttemptsForSession(session.id);
    const history: AttemptSummaryDto[] = historyRows.map((a: any) => ({
      id: a.id,
      questionId: a.questionId,
      phase: a.phase,
      isCorrect: a.isCorrect,
      attemptNumber: a.attemptNumber,
      submittedAt: a.submittedAt,
    }));

    const state = (session.stage ? session.stage.toUpperCase() : 'PRACTICE') as OrchestrationLearningState;
    const isCompleted = session.status === 'complete' || state === 'COMPLETED' || state === 'COMPLETE';

    return {
      sessionId: session.id,
      state: isCompleted ? 'COMPLETE' : state,
      stage: isCompleted ? 'COMPLETE' : state,
      concept: {
        id: conceptRow.id,
        slug: conceptRow.slug,
        title: conceptRow.title,
      },
      question: questionSafe,
      history,
      isCompleted,
    };
  }

  /**
   * Restore learning session state on refresh or resume.
   * Endpoint: GET /api/learning/sessions/:sessionId
   */
  async getSessionState(studentId: string | undefined, sessionId: string): Promise<SessionRestorationDto> {
    if (!studentId || !this.isValidUuid(studentId)) {
      throw new UnauthorizedError('Authentication required');
    }
    if (!sessionId || !this.isValidUuid(sessionId)) {
      throw new ValidationError('Valid session UUID is required');
    }

    const session = await this.repo.findSessionById(sessionId.trim());
    if (!session) {
      throw new NotFoundError(`Learning session with ID ${sessionId} not found`);
    }

    if (session.student_id !== studentId) {
      throw new ForbiddenError('Unauthorized: session belongs to another student');
    }

    const historyRows = await this.repo.findAttemptsForSession(session.id);
    const history: AttemptSummaryDto[] = historyRows.map((a: any) => ({
      id: a.id,
      questionId: a.questionId,
      phase: a.phase,
      isCorrect: a.isCorrect,
      attemptNumber: a.attemptNumber,
      submittedAt: a.submittedAt,
    }));

    let state = (session.stage ? session.stage.toUpperCase() : 'PRACTICE') as OrchestrationLearningState;
    const isCompleted = session.status === 'complete' || state === 'COMPLETED' || state === 'COMPLETE';
    if (isCompleted) state = 'COMPLETE';

    // Fetch original practice question
    let originalQuestionRaw = null;
    if (session.metadata?.failedPracticeQuestionId) {
      originalQuestionRaw = await this.repo.findQuestionDtoById(session.metadata.failedPracticeQuestionId);
    } else {
      originalQuestionRaw = await this.repo.findQuestionByConceptAndPhase(session.concept_id, 'practice');
    }

    // Determine current active question based on stage
    let activeQuestionRaw = null;
    if (state === 'PRACTICE') {
      activeQuestionRaw = originalQuestionRaw;
    } else if (state === 'RETRY' || state === 'TEACHING') {
      activeQuestionRaw = await this.repo.findQuestionByConceptAndPhase(session.concept_id, 'retry');
    } else if (state === 'TRANSFER') {
      activeQuestionRaw = await this.repo.findQuestionByConceptAndPhase(session.concept_id, 'transfer');
    } else if (state === 'RETEACHING') {
      const lastAttempt = history[history.length - 1];
      if (lastAttempt?.phase === 'transfer') {
        activeQuestionRaw = await this.repo.findQuestionByConceptAndPhase(session.concept_id, 'transfer');
      } else {
        activeQuestionRaw = await this.repo.findQuestionByConceptAndPhase(session.concept_id, 'retry');
      }
    }

    // Teaching data
    let teaching: TeachingContentDto | undefined = session.metadata?.teaching;
    if (!teaching && (state === 'TEACHING' || state === 'RETRY' || state === 'RETEACHING')) {
      teaching = await this.ai.getDiagnosisAndTeaching({
        conceptSlug: session.concept_slug,
        misconceptionCode: session.metadata?.misconceptionCode,
        isReteach: state === 'RETEACHING',
      });
    }

    // Allowed actions
    const allowedActions: string[] = [];
    if (isCompleted) {
      // none
    } else if (state === 'TEACHING') {
      allowedActions.push('CONTINUE_TO_RETRY', 'SUBMIT_ANSWER');
    } else if (state === 'RETEACHING') {
      allowedActions.push('CONTINUE_TO_RETRY', 'SUBMIT_ANSWER');
    } else {
      allowedActions.push('SUBMIT_ANSWER');
    }

    return {
      sessionId: session.id,
      state,
      stage: state,
      concept: {
        id: session.concept_id,
        slug: session.concept_slug,
        title: session.concept_title,
      },
      question: activeQuestionRaw ? this.formatQuestionSafeDto(activeQuestionRaw) : undefined,
      originalQuestion: originalQuestionRaw ? this.formatQuestionSafeDto(originalQuestionRaw) : undefined,
      teaching,
      history,
      isCompleted,
      allowedActions,
    };
  }

  /**
   * Primary Answer Orchestration Endpoint.
   * Connects M5 (Answer Submission) -> AI Diagnosis -> M4 (Question Engine) -> M7 (Mastery).
   *
   * Endpoint: POST /api/learning/answer
   */
  async processAnswer(
    studentId: string | undefined,
    payload: AnswerRequest,
    options?: { simulateAiFailure?: boolean }
  ): Promise<AnswerResponse> {
    // 1. Verify authentication
    if (!studentId || !this.isValidUuid(studentId)) {
      throw new UnauthorizedError('Authentication required');
    }

    // 2. Validate request payload
    if (!payload || typeof payload !== 'object') {
      throw new ValidationError('Request body must be a valid JSON object');
    }

    const { sessionId, questionId, selectedOptionId } = payload;
    const errors: Record<string, string> = {};

    if (!sessionId || !this.isValidUuid(sessionId)) {
      errors.sessionId = 'sessionId must be a valid UUID';
    }
    if (!questionId || !this.isValidUuid(questionId)) {
      errors.questionId = 'questionId must be a valid UUID';
    }
    if (!selectedOptionId || !this.isValidUuid(selectedOptionId)) {
      errors.selectedOptionId = 'selectedOptionId must be a valid UUID';
    }

    if (Object.keys(errors).length > 0) {
      throw new ValidationError('Invalid answer submission payload', errors);
    }

    // 3. Verify session existence and ownership
    const session = await this.repo.findSessionById(sessionId.trim());
    if (!session) {
      throw new NotFoundError(`Learning session with ID ${sessionId} not found`);
    }

    if (session.student_id !== studentId) {
      throw new ForbiddenError('Unauthorized: session belongs to another student');
    }

    if (session.status === 'complete' || (session.stage as string) === 'COMPLETED' || (session.stage as string) === 'COMPLETE') {
      throw new ConflictError('Learning session is already completed');
    }

    // 4. Verify question and option
    const qRes = await pool.query(
      'SELECT id, concept_id, phase, prompt, difficulty FROM questions WHERE id = $1 AND is_active = TRUE',
      [questionId.trim()]
    );
    if (qRes.rows.length === 0) {
      throw new NotFoundError(`Question with ID ${questionId} not found`);
    }
    const question = qRes.rows[0];

    if (question.concept_id !== session.concept_id) {
      throw new ValidationError('Question does not belong to active session concept');
    }

    const optRes = await pool.query(
      'SELECT id, question_id, is_correct, misconception_id, option_text FROM question_options WHERE id = $1',
      [selectedOptionId.trim()]
    );
    if (optRes.rows.length === 0) {
      throw new NotFoundError(`Selected option with ID ${selectedOptionId} not found`);
    }
    const option = optRes.rows[0];

    if (option.question_id !== question.id) {
      throw new ValidationError('Selected option does not belong to specified question');
    }

    // 5. Verify stage-question alignment
    const currentStage = (session.stage ? session.stage.toUpperCase() : 'PRACTICE') as OrchestrationLearningState;
    if (currentStage === 'PRACTICE' && question.phase !== 'practice') {
      throw new ValidationError('Question does not correspond to current PRACTICE stage');
    }
    if (currentStage === 'RETRY' && question.phase !== 'retry') {
      throw new ValidationError('Question does not correspond to current RETRY stage');
    }
    if (currentStage === 'TRANSFER' && question.phase !== 'transfer') {
      throw new ValidationError('Question does not correspond to current TRANSFER stage');
    }

    // 6. Delegate correctness and attempt recording to Module 5 (AttemptService)
    // Note: attemptService.submitAnswer enforces server-side correctness, debounce, and records attempt.
    const attemptResult = await attemptService.submitAnswer(studentId, {
      sessionId: session.id,
      questionId: question.id,
      selectedOptionId: option.id,
    });

    const isCorrect = attemptResult.result.correct;
    const normPhase = question.phase.toLowerCase();

    // 7. If simulating AI service failure for resilience testing:
    // Notice that the attempt is already safely committed to DB before AI failure simulation!
    if (options?.simulateAiFailure) {
      throw new AiServiceError('AI Diagnosis service is temporarily unavailable');
    }

    // 8. Orchestrate next learning state and next question based on evidence
    let nextState: OrchestrationLearningState = currentStage;
    let teachingDto: TeachingContentDto | null = null;
    let nextQuestionSafe: QuestionSafeDto | null = null;
    let isCompleted = false;
    let masteryUpdated = false;

    if (normPhase === 'practice') {
      if (isCorrect) {
        // Correct Practice Answer -> Session COMPLETE directly!
        nextState = 'COMPLETE';
        isCompleted = true;
        await this.repo.markSessionComplete(session.id);
        await masteryService.refreshConceptMastery(studentId, session.concept_id);
        masteryUpdated = true;
      } else {
        // Wrong Practice Answer -> DIAGNOSING / TEACHING -> RETRY
        nextState = 'RETRY';

        // Misconception diagnosis
        let miscInfo = await this.repo.findOptionMisconceptionCode(option.id);
        const correctOptRes = await pool.query(
          'SELECT option_text FROM question_options WHERE question_id = $1 AND is_correct = TRUE LIMIT 1',
          [question.id]
        );
        teachingDto = await this.ai.getDiagnosisAndTeaching({
          conceptSlug: session.concept_slug,
          questionPrompt: question.prompt,
          selectedOptionText: option.option_text,
          correctAnswerText: correctOptRes.rows[0]?.option_text,
          misconceptionCode: miscInfo?.code,
          isReteach: false,
          studentId,
        });

        // Request distinct retry question from M4 Question Engine
        const retryQuestionRaw = await this.repo.findQuestionByConceptAndPhase(session.concept_id, 'retry');
        nextQuestionSafe = retryQuestionRaw ? this.formatQuestionSafeDto(retryQuestionRaw) : null;

        // Persist session stage to RETRY with teaching metadata
        await this.repo.updateSessionStage(
          session.id,
          'RETRY',
          'retry',
          retryQuestionRaw?.id || null,
          {
            ...session.metadata,
            teaching: teachingDto,
            misconceptionCode: miscInfo?.code || teachingDto.misconceptionCode,
            misconceptionTitle: miscInfo?.title || teachingDto.misconceptionTitle,
            failedPracticeQuestionId: question.id,
          }
        );
      }
    } else if (normPhase === 'retry') {
      if (isCorrect) {
        // Retry Correct -> TRANSFER
        nextState = 'TRANSFER';

        // Request distinct transfer question from M4 Question Engine
        const transferQuestionRaw = await this.repo.findQuestionByConceptAndPhase(session.concept_id, 'transfer');
        nextQuestionSafe = transferQuestionRaw ? this.formatQuestionSafeDto(transferQuestionRaw) : null;

        // Update session stage
        await this.repo.updateSessionStage(
          session.id,
          'TRANSFER',
          'transfer',
          transferQuestionRaw?.id || null,
          {
            ...session.metadata,
            retryPassed: true,
            activeTransferQuestionId: transferQuestionRaw?.id,
          }
        );
      } else {
        // Retry Wrong -> RETEACHING
        nextState = 'RETEACHING';

        teachingDto = await this.ai.getDiagnosisAndTeaching({
          conceptSlug: session.concept_slug,
          misconceptionCode: session.metadata?.misconceptionCode,
          isReteach: true,
        });

        const retryQuestionRaw = await this.repo.findQuestionByConceptAndPhase(session.concept_id, 'retry');
        nextQuestionSafe = retryQuestionRaw ? this.formatQuestionSafeDto(retryQuestionRaw) : null;

        await this.repo.updateSessionStage(
          session.id,
          'RETEACHING',
          'reteaching',
          retryQuestionRaw?.id || null,
          {
            ...session.metadata,
            teaching: teachingDto,
            reteachCount: (session.metadata?.reteachCount || 0) + 1,
          }
        );
      }
    } else if (normPhase === 'transfer') {
      if (isCorrect) {
        // Transfer Correct -> Session COMPLETE + Official Mastery Update via Module 7
        nextState = 'COMPLETE';
        isCompleted = true;
        await this.repo.markSessionComplete(session.id);
        await masteryService.refreshConceptMastery(studentId, session.concept_id);
        masteryUpdated = true;
      } else {
        // Transfer Wrong -> RETEACHING
        nextState = 'RETEACHING';

        teachingDto = await this.ai.getDiagnosisAndTeaching({
          conceptSlug: session.concept_slug,
          misconceptionCode: session.metadata?.misconceptionCode,
          isReteach: true,
        });

        const transferQuestionRaw = await this.repo.findQuestionByConceptAndPhase(session.concept_id, 'transfer');
        nextQuestionSafe = transferQuestionRaw ? this.formatQuestionSafeDto(transferQuestionRaw) : null;

        await this.repo.updateSessionStage(
          session.id,
          'RETEACHING',
          'reteaching',
          transferQuestionRaw?.id || null,
          {
            ...session.metadata,
            teaching: teachingDto,
            reteachCount: (session.metadata?.reteachCount || 0) + 1,
          }
        );
      }
    }

    return {
      sessionId: session.id,
      state: nextState,
      stage: nextState,
      result: {
        isCorrect,
        correct: isCorrect,
        attemptId: attemptResult.attempt.id,
      },
      teaching: teachingDto,
      nextQuestion: nextQuestionSafe,
      isCompleted,
      masteryUpdated,
    };
  }

  /**
   * Advance session stage (e.g. from TEACHING to RETRY or RETEACHING to RETRY/TRANSFER).
   * Endpoint: POST /api/learning/sessions/:sessionId/advance
   */
  async advanceSession(
    studentId: string | undefined,
    sessionId: string,
    targetStage?: 'RETRY' | 'TRANSFER'
  ): Promise<SessionRestorationDto> {
    await sessionService.advanceSession(studentId, sessionId, targetStage);
    return this.getSessionState(studentId, sessionId);
  }

  /**
   * Conversational tutor chat.
   * Secure intermediary between student and FastAPI AI Brain.
   * Chat does NOT mutate mastery or answer attempts.
   */
  async chatWithTutor(
    studentId: string | undefined,
    payload: {
      concept: string;
      question?: string;
      correctAnswer?: string;
      studentAnswer?: string;
      misconceptionId?: string;
      strategy?: string;
      mastery?: number | null;
      conversation?: Array<{ role: string; content: string }>;
      message: string;
    }
  ): Promise<{ response: string; concept: string; misconceptionId?: string }> {
    if (!studentId || !this.isValidUuid(studentId)) {
      throw new UnauthorizedError('Authentication required');
    }

    if (!payload?.concept) {
      throw new ValidationError('concept is required');
    }

    if (!payload?.message || typeof payload.message !== 'string' || !payload.message.trim()) {
      throw new ValidationError('message must be a non-empty string');
    }

    return this.ai.chatWithTutor({
      concept: payload.concept.trim(),
      question: payload.question,
      correctAnswer: payload.correctAnswer,
      studentAnswer: payload.studentAnswer,
      misconceptionId: payload.misconceptionId,
      strategy: payload.strategy,
      mastery: payload.mastery,
      conversation: Array.isArray(payload.conversation) ? payload.conversation : [],
      message: payload.message.trim(),
    });
  }
}

export const orchestrationService = new OrchestrationService();
