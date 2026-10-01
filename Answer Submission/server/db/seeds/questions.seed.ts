import { pool, withClient } from '../../src/config/db';

export async function seedQuestions(): Promise<void> {
  await withClient(async (client) => {
    // 1. Fetch concepts
    const conceptsRes = await client.query('SELECT id, slug FROM concepts');
    const conceptMap: Record<string, string> = {};
    conceptsRes.rows.forEach((r) => {
      conceptMap[r.slug] = r.id;
    });

    if (!conceptMap['overfitting'] || !conceptMap['bias-vs-variance'] || !conceptMap['train-validation-test']) {
      console.log('[questions:seed] Concepts not found. Skipping questions seed.');
      return;
    }

    // 2. Fetch misconceptions for mapping
    const miscRes = await client.query('SELECT id, code FROM misconceptions');
    const miscMap: Record<string, string> = {};
    miscRes.rows.forEach((r) => {
      miscMap[r.code] = r.id;
    });

    const questionsData = [
      // --- Overfitting ---
      {
        conceptSlug: 'overfitting',
        code: 'OVERFIT_Q1',
        phase: 'practice',
        difficulty: 1,
        prompt:
          'A neural network is trained on a dataset of 10,000 images and achieves 99.5% accuracy on the training set. When tested on 2,000 held-out images it achieves only 61% accuracy. What does this result most likely indicate?',
        options: [
          {
            pos: 1,
            text: 'The model has overfit the training data and does not generalize well.',
            isCorrect: true,
            miscCode: null,
          },
          {
            pos: 2,
            text: 'The model is performing well because training accuracy is very high.',
            isCorrect: false,
            miscCode: 'OVERFIT_M1',
          },
          {
            pos: 3,
            text: 'The model needs more training epochs to improve test accuracy.',
            isCorrect: false,
            miscCode: null,
          },
          {
            pos: 4,
            text: 'The test set is too small to draw any conclusion.',
            isCorrect: false,
            miscCode: null,
          },
        ],
      },
      {
        conceptSlug: 'overfitting',
        code: 'OVERFIT_Q2',
        phase: 'retry',
        difficulty: 2,
        prompt:
          'A decision tree classifier scores 100% on its training set and 55% on the validation set. A colleague says "the model is excellent — 100% training accuracy!" Which statement best evaluates their claim?',
        options: [
          {
            pos: 1,
            text: 'The colleague is wrong. The 45-point gap between training and validation accuracy is a clear sign of overfitting.',
            isCorrect: true,
            miscCode: null,
          },
          {
            pos: 2,
            text: 'The colleague is correct. 100% training accuracy shows the model has learned perfectly.',
            isCorrect: false,
            miscCode: 'OVERFIT_M1',
          },
          {
            pos: 3,
            text: 'More data is needed before any conclusion can be drawn.',
            isCorrect: false,
            miscCode: null,
          },
          {
            pos: 4,
            text: 'The validation set is probably mislabelled.',
            isCorrect: false,
            miscCode: null,
          },
        ],
      },
      {
        conceptSlug: 'overfitting',
        code: 'OVERFIT_Q3',
        phase: 'transfer',
        difficulty: 3,
        prompt:
          'A sentiment classifier is trained on 50,000 movie reviews and achieves 97% training accuracy. It is then deployed to classify product reviews but only achieves 54% accuracy in production. A data scientist says the classifier should be trusted because "it was almost perfect during training." What is the most accurate assessment?',
        options: [
          {
            pos: 1,
            text: 'The data scientist is wrong. The classifier overfit to movie-review language and cannot generalize to the different vocabulary and style of product reviews.',
            isCorrect: true,
            miscCode: null,
          },
          {
            pos: 2,
            text: 'The data scientist is correct. High training accuracy is the best predictor of real-world performance.',
            isCorrect: false,
            miscCode: 'OVERFIT_M1',
          },
          {
            pos: 3,
            text: 'The poor production accuracy is because the product reviews contain typos.',
            isCorrect: false,
            miscCode: null,
          },
          {
            pos: 4,
            text: 'Production performance is always lower than training performance so this is expected and acceptable.',
            isCorrect: false,
            miscCode: null,
          },
        ],
      },

      // --- Bias vs Variance ---
      {
        conceptSlug: 'bias-vs-variance',
        code: 'BV_Q1',
        phase: 'practice',
        difficulty: 1,
        prompt:
          'A linear regression model applied to a complex non-linear dataset achieves 62% training accuracy and 61% validation accuracy. What type of error is predominantly affecting this model?',
        options: [
          {
            pos: 1,
            text: 'High bias (underfitting) because the model lacks capacity to capture the underlying pattern.',
            isCorrect: true,
            miscCode: null,
          },
          {
            pos: 2,
            text: 'High variance (overfitting) because the model is fitting noise.',
            isCorrect: false,
            miscCode: 'BV_M1',
          },
          {
            pos: 3,
            text: 'Bayes error because no model could perform better.',
            isCorrect: false,
            miscCode: null,
          },
          {
            pos: 4,
            text: 'Label noise in the validation set.',
            isCorrect: false,
            miscCode: null,
          },
        ],
      },
      {
        conceptSlug: 'bias-vs-variance',
        code: 'BV_Q2',
        phase: 'retry',
        difficulty: 2,
        prompt:
          'You decide to reduce model complexity by removing polynomial features and increasing L2 regularization. What is the expected effect on bias and variance?',
        options: [
          {
            pos: 1,
            text: 'Bias increases while variance decreases.',
            isCorrect: true,
            miscCode: null,
          },
          {
            pos: 2,
            text: 'Bias decreases while variance increases.',
            isCorrect: false,
            miscCode: null,
          },
          {
            pos: 3,
            text: 'Both bias and variance decrease simultaneously.',
            isCorrect: false,
            miscCode: 'BV_M2',
          },
          {
            pos: 4,
            text: 'Both bias and variance increase simultaneously.',
            isCorrect: false,
            miscCode: null,
          },
        ],
      },
      {
        conceptSlug: 'bias-vs-variance',
        code: 'BV_Q3',
        phase: 'transfer',
        difficulty: 3,
        prompt:
          'An autonomous driving vision system performs reliably in sunny daylight but poorly in heavy rain. Adding 100,000 more sunny images does not improve rainy-day accuracy. What is the root cause?',
        options: [
          {
            pos: 1,
            text: 'High inductive bias with respect to rain conditions; the model needs representative training data from rainy distributions.',
            isCorrect: true,
            miscCode: null,
          },
          {
            pos: 2,
            text: 'High variance that can be solved by training for more epochs on the sunny images.',
            isCorrect: false,
            miscCode: null,
          },
          {
            pos: 3,
            text: 'The model has too many parameters and should be made smaller.',
            isCorrect: false,
            miscCode: null,
          },
          {
            pos: 4,
            text: 'The test camera resolution is too high.',
            isCorrect: false,
            miscCode: null,
          },
        ],
      },

      // --- Train / Validation / Test ---
      {
        conceptSlug: 'train-validation-test',
        code: 'TVT_Q1',
        phase: 'practice',
        difficulty: 1,
        prompt:
          'Why is it essential to keep the test dataset completely untouched until final model evaluation?',
        options: [
          {
            pos: 1,
            text: 'To provide an unbiased estimate of generalization error on completely unseen data.',
            isCorrect: true,
            miscCode: null,
          },
          {
            pos: 2,
            text: 'To speed up hyperparameter search during training iterations.',
            isCorrect: false,
            miscCode: 'TVT_M1',
          },
          {
            pos: 3,
            text: 'Because test data cannot be processed with backpropagation.',
            isCorrect: false,
            miscCode: null,
          },
          {
            pos: 4,
            text: 'To ensure the training loss converges to absolute zero.',
            isCorrect: false,
            miscCode: null,
          },
        ],
      },
      {
        conceptSlug: 'train-validation-test',
        code: 'TVT_Q2',
        phase: 'retry',
        difficulty: 2,
        prompt:
          'A machine learning engineer tunes hyperparameters by testing 50 configurations on the test set and picking the highest scoring one. What is the fundamental flaw?',
        options: [
          {
            pos: 1,
            text: 'Test set information has leaked into the model selection process, producing an overly optimistic estimate.',
            isCorrect: true,
            miscCode: null,
          },
          {
            pos: 2,
            text: 'Neural networks should only be tuned on the training data.',
            isCorrect: false,
            miscCode: null,
          },
          {
            pos: 3,
            text: '50 configurations are too few to find a valid model.',
            isCorrect: false,
            miscCode: null,
          },
          {
            pos: 4,
            text: 'The test set cannot be evaluated more than once without becoming corrupted.',
            isCorrect: false,
            miscCode: 'TVT_M2',
          },
        ],
      },
      {
        conceptSlug: 'train-validation-test',
        code: 'TVT_Q3',
        phase: 'transfer',
        difficulty: 3,
        prompt:
          'A medical diagnostic model is developed using 10,000 scans from Hospital A (split 80/20 train/test), scoring 98% test accuracy. At Hospital B, accuracy drops to 71%. How should the evaluation have been structured?',
        options: [
          {
            pos: 1,
            text: 'Use an external validation cohort from Hospital B to evaluate domain shift and true clinical generalization.',
            isCorrect: true,
            miscCode: null,
          },
          {
            pos: 2,
            text: 'Train on Hospital A test set to give the model more data.',
            isCorrect: false,
            miscCode: null,
          },
          {
            pos: 3,
            text: 'Discard the test set and only rely on training cross-entropy loss.',
            isCorrect: false,
            miscCode: null,
          },
          {
            pos: 4,
            text: 'Reduce the test set size to 5% to minimize variance.',
            isCorrect: false,
            miscCode: null,
          },
        ],
      },
    ];

    let insertedQ = 0;
    let insertedOpt = 0;

    for (const q of questionsData) {
      const conceptId = conceptMap[q.conceptSlug];
      const qRes = await client.query(
        `INSERT INTO questions (concept_id, code, phase, prompt, difficulty, is_active, updated_at)
         VALUES ($1, $2, $3, $4, $5, TRUE, NOW())
         ON CONFLICT (code) DO UPDATE
           SET prompt = EXCLUDED.prompt,
               difficulty = EXCLUDED.difficulty,
               concept_id = EXCLUDED.concept_id,
               phase = EXCLUDED.phase,
               updated_at = NOW()
         RETURNING id`,
        [conceptId, q.code, q.phase, q.prompt, q.difficulty]
      );
      const questionId = qRes.rows[0].id;
      insertedQ++;

      for (const opt of q.options) {
        const misId = opt.miscCode ? miscMap[opt.miscCode] ?? null : null;
        await client.query(
          `INSERT INTO question_options (question_id, position, option_text, is_correct, misconception_id)
           VALUES ($1, $2, $3, $4, $5)
           ON CONFLICT (question_id, position) DO UPDATE
             SET option_text = EXCLUDED.option_text,
                 is_correct = EXCLUDED.is_correct,
                 misconception_id = EXCLUDED.misconception_id`,
          [questionId, opt.pos, opt.text, opt.isCorrect, misId]
        );
        insertedOpt++;
      }
    }

    console.log(`[questions:seed] Idempotently seeded ${insertedQ} questions and ${insertedOpt} options.`);
  });
}

if (require.main === module) {
  seedQuestions()
    .then(() => {
      console.log('[questions:seed] Done.');
      process.exit(0);
    })
    .catch((err) => {
      console.error('[questions:seed] Failed:', err);
      process.exit(1);
    });
}
