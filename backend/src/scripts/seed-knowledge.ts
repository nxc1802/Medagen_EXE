import { readdir, readFile, stat } from 'fs/promises';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { createClient } from '@supabase/supabase-js';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { config, validateConfig } from '../utils/config.js';
import { logger } from '../utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ===================== CONFIG =====================
const SUPABASE_URL = config.supabase.url;
const SUPABASE_SERVICE_KEY = config.supabase.serviceKey;
const GEMINI_API_KEY = config.gemini.apiKey;

const SPECIALTY_FOLDER = 'Da liễu'; // Can be changed: "Than-kinh", etc.
const SPECIALTY_LABEL = slugToLabel(SPECIALTY_FOLDER);

// ===================== INIT CLIENTS =====================
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { persistSession: false },
});

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
const embedModel = genAI.getGenerativeModel({ model: 'text-embedding-004' });

// ===================== HELPER FUNCTIONS =====================

/**
 * Convert slug to human-friendly label
 */
function slugToLabel(slug: string): string {
  let label = slug.replace(/[-_]+/g, ' ');
  label = label.replace(/\s+/g, ' ').trim();

  // Remove "CHƯƠNG {n}" prefix entirely
  label = label.replace(/^(CH(U|Ư)ƠNG)\s*\d+\s*[.:~-]?\s*/iu, '');

  // Remove leading numeric / roman numeral prefixes (e.g., "1.", "(IV)", "2-")
  label = label.replace(/^(?:\(?[0-9IVXLCDM]+\)?)(?:\s*[\.\-])?\s+/iu, '');

  // Cleanup remaining punctuation/spacing
  label = label.replace(/\s*:\s*/g, ': ');
  label = label.replace(/\s*-\s*/g, ' - ');
  label = label.replace(/\s+\./g, '. ');
  label = label.replace(/,\s*/g, ', ');
  label = label.replace(/\s{2,}/g, ' ').trim();

  if (!label) {
    label = slug.replace(/[-_]+/g, ' ').trim();
  }

  return label;
}

/**
 * Parse section filename to human-readable title.
 */
function parseSectionFileName(filename: string): { title: string } | null {
  if (!filename.endsWith('.txt')) return null;
  const base = filename.replace(/\.txt$/i, '');
  const withoutDuplicateSuffix = base.replace(/_(\d+)$/, '');
  const title = withoutDuplicateSuffix.replace(/[_]+/g, ' ').trim();
  if (!title) return null;
  return { title };
}

/**
 * Generate embedding using Gemini
 */
async function embed(text: string): Promise<number[]> {
  const res = await embedModel.embedContent(text);
  return res.embedding.values;
}

/**
 * Check if a directory entry is a directory
 */
async function isDirectory(path: string): Promise<boolean> {
  try {
    const stats = await stat(path);
    return stats.isDirectory();
  } catch {
    return false;
  }
}

/**
 * Get or create specialty record
 */
async function getOrCreateSpecialty(name: string): Promise<string | null> {
  const { data: existing, error: fetchError } = await supabase
    .from('specialties')
    .select('id')
    .eq('name', name)
    .maybeSingle();

  if (existing) {
    return existing.id;
  }

  if (fetchError) {
    logger.error({ error: fetchError }, `Error fetching specialty: ${name}`);
    return null;
  }

  const { data: created, error: createError } = await supabase
    .from('specialties')
    .insert({ name })
    .select('id')
    .maybeSingle();

  if (createError) {
    logger.error({ error: createError }, `Error creating specialty: ${name}`);
    return null;
  }

  return created?.id || null;
}

/**
 * Get or create disease record
 */
async function getOrCreateDisease(
  name: string,
  specialtyId: string
): Promise<string | null> {
  const { data: existing, error: fetchError } = await supabase
    .from('diseases')
    .select('id')
    .eq('name', name)
    .eq('specialty_id', specialtyId)
    .maybeSingle();

  if (existing) {
    return existing.id;
  }

  if (fetchError) {
    logger.error({ error: fetchError }, `Error fetching disease: ${name}`);
    return null;
  }

  const { data: created, error: createError } = await supabase
    .from('diseases')
    .insert({ name, specialty_id: specialtyId })
    .select('id')
    .maybeSingle();

  if (createError) {
    logger.error({ error: createError }, `Error creating disease: ${name}`);
    return null;
  }

  return created?.id || null;
}

/**
 * Get info domain ID by name
 */
async function getInfoDomainId(name: string): Promise<string | null> {
  const { data, error } = await supabase
    .from('info_domains')
    .select('id')
    .eq('name', name)
    .maybeSingle();

  if (error || !data) {
    const normalizedName = name.toLowerCase().trim();
    const { data: allDomains } = await supabase
      .from('info_domains')
      .select('id, name');

    if (allDomains) {
      for (const domain of allDomains) {
        if (domain.name.toLowerCase().includes(normalizedName) || 
            normalizedName.includes(domain.name.toLowerCase())) {
          return domain.id;
        }
      }
    }
    return null;
  }

  return data?.id || null;
}

async function seedGuidelines() {
  try {
    logger.info(`Starting medical knowledge seeding for ${SPECIALTY_LABEL}...`);
    
    validateConfig();

    // Get data folder path (relative to project root)
    const dataRoot = join(__dirname, '../../data');
    const specialtyRoot = join(dataRoot, SPECIALTY_FOLDER);
    
    logger.info(`Reading data from: ${specialtyRoot}`);
    
    try {
      await stat(specialtyRoot);
    } catch {
      logger.error(`Specialty folder not found: ${specialtyRoot}`);
      process.exit(1);
    }

    const specialtyId = await getOrCreateSpecialty(SPECIALTY_LABEL);
    if (!specialtyId) {
      logger.error('Failed to get or create specialty record');
      process.exit(1);
    }
    logger.info(`Specialty ID: ${specialtyId}`);
    
    const chapterEntries = await readdir(specialtyRoot);
    let totalSeeded = 0;
    let totalSkipped = 0;
    let totalDuplicates = 0;

    for (const chapterSlug of chapterEntries) {
      const chapterPath = join(specialtyRoot, chapterSlug);
      
      if (!(await isDirectory(chapterPath))) {
        continue;
      }

      const chapterLabel = slugToLabel(chapterSlug);
      logger.info(`\n📖 Processing chapter: ${chapterLabel}`);

      const diseaseEntries = await readdir(chapterPath);

      for (const diseaseSlug of diseaseEntries) {
        const diseasePath = join(chapterPath, diseaseSlug);
        
        if (!(await isDirectory(diseasePath))) {
          continue;
        }
        
        const diseaseLabel = slugToLabel(diseaseSlug);
        logger.info(`  🩺 Processing disease: ${diseaseLabel}`);

        const sectionFiles = await readdir(diseasePath);

        for (const filename of sectionFiles) {
          if (!filename.endsWith('.txt') || filename === '_raw.txt') {
            continue;
          }

          const sectionInfo = parseSectionFileName(filename);
          if (!sectionInfo) {
            logger.warn(`    ⚠️  Skipping invalid filename: ${filename}`);
            totalSkipped++;
            continue;
          }

          const { title: sectionTitle } = sectionInfo;
          const sectionPath = join(diseasePath, filename);
          
          try {
            const content = await readFile(sectionPath, 'utf-8');
            const contentTrimmed = content.trim();

            if (!contentTrimmed) {
              logger.warn(`    ⚠️  Skipping empty file: ${filename}`);
              totalSkipped++;
              continue;
            }

            const relativePath = sectionPath.replace(dataRoot + '/', '');

            logger.info(`    📄 ${sectionTitle} (${contentTrimmed.length} chars)`);
        
            const diseaseId = await getOrCreateDisease(diseaseLabel, specialtyId);
            if (!diseaseId) continue;
            
            const infoDomainId = await getInfoDomainId(sectionTitle);
            const embedding = await embed(contentTrimmed);

            const { data: existingMedicalChunk } = await supabase
              .from('medical_knowledge_chunks')
              .select('id')
              .eq('path', relativePath)
              .maybeSingle();

            let isNewMedicalChunk = false;
            if (existingMedicalChunk) {
              logger.info(`    ⏭️  Skipping duplicate medical chunk: ${sectionTitle} (already exists)`);
              totalDuplicates++;
            } else {
              isNewMedicalChunk = true;
              const { error: error1 } = await supabase.from('medical_knowledge_chunks').insert({
                specialty_id: specialtyId,
                disease_id: diseaseId,
                info_domain_id: infoDomainId,
                specialty: SPECIALTY_LABEL,
                chapter: chapterLabel,
                disease: diseaseLabel,
                section_title: sectionTitle,
                content: contentTrimmed,
                path: relativePath,
                embedding,
              });

              if (error1) {
                logger.error({ error: error1.message }, `    ❌ Error inserting structured chunk: ${sectionTitle}`);
                totalSkipped++;
                continue;
              }
            }

            let guidelineId;
            const { data: existingGuideline } = await supabase
              .from('guidelines')
              .select('id')
              .eq('condition', diseaseLabel)
              .eq('source', sectionTitle)
              .maybeSingle();

            if (existingGuideline) {
              guidelineId = existingGuideline.id;
            } else {
              const { data: newGuideline, error: gError } = await supabase
                .from('guidelines')
                .insert({
                  condition: diseaseLabel,
                  source: sectionTitle,
                  updated_at: new Date().toISOString()
                })
                .select('id')
                .maybeSingle();
              
              if (gError || !newGuideline) {
                logger.warn(`    ⚠️  Failed to create guideline record: ${gError?.message}`);
              } else {
                guidelineId = newGuideline.id;
              }
            }

            if (guidelineId) {
              const { data: existingGuidelineChunk } = await supabase
                .from('guideline_chunks')
                .select('id')
                .eq('guideline_id', guidelineId)
                .eq('content', contentTrimmed)
                .maybeSingle();

              if (!existingGuidelineChunk) {
                const { error: chunkError } = await supabase.from('guideline_chunks').insert({
                  guideline_id: guidelineId,
                  content: contentTrimmed,
                  embedding,
                  metadata: {
                    chapter: chapterLabel,
                    specialty: SPECIALTY_LABEL
                  }
                });

                if (chunkError) {
                  logger.warn(`    ⚠️  Failed to insert guideline chunk: ${chunkError.message}`);
                }
              }
            }

            if (isNewMedicalChunk) {
              totalSeeded++;
            }
        
          } catch (error) {
            logger.error({ error }, `    ❌ Error processing file: ${filename}`);
            totalSkipped++;
          }
        }
      }
    }

    logger.info(`\n✅ Seeding completed!`);
    logger.info(`   📊 Total seeded: ${totalSeeded}`);
    logger.info(`   ⏭️  Total duplicates (skipped): ${totalDuplicates}`);
    logger.info(`   ⚠️  Total skipped (errors): ${totalSkipped}`);
    
  } catch (error) {
    if (error instanceof Error) {
      logger.error({ error: error.message, stack: error.stack }, 'Seeding failed');
    } else {
      logger.error({ error: JSON.stringify(error) }, 'Seeding failed');
    }
    process.exit(1);
  }
}

seedGuidelines();
