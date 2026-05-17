import { DynamicTool } from '@langchain/core/tools';
import { MapsService } from '../services/maps.service.js';
import { logger } from '../utils/logger.js';
import type { Location } from '../types/index.js';

function extractJsonPayload(rawInput: string): string {
  let cleaned = rawInput.trim();

  // Remove code fences if present
  if (cleaned.startsWith('```')) {
    const fenceEnd = cleaned.indexOf('```', 3);
    if (fenceEnd !== -1) {
      cleaned = cleaned.slice(3, fenceEnd).trim();
    }
  }

  if (cleaned.toLowerCase().startsWith('json')) {
    cleaned = cleaned.slice(4).trim();
  }

  if (!cleaned.startsWith('{')) {
    const firstBrace = cleaned.indexOf('{');
    const lastBrace = cleaned.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      cleaned = cleaned.slice(firstBrace, lastBrace + 1);
    }
  }

  return cleaned;
}

export function createHospitalTool(mapsService: MapsService): DynamicTool {
  return new DynamicTool({
    name: 'find_nearest_hospital',
    description:
      'Finds the most appropriate medical facility based on user coordinates and medical condition. ' +
      'TRIGGERS: ' +
      '1. MANDATORY: This tool must be called if the user is in a critical/emergency state OR explicitly requests hospitalization OR the user is asking for a hospital or want go to the doctor.' +
      '2. REFERRAL: This tool is called when a medical condition is identified with high confidence to suggest a suitable facility. ' +
      'INPUT: A JSON string with "location" (object with "lat" and "lng" as numbers) and optionally "condition" (string - medical condition/disease name). ' +
      'RETURNS: Best matching hospital (considering both specialty match and distance), plus top 3 nearby hospitals for reference.',
    func: async (inputJson: string) => {
      try {
        logger.info('Tool find_nearest_hospital called');

        const payload = extractJsonPayload(inputJson);
        const input: { location: Location; condition?: string } = JSON.parse(payload);

        if (!input.location || typeof input.location.lat !== 'number' || typeof input.location.lng !== 'number') {
          return JSON.stringify({
            error: 'Invalid location format',
            message: 'Location must contain lat and lng as numbers'
          });
        }

        // Get top 3 hospitals for reference
        const top3Hospitals = await mapsService.findNearestHospitals(
          input.location,
          'bệnh viện',
          3
        );

        // Find best matching hospital based on condition
        const bestHospital = await mapsService.findBestMatchingHospital(
          input.location,
          input.condition,
          'bệnh viện'
        );

        if (!bestHospital || top3Hospitals.length === 0) {
          return JSON.stringify({
            message: 'No hospital found nearby',
            hospital: null,
            top_hospitals: [],
            suggestion: 'Please try searching with a different location or contact emergency services directly'
          });
        }

        return JSON.stringify({
          message: `Found best matching hospital: ${bestHospital.name}${input.condition ? ` (for condition: ${input.condition})` : ''}`,
          hospital: {
            name: bestHospital.name,
            distance_km: bestHospital.distance_km,
            address: bestHospital.address,
            rating: bestHospital.rating,
            specialty_match: bestHospital.specialty_score ? (bestHospital.specialty_score > 0.5 ? 'high' : bestHospital.specialty_score > 0 ? 'medium' : 'low') : undefined
          },
          top_hospitals: top3Hospitals.map(h => ({
            name: h.name,
            distance_km: h.distance_km,
            address: h.address
          })),
          condition: input.condition || undefined
        });
      } catch (error) {
        logger.error({ error }, 'find_nearest_hospital tool error');
        return JSON.stringify({
          error: 'Failed to find nearest hospital',
          message: 'An error occurred while searching for hospitals. Please try again or contact emergency services directly.',
          hospital: null
        });
      }
    }
  });
}

