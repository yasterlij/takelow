import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class DisputeService {
  constructor(private prisma: PrismaService) {}

  async createDispute(
    userId: string,
    auctionId: string | null,
    type: string,
    description: string,
  ) {
    return this.prisma.dispute.create({
      data: {
        user_id: userId,
        auction_id: auctionId,
        type,
        description,
        status: 'OPEN',
      },
    });
  }

  async listDisputes(userId: string) {
    return this.prisma.dispute.findMany({
      where: { user_id: userId },
      orderBy: { created_at: 'desc' },
    });
  }

  async getDispute(id: string) {
    const dispute = await this.prisma.dispute.findUnique({ where: { id } });
    if (!dispute) {
      throw new NotFoundException('Dispute not found');
    }
    return dispute;
  }

  async listAllDisputes(
    status: string | undefined,
    page: number,
    limit: number,
  ) {
    const where: any = {};
    if (status) {
      where.status = status;
    }
    const [data, total] = await Promise.all([
      this.prisma.dispute.findMany({
        where,
        orderBy: { created_at: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.dispute.count({ where }),
    ]);
    return {
      data,
      meta: { total, page, limit, total_pages: Math.ceil(total / limit) },
    };
  }

  async updateDisputeStatus(
    id: string,
    status: string,
    resolution: string | undefined,
    adminId: string,
  ) {
    const dispute = await this.prisma.dispute.findUnique({ where: { id } });
    if (!dispute) {
      throw new NotFoundException('Dispute not found');
    }

    return this.prisma.dispute.update({
      where: { id },
      data: {
        status,
        resolution,
        resolved_by: adminId,
        updated_at: new Date(),
      },
    });
  }
}
