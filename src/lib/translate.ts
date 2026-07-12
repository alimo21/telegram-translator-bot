export async function translateArabicToPersian(text: string): Promise<string> {
  if (!text || text.trim() === "") return text;
  
  try {
    // Use Google Translate free API
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=ar&tl=fa&dt=t&q=${encodeURIComponent(text)}`;
    
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
    });
    
    if (!response.ok) {
      console.error("Translation API error:", response.status);
      return text;
    }
    
    const data = await response.json();
    
    // Google Translate returns array of arrays
    if (data && data[0]) {
      const translated = data[0]
        .map((item: [string]) => item[0])
        .filter(Boolean)
        .join("");
      return translated || text;
    }
    
    return text;
  } catch (error) {
    console.error("Translation error:", error);
    return text;
  }
}
