import {
  Controller,
  Get,
  Patch,
  Post,
  Delete,
  Param,
  Body,
  UseGuards,
  Query,
  NotFoundException,
  Req,
  Res,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Roles } from '../common/roles.decorator';
import { RolesGuard } from '../common/roles.guard';
import { Permissions } from '../common/permissions.decorator';
import { PermissionsGuard } from '../common/permissions.guard';
import { InternalAuthGuard } from '../common/internal-auth.guard';
import { AdminService } from './admin.service';
import { AuditService } from './audit.service';
import { Permissions as Perm, ALL_PERMISSIONS } from './constants/permissions';
import { Response } from 'express';

@Controller('admin/users')
@UseGuards(AuthGuard('jwt'), RolesGuard, PermissionsGuard)
@Roles('admin')
export class AdminController {
  constructor(
    private adminService: AdminService,
    private auditService: AuditService,
  ) {}

  @Get()
  @Permissions(Perm.USERS_READ)
  async listUsers(
    @Query('page') page = '1',
    @Query('limit') limit = '20',
    @Query('search') search?: string,
  ) {
    return this.adminService.listUsers(parseInt(page), parseInt(limit), search);
  }

  @Get('export/csv')
  @Permissions(Perm.EXPORT)
  async exportUsersCsv(@Query('search') search: string, @Res() res: Response) {
    const csv = await this.adminService.exportUsersCsv(search);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=users.csv');
    res.send(csv);
  }

  @Get(':id')
  @Permissions(Perm.USERS_READ)
  async getUser(@Param('id') id: string) {
    const user = await this.adminService.getUser(id);
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  @Get(':id/detail')
  @Permissions(Perm.USERS_READ)
  async getUserDetail(@Param('id') id: string) {
    return this.adminService.getUserDetail(id);
  }

  @Get(':id/transactions')
  @Permissions(Perm.TRANSACTIONS_READ)
  async getUserTransactions(
    @Param('id') id: string,
    @Query('page') page = '1',
    @Query('limit') limit = '20',
  ) {
    return this.adminService.getUserTransactions(id, parseInt(page), parseInt(limit));
  }

  @Patch(':id/role')
  @Permissions(Perm.USERS_ROLE)
  async updateRole(@Param('id') id: string, @Body('role') role: 'user' | 'admin', @Req() req: any) {
    return this.adminService.updateRole(id, role, {
      id: req.user.sub || req.user.id,
      phone: req.user.phone,
    });
  }

  @Patch(':id/ban')
  @Permissions(Perm.USERS_BAN)
  async toggleBan(@Param('id') id: string, @Body('is_banned') isBanned: boolean, @Req() req: any) {
    return this.adminService.toggleBan(id, isBanned, {
      id: req.user.sub || req.user.id,
      phone: req.user.phone,
    });
  }

  @Post('bulk/role')
  @Permissions(Perm.USERS_ROLE)
  async bulkUpdateRole(@Body() body: { ids: string[]; role: 'user' | 'admin' }, @Req() req: any) {
    return this.adminService.bulkUpdateRole(body.ids, body.role, {
      id: req.user.sub || req.user.id,
      phone: req.user.phone,
    });
  }

  @Post('bulk/ban')
  @Permissions(Perm.USERS_BAN)
  async bulkToggleBan(@Body() body: { ids: string[]; is_banned: boolean }, @Req() req: any) {
    return this.adminService.bulkToggleBan(body.ids, body.is_banned, {
      id: req.user.sub || req.user.id,
      phone: req.user.phone,
    });
  }

  @Get('transactions/all')
  @Permissions(Perm.TRANSACTIONS_READ)
  async listAllTransactions(
    @Query('page') page = '1',
    @Query('limit') limit = '20',
    @Query('type') type?: string,
  ) {
    return this.adminService.listAllTransactions(parseInt(page), parseInt(limit), type);
  }

  @Get('transactions/export/csv')
  @Permissions(Perm.EXPORT)
  async exportTransactionsCsv(@Query('type') type: string, @Res() res: Response) {
    const csv = await this.adminService.exportTransactionsCsv(type);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=transactions.csv');
    res.send(csv);
  }

  @Get('audit/list')
  @Permissions(Perm.AUDIT_READ)
  async listAuditLogs(@Query('page') page = '1', @Query('limit') limit = '50', @Query('action') action?: string) {
    return this.auditService.list(parseInt(page), parseInt(limit), action);
  }

  @Get('permissions/list')
  @Permissions(Perm.USERS_PERMISSIONS)
  async listAllPermissions() {
    return { permissions: ALL_PERMISSIONS };
  }

  @Get(':id/permissions')
  @Permissions(Perm.USERS_PERMISSIONS)
  async getUserPermissions(@Param('id') id: string) {
    return this.adminService.getUserPermissions(id);
  }

  @Post(':id/permissions/grant')
  @Permissions(Perm.USERS_PERMISSIONS)
  async grantPermissions(
    @Param('id') id: string,
    @Body('permissions') permissions: string[],
    @Req() req: any,
  ) {
    return this.adminService.grantPermissions(id, permissions, {
      id: req.user.sub || req.user.id,
      phone: req.user.phone,
    });
  }

  @Post(':id/permissions/revoke')
  @Permissions(Perm.USERS_PERMISSIONS)
  async revokePermissions(
    @Param('id') id: string,
    @Body('permissions') permissions: string[],
    @Req() req: any,
  ) {
    return this.adminService.revokePermissions(id, permissions, {
      id: req.user.sub || req.user.id,
      phone: req.user.phone,
    });
  }
}

@Controller('admin/audit')
export class AuditController {
  constructor(private auditService: AuditService) {}

  @UseGuards(InternalAuthGuard)
  @Post('log')
  async logEvent(@Body() body: {
    actor_id: string;
    actor_phone?: string;
    action: string;
    entity_type: string;
    entity_id: string;
    details?: Record<string, any>;
  }) {
    return this.auditService.log(body);
  }
}