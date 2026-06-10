import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import clientPromise from '@/lib/mongodb';
import { promises as fs } from 'fs';
import path from 'path';
const PriceEmpireApi = process.env.PRICE_EMPIRE_API
interface PriceData {
  market_hash_name: string;
  prices: Array<{
    provider_key: string;
    price: number;
  }>;
}

interface ProcessedPrice {
  sell: number | null;
  buy: number | null;
}

interface ProcessedPrices {
  [baseSkinName: string]: {
    [wearCondition: string]: ProcessedPrice;
  };
}

/**
 * Download CS2 prices from PriceEmpire API
 */
async function downloadPrices(): Promise<PriceData[]> {
  const apiUrl = 'https://api.pricempire.com/v4/paid/items/prices?app_id=730&sources=steam,steam_buy,skinsmonkey,buff163,buff163_buy,skinport,haloskins,skinbaron,skinflow,dmarket,dmarket_buy&currency=USD&avg=false&median=false&inflation_threshold=-1&metas=liquidity,steam_last_7d,marketcap';
  const headers = {
    'Authorization': `Bearer ${PriceEmpireApi}`
  };

  try {
    console.log('Downloading prices from PriceEmpire API...');
    const response = await fetch(apiUrl, { headers });
    
    if (!response.ok) {
      throw new Error(`API request failed with status: ${response.status}`);
    }
    
    const data = await response.json();
    console.log('Successfully downloaded price data from API');
    return data;
  } catch (error) {
    console.error('Error downloading prices:', error);
    throw new Error(`Failed to download prices: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Save price data to file
 */
async function savePriceData(data: PriceData[], filePath: string): Promise<void> {
  try {
    // Ensure the price directory exists
    const priceDir = path.dirname(filePath);
    await fs.mkdir(priceDir, { recursive: true });
    
    await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf8');
    console.log(`Price data saved to: ${filePath}`);
  } catch (error) {
    console.error('Error saving price data:', error);
    throw new Error(`Failed to save price data: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Rename file with timestamp
 */
async function renameFileWithTimestamp(originalPath: string): Promise<string> {
  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const newPath = originalPath.replace('cs2_prices.json', `cs2_prices_${timestamp}.json`);
    
    await fs.rename(originalPath, newPath);
    console.log(`File renamed to: ${newPath}`);
    return newPath;
  } catch (error) {
    console.error('Error renaming file:', error);
    throw new Error(`Failed to rename file: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Load price data from uploaded file or default location
 */
async function loadPriceData(): Promise<PriceData[]> {
  try {
    const targetPath = path.join(process.cwd(), 'price/cs2_prices.json');
    
    // Check if file exists
    try {
      await fs.access(targetPath);
      console.log('Loading existing price data from file...');
      const data = await fs.readFile(targetPath, 'utf8');
      return JSON.parse(data);
    } catch (fileError) {
      // File doesn't exist, download from API
      console.log('Price file not found, downloading from API...');
      const priceData = await downloadPrices();
      
      // Save the downloaded data to file
      await savePriceData(priceData, targetPath);
      
      return priceData;
    }
  } catch (error) {
    console.error('Error loading price data:', error);
    throw new Error(`Failed to load price data: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Extract wear condition from market hash name
 */
function extractWearCondition(marketHashName: string): string | null {
  const wearPatterns = [
    { pattern: /Factory New/i, condition: 'FactoryNew' },
    { pattern: /Minimal Wear/i, condition: 'MinimalWear' },
    { pattern: /Field-Tested/i, condition: 'FieldTested' },
    { pattern: /Well-Worn/i, condition: 'WellWorn' },
    { pattern: /Battle-Scarred/i, condition: 'BattleScarred' }
  ];

  for (const { pattern, condition } of wearPatterns) {
    if (pattern.test(marketHashName)) {
      return condition;
    }
  }
  return null;
}

/**
 * Extract base skin name from market hash name (removing wear condition)
 */
function extractBaseSkinName(marketHashName: string): string {
  return marketHashName
    .replace(/\s*\(Factory New\)/i, '')
    .replace(/\s*\(Minimal Wear\)/i, '')
    .replace(/\s*\(Field-Tested\)/i, '')
    .replace(/\s*\(Well-Worn\)/i, '')
    .replace(/\s*\(Battle-Scarred\)/i, '')
    .trim();
}

/**
 * Check if item should be excluded (contains souvenir or StatTrak)
 */
function shouldExcludeItem(marketHashName: string): boolean {
  return marketHashName.toLowerCase().includes('souvenir') || 
         marketHashName.includes('StatTrak™');
}

/**
 * Process price data and group by skin name and wear condition
 */
function processPriceData(priceData: PriceData[]): ProcessedPrices {
  const processedPrices: ProcessedPrices = {};
  
  for (const item of priceData) {
    const { market_hash_name, prices } = item;
    
    // Skip items with souvenir or StatTrak
    if (shouldExcludeItem(market_hash_name)) {
      continue;
    }
    
    const wearCondition = extractWearCondition(market_hash_name);
    if (!wearCondition) {
      continue;
    }
    
    const baseSkinName = extractBaseSkinName(market_hash_name);
    
    if (!processedPrices[baseSkinName]) {
      processedPrices[baseSkinName] = {};
    }
    
    // Extract sell and buy prices
    let sellPrice: number | null = null;
    let buyPrice: number | null = null;
    
    for (const price of prices) {
      if (price.provider_key === 'steam') {
        sellPrice = price.price;
      } else if (price.provider_key === 'steam_buy') {
        buyPrice = price.price;
      }
    }
    
    if (sellPrice !== null || buyPrice !== null) {
      processedPrices[baseSkinName][wearCondition] = {
        sell: sellPrice,
        buy: buyPrice
      };
    }
  }
  
  return processedPrices;
}

/**
 * Update prices in MongoDB
 */
async function updatePrices(processedPrices: ProcessedPrices): Promise<{
  matchedCount: number;
  updatedCount: number;
  totalItems: number;
}> {
  const client = await clientPromise;
  const db = client.db();
  const collection = db.collection('csgoskins');
  
  // Get all items from database
  const items = await collection.find({}).toArray();
  console.log(`Found ${items.length} items in database`);
  
  let updatedCount = 0;
  let matchedCount = 0;
  
  // Update each item
  for (const item of items) {
    const skinName = item.name;
    const priceData = processedPrices[skinName];
    
    if (priceData) {
      matchedCount++;
      
      // Update the item with price data
      const result = await collection.updateOne(
        { _id: item._id },
        { 
          $set: { 
            price: priceData,
            price_updated_at: new Date()
          }
        }
      );
      
      if (result.modifiedCount > 0) {
        updatedCount++;
      }
    }
  }
  
  return {
    matchedCount,
    updatedCount,
    totalItems: items.length
  };
}

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    console.log('Starting price update process...');
    
    // Load price data
    console.log('Loading price data...');
    const priceData = await loadPriceData();
    const processedPrices = processPriceData(priceData);
    
    console.log(`Processed ${Object.keys(processedPrices).length} unique skin names`);
    
    // Update prices in MongoDB
    console.log('Updating prices in MongoDB...');
    const result = await updatePrices(processedPrices);
    
    // Rename the file with timestamp after successful database update
    const targetPath = path.join(process.cwd(), 'price/cs2_prices.json');
    let renamedFilePath = targetPath;
    
    try {
      renamedFilePath = await renameFileWithTimestamp(targetPath);
    } catch (renameError) {
      console.warn('Failed to rename file with timestamp:', renameError);
      // Continue execution even if renaming fails
    }
    
    console.log(`\nPrice update completed!`);
    console.log(`Items matched: ${result.matchedCount}`);
    console.log(`Items updated: ${result.updatedCount}`);
    console.log(`Items not found: ${result.totalItems - result.matchedCount}`);
    
    return NextResponse.json({
      success: true,
      message: 'Prices updated successfully',
      data: {
        processedSkins: Object.keys(processedPrices).length,
        matchedItems: result.matchedCount,
        updatedItems: result.updatedCount,
        totalItems: result.totalItems,
        unmatchedItems: result.totalItems - result.matchedCount,
        renamedFile: renamedFilePath !== targetPath ? renamedFilePath : null
      }
    }, { status: 200 });
    
  } catch (error) {
    console.error('Error updating prices:', error);
    return NextResponse.json({
      success: false,
      message: 'Failed to update prices',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function GET() {
  try {
    // Check authentication
    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    return NextResponse.json({
      message: 'Price update endpoint is ready. Use POST method to update prices.',
      usage: {
        method: 'POST',
        body: {
          filePath: 'optional - path to cs2_prices.json file'
        }
      }
    }, { status: 200 });
    
  } catch (error) {
    console.error('Error in GET request:', error);
    return NextResponse.json({
      success: false,
      message: 'Failed to process request',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
