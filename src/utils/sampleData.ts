import { useFlashcardStore } from "../state/flashcardStore";

export const useSampleData = () => {
  const addDeck = useFlashcardStore((s) => s.addDeck);
  const addFlashcard = useFlashcardStore((s) => s.addFlashcard);
  const decks = useFlashcardStore((s) => s.decks);

  const loadSampleData = () => {
    if (decks.length > 0) return; // Don't load if data already exists

    // Biology Deck
    const biologyDeck = addDeck(
      "Cell Structure",
      "#10b981",
      "🧬",
      new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      "TEST_PREP"
    );

    addFlashcard(
      biologyDeck,
      "What is the powerhouse of the cell?",
      "Mitochondria - it produces ATP through cellular respiration"
    );
    addFlashcard(
      biologyDeck,
      "What does the nucleus contain?",
      "The nucleus contains the cell's genetic material (DNA) and controls cell activities"
    );
    addFlashcard(
      biologyDeck,
      "What is the function of ribosomes?",
      "Ribosomes synthesize proteins by translating mRNA"
    );
    addFlashcard(
      biologyDeck,
      "What is the endoplasmic reticulum?",
      "A network of membranes for protein and lipid synthesis. Rough ER has ribosomes, smooth ER does not"
    );

    // Calculus Deck
    const calculusDeck = addDeck(
      "Derivatives",
      "#3b82f6",
      "📐",
      new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
      "TEST_PREP"
    );

    addFlashcard(
      calculusDeck,
      "What is the power rule?",
      "d/dx[x^n] = nx^(n-1)"
    );
    addFlashcard(
      calculusDeck,
      "What is the derivative of sin(x)?",
      "cos(x)"
    );
    addFlashcard(calculusDeck, "What is the derivative of e^x?", "e^x");
    addFlashcard(calculusDeck, "What is the derivative of ln(x)?", "1/x");

    // History Deck
    const historyDeck = addDeck(
      "World War II",
      "#f59e0b",
      "📚",
      new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
      "TEST_PREP"
    );

    addFlashcard(
      historyDeck,
      "When did World War II begin?",
      "September 1, 1939 with the invasion of Poland"
    );
    addFlashcard(
      historyDeck,
      "What was D-Day?",
      "June 6, 1944 - Allied invasion of Normandy, France"
    );
    addFlashcard(
      historyDeck,
      "When did World War II end?",
      "September 2, 1945 with Japan's formal surrender"
    );

    // Chemistry Deck
    const chemistryDeck = addDeck(
      "Periodic Table",
      "#8b5cf6",
      "⚗️",
      new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
      "TEST_PREP"
    );

    addFlashcard(
      chemistryDeck,
      "What are the noble gases?",
      "Group 18 elements: Helium, Neon, Argon, Krypton, Xenon, Radon - they are very stable and unreactive"
    );
    addFlashcard(
      chemistryDeck,
      "What are alkali metals?",
      "Group 1 elements: Lithium, Sodium, Potassium, etc. - highly reactive metals"
    );
    addFlashcard(
      chemistryDeck,
      "What is the atomic number?",
      "The number of protons in an atom's nucleus"
    );
  };

  return { loadSampleData };
};
