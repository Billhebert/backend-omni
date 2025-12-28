// backend/src/modules/hrm/positions/matching.service.ts

import { PrismaClient } from '@prisma/client';

export interface MatchResult {
  score: number; // 0-100
  gaps: SkillGap[];
  strengths: SkillStrength[];
  readyForPromotion: boolean;
  estimatedTimeToReady?: number; // days
}

export interface SkillGap {
  skillId: string;
  skillName: string;
  category: string;
  currentLevel: number;
  requiredLevel: number;
  gap: number;
  priority: 'critical' | 'high' | 'medium' | 'low';
  weight: number;
}

export interface SkillStrength {
  skillId: string;
  skillName: string;
  currentLevel: number;
  requiredLevel: number;
  excess: number; // how much over requirement
}

export interface TeamSuggestion {
  members: Array<{
    userId: string;
    userName: string;
    skills: string[];
    availability: number; // 0-100%
    matchScore: number;
  }>;
  coverageScore: number; // 0-100% - how well team covers requirements
  totalCost?: number;
  estimatedStartDate?: Date;
}

export class MatchingEngine {
  constructor(
    private prisma: PrismaClient,
    private companyId: string
  ) {}

  // ============================================
  // EMPLOYEE → JOB POSITION MATCHING
  // ============================================

  async matchUserToPosition(
    userId: string,
    positionId: string
  ): Promise<MatchResult> {
    // 1. Fetch user skills
    const userSkills = await this.prisma.employeeSkill.findMany({
      where: { userId },
      include: { skill: true },
    });

    // 2. Fetch position requirements
    const position = await this.prisma.jobPosition.findUnique({
      where: { id: positionId },
      include: {
        requiredSkills: {
          include: { skill: true },
        },
      },
    });

    if (!position) {
      throw new Error('Position not found');
    }

    // 3. Calculate match score and gaps
    const gaps: SkillGap[] = [];
    const strengths: SkillStrength[] = [];
    let totalScore = 0;
    let maxPossibleScore = 0;

    for (const reqSkill of position.requiredSkills) {
      const userSkill = userSkills.find((us) => us.skillId === reqSkill.skillId);
      const currentLevel = userSkill?.proficiency || 0;
      const requiredLevel = reqSkill.requiredLevel;
      const weight = reqSkill.weight;

      // Calculate weighted score
      maxPossibleScore += requiredLevel * weight;

      if (currentLevel >= requiredLevel) {
        // User meets or exceeds requirement
        totalScore += requiredLevel * weight;
        
        if (currentLevel > requiredLevel) {
          strengths.push({
            skillId: reqSkill.skillId,
            skillName: reqSkill.skill.name,
            currentLevel,
            requiredLevel,
            excess: currentLevel - requiredLevel,
          });
        }
      } else {
        // Gap exists
        const gap = requiredLevel - currentLevel;
        totalScore += currentLevel * weight;

        gaps.push({
          skillId: reqSkill.skillId,
          skillName: reqSkill.skill.name,
          category: reqSkill.skill.category,
          currentLevel,
          requiredLevel,
          gap,
          priority: this.calculateGapPriority(gap, reqSkill.priority),
          weight,
        });
      }
    }

    // 4. Calculate final score (0-100)
    const score = maxPossibleScore > 0 
      ? Math.round((totalScore / maxPossibleScore) * 100)
      : 0;

    // 5. Determine readiness
    const criticalGaps = gaps.filter((g) => g.priority === 'critical');
    const readyForPromotion = score >= 80 && criticalGaps.length === 0;

    // 6. Estimate time to ready (if not ready)
    let estimatedTimeToReady: number | undefined;
    if (!readyForPromotion && gaps.length > 0) {
      // Assume 30 days per skill level gap on average
      const totalGapLevels = gaps.reduce((sum, g) => sum + g.gap, 0);
      estimatedTimeToReady = totalGapLevels * 30;
    }

    return {
      score,
      gaps: gaps.sort((a, b) => {
        // Sort by priority first, then by gap size
        const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
        return priorityOrder[a.priority] - priorityOrder[b.priority] || b.gap - a.gap;
      }),
      strengths,
      readyForPromotion,
      estimatedTimeToReady,
    };
  }

  // ============================================
  // FIND CANDIDATES FOR POSITION
  // ============================================

  async findCandidatesForPosition(
    positionId: string,
    options: {
      minScore?: number;
      limit?: number;
      includeExternal?: boolean;
    } = {}
  ) {
    const { minScore = 50, limit = 10, includeExternal = false } = options;

    // Get all users in company
    const users = await this.prisma.user.findMany({
      where: { companyId: this.companyId },
      include: {
        employeeSkills: {
          include: { skill: true },
        },
      },
    });

    // Match each user
    const candidates = await Promise.all(
      users.map(async (user) => {
        const matchResult = await this.matchUserToPosition(user.id, positionId);
        return {
          userId: user.id,
          userName: user.name,
          email: user.email,
          ...matchResult,
        };
      })
    );

    // Filter and sort
    return candidates
      .filter((c) => c.score >= minScore)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }

  // ============================================
  // PROJECT TEAM BUILDER
  // ============================================

  async suggestTeamForProject(
    projectId: string,
    options: {
      maxTeamSize?: number;
      considerAvailability?: boolean;
      startDate?: Date;
    } = {}
  ): Promise<TeamSuggestion> {
    const { maxTeamSize = 10, considerAvailability = true, startDate = new Date() } = options;

    // 1. Fetch project requirements
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      include: {
        requiredSkills: {
          include: { skill: true },
        },
      },
    });

    if (!project) {
      throw new Error('Project not found');
    }

    // 2. Fetch all users with their skills and availability
    const users = await this.prisma.user.findMany({
      where: { companyId: this.companyId },
      include: {
        employeeSkills: {
          include: { skill: true },
        },
        projectMemberships: considerAvailability
          ? {
              where: {
                isActive: true,
                OR: [
                  { endDate: null },
                  { endDate: { gte: startDate } },
                ],
              },
            }
          : false,
      },
    });

    // 3. Score each user for project
    const scoredUsers = users.map((user) => {
      let skillScore = 0;
      const matchedSkills: string[] = [];

      for (const reqSkill of project.requiredSkills) {
        const userSkill = user.employeeSkills.find(
          (es) => es.skillId === reqSkill.skillId
        );

        if (userSkill && userSkill.proficiency >= reqSkill.requiredLevel) {
          skillScore += userSkill.proficiency * reqSkill.requiredLevel;
          matchedSkills.push(reqSkill.skill.name);
        }
      }

      // Calculate availability (0-100%)
      let availability = 100;
      if (considerAvailability && user.projectMemberships) {
        const totalAllocation = (user.projectMemberships as any[]).reduce(
          (sum, pm) => sum + pm.allocation,
          0
        );
        availability = Math.max(0, 100 - totalAllocation);
      }

      // Final score: skill match weighted by availability
      const matchScore = skillScore * (availability / 100);

      return {
        userId: user.id,
        userName: user.name,
        skills: matchedSkills,
        availability,
        skillScore,
        matchScore,
      };
    });

    // 4. Select best team using greedy algorithm
    const team: typeof scoredUsers = [];
    const coveredSkills = new Set<string>();
    const remainingUsers = [...scoredUsers].sort((a, b) => b.matchScore - a.matchScore);

    while (team.length < maxTeamSize && remainingUsers.length > 0) {
      // Find user that covers most uncovered required skills
      let bestUser: typeof scoredUsers[0] | null = null;
      let maxNewSkills = 0;

      for (const user of remainingUsers) {
        const newSkills = user.skills.filter((s) => !coveredSkills.has(s)).length;
        if (newSkills > maxNewSkills || (newSkills === maxNewSkills && user.matchScore > (bestUser?.matchScore || 0))) {
          bestUser = user;
          maxNewSkills = newSkills;
        }
      }

      if (!bestUser || maxNewSkills === 0) break;

      team.push(bestUser);
      bestUser.skills.forEach((s) => coveredSkills.add(s));
      remainingUsers.splice(remainingUsers.indexOf(bestUser), 1);
    }

    // 5. Calculate coverage score
    const totalRequiredSkills = project.requiredSkills.length;
    const coverageScore = Math.round((coveredSkills.size / totalRequiredSkills) * 100);

    return {
      members: team,
      coverageScore,
    };
  }

  // ============================================
  // SUCCESSION PLANNING
  // ============================================

  async findSuccessors(
    positionId: string,
    limit: number = 5
  ) {
    const candidates = await this.findCandidatesForPosition(positionId, {
      minScore: 50,
      limit,
    });

    return candidates.map((candidate) => ({
      ...candidate,
      readinessLevel: this.calculateReadinessLevel(candidate.score),
      developmentPlan: this.generateQuickDevelopmentPlan(candidate.gaps),
    }));
  }

  // ============================================
  // HELPER METHODS
  // ============================================

  private calculateGapPriority(
    gap: number,
    requiredPriority: string
  ): 'critical' | 'high' | 'medium' | 'low' {
    if (requiredPriority === 'required' && gap >= 2) return 'critical';
    if (gap >= 3) return 'high';
    if (gap >= 2) return 'medium';
    return 'low';
  }

  private calculateReadinessLevel(score: number): string {
    if (score >= 90) return 'ready_now';
    if (score >= 80) return 'ready_in_3_months';
    if (score >= 70) return 'ready_in_6_months';
    if (score >= 60) return 'ready_in_12_months';
    return 'needs_significant_development';
  }

  private generateQuickDevelopmentPlan(gaps: SkillGap[]) {
    return gaps.slice(0, 3).map((gap) => ({
      skill: gap.skillName,
      currentLevel: gap.currentLevel,
      targetLevel: gap.requiredLevel,
      priority: gap.priority,
      estimatedWeeks: gap.gap * 4, // 4 weeks per level
    }));
  }
}
