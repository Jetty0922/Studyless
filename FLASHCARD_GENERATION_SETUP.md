# AI Flashcard Generation Setup

This document explains how to set up and use the AI-powered flashcard generation feature.

## Overview

The app now supports generating flashcards from:
- 📷 **Photos** (camera or gallery)
- 📄 **PDF files** (text-based PDFs)
- 📝 **Text documents** (.txt, .md, .doc, .docx)
- 🖼️ **Images** of notes, textbooks, or study materials

**Note about PDFs:** 
- **Text-based PDFs** (typed documents) work perfectly ✅
- **Image-based PDFs** (scanned pages) should be uploaded as images instead 📸
  - Take screenshots of pages
  - Or use "Upload Image" option for better OCR results

## Setting Up Your OpenAI API Key

### Step 1: Get an OpenAI API Key

1. Go to [OpenAI Platform](https://platform.openai.com/)
2. Sign up or log in to your account
3. Navigate to API Keys section
4. Create a new API key
5. Copy your API key (it starts with `sk-`)

### Step 2: Add the API Key to Your Project

You need to set the environment variable `EXPO_PUBLIC_VIBECODE_OPENAI_API_KEY` with your API key.

**Option 1: Create a `.env` file (Recommended)**

Create a file named `.env` in the root of your project:

```env
EXPO_PUBLIC_VIBECODE_OPENAI_API_KEY=sk-your-api-key-here
```

**Option 2: Set it directly in your shell**

```bash
export EXPO_PUBLIC_VIBECODE_OPENAI_API_KEY=sk-your-api-key-here
```

**Option 3: Add to app.json/app.config.js**

```json
{
  "expo": {
    "extra": {
      "EXPO_PUBLIC_VIBECODE_OPENAI_API_KEY": "sk-your-api-key-here"
    }
  }
}
```

### Step 3: Restart Your Development Server

After setting the API key, restart your Expo development server:

```bash
# Stop the current server (Ctrl+C)
# Then restart
npm start
# or
bun start
```

## How It Works

### 1. Generate Flashcards Button

From the Home screen, tap the **"Generate Flashcards"** button.

### 2. Choose Your Source

Select one of three options:
- **Take Photo**: Capture notes with your camera
- **Upload Image**: Choose an image from your gallery (great for scanned PDFs)
- **Upload File**: Select a PDF or text document (.pdf, .txt, .md, .docx)

### 3. AI Processing

The app will:
1. Send your file to GPT-4 Vision (for images/PDFs) or GPT-4 (for text)
2. Analyze the content
3. Generate 5-30 flashcards based on the material
4. This takes about 10-30 seconds

### 4. Review Generated Flashcards

You'll see:
- A preview of the first 3 flashcards
- The total number of flashcards generated
- Options to add them to a deck

### 5. Select a Deck

Choose to either:
- **Create a new deck** with custom settings:
  - Name
  - Study mode (Test Prep or Long-term)
  - Test date (for Test Prep mode)
  - Color and icon
- **Add to an existing deck**

### 6. Start Studying!

The flashcards are immediately added to your selected deck and ready for review.

## Technical Details

### AI Models Used

- **GPT-4o (Vision)**: For images and PDFs
  - Analyzes visual content
  - Reads text from images
  - Extracts key concepts
  
- **GPT-4o**: For text documents
  - Processes plain text
  - Identifies important concepts
  - Creates meaningful questions and answers

### File Support

| File Type | Supported | Method |
|-----------|-----------|--------|
| JPG/JPEG  | ✅ | Vision API (OCR) |
| PNG       | ✅ | Vision API (OCR) |
| GIF       | ✅ | Vision API (OCR) |
| WebP      | ✅ | Vision API (OCR) |
| PDF (text)| ✅ | Text extraction + GPT-4 |
| PDF (scan)| ⚠️ Use as image | Vision API recommended |
| TXT       | ✅ | Text extraction + GPT-4 |
| MD        | ✅ | Text extraction + GPT-4 |
| DOC/DOCX  | ✅ | Text extraction + GPT-4 |

### Flashcard Quality

The AI generates flashcards that:
- Test understanding, not just memorization
- Include definitions, formulas, and processes
- Cover all key information in the source material
- Have comprehensive but concise answers
- Follow best practices for effective studying

## Cost Considerations

Using the OpenAI API incurs costs based on:
- **Input tokens**: Size of your images/documents
- **Output tokens**: Number of flashcards generated

Typical costs per generation:
- Small image/document: ~$0.01-0.05
- Large PDF: ~$0.10-0.30

You can monitor your usage in the [OpenAI Dashboard](https://platform.openai.com/usage).

## Working with PDFs

The app supports two types of PDFs:

### Text-Based PDFs ✅ (Recommended Method)

For PDFs created from Word documents, typed notes, or digital textbooks:

1. Simply upload the PDF using "Upload File"
2. The app will extract all text content automatically
3. GPT-4 will generate comprehensive flashcards
4. No conversion needed!

**This works great for:**
- Digital textbooks
- Lecture notes (typed)
- Study guides
- Research papers
- Any PDF with selectable text

### Image-Based PDFs 📸 (Scanned Documents)

For PDFs that are scanned images (photos of pages):

**Option 1: Upload as Image (Recommended)**
1. Convert PDF pages to images or take screenshots
2. Use "Upload Image" option
3. GPT-4 Vision will OCR and extract content
4. Better accuracy for scanned content

**Option 2: Try Direct Upload**
1. Try uploading via "Upload File" first
2. If it fails, the app will suggest using images
3. Switch to image upload method

### How to Tell Which Type You Have:
- **Text-based**: You can select and copy text from the PDF
- **Image-based**: The PDF looks like photos/scans of pages

### Tips for Best Results:
- Text-based PDFs: Just upload directly! ✨
- Scanned PDFs: Use "Upload Image" for better OCR
- Large PDFs: Consider breaking into sections/chapters
- Mixed PDFs: Use images for scanned sections

## Troubleshooting

### "Generation Failed" Error

**Possible causes:**
1. API key not set or invalid
2. No OpenAI credits/billing set up
3. File too large or unsupported format
4. Network connection issues

**Solutions:**
- Verify your API key is set correctly
- Check your OpenAI account has credits
- Try a smaller file or different format
- Check your internet connection

### "No Content Found" Error

The AI couldn't extract meaningful content from your file.

**Solutions:**
- Ensure the image is clear and text is readable
- Try a different page or section
- For handwritten notes, ensure they're legible
- For PDFs, make sure they contain text (not just scanned images)

### App Crashes During Generation

**Solutions:**
- Close other apps to free up memory
- Restart the app
- Try a smaller file
- Update to the latest version

## Privacy & Security

- Files are sent to OpenAI's API for processing
- OpenAI's API doesn't use your data for training (per their policies)
- Your API key should be kept private
- Never commit your API key to version control

## Need Help?

If you encounter issues:
1. Check the console logs for detailed error messages
2. Verify your API key is correct
3. Test with a simple, clear image first
4. Contact support with error details

---

**Enjoy creating flashcards with AI! 🎓✨**

