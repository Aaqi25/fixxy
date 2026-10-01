-- ============================================================
-- Seed 001: Three MVP concepts
-- Safe to run repeatedly (upsert on stable slug).
-- ============================================================

INSERT INTO concepts (id, slug, title, summary, sort_order, is_active)
VALUES
    (
        gen_random_uuid(),
        'overfitting',
        'Overfitting',
        'Overfitting occurs when a model learns the training data too well, '
        'including noise and irrelevant patterns, causing poor performance on '
        'unseen data. A model that memorizes rather than generalizes cannot be '
        'trusted on new examples.',
        1,
        TRUE
    ),
    (
        gen_random_uuid(),
        'bias-vs-variance',
        'Bias vs Variance',
        'Bias measures systematic error from overly simplistic assumptions; '
        'variance measures sensitivity to fluctuations in training data. '
        'The bias-variance trade-off is central to choosing model complexity.',
        2,
        TRUE
    ),
    (
        gen_random_uuid(),
        'train-validation-test',
        'Train / Validation / Test Split',
        'Dividing a dataset into training, validation, and test subsets '
        'prevents data leakage and provides an unbiased estimate of how a '
        'finished model performs on genuinely unseen data.',
        3,
        TRUE
    )
ON CONFLICT (slug) DO UPDATE
    SET title      = EXCLUDED.title,
        summary    = EXCLUDED.summary,
        sort_order = EXCLUDED.sort_order,
        is_active  = EXCLUDED.is_active,
        updated_at = NOW();
