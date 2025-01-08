export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Payload de la requête
  const body = {
    model: 'llama-3.1-sonar-small-128k-online',
    messages: [
      { role: 'system', content: 'Be precise and concise.' },
      { role: 'user', content: 'How many stars are there in our galaxy?' },
    ],
    max_tokens: 300, // Nombre entier
    temperature: 0.2,
    top_p: 0.9,
    search_domain_filter: ['perplexity.ai'],
    return_images: false,
    return_related_questions: false,
    search_recency_filter: 'month',
    top_k: 0,
    stream: false,
    presence_penalty: 0,
    frequency_penalty: 1,
  };

  // Options de la requête
  const options = {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.PERPLEXITY_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  };

  try {
    const response = await fetch(
      'https://api.perplexity.ai/chat/completions',
      options,
    );

    if (!response.ok) {
      throw new Error(`Erreur API : ${response.statusText}`);
    }

    const data = await response.json();

    // Log de la réponse complète
    console.log('Réponse complète :', data);

    // Retourner la réponse au client
    res.status(200).json({ answer: data.choices[0].message.content });
  } catch (error) {
    console.error('Erreur:', error);
    res.status(500).json({ error: error.message });
  }
}
