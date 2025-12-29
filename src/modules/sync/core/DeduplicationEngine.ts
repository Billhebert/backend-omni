// src/modules/sync/core/DeduplicationEngine.ts

import { MatchResult, MatchCandidate, EntityType } from './types';

/**
 * 🔍 DEDUPLICATION ENGINE
 * 
 * Motor de deduplicação com fuzzy matching para identificar
 * entidades duplicadas entre sistemas.
 */
export class DeduplicationEngine {
  
  /**
   * FIND MATCHES
   * Encontra possíveis matches para uma entidade
   */
  async findMatches(
    entity: EntityType,
    searchData: any,
    candidates: any[]
  ): Promise<MatchResult> {
    if (candidates.length === 0) {
      return {
        matched: false,
        matchScore: 0,
        matchMethod: 'exact_email',
        candidates: []
      };
    }

    const matchCandidates: MatchCandidate[] = [];

    for (const candidate of candidates) {
      // Tentar múltiplos métodos de matching
      const emailScore = this.matchByEmail(searchData, candidate);
      const phoneScore = this.matchByPhone(searchData, candidate);
      const nameScore = this.matchByName(searchData, candidate);
      const taxIdScore = this.matchByTaxId(searchData, candidate);

      // Score ponderado
      const weightedScore = Math.max(
        emailScore * 1.0,    // Email: peso 100%
        phoneScore * 0.9,    // Phone: peso 90%
        taxIdScore * 1.0,    // TaxID: peso 100%
        nameScore * 0.7      // Name: peso 70%
      );

      if (weightedScore > 50) { // Threshold mínimo de 50%
        matchCandidates.push({
          id: candidate.id,
          score: weightedScore,
          data: candidate,
          reason: this.getMatchReason(emailScore, phoneScore, nameScore, taxIdScore)
        });
      }
    }

    // Ordenar por score descendente
    matchCandidates.sort((a, b) => b.score - a.score);

    // Se temos matches
    if (matchCandidates.length > 0) {
      const bestMatch = matchCandidates[0];
      
      return {
        matched: bestMatch.score >= 80, // Considera match se score >= 80%
        matchScore: bestMatch.score,
        matchMethod: this.determineMatchMethod(searchData, bestMatch.data),
        candidateId: bestMatch.id,
        candidates: matchCandidates
      };
    }

    return {
      matched: false,
      matchScore: 0,
      matchMethod: 'exact_email',
      candidates: []
    };
  }

  /**
   * MATCH BY EMAIL
   * Match exato por email (normalizado)
   */
  private matchByEmail(data1: any, data2: any): number {
    const email1 = this.normalizeEmail(data1.email || data1.contactEmail);
    const email2 = this.normalizeEmail(data2.email || data2.contactEmail);

    if (!email1 || !email2) return 0;
    
    return email1 === email2 ? 100 : 0;
  }

  /**
   * MATCH BY PHONE
   * Match por telefone (normalizado)
   */
  private matchByPhone(data1: any, data2: any): number {
    const phone1 = this.normalizePhone(data1.phone || data1.contactPhone);
    const phone2 = this.normalizePhone(data2.phone || data2.contactPhone);

    if (!phone1 || !phone2) return 0;

    return phone1 === phone2 ? 100 : 0;
  }

  /**
   * MATCH BY TAX ID
   * Match por CPF/CNPJ (normalizado)
   */
  private matchByTaxId(data1: any, data2: any): number {
    const taxId1 = this.normalizeTaxId(data1.taxId);
    const taxId2 = this.normalizeTaxId(data2.taxId);

    if (!taxId1 || !taxId2) return 0;

    return taxId1 === taxId2 ? 100 : 0;
  }

  /**
   * MATCH BY NAME
   * Fuzzy match por nome + empresa
   */
  private matchByName(data1: any, data2: any): number {
    const name1 = this.normalizeName(data1.name);
    const name2 = this.normalizeName(data2.name);

    if (!name1 || !name2) return 0;

    // Levenshtein distance similarity
    const nameSimilarity = this.stringSimilarity(name1, name2);

    // Se temos empresa, considerar também
    const company1 = this.normalizeName(data1.companyName || data1.company);
    const company2 = this.normalizeName(data2.companyName || data2.company);

    if (company1 && company2) {
      const companySimilarity = this.stringSimilarity(company1, company2);
      // Média ponderada: nome 70%, empresa 30%
      return nameSimilarity * 0.7 + companySimilarity * 0.3;
    }

    return nameSimilarity;
  }

  /**
   * STRING SIMILARITY
   * Calcula similaridade entre duas strings usando Levenshtein distance
   */
  private stringSimilarity(str1: string, str2: string): number {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;

    if (longer.length === 0) return 100;

    const distance = this.levenshteinDistance(longer, shorter);
    return ((longer.length - distance) / longer.length) * 100;
  }

  /**
   * LEVENSHTEIN DISTANCE
   * Calcula a distância de edição entre duas strings
   */
  private levenshteinDistance(str1: string, str2: string): number {
    const matrix: number[][] = [];

    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }

    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1, // substituição
            matrix[i][j - 1] + 1,     // inserção
            matrix[i - 1][j] + 1      // deleção
          );
        }
      }
    }

    return matrix[str2.length][str1.length];
  }

  /**
   * DETERMINE MATCH METHOD
   * Determina qual foi o método principal de matching
   */
  private determineMatchMethod(data1: any, data2: any): MatchResult['matchMethod'] {
    if (this.matchByEmail(data1, data2) === 100) return 'exact_email';
    if (this.matchByTaxId(data1, data2) === 100) return 'tax_id';
    if (this.matchByPhone(data1, data2) === 100) return 'phone';
    if (this.matchByName(data1, data2) >= 80) return 'fuzzy_name';
    return 'manual';
  }

  /**
   * GET MATCH REASON
   * Retorna a razão do match baseado nos scores
   */
  private getMatchReason(
    emailScore: number,
    phoneScore: number,
    nameScore: number,
    taxIdScore: number
  ): string {
    const reasons: string[] = [];

    if (emailScore === 100) reasons.push('Email exato');
    if (taxIdScore === 100) reasons.push('CPF/CNPJ exato');
    if (phoneScore === 100) reasons.push('Telefone exato');
    if (nameScore >= 80) reasons.push(`Nome similar (${nameScore.toFixed(0)}%)`);

    return reasons.length > 0 ? reasons.join(', ') : 'Match manual';
  }

  /**
   * NORMALIZE EMAIL
   */
  private normalizeEmail(email?: string): string | null {
    if (!email) return null;
    return email.toLowerCase().trim();
  }

  /**
   * NORMALIZE PHONE
   */
  private normalizePhone(phone?: string): string | null {
    if (!phone) return null;
    const digits = phone.replace(/\D/g, '');
    return digits.length > 0 ? digits : null;
  }

  /**
   * NORMALIZE TAX ID
   */
  private normalizeTaxId(taxId?: string): string | null {
    if (!taxId) return null;
    return taxId.replace(/\D/g, '');
  }

  /**
   * NORMALIZE NAME
   */
  private normalizeName(name?: string): string | null {
    if (!name) return null;
    
    return name
      .toLowerCase()
      .trim()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Remove acentos
      .replace(/[^a-z0-9\s]/g, ' ')    // Remove caracteres especiais
      .replace(/\s+/g, ' ')             // Normaliza espaços
      .trim();
  }
}