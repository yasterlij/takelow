import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLog } from './entities/audit-log.entity';

@Injectable()
export class AuditService {
  constructor(
    @InjectRepository(AuditLog)
    private auditRepository: Repository<AuditLog>,
  ) {}

  async log(entry: {
    actor_id: string;
    actor_phone?: string;
    action: string;
    entity_type: string;
    entity_id: string;
    details?: Record<string, any>;
  }) {
    return this.auditRepository.save(this.auditRepository.create(entry));
  }

  async list(page = 1, limit = 50, action?: string) {
    const where: any = {};
    if (action) where.action = action;
    const [data, total] = await this.auditRepository.findAndCount({
      where,
      order: { created_at: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    return { data, meta: { total, page, limit, total_pages: Math.ceil(total / limit) } };
  }
}