'use client';

import PageGuard from './components/PageGuard.js';
import { useState, useEffect } from 'react';

export default function Home() {
  const [bikeInfo, setBikeInfo] = useState('');
  const [productUrl, setProductUrl] = useState('');
  const [response, setResponse] = useState('');
  const [comment, setComment] = useState('');
  const [bugFormVisible, setBugFormVisible] = useState(false);

  useEffect(() => {
    setBikeInfo('');
    setProductUrl(
      'https://www.alltricks.fr/F-46291-roues-route_ville_fixie/P-2914753-roue_avant_fulcrum_racing_600_700_mm___qr_9x100_mm___patins',
    );
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
      setResponse(data.answer);
    } catch (error) {
      console.error('Erreur:', error);
      setResponse('Une erreur est survenue.');
    }
  };

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
              'API Response': response,
              ['Comment']: comment, // Syntaxe dynamique
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
            {response && (
              <div
                id="response"
                className="mt-6 p-4 bg-gray-100 rounded-md border border-gray-300"
              >
                {response}
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
          </div>
        </div>
      </div>
    </PageGuard>
  );
}
