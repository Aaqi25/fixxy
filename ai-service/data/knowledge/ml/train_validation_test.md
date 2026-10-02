# Train, Validation, and Test Sets in Machine Learning

## Overview

A robust machine learning workflow requires splitting data into three distinct, non-overlapping subsets:
1. **Training Set**
2. **Validation Set**
3. **Test Set**

Strict separation is essential to prevent **data leakage** and ensure truthful estimation of generalization capability.

## Purpose of Each Split

### 1. Training Set (typically 60% – 80% of data)
- **Role:** Used directly by the learning algorithm to optimize model weights / parameters.
- **Analogy:** The textbook chapters and practice exercises studied by a student during the semester.
- **Rule:** The model learns solely from this partition.

### 2. Validation Set (typically 10% – 20% of data)
- **Role:** Used to evaluate candidate models, tune hyperparameters (learning rate, tree depth, regularization strength), and implement early stopping.
- **Analogy:** The mock exams taken during the course to assess which study strategies work best before the final exam.
- **Rule:** Never update model weights directly on validation data; use validation metrics only to guide model selection.

### 3. Test Set (typically 10% – 20% of data)
- **Role:** Used exclusively once at the very end to evaluate the final chosen model on completely unseen data.
- **Analogy:** The final official certification exam.
- **Rule:** The test set must remain untouched during training, feature engineering, and hyperparameter tuning. Looking at test set results to tweak hyperparameters causes "test set contamination".

## Cross-Validation (K-Fold CV)

When dataset size is small or moderate:
- Data is split into $K$ equal folds (commonly $K=5$ or $K=10$).
- The model is trained on $K-1$ folds and validated on the remaining fold.
- The process repeats $K$ times, and performance is averaged across all validation folds.
- Provides a low-variance estimate of generalization error without permanently sacrificing validation data.

## Common Pitfalls & Misconceptions

### "Data Leakage"
- Performing feature normalization, imputation, or dimensionality reduction on the whole dataset before splitting causes information from validation/test sets to leak into training, producing overly optimistic scores.
- **Remedy:** Always fit preprocessors (scalers, encoders) strictly on the training partition only, and transform validation/test sets with those fitted parameters.

### "Re-using Test Data"
- Repeatedly evaluating different architectures on the test set turns the test set into a de facto validation set, biasing the final reported accuracy.

### "Stratification Requirement"
- In imbalanced classification datasets (e.g., 99% negative, 1% positive), random splits can create validation folds with zero positive instances.
- **Remedy:** Use **Stratified K-Fold** or stratified splitting to preserve class proportions across all splits.

## Key Summary

- **Train:** Fits parameters (weights).
- **Validation:** Tunes hyperparameters and selects architecture.
- **Test:** Unbiased final evaluation of the selected model.
- **Gold Rule:** Never leak test information into training or hyperparameter decisions.
