import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AssignMembershipDto } from './dto/assign-membership.dto';

@Injectable()
export class MembershipsService {
  constructor(private readonly prisma: PrismaService) {}

  async findByWorkspace(workspaceId: string) {
    return this.prisma.membership.findMany({
      where: { workspaceId },
      include: { user: { select: { id: true, name: true, email: true } } },
      orderBy: { role: 'asc' },
    });
  }

  async assign(workspaceId: string, dto: AssignMembershipDto) {
    const existing = await this.prisma.membership.findUnique({
      where: { userId_workspaceId: { userId: dto.userId, workspaceId } },
    });
    if (existing) throw new ConflictException('User already has a membership in this workspace');

    return this.prisma.membership.create({
      data: { workspaceId, userId: dto.userId, role: dto.role },
      include: { user: { select: { id: true, name: true, email: true } } },
    });
  }

  async remove(workspaceId: string, userId: string) {
    const existing = await this.prisma.membership.findUnique({
      where: { userId_workspaceId: { userId, workspaceId } },
    });
    if (!existing) throw new NotFoundException('Membership not found');
    return this.prisma.membership.delete({ where: { id: existing.id } });
  }
}
