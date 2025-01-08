'use client';

import { useState } from 'react';

export default function Home() {
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState(null);

  const askQuestion = async () => {
    const res = await fetch('/api/ask', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ question }),
    });

    const data = await res.json();
    setAnswer(data);
  };

  return (
    <div>
      <h1>Perplexity Mini App</h1>
      <input
        type="text"
        value={question}
        onChange={(e) => setQuestion(e.target.value)}
        placeholder="Pose une question..."
      />
      <button onClick={askQuestion}>Poser la question</button>
      {answer && (
        <div>
          <strong>Réponse :</strong> {answer.answer}
        </div>
      )}
    </div>
  );
}
