export default async function handler(req, res) {
  // Add CORS headers
  res.setHeader("Access-Control-Allow-Credentials", true);
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS,PATCH,DELETE,POST,PUT");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version"
  );

  if (req.method === "OPTIONS") {
    res.status(200).end();
    return;
  }

  if (req.method !== "POST") {
    res.status(405).json({ error: `Method ${req.method} not allowed` });
    return;
  }

  const { image, mimeType } = req.body || {};

  if (!image) {
    res.status(400).json({ error: "Missing 'image' in request body." });
    return;
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error("GEMINI_API_KEY environment variable is not defined");
    // Return a mock payload if the API key is not configured, so the demo doesn't crash during hackathon reviews
    res.status(200).json({
      isMock: true,
      warning: "GEMINI_API_KEY is not set on the backend. Showing mock data for demo purposes.",
      entries: [
        { name: "Ramesh Kumar", date: "2026-07-01", description: "Rice 5kg, Sugar 2kg", amount: 650, confidence: 0.95 },
        { name: "Sunita Devi", date: "2026-07-02", description: "Mustard Oil 1L, Soap", amount: 260, confidence: 0.88 },
        { name: "Arjun Singh", date: "2026-07-03", description: "Spices, Tea Powder", amount: 150, confidence: 0.62 },
        { name: "Meena Traders", date: "2026-07-04", description: "Wheat Flour 10kg", amount: 480, confidence: 0.92 }
      ]
    });
    return;
  }

  try {
    // Standardize base64 and mimeType
    let base64Data = image;
    let finalMimeType = mimeType || "image/jpeg";

    if (typeof image === "string" && image.includes(";base64,")) {
      const parts = image.split(";base64,");
      finalMimeType = parts[0].replace("data:", "") || finalMimeType;
      base64Data = parts[1];
    }

    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

    const promptText = `Analyze this handwritten shop ledger or register page and extract all transaction entries.
For each transaction, extract the following:
- name: The name of the customer (e.g. "Ramesh", "Sunita"). Keep it clean and capitalized.
- date: The date of transaction in YYYY-MM-DD format. If the date is not specified or partially specified, infer the date or use the current year 2026, or today's date (2026-07-08) as fallback.
- description: Details of items bought or description (e.g. "Rice 5kg", "Cigarette, Tea").
- amount: The numeric value of the transaction amount (must be an integer or float, e.g. 450, 120.50). Do not include currency symbols.
- confidence: Your confidence score for this extraction as a float between 0.0 and 1.0 based on image readability. For confidence, be strictly calibrated PER ENTRY — do not give all entries the same score. Reduce confidence when: handwriting is unclear or cursive, the entry uses ditto marks (") inherited from a row above, text is crossed out or overwritten, the amount has ambiguous digits, or lighting/angle obscures the row. A clean legible row = 0.9+, an inferred or partially guessed field = 0.5-0.75, barely readable = below 0.5.

Return ONLY a valid JSON object matching the following structure:
{
  "entries": [
    {
      "name": "string",
      "date": "string",
      "description": "string",
      "amount": number,
      "confidence": number
    }
  ]
}

Ensure your response is raw JSON. Do not include markdown code block styling like \`\`\`json or \`\`\`. Do not include any explanations.`;

    const requestBody = {
      contents: [
        {
          parts: [
            {
              inlineData: {
                mimeType: finalMimeType,
                data: base64Data
              }
            },
            {
              text: promptText
            }
          ]
        }
      ],
      generationConfig: {
        responseMimeType: "application/json"
      }
    };

    const response = await fetch(geminiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      if (response.status === 429) {
        res.status(429).json({ error: "AI is busy — tap to retry" });
        return;
      }
      const errText = await response.text();
      throw new Error(`Gemini API error (status ${response.status}): ${errText}`);
    }

    const result = await response.json();
    const responseText = result.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!responseText) {
      throw new Error("Empty response received from Gemini API");
    }

    // Strip markdown code fences if Gemini ignores responseMimeType
    let cleanedText = responseText.trim();
    if (cleanedText.startsWith("```")) {
      cleanedText = cleanedText.replace(/^```json\s*/i, "").replace(/```$/, "").trim();
    }

    const parsedJson = JSON.parse(cleanedText);

    // Validate the response format
    if (!parsedJson || !Array.isArray(parsedJson.entries)) {
      throw new Error("Invalid output format: entries array is missing.");
    }

    res.status(200).json({ entries: parsedJson.entries });
  } catch (error) {
    console.error("AI extraction error:", error);
    res.status(500).json({
      error: "Failed to extract ledger entries",
      details: error.message
    });
  }
}
