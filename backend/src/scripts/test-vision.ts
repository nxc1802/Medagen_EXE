/**
 * Quick test: Gemini Vision phân tích ảnh da liễu
 * Chạy: npx tsx src/scripts/test-vision.ts
 */
import { GoogleGenerativeAI } from '@google/generative-ai';
import * as fs from 'fs';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(process.cwd(), '.env') });

const API_KEY = process.env.GOOGLE_API_KEY!;
const MODEL   = process.env.GOOGLE_MODEL_NAME || 'gemini-2.5-flash';

// Ảnh da liễu psoriasis đã download về local
const LOCAL_IMAGE_PATH = resolve(process.cwd(), 'src/scripts/test_skin.jpg');

const VISION_PROMPT = `Bạn là bác sĩ AI chuyên phân tích hình ảnh y tế. Hãy phân tích hình ảnh này và trả lời BẰNG TIẾNG VIỆT với format JSON sau (KHÔNG thêm markdown, chỉ JSON thuần):
{
  "observations": "mô tả ngắn gọn những gì thấy trong ảnh (màu sắc, hình dạng, vị trí tổn thương nếu có)",
  "suspected_conditions": ["tên bệnh 1", "tên bệnh 2"],
  "confidence": "high|medium|low",
  "image_quality": "good|poor",
  "notes": "ghi chú thêm nếu cần"
}

Thông tin từ người dùng: vùng da bị ngứa, đỏ, nổi mẩn
Chỉ trả về JSON, không giải thích thêm.`;

async function main() {
  console.log('='.repeat(60));
  console.log(`Model  : ${MODEL}`);
  console.log(`Image  : ${LOCAL_IMAGE_PATH}`);
  console.log('='.repeat(60));

  // Đọc ảnh từ file local
  console.log('\n[1] Reading local image...');
  const imgBuffer = fs.readFileSync(LOCAL_IMAGE_PATH);
  const base64    = imgBuffer.toString('base64');
  const mime      = 'image/jpeg';
  console.log(`    OK — ${(imgBuffer.byteLength / 1024).toFixed(1)} KB, type: ${mime}`);

  // Gọi Gemini Vision
  console.log('\n[2] Sending to Gemini Vision...');
  const genAI = new GoogleGenerativeAI(API_KEY);
  const model = genAI.getGenerativeModel({ model: MODEL });

  const t0     = Date.now();
  const result = await model.generateContent([
    { inlineData: { data: base64, mimeType: mime } },
    VISION_PROMPT,
  ]);
  const elapsed = ((Date.now() - t0) / 1000).toFixed(2);
  const text    = result.response.text().trim();

  console.log(`    Done in ${elapsed}s\n`);
  console.log('[3] Raw response:');
  console.log('-'.repeat(60));
  console.log(text);
  console.log('-'.repeat(60));

  // Parse JSON
  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      console.log('\n[4] Parsed result:');
      console.log('  Observations     :', parsed.observations);
      console.log('  Suspected        :', parsed.suspected_conditions?.join(', '));
      console.log('  Confidence       :', parsed.confidence);
      console.log('  Image quality    :', parsed.image_quality);
      if (parsed.notes) console.log('  Notes            :', parsed.notes);
    }
  } catch {
    console.log('[4] Could not parse as JSON — raw text above is the response');
  }

  console.log('\n' + '='.repeat(60));
  console.log('Test complete.');
}

main().catch(err => {
  console.error('ERROR:', err.message);
  process.exit(1);
});
