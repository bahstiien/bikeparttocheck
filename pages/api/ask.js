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

  console.log('H1:', productH1);
  console.log('Description du produit:', productDescriptionFromFP);

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

  // Effectue toujours l'appel à Perplexity pour enrichir les données
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
            Je souhaite vérifier la compatibilité d'une roue spécifique avec un vélo donné. Voici les détails :
            
            🔎 **Roue à tester :** ${productH1} et la description du produit ${productDescriptionFromFP}
            🚴 **Vélo cible :** ${bikeInfo}
            
            Fournis une analyse détaillée des points suivants :
            
            1️⃣ **Freins** : Vérifie si le type de freinage (disque ou patins) est compatible entre la roue et le vélo. Une différence de type de freinage doit entraîner une incompatibilité claire.
            
            2️⃣ **Dimensions de roue** : Vérifie le diamètre et la largeur des roues. Le diamètre des roues doit correspondre à celui du vélo.
            
            3️⃣ **Axe de fixation** : Vérifie la compatibilité entre le type d'axe (QR, Thru-Axle) et le cadre du vélo.
            
            La réponse doit être basée uniquement sur des **sources fiables** liées au produit exact. Les citations doivent inclure les fiches produit ou les manuels techniques correspondants.
            
            ### Format de réponse attendu :
            ✅ **Compatibilité :** Oui / Non
            🧠 **Niveau de confiance :** Bas / Moyen / Élevé
            💬 **Argumentation (max 50 caractères).**
            
            Si les citations ne concernent pas le produit exact, indique que la source n'est pas fiable.
            `,
          },
        ],
      }),
    });

    if (!response.ok) {
      throw new Error(`Erreur API Perplexity : ${response.statusText}`);
    }

    const data = await response.json();
    console.log('Réponse complète Perplexity:', data);
    const content = data.choices[0]?.message?.content || '';

    console.log('Contenu extrait:', content);

    const citations = data.citations || [];
    const validCitations = citations.filter((citation) =>
      citation.includes(cleanedProductUrl),
    );

    if (validCitations.length === 0) {
      console.error('Les citations ne concernent pas le produit exact.');
      return res.status(200).json({
        productDescription,
        bikeDescription,
        productH1,
        productDescriptionFromFP,
        result: {
          compatibility: '❌ Non compatible',
          confidence: 'Non disponible',
          argument: 'Citations non valides.',
        },
      });
    }
    PERPLEXITY_API_KEY;

    result = {
      compatibility:
        content.match(/✅ Compatibilité : (Oui|Non)/)?.[1] || 'Non disponible',
      confidence:
        content.match(/🧠 Niveau de confiance : (Bas|Moyen|Élevé)/)?.[1] ||
        'Non disponible',
      argument:
        content.match(/💬 Argumentation : (.{1,50})/)?.[1]?.trim() ||
        'Argument non disponible',
    };
  } catch (error) {
    console.error(
      'Erreur lors de la récupération des données Perplexity:',
      error,
    );
    return res.status(500).json({
      error: 'Impossible de récupérer les informations produit et vélo.',
    });
  }

  res.status(200).json({
    productDescription,
    bikeDescription,
    productH1,
    productDescriptionFromFP,
    result: {
      compatibility:
        result.compatibility === 'Non' ? '❌ Non compatible' : '✔️ Compatible',
      confidence: result.confidence,
      argument: result.argument,
    },
  });
}
