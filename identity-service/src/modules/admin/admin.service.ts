import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like, In } from 'typeorm';
import { User, UserRole } from '../auth/entities/user.entity';
import { Transaction } from '../wallet/entities/transaction.entity';
import { AuditService } from './audit.service';

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Transaction)
    private transactionRepository: Repository<Transaction>,
    private auditService: AuditService,
  ) {}

  async listUsers(page: number, limit: number, search?: string) {
    const where: any = {};
    if (search) {
      where.phone_number = Like(`%${search}%`);
    }
    const [users, total] = await this.userRepository.findAndCount({
      where,
      order: { created_at: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
      select: ['id', 'phone_number', 'email', 'full_name', 'wallet_balance', 'role', 'is_banned', 'phone_verified', 'created_at'],
    });
    return { data: users, meta: { total, page, limit, total_pages: Math.ceil(total / limit) } };
  }

  async getUser(id: string) {
    return this.userRepository.findOne({
      where: { id },
      select: ['id', 'phone_number', 'email', 'full_name', 'wallet_balance', 'role', 'is_banned', 'phone_verified', 'created_at'],
    });
  }

  async getUserDetail(id: string) {
    const user = await this.userRepository.findOne({
      where: { id },
      select: ['id', 'phone_number', 'email', 'full_name', 'wallet_balance', 'role', 'is_banned', 'phone_verified', 'created_at', 'avatar_url'],
    });
    if (!user) throw new NotFoundException('User not found');

    const transactions = await this.transactionRepository.find({
      where: { user_id: id },
      order: { created_at: 'DESC' },
      take: 50,
    });

    let bids: any[] = [];
    let wonAuctions: any[] = [];
    try {
      const [bidRows] = await this.userRepository.query(
        `SELECT b.id, b.amount, b.bid_time, b.auction_id, a.status
         FROM bids b JOIN auctions a ON a.id = b.auction_id
         WHERE b.user_id = $1 ORDER BY b.bid_time DESC LIMIT 50`, [id],
      );
      bids = bidRows;
      const [wonRows] = await this.userRepository.query(
        `SELECT a.id, a.status, a.winning_bid_amount, a.end_time, p.name AS product_name
         FROM auctions a JOIN products p ON p.id = a.product_id
         WHERE a.winner_user_id = $1 ORDER BY a.end_time DESC LIMIT 20`, [id],
      );
      wonAuctions = wonRows;
    } catch {}

    const transactionSummary = {
      total_deposits: 0,
      total_bid_fees: 0,
      total_refunds: 0,
    };
    for (const t of transactions) {
      if (t.type === 'DEPOSIT') transactionSummary.total_deposits += Number(t.amount);
      if (t.type === 'BID_FEE') transactionSummary.total_bid_fees += Number(t.amount);
      if (t.type === 'REFUND') transactionSummary.total_refunds += Number(t.amount);
    }

    return { user, transactions, bids, won_auctions: wonAuctions, transaction_summary: transactionSummary };
  }

  async getUserTransactions(userId: string, page: number, limit: number) {
    const [data, total] = await this.transactionRepository.findAndCount({
      where: { user_id: userId },
      order: { created_at: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    return { data, meta: { total, page, limit, total_pages: Math.ceil(total / limit) } };
  }

  async listAllTransactions(page: number, limit: number, type?: string) {
    const where: any = {};
    if (type) where.type = type;
    const [data, total] = await this.transactionRepository.findAndCount({
      where,
      order: { created_at: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    return { data, meta: { total, page, limit, total_pages: Math.ceil(total / limit) } };
  }

  async updateRole(id: string, role: 'user' | 'admin', actor: { id: string; phone?: string }) {
    const user = await this.userRepository.findOne({ where: { id } });
    if (!user) throw new NotFoundException('User not found');
    const oldRole = user.role;
    user.role = role === 'admin' ? UserRole.ADMIN : UserRole.USER;
    await this.userRepository.save(user);
    await this.auditService.log({
      actor_id: actor.id,
      actor_phone: actor.phone,
      action: 'update_role',
      entity_type: 'user',
      entity_id: id,
      details: { from: oldRole, to: user.role },
    });
    return { id, role: user.role };
  }

  async toggleBan(id: string, isBanned: boolean, actor: { id: string; phone?: string }) {
    const user = await this.userRepository.findOne({ where: { id } });
    if (!user) throw new NotFoundException('User not found');
    user.is_banned = isBanned;
    await this.userRepository.save(user);
    await this.auditService.log({
      actor_id: actor.id,
      actor_phone: actor.phone,
      action: isBanned ? 'ban_user' : 'unban_user',
      entity_type: 'user',
      entity_id: id,
      details: { is_banned: isBanned },
    });
    return { id, is_banned: user.is_banned };
  }

  async bulkUpdateRole(ids: string[], role: 'user' | 'admin', actor: { id: string; phone?: string }) {
    const users = await this.userRepository.find({ where: { id: In(ids) } });
    const newRole = role === 'admin' ? UserRole.ADMIN : UserRole.USER;
    for (const u of users) {
      const old = u.role;
      u.role = newRole;
      await this.auditService.log({
        actor_id: actor.id, actor_phone: actor.phone,
        action: 'update_role',
        entity_type: 'user', entity_id: u.id,
        details: { from: old, to: newRole },
      });
    }
    await this.userRepository.save(users);
    return { updated: users.length, role: newRole };
  }

  async bulkToggleBan(ids: string[], isBanned: boolean, actor: { id: string; phone?: string }) {
    const users = await this.userRepository.find({ where: { id: In(ids) } });
    for (const u of users) {
      u.is_banned = isBanned;
      await this.auditService.log({
        actor_id: actor.id, actor_phone: actor.phone,
        action: isBanned ? 'ban_user' : 'unban_user',
        entity_type: 'user', entity_id: u.id,
        details: { is_banned: isBanned },
      });
    }
    await this.userRepository.save(users);
    return { updated: users.length, is_banned: isBanned };
  }

  async exportUsersCsv(search?: string) {
    const where: any = {};
    if (search) where.phone_number = Like(`%${search}%`);
    const users = await this.userRepository.find({
      where,
      order: { created_at: 'DESC' },
      select: ['id', 'phone_number', 'email', 'full_name', 'wallet_balance', 'role', 'is_banned', 'phone_verified', 'created_at'],
    });
    const header = 'id,phone_number,email,full_name,wallet_balance,role,is_banned,phone_verified,created_at';
    const rows = users.map((u) =>
      [u.id, u.phone_number, u.email, u.full_name, u.wallet_balance, u.role, u.is_banned, u.phone_verified, u.created_at].join(','),
    );
    return [header, ...rows].join('\n');
  }

  async exportTransactionsCsv(type?: string) {
    const where: any = {};
    if (type) where.type = type;
    const txns = await this.transactionRepository.find({
      where,
      order: { created_at: 'DESC' },
    });
    const header = 'id,user_id,amount,type,reference_id,created_at';
    const rows = txns.map((t) =>
      [t.id, t.user_id, t.amount, t.type, t.reference_id || '', t.created_at].join(','),
    );
    return [header, ...rows].join('\n');
  }
}