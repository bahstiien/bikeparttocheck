'use client';

import { useState, useEffect } from 'react';

const PASSWORD = 'monSuperMotDePasse';

export default function PageGuard({ children }) {
  const [authorized, setAuthorized] = useState(false);
  const [inputPassword, setInputPassword] = useState('');

  useEffect(() => {
    const storedPassword = localStorage.getItem('app_password');
    if (storedPassword === PASSWORD) {
      setAuthorized(true);
    }
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (inputPassword === PASSWORD) {
      localStorage.setItem('app_password', inputPassword);
      setAuthorized(true);
    } else {
      alert('Mot de passe incorrect');
    }
  };

  if (authorized) {
    return <>{children}</>;
  }

  return (
    <div style={{ textAlign: 'center', marginTop: '50px' }}>
      <h2>Accès sécurisé</h2>
      <form onSubmit={handleSubmit}>
        <input
          type="password"
          placeholder="Entrez le mot de passe"
          value={inputPassword}
          onChange={(e) => setInputPassword(e.target.value)}
        />
        <button type="submit">Valider</button>
      </form>
    </div>
  );
}
