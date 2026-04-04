export async function generateWorkoutOllama(prompt: string) {
  try {
    const response = await fetch('http://localhost:11434/api/generate', {
      method: 'POST',
      body: JSON.stringify({
        model: 'phi3:mini',
        prompt: prompt,
        stream: false,
        format: 'json'
      }),
    });
    
    if (!response.ok) throw new Error('Ollama connection failed');
    
    const data = await response.json();
    return JSON.parse(data.response);
  } catch (error) {
    console.error('Error connecting to Ollama:', error);
    return null;
  }
}
