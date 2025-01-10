'use client';

import PageGuard from './components/PageGuard.js';
import { useState, useEffect } from 'react';

export default function Home() {
  const [bikeInfo, setBikeInfo] = useState('');
  const [productUrl, setProductUrl] = useState('');
  const [response, setResponse] = useState(null);
  const [comment, setComment] = useState('');
  const [bugFormVisible, setBugFormVisible] = useState(false);
  const [showText, setShowText] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  // Utilisation de useEffect pour s'assurer que le code s'exécute uniquement côté client
  useEffect(() => {
    setHydrated(true);

    setBikeInfo('');
    setProductUrl('');
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const res = await fetch('/api/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bikeInfo, productUrl }),
      });

      const data = await res.json();
      setResponse(data);
    } catch (error) {
      console.error('Erreur:', error);
      setResponse({ error: 'Une erreur est survenue.' });
    }
  };

  if (!hydrated) {
    // Empêche le rendu côté serveur
    return null;
  }

  const handleBugReportSubmit = async () => {
    try {
      const res = await fetch(
        `https://api.airtable.com/v0/appuHLOX5Vhw76mUw/tblhAA1vA7rYLVhvQ`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${process.env.NEXT_PUBLIC_AIRTABLE_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            fields: {
              'Bike Info': bikeInfo,
              'Product URL': productUrl,
              'API Response': JSON.stringify(response),
              Comment: comment,
            },
          }),
        },
      );

      if (res.ok) {
        alert('Bug report submitted successfully!');
        setComment('');
        setBugFormVisible(false);
      } else {
        throw new Error('Failed to submit bug report');
      }
    } catch (error) {
      console.error('Erreur:', error);
      alert('Failed to submit bug report.');
    }
  };

  return (
    <PageGuard>
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <div className="bg-white rounded-lg shadow-lg max-w-4xl w-full flex overflow-hidden">
          <div
            className="hidden md:flex flex-1 bg-cover bg-center rounded-l-lg"
            style={{
              backgroundImage:
                "url('https://cdn.pixabay.com/photo/2017/02/21/17/35/round-2086759_1280.jpg')",
            }}
          ></div>
          <div className="flex flex-col flex-1 p-8">
            <h3 className="text-2xl font-bold text-teal-700 mb-6">
              Bike Part Compatibility Checker
            </h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="input-group">
                <label
                  htmlFor="bike-info"
                  className="block text-sm text-gray-600"
                >
                  Bike Information
                </label>
                <input
                  type="text"
                  id="bike-info"
                  value={bikeInfo}
                  onChange={(e) => setBikeInfo(e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:border-teal-500 bg-gray-50"
                />
              </div>
              <div className="input-group">
                <label
                  htmlFor="product-url"
                  className="block text-sm text-gray-600"
                >
                  Product URL
                </label>
                <input
                  type="text"
                  id="product-url"
                  value={productUrl}
                  onChange={(e) => setProductUrl(e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:border-teal-500 bg-gray-50"
                />
              </div>
              <button
                type="submit"
                className="w-full p-3 bg-teal-700 text-white font-bold rounded-md hover:bg-teal-800 focus:outline-none"
              >
                Check Compatibility
              </button>
            </form>
            {response?.result && (
              <div
                id="response"
                className="mt-6 p-4 bg-gray-100 rounded-md border border-gray-300"
              >
                <h2 className="text-lg font-bold">Résultat :</h2>
                <div>
                  <p>Compatibilité : {response.result.compatibility}</p>
                  <p>Argumentation : {response.result.argument}</p>
                </div>
              </div>
            )}
            <div
              className="link mt-4 text-teal-700 underline cursor-pointer"
              id="report-bug-link"
              onClick={() => setBugFormVisible(!bugFormVisible)}
            >
              Report a bug
            </div>
            {bugFormVisible && (
              <div id="bug-form" className="mt-4">
                <textarea
                  id="comment"
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Add your comment here..."
                  className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:border-teal-500 bg-gray-50"
                ></textarea>
                <button
                  type="button"
                  id="submit-bug-button"
                  onClick={handleBugReportSubmit}
                  className="mt-3 w-full p-3 bg-teal-700 text-white font-bold rounded-md hover:bg-teal-800 focus:outline-none"
                >
                  Submit Bug Report
                </button>
              </div>
            )}
            <div className="mt-6">
              <p
                onClick={() => setShowText(!showText)}
                className="p-3 text-blue-900 font-bold rounded-md cursor-pointer hover:text-blue-700"
              >
                🔎 V0 10/01/25 - Prompt adapté pour les boîtiers de pédalier
              </p>

              {showText && (
                <div className="mt-4 p-4 bg-gray-100 rounded-md border border-gray-300">
                  <p className="mt-2 text-gray-800">
                    Tu es un mécanicien vélo expert. Ta mission est de vérifier
                    la compatibilité entre un vélo spécifique et un boîtier de
                    pédalier référencé sur le site Alltricks. La réponse doit
                    être précise, technique, et basée sur des sources vérifiées,
                    telles que les manuels des fabricants (DT Swiss, Shimano,
                    SRAM, Campagnolo), les fiches techniques des vélos, et les
                    guides d’entretien certifiés (Park Tool). Si la
                    compatibilité est incertaine, fournir des recommandations
                    alternatives." ✅ Tâche à réaliser : 1️⃣ Informations vélo à
                    analyser : Marque, Modèle, Année Transmission installée
                    (Shimano, SRAM, etc.) 2️⃣ Spécifications du boîtier de
                    pédalier : Tu auras accès à l'URL du produit sur Alltricks,
                    contenant les données suivantes : Largeur (en mm), Diamètre
                    du boîtier de pédalier, Type de boitier (BSA, BB30,
                    PressFit, etc.) 🔧 Critères d'évaluation : Largeur :
                    Correspondance avec le cadre du vélo. Diamètre : Vérifie si
                    le standard correspond (BSA, BB30, etc.). Type de roulements
                    : Compatibilité avec le pédalier du vélo. Ne partage aucune
                    autre information que : Compatibilité : Oui / Non Niveau de
                    confiance : Bas / Moyen / Élevé Justification (max. 80
                    caractères) Boitier de pédalier à tester :
                    productDescriptionFromFP Vélo à tester : bikeInfo,
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </PageGuard>
  );
}
