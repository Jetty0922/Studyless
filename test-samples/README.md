# Flashcard Generation Test Samples

This directory contains sample content for testing the specialized AI flashcard generation system.

## Available Test Files

### 1. vocabulary-sample.txt
Tests the **vocabulary** category detection and generation.
- Expected behavior: Minimal flashcards with word on front, single definition on back
- No example sentences or extra context

### 2. math-sample.txt
Tests the **math** category detection and generation.
- Expected behavior: Problems/formulas on front, step-by-step solutions on back
- Should include mathematical notation and explanations

### 3. science-sample.txt
Tests the **science** category detection and generation.
- Expected behavior: Concepts/questions on front, detailed explanations on back
- Should focus on understanding processes and principles

### 4. history-sample.txt
Tests the **history** category detection and generation.
- Expected behavior: Events/figures on front, significance and context on back
- Should include dates and cause-effect relationships

### 5. language-sample.txt
Tests the **language** category detection and generation.
- Expected behavior: Foreign phrases on front, translations and usage on back
- Should include formality notes and context

### 6. definitions-sample.txt
Tests the **definitions** category detection and generation.
- Expected behavior: Technical terms on front, formal definitions on back
- Should use precise, academic language

## How to Test

1. Open the StudyLess app
2. Navigate to "Generate Flashcards"
3. Select "Upload File"
4. Choose one of the test files from this directory
5. Verify that:
   - The correct category is detected (check console logs)
   - Flashcards follow the specialized format for that category
   - Quality matches the category-specific requirements

## Expected Category Detection

- **vocabulary-sample.txt** → vocabulary
- **math-sample.txt** → math
- **science-sample.txt** → science
- **history-sample.txt** → history
- **language-sample.txt** → language
- **definitions-sample.txt** → definitions

## Notes

- The AI should automatically detect the category (Phase 1)
- Then generate flashcards using the specialized prompt (Phase 2)
- Each category has unique formatting requirements
- Vocabulary should be especially minimal per user requirements









