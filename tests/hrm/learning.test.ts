// tests/hrm/learning.test.ts
import { PrismaClient } from '@prisma/client';
import { LearningService } from '../../src/modules/hrm/learning/learning.service';

const prisma = new PrismaClient();
const learningService = new LearningService(prisma);

describe('Learning Service', () => {
  let testCompanyId: string;
  let testUserId: string;
  let testPathId: string;
  let testEnrollmentId: string;

  beforeAll(async () => {
    // Setup test data
    const company = await prisma.company.create({
      data: { name: 'Test Co', domain: 'test.co', active: true },
    });
    testCompanyId = company.id;

    const user = await prisma.user.create({
      data: {
        email: 'learner@test.co',
        passwordHash: 'hash',
        name: 'Learner',
        role: 'user',
        companyId: testCompanyId,
      },
    });
    testUserId = user.id;
  });

  afterAll(async () => {
    await prisma.learningProgress.deleteMany({ where: { enrollment: { userId: testUserId } } });
    await prisma.learningEnrollment.deleteMany({ where: { userId: testUserId } });
    await prisma.learningPathItem.deleteMany({ where: { path: { companyId: testCompanyId } } });
    await prisma.learningPath.deleteMany({ where: { companyId: testCompanyId } });
    await prisma.user.delete({ where: { id: testUserId } });
    await prisma.company.delete({ where: { id: testCompanyId } });
    await prisma.$disconnect();
  });

  describe('createPath', () => {
    it('should create a learning path with items', async () => {
      const pathData = {
        title: 'JavaScript Mastery',
        description: 'Learn JavaScript from scratch',
        category: 'technical',
        difficulty: 'beginner',
        estimatedHours: 30,
        targetSkills: [],
        items: [
          {
            order: 1,
            contentType: 'video',
            title: 'JS Basics',
            estimatedMinutes: 60,
            required: true,
          },
          {
            order: 2,
            contentType: 'quiz',
            title: 'JS Quiz',
            estimatedMinutes: 15,
            required: true,
          },
        ],
      };

      const path = await learningService.createPath(
        pathData,
        testCompanyId,
        testUserId
      );

      expect(path).toBeDefined();
      expect(path.title).toBe(pathData.title);
      expect(path.items).toHaveLength(2);
      expect(path.isActive).toBe(true);

      testPathId = path.id;
    });
  });

  describe('listPaths', () => {
    it('should list learning paths', async () => {
      const paths = await learningService.listPaths(testCompanyId);

      expect(paths).toHaveLength(1);
      expect(paths[0].title).toBe('JavaScript Mastery');
    });

    it('should filter by category', async () => {
      const paths = await learningService.listPaths(testCompanyId, {
        category: 'technical',
      });

      expect(paths).toHaveLength(1);
    });

    it('should filter by difficulty', async () => {
      const paths = await learningService.listPaths(testCompanyId, {
        difficulty: 'beginner',
      });

      expect(paths).toHaveLength(1);
    });
  });

  describe('enrollInPath', () => {
    it('should enroll user in path', async () => {
      const enrollment = await learningService.enrollInPath(
        testPathId,
        testUserId
      );

      expect(enrollment).toBeDefined();
      expect(enrollment.pathId).toBe(testPathId);
      expect(enrollment.userId).toBe(testUserId);
      expect(enrollment.status).toBe('in_progress');
      expect(enrollment.progress).toBe(0);

      testEnrollmentId = enrollment.id;
    });

    it('should not enroll twice in same path', async () => {
      await expect(
        learningService.enrollInPath(testPathId, testUserId)
      ).rejects.toThrow('Already enrolled');
    });
  });

  describe('updateProgress', () => {
    it('should update progress for an item', async () => {
      // Get first item
      const path = await prisma.learningPath.findUnique({
        where: { id: testPathId },
        include: { items: true },
      });

      const itemId = path!.items[0].id;

      const progress = await learningService.updateProgress(
        testEnrollmentId,
        itemId,
        {
          completed: true,
          timeSpentMinutes: 60,
        },
        testUserId
      );

      expect(progress).toBeDefined();
      expect(progress.completed).toBe(true);
      expect(progress.timeSpentMinutes).toBe(60);

      // Check enrollment progress updated
      const enrollment = await prisma.learningEnrollment.findUnique({
        where: { id: testEnrollmentId },
      });

      expect(enrollment?.progress).toBeGreaterThan(0);
    });

    it('should mark enrollment completed when all items done', async () => {
      const path = await prisma.learningPath.findUnique({
        where: { id: testPathId },
        include: { items: true },
      });

      // Complete second item
      await learningService.updateProgress(
        testEnrollmentId,
        path!.items[1].id,
        { completed: true, timeSpentMinutes: 15 },
        testUserId
      );

      const enrollment = await prisma.learningEnrollment.findUnique({
        where: { id: testEnrollmentId },
      });

      expect(enrollment?.status).toBe('completed');
      expect(enrollment?.progress).toBe(100);
      expect(enrollment?.completedAt).toBeDefined();
    });
  });

  describe('getPathAnalytics', () => {
    it('should return analytics for path', async () => {
      const analytics = await learningService.getPathAnalytics(testPathId);

      expect(analytics).toBeDefined();
      expect(analytics.totalEnrollments).toBe(1);
      expect(analytics.completedEnrollments).toBe(1);
      expect(analytics.completionRate).toBe(100);
      expect(analytics.averageProgress).toBe(100);
    });
  });
});
