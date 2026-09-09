import prisma from './db';

interface IAuditLogParams {
  userId?: number;
  action: string;
  entity: string;
  entityId?: string | number;
  details?: string;
  ipAddress?: string;
}

export const createAuditLog = async (params: IAuditLogParams) => {
  try {
    await prisma.auditLog.create({
      data: {
        userId: params.userId || null,
        action: params.action,
        entity: params.entity,
        entityId: params.entityId ? String(params.entityId) : null,
        details: params.details || null,
        ipAddress: params.ipAddress || null,
      },
    });
  } catch (err) {
    console.error('Failed to write audit log:', err);
  }
};
