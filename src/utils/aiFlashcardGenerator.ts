import * as FileSystem from "expo-file-system";
import * as ImageManipulator from 'expo-image-manipulator';
import { generateWithGemini } from "../api/gemini";

export interface GeneratedFlashcard {
  front: string;
  back: string;
}

const FLASHCARD_PROMPT = `Generate flashcards from this study material.

**Output:** JSON array only: [{"front": "question", "back": "answer"}]

**Quantity:** Create cards for ALL important facts, concepts, and definitions. Aim for comprehensive coverage.

**Front:** What/How/Why questions. Keep concise.
**Back:** 1-3 sentences with the answer from the material.

**Rules:**
- ONE concept per card
- Cover ALL key information: definitions, facts, processes, relationships, lists
- For diagrams/visuals, create cards about what they represent
- Use only information from the material (no external knowledge)

**Example format:**
{"front": "What are the three types of X mentioned?", "back": "1. First\\n2. Second\\n3. Third"}`;

/**
 * Resizes large images for API limits
 */
async function prepareImageForAI(imageUri: string): Promise<string> {
  try {
    const fileInfo = await FileSystem.getInfoAsync(imageUri);
    const sizeInBytes = fileInfo.exists ? fileInfo.size : 0;
    const MAX_SIZE_BYTES = 4 * 1024 * 1024;

    let finalUri = imageUri;

    if (sizeInBytes > MAX_SIZE_BYTES) {
      const manipulatedImage = await ImageManipulator.manipulateAsync(
        imageUri,
        [{ resize: { width: 1500 } }], 
        { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG }
      );
      finalUri = manipulatedImage.uri;
    }

    return await FileSystem.readAsStringAsync(finalUri, {
      encoding: FileSystem.EncodingType.Base64,
    });
  } catch (error) {
    console.error("Error preparing image:", error);
    throw error;
  }
}

/**
 * Parses JSON flashcards from AI response
 */
function parseFlashcardsFromResponse(content: string): GeneratedFlashcard[] {
  let cleanContent = content.trim();
  cleanContent = cleanContent.replace(/```json\s*/g, '').replace(/```\s*/g, '');
  
  const jsonMatch = cleanContent.match(/\[[\s\S]*\]/);
  if (!jsonMatch) {
    throw new Error("AI returned invalid format. Try again or use different content.");
  }

  try {
    const flashcards: GeneratedFlashcard[] = JSON.parse(jsonMatch[0]);

    if (!Array.isArray(flashcards)) {
      throw new Error("AI returned invalid format. Try again.");
    }

    const validFlashcards = flashcards.filter(
      (card) => 
        card && 
        typeof card.front === 'string' && 
        typeof card.back === 'string' &&
        card.front.trim().length > 0
    );

    if (validFlashcards.length === 0) {
      throw new Error("No flashcards could be created from this content. Try clearer text or images.");
    }

    return validFlashcards;
  } catch (error) {
    throw new Error("AI returned invalid format. Try again or use different content.");
  }
}

/**
 * Generates flashcards from an image
 */
export async function generateFlashcardsFromImage(
  imageUri: string
): Promise<GeneratedFlashcard[]> {
  const base64Image = await prepareImageForAI(imageUri);
  const responseText = await generateWithGemini(FLASHCARD_PROMPT, "image/jpeg", base64Image);
  return parseFlashcardsFromResponse(responseText);
}

/**
 * Generates flashcards from multiple images
 * Processes each image and combines results
 */
export async function generateFlashcardsFromMultipleImages(
  imageUris: string[]
): Promise<GeneratedFlashcard[]> {
  if (imageUris.length === 0) {
    throw new Error("No images provided");
  }
  
  if (imageUris.length === 1) {
    return generateFlashcardsFromImage(imageUris[0]);
  }
  
  // Process all images in parallel
  const results = await Promise.all(
    imageUris.map(async (uri, index) => {
      try {
        return await generateFlashcardsFromImage(uri);
      } catch (error) {
        console.warn(`Failed to process image ${index + 1}:`, error);
        return []; // Return empty array for failed images
      }
    })
  );
  
  // Combine all flashcards
  const allFlashcards = results.flat();
  
  if (allFlashcards.length === 0) {
    throw new Error("Could not generate flashcards from any of the selected images.");
  }
  
  return allFlashcards;
}

/**
 * Generates flashcards from text
 */
export async function generateFlashcardsFromText(
  text: string
): Promise<GeneratedFlashcard[]> {
  const prompt = `${FLASHCARD_PROMPT}\n\nContent:\n${text}`;
  const responseText = await generateWithGemini(prompt);
  return parseFlashcardsFromResponse(responseText);
}

/**
 * Generates flashcards from a PDF
 */
export async function generateFlashcardsFromPDF(
  fileUri: string
): Promise<GeneratedFlashcard[]> {
  const base64Data = await FileSystem.readAsStringAsync(fileUri, {
    encoding: FileSystem.EncodingType.Base64,
  });
  const responseText = await generateWithGemini(FLASHCARD_PROMPT, "application/pdf", base64Data);
  return parseFlashcardsFromResponse(responseText);
}

/**
 * Generates flashcards from any supported file type
 */
export async function generateFlashcardsFromFile(
  fileUri: string,
  mimeType?: string
): Promise<GeneratedFlashcard[]> {
  const fileName = fileUri.toLowerCase();
  
  // PDFs
  if (mimeType === "application/pdf" || fileName.endsWith(".pdf")) {
    return generateFlashcardsFromPDF(fileUri);
  }
  
  // Images
  if (
    mimeType?.startsWith("image/") ||
    fileName.endsWith(".jpg") ||
    fileName.endsWith(".jpeg") ||
    fileName.endsWith(".png") ||
    fileName.endsWith(".gif") ||
    fileName.endsWith(".webp")
  ) {
    return generateFlashcardsFromImage(fileUri);
  }
  
  // Text files
  if (
    mimeType?.startsWith("text/") ||
    fileName.endsWith(".txt") ||
    fileName.endsWith(".md")
  ) {
    const content = await FileSystem.readAsStringAsync(fileUri, {
      encoding: FileSystem.EncodingType.UTF8,
    });
    return generateFlashcardsFromText(content);
  }
  
  throw new Error("Unsupported file type. Use images, PDFs, or text documents.");
}
