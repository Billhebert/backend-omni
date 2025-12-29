// src/modules/sync/plugins/PluginRegistry.ts

import { ISyncPlugin, EntityType, IntegrationConfig } from '../core/types';

/**
 * 📋 PLUGIN REGISTRY
 * 
 * Gerencia registro e acesso a todos os plugins de sincronização.
 * Singleton pattern para acesso global.
 */
export class PluginRegistry {
  private static instance: PluginRegistry;
  private plugins: Map<string, ISyncPlugin> = new Map();
  private initializedPlugins: Map<string, Map<string, ISyncPlugin>> = new Map(); // companyId -> pluginName -> plugin

  private constructor() {}

  /**
   * Get singleton instance
   */
  static getInstance(): PluginRegistry {
    if (!PluginRegistry.instance) {
      PluginRegistry.instance = new PluginRegistry();
    }
    return PluginRegistry.instance;
  }

  /**
   * REGISTER PLUGIN
   * Registra um novo plugin no sistema
   */
  register(plugin: ISyncPlugin): void {
    if (this.plugins.has(plugin.name)) {
      throw new Error(`Plugin ${plugin.name} already registered`);
    }

    this.plugins.set(plugin.name, plugin);
    console.log(`✅ Plugin registered: ${plugin.name} v${plugin.version}`);
  }

  /**
   * GET PLUGIN
   * Retorna plugin por nome
   */
  getPlugin(name: string): ISyncPlugin | undefined {
    return this.plugins.get(name);
  }

  /**
   * GET INITIALIZED PLUGIN
   * Retorna plugin já inicializado para uma empresa específica
   */
  getInitializedPlugin(companyId: string, pluginName: string): ISyncPlugin | undefined {
    return this.initializedPlugins.get(companyId)?.get(pluginName);
  }

  /**
   * INITIALIZE PLUGIN FOR COMPANY
   * Inicializa um plugin para uma empresa específica
   */
  async initializeForCompany(
    companyId: string,
    pluginName: string,
    config: IntegrationConfig
  ): Promise<ISyncPlugin> {
    const plugin = this.plugins.get(pluginName);
    if (!plugin) {
      throw new Error(`Plugin ${pluginName} not found`);
    }

    // Criar nova instância do plugin (cada empresa tem sua própria instância)
    const pluginClass = plugin.constructor as new () => ISyncPlugin;
    const companyPlugin = new pluginClass();

    await companyPlugin.initialize(config);

    // Armazenar instância inicializada
    if (!this.initializedPlugins.has(companyId)) {
      this.initializedPlugins.set(companyId, new Map());
    }
    this.initializedPlugins.get(companyId)!.set(pluginName, companyPlugin);

    console.log(`✅ Plugin ${pluginName} initialized for company ${companyId}`);

    return companyPlugin;
  }

  /**
   * REMOVE INITIALIZED PLUGIN
   * Remove plugin inicializado de uma empresa (quando desativado)
   */
  removeInitializedPlugin(companyId: string, pluginName: string): void {
    this.initializedPlugins.get(companyId)?.delete(pluginName);
    console.log(`🗑️  Plugin ${pluginName} removed for company ${companyId}`);
  }

  /**
   * GET ALL PLUGINS
   * Retorna todos os plugins registrados
   */
  getAllPlugins(): ISyncPlugin[] {
    return Array.from(this.plugins.values());
  }

  /**
   * GET PLUGINS BY ENTITY
   * Retorna plugins que suportam uma entidade específica
   */
  getPluginsByEntity(entity: EntityType): ISyncPlugin[] {
    return Array.from(this.plugins.values()).filter(plugin =>
      plugin.supportsEntity(entity)
    );
  }

  /**
   * LIST PLUGIN NAMES
   * Retorna nomes de todos os plugins registrados
   */
  listPluginNames(): string[] {
    return Array.from(this.plugins.keys());
  }

  /**
   * HAS PLUGIN
   * Verifica se plugin existe
   */
  hasPlugin(name: string): boolean {
    return this.plugins.has(name);
  }

  /**
   * GET COMPANY PLUGINS
   * Retorna todos os plugins inicializados de uma empresa
   */
  getCompanyPlugins(companyId: string): ISyncPlugin[] {
    const companyPlugins = this.initializedPlugins.get(companyId);
    return companyPlugins ? Array.from(companyPlugins.values()) : [];
  }

  /**
   * CLEAR ALL (for testing)
   */
  clearAll(): void {
    this.plugins.clear();
    this.initializedPlugins.clear();
  }
}

/**
 * Helper function to get registry instance
 */
export function getPluginRegistry(): PluginRegistry {
  return PluginRegistry.getInstance();
}