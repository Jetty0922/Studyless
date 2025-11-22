/*
Claude API Service for PDF Processing (React Native Compatible)
Uses direct HTTP calls instead of Node.js SDK
Anthropic's Claude API natively supports PDF documents
*/

export interface ClaudeResponse {
  content: string;
  usage?: {
    inputTokens: number;
    outputTokens: number;
  };
}

const CLAUDE_API_URL = "https://api.anthropic.com/v1/messages";
const CLAUDE_API_VERSION = "2023-06-01";

/**
 * Get Claude API key from environment
 */
const getClaudeApiKey = (): string => {
  const apiKey = process.env.EXPO_PUBLIC_CLAUDE_API_KEY;
  if (!apiKey) {
    throw new Error("Claude API key not found in environment variables");
  }
  return apiKey;
};

/**
 * Process a PDF file with Claude using direct HTTP API
 * Claude natively supports PDF documents
 */
export const processDocumentWithClaude = async (
  base64Data: string,
  mimeType: string,
  prompt: string
): Promise<ClaudeResponse> => {
  try {
    const apiKey = getClaudeApiKey();

    const response = await fetch(CLAUDE_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": CLAUDE_API_VERSION,
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-5-20250929",
        max_tokens: 16000,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "document",
                source: {
                  type: "base64",
                  media_type: mimeType,
                  data: base64Data,
                },
              },
              {
                type: "text",
                text: prompt,
              },
            ],
          },
        ],
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        `Claude API error: ${response.status} - ${JSON.stringify(errorData)}`
      );
    }

    const data = await response.json();

    // Extract text content from response
    const textContent = data.content
      .filter((block: any) => block.type === "text")
      .map((block: any) => block.text)
      .join("\n");

    return {
      content: textContent,
      usage: {
        inputTokens: data.usage?.input_tokens || 0,
        outputTokens: data.usage?.output_tokens || 0,
      },
    };
  } catch (error) {
    console.error("Claude API Error:", error);
    throw error;
  }
};

/**
 * Process an image with Claude Vision using direct HTTP API
 */
export const processImageWithClaude = async (
  base64Data: string,
  mimeType: string,
  prompt: string
): Promise<ClaudeResponse> => {
  try {
    const apiKey = getClaudeApiKey();

    const response = await fetch(CLAUDE_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": CLAUDE_API_VERSION,
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-5-20250929",
        max_tokens: 16000,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "image",
                source: {
                  type: "base64",
                  media_type: mimeType,
                  data: base64Data,
                },
              },
              {
                type: "text",
                text: prompt,
              },
            ],
          },
        ],
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        `Claude API error: ${response.status} - ${JSON.stringify(errorData)}`
      );
    }

    const data = await response.json();

    const textContent = data.content
      .filter((block: any) => block.type === "text")
      .map((block: any) => block.text)
      .join("\n");

    return {
      content: textContent,
      usage: {
        inputTokens: data.usage?.input_tokens || 0,
        outputTokens: data.usage?.output_tokens || 0,
      },
    };
  } catch (error) {
    console.error("Claude API Error:", error);
    throw error;
  }
};

