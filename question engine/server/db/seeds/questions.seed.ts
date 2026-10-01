import { withClient, closePool } from '../../src/config/db';

export interface QuestionSeedResult {
  questionsCount: number;
  optionsCount: number;
}

export async function seedQuestions(): Promise<QuestionSeedResult> {
  return await withClient(async (client) => {
    console.log('[db:seed:questions] Starting idempotent question seeding...');

    // 1. Fetch concept mapping
    const conceptRes = await client.query('SELECT id, slug FROM concepts');
    if (conceptRes.rows.length === 0) {
      throw new Error('No concepts found in database. Run curriculum seed first.');
    }
    const conceptMap: Record<string, string> = {};
    for (const row of conceptRes.rows) {
      conceptMap[row.slug] = row.id;
    }

    // 2. Fetch misconception mapping
    const miscRes = await client.query('SELECT id, code FROM misconceptions');
    const miscMap: Record<string, string> = {};
    for (const row of miscRes.rows) {
      miscMap[row.code] = row.id;
    }

    // 3. Question definitions
    const seedQuestionsData = [
      // -------------------------------------------------------------
      // CONCEPT 1: Overfitting
      // -------------------------------------------------------------
      {
        conceptSlug: 'overfitting',
        slug: 'overfitting-practice-1',
        stage: 'PRACTICE',
        difficulty: 'BEGINNER',
        displayOrder: 1,
        questionText:
          'A deep neural network achieves 99.8% training accuracy on a medical image dataset, but only 54.2% accuracy on the test set. What problem is this model experiencing?',
        explanation:
          'High training performance combined with poor test/validation performance is the classic hallmark of overfitting — the model memorized sample noise rather than generalizable features.',
        options: [
          {
            text: 'Overfitting — the model has memorized training samples and random noise rather than generalizable underlying patterns.',
            isCorrect: true,
            misconceptionCode: null,
            displayOrder: 1,
          },
          {
            text: 'Underfitting — the model lacks capacity and requires substantially more training epochs to reach generalization.',
            isCorrect: false,
            misconceptionCode: 'OVERFIT_M1',
            displayOrder: 2,
          },
          {
            text: 'Optimal convergence — training accuracy is naturally expected to be significantly higher than validation accuracy in valid models.',
            isCorrect: false,
            misconceptionCode: 'OVERFIT_M1',
            displayOrder: 3,
          },
          {
            text: 'Epoch deficiency — the model should continue gradient descent indefinitely without applying early stopping.',
            isCorrect: false,
            misconceptionCode: 'OVERFIT_M2',
            displayOrder: 4,
          },
        ],
      },
      {
        conceptSlug: 'overfitting',
        slug: 'overfitting-practice-2',
        stage: 'PRACTICE',
        difficulty: 'BEGINNER',
        displayOrder: 2,
        questionText:
          'Which of the following training behaviors is the clearest warning sign that a machine learning model is beginning to overfit?',
        explanation:
          'When training loss continues decreasing while validation loss begins climbing, the model is transitioning from learning general patterns to fitting noise.',
        options: [
          {
            text: 'Training loss continues to decrease while validation loss begins to increase.',
            isCorrect: true,
            misconceptionCode: null,
            displayOrder: 1,
          },
          {
            text: 'Both training loss and validation loss decrease at the same rate.',
            isCorrect: false,
            misconceptionCode: 'OVERFIT_M1',
            displayOrder: 2,
          },
          {
            text: 'Training loss plateaus while validation accuracy reaches 100%.',
            isCorrect: false,
            misconceptionCode: 'OVERFIT_M1',
            displayOrder: 3,
          },
          {
            text: 'The model requires fewer parameters to fit complex training relationships.',
            isCorrect: false,
            misconceptionCode: 'OVERFIT_M2',
            displayOrder: 4,
          },
        ],
      },
      {
        conceptSlug: 'overfitting',
        slug: 'overfitting-retry-1',
        stage: 'RETRY',
        difficulty: 'BEGINNER',
        displayOrder: 1,
        questionText:
          'During training of a decision tree regressor, you observe that increasing tree depth from 5 to 25 reduces training MSE to zero, but validation MSE rises sharply after depth 7. What is the most effective corrective action?',
        explanation:
          'Restricting tree depth or pruning limits model complexity, preventing the tree from creating leaf nodes for noise and reducing overfitting.',
        options: [
          {
            text: 'Apply tree pruning or set maximum depth limits to constrain model capacity and prevent fitting noise.',
            isCorrect: true,
            misconceptionCode: null,
            displayOrder: 1,
          },
          {
            text: 'Continue expanding tree depth until validation MSE matches training MSE perfectly.',
            isCorrect: false,
            misconceptionCode: 'OVERFIT_M2',
            displayOrder: 2,
          },
          {
            text: 'Disregard validation MSE since achieving zero training error is the primary indicator of model quality.',
            isCorrect: false,
            misconceptionCode: 'OVERFIT_M1',
            displayOrder: 3,
          },
          {
            text: 'Remove all regularization penalties so the decision tree can split every single training observation.',
            isCorrect: false,
            misconceptionCode: 'OVERFIT_M1',
            displayOrder: 4,
          },
        ],
      },
      {
        conceptSlug: 'overfitting',
        slug: 'overfitting-transfer-1',
        stage: 'TRANSFER',
        difficulty: 'BEGINNER',
        displayOrder: 1,
        questionText:
          'A quantitative fund develops an automated trading strategy trained on 5 years of historical stock prices. The strategy delivers a 99% win rate during backtesting on past data, but incurs catastrophic losses immediately upon live deployment. Which machine learning pitfall best explains this outcome?',
        explanation:
          'The model overfit to historical market noise and specific past anomalies that do not generalize to dynamic, unseen live market conditions.',
        options: [
          {
            text: 'Overfitting — the model memorized historical noise and past anomalies that do not generalize to live, unseen market conditions.',
            isCorrect: true,
            misconceptionCode: null,
            displayOrder: 1,
          },
          {
            text: 'Underfitting — the trading model lacked sufficient parameters to memorize every historical tick sequence.',
            isCorrect: false,
            misconceptionCode: 'OVERFIT_M1',
            displayOrder: 2,
          },
          {
            text: 'Excessive regularization — the model was over-constrained and prevented from fitting the training patterns.',
            isCorrect: false,
            misconceptionCode: 'OVERFIT_M1',
            displayOrder: 3,
          },
          {
            text: 'Insufficient training epochs — running more optimization passes on the exact same historical data would guarantee live success.',
            isCorrect: false,
            misconceptionCode: 'OVERFIT_M2',
            displayOrder: 4,
          },
        ],
      },

      // -------------------------------------------------------------
      // CONCEPT 2: Bias vs Variance
      // -------------------------------------------------------------
      {
        conceptSlug: 'bias-vs-variance',
        slug: 'bias-vs-variance-practice-1',
        stage: 'PRACTICE',
        difficulty: 'BEGINNER',
        displayOrder: 1,
        questionText:
          'A simple linear regression model is applied to predict complex, non-linear cyclical energy demand. Both training error and test error are equally very high. What type of problem does this model exhibit?',
        explanation:
          'High training error and high test error signify high bias (underfitting), where the model makes overly rigid assumptions and lacks expressive capacity.',
        options: [
          {
            text: 'High Bias (Underfitting) — the linear model makes overly rigid assumptions and lacks the capacity to capture non-linear patterns.',
            isCorrect: true,
            misconceptionCode: null,
            displayOrder: 1,
          },
          {
            text: 'High Variance — the model is overly sensitive to small fluctuations in the training dataset.',
            isCorrect: false,
            misconceptionCode: 'BIASVAR_M1',
            displayOrder: 2,
          },
          {
            text: 'Zero Irreducible Error — the model has attained the theoretical global optimum of the bias-variance tradeoff.',
            isCorrect: false,
            misconceptionCode: 'BIASVAR_M2',
            displayOrder: 3,
          },
          {
            text: 'Overfitting — the linear equation has memorized every individual training point.',
            isCorrect: false,
            misconceptionCode: 'BIASVAR_M1',
            displayOrder: 4,
          },
        ],
      },
      {
        conceptSlug: 'bias-vs-variance',
        slug: 'bias-vs-variance-practice-2',
        stage: 'PRACTICE',
        difficulty: 'BEGINNER',
        displayOrder: 2,
        questionText:
          'How does increasing model complexity (such as adding polynomial degrees or neural network layers) generally affect bias and variance?',
        explanation:
          'Increasing model complexity decreases bias (more flexible) while increasing variance (more sensitive to training data fluctuations).',
        options: [
          {
            text: 'Bias decreases while variance increases.',
            isCorrect: true,
            misconceptionCode: null,
            displayOrder: 1,
          },
          {
            text: 'Both bias and variance decrease simultaneously to zero.',
            isCorrect: false,
            misconceptionCode: 'BIASVAR_M2',
            displayOrder: 2,
          },
          {
            text: 'Bias increases while variance decreases.',
            isCorrect: false,
            misconceptionCode: 'BIASVAR_M1',
            displayOrder: 3,
          },
          {
            text: 'Neither bias nor variance is affected by model complexity.',
            isCorrect: false,
            misconceptionCode: 'BIASVAR_M1',
            displayOrder: 4,
          },
        ],
      },
      {
        conceptSlug: 'bias-vs-variance',
        slug: 'bias-vs-variance-retry-1',
        stage: 'RETRY',
        difficulty: 'BEGINNER',
        displayOrder: 1,
        questionText:
          'An ML engineer notices that a 20-degree polynomial model fits all training points exactly, but oscillates wildly between points, failing on validation data. How should the bias-variance balance be re-adjusted?',
        explanation:
          'Reducing complexity or adding regularization curbs excessive variance, yielding far better generalization at the cost of slightly higher bias.',
        options: [
          {
            text: 'Decrease polynomial degree or add regularization to reduce variance, accepting a slight increase in bias for better generalization.',
            isCorrect: true,
            misconceptionCode: null,
            displayOrder: 1,
          },
          {
            text: 'Increase polynomial degree to 50 so that bias and variance can both reach zero.',
            isCorrect: false,
            misconceptionCode: 'BIASVAR_M2',
            displayOrder: 2,
          },
          {
            text: 'Diagnose this as high-bias underfitting and make the model even more flexible.',
            isCorrect: false,
            misconceptionCode: 'BIASVAR_M1',
            displayOrder: 3,
          },
          {
            text: 'Remove all regularization penalties so the curve can fluctuate more freely.',
            isCorrect: false,
            misconceptionCode: 'BIASVAR_M2',
            displayOrder: 4,
          },
        ],
      },
      {
        conceptSlug: 'bias-vs-variance',
        slug: 'bias-vs-variance-transfer-1',
        stage: 'TRANSFER',
        difficulty: 'BEGINNER',
        displayOrder: 1,
        questionText:
          'An autonomous drone navigation system flies flawlessly in a calm indoor lab (99.9% precision), but outdoors with slight wind and sensor noise, its steering commands oscillate violently and crash. What is the fundamental machine learning diagnosis?',
        explanation:
          'High variance causes extreme sensitivity to input perturbations and noise that were not present in the clean training environment.',
        options: [
          {
            text: 'High Variance — the navigation controller is hypersensitive to minor sensor noise and input perturbations.',
            isCorrect: true,
            misconceptionCode: null,
            displayOrder: 1,
          },
          {
            text: 'High Bias — the controller is too simplistic to generate steering curve commands.',
            isCorrect: false,
            misconceptionCode: 'BIASVAR_M1',
            displayOrder: 2,
          },
          {
            text: 'Zero Bias and Zero Variance — external wind completely invalidates statistical modeling.',
            isCorrect: false,
            misconceptionCode: 'BIASVAR_M2',
            displayOrder: 3,
          },
          {
            text: 'Underfitting — the drone system needs simpler constant linear commands.',
            isCorrect: false,
            misconceptionCode: 'BIASVAR_M1',
            displayOrder: 4,
          },
        ],
      },

      // -------------------------------------------------------------
      // CONCEPT 3: Train / Validation / Test
      // -------------------------------------------------------------
      {
        conceptSlug: 'train-validation-test',
        slug: 'tvt-practice-1',
        stage: 'PRACTICE',
        difficulty: 'BEGINNER',
        displayOrder: 1,
        questionText:
          'Why is a dataset split into three separate partitions (training, validation, and test) rather than just training and test sets?',
        explanation:
          'The validation set is used for tuning hyperparameters and model selection, preserving the test set untouched for an unbiased evaluation of generalization.',
        options: [
          {
            text: 'The validation set is used to tune hyperparameters and select models, preserving the test set untouched for an unbiased final evaluation.',
            isCorrect: true,
            misconceptionCode: null,
            displayOrder: 1,
          },
          {
            text: 'Validation and test sets are interchangeable and can be swapped whenever more evaluation samples are desired.',
            isCorrect: false,
            misconceptionCode: 'TVT_M1',
            displayOrder: 2,
          },
          {
            text: 'The test set is used to update model weights via backpropagation, while the validation set calculates gradients.',
            isCorrect: false,
            misconceptionCode: 'TVT_M1',
            displayOrder: 3,
          },
          {
            text: 'To compute global mean and variance statistics across all partitions before performing the split.',
            isCorrect: false,
            misconceptionCode: 'TVT_M2',
            displayOrder: 4,
          },
        ],
      },
      {
        conceptSlug: 'train-validation-test',
        slug: 'tvt-practice-2',
        stage: 'PRACTICE',
        difficulty: 'BEGINNER',
        displayOrder: 2,
        questionText:
          'When should the test set be evaluated during a machine learning project workflow?',
        explanation:
          'The test set must only be evaluated once at the very end after all modeling, feature engineering, and hyperparameter tuning decisions are finalized.',
        options: [
          {
            text: 'Only once at the very end after all modeling and hyperparameter tuning decisions are completely finalized.',
            isCorrect: true,
            misconceptionCode: null,
            displayOrder: 1,
          },
          {
            text: 'After every training epoch to decide when to stop gradient descent.',
            isCorrect: false,
            misconceptionCode: 'TVT_M1',
            displayOrder: 2,
          },
          {
            text: 'Before splitting the data to ensure all classes are evenly distributed.',
            isCorrect: false,
            misconceptionCode: 'TVT_M2',
            displayOrder: 3,
          },
          {
            text: 'Repeatedly throughout feature selection to pick the best feature subset.',
            isCorrect: false,
            misconceptionCode: 'TVT_M1',
            displayOrder: 4,
          },
        ],
      },
      {
        conceptSlug: 'train-validation-test',
        slug: 'tvt-retry-1',
        stage: 'RETRY',
        difficulty: 'BEGINNER',
        displayOrder: 1,
        questionText:
          'A data scientist tests 100 different hyperparameter combinations directly on the test set and chooses the model with the highest test score. What methodological error was committed?',
        explanation:
          'Evaluating multiple hyperparameter combinations on the test set causes information leakage (data snooping), yielding an overly optimistic and biased estimate.',
        options: [
          {
            text: 'Information leakage (data snooping) — tuning decisions against the test set compromises its ability to provide an unbiased generalization estimate.',
            isCorrect: true,
            misconceptionCode: null,
            displayOrder: 1,
          },
          {
            text: 'Underfitting — the data scientist should have evaluated 1,000 combinations on the test set instead.',
            isCorrect: false,
            misconceptionCode: 'TVT_M1',
            displayOrder: 2,
          },
          {
            text: 'Correct standard practice — hyperparameter tuning is the primary intended purpose of the test split.',
            isCorrect: false,
            misconceptionCode: 'TVT_M1',
            displayOrder: 3,
          },
          {
            text: 'High bias error — evaluating on the test set inherently stiffens model decision boundaries.',
            isCorrect: false,
            misconceptionCode: 'TVT_M2',
            displayOrder: 4,
          },
        ],
      },
      {
        conceptSlug: 'train-validation-test',
        slug: 'tvt-transfer-1',
        stage: 'TRANSFER',
        difficulty: 'BEGINNER',
        displayOrder: 1,
        questionText:
          'A clinical analytics team standardizes patient biomarker data (computing mean and standard deviation across all 10,000 patient records) before splitting the data into 80% train and 20% test. Why does test set accuracy overestimate real-world performance?',
        explanation:
          'Computing normalization statistics on the full dataset before splitting leaks information about the test distribution into the training pipeline.',
        options: [
          {
            text: 'Data leakage — scaling the full dataset before splitting leaked distributional properties of test cases into the training pipeline.',
            isCorrect: true,
            misconceptionCode: null,
            displayOrder: 1,
          },
          {
            text: 'Underfitting — biomarker values should never be scaled or normalized under any circumstances.',
            isCorrect: false,
            misconceptionCode: 'TVT_M2',
            displayOrder: 2,
          },
          {
            text: 'Split ratio error — medical data requires evaluating model hyperparameters directly on the test set.',
            isCorrect: false,
            misconceptionCode: 'TVT_M1',
            displayOrder: 3,
          },
          {
            text: 'Variance collapse — standardizing data eliminates all model variance entirely.',
            isCorrect: false,
            misconceptionCode: 'TVT_M2',
            displayOrder: 4,
          },
        ],
      },
    ];

    let questionsCount = 0;
    let optionsCount = 0;

    for (const q of seedQuestionsData) {
      const conceptId = conceptMap[q.conceptSlug];
      if (!conceptId) {
        console.warn(`[db:seed:questions] Skipping question ${q.slug}: concept ${q.conceptSlug} not found`);
        continue;
      }

      // Upsert question by slug
      const qRes = await client.query(
        `
        INSERT INTO questions (
          concept_id, slug, stage, question_text, difficulty,
          active, display_order, explanation, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
        ON CONFLICT (slug) DO UPDATE SET
          concept_id = EXCLUDED.concept_id,
          stage = EXCLUDED.stage,
          question_text = EXCLUDED.question_text,
          difficulty = EXCLUDED.difficulty,
          active = EXCLUDED.active,
          display_order = EXCLUDED.display_order,
          explanation = EXCLUDED.explanation,
          updated_at = NOW()
        RETURNING id;
        `,
        [
          conceptId,
          q.slug,
          q.stage,
          q.questionText,
          q.difficulty,
          true,
          q.displayOrder,
          q.explanation,
        ]
      );
      const questionId = qRes.rows[0].id;
      questionsCount++;

      // Delete existing options to allow clean idempotent re-insertion
      await client.query('DELETE FROM question_options WHERE question_id = $1', [questionId]);

      // Insert options
      for (const opt of q.options) {
        const miscId = opt.misconceptionCode ? miscMap[opt.misconceptionCode] || null : null;
        await client.query(
          `
          INSERT INTO question_options (
            question_id, option_text, misconception_id, is_correct, display_order, position, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $5, NOW())
          `,
          [questionId, opt.text, miscId, opt.isCorrect, opt.displayOrder]
        );
        optionsCount++;
      }
    }

    console.log(`  ✓ Seeded ${questionsCount} questions and ${optionsCount} options across all MVP concepts`);
    console.log('[db:seed:questions] Question seeding completed successfully.');
    return { questionsCount, optionsCount };
  });
}

if (require.main === module) {
  seedQuestions()
    .then(async () => {
      await closePool();
      process.exit(0);
    })
    .catch(async (err) => {
      console.error('[db:seed:questions] Seed error:', err);
      await closePool();
      process.exit(1);
    });
}
