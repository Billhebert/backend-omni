// src/modules/auth/auth.service.ts
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

export class AuthService {
  constructor(private prisma: PrismaClient) {}

  async register(data: { email: string; password: string; name: string; companyId: string }) {
    const existingUser = await this.prisma.user.findUnique({
      where: { companyId_email: { companyId: data.companyId, email: data.email } },
    });

    if (existingUser) {
      throw new Error('User already exists');
    }

    const passwordHash = await bcrypt.hash(data.password, 10);

    return this.prisma.user.create({
      data: {
        email: data.email,
        passwordHash,
        name: data.name,
        companyId: data.companyId,
        role: 'user',
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        companyId: true,
      },
    });
  }

  async login(email: string, password: string, companyId: string) {
    const user = await this.prisma.user.findUnique({
      where: { companyId_email: { companyId, email } },
    });

    if (!user) {
      throw new Error('Invalid credentials');
    }

    const validPassword = await bcrypt.compare(password, user.passwordHash);
    if (!validPassword) {
      throw new Error('Invalid credentials');
    }

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      companyId: user.companyId,
    };
  }

  async changePassword(userId: string, oldPassword: string, newPassword: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new Error('User not found');

    const validPassword = await bcrypt.compare(oldPassword, user.passwordHash);
    if (!validPassword) throw new Error('Invalid password');

    const newPasswordHash = await bcrypt.hash(newPassword, 10);

    return this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash: newPasswordHash },
    });
  }
}
