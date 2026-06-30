const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const { createClient } = require('@supabase/supabase-js');

// 1. Initializations
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

let apiKeys = process.env.GEMINI_API_KEYS ? process.env.GEMINI_API_KEYS.split(',').map(k => k.trim()) : [];
if (process.env.GEMINI_API_KEY) {
  apiKeys.push(process.env.GEMINI_API_KEY.trim());
}
apiKeys = [...new Set(apiKeys)].filter(Boolean);
let currentKeyIndex = 0;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Error: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required in .env file.');
  process.exit(1);
}

if (apiKeys.length === 0) {
  console.error('Error: GEMINI_API_KEYS environment variable is required to analyze sticker images.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const STICKERS_DIR = path.join(__dirname, '../Stickers');
const PROGRESS_FILE = path.join(__dirname, 'import_progress.json');

// Mappings from directory names to product_category database enum values
const CATEGORY_MAP = {
  '0 random': 'Random',
  'ai': 'AI',
  'carton': 'Carton',
  'cats': 'Cats',
  'doctor': 'Doctor',
  'graphic design': 'Graphic Design',
  'harry potter': 'Harry Potter',
  'islamic': 'Islamic',
  'leters': 'Leters',
  'marketing': 'Marketing',
  'marvel': 'Marvel',
  'palestine': 'Palestine',
  'quotes': 'QUOTES',
  'smiski': 'smiski',
  'spshial': 'Spshial',
  'traffic': 'Traffic',
  'dogs': 'dogs',
  'foot ball': 'foot ball',
  'movie': 'movie',
  'programing': 'programing'
};

// Helper: load progress
function loadProgress() {
  if (fs.existsSync(PROGRESS_FILE)) {
    try {
      return JSON.parse(fs.readFileSync(PROGRESS_FILE, 'utf8'));
    } catch (e) {
      return { imported: {} };
    }
  }
  return { imported: {} };
}

// Helper: save progress
function saveProgress(progress) {
  fs.writeFileSync(PROGRESS_FILE, JSON.stringify(progress, null, 2), 'utf8');
}

// Helper: generate unique SKU
async function generateSKU(category) {
  const prefix = 'RNQ';
  const catCode = category.substring(0, 3).toUpperCase();
  
  const { data, error } = await supabase
    .from('products')
    .select('serial_number')
    .like('serial_number', `${prefix}-${catCode}-%`);

  if (error) throw error;

  let maxNum = 0;
  if (data && data.length > 0) {
    for (const row of data) {
      const parts = row.serial_number.split('-');
      const numStr = parts[parts.length - 1];
      const num = parseInt(numStr, 10);
      if (!isNaN(num) && num > maxNum) {
        maxNum = num;
      }
    }
  }

  const nextNum = maxNum + 1;
  return `${prefix}-${catCode}-${String(nextNum).padStart(4, '0')}`;
}

// Helper: get base64 of file
function fileToBase64(filePath) {
  const fileBuffer = fs.readFileSync(filePath);
  return fileBuffer.toString('base64');
}

// Helper: call Gemini to analyze image with auto-retry and key rotation
async function analyzeStickerImage(filePath) {
  const base64Data = fileToBase64(filePath);
  const ext = path.extname(filePath).toLowerCase();
  let mimeType = 'image/png';
  if (ext === '.jpg' || ext === '.jpeg') mimeType = 'image/jpeg';
  else if (ext === '.webp') mimeType = 'image/webp';

  const payload = {
    contents: [
      {
        parts: [
          {
            text: "Analyze this sticker design and return a JSON object containing a clean, attractive product title in Arabic (max 4 words) and a brief Arabic description (max 1 sentence). The title should describe what is visible in the sticker (e.g. 'ملصق قطة لطيفة تعزف جيتار', 'شعار مبرمج مضحك')."
          },
          {
            inlineData: {
              mimeType: mimeType,
              data: base64Data
            }
          }
        ]
      }
    ],
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: {
        type: "OBJECT",
        properties: {
          name: {
            type: "STRING",
            description: "Product title in Arabic (max 4 words)"
          },
          description: {
            type: "STRING",
            description: "Brief Arabic description (max 1 sentence)"
          }
        },
        required: ["name", "description"]
      }
    }
  };

  const maxRetries = 5;
  let attempt = 1;
  while (true) {
    if (currentKeyIndex >= apiKeys.length) {
      throw new Error('GEMINI_QUOTA_EXHAUSTED');
    }
    const activeKey = apiKeys[currentKeyIndex];
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${activeKey}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (response.status === 429) {
      const bodyText = await response.text();
      
      // Parse retry delay
      let delaySeconds = 30;
      try {
        const errObj = JSON.parse(bodyText);
        const retryInfo = errObj.error?.details?.find(d => d['@type']?.endsWith('RetryInfo'));
        if (retryInfo && retryInfo.retryDelay) {
          const match = String(retryInfo.retryDelay).match(/^(\d+)/);
          if (match) delaySeconds = parseInt(match[1], 10);
        } else {
          const msgMatch = errObj.error?.message?.match(/Please retry in ([\d\.]+)s/);
          if (msgMatch) delaySeconds = Math.ceil(parseFloat(msgMatch[1]));
        }
      } catch (e) {}

      const isDailyExhausted = bodyText.includes('GenerateRequestsPerDay') && delaySeconds > 3600;

      if (isDailyExhausted || attempt >= maxRetries) {
        console.warn(`\n[WARNING] Key ${currentKeyIndex + 1}/${apiKeys.length} exhausted or failed max retries. Rotating to next key...`);
        currentKeyIndex++;
        attempt = 1;
        await new Promise(res => setTimeout(res, 1000));
        continue;
      }

      console.warn(`\n[WARNING] Gemini rate limited (429) on key ${currentKeyIndex + 1}/${apiKeys.length}. Attempt ${attempt}/${maxRetries}. Waiting ${delaySeconds + 3} seconds...`);
      await new Promise(res => setTimeout(res, (delaySeconds + 3) * 1000));
      attempt++;
      continue;
    }

    if (!response.ok) {
      const errorBody = await response.text();
      if (response.status === 503 && attempt < maxRetries) {
        console.warn(`\n[WARNING] Gemini API 503 (Unavailable). Attempt ${attempt}/${maxRetries}. Waiting 15 seconds...`);
        await new Promise(res => setTimeout(res, 15000));
        attempt++;
        continue;
      }
      throw new Error(`Gemini API error: ${response.status} ${response.statusText} - ${errorBody}`);
    }

    const data = await response.json();
    const text = data.candidates[0].content.parts[0].text.trim();
    return JSON.parse(text);
  }
}

// Main logic
async function main() {
  console.log('--- Starting Sticker Import ---');
  if (!fs.existsSync(STICKERS_DIR)) {
    console.error(`Stickers directory not found at: ${STICKERS_DIR}`);
    process.exit(1);
  }

  const progress = loadProgress();
  const subdirs = fs.readdirSync(STICKERS_DIR).filter(f => fs.statSync(path.join(STICKERS_DIR, f)).isDirectory());

  const allFiles = [];
  for (const dir of subdirs) {
    const cleanDir = dir.toLowerCase().trim();
    const mappedCategory = CATEGORY_MAP[cleanDir];
    if (!mappedCategory) {
      console.log(`Skipping directory: "${dir}" (not in mapped categories)`);
      continue;
    }

    const dirPath = path.join(STICKERS_DIR, dir);
    const files = fs.readdirSync(dirPath).filter(f => {
      const ext = path.extname(f).toLowerCase();
      return ['.png', '.jpg', '.jpeg', '.webp'].includes(ext);
    });

    for (const file of files) {
      const filePath = path.join(dirPath, file);
      const relativeKey = `${dir}/${file}`;
      if (progress.imported[relativeKey]) {
        continue; // already imported
      }
      allFiles.push({ filePath, relativeKey, category: mappedCategory });
    }
  }

  console.log(`Total files to import: ${allFiles.length}`);

  let successCount = 0;
  let failCount = 0;
  let geminiQuotaExhausted = false;

  // Process files sequentially to respect API rate limits
  for (let i = 0; i < allFiles.length; i++) {
    const fileInfo = allFiles[i];
    const { filePath, relativeKey, category } = fileInfo;
    const fileExt = path.extname(filePath).toLowerCase();

    let attempts = 0;
    const maxAttempts = 3;
    let success = false;

    while (attempts < maxAttempts && !success) {
      try {
        console.log(`[${i + 1}/${allFiles.length}] Processing [${category}]: ${path.basename(filePath)} (Attempt ${attempts + 1})...`);

        // 1. Analyze image using Gemini ONLY (No fallback)
        const analysis = await analyzeStickerImage(filePath);

        // 2. Upload to Supabase Storage
        const fileBuffer = fs.readFileSync(filePath);
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}${fileExt}`;
        const storagePath = `products/${fileName}`;

        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('product-images')
          .upload(storagePath, fileBuffer, {
            contentType: fileExt === '.png' ? 'image/png' : 'image/jpeg',
            upsert: true
          });

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.supabaseUrl
          ? supabase.storage.from('product-images').getPublicUrl(storagePath)
          : { data: { publicUrl: `${SUPABASE_URL}/storage/v1/object/public/product-images/${storagePath}` } };

        // 3. Generate SKU
        const sku = await generateSKU(category);

        // 4. Insert into database
        const { data: productData, error: dbError } = await supabase
          .from('products')
          .insert({
            serial_number: sku,
            name: analysis.name,
            category: category,
            size: 'medium',
            price: 5.00,
            cost_price: 1.50,
            stock_quantity: 5,
            min_stock_level: 2,
            image_path: publicUrl,
            description: analysis.description,
            is_active: true
          })
          .select()
          .single();

        if (dbError) throw dbError;

        // 5. Update progress
        progress.imported[relativeKey] = {
          id: productData.id,
          sku,
          name: analysis.name,
          uploadedAt: new Date().toISOString()
        };
        saveProgress(progress);
        successCount++;
        console.log(`Successfully imported [${sku}]: ${analysis.name}`);
        success = true;

        // Rate limit helper: wait 4 seconds between requests
        await new Promise(res => setTimeout(res, 4000));
      } catch (err) {
        if (err.message === 'GEMINI_QUOTA_EXHAUSTED') {
          console.error('\n[FATAL] Gemini daily quota exhausted! Please change the API key and run the script again.');
          process.exit(1);
        } else {
          console.warn(`Error importing ${fileInfo.relativeKey} (Attempt ${attempts + 1}): ${err.message}. Waiting 15 seconds before retry...`);
          await new Promise(res => setTimeout(res, 15000));
          attempts++;
        }
      }
    }

    if (attempts === maxAttempts && !success) {
      console.error(`Failed to import ${fileInfo.relativeKey} after max attempts.`);
      failCount++;
    }
  }

  console.log(`\n--- Import Finished ---`);
  console.log(`Success: ${successCount}`);
  console.log(`Failed: ${failCount}`);
}

main().catch(err => {
  console.error('Fatal error in main execution:', err);
});
