// src/modules/sync/core/ConflictResolver.ts

import { ConflictStrategy, DataConflict } from './types';

/**
 * ⚖️ CONFLICT RESOLVER
 * 
 * Resolve conflitos de dados entre OMNI e sistemas externos
 * usando diferentes estratégias configuráveis.
 */
export class ConflictResolver {
  
  /**
   * RESOLVE CONFLICT
   * Resolve conflito entre dados usando estratégia definida
   */
  resolve(
    conflict: DataConflict,
    strategy: ConflictStrategy
  ): {
    resolved: any;
    strategy: ConflictStrategy;
    requiresManualReview: boolean;
  } {
    switch (strategy) {
      case ConflictStrategy.NEWEST_WINS:
        return this.resolveNewestWins(conflict);
      
      case ConflictStrategy.OMNI_WINS:
        return {
          resolved: conflict.omniData,
          strategy: ConflictStrategy.OMNI_WINS,
          requiresManualReview: false
        };
      
      case ConflictStrategy.EXTERNAL_WINS:
        return {
          resolved: conflict.externalData,
          strategy: ConflictStrategy.EXTERNAL_WINS,
          requiresManualReview: false
        };
      
      case ConflictStrategy.MERGE:
        return this.resolveMerge(conflict);
      
      case ConflictStrategy.MANUAL:
      default:
        return {
          resolved: conflict.omniData, // Mantém OMNI por padrão
          strategy: ConflictStrategy.MANUAL,
          requiresManualReview: true
        };
    }
  }

  /**
   * RESOLVE NEWEST WINS
   * Ganha o dado que foi modificado mais recentemente
   */
  private resolveNewestWins(conflict: DataConflict): {
    resolved: any;
    strategy: ConflictStrategy;
    requiresManualReview: boolean;
  } {
    const omniDate = this.extractDate(conflict.omniData);
    const externalDate = this.extractDate(conflict.externalData);

    if (!omniDate && !externalDate) {
      // Sem datas, requer revisão manual
      return {
        resolved: conflict.omniData,
        strategy: ConflictStrategy.NEWEST_WINS,
        requiresManualReview: true
      };
    }

    if (!omniDate) {
      return {
        resolved: conflict.externalData,
        strategy: ConflictStrategy.NEWEST_WINS,
        requiresManualReview: false
      };
    }

    if (!externalDate) {
      return {
        resolved: conflict.omniData,
        strategy: ConflictStrategy.NEWEST_WINS,
        requiresManualReview: false
      };
    }

    // Compara datas
    const resolved = externalDate > omniDate 
      ? conflict.externalData 
      : conflict.omniData;

    return {
      resolved,
      strategy: ConflictStrategy.NEWEST_WINS,
      requiresManualReview: false
    };
  }

  /**
   * RESOLVE MERGE
   * Mescla dados de ambas as fontes
   */
  private resolveMerge(conflict: DataConflict): {
    resolved: any;
    strategy: ConflictStrategy;
    requiresManualReview: boolean;
  } {
    const merged = this.mergeObjects(
      conflict.omniData,
      conflict.externalData
    );

    // Se merge causou muitas mudanças, requer revisão
    const changePercentage = this.calculateChangePercentage(
      conflict.omniData,
      merged
    );

    return {
      resolved: merged,
      strategy: ConflictStrategy.MERGE,
      requiresManualReview: changePercentage > 50 // Mais de 50% de mudanças
    };
  }

  /**
   * MERGE OBJECTS
   * Mescla dois objetos priorizando valores não-nulos mais recentes
   */
  private mergeObjects(omniData: any, externalData: any): any {
    const merged: any = { ...omniData };

    for (const key in externalData) {
      const externalValue = externalData[key];
      const omniValue = omniData[key];

      // Se valor externo existe e OMNI não tem, adicionar
      if (externalValue !== null && externalValue !== undefined && externalValue !== '') {
        if (omniValue === null || omniValue === undefined || omniValue === '') {
          merged[key] = externalValue;
        } else {
          // Ambos têm valor, precisa decidir
          merged[key] = this.mergeValue(omniValue, externalValue, key);
        }
      }
    }

    return merged;
  }

  /**
   * MERGE VALUE
   * Decide qual valor usar quando ambos existem
   */
  private mergeValue(omniValue: any, externalValue: any, key: string): any {
    // Para datas, pegar a mais recente
    if (this.isDate(omniValue) && this.isDate(externalValue)) {
      const omniDate = new Date(omniValue);
      const externalDate = new Date(externalValue);
      return externalDate > omniDate ? externalValue : omniValue;
    }

    // Para arrays, mesclar únicos
    if (Array.isArray(omniValue) && Array.isArray(externalValue)) {
      return [...new Set([...omniValue, ...externalValue])];
    }

    // Para objetos, mesclar recursivamente
    if (this.isObject(omniValue) && this.isObject(externalValue)) {
      return this.mergeObjects(omniValue, externalValue);
    }

    // Para números, pegar o maior (normalmente mais atualizado)
    if (typeof omniValue === 'number' && typeof externalValue === 'number') {
      return Math.max(omniValue, externalValue);
    }

    // Para strings, pegar a mais longa (mais completa)
    if (typeof omniValue === 'string' && typeof externalValue === 'string') {
      return externalValue.length > omniValue.length ? externalValue : omniValue;
    }

    // Default: manter valor do OMNI
    return omniValue;
  }

  /**
   * CALCULATE CHANGE PERCENTAGE
   * Calcula percentual de mudanças entre dois objetos
   */
  private calculateChangePercentage(original: any, updated: any): number {
    const keys = new Set([
      ...Object.keys(original || {}),
      ...Object.keys(updated || {})
    ]);

    let totalFields = keys.size;
    let changedFields = 0;

    for (const key of keys) {
      if (!this.deepEqual(original?.[key], updated?.[key])) {
        changedFields++;
      }
    }

    return totalFields > 0 ? (changedFields / totalFields) * 100 : 0;
  }

  /**
   * DEEP EQUAL
   * Compara se dois valores são iguais (deep)
   */
  private deepEqual(val1: any, val2: any): boolean {
    if (val1 === val2) return true;
    if (val1 == null || val2 == null) return val1 === val2;
    if (typeof val1 !== typeof val2) return false;

    if (Array.isArray(val1) && Array.isArray(val2)) {
      if (val1.length !== val2.length) return false;
      return val1.every((item, index) => this.deepEqual(item, val2[index]));
    }

    if (this.isObject(val1) && this.isObject(val2)) {
      const keys1 = Object.keys(val1);
      const keys2 = Object.keys(val2);
      
      if (keys1.length !== keys2.length) return false;
      
      return keys1.every(key => this.deepEqual(val1[key], val2[key]));
    }

    return false;
  }

  /**
   * EXTRACT DATE
   * Extrai data de modificação do objeto
   */
  private extractDate(data: any): Date | null {
    // Procurar por campos de data comuns
    const dateFields = [
      'updatedAt',
      'updated_at',
      'lastModified',
      'last_modified',
      'modifiedAt',
      'modified_at'
    ];

    for (const field of dateFields) {
      const value = data?.[field] || data?.metadata?.[field];
      if (value) {
        const date = new Date(value);
        if (!isNaN(date.getTime())) {
          return date;
        }
      }
    }

    return null;
  }

  /**
   * IS DATE
   */
  private isDate(value: any): boolean {
    if (!value) return false;
    const date = new Date(value);
    return !isNaN(date.getTime());
  }

  /**
   * IS OBJECT
   */
  private isObject(value: any): boolean {
    return value !== null && typeof value === 'object' && !Array.isArray(value);
  }

  /**
   * DETECT CONFLICT TYPE
   * Detecta tipo de conflito entre dados
   */
  detectConflictType(omniData: any, externalData: any): DataConflict['conflictType'] {
    // Se ambos têm o mesmo ID mas dados diferentes = data mismatch
    if (omniData.id === externalData.id) {
      return 'data_mismatch';
    }

    // Se são entidades diferentes mas muito similares = duplicate
    const similarity = this.calculateSimilarity(omniData, externalData);
    if (similarity > 0.8) {
      return 'duplicate';
    }

    // Default
    return 'data_mismatch';
  }

  /**
   * CALCULATE SIMILARITY
   * Calcula similaridade entre dois objetos (0-1)
   */
  private calculateSimilarity(obj1: any, obj2: any): number {
    const keys = new Set([...Object.keys(obj1), ...Object.keys(obj2)]);
    let matches = 0;

    for (const key of keys) {
      if (this.deepEqual(obj1[key], obj2[key])) {
        matches++;
      }
    }

    return matches / keys.size;
  }
}