import { Alert } from "react-native";
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
 * Common Prompt Template
 */
const SYSTEM_PROMPT = `You are an expert educator creating study flashcards. 

CRITICAL OUTPUT RULES:
1. Output ONLY a JSON array with "front" and "back" keys
2. One focused concept per card
3. Keep answers concise (1-3 sentences max)

CONTENT GUIDELINES:
- Extract ALL key concepts, definitions, formulas, and important facts
- Adapt your approach to the subject matter (math, history, science, etc.)
- For formulas/equations: include the formula and when to use it
- For definitions: include the term and its meaning
- For processes: break into logical steps if complex
- Prioritize information that appears emphasized or repeated in the source

Create enough cards to cover the material thoroughly, but avoid redundancy.`;

/**
 * Generates flashcards from an image using Gemini
 */
export async function generateFlashcardsFromImage(
  imageUri: string
): Promise<GeneratedFlashcard[]> {
  try {
    const base64Image = await prepareImageForAI(imageUri);
    
    const prompt = `${SYSTEM_PROMPT}\n\nAnalyze this image and create flashcards.`;
    
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
    const prompt = `${SYSTEM_PROMPT}\n\nMaterial:\n${text}`;
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
    
    const prompt = `${SYSTEM_PROMPT}\n\nAnalyze this PDF document and create flashcards.`;
    
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
