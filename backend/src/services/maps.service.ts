import axios from 'axios';
import { logger } from '../utils/logger.js';
import type { NearestClinic, Location } from '../types/index.js';
import { 
  getSpecialtiesForCondition, 
  calculateSpecialtyMatchScore,
  type MedicalSpecialty 
} from '../utils/medical-specialty-mapper.js';

export interface HospitalCandidate extends NearestClinic {
  specialty_score?: number;
  specialties?: MedicalSpecialty[];
}

export class MapsService {
  /**
   * Find top N nearest hospitals/clinics using OpenStreetMap Overpass API
   * @param location User location coordinates
   * @param keyword Search keyword (default: 'phòng khám bệnh viện')
   * @param limit Maximum number of results (default: 3)
   * @returns Array of nearest clinics/hospitals, sorted by distance
   */
  async findNearestHospitals(
    location: Location,
    keyword: string = 'phòng khám bệnh viện',
    limit: number = 3
  ): Promise<HospitalCandidate[]> {
    try {
      logger.info('Searching for nearest clinic using OpenStreetMap...');

      // Determine search radius in meters (5km = 5000m)
      const radiusMeters = 5000;

      // Determine amenity type based on keyword
      let amenityType = 'hospital'; // Default for hospital
      if (keyword && keyword.toLowerCase().includes('phòng khám')) {
        amenityType = 'clinic';
      } else if (keyword && (keyword.toLowerCase().includes('bệnh viện') || keyword.toLowerCase().includes('hospital'))) {
        amenityType = 'hospital';
      }

      // Build Overpass QL query
      // Search for hospitals/clinics within radius
      const query = `
[out:json][timeout:25];
(
  node["amenity"="${amenityType}"](around:${radiusMeters},${location.lat},${location.lng});
  way["amenity"="${amenityType}"](around:${radiusMeters},${location.lat},${location.lng});
  relation["amenity"="${amenityType}"](around:${radiusMeters},${location.lat},${location.lng});
);
out center;
`;

      // Encode query for URL
      const encodedQuery = encodeURIComponent(query);

      // Use public Overpass API endpoint
      const overpassUrl = 'https://overpass-api.de/api/interpreter';
      
      const response = await axios.post(
        overpassUrl,
        `data=${encodedQuery}`,
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          },
          timeout: 30000 // 30 seconds timeout
        }
      );

      if (!response.data || !response.data.elements || response.data.elements.length === 0) {
        logger.warn('No clinics found nearby in OpenStreetMap');
        return [];
      }

      // Process all elements and calculate distances
      const candidates: Array<{ element: any; distance: number }> = [];

      for (const element of response.data.elements) {
        let elementLat: number;
        let elementLng: number;

        // Handle different element types
        if (element.type === 'node') {
          elementLat = element.lat;
          elementLng = element.lon;
        } else if (element.type === 'way' || element.type === 'relation') {
          // For ways and relations, use center coordinates
          elementLat = element.center?.lat || element.lat;
          elementLng = element.center?.lon || element.lon;
        } else {
          continue;
        }

        // Calculate distance
        const distance = this.calculateDistance(
          location.lat,
          location.lng,
          elementLat,
          elementLng
        );

        candidates.push({ element, distance });
      }

      // Sort by distance and take top N
      candidates.sort((a, b) => a.distance - b.distance);
      const topCandidates = candidates.slice(0, limit);

      // Convert to HospitalCandidate format
      const hospitals: HospitalCandidate[] = topCandidates.map(({ element, distance }) => {
        // Extract information from tags
        const tags = element.tags || {};
        const name = tags.name || tags['name:vi'] || tags['name:en'] || 'Bệnh viện/Khám bệnh';
        
        // Build address from available tags
        const addressParts: string[] = [];
        if (tags['addr:street']) addressParts.push(tags['addr:street']);
        if (tags['addr:housenumber']) addressParts.push(tags['addr:housenumber']);
        if (tags['addr:city']) addressParts.push(tags['addr:city']);
        if (tags['addr:district']) addressParts.push(tags['addr:district']);
        const address = addressParts.length > 0 
          ? addressParts.join(', ') 
          : tags['addr:full'] || 'Địa chỉ không có sẵn';

        return {
          name,
          distance_km: Math.round(distance * 10) / 10,
          address,
          rating: undefined // OSM doesn't provide ratings
        };
      });

      logger.info(`Found ${hospitals.length} hospitals nearby`);
      return hospitals;
    } catch (error) {
      logger.error({ error }, 'OpenStreetMap Overpass API error');
      return [];
    }
  }

  /**
   * Find nearest hospital/clinic (backward compatibility)
   * @param location User location coordinates
   * @param keyword Search keyword (default: 'phòng khám bệnh viện')
   * @returns Nearest clinic/hospital information or null
   */
  async findNearestClinic(
    location: Location,
    keyword: string = 'phòng khám bệnh viện'
  ): Promise<NearestClinic | null> {
    const hospitals = await this.findNearestHospitals(location, keyword, 1);
    return hospitals.length > 0 ? hospitals[0] : null;
  }

  /**
   * Find best matching hospital based on condition and location
   * Returns the most appropriate hospital considering both specialty match and distance
   * @param location User location coordinates
   * @param condition Medical condition/disease name (optional)
   * @param keyword Search keyword (default: 'bệnh viện')
   * @returns Best matching hospital or null
   */
  async findBestMatchingHospital(
    location: Location,
    condition?: string,
    keyword: string = 'bệnh viện'
  ): Promise<HospitalCandidate | null> {
    try {
      logger.info(`Finding best matching hospital${condition ? ` for condition: ${condition}` : ''}...`);

      // Get top 3 hospitals
      const hospitals = await this.findNearestHospitals(location, keyword, 3);

      if (hospitals.length === 0) {
        logger.warn('No hospitals found nearby');
        return null;
      }

      // If no condition provided, return nearest
      if (!condition || condition.trim() === '') {
        logger.info('No condition provided, returning nearest hospital');
        return hospitals[0];
      }

      // Get specialties for condition
      const specialties = getSpecialtiesForCondition(condition);
      logger.info(`Condition "${condition}" maps to specialties: ${specialties.join(', ')}`);

      // Calculate match scores for each hospital
      const scoredHospitals = hospitals.map(hospital => {
        const specialtyScore = calculateSpecialtyMatchScore(hospital.name, specialties);
        
        // Combined score: specialty match (70%) + distance (30%)
        // Normalize distance score (closer = higher score, max 5km = 0, 0km = 1)
        const distanceScore = Math.max(0, 1 - (hospital.distance_km / 5));
        const combinedScore = (specialtyScore * 0.7) + (distanceScore * 0.3);

        return {
          ...hospital,
          specialty_score: specialtyScore,
          specialties,
          combined_score: combinedScore
        };
      });

      // Sort by combined score (highest first)
      scoredHospitals.sort((a, b) => {
        // First by specialty score (prefer specialty match)
        if (Math.abs(a.specialty_score! - b.specialty_score!) > 0.1) {
          return b.specialty_score! - a.specialty_score!;
        }
        // Then by distance (prefer closer)
        return a.distance_km - b.distance_km;
      });

      const bestMatch = scoredHospitals[0];
      logger.info(`Best match: ${bestMatch.name} (specialty score: ${bestMatch.specialty_score?.toFixed(2)}, distance: ${bestMatch.distance_km}km)`);
      
      return bestMatch;
    } catch (error) {
      logger.error({ error }, 'Error finding best matching hospital');
      // Fallback to nearest
      const hospitals = await this.findNearestHospitals(location, keyword, 1);
      return hospitals.length > 0 ? hospitals[0] : null;
    }
  }

  private calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number {
    // Haversine formula for calculating distance between two points
    const R = 6371; // Radius of the Earth in km
    const dLat = this.deg2rad(lat2 - lat1);
    const dLon = this.deg2rad(lon2 - lon1);
    
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.deg2rad(lat1)) *
        Math.cos(this.deg2rad(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;
    
    return distance;
  }

  private deg2rad(deg: number): number {
    return deg * (Math.PI / 180);
  }
}

