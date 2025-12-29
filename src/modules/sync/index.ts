// src/modules/sync/index.ts

import { getPluginRegistry } from './plugins/PluginRegistry';
import { RDStationPlugin } from './plugins/rdstation/RDStationPlugin';
import { Confirm8Plugin } from './plugins/confirm8/Confirm8Plugin';
// import { PipedrivePlugin } from './plugins/pipedrive/PipedrivePlugin'; // ❌ COMENTAR

export function initializeSyncEngine() {
  const registry = getPluginRegistry();
  
  registry.register(new RDStationPlugin());
  registry.register(new Confirm8Plugin());
  // registry.register(new PipedrivePlugin()); // ❌ COMENTAR
  
  console.log('🔄 Sync Engine initialized');
}

export { getPluginRegistry };
export { SyncEngine } from './core/SyncEngine';
export { SyncQueue } from './core/SyncQueue';
export * from './core/types';