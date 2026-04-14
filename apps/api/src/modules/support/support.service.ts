import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

interface CreateTicketInput {
  userId?: string;
  name?: string;
  email?: string;
  subject: string;
  message: string;
}

@Injectable()
export class SupportService {
  constructor(private readonly prisma: PrismaService) {}

  async create(input: CreateTicketInput) {
    return this.prisma.supportTicket.create({
      data: {
        userId: input.userId ?? null,
        name: input.name ?? null,
        email: input.email ?? null,
        subject: input.subject,
        message: input.message,
      },
    });
  }
}
