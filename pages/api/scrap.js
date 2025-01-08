import puppeteer from 'puppeteer';
import fs from 'fs/promises';
import path from 'path';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { bikeInfo, productUrl } = req.body;

  if (!productUrl) {
    return res.status(400).json({ error: 'Missing product URL' });
  }

  // Scraping du H1
  let h1Text = '';
  try {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    await page.goto(productUrl);

    h1Text = await page.$eval('h1', (element) => element.textContent.trim());

    await browser.close();
  } catch (error) {
    console.error('Erreur lors du scraping du H1:', error);
    return res.status(500).json({ error: 'Impossible de récupérer le H1.' });
  }

  // Ajout du H1 dans la réponse
  res.status(200).json({
    h1Text,
    message: `H1 récupéré avec succès : ${h1Text}`,
  });
}
