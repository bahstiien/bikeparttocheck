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

  // Scraping du H1 de la page produit
  try {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    await page.goto(productUrl);

    productH1 = await page.$eval('h1', (element) => element.textContent.trim());

    await browser.close();
  } catch (error) {
    console.error('Erreur lors du scraping du H1:', error);
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

  if (!productDescription && !bikeDescription) {
    // Si les données produit et vélo ne sont pas disponibles, interroge Perplexity pour obtenir les informations
    try {
      const response = await fetch(
        'https://api.perplexity.ai/chat/completions',
        {
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
                content: `Obtiens uniquement les détails critiques sur le produit : ${productH1} et sur le vélo à l'URL : ${bikeInfo}. Limite-toi au type de freinage, aux dimensions de roue, et à la compatibilité de l'axe. Vérifie que les freins du produit correspondent bien aux freins du vélo (disque ou patins). Si les types de freinage sont différents, la compatibilité doit être déclarée comme NON COMPATIBLE. La réponse doit être au format suivant :\n\n✅ Compatibilité : Oui / Non\n🧠 Niveau de confiance : Bas / Moyen / Élevé\n💬 Argumentation (une phrase de max 50 caractères).`,
              },
            ],
          }),
        },
      );

      if (!response.ok) {
        throw new Error(`Erreur API Perplexity : ${response.statusText}`);
      }

      const data = await response.json();
      const content = data.choices[0]?.message?.content || '';

      result = {
        compatibility:
          content.match(/✅ Compatibilité : (Oui|Non)/)?.[1] ||
          'Non disponible',
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
  }

  res.status(200).json({
    productDescription,
    bikeDescription,
    productH1,
    result,
  });
}
