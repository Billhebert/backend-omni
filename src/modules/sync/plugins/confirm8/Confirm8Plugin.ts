// src/modules/sync/plugins/confirm8/Confirm8Plugin.ts

import { BasePlugin } from '../BasePlugin';
import {
  PluginMetadata,
  EntityType,
  SyncContext,
  SyncResult,
  EntityData,
  WebhookPayload
} from '../../core/types';

/**
 * 🔌 CONFIRM8 PLUGIN
 * 
 * Plugin de sincronização com Confirm8 (sistema de agendamentos).
 * 
 * Funcionalidades:
 * - Sync contatos/clientes
 * - Sync agendamentos
 * - Webhooks para notificações de agendamento
 * - Rate limiting (60 req/min)
 */
export class Confirm8Plugin extends BasePlugin {
  name = 'confirm8';
  version = '1.0.0';
  description = 'Confirm8 Scheduling Integration';

  private apiClient?: any;

  /**
   * GET METADATA
   */
  getMetadata(): PluginMetadata {
    return {
      name: this.name,
      version: this.version,
      description: this.description,
      author: 'OMNI Platform',
      supportedEntities: [
        EntityType.CONTACT,
        EntityType.APPOINTMENT
      ],
      requiredConfig: [
        'apiDomain',
        'apiKeyToken',
        'apiKeySecret'
      ],
      optionalConfig: [
        'webhookSecret',
        'defaultCalendar'
      ],
      webhookEvents: [
        'appointment.scheduled',
        'appointment.cancelled',
        'appointment.completed',
        'client.created',
        'client.updated'
      ],
      rateLimits: {
        maxRequests: 60,
        windowMs: 60000 // 1 minuto
      }
    };
  }

  /**
   * ON INITIALIZE
   */
  protected async onInitialize(config: any): Promise<void> {
    // Inicializar cliente Confirm8
    // const axios = require('axios');
    // this.apiClient = axios.create({
    //   baseURL: `https://${config.config.apiDomain}.confirm8.com/api`,
    //   headers: {
    //     'X-API-Token': config.config.apiKeyToken,
    //     'X-API-Secret': config.config.apiKeySecret
    //   }
    // });

    console.log(`🔧 Confirm8 plugin initialized`);
  }

  /**
   * SYNC TO OMNI
   */
  async syncToOmni(
    entity: EntityType,
    externalData: any,
    context: SyncContext
  ): Promise<SyncResult> {
    this.ensureInitialized();

    try {
      if (entity === EntityType.CONTACT) {
        return await this.syncClientToOmni(externalData, context);
      }

      if (entity === EntityType.APPOINTMENT) {
        return await this.syncAppointmentToOmni(externalData, context);
      }

      return this.createErrorResult(
        this.createError('UNSUPPORTED_ENTITY', `Entity ${entity} not supported`)
      );
    } catch (error: any) {
      return this.createErrorResult(
        this.createError('SYNC_ERROR', error.message, true, error)
      );
    }
  }

  /**
   * SYNC FROM OMNI
   */
  async syncFromOmni(
    entity: EntityType,
    omniData: any,
    context: SyncContext
  ): Promise<SyncResult> {
    this.ensureInitialized();

    try {
      if (entity === EntityType.CONTACT) {
        return await this.syncClientFromOmni(omniData, context);
      }

      if (entity === EntityType.APPOINTMENT) {
        return await this.syncAppointmentFromOmni(omniData, context);
      }

      return this.createErrorResult(
        this.createError('UNSUPPORTED_ENTITY', `Entity ${entity} not supported`)
      );
    } catch (error: any) {
      return this.createErrorResult(
        this.createError('SYNC_ERROR', error.message, true, error)
      );
    }
  }

  /**
   * HANDLE WEBHOOK
   */
  async handleWebhook(
    payload: WebhookPayload,
    context: SyncContext
  ): Promise<SyncResult> {
    this.ensureInitialized();

    try {
      const eventType = payload.event;

      if (eventType.startsWith('client.')) {
        return await this.handleClientWebhook(payload, context);
      }

      if (eventType.startsWith('appointment.')) {
        return await this.handleAppointmentWebhook(payload, context);
      }

      return this.createSuccessResult();

    } catch (error: any) {
      return this.createErrorResult(
        this.createError('WEBHOOK_ERROR', error.message, false, error)
      );
    }
  }

  /**
   * MAP TO OMNI
   */
  mapToOmni(entity: EntityType, externalData: any): EntityData {
    if (entity === EntityType.CONTACT) {
      return this.mapClientToOmni(externalData);
    }

    if (entity === EntityType.APPOINTMENT) {
      return this.mapAppointmentToOmni(externalData);
    }

    throw new Error(`Entity ${entity} mapping not implemented`);
  }

  /**
   * MAP FROM OMNI
   */
  mapFromOmni(entity: EntityType, omniData: any): any {
    if (entity === EntityType.CONTACT) {
      return this.mapClientFromOmni(omniData);
    }

    if (entity === EntityType.APPOINTMENT) {
      return this.mapAppointmentFromOmni(omniData);
    }

    throw new Error(`Entity ${entity} mapping not implemented`);
  }

  // ============================================
  // PRIVATE HELPERS
  // ============================================

  /**
   * SYNC CLIENT TO OMNI
   */
  private async syncClientToOmni(
    externalData: any,
    context: SyncContext
  ): Promise<SyncResult> {
    if (context.dryRun) {
      return this.createSuccessResult(undefined, externalData.id);
    }

    // TODO: Implementar criação/atualização no OMNI
    return this.createSuccessResult(
      'generated-omni-id',
      externalData.id
    );
  }

  /**
   * SYNC CLIENT FROM OMNI
   */
  private async syncClientFromOmni(
    omniData: any,
    context: SyncContext
  ): Promise<SyncResult> {
    if (context.dryRun) {
      return this.createSuccessResult(omniData.id, undefined);
    }

    // TODO: Implementar criação/atualização no Confirm8
    return this.createSuccessResult(
      omniData.id,
      'generated-confirm8-id'
    );
  }

  /**
   * SYNC APPOINTMENT TO OMNI
   */
  private async syncAppointmentToOmni(
    externalData: any,
    context: SyncContext
  ): Promise<SyncResult> {
    if (context.dryRun) {
      return this.createSuccessResult(undefined, externalData.id);
    }

    // TODO: Implementar criação/atualização no OMNI
    return this.createSuccessResult(
      'generated-omni-id',
      externalData.id
    );
  }

  /**
   * SYNC APPOINTMENT FROM OMNI
   */
  private async syncAppointmentFromOmni(
    omniData: any,
    context: SyncContext
  ): Promise<SyncResult> {
    if (context.dryRun) {
      return this.createSuccessResult(omniData.id, undefined);
    }

    // TODO: Implementar criação/atualização no Confirm8
    return this.createSuccessResult(
      omniData.id,
      'generated-confirm8-id'
    );
  }

  /**
   * HANDLE CLIENT WEBHOOK
   */
  private async handleClientWebhook(
    payload: WebhookPayload,
    context: SyncContext
  ): Promise<SyncResult> {
    const clientData = payload.data;

    return await this.syncToOmni(
      EntityType.CONTACT,
      clientData,
      context
    );
  }

  /**
   * HANDLE APPOINTMENT WEBHOOK
   */
  private async handleAppointmentWebhook(
    payload: WebhookPayload,
    context: SyncContext
  ): Promise<SyncResult> {
    const appointmentData = payload.data;

    return await this.syncToOmni(
      EntityType.APPOINTMENT,
      appointmentData,
      context
    );
  }

  /**
   * MAP CLIENT TO OMNI
   */
  private mapClientToOmni(confirm8Client: any): EntityData {
    return {
      type: EntityType.CONTACT,
      data: {
        name: confirm8Client.name || confirm8Client.full_name || '',
        email: this.normalizeEmail(confirm8Client.email),
        phone: this.normalizePhone(confirm8Client.phone || confirm8Client.mobile),
        address: confirm8Client.address,
        city: confirm8Client.city,
        state: confirm8Client.state,
        zipCode: confirm8Client.zip_code,
        tags: confirm8Client.tags || [],
        customFields: {
          confirm8_id: confirm8Client.id,
          confirm8_notes: confirm8Client.notes,
          confirm8_created_at: confirm8Client.created_at,
          confirm8_updated_at: confirm8Client.updated_at
        }
      },
      metadata: {
        source: 'confirm8',
        lastModified: new Date(confirm8Client.updated_at || confirm8Client.created_at)
      }
    };
  }

  /**
   * MAP CLIENT FROM OMNI
   */
  private mapClientFromOmni(omniContact: any): any {
    return {
      name: omniContact.name,
      email: omniContact.email,
      phone: omniContact.phone,
      mobile: omniContact.phone,
      address: omniContact.address,
      city: omniContact.city,
      state: omniContact.state,
      zip_code: omniContact.zipCode,
      notes: omniContact.notes,
      custom_data: {
        omni_id: omniContact.id
      }
    };
  }

  /**
   * MAP APPOINTMENT TO OMNI
   */
  private mapAppointmentToOmni(confirm8Appointment: any): EntityData {
    return {
      type: EntityType.APPOINTMENT,
      data: {
        clientId: confirm8Appointment.client_id,
        title: confirm8Appointment.service_name || 'Appointment',
        description: confirm8Appointment.notes,
        startTime: new Date(confirm8Appointment.start_time),
        endTime: new Date(confirm8Appointment.end_time),
        status: this.mapAppointmentStatus(confirm8Appointment.status),
        location: confirm8Appointment.location,
        customFields: {
          confirm8_id: confirm8Appointment.id,
          confirm8_service_id: confirm8Appointment.service_id,
          confirm8_staff_id: confirm8Appointment.staff_id,
          confirm8_calendar_id: confirm8Appointment.calendar_id
        }
      },
      metadata: {
        source: 'confirm8',
        lastModified: new Date(confirm8Appointment.updated_at)
      }
    };
  }

  /**
   * MAP APPOINTMENT FROM OMNI
   */
  private mapAppointmentFromOmni(omniAppointment: any): any {
    return {
      service_name: omniAppointment.title,
      start_time: omniAppointment.startTime,
      end_time: omniAppointment.endTime,
      notes: omniAppointment.description,
      status: this.mapOmniAppointmentStatus(omniAppointment.status),
      location: omniAppointment.location,
      custom_data: {
        omni_id: omniAppointment.id
      }
    };
  }

  /**
   * MAP APPOINTMENT STATUS
   */
  private mapAppointmentStatus(confirm8Status: string): string {
    const statusMap: Record<string, string> = {
      'scheduled': 'scheduled',
      'confirmed': 'confirmed',
      'cancelled': 'cancelled',
      'completed': 'completed',
      'no_show': 'no_show'
    };
    return statusMap[confirm8Status] || 'scheduled';
  }

  /**
   * MAP OMNI APPOINTMENT STATUS
   */
  private mapOmniAppointmentStatus(omniStatus: string): string {
    const statusMap: Record<string, string> = {
      'scheduled': 'scheduled',
      'confirmed': 'confirmed',
      'cancelled': 'cancelled',
      'completed': 'completed',
      'no_show': 'no_show'
    };
    return statusMap[omniStatus] || 'scheduled';
  }
}