import { TeachingContent } from './session.types';

interface MisconceptionKnowledge {
  title: string;
  strategy: 'analogy' | 'counterexample' | 'first-principles' | 'step-by-step';
  explanation: string;
  hint: string;
  reteachStrategy: 'analogy' | 'counterexample' | 'first-principles' | 'step-by-step';
  reteachExplanation: string;
  reteachHint: string;
}

const KNOWLEDGE_BASE: Record<string, MisconceptionKnowledge> = {
  OVERFIT_M1: {
    title: 'Training accuracy means generalization',
    strategy: 'analogy',
    explanation:
      'A model scoring near 100% on training data while failing on unseen data is like a student who memorized practice exam questions. True mastery requires generalizing principles to unfamiliar problems rather than memorizing noise.',
    hint: 'Compare training performance against held-out validation or test accuracy. A wide divergence flags memorization rather than learning.',
    reteachStrategy: 'counterexample',
    reteachExplanation:
      "Let's approach this from another angle. Imagine drawing a high-degree polynomial curve that touches every single noisy point in a scatter plot. It achieves 0% training error, yet wildly oscillates between points and fails on any new observation. Simpler boundaries frequently generalize far better.",
    reteachHint: 'Ask yourself: does the model perform consistently across unseen validation data, or only on the exact data it was tuned with?',
  },
  OVERFIT_M2: {
    title: 'More training iterations always improve model quality',
    strategy: 'first-principles',
    explanation:
      'Past the inflection point where validation loss begins to climb, additional training epochs force the model to memorize dataset idiosyncrasies and random noise, degrading its real-world generalization.',
    hint: 'Monitor validation loss across epochs. When validation loss diverges from training loss, early stopping should halt training.',
    reteachStrategy: 'analogy',
    reteachExplanation:
      "Let's look at this another way. Practicing a sport with bad habits for hundreds of extra hours doesn't make you a better player — it ingrains bad form. Similarly, training past optimal validation convergence ingrains noise patterns into weights.",
    reteachHint: 'Focus on early stopping criteria rather than running epochs indefinitely.',
  },
  BIASVAR_M1: {
    title: 'High variance means the model is too simple',
    strategy: 'first-principles',
    explanation:
      'High variance means the model is overly complex and excessively sensitive to small fluctuations in the training dataset. When validation error is far higher than training error, the model suffers from variance, not bias.',
    hint: 'High bias causes both training and validation errors to be high. High variance causes a wide gap between low training error and high validation error.',
    reteachStrategy: 'step-by-step',
    reteachExplanation:
      "Let's break this down systematically. Step 1: Look at training error. Is it low? If yes, the model has sufficient capacity. Step 2: Look at validation error. Is it high? The divergence indicates variance (overfitting). To fix variance: simplify the architecture, add regularization, or gather more training examples.",
    reteachHint: 'Remember: High Bias = Underfitting (too simple). High Variance = Overfitting (too complex).',
  },
  BV_M1: {
    title: 'High variance means the model is too simple',
    strategy: 'first-principles',
    explanation:
      'High variance means the model is overly complex and excessively sensitive to small fluctuations in the training dataset. When validation error is far higher than training error, the model suffers from variance, not bias.',
    hint: 'High bias causes both training and validation errors to be high. High variance causes a wide gap between low training error and high validation error.',
    reteachStrategy: 'step-by-step',
    reteachExplanation:
      "Let's break this down systematically. Step 1: Look at training error. Is it low? If yes, the model has sufficient capacity. Step 2: Look at validation error. Is it high? The divergence indicates variance (overfitting). To fix variance: simplify the architecture, add regularization, or gather more training examples.",
    reteachHint: 'Remember: High Bias = Underfitting (too simple). High Variance = Overfitting (too complex).',
  },
  BIASVAR_M2: {
    title: 'Zero bias and zero variance can be achieved simultaneously',
    strategy: 'first-principles',
    explanation:
      'Because irreducible error is always present in real-world data and model capacity is inherently constrained, bias and variance exist in an unavoidable trade-off. Minimizing one typically increases the other.',
    hint: 'Look for the sweet spot in model complexity where the sum of squared bias, variance, and irreducible error is minimized.',
    reteachStrategy: 'analogy',
    reteachExplanation:
      "Consider a camera lens: zooming in captures intense local detail (low bias on that spot) but causes extreme shakiness and blur when the camera moves slightly (high variance). A balanced lens captures the broader scene stably.",
    reteachHint: 'Optimal learning balances model flexibility with stability across unseen samples.',
  },
  TVT_M1: {
    title: 'Validation and test sets can be used interchangeably',
    strategy: 'analogy',
    explanation:
      'The validation set is your practice arena for hyperparameter tuning and model selection. The test set is a sealed vault, inspected only once at the very end to measure true generalization without selection bias.',
    hint: 'If you adjust model hyperparameters based on test set scores, test set information leaks into your decisions, invalidating your estimate.',
    reteachStrategy: 'counterexample',
    reteachExplanation:
      "Let's examine what happens when you tune on the test set. If you test 100 model variations on the test set and pick the one with the highest score, that model may have won simply by random chance on that specific test sample. That's why a separate validation set is mandatory.",
    reteachHint: 'Validation = Model Tuning & Selection. Test = Final Unbiased Verification.',
  },
  TVT_M2: {
    title: 'Data preprocessing can be performed across the whole dataset before splitting',
    strategy: 'first-principles',
    explanation:
      'Computing statistics (like mean, variance, or min/max scalers) across the entire dataset before splitting leaks future information from the test split into the training split.',
    hint: 'Always split your raw data first. Fit your transformers only on the training set, then transform the validation and test sets using those fitted parameters.',
    reteachStrategy: 'step-by-step',
    reteachExplanation:
      "Let's follow the golden rule of machine learning pipelines: Step 1: Split into Train, Val, Test. Step 2: scaler.fit(X_train). Step 3: scaler.transform(X_train), scaler.transform(X_val), scaler.transform(X_test). Never fit on data the model isn't supposed to know about during training!",
    reteachHint: 'Fit scalers and imputers solely on the training partition.',
  },
};

const CONCEPT_FALLBACKS: Record<string, MisconceptionKnowledge> = {
  overfitting: {
    title: 'Recognizing and Preventing Overfitting',
    strategy: 'analogy',
    explanation:
      'Overfitting occurs when a model learns the detailed noise and specific patterns of the training dataset rather than the true underlying distribution.',
    hint: 'Evaluate the difference between training score and validation score to assess generalization capability.',
    reteachStrategy: 'counterexample',
    reteachExplanation:
      "Let's approach this differently. A good model captures the general trend rather than touching every individual point. Look for simplicity and robust validation metrics.",
    reteachHint: 'Focus on how well the model predicts new, unseen examples.',
  },
  'bias-vs-variance': {
    title: 'Understanding the Bias-Variance Tradeoff',
    strategy: 'first-principles',
    explanation:
      'Bias reflects underfitting due to overly simplistic assumptions, while variance reflects overfitting due to excessive sensitivity to training variations.',
    hint: 'Identify whether the model is failing to learn the pattern (bias) or fitting the noise (variance).',
    reteachStrategy: 'step-by-step',
    reteachExplanation:
      "Let's revisit the diagnosis: check if training error is high (indicates high bias) or if there is a large gap between training and validation error (indicates high variance).",
    reteachHint: 'Adjust model complexity in the direction that minimizes total generalization error.',
  },
  'train-validation-test': {
    title: 'Dataset Partitioning & Data Leakage Prevention',
    strategy: 'analogy',
    explanation:
      'Proper dataset splitting prevents data leakage. The training set builds the model, the validation set tunes parameters, and the test set measures final performance.',
    hint: 'Ensure that no evaluation or transformation uses test set information during the development cycle.',
    reteachStrategy: 'step-by-step',
    reteachExplanation:
      "Remember the three separate roles: Train (learning), Validation (decision making & tuning), and Test (final evaluation). Keep them strictly separated.",
    reteachHint: 'Never allow test set feedback to guide model choices.',
  },
};

export function getTeachingContent(
  conceptSlug: string,
  misconceptionCode?: string | null,
  isReteach: boolean = false
): TeachingContent {
  const normCode = misconceptionCode ? misconceptionCode.trim().toUpperCase() : '';
  const knowledge = KNOWLEDGE_BASE[normCode] || CONCEPT_FALLBACKS[conceptSlug.toLowerCase()] || {
    title: 'Core Concept Misunderstanding',
    strategy: 'first-principles',
    explanation:
      'Let us review the fundamental concepts here to understand where the reasoning diverged.',
    hint: 'Review the underlying assumptions and test against unseen examples.',
    reteachStrategy: 'counterexample',
    reteachExplanation:
      'Let us examine this problem from a fresh perspective to strengthen foundational understanding.',
    reteachHint: 'Think about how the principle applies under realistic testing conditions.',
  };

  return {
    misconceptionCode: normCode || undefined,
    misconceptionTitle: knowledge.title,
    strategy: isReteach ? knowledge.reteachStrategy : knowledge.strategy,
    explanation: isReteach ? knowledge.reteachExplanation : knowledge.explanation,
    hint: isReteach ? knowledge.reteachHint : knowledge.hint,
    confidence: normCode ? 0.94 : 0.82,
    isReteach,
  };
}
