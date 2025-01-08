import fs from 'fs/promises';
import path from 'path';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { bikeInfo, productUrl } = req.body;

  // Vérifie que les champs sont bien fournis
  if (!bikeInfo || !productUrl) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  // Extraire uniquement la partie utile de l'URL pour le produit et le vélo
  const cleanedProductUrl =
    productUrl.split('/').pop()?.split('?')[0]?.toLowerCase() || productUrl;
  const cleanedBikeUrl =
    bikeInfo.split('/').pop()?.split('?')[0]?.toLowerCase() || bikeInfo;

  let productData;

  try {
    // Charger le fichier JSON externe
    const filePath = path.join(
      process.cwd(),
      'pages',
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
  } catch (error) {
    console.error('Erreur lors du chargement du fichier JSON:', error);
  }

  // Vérifie si les informations produit sont disponibles dans le JSON
  let productDescription = '';
  if (productData) {
    productDescription = `
      **Produit :** ${productData.title || 'Non disponible'}
      **Description :** ${productData.description || 'Non disponible'}
      **Marque :** ${productData.brand || 'Non disponible'}
      **Prix :** ${productData.price || 'Non disponible'}
      **Catégorie :** ${productData.category || 'Non disponible'}
      **Lien :** ${productData.link || 'Non disponible'}
      **Type :** ${productData.type || 'Non disponible'}
      **Sport :** ${productData.super_sport || 'Non disponible'}
      **Compatibilité modèle :** ${
        productData['Compatibilité plaquette modèle'] || 'Non disponible'
      }
      **Compatibilité marque :** ${
        productData['Compatibilité plaquette marque'] || 'Non disponible'
      }
    `;
  } else {
    // Si les données produit ne sont pas disponibles, interroge Perplexity pour obtenir les informations
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
                content: `Obtiens des informations détaillées sur le produit à l'URL : ${productUrl} et vérifie sa compatibilité avec le vélo suivant : ${bikeInfo}.`,
              },
            ],
          }),
        },
      );

      if (!response.ok) {
        throw new Error(`Erreur API Perplexity : ${response.statusText}`);
      }

      const data = await response.json();
      productDescription = `
        **Produit :** ${data.choices[0]?.message?.content || 'Non disponible'}
        **Lien :** ${productUrl}
      `;
      console.log(productDescription);
    } catch (error) {
      console.error(
        'Erreur lors de la récupération des données Perplexity:',
        error,
      );
      return res
        .status(500)
        .json({ error: 'Impossible de récupérer les informations produit.' });
    }
  }

  // Payload de la requête
  const body = {
    model: 'llama-3.1-sonar-small-128k-online',
    messages: [
      {
        role: 'system',
        content:
          'Tu es un expert en compatibilité de pièces détachées pour vélos (route, VTT, gravel, urbain). Ta mission est de analyser la compatibilité entre une pièce spécifique avec un vélo donné en prenant en compte les critères suivants : - Freinage : Vérifie si le type de freinage du vélo (patins ou disque) correspond à la pièce. Vérifie également la compatibilité hydraulique/mécanique et le type de fixation (Post Mount, Flat Mount, etc.) ; Roues et Pneus** : Vérifie le diamètre (700c, 29", 27.5"), la largeur de jante, le type de montage (tubeless, chambre à air), et la compatibilité de le axe (QR, thru-axle) ; **Transmission** : Vérifie le nombre de vitesses et la compatibilité inter-marques (Shimano, SRAM, Campagnolo). Vérifie également le standard de boîtier de pédalier (DUB, Hollowtech II, BB30, etc.).; **Cockpit** : Vérifie le diamètre du cintre, de la potence, et de la tige de selle. Vérifie également la compatibilité avec les guidons spécifiques (Drop Bar, Flat Bar).;**Cadre** : Vérifie les points de fixation (porte-bidon, garde-boue, porte-bagages) et la compatibilité électrique (Di2, AXS). Le format de réponse attendu : ** Compatibilité : Oui / Non **, Niveau de confiance : Bas / Moyen / Élevé ; Source : Flux produit / IAGen',
      },
      {
        role: 'user',
        content: `Tu es un expert en compatibilité de pièces détachées pour vélos. Voici les informations à analyser :

1️⃣ **Produit à tester :**
${productDescription}

2️⃣ **Vélo cible :**
🚲 **Bike Information:** ${bikeInfo}

📋 Analyse les points suivants :

- Le type de freinage du produit correspond-il au système de freinage du vélo ?
- L'axe de roue est-il compatible avec le cadre du vélo ?
- Les dimensions de la roue (diamètre, largeur) sont-elles compatibles avec le vélo ?

### 🔎 **Conclusion :**
✅ Compatibilité : Oui / Non
🧠 Niveau de confiance : Bas / Moyen / Élevé
📚 Source : Flux produit / IAGen
`,
      },
    ],
    max_tokens: 500,
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

    res.status(200).json({ answer: data.choices[0].message.content });
  } catch (error) {
    console.error('Erreur:', error);
    res.status(500).json({ error: error.message });
  }
}
