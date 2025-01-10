import fs from 'fs/promises';
import path from 'path';
import puppeteer from 'puppeteer';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { bikeInfo, productUrl } = req.body;

  if (!bikeInfo || !productUrl) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  // Initialisation de la variable result
  let result = {
    compatibility: 'Non disponible',
    confidence: 'Non disponible',
    argument: 'Non disponible',
  };

  // Extraire uniquement la partie utile de l'URL pour le produit et le vélo
  const cleanedProductUrl =
    productUrl.split('/').pop()?.split('?')[0]?.toLowerCase() || productUrl;
  const cleanedBikeUrl =
    bikeInfo.split('/').pop()?.split('?')[0]?.toLowerCase() || bikeInfo;

  let productData;
  let bikeData;
  let productH1 = '';
  let productDescriptionFromFP = '';

  try {
    // Charger le fichier JSON externe
    const filePath = path.join(
      process.cwd(),
      'pages',
      'api',
      'data',
      'data_bike_flux.json',
    );
    const jsonData = await fs.readFile(filePath, 'utf8');
    const products = JSON.parse(jsonData);

    productData = products.find(
      (product) =>
        product.link.split('/').pop()?.split('?')[0]?.toLowerCase() ===
        cleanedProductUrl,
    );

    bikeData = products.find(
      (bike) =>
        bike.link.split('/').pop()?.split('?')[0]?.toLowerCase() ===
        cleanedBikeUrl,
    );
  } catch (error) {
    console.error('Erreur lors du chargement du fichier JSON:', error);
  }

  // Scraping du H1 de la page produit et de la description
  try {
    const browser = await puppeteer.launch({ headless: 'new' });
    const page = await browser.newPage();
    await page.goto(productUrl, { waitUntil: 'domcontentloaded' });

    productH1 = await page.$eval('h1', (element) => element.textContent.trim());

    productDescriptionFromFP = await page
      .$eval('.product-description-text', (element) =>
        element.textContent.trim(),
      )
      .catch(() => 'Description non disponible');

    await browser.close();
  } catch (error) {
    console.error('Erreur lors du scraping du H1 ou de la description:', error);
  }

  // Vérifie si les informations produit sont disponibles dans le JSON
  let productDescription = '';
  let bikeDescription = '';

  if (productData) {
    productDescription = `
      **Produit :** ${productData.title || 'Non disponible'}
      **Description :** ${productData.description || 'Non disponible'}
      **Marque :** ${productData.brand || 'Non disponible'}
      **Prix :** ${productData.price || 'Non disponible'}
      **Catégorie :** ${productData.category || 'Non disponible'}
      **Lien :** ${productData.link || 'Non disponible'}
    `;
  }

  if (bikeData) {
    bikeDescription = `
      **Vélo :** ${bikeData.title || 'Non disponible'}
      **Description :** ${bikeData.description || 'Non disponible'}
      **Marque :** ${bikeData.brand || 'Non disponible'}
      **Prix :** ${bikeData.price || 'Non disponible'}
      **Catégorie :** ${bikeData.category || 'Non disponible'}
      **Lien :** ${bikeData.link || 'Non disponible'}
    `;
  }

  try {
    const response = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.PERPLEXITY_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.1-sonar-small-128k-online',
        messages: [
          {
            role: 'user',
            content: `
  Tu es un mécanicien vélo expert. Ta mission est de vérifier la compatibilité entre un vélo spécifique et un boîtier de pédalier référencé sur le site Alltricks. La réponse doit être précise, technique, et basée sur des sources vérifiées, telles que les manuels des fabricants (DT Swiss, Shimano, SRAM, Campagnolo), les fiches techniques des vélos, et les guides d’entretien certifiés (Park Tool). Si la compatibilité est incertaine, fournir des recommandations alternatives."
  
  ✅ Tâche à réaliser :
  1️⃣ Informations vélo à analyser :
  Marque, Modèle, Année
  Transmission installée (Shimano, SRAM, etc.)
  
  2️⃣ Spécifications du boîtier de pédalier :
  Tu auras accès à l'URL du produit sur Alltricks, contenant les données suivantes :
  Largeur (en mm), Diamètre du boîtier de pédalier, Type de boitier (BSA, BB30, PressFit, etc.)
  
  🔧 Critères d'évaluation :
  Largeur : Correspondance avec le cadre du vélo.
  Diamètre : Vérifie si le standard correspond (BSA, BB30, etc.).
  Type de roulements : Compatibilité avec le pédalier du vélo.
  
Ne partage aucune autre information que :
  Compatibilité : Oui / Non
  Niveau de confiance : Bas / Moyen / Élevé
  Justification (max. 80 caractères)
  
  Boitier de pédalier à tester :** ${productDescriptionFromFP}
  Vélo à tester :** ${bikeInfo},
  `,
          },
        ],
      }),
    });

    if (!response.ok) {
      throw new Error(`Erreur API Perplexity : ${response.statusText}`);
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content || '';

    console.log('Contenu extrait:', content);

    result = {
      compatibility:
        content.match(/Compatibilité\s*:\s*(Oui|Non)/i)?.[1] === 'Oui'
          ? '✔️ Compatible'
          : '❌ Non compatible',
      confidence:
        content.match(/Niveau de Confiance\s*:\s*(Bas|Moyen|Élevé)/i)?.[1] ||
        'Non disponible',
      argument:
        content
          .match(/\*\*Justification\s*:\*\*\s*([\s\S]*?)(?=\n|$)/i)?.[1]
          ?.trim() || 'Argument non disponible',
    };
  } catch (error) {
    console.error(
      'Erreur lors de la récupération des données Perplexity:',
      error,
    );
    result = {
      compatibility: 'Non disponible',
      confidence: 'Non disponible',
      argument: 'Non disponible',
    };
  }

  res.status(200).json({
    productDescription,
    bikeDescription,
    productH1,
    productDescriptionFromFP,
    result,
  });
}
