import { AttemptService, ValidationError, UnauthorizedError, NotFoundError, ForbiddenError, ConflictError } from '../src/modules/attempts/attempt.service';
import { AttemptRepository } from '../src/modules/attempts/attempt.repository';
import { QuestionEntity, QuestionOptionEntity, LearningSessionEntity, AttemptRecord, CreateAttemptParams } from '../src/modules/attempts/attempt.types';

function assert(condition: boolean, msg: string) {
  if (!condition) throw new Error(`Assertion failed: ${msg}`);
}

async function runUnitTests() {
  console.log('='.repeat(60));
  console.log('Module 5: Answer Submission — Service Unit Tests (Pure Logic)');
  console.log('='.repeat(60));

  let testsPassed = 0;

  const mockQuestion: QuestionEntity = {
    id: '11111111-1111-4111-8111-111111111111',
    conceptId: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
    code: 'TEST_Q1',
    phase: 'practice',
    prompt: 'What is overfitting?',
    difficulty: 1,
    isActive: true,
  };

  const mockCorrectOption: QuestionOptionEntity = {
    id: '22222222-2222-4222-8222-222222222222',
    questionId: mockQuestion.id,
    position: 1,
    optionText: 'Model fits noise',
    isCorrect: true,
    misconceptionId: null,
  };

  const mockWrongOption: QuestionOptionEntity = {
    id: '33333333-3333-4333-8333-333333333333',
    questionId: mockQuestion.id,
    position: 2,
    optionText: 'Model has high bias',
    isCorrect: false,
    misconceptionId: 'mmmmmmmm-mmmm-4mmm-8mmm-mmmmmmmmmmmm',
  };

  const mockForeignOption: QuestionOptionEntity = {
    id: '44444444-4444-4444-8444-444444444444',
    questionId: '99999999-9999-4999-8999-999999999999', // Different question!
    position: 1,
    optionText: 'Irrelevant option',
    isCorrect: true,
    misconceptionId: null,
  };

  const mockSession: LearningSessionEntity = {
    id: '55555555-5555-4555-8555-555555555555',
    studentId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    conceptId: mockQuestion.conceptId,
    status: 'practice',
    startedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    completedAt: null,
  };

  const createMockRepo = (overrides: Partial<AttemptRepository> = {}): AttemptRepository => {
    return {
      findQuestionById: async (id: string) => (id === mockQuestion.id ? mockQuestion : null),
      findOptionById: async (id: string) => {
        if (id === mockCorrectOption.id) return mockCorrectOption;
        if (id === mockWrongOption.id) return mockWrongOption;
        if (id === mockForeignOption.id) return mockForeignOption;
        return null;
      },
      findSessionById: async (id: string) => (id === mockSession.id ? mockSession : null),
      countPreviousAttempts: async () => 0,
      findRecentDuplicateAttempt: async () => null,
      createAttempt: async (params: CreateAttemptParams) => ({
        id: '66666666-6666-4666-8666-666666666666',
        studentId: params.studentId,
        questionId: params.questionId,
        selectedOptionId: params.selectedOptionId,
        sessionId: params.sessionId ?? null,
        phase: params.phase ?? 'practice',
        isCorrect: params.isCorrect,
        attemptNumber: params.attemptNumber,
        submittedAt: new Date().toISOString(),
      }),
      findAttemptsByStudent: async () => [],
      findAttemptsBySession: async () => [],
      ...overrides,
    } as unknown as AttemptRepository;
  };

  // Test 1: Valid correct submission
  {
    const service = new AttemptService(createMockRepo());
    const res = await service.submitAnswer(mockSession.studentId, {
      questionId: mockQuestion.id,
      selectedOptionId: mockCorrectOption.id,
    });
    assert(res.result.correct === true, 'Result must be correct');
    assert(res.attempt.isCorrect === true, 'Attempt isCorrect must be true');
    assert(res.attempt.attemptNumber === 1, 'Attempt number must be 1');
    testsPassed++;
    console.log('  ✓ [PASS] Unit Test: Valid correct answer calculation');
  }

  // Test 2: Valid wrong submission
  {
    const service = new AttemptService(createMockRepo());
    const res = await service.submitAnswer(mockSession.studentId, {
      questionId: mockQuestion.id,
      selectedOptionId: mockWrongOption.id,
    });
    assert(res.result.correct === false, 'Result must be false');
    assert(res.attempt.isCorrect === false, 'Attempt isCorrect must be false');
    testsPassed++;
    console.log('  ✓ [PASS] Unit Test: Valid wrong answer calculation');
  }

  // Test 3: Unauthenticated request throws UnauthorizedError
  {
    const service = new AttemptService(createMockRepo());
    let threw = false;
    try {
      await service.submitAnswer(undefined, {
        questionId: mockQuestion.id,
        selectedOptionId: mockCorrectOption.id,
      });
    } catch (err) {
      if (err instanceof UnauthorizedError) threw = true;
    }
    assert(threw, 'Must throw UnauthorizedError when studentId is missing');
    testsPassed++;
    console.log('  ✓ [PASS] Unit Test: Missing auth studentId throws UnauthorizedError');
  }

  // Test 4: Question not found throws NotFoundError
  {
    const service = new AttemptService(createMockRepo());
    let threw = false;
    try {
      await service.submitAnswer(mockSession.studentId, {
        questionId: '00000000-0000-4000-8000-000000000000',
        selectedOptionId: mockCorrectOption.id,
      });
    } catch (err) {
      if (err instanceof NotFoundError) threw = true;
    }
    assert(threw, 'Must throw NotFoundError when question does not exist');
    testsPassed++;
    console.log('  ✓ [PASS] Unit Test: Non-existent question throws NotFoundError');
  }

  // Test 5: Option not found throws NotFoundError
  {
    const service = new AttemptService(createMockRepo());
    let threw = false;
    try {
      await service.submitAnswer(mockSession.studentId, {
        questionId: mockQuestion.id,
        selectedOptionId: '00000000-0000-4000-8000-000000000000',
      });
    } catch (err) {
      if (err instanceof NotFoundError) threw = true;
    }
    assert(threw, 'Must throw NotFoundError when option does not exist');
    testsPassed++;
    console.log('  ✓ [PASS] Unit Test: Non-existent option throws NotFoundError');
  }

  // Test 6: Option belongs to different question throws ValidationError
  {
    const service = new AttemptService(createMockRepo());
    let threw = false;
    try {
      await service.submitAnswer(mockSession.studentId, {
        questionId: mockQuestion.id,
        selectedOptionId: mockForeignOption.id,
      });
    } catch (err) {
      if (err instanceof ValidationError && err.message.includes('does not belong')) threw = true;
    }
    assert(threw, 'Must throw ValidationError when option belongs to another question');
    testsPassed++;
    console.log('  ✓ [PASS] Unit Test: Option-question mismatch throws ValidationError');
  }

  // Test 7: Unauthorized session ownership throws ForbiddenError
  {
    const service = new AttemptService(createMockRepo());
    let threw = false;
    try {
      await service.submitAnswer('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', {
        questionId: mockQuestion.id,
        selectedOptionId: mockCorrectOption.id,
        sessionId: mockSession.id, // belongs to student 'aaaa...'
      });
    } catch (err) {
      if (err instanceof ForbiddenError) threw = true;
    }
    assert(threw, 'Must throw ForbiddenError when session belongs to another student');
    testsPassed++;
    console.log('  ✓ [PASS] Unit Test: Cross-student session access throws ForbiddenError');
  }

  // Test 8: Session with mismatched concept throws ValidationError
  {
    const sessionMismatch: LearningSessionEntity = {
      ...mockSession,
      conceptId: '99999999-9999-4999-8999-999999999999', // Different concept!
    };
    const service = new AttemptService(
      createMockRepo({
        findSessionById: async () => sessionMismatch,
      })
    );
    let threw = false;
    try {
      await service.submitAnswer(mockSession.studentId, {
        questionId: mockQuestion.id,
        selectedOptionId: mockCorrectOption.id,
        sessionId: mockSession.id,
      });
    } catch (err) {
      if (err instanceof ValidationError && err.message.includes('concept')) threw = true;
    }
    assert(threw, 'Must throw ValidationError when question does not match session concept');
    testsPassed++;
    console.log('  ✓ [PASS] Unit Test: Question-session concept mismatch throws ValidationError');
  }

  // Test 9: Completed session throws ConflictError
  {
    const completedSession: LearningSessionEntity = {
      ...mockSession,
      status: 'complete',
    };
    const service = new AttemptService(
      createMockRepo({
        findSessionById: async () => completedSession,
      })
    );
    let threw = false;
    try {
      await service.submitAnswer(mockSession.studentId, {
        questionId: mockQuestion.id,
        selectedOptionId: mockCorrectOption.id,
        sessionId: mockSession.id,
      });
    } catch (err) {
      if (err instanceof ConflictError) threw = true;
    }
    assert(threw, 'Must throw ConflictError when session is complete');
    testsPassed++;
    console.log('  ✓ [PASS] Unit Test: Submission on completed session throws ConflictError');
  }

  // Test 10: Duplicate submission throws ConflictError
  {
    const existingRecentAttempt: AttemptRecord = {
      id: '77777777-7777-4777-8777-777777777777',
      studentId: mockSession.studentId,
      questionId: mockQuestion.id,
      selectedOptionId: mockCorrectOption.id,
      sessionId: null,
      phase: 'practice',
      isCorrect: true,
      attemptNumber: 1,
      submittedAt: new Date().toISOString(),
    };
    const service = new AttemptService(
      createMockRepo({
        findRecentDuplicateAttempt: async () => existingRecentAttempt,
      })
    );
    let threw = false;
    try {
      await service.submitAnswer(mockSession.studentId, {
        questionId: mockQuestion.id,
        selectedOptionId: mockCorrectOption.id,
      });
    } catch (err) {
      if (err instanceof ConflictError) threw = true;
    }
    assert(threw, 'Must throw ConflictError on rapid duplicate');
    testsPassed++;
    console.log('  ✓ [PASS] Unit Test: Rapid duplicate throws ConflictError');
  }

  // Test 11: Attempt number increments accurately
  {
    const service = new AttemptService(
      createMockRepo({
        countPreviousAttempts: async () => 3,
        createAttempt: async (params) => ({
          id: '88888888-8888-4888-8888-888888888888',
          studentId: params.studentId,
          questionId: params.questionId,
          selectedOptionId: params.selectedOptionId,
          sessionId: null,
          phase: 'practice',
          isCorrect: params.isCorrect,
          attemptNumber: params.attemptNumber,
          submittedAt: new Date().toISOString(),
        }),
      })
    );
    const res = await service.submitAnswer(mockSession.studentId, {
      questionId: mockQuestion.id,
      selectedOptionId: mockCorrectOption.id,
    });
    assert(res.attempt.attemptNumber === 4, `Expected attempt 4, got ${res.attempt.attemptNumber}`);
    testsPassed++;
    console.log('  ✓ [PASS] Unit Test: Attempt number increments based on previous count (3 -> 4)');
  }

  // Test 12: Database error propagation
  {
    const service = new AttemptService(
      createMockRepo({
        createAttempt: async () => {
          throw new Error('Database connection failed');
        },
      })
    );
    let threw = false;
    try {
      await service.submitAnswer(mockSession.studentId, {
        questionId: mockQuestion.id,
        selectedOptionId: mockCorrectOption.id,
      });
    } catch (err: any) {
      if (err.message === 'Database connection failed') threw = true;
    }
    assert(threw, 'Database errors must be thrown for global error handler to safely format');
    testsPassed++;
    console.log('  ✓ [PASS] Unit Test: Database error propagation');
  }

  console.log('='.repeat(60));
  console.log(`ALL ${testsPassed} SERVICE UNIT TESTS PASSED!`);
  console.log('='.repeat(60));
}

runUnitTests().catch((err) => {
  console.error('Service unit test failed:', err);
  process.exit(1);
});
