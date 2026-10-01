import { pool, withClient, closePool } from '../../src/config/db';

export interface SeedResult {
  conceptsCount: number;
  prerequisitesCount: number;
  misconceptionsCount: number;
  contentCount: number;
}

export async function seedCurriculum(): Promise<SeedResult> {
  return await withClient(async (client) => {
    console.log('[db:seed] Starting idempotent curriculum seeding...');

    // 1. MVP Concepts
    const conceptsData = [
      {
        slug: 'overfitting',
        title: 'Overfitting',
        shortDescription: 'Recognize when a model learns noise in training data instead of real underlying patterns.',
        description:
          'Overfitting occurs when a machine learning model memorizes training data so closely that it captures statistical noise and quirks rather than generalizable patterns. As a result, training error drops toward zero while error on new, unseen data rises dramatically.',
        difficultyLevel: 'BEGINNER',
        estimatedMinutes: 15,
        learningObjective:
          'Recognize overfitting and explain why strong training performance does not guarantee good performance on unseen data.',
        status: 'ACTIVE',
        displayOrder: 1,
      },
      {
        slug: 'bias-vs-variance',
        title: 'Bias vs Variance',
        shortDescription: 'Balance model simplicity and flexibility to minimize overall prediction error.',
        description:
          'The bias-variance tradeoff is a fundamental machine learning dilemma. High bias models underfit by making overly rigid assumptions, while high variance models overfit by being excessively sensitive to random fluctuations in the training set.',
        difficultyLevel: 'BEGINNER',
        estimatedMinutes: 20,
        learningObjective:
          'Explain bias, variance, underfitting, overfitting, and the relationship between model complexity and generalization.',
        status: 'ACTIVE',
        displayOrder: 2,
      },
      {
        slug: 'train-validation-test',
        title: 'Train / Validation / Test',
        shortDescription: 'Partition datasets to train models, tune hyperparameters, and evaluate generalization without data leakage.',
        description:
          'Machine learning workflows split data into three separate partitions: training data to fit parameters, validation data to tune hyperparameters and guide model selection, and test data held out exclusively for final unbiased evaluation.',
        difficultyLevel: 'BEGINNER',
        estimatedMinutes: 15,
        learningObjective:
          'Explain the roles of training, validation, and test datasets during model development and evaluation.',
        status: 'ACTIVE',
        displayOrder: 3,
      },
    ];

    const conceptMap: Record<string, string> = {};

    for (const c of conceptsData) {
      const res = await client.query(
        `
        INSERT INTO concepts (
          slug, title, short_description, description,
          difficulty_level, estimated_minutes, learning_objective,
          status, display_order, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
        ON CONFLICT (slug) DO UPDATE SET
          title = EXCLUDED.title,
          short_description = EXCLUDED.short_description,
          description = EXCLUDED.description,
          difficulty_level = EXCLUDED.difficulty_level,
          estimated_minutes = EXCLUDED.estimated_minutes,
          learning_objective = EXCLUDED.learning_objective,
          status = EXCLUDED.status,
          display_order = EXCLUDED.display_order,
          updated_at = NOW()
        RETURNING id, slug;
        `,
        [
          c.slug,
          c.title,
          c.shortDescription,
          c.description,
          c.difficultyLevel,
          c.estimatedMinutes,
          c.learningObjective,
          c.status,
          c.displayOrder,
        ]
      );
      conceptMap[res.rows[0].slug] = res.rows[0].id;
    }
    console.log(`  ✓ Seeded ${Object.keys(conceptMap).length} concepts`);

    // 2. Concept Prerequisites
    // train-validation-test -> prerequisite for overfitting
    // overfitting -> prerequisite for bias-vs-variance
    const prerequisitesData = [
      {
        conceptSlug: 'overfitting',
        prerequisiteSlug: 'train-validation-test',
      },
      {
        conceptSlug: 'bias-vs-variance',
        prerequisiteSlug: 'overfitting',
      },
    ];

    let prereqCount = 0;
    for (const p of prerequisitesData) {
      const conceptId = conceptMap[p.conceptSlug];
      const prereqId = conceptMap[p.prerequisiteSlug];
      if (conceptId && prereqId && conceptId !== prereqId) {
        await client.query(
          `
          INSERT INTO concept_prerequisites (concept_id, prerequisite_concept_id)
          VALUES ($1, $2)
          ON CONFLICT (concept_id, prerequisite_concept_id) DO NOTHING;
          `,
          [conceptId, prereqId]
        );
        prereqCount++;
      }
    }
    console.log(`  ✓ Seeded ${prereqCount} prerequisite relationships`);

    // 3. Misconceptions with stable educator-defined codes
    const misconceptionsData = [
      // Overfitting misconceptions
      {
        conceptSlug: 'overfitting',
        code: 'OVERFIT_M1',
        title: 'Training accuracy means generalization',
        description: 'The student assumes near-perfect training accuracy guarantees strong unseen-data performance in production.',
        guidance: 'Contrast training performance with validation/test performance. High training accuracy with poor validation accuracy is the definitive hallmark of overfitting.',
        active: true,
      },
      {
        conceptSlug: 'overfitting',
        code: 'OVERFIT_M2',
        title: 'More training iterations always improve model quality',
        description: 'The student believes continuing gradient descent indefinitely will keep producing better real-world predictions.',
        guidance: 'Explain early stopping and demonstrate that training past the validation loss minimum causes the model to fit random noise.',
        active: true,
      },
      // Bias vs Variance misconceptions
      {
        conceptSlug: 'bias-vs-variance',
        code: 'BIASVAR_M1',
        title: 'High variance means the model is too simple',
        description: 'The student confuses variance with bias, incorrectly diagnosing a fluctuating, unstable model as lacking capacity.',
        guidance: 'Clarify that high variance stems from excessive model complexity and overfitting to specific training samples. High bias is what corresponds to underfitting and overly simple models.',
        active: true,
      },
      {
        conceptSlug: 'bias-vs-variance',
        code: 'BIASVAR_M2',
        title: 'Zero bias and zero variance can be achieved simultaneously',
        description: 'The student assumes an optimal algorithm can eliminate both bias and variance completely on real-world datasets.',
        guidance: 'Explain irreducible error and the fundamental tradeoff: decreasing bias through model complexity inherently increases variance unless regularized or supplemented with significantly more data.',
        active: true,
      },
      // Train / Validation / Test misconceptions
      {
        conceptSlug: 'train-validation-test',
        code: 'TVT_M1',
        title: 'Validation and test sets can be used interchangeably',
        description: 'The student tunes hyperparameters on the test set or evaluates final generalization on the validation set.',
        guidance: 'Emphasize that the test set must remain locked away until final reporting. Using the test set for hyperparameter tuning leaks information and yields optimistically biased results.',
        active: true,
      },
      {
        conceptSlug: 'train-validation-test',
        code: 'TVT_M2',
        title: 'Data preprocessing can be performed across the whole dataset before splitting',
        description: 'The student fits scalers or imputers on the combined dataset prior to executing the train/test split.',
        guidance: 'Explain data leakage: computing statistics (e.g. mean, standard deviation) across test data leaks future distribution information into training, producing invalid evaluation metrics.',
        active: true,
      },
    ];

    let misconceptionCount = 0;
    for (const m of misconceptionsData) {
      const conceptId = conceptMap[m.conceptSlug];
      if (conceptId) {
        await client.query(
          `
          INSERT INTO misconceptions (
            concept_id, code, title, description, guidance, active, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, NOW())
          ON CONFLICT (code) DO UPDATE SET
            concept_id = EXCLUDED.concept_id,
            title = EXCLUDED.title,
            description = EXCLUDED.description,
            guidance = EXCLUDED.guidance,
            active = EXCLUDED.active,
            updated_at = NOW();
          `,
          [conceptId, m.code, m.title, m.description, m.guidance, m.active]
        );
        misconceptionCount++;
      }
    }
    console.log(`  ✓ Seeded ${misconceptionCount} misconceptions`);

    // 4. Curated Content
    // Types: OVERVIEW, KEY_IDEA, ANALOGY, EXAMPLE, COMMON_MISTAKE, SUMMARY
    const contentData = [
      // Overfitting Content
      {
        conceptSlug: 'overfitting',
        contentType: 'OVERVIEW',
        title: 'What is Overfitting?',
        body: 'Overfitting is one of the most critical challenges in applied machine learning. It occurs when a model learns not only the underlying patterns of the training data but also the random noise, outliers, and quirks unique to that sample. While the model achieves near-flawless scores during training, it fails miserably when exposed to new, unseen data in production.',
        displayOrder: 1,
      },
      {
        conceptSlug: 'overfitting',
        contentType: 'KEY_IDEA',
        title: 'Memorization vs. Generalization',
        body: 'The primary goal of machine learning is generalization — performing accurately on new inputs that the algorithm has never seen before. Overfitting represents the breakdown of generalization in favor of rote memorization. A model with excessive capacity fits every training point perfectly, including random anomalies that will never repeat in the real world.',
        displayOrder: 2,
      },
      {
        conceptSlug: 'overfitting',
        contentType: 'ANALOGY',
        title: 'The Practice Exam Memorizer',
        body: 'Imagine a student preparing for a calculus exam by memorizing the exact answers and typos in last year\'s practice quiz without learning the underlying formulas. On the practice test, the student scores 100%. But on the actual final exam, with slightly modified numbers, they fail completely. That is overfitting: perfect memorization with zero conceptual understanding.',
        displayOrder: 3,
      },
      {
        conceptSlug: 'overfitting',
        contentType: 'EXAMPLE',
        title: 'Polynomial Curve Fitting',
        body: 'Consider predicting house prices with 10 data points. A simple linear model (degree 1) captures the upward trend. A 9th-degree polynomial passes exactly through all 10 points (0 training error), but oscillates wildly between points, predicting negative prices or absurd multi-million valuations for nearby square footages. The high-degree curve has overfit.',
        displayOrder: 4,
      },
      {
        conceptSlug: 'overfitting',
        contentType: 'COMMON_MISTAKE',
        title: 'Evaluating Exclusively on Training Data',
        body: 'Beginner practitioners frequently celebrate achieving 99% accuracy on their training dataset without running validation checks. Never evaluate a model on the data it was trained on. A model that achieves 99% training accuracy but only 62% validation accuracy is heavily overfitted and unusable.',
        displayOrder: 5,
      },
      {
        conceptSlug: 'overfitting',
        contentType: 'SUMMARY',
        title: 'Core Takeaways & Prevention',
        body: 'To prevent overfitting: (1) Use validation datasets to monitor generalization during training; (2) Collect more representative data; (3) Apply regularization techniques like L1/L2 penalties or dropout; (4) Use early stopping; and (5) Simplify model architecture to reduce excess capacity.',
        displayOrder: 6,
      },

      // Bias vs Variance Content
      {
        conceptSlug: 'bias-vs-variance',
        contentType: 'OVERVIEW',
        title: 'The Central ML Dilemma',
        body: 'Whenever a machine learning model makes predictions, its expected prediction error can be mathematically decomposed into three components: Bias squared, Variance, and Irreducible Error. Understanding the trade-off between bias and variance is the key to tuning model complexity and achieving optimal generalization.',
        displayOrder: 1,
      },
      {
        conceptSlug: 'bias-vs-variance',
        contentType: 'KEY_IDEA',
        title: 'Underfitting (Bias) vs. Overfitting (Variance)',
        body: 'Bias represents the error from overly rigid or simplistic assumptions in the learning algorithm (underfitting). High bias causes a model to miss the true relationship altogether. Variance represents sensitivity to small fluctuations and noise in the training set (overfitting). High variance causes a model to change drastically when trained on a different subset of data.',
        displayOrder: 2,
      },
      {
        conceptSlug: 'bias-vs-variance',
        contentType: 'ANALOGY',
        title: 'The Archery Target',
        body: 'Picture an archer aiming at a target: (1) High Bias, Low Variance: arrows cluster tightly together, but far from the bullseye (consistently wrong); (2) Low Bias, High Variance: arrows scatter all over the target, centered roughly around the bullseye but with huge spread; (3) High Bias, High Variance: arrows scatter widely and off-center; (4) Low Bias, Low Variance: all arrows hit the bullseye reliably.',
        displayOrder: 3,
      },
      {
        conceptSlug: 'bias-vs-variance',
        contentType: 'EXAMPLE',
        title: 'Model Complexity Spectrum',
        body: 'A linear regression model fitted to non-linear planetary orbits has high bias (it cannot bend to capture curves). A deep decision tree with no depth limit has high variance (it creates isolated leaf nodes for single data points). The optimal model lies in between — a regularized polynomial or depth-constrained tree that minimizes total error.',
        displayOrder: 4,
      },
      {
        conceptSlug: 'bias-vs-variance',
        contentType: 'COMMON_MISTAKE',
        title: 'Treating All Errors Identically',
        body: 'When a model performs poorly, learners often randomly tweak parameters without diagnosing whether the issue is high bias or high variance. If training error is high, the model has high bias (add features, increase capacity). If training error is low but validation error is high, the model has high variance (add data, regularize, reduce features).',
        displayOrder: 5,
      },
      {
        conceptSlug: 'bias-vs-variance',
        contentType: 'SUMMARY',
        title: 'Balancing the Tradeoff',
        body: 'Total Error = Bias² + Variance + Irreducible Error. As model complexity increases, bias monotonically decreases while variance increases. The goal of machine learning engineering is to identify the "sweet spot" of model complexity where total prediction error on unseen data is minimized.',
        displayOrder: 6,
      },

      // Train / Validation / Test Content
      {
        conceptSlug: 'train-validation-test',
        contentType: 'OVERVIEW',
        title: 'Why Three Partitions?',
        body: 'In supervised learning, evaluating a model on the data used to train it produces a biased and misleading estimate of performance. To develop reliable models, data is systematically divided into three disjoint partitions: Training set, Validation set, and Test set, each serving an exclusive, non-overlapping role.',
        displayOrder: 1,
      },
      {
        conceptSlug: 'train-validation-test',
        contentType: 'KEY_IDEA',
        title: 'Distinct Roles of Each Dataset',
        body: 'Training Set (typically 60-80%): Used directly by the learning algorithm to learn model weights and parameters. Validation Set (typically 10-20%): Used by the engineer to compare different algorithms, tune hyperparameters (e.g. learning rate, tree depth), and detect overfitting. Test Set (typically 10-20%): Held out in a vault to provide a final, unbiased estimate of generalization on future data.',
        displayOrder: 2,
      },
      {
        conceptSlug: 'train-validation-test',
        contentType: 'ANALOGY',
        title: 'Classroom Study, Quiz, and Final Exam',
        body: 'Think of the three partitions like a university course: (1) Training set = Textbook homework problems you practice with solutions in hand; (2) Validation set = Weekly quizzes where the professor sees what needs review and adjusts the syllabus; (3) Test set = The comprehensive final exam taken once at semester end, whose questions you have never seen before.',
        displayOrder: 3,
      },
      {
        conceptSlug: 'train-validation-test',
        contentType: 'EXAMPLE',
        title: 'Hyperparameter Tuning Workflow',
        body: 'Suppose you train three neural networks with learning rates 0.1, 0.01, and 0.001 on the training set. You evaluate all three on the validation set, discovering that 0.01 yields the highest accuracy. You select that model. Finally, you evaluate the chosen model once on the test set to report expected real-world accuracy.',
        displayOrder: 4,
      },
      {
        conceptSlug: 'train-validation-test',
        contentType: 'COMMON_MISTAKE',
        title: 'Data Leakage via Test-Set Snooping',
        body: 'A fatal but common mistake is computing preprocessing parameters (like mean and variance for standard scaling, or imputer medians) on the entire dataset before splitting. Doing so leaks future test-set statistics into training. Always fit transformers ONLY on training data, and transform validation and test sets using those fitted parameters.',
        displayOrder: 5,
      },
      {
        conceptSlug: 'train-validation-test',
        contentType: 'SUMMARY',
        title: 'Golden Rules for Data Splitting',
        body: 'Key principles: (1) Never train on validation or test data; (2) Never tune hyperparameters using the test set; (3) Fit all feature transformers solely on the training partition; (4) Ensure representative class distributions across splits using stratified sampling.',
        displayOrder: 6,
      },
    ];

    let contentCount = 0;
    for (const c of contentData) {
      const conceptId = conceptMap[c.conceptSlug];
      if (conceptId) {
        await client.query(
          `
          INSERT INTO concept_content (
            concept_id, content_type, title, body, display_order, active, updated_at
          ) VALUES ($1, $2, $3, $4, $5, true, NOW())
          ON CONFLICT (concept_id, content_type, display_order) DO UPDATE SET
            title = EXCLUDED.title,
            body = EXCLUDED.body,
            active = EXCLUDED.active,
            updated_at = NOW();
          `,
          [conceptId, c.contentType, c.title, c.body, c.displayOrder]
        );
        contentCount++;
      }
    }
    console.log(`  ✓ Seeded ${contentCount} curated content sections`);

    console.log('[db:seed] Curriculum seeding completed successfully.');
    return {
      conceptsCount: Object.keys(conceptMap).length,
      prerequisitesCount: prereqCount,
      misconceptionsCount: misconceptionCount,
      contentCount,
    };
  });
}

if (require.main === module) {
  seedCurriculum()
    .then(async () => {
      await closePool();
      process.exit(0);
    })
    .catch(async (err) => {
      console.error('[db:seed] Seeding error:', err);
      await closePool();
      process.exit(1);
    });
}
