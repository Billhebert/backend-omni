import { BasePlugin } from '../BasePlugin';
import { PluginMetadata, EntityType, ... } from '../../core/types';

export class PipedrivePlugin extends BasePlugin {
  name = 'pipedrive';
  version = '1.0.0';
  
  getMetadata(): PluginMetadata { /* ... */ }
  async syncToOmni(...) { /* ... */ }
  async syncFromOmni(...) { /* ... */ }
  async handleWebhook(...) { /* ... */ }
  mapToOmni(...) { /* ... */ }
  mapFromOmni(...) { /* ... */ }
}