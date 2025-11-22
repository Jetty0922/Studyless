import { Alert } from "react-native";
import { getOpenAIChatResponse, getOpenAITextResponse } from "../api/chat-service";
import { processDocumentWithClaude, processImageWithClaude } from "../api/claude";
import * as FileSystem from "expo-file-system";

export interface GeneratedFlashcard {
  front: string;
  back: string;
}

/**
 * Converts an image to base64
 */
async function imageToBase64(imageUri: string): Promise<string> {
  try {
    const base64 = await FileSystem.readAsStringAsync(imageUri, {
      encoding: FileSystem.EncodingType.Base64,
    });
    return base64;
  } catch (error) {
    console.error("Error converting image to base64:", error);
    throw error;
  }
}

/**
 * Parses flashcards from AI response, handling various formats
 */
function parseFlashcardsFromResponse(content: string): GeneratedFlashcard[] {
  // Remove markdown code blocks if present
  let cleanContent = content.trim();
  
  // Remove ```json or ``` markers
  cleanContent = cleanContent.replace(/```json\s*/g, '');
  cleanContent = cleanContent.replace(/```\s*/g, '');
  
  // Try to find JSON array
  const jsonMatch = cleanContent.match(/\[[\s\S]*\]/);
  if (!jsonMatch) {
    console.error("Could not find JSON array in response:", content);
    throw new Error("Could not parse flashcards from response. The AI did not return a valid JSON array.");
  }

  try {
    const flashcards: GeneratedFlashcard[] = JSON.parse(jsonMatch[0]);

    if (!Array.isArray(flashcards)) {
      throw new Error("Response is not an array");
    }

    if (flashcards.length === 0) {
      throw new Error("No flashcards generated");
    }

    // Validate flashcard structure
    const validFlashcards = flashcards.filter(
      (card) => 
        card && 
        typeof card === 'object' && 
        typeof card.front === 'string' && 
        typeof card.back === 'string' &&
        card.front.trim().length > 0 &&
        card.back.trim().length > 0
    );

    if (validFlashcards.length === 0) {
      throw new Error("No valid flashcards found in response");
    }

    return validFlashcards;
  } catch (error) {
    console.error("Error parsing JSON:", error);
    console.error("Content:", content);
    throw new Error("Could not parse flashcards. The AI response was not in the expected format.");
  }
}

/**
 * Generates flashcards from an image using AI vision models
 * Uses OpenAI GPT-4 Vision by default with Claude as fallback
 */
export async function generateFlashcardsFromImage(
  imageUri: string
): Promise<GeneratedFlashcard[]> {
  try {
    console.log("=== IMAGE PROCESSING ===");
    
    const base64Image = await imageToBase64(imageUri);
    
    const prompt = `You are an expert educator creating CONCISE study flashcards. Analyze this image and extract ALL key concepts.

CRITICAL RULES:
1. Create flashcards for EVERY important concept, definition, formula, or fact
2. Keep answers SHORT and FOCUSED - only core information
3. One concept per card - break complex topics into multiple cards
4. NO lengthy explanations unless absolutely essential

CARD FORMAT:
For concepts/definitions/terms:
- Front: Just the term name (e.g., "Photosynthesis")
- Back: Definition (+ example/description ONLY if necessary)

For other questions (processes, comparisons, etc.):
- Front: Question format (e.g., "What is...", "How does...", "Why...")
- Back: Concise answer (1-3 sentences max)

Guidelines:
- Extract ALL key concepts
- Focus on definitions, formulas, core facts, important processes
- Skip minor details and examples UNLESS they're crucial
- Keep it SHORT and TESTABLE

Format ONLY as JSON array:
[
  {"front": "Photosynthesis", "back": "Process by which plants convert light to energy"},
  {"front": "What causes...", "back": "Brief answer"}
]

Return ONLY the JSON array. No other text.`;

    // Try OpenAI first (faster, cheaper)
    try {
      console.log("🤖 Using OpenAI GPT-4 Vision...");
      const response = await getOpenAITextResponse([
        {
          role: "user",
          content: [
            { type: "text", text: prompt },
            {
              type: "image_url",
              image_url: {
                url: `data:image/jpeg;base64,${base64Image}`,
              },
            },
          ] as any,
        },
      ], {
        model: "gpt-4o",
        maxTokens: 16000,
      });

      const flashcards = parseFlashcardsFromResponse(response.content);
      console.log(`✅ Generated ${flashcards.length} flashcards with OpenAI`);
      return flashcards;
    } catch (openaiError) {
      console.log("⚠ OpenAI failed, trying Claude...");
      
      // Fallback to Claude Vision
      const response = await processImageWithClaude(
        base64Image,
        "image/jpeg",
        prompt
      );
      
      const flashcards = parseFlashcardsFromResponse(response.content);
      console.log(`✅ Generated ${flashcards.length} flashcards with Claude`);
      return flashcards;
    }
  } catch (error) {
    console.error("Error generating flashcards from image:", error);
    throw error;
  }
}

/**
 * Generates flashcards from text content
 */
export async function generateFlashcardsFromText(
  text: string
): Promise<GeneratedFlashcard[]> {
  try {
    const prompt = `You are an expert educator creating CONCISE study flashcards. Extract ALL key concepts from this material.

CRITICAL RULES:
1. Create flashcards for EVERY important concept, definition, formula, or fact
2. Keep answers SHORT and FOCUSED - only core information
3. One concept per card - break complex topics into multiple cards
4. NO lengthy explanations unless absolutely essential

Material:
${text}

CARD FORMAT:
For concepts/definitions/terms:
- Front: Just the term name (e.g., "Mitochondria")
- Back: Definition (+ example/description ONLY if necessary)

For other questions (processes, comparisons, etc.):
- Front: Question format (e.g., "What is...", "How does...", "Why...")
- Back: Concise answer (1-3 sentences max)

Format ONLY as JSON array:
[
  {"front": "Mitochondria", "back": "The powerhouse of the cell; produces ATP"},
  {"front": "How does osmosis work?", "back": "Water moves from high to low concentration"}
]

Return ONLY the JSON array. No other text.`;

    const response = await getOpenAIChatResponse(prompt);
    return parseFlashcardsFromResponse(response.content);
  } catch (error) {
    console.error("Error generating flashcards:", error);
    throw error;
  }
}

/**
 * Generates flashcards from a PDF file using Claude API
 * Claude natively supports PDF documents (both text and image-based)
 * Uses React Native-compatible HTTP calls
 */
export async function generateFlashcardsFromPDF(
  fileUri: string
): Promise<GeneratedFlashcard[]> {
  console.log("=== PDF PROCESSING WITH CLAUDE ===");
  
  try {
    const fileInfo = await FileSystem.getInfoAsync(fileUri);
    if (!fileInfo.exists) {
      throw new Error("File not found");
    }
    
    console.log(`📄 PDF file size: ${fileInfo.size} bytes`);
    
    const base64Data = await FileSystem.readAsStringAsync(fileUri, {
      encoding: FileSystem.EncodingType.Base64,
    });
    
    console.log(`✓ Read PDF as base64`);
    
    const prompt = `You are an expert educator creating CONCISE study flashcards. Analyze this PDF document and extract ALL key concepts.

CRITICAL RULES:
1. Create flashcards for EVERY important concept, definition, formula, or fact
2. Keep answers SHORT and FOCUSED - only core information
3. One concept per card
4. NO lengthy explanations unless absolutely essential

CARD FORMAT:
For concepts/definitions/terms:
- Front: Just the term name (e.g., "Mitochondria")
- Back: Definition (+ example/description ONLY if necessary)

For other questions:
- Front: Question format (e.g., "What is...", "How does...", "Why...")
- Back: Concise answer (1-3 sentences max)

Format ONLY as JSON array:
[
  {"front": "Term", "back": "Definition"},
  {"front": "How does X work?", "back": "Brief answer"}
]

Return ONLY the JSON array. No other text.`;

    console.log("🤖 Sending PDF to Claude API...");
    
    const response = await processDocumentWithClaude(
      base64Data,
      "application/pdf",
      prompt
    );
    
    console.log(`✓ Received response from Claude`);
    
    const flashcards = parseFlashcardsFromResponse(response.content);
    
    if (flashcards.length === 0) {
      throw new Error("No flashcards could be generated from this PDF");
    }
    
    console.log(`✅ Successfully generated ${flashcards.length} flashcards from PDF`);
    return flashcards;
    
  } catch (error: any) {
    console.error("=== PDF PROCESSING ERROR ===");
    console.error(error);
    
    throw new Error(
      "Failed to process PDF.\n\n" +
      (error.message || "Unknown error occurred") + "\n\n" +
      "💡 If this PDF is very large or complex, try:\n" +
      "• Breaking it into smaller sections\n" +
      "• Taking screenshots and using 'Upload Image'"
    );
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
    
    // Handle PDFs with Claude
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
    console.error("Error generating flashcards from file:", error);
    throw error;
  }
}
