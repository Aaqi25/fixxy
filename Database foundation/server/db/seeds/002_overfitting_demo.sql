-- ============================================================
-- Seed 002: Complete Overfitting learning scenario
--
-- Content included:
--   1. Misconception OVERFIT_M1
--   2. Teaching plans: analogy, example, and concept-level fallback
--   3. Practice question OVERFIT_Q1 (wrong option → OVERFIT_M1)
--   4. Retry question  OVERFIT_Q2
--   5. Transfer question OVERFIT_Q3
--
-- All INSERTs use ON CONFLICT … DO UPDATE so re-running is idempotent.
-- UUIDs are generated server-side by gen_random_uuid() on first insert
-- and left unchanged on subsequent runs (update preserves the original id).
-- ============================================================

-- ── 1. Resolve the overfitting concept id ────────────────────────────────────
-- We use a CTE so all subsequent inserts can reference it by slug without
-- hard-coding a UUID that differs between environments.

DO $$
DECLARE
    v_concept_id     UUID;
    v_misconception_id UUID;
    v_plan_analogy_id  UUID;
    v_plan_example_id  UUID;
    v_plan_fallback_id UUID;
    v_q1_id          UUID;
    v_q2_id          UUID;
    v_q3_id          UUID;
BEGIN
    -- ── Resolve concept ────────────────────────────────────────────────────
    SELECT id INTO v_concept_id FROM concepts WHERE slug = 'overfitting';
    IF v_concept_id IS NULL THEN
        RAISE EXCEPTION 'Concept "overfitting" not found. Run seed 001 first.';
    END IF;

    -- ── Misconception OVERFIT_M1 ───────────────────────────────────────────
    INSERT INTO misconceptions (id, concept_id, code, title, description, correct_concept)
    VALUES (
        gen_random_uuid(),
        v_concept_id,
        'OVERFIT_M1',
        'High training accuracy guarantees generalization',
        'The student believes that achieving high accuracy on the training set '
        'means the model will perform equally well on new, unseen data. In reality, '
        'a model can achieve near-perfect training accuracy by memorizing noise and '
        'idiosyncrasies of the training set — a hallmark of overfitting.',
        'A model that truly generalizes must perform well on held-out test data, '
        'not just on data it was trained on. Large gaps between training and test '
        'accuracy indicate the model has overfit.'
    )
    ON CONFLICT (code) DO UPDATE
        SET title           = EXCLUDED.title,
            description     = EXCLUDED.description,
            correct_concept = EXCLUDED.correct_concept,
            updated_at      = NOW()
    RETURNING id INTO v_misconception_id;

    -- If the row already existed, ON CONFLICT … DO UPDATE does not return;
    -- fetch the id explicitly in that case.
    IF v_misconception_id IS NULL THEN
        SELECT id INTO v_misconception_id FROM misconceptions WHERE code = 'OVERFIT_M1';
    END IF;

    -- ── Teaching Plan — Analogy ────────────────────────────────────────────
    -- Identified by (concept_id, strategy, misconception_id) pattern via unique
    -- approach: we use a helper temp table keyed on (misconception_id, strategy).
    -- Because there's no natural unique key on teaching_plans we insert and
    -- check for an existing row manually.

    SELECT id INTO v_plan_analogy_id
    FROM teaching_plans
    WHERE misconception_id = v_misconception_id AND strategy = 'analogy';

    IF v_plan_analogy_id IS NULL THEN
        INSERT INTO teaching_plans
            (id, misconception_id, concept_id, strategy, explanation, hint, example_text)
        VALUES (
            gen_random_uuid(),
            v_misconception_id,
            v_concept_id,
            'analogy',
            'Think of a student who memorizes every answer in a practice exam '
            'verbatim instead of learning the underlying concepts. On test day '
            'they score 100% on the practice paper but struggle when the wording '
            'changes even slightly. A machine learning model that overfits does '
            'exactly this — it memorizes the training examples rather than learning '
            'the general patterns. High training accuracy is the practice-exam score; '
            'it tells you nothing reliable about how the model handles genuinely new data.',
            'Ask yourself: would the model''s accuracy drop significantly on data it '
            'has never seen before? If training accuracy is 99% but test accuracy is '
            '65%, the model has memorized rather than learned.',
            'A model trained on 1000 cat photos might learn that all cats happen to '
            'have a specific green background in the training set. It achieves 98% '
            'training accuracy, yet mislabels every real-world cat photo with a '
            'different background.'
        )
        RETURNING id INTO v_plan_analogy_id;
    ELSE
        UPDATE teaching_plans
        SET explanation = 'Think of a student who memorizes every answer in a practice exam '
                          'verbatim instead of learning the underlying concepts. On test day '
                          'they score 100% on the practice paper but struggle when the wording '
                          'changes even slightly. A machine learning model that overfits does '
                          'exactly this — it memorizes the training examples rather than learning '
                          'the general patterns. High training accuracy is the practice-exam score; '
                          'it tells you nothing reliable about how the model handles genuinely new data.',
            hint        = 'Ask yourself: would the model''s accuracy drop significantly on data it '
                          'has never seen before? If training accuracy is 99% but test accuracy is '
                          '65%, the model has memorized rather than learned.',
            example_text= 'A model trained on 1000 cat photos might learn that all cats happen to '
                          'have a specific green background in the training set. It achieves 98% '
                          'training accuracy, yet mislabels every real-world cat photo with a '
                          'different background.',
            updated_at  = NOW()
        WHERE id = v_plan_analogy_id;
    END IF;

    -- ── Teaching Plan — Simple Example ────────────────────────────────────
    SELECT id INTO v_plan_example_id
    FROM teaching_plans
    WHERE misconception_id = v_misconception_id AND strategy = 'example';

    IF v_plan_example_id IS NULL THEN
        INSERT INTO teaching_plans
            (id, misconception_id, concept_id, strategy, explanation, hint, example_text)
        VALUES (
            gen_random_uuid(),
            v_misconception_id,
            v_concept_id,
            'example',
            'Here is a concrete numerical example. A decision tree trained without '
            'a maximum depth on 500 records achieves 100% training accuracy — it '
            'has memorized every row. When evaluated on 200 held-out test records '
            'it achieves only 58% accuracy. The 42-percentage-point gap reveals '
            'that the model overfit: it captured noise instead of signal. '
            'Reducing the tree depth (regularization) lowers training accuracy '
            'slightly to 87% but raises test accuracy to 84% — a far more '
            'trustworthy result for deployment.',
            'Compare training accuracy with test (or validation) accuracy. '
            'A large gap means the model overfit. Reducing model complexity or '
            'adding regularization typically closes the gap.',
            'Training accuracy 100%, test accuracy 58% → overfit. '
            'After regularization: training 87%, test 84% → good generalization.'
        )
        RETURNING id INTO v_plan_example_id;
    ELSE
        UPDATE teaching_plans
        SET explanation = 'Here is a concrete numerical example. A decision tree trained without '
                          'a maximum depth on 500 records achieves 100% training accuracy — it '
                          'has memorized every row. When evaluated on 200 held-out test records '
                          'it achieves only 58% accuracy. The 42-percentage-point gap reveals '
                          'that the model overfit: it captured noise instead of signal. '
                          'Reducing the tree depth (regularization) lowers training accuracy '
                          'slightly to 87% but raises test accuracy to 84% — a far more '
                          'trustworthy result for deployment.',
            hint        = 'Compare training accuracy with test (or validation) accuracy. '
                          'A large gap means the model overfit. Reducing model complexity or '
                          'adding regularization typically closes the gap.',
            example_text= 'Training accuracy 100%, test accuracy 58% → overfit. '
                          'After regularization: training 87%, test 84% → good generalization.',
            updated_at  = NOW()
        WHERE id = v_plan_example_id;
    END IF;

    -- ── Teaching Plan — Concept-level Fallback (unknown misconception) ─────
    -- misconception_id IS NULL; concept_id is still required.
    -- This plan is served when the student is wrong but the system cannot
    -- determine which specific misconception they hold.
    SELECT id INTO v_plan_fallback_id
    FROM teaching_plans
    WHERE concept_id = v_concept_id AND misconception_id IS NULL AND strategy = 'analogy';

    IF v_plan_fallback_id IS NULL THEN
        INSERT INTO teaching_plans
            (id, misconception_id, concept_id, strategy, explanation, hint, example_text)
        VALUES (
            gen_random_uuid(),
            NULL,            -- concept-level fallback
            v_concept_id,
            'analogy',
            'Overfitting happens when a model performs extremely well on the data '
            'it was trained on but fails to generalize to new data. A high training '
            'accuracy alone is not evidence of a good model — you always need to '
            'evaluate performance on data the model has never seen.',
            'Check both training accuracy and test/validation accuracy. '
            'A trustworthy model should perform similarly on both. '
            'A big gap suggests overfitting.',
            NULL
        )
        RETURNING id INTO v_plan_fallback_id;
    ELSE
        UPDATE teaching_plans
        SET explanation = 'Overfitting happens when a model performs extremely well on the data '
                          'it was trained on but fails to generalize to new data. A high training '
                          'accuracy alone is not evidence of a good model — you always need to '
                          'evaluate performance on data the model has never seen.',
            hint        = 'Check both training accuracy and test/validation accuracy. '
                          'A trustworthy model should perform similarly on both. '
                          'A big gap suggests overfitting.',
            updated_at  = NOW()
        WHERE id = v_plan_fallback_id;
    END IF;

    -- ── Question OVERFIT_Q1 — Practice ────────────────────────────────────
    INSERT INTO questions (id, concept_id, code, phase, prompt, difficulty, is_active)
    VALUES (
        gen_random_uuid(),
        v_concept_id,
        'OVERFIT_Q1',
        'practice',
        'A neural network is trained on a dataset of 10,000 images and achieves '
        '99.5% accuracy on the training set. When tested on 2,000 held-out images '
        'it achieves only 61% accuracy. What does this result most likely indicate?',
        2,
        TRUE
    )
    ON CONFLICT (code) DO UPDATE
        SET prompt     = EXCLUDED.prompt,
            difficulty = EXCLUDED.difficulty,
            is_active  = EXCLUDED.is_active,
            updated_at = NOW()
    RETURNING id INTO v_q1_id;

    IF v_q1_id IS NULL THEN
        SELECT id INTO v_q1_id FROM questions WHERE code = 'OVERFIT_Q1';
    END IF;

    -- Options for OVERFIT_Q1
    -- Position 1: CORRECT
    INSERT INTO question_options (id, question_id, position, option_text, is_correct, misconception_id)
    VALUES (gen_random_uuid(), v_q1_id, 1,
        'The model has overfit the training data and does not generalize well.',
        TRUE, NULL)
    ON CONFLICT (question_id, position) DO UPDATE
        SET option_text      = EXCLUDED.option_text,
            is_correct       = EXCLUDED.is_correct,
            misconception_id = EXCLUDED.misconception_id;

    -- Position 2: WRONG — maps to OVERFIT_M1
    INSERT INTO question_options (id, question_id, position, option_text, is_correct, misconception_id)
    VALUES (gen_random_uuid(), v_q1_id, 2,
        'The model is performing well because training accuracy is very high.',
        FALSE, v_misconception_id)
    ON CONFLICT (question_id, position) DO UPDATE
        SET option_text      = EXCLUDED.option_text,
            is_correct       = EXCLUDED.is_correct,
            misconception_id = EXCLUDED.misconception_id;

    -- Position 3: WRONG — no specific misconception mapped
    INSERT INTO question_options (id, question_id, position, option_text, is_correct, misconception_id)
    VALUES (gen_random_uuid(), v_q1_id, 3,
        'The model needs more training epochs to improve test accuracy.',
        FALSE, NULL)
    ON CONFLICT (question_id, position) DO UPDATE
        SET option_text      = EXCLUDED.option_text,
            is_correct       = EXCLUDED.is_correct,
            misconception_id = EXCLUDED.misconception_id;

    -- Position 4: WRONG — no specific misconception mapped
    INSERT INTO question_options (id, question_id, position, option_text, is_correct, misconception_id)
    VALUES (gen_random_uuid(), v_q1_id, 4,
        'The test set is too small to draw any conclusion.',
        FALSE, NULL)
    ON CONFLICT (question_id, position) DO UPDATE
        SET option_text      = EXCLUDED.option_text,
            is_correct       = EXCLUDED.is_correct,
            misconception_id = EXCLUDED.misconception_id;

    -- ── Question OVERFIT_Q2 — Retry ───────────────────────────────────────
    -- Different wording; same concept. Tests whether the student now understands
    -- after seeing the teaching intervention.
    INSERT INTO questions (id, concept_id, code, phase, prompt, difficulty, is_active)
    VALUES (
        gen_random_uuid(),
        v_concept_id,
        'OVERFIT_Q2',
        'retry',
        'A decision tree classifier scores 100% on its training set and 55% on '
        'the validation set. A colleague says "the model is excellent — 100% '
        'training accuracy!" Which statement best evaluates their claim?',
        2,
        TRUE
    )
    ON CONFLICT (code) DO UPDATE
        SET prompt     = EXCLUDED.prompt,
            difficulty = EXCLUDED.difficulty,
            is_active  = EXCLUDED.is_active,
            updated_at = NOW()
    RETURNING id INTO v_q2_id;

    IF v_q2_id IS NULL THEN
        SELECT id INTO v_q2_id FROM questions WHERE code = 'OVERFIT_Q2';
    END IF;

    -- Options for OVERFIT_Q2
    INSERT INTO question_options (id, question_id, position, option_text, is_correct, misconception_id)
    VALUES (gen_random_uuid(), v_q2_id, 1,
        'The colleague is wrong. The 45-point gap between training and validation '
        'accuracy is a clear sign of overfitting.',
        TRUE, NULL)
    ON CONFLICT (question_id, position) DO UPDATE
        SET option_text      = EXCLUDED.option_text,
            is_correct       = EXCLUDED.is_correct,
            misconception_id = EXCLUDED.misconception_id;

    INSERT INTO question_options (id, question_id, position, option_text, is_correct, misconception_id)
    VALUES (gen_random_uuid(), v_q2_id, 2,
        'The colleague is correct. 100% training accuracy shows the model has learned perfectly.',
        FALSE, v_misconception_id)
    ON CONFLICT (question_id, position) DO UPDATE
        SET option_text      = EXCLUDED.option_text,
            is_correct       = EXCLUDED.is_correct,
            misconception_id = EXCLUDED.misconception_id;

    INSERT INTO question_options (id, question_id, position, option_text, is_correct, misconception_id)
    VALUES (gen_random_uuid(), v_q2_id, 3,
        'More data is needed before any conclusion can be drawn.',
        FALSE, NULL)
    ON CONFLICT (question_id, position) DO UPDATE
        SET option_text      = EXCLUDED.option_text,
            is_correct       = EXCLUDED.is_correct,
            misconception_id = EXCLUDED.misconception_id;

    INSERT INTO question_options (id, question_id, position, option_text, is_correct, misconception_id)
    VALUES (gen_random_uuid(), v_q2_id, 4,
        'The validation set is probably mislabelled.',
        FALSE, NULL)
    ON CONFLICT (question_id, position) DO UPDATE
        SET option_text      = EXCLUDED.option_text,
            is_correct       = EXCLUDED.is_correct,
            misconception_id = EXCLUDED.misconception_id;

    -- ── Question OVERFIT_Q3 — Transfer ────────────────────────────────────
    -- Different surface details (text classifier, new domain) to test genuine
    -- conceptual transfer rather than pattern-matching on familiar wording.
    INSERT INTO questions (id, concept_id, code, phase, prompt, difficulty, is_active)
    VALUES (
        gen_random_uuid(),
        v_concept_id,
        'OVERFIT_Q3',
        'transfer',
        'A sentiment classifier is trained on 50,000 movie reviews and achieves '
        '97% training accuracy. It is then deployed to classify product reviews '
        'but only achieves 54% accuracy in production. A data scientist says the '
        'classifier should be trusted because "it was almost perfect during '
        'training." What is the most accurate assessment?',
        3,
        TRUE
    )
    ON CONFLICT (code) DO UPDATE
        SET prompt     = EXCLUDED.prompt,
            difficulty = EXCLUDED.difficulty,
            is_active  = EXCLUDED.is_active,
            updated_at = NOW()
    RETURNING id INTO v_q3_id;

    IF v_q3_id IS NULL THEN
        SELECT id INTO v_q3_id FROM questions WHERE code = 'OVERFIT_Q3';
    END IF;

    -- Options for OVERFIT_Q3
    INSERT INTO question_options (id, question_id, position, option_text, is_correct, misconception_id)
    VALUES (gen_random_uuid(), v_q3_id, 1,
        'The data scientist is wrong. The classifier overfit to movie-review language '
        'and cannot generalize to the different vocabulary and style of product reviews.',
        TRUE, NULL)
    ON CONFLICT (question_id, position) DO UPDATE
        SET option_text      = EXCLUDED.option_text,
            is_correct       = EXCLUDED.is_correct,
            misconception_id = EXCLUDED.misconception_id;

    INSERT INTO question_options (id, question_id, position, option_text, is_correct, misconception_id)
    VALUES (gen_random_uuid(), v_q3_id, 2,
        'The data scientist is correct. High training accuracy is the best predictor '
        'of real-world performance.',
        FALSE, v_misconception_id)
    ON CONFLICT (question_id, position) DO UPDATE
        SET option_text      = EXCLUDED.option_text,
            is_correct       = EXCLUDED.is_correct,
            misconception_id = EXCLUDED.misconception_id;

    INSERT INTO question_options (id, question_id, position, option_text, is_correct, misconception_id)
    VALUES (gen_random_uuid(), v_q3_id, 3,
        'The poor production accuracy is because the product reviews contain typos.',
        FALSE, NULL)
    ON CONFLICT (question_id, position) DO UPDATE
        SET option_text      = EXCLUDED.option_text,
            is_correct       = EXCLUDED.is_correct,
            misconception_id = EXCLUDED.misconception_id;

    INSERT INTO question_options (id, question_id, position, option_text, is_correct, misconception_id)
    VALUES (gen_random_uuid(), v_q3_id, 4,
        'Production performance is always lower than training performance so this is expected and acceptable.',
        FALSE, NULL)
    ON CONFLICT (question_id, position) DO UPDATE
        SET option_text      = EXCLUDED.option_text,
            is_correct       = EXCLUDED.is_correct,
            misconception_id = EXCLUDED.misconception_id;

END $$;
