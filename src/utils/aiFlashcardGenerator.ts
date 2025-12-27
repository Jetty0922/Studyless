import * as FileSystem from "expo-file-system";
import * as ImageManipulator from 'expo-image-manipulator';
import { generateWithGemini } from "../api/gemini";

export interface GeneratedFlashcard {
  front: string;
  back: string;
}

/**
 * Resizes an image if it's too large, then converts to base64
 */
async function prepareImageForAI(imageUri: string): Promise<string> {
  try {
    // 1. Get file info to check size
    const fileInfo = await FileSystem.getInfoAsync(imageUri);
    const sizeInBytes = fileInfo.exists ? fileInfo.size : 0;
    const MAX_SIZE_BYTES = 4 * 1024 * 1024; // 4MB safety limit

    let finalUri = imageUri;

    // 2. Resize/Compress if needed
    if (sizeInBytes > MAX_SIZE_BYTES) {
      // Resize to max 1500px width/height (plenty for text reading) and compress
      const manipulatedImage = await ImageManipulator.manipulateAsync(
        imageUri,
        [{ resize: { width: 1500 } }], 
        { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG }
      );
      
      finalUri = manipulatedImage.uri;
    }

    // 3. Convert to Base64
    const base64 = await FileSystem.readAsStringAsync(finalUri, {
      encoding: FileSystem.EncodingType.Base64,
    });
    return base64;
  } catch (error) {
    console.error("Error preparing image for AI:", error);
    throw error;
  }
}

/**
 * Parses flashcards from AI response
 */
function parseFlashcardsFromResponse(content: string): GeneratedFlashcard[] {
  let cleanContent = content.trim();
  
  // Remove markdown code blocks if present
  cleanContent = cleanContent.replace(/```json\s*/g, '').replace(/```\s*/g, '');
  
  // Try to find JSON array
  const jsonMatch = cleanContent.match(/\[[\s\S]*\]/);
  if (!jsonMatch) {
    console.error("Could not find JSON array in response:", content);
    throw new Error("Could not parse flashcards from response.");
  }

  try {
    const flashcards: GeneratedFlashcard[] = JSON.parse(jsonMatch[0]);

    if (!Array.isArray(flashcards)) {
      throw new Error("Response is not an array");
    }

    const validFlashcards = flashcards.filter(
      (card) => 
        card && 
        typeof card.front === 'string' && 
        typeof card.back === 'string' &&
        card.front.trim().length > 0
    );

    if (validFlashcards.length === 0) {
      throw new Error("No valid flashcards found");
    }

    return validFlashcards;
  } catch (error) {
    console.error("Error parsing JSON:", error);
    throw new Error("Could not parse flashcards.");
  }
}

/**
 * Content categories for specialized flashcard generation
 */
export type ContentCategory = 'vocabulary' | 'math' | 'science' | 'history' | 'language' | 'definitions' | 'general';

/**
 * Specialized Prompt Templates for different content categories
 */
const CATEGORY_PROMPTS: Record<ContentCategory, string> = {
  vocabulary: `You are an expert vocabulary educator creating minimal vocabulary flashcards.

CRITICAL OUTPUT RULES:
1. Output ONLY a JSON array with "front" and "back" keys
2. One word per card
3. Keep it minimal - no extra context

VOCABULARY CARD FORMAT:
- Front: Single word ONLY (no articles, no context)
- Back: Primary definition/meaning ONLY (1 sentence max)
- NO example sentences
- NO additional context
- NO pronunciation guides

Extract ALL vocabulary words from the material. Focus on clarity and brevity.`,

  math: `You are an expert math educator creating problem-solving flashcards.

CRITICAL OUTPUT RULES:
1. Output ONLY a JSON array with "front" and "back" keys
2. One problem or concept per card
3. Include step-by-step solutions

MATH CARD FORMAT:
- Front: Problem statement, formula name, or concept question
- Back: Solution with clear steps, or formula with explanation of when to use it
- For problems: Show work step-by-step
- For formulas: Include the formula and its application
- For concepts: Clear explanation with examples when helpful

Extract ALL mathematical concepts, formulas, and representative problems.`,

  science: `You are an expert science educator creating concept-focused flashcards.

CRITICAL OUTPUT RULES:
1. Output ONLY a JSON array with "front" and "back" keys
2. One concept, principle, or process per card
3. Focus on understanding, not memorization

SCIENCE CARD FORMAT:
- Front: Concept question, principle name, or process to explain
- Back: Clear explanation with key terms highlighted
- Include cause-effect relationships
- Mention real-world applications when relevant
- For processes: Break into logical steps
- Keep answers concise but complete (2-3 sentences)

Extract ALL key scientific concepts, principles, laws, and processes.`,

  history: `You are an expert history educator creating context-rich flashcards.

CRITICAL OUTPUT RULES:
1. Output ONLY a JSON array with "front" and "back" keys
2. One event, person, or period per card
3. Focus on significance and connections

HISTORY CARD FORMAT:
- Front: Event name, historical figure, or period
- Back: Significance, key dates, and historical context
- Include cause-effect relationships
- Mention impact and consequences
- Connect events to broader themes
- Keep answers focused (2-3 sentences)

Extract ALL important events, figures, dates, and their historical significance.`,

  language: `You are an expert language educator creating practical language-learning flashcards.

CRITICAL OUTPUT RULES:
1. Output ONLY a JSON array with "front" and "back" keys
2. One phrase or sentence per card
3. Include practical usage context

LANGUAGE CARD FORMAT:
- Front: Phrase or sentence in the target language
- Back: Translation and brief usage context
- Include pronunciation notes if helpful
- Mention formality level (formal/informal) when relevant
- For grammar: Include the rule and example
- Keep translations natural and conversational

Extract ALL useful phrases, idioms, and grammatical structures.`,

  definitions: `You are an expert academic educator creating precise definition flashcards.

CRITICAL OUTPUT RULES:
1. Output ONLY a JSON array with "front" and "back" keys
2. One term or concept per card
3. Use formal, academic language

DEFINITION CARD FORMAT:
- Front: Technical term or academic concept
- Back: Formal definition and practical application
- Include field-specific terminology
- Mention category or classification when relevant
- For complex terms: Break down components
- Keep definitions precise (2-3 sentences)

Extract ALL technical terms, academic concepts, and specialized vocabulary.`,

  general: `You are an expert educator creating comprehensive study flashcards.

CRITICAL OUTPUT RULES:
1. Output ONLY a JSON array with "front" and "back" keys
2. One focused concept per card
3. Adapt to the content type

GENERAL CARD FORMAT:
- Front: Key concept, question, or term
- Back: Clear, comprehensive answer
- Adapt format based on content (definitions, facts, processes, etc.)
- Include relevant details and context
- Keep answers concise but complete (2-3 sentences)

Extract ALL key information, concepts, and important facts from the material.`,
};

/**
 * Detects the content category using AI analysis
 */
async function detectContentCategory(
  contentPreview: string,
  mimeType?: string,
  base64Data?: string
): Promise<ContentCategory> {
  const detectionPrompt = `Analyze this content and classify it into ONE of these categories:
- vocabulary: Lists of words with definitions, vocabulary lists, word meanings
- math: Mathematical problems, equations, formulas, calculations, proofs
- science: Scientific concepts, experiments, biology, chemistry, physics principles
- history: Historical events, dates, timelines, historical figures, periods
- language: Foreign language phrases, translations, grammar rules, language learning
- definitions: Academic terms, technical definitions, glossary entries, formal concepts
- general: Mixed content or content that doesn't fit other categories

Respond with ONLY the category name, nothing else.

Content preview:
${contentPreview}`;

  try {
    const category = await generateWithGemini(detectionPrompt, mimeType, base64Data);
    const cleanCategory = category.trim().toLowerCase() as ContentCategory;
    
    // Validate category
    const validCategories: ContentCategory[] = ['vocabulary', 'math', 'science', 'history', 'language', 'definitions', 'general'];
    if (validCategories.includes(cleanCategory)) {
      console.log(`Detected content category: ${cleanCategory}`);
      return cleanCategory;
    }
    
    console.log(`Unknown category "${cleanCategory}", defaulting to general`);
    return 'general';
  } catch (error) {
    console.error("Error detecting category, defaulting to general:", error);
    return 'general';
  }
}

/**
 * Gets the appropriate prompt for a given category
 */
function getPromptForCategory(category: ContentCategory): string {
  return CATEGORY_PROMPTS[category] || CATEGORY_PROMPTS.general;
}

/**
 * Generates flashcards from an image using Gemini
 */
export async function generateFlashcardsFromImage(
  imageUri: string
): Promise<GeneratedFlashcard[]> {
  try {
    const base64Image = await prepareImageForAI(imageUri);
    
    // Phase 1: Detect content category
    const category = await detectContentCategory(
      "Analyze this image content",
      "image/jpeg",
      base64Image
    );
    
    // Phase 2: Generate flashcards with specialized prompt
    const categoryPrompt = getPromptForCategory(category);
    const prompt = `${categoryPrompt}\n\nAnalyze this image and create flashcards.`;
    
    const responseText = await generateWithGemini(prompt, "image/jpeg", base64Image);
    return parseFlashcardsFromResponse(responseText);
  } catch (error) {
    console.error("Error generating flashcards from image:", error);
    throw error;
  }
}

/**
 * Generates flashcards from text content using Gemini
 */
export async function generateFlashcardsFromText(
  text: string
): Promise<GeneratedFlashcard[]> {
  try {
    // Phase 1: Detect content category
    const contentPreview = text.substring(0, 1000); // Use first 1000 chars for detection
    const category = await detectContentCategory(contentPreview);
    
    // Phase 2: Generate flashcards with specialized prompt
    const categoryPrompt = getPromptForCategory(category);
    const prompt = `${categoryPrompt}\n\nMaterial:\n${text}`;
    
    const responseText = await generateWithGemini(prompt);
    return parseFlashcardsFromResponse(responseText);
  } catch (error) {
    console.error("Error generating flashcards from text:", error);
    throw error;
  }
}

/**
 * Generates flashcards from a PDF file using Gemini
 */
export async function generateFlashcardsFromPDF(
  fileUri: string
): Promise<GeneratedFlashcard[]> {
  try {
    const base64Data = await FileSystem.readAsStringAsync(fileUri, {
      encoding: FileSystem.EncodingType.Base64,
    });
    
    // Phase 1: Detect content category
    const category = await detectContentCategory(
      "Analyze this PDF document content",
      "application/pdf",
      base64Data
    );
    
    // Phase 2: Generate flashcards with specialized prompt
    const categoryPrompt = getPromptForCategory(category);
    const prompt = `${categoryPrompt}\n\nAnalyze this PDF document and create flashcards.`;
    
    const responseText = await generateWithGemini(prompt, "application/pdf", base64Data);
    return parseFlashcardsFromResponse(responseText);
  } catch (error: any) {
    console.error("PDF processing error:", error);
    throw new Error("Failed to process PDF with Gemini: " + (error.message || "Unknown error"));
  }
}

/**
 * Generates flashcards from any file type
 */
export async function generateFlashcardsFromFile(
  fileUri: string,
  mimeType?: string
): Promise<GeneratedFlashcard[]> {
  try {
    const fileName = fileUri.toLowerCase();
    
    // Handle PDFs
    if (mimeType === "application/pdf" || fileName.endsWith(".pdf")) {
      return await generateFlashcardsFromPDF(fileUri);
    }
    
    // Handle images
    if (
      mimeType?.startsWith("image/") ||
      fileName.endsWith(".jpg") ||
      fileName.endsWith(".jpeg") ||
      fileName.endsWith(".png") ||
      fileName.endsWith(".gif") ||
      fileName.endsWith(".webp")
    ) {
      return await generateFlashcardsFromImage(fileUri);
    }
    
    // Handle text files
    if (
      mimeType?.startsWith("text/") ||
      fileName.endsWith(".txt") ||
      fileName.endsWith(".md")
    ) {
      const content = await FileSystem.readAsStringAsync(fileUri, {
        encoding: FileSystem.EncodingType.UTF8,
      });
      return await generateFlashcardsFromText(content);
    }
    
    throw new Error("Unsupported file type. Please use images, PDFs, or text documents.");
  } catch (error) {
    throw error;
  }
}
