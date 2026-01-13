# Specialized AI Flashcard Generation

## Overview

The StudyLess app now features an intelligent, category-aware flashcard generation system that automatically detects the type of content and uses specialized prompts optimized for different subjects.

## How It Works

### Two-Phase Generation Process

**Phase 1: Automatic Category Detection**
- The AI analyzes the content to determine its category
- No user input required
- Categories: vocabulary, math, science, history, language, definitions, general

**Phase 2: Specialized Generation**
- Uses a category-specific prompt template
- Optimizes flashcard format for the detected subject
- Maintains consistent output structure

## Supported Categories

### 1. Vocabulary (Minimal)
**Optimized for:** Word lists, vocabulary building, language learning basics

**Format:**
- Front: Single word only (no articles, no context)
- Back: Primary definition only (1 sentence max)
- No example sentences or extra context

**Example:**
```
Front: Ephemeral
Back: Lasting for a very short time
```

### 2. Math
**Optimized for:** Equations, problems, formulas, calculations

**Format:**
- Front: Problem statement, formula name, or concept question
- Back: Step-by-step solution or formula with application
- Includes mathematical notation and work shown

**Example:**
```
Front: Quadratic Formula
Back: x = (-b ± √(b² - 4ac)) / 2a. Use to solve ax² + bx + c = 0
```

### 3. Science
**Optimized for:** Concepts, principles, processes, experiments

**Format:**
- Front: Concept question, principle name, or process
- Back: Clear explanation with key terms (2-3 sentences)
- Focus on understanding and cause-effect relationships

**Example:**
```
Front: What is osmosis?
Back: Movement of water molecules across a membrane from lower to higher solute concentration. It's a passive transport process requiring no energy.
```

### 4. History
**Optimized for:** Events, figures, dates, periods

**Format:**
- Front: Event name, historical figure, or time period
- Back: Significance, dates, and historical context
- Includes cause-effect and broader themes

**Example:**
```
Front: Battle of Saratoga (1777)
Back: Turning point of Revolutionary War. American victory convinced France to ally with the colonies, providing crucial support.
```

### 5. Language Learning
**Optimized for:** Foreign phrases, translations, grammar

**Format:**
- Front: Phrase or sentence in target language
- Back: Translation with usage context
- Includes formality notes and pronunciation when relevant

**Example:**
```
Front: ¿Cómo estás?
Back: How are you? (informal). Use with friends, family, and peers.
```

### 6. Definitions (Academic)
**Optimized for:** Technical terms, formal concepts, specialized vocabulary

**Format:**
- Front: Technical term or academic concept
- Back: Formal definition and practical application
- Uses precise, subject-specific terminology

**Example:**
```
Front: Binary Search Tree
Back: A node-based tree where left children are less than parent and right children are greater. Enables efficient O(log n) searching.
```

### 7. General
**Optimized for:** Mixed content, broad topics

**Format:**
- Front: Key concept or question
- Back: Comprehensive answer
- Adapts to content type dynamically

## Technical Implementation

### Files Modified

**`src/utils/aiFlashcardGenerator.ts`**
- Added `ContentCategory` type with 7 categories
- Created `CATEGORY_PROMPTS` object with specialized prompts
- Implemented `detectContentCategory()` function for automatic detection
- Implemented `getPromptForCategory()` to select the right prompt
- Updated all generation functions to use two-phase approach:
  - `generateFlashcardsFromImage()`
  - `generateFlashcardsFromText()`
  - `generateFlashcardsFromPDF()`

### API Calls

The system now makes **two API calls** per generation:
1. **Detection call**: Analyzes content to determine category
2. **Generation call**: Creates flashcards using specialized prompt

### Backward Compatibility

✅ No changes to function signatures
✅ No UI modifications required
✅ Same JSON output format: `[{front, back}]`
✅ Works with existing deck management system

## Testing the System

### Test Files Provided

Located in `test-samples/` directory:
- `vocabulary-sample.txt` - Tests minimal word/meaning format
- `math-sample.txt` - Tests step-by-step solutions
- `science-sample.txt` - Tests concept explanations
- `history-sample.txt` - Tests events with context
- `language-sample.txt` - Tests translations with usage
- `definitions-sample.txt` - Tests formal definitions

### How to Test

1. Open StudyLess app
2. Tap "Generate Flashcards"
3. Select "Upload File"
4. Choose a test sample file
5. Verify:
   - Console shows detected category
   - Flashcards match expected format
   - Quality is appropriate for subject

### Expected Results

Each category should produce flashcards that:
- Follow the specialized format rules
- Are optimized for studying that subject type
- Maintain consistent quality and structure
- **Vocabulary specifically**: Minimal cards with just word and definition

## Benefits

### For Students
- **Better Study Quality**: Cards optimized for each subject type
- **Time Saving**: No need to manually format cards
- **Consistency**: Same format for same subjects
- **Flexibility**: Works with any content type

### For the App
- **No UI Changes**: Seamless integration
- **Scalable**: Easy to add new categories
- **Intelligent**: Automatic detection requires no user input
- **Reliable**: Falls back to general format if uncertain

## Examples by Category

### Vocabulary Test Results
```json
[
  {"front": "Ephemeral", "back": "Lasting for a very short time"},
  {"front": "Ubiquitous", "back": "Present everywhere"},
  {"front": "Pragmatic", "back": "Dealing with things sensibly and realistically"}
]
```

### Math Test Results
```json
[
  {
    "front": "Solve 2x² + 5x - 3 = 0",
    "back": "Using quadratic formula: x = (-5 ± √49) / 4 = 0.5 or -3"
  },
  {
    "front": "Quadratic Formula",
    "back": "x = (-b ± √(b² - 4ac)) / 2a. Use for ax² + bx + c = 0"
  }
]
```

### Science Test Results
```json
[
  {
    "front": "What is osmosis?",
    "back": "Movement of water across a membrane from low to high solute concentration. Passive transport requiring no energy."
  },
  {
    "front": "Function of mitochondria",
    "back": "Powerhouse of the cell. Produces ATP through cellular respiration. Has own DNA and double membrane."
  }
]
```

## Console Logging

When generating flashcards, watch for:
```
Detected content category: vocabulary
```

This confirms the automatic detection is working correctly.

## Future Enhancements

Potential improvements:
- Add more specialized categories (coding, law, medical, etc.)
- Allow manual category override in UI
- Display detected category to user
- Category-specific review algorithms
- Analytics on category detection accuracy

## Summary

The specialized flashcard system provides:
- ✅ Automatic category detection
- ✅ 7 specialized prompt templates
- ✅ Optimized formatting per subject
- ✅ Minimal vocabulary cards (as requested)
- ✅ No UI changes required
- ✅ Backward compatible
- ✅ Comprehensive test samples

The system is production-ready and will improve the quality of generated flashcards across all subject types.









