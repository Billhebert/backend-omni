// tests/auth/auth.test.ts
import { PrismaClient } from '@prisma/client';
import { AuthService } from '../../src/modules/auth/auth.service';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();
const authService = new AuthService(prisma);

describe('Auth Service', () => {
  let testCompanyId: string;
  let testUserId: string;

  beforeAll(async () => {
    // Create test company
    const company = await prisma.company.create({
      data: {
        name: 'Test Company',
        domain: 'test.example.com',
        active: true,
      },
    });
    testCompanyId = company.id;
  });

  afterAll(async () => {
    // Cleanup
    await prisma.user.deleteMany({ where: { companyId: testCompanyId } });
    await prisma.company.delete({ where: { id: testCompanyId } });
    await prisma.$disconnect();
  });

  describe('register', () => {
    it('should register a new user', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'password123',
        name: 'Test User',
        companyId: testCompanyId,
      };

      const user = await authService.register(userData);

      expect(user).toBeDefined();
      expect(user.email).toBe(userData.email);
      expect(user.name).toBe(userData.name);
      expect(user.companyId).toBe(testCompanyId);
      expect(user.role).toBe('user');
      expect(user).not.toHaveProperty('passwordHash');

      testUserId = user.id;
    });

    it('should not register duplicate user', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'password123',
        name: 'Test User 2',
        companyId: testCompanyId,
      };

      await expect(authService.register(userData)).rejects.toThrow(
        'User already exists'
      );
    });

    it('should hash password', async () => {
      const user = await prisma.user.findUnique({
        where: { id: testUserId },
      });

      expect(user?.passwordHash).toBeDefined();
      expect(user?.passwordHash).not.toBe('password123');

      const isValid = await bcrypt.compare('password123', user!.passwordHash);
      expect(isValid).toBe(true);
    });
  });

  describe('login', () => {
    it('should login with valid credentials', async () => {
      const user = await authService.login(
        'test@example.com',
        'password123',
        testCompanyId
      );

      expect(user).toBeDefined();
      expect(user.email).toBe('test@example.com');
      expect(user.id).toBe(testUserId);
    });

    it('should not login with invalid email', async () => {
      await expect(
        authService.login('wrong@example.com', 'password123', testCompanyId)
      ).rejects.toThrow('Invalid credentials');
    });

    it('should not login with invalid password', async () => {
      await expect(
        authService.login('test@example.com', 'wrongpassword', testCompanyId)
      ).rejects.toThrow('Invalid credentials');
    });

    it('should not login with wrong company', async () => {
      await expect(
        authService.login('test@example.com', 'password123', 'wrong-company-id')
      ).rejects.toThrow('Invalid credentials');
    });
  });

  describe('changePassword', () => {
    it('should change password', async () => {
      await authService.changePassword(
        testUserId,
        'password123',
        'newpassword123'
      );

      // Try login with new password
      const user = await authService.login(
        'test@example.com',
        'newpassword123',
        testCompanyId
      );

      expect(user).toBeDefined();
    });

    it('should not change password with wrong old password', async () => {
      await expect(
        authService.changePassword(testUserId, 'wrongpassword', 'anotherpassword')
      ).rejects.toThrow('Invalid password');
    });
  });
});
