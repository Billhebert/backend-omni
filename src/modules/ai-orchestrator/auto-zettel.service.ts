// backend/src/modules/ai-orchestrator/auto-zettel.service.ts

import { PrismaClient } from '@prisma/client';

export interface AutoZettelEvent {
  eventType: string;
  data: any;
  userId: string;
  companyId: string;
}

export class AutoZettelService {
  constructor(
    private prisma: PrismaClient,
    private companyId: string
  ) {}

  /**
   * Main orchestrator - routes events to appropriate handlers
   */
  async handleEvent(event: AutoZettelEvent): Promise<string | null> {
    console.log(`🤖 Processing auto-zettel event: ${event.eventType}`);

    try {
      switch (event.eventType) {
        case 'employee_completed_course':
          return await this.createCourseCompletionZettel(event);

        case 'employee_completed_learning_path':
          return await this.createPathCompletionZettel(event);

        case 'performance_review_completed':
          return await this.createPerformanceInsightsZettel(event);

        case 'deal_won':
          return await this.createDealSuccessZettel(event);

        case 'deal_lost':
          return await this.createDealLostZettel(event);

        case 'project_completed':
          return await this.createProjectRetrospectiveZettel(event);

        case 'skill_gap_identified':
          return await this.createSkillGapZettel(event);

        case 'job_application_created':
          return await this.createApplicationInsightsZettel(event);

        default:
          console.log(`⚠️  Unknown event type: ${event.eventType}`);
          return null;
      }
    } catch (error) {
      console.error(`❌ Error handling auto-zettel event:`, error);
      throw error;
    }
  }

  // ============================================
  // EVENT HANDLERS
  // ============================================

  private async createCourseCompletionZettel(event: AutoZettelEvent): Promise<string> {
    const { itemId, score, timeSpent, learningPathId } = event.data;

    // Fetch learning path item details
    const item = await this.prisma.learningPathItem.findUnique({
      where: { id: itemId },
      include: {
        path: true,
      },
    });

    if (!item) {
      throw new Error('Learning item not found');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: event.userId },
    });

    // Generate content
    const content = `
## Course Completed: ${item.title}

**Learning Path:** ${item.path.title}
**Completed By:** ${user?.name}
**Completion Date:** ${new Date().toISOString().split('T')[0]}
**Score:** ${score ? `${score}/100` : 'N/A'}
**Time Spent:** ${timeSpent ? `${timeSpent} minutes` : 'N/A'}

### Key Takeaways

${this.generateKeyTakeaways(item)}

### Next Steps

- Apply learned concepts in real projects
- Review related documentation
- Share knowledge with team members

### Related Skills

${this.identifyRelatedSkills(item.path.targetSkills)}
    `.trim();

    // Create zettel
    const zettel = await this.prisma.knowledgeNode.create({
      data: {
        companyId: this.companyId,
        title: `Learning: ${item.title}`,
        content,
        nodeType: 'learning',
        tags: ['auto-generated', 'learning-completion', item.path.category || 'general'],
        importanceScore: 0.6,
        createdById: event.userId,
        metadata: {
          eventType: event.eventType,
          itemId,
          learningPathId,
          score,
          timeSpent,
          generatedAt: new Date().toISOString(),
        },
      },
    });

    // Auto-update employee skills if applicable
    if (item.path.targetSkills && item.path.targetSkills.length > 0) {
      await this.autoUpdateSkills(event.userId, item.path.targetSkills, 'learning_completion');
    }

    console.log(`✅ Auto-zettel created: ${zettel.id}`);
    return zettel.id;
  }

  private async createPathCompletionZettel(event: AutoZettelEvent): Promise<string> {
    const { pathId, totalScore, totalTimeSpent } = event.data;

    const path = await this.prisma.learningPath.findUnique({
      where: { id: pathId },
      include: {
        items: true,
      },
    });

    if (!path) {
      throw new Error('Learning path not found');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: event.userId },
    });

    const content = `
## Learning Path Completed: ${path.title}

**Completed By:** ${user?.name}
**Completion Date:** ${new Date().toISOString().split('T')[0]}
**Total Modules:** ${path.items.length}
**Average Score:** ${totalScore ? `${Math.round(totalScore / path.items.length)}/100` : 'N/A'}
**Total Time:** ${totalTimeSpent ? `${Math.round(totalTimeSpent / 60)} hours` : 'N/A'}

### Achievement

Successfully completed all ${path.items.length} modules in the ${path.title} learning path. 
This demonstrates commitment to continuous learning and professional development.

### Skills Acquired

${this.identifyRelatedSkills(path.targetSkills)}

### Impact

This learning path has enhanced capabilities in:
${path.category ? `- ${path.category}` : ''}
- Problem-solving
- Technical proficiency
- Domain expertise

### Recommendations

- Apply these skills in real-world projects
- Mentor others in this domain
- Consider advanced certifications
    `.trim();

    const zettel = await this.prisma.knowledgeNode.create({
      data: {
        companyId: this.companyId,
        title: `Achievement: Completed ${path.title}`,
        content,
        nodeType: 'achievement',
        tags: ['auto-generated', 'path-completion', 'milestone', path.category || 'general'],
        importanceScore: 0.8,
        createdById: event.userId,
        metadata: {
          eventType: event.eventType,
          pathId,
          totalScore,
          totalTimeSpent,
          generatedAt: new Date().toISOString(),
        },
      },
    });

    // Significantly boost skills
    if (path.targetSkills && path.targetSkills.length > 0) {
      await this.autoUpdateSkills(event.userId, path.targetSkills, 'path_completion', 1.0);
    }

    return zettel.id;
  }

  private async createPerformanceInsightsZettel(event: AutoZettelEvent): Promise<string> {
    const { reviewId, overallRating, strengths, weaknesses, goals } = event.data;

    const review = await this.prisma.performanceReview.findUnique({
      where: { id: reviewId },
      include: {
        user: true,
        reviewer: true,
      },
    });

    if (!review) {
      throw new Error('Performance review not found');
    }

    const content = `
## Performance Review Insights

**Employee:** ${review.user.name}
**Reviewer:** ${review.reviewer.name}
**Period:** ${review.period}
**Overall Rating:** ${overallRating}/5
**Review Date:** ${new Date().toISOString().split('T')[0]}

### Strengths

${strengths.map((s: string) => `- ${s}`).join('\n')}

### Areas for Improvement

${weaknesses.map((w: string) => `- ${w}`).join('\n')}

### Development Goals

${goals.map((g: string) => `- ${g}`).join('\n')}

### Action Plan

Based on this review, the following development priorities have been identified:

1. **Immediate Focus**: Address critical gaps in ${weaknesses[0] || 'key areas'}
2. **Short-term (3 months)**: Develop skills in ${weaknesses.slice(0, 2).join(', ')}
3. **Long-term (6-12 months)**: Work towards ${goals[0] || 'career advancement'}

### Recommended Resources

- Enroll in relevant learning paths
- Seek mentorship from senior team members
- Participate in stretch projects
    `.trim();

    const zettel = await this.prisma.knowledgeNode.create({
      data: {
        companyId: this.companyId,
        title: `Performance Insights: ${review.period}`,
        content,
        nodeType: 'insight',
        tags: ['auto-generated', 'performance-review', 'development'],
        importanceScore: 0.85,
        createdById: event.userId,
        metadata: {
          eventType: event.eventType,
          reviewId,
          overallRating,
          generatedAt: new Date().toISOString(),
        },
      },
    });

    // Auto-create development plans for weaknesses
    await this.autoCreateDevelopmentPlans(event.userId, weaknesses);

    return zettel.id;
  }

  private async createDealSuccessZettel(event: AutoZettelEvent): Promise<string> {
    const { dealId, dealValue, wonReason } = event.data;

    const deal = await this.prisma.deal.findUnique({
      where: { id: dealId },
      include: {
        contact: true,
        owner: true,
      },
    });

    if (!deal) {
      throw new Error('Deal not found');
    }

    const content = `
## Deal Won: ${deal.title}

**Value:** $${dealValue.toLocaleString()}
**Client:** ${deal.contact.name} (${deal.contact.companyName})
**Sales Rep:** ${deal.owner.name}
**Close Date:** ${new Date().toISOString().split('T')[0]}

### Why We Won

${wonReason}

### Success Factors

- Strong product-market fit
- Excellent customer relationship
- Competitive pricing and value proposition
- Timely follow-ups and professional communication

### Lessons Learned

This success demonstrates the importance of:
- Understanding customer pain points
- Tailoring solutions to specific needs
- Building trust through transparency
- Persistent and professional follow-up

### Best Practices to Replicate

1. **Discovery Phase**: Invest time in understanding customer needs
2. **Value Proposition**: Clearly articulate ROI and benefits
3. **Relationship Building**: Maintain regular, value-added communication
4. **Objection Handling**: Address concerns proactively and professionally
    `.trim();

    const zettel = await this.prisma.knowledgeNode.create({
      data: {
        companyId: this.companyId,
        title: `Sales Win: ${deal.title}`,
        content,
        nodeType: 'deal',
        tags: ['auto-generated', 'deal-won', 'sales-success', 'best-practices'],
        importanceScore: 0.9,
        createdById: deal.ownerId,
        metadata: {
          eventType: event.eventType,
          dealId,
          dealValue,
          wonReason,
          generatedAt: new Date().toISOString(),
        },
      },
    });

    return zettel.id;
  }

  private async createDealLostZettel(event: AutoZettelEvent): Promise<string> {
    const { dealId, lostReason } = event.data;

    const deal = await this.prisma.deal.findUnique({
      where: { id: dealId },
      include: {
        contact: true,
        owner: true,
      },
    });

    if (!deal) {
      throw new Error('Deal not found');
    }

    const content = `
## Deal Lost: Lessons Learned

**Deal:** ${deal.title}
**Potential Value:** $${deal.value.toLocaleString()}
**Client:** ${deal.contact.name}
**Sales Rep:** ${deal.owner.name}

### Why We Lost

${lostReason}

### Analysis

Every lost deal is a learning opportunity. Key takeaways:

1. **What could have been done differently?**
   - Earlier engagement with decision-makers
   - Better competitive positioning
   - More compelling ROI demonstration

2. **Red Flags to Watch For**
   - Extended decision timelines
   - Price being the only focus
   - Lack of executive engagement

3. **Preventive Measures**
   - Qualify leads more rigorously
   - Build multi-threaded relationships
   - Establish clear success criteria early

### Action Items

- [ ] Update sales playbook with insights
- [ ] Review pricing strategy if price was a factor
- [ ] Improve competitive intelligence
- [ ] Train team on objection handling
    `.trim();

    const zettel = await this.prisma.knowledgeNode.create({
      data: {
        companyId: this.companyId,
        title: `Lessons: Lost Deal - ${deal.title}`,
        content,
        nodeType: 'insight',
        tags: ['auto-generated', 'deal-lost', 'lessons-learned'],
        importanceScore: 0.7,
        createdById: deal.ownerId,
        metadata: {
          eventType: event.eventType,
          dealId,
          lostReason,
          generatedAt: new Date().toISOString(),
        },
      },
    });

    return zettel.id;
  }

  private async createProjectRetrospectiveZettel(event: AutoZettelEvent): Promise<string> {
    const { projectId, outcome, duration, budget } = event.data;

    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      include: {
        teamMembers: {
          include: { user: true },
        },
        requiredSkills: {
          include: { skill: true },
        },
      },
    });

    if (!project) {
      throw new Error('Project not found');
    }

    const content = `
## Project Retrospective: ${project.name}

**Status:** ${outcome}
**Duration:** ${duration} days
**Budget:** ${budget ? `$${budget.toLocaleString()}` : 'N/A'}
**Team Size:** ${project.teamMembers.length}
**Completion Date:** ${new Date().toISOString().split('T')[0]}

### Project Overview

${project.description || 'No description available'}

### Team Composition

${project.teamMembers.map(m => `- ${m.user.name} (${m.role || 'Team Member'})`).join('\n')}

### Skills Utilized

${project.requiredSkills.map(rs => `- ${rs.skill.name} (Level ${rs.requiredLevel})`).join('\n')}

### What Went Well

- Successfully delivered project objectives
- Team collaboration and communication
- Technical implementation quality

### Challenges Faced

- Timeline management
- Resource allocation
- Technical complexity

### Lessons Learned

1. **Planning**: More detailed upfront planning reduces mid-project course corrections
2. **Communication**: Regular check-ins keep everyone aligned
3. **Risk Management**: Early identification of blockers is critical

### Best Practices Identified

- Daily standups for alignment
- Code reviews for quality
- Documentation for knowledge transfer
- Post-mortems for continuous improvement
    `.trim();

    const zettel = await this.prisma.knowledgeNode.create({
      data: {
        companyId: this.companyId,
        title: `Project Retrospective: ${project.name}`,
        content,
        nodeType: 'process',
        tags: ['auto-generated', 'project-retrospective', 'lessons-learned'],
        importanceScore: 0.85,
        metadata: {
          eventType: event.eventType,
          projectId,
          outcome,
          duration,
          generatedAt: new Date().toISOString(),
        },
      },
    });

    // Update team members' skills
    for (const member of project.teamMembers) {
      const skillIds = project.requiredSkills.map(rs => rs.skillId);
      await this.autoUpdateSkills(member.userId, skillIds, 'project_completion', 0.5);
    }

    return zettel.id;
  }

  private async createSkillGapZettel(event: AutoZettelEvent): Promise<string> {
    const { skillId, currentLevel, requiredLevel, reason } = event.data;

    const skill = await this.prisma.skill.findUnique({
      where: { id: skillId },
    });

    if (!skill) {
      throw new Error('Skill not found');
    }

    const gap = requiredLevel - currentLevel;

    const content = `
## Skill Gap Identified: ${skill.name}

**Current Level:** ${currentLevel}/5
**Required Level:** ${requiredLevel}/5
**Gap:** ${gap} level${gap > 1 ? 's' : ''}
**Reason:** ${reason}

### Impact

This skill gap may affect:
- Ability to take on new responsibilities
- Career progression opportunities
- Project contributions
- Team performance

### Recommended Actions

1. **Immediate**: Enroll in foundational courses for ${skill.name}
2. **Short-term (1-2 months)**: Practice through small projects
3. **Medium-term (3-6 months)**: Seek mentorship and advanced training
4. **Long-term**: Achieve mastery through consistent application

### Resources

- Search knowledge base for "${skill.name}" tutorials
- Find relevant learning paths in the Learning Management System
- Connect with team members who are proficient in ${skill.name}

### Timeline

Estimated time to close gap: **${gap * 30} days** (assuming 30 days per level)
    `.trim();

    const zettel = await this.prisma.knowledgeNode.create({
      data: {
        companyId: this.companyId,
        title: `Skill Gap: ${skill.name}`,
        content,
        nodeType: 'gap',
        tags: ['auto-generated', 'skill-gap', skill.category],
        importanceScore: 0.75,
        createdById: event.userId,
        metadata: {
          eventType: event.eventType,
          skillId,
          currentLevel,
          requiredLevel,
          gap,
          generatedAt: new Date().toISOString(),
        },
      },
    });

    return zettel.id;
  }

  private async createApplicationInsightsZettel(event: AutoZettelEvent): Promise<string> {
    const { applicationId, matchScore, gaps } = event.data;

    const application = await this.prisma.jobApplication.findUnique({
      where: { id: applicationId },
      include: {
        position: true,
        user: true,
      },
    });

    if (!application) {
      throw new Error('Application not found');
    }

    const content = `
## Job Application Insights: ${application.position.title}

**Candidate:** ${application.user.name}
**Match Score:** ${matchScore}%
**Application Date:** ${new Date().toISOString().split('T')[0]}

### Match Analysis

${matchScore >= 80 ? '✅ **Strong Match**: Candidate meets most requirements' : matchScore >= 60 ? '⚠️  **Good Match**: Some skill gaps to address' : '❌ **Weak Match**: Significant development needed'}

### Skill Gaps

${gaps && gaps.length > 0 ? gaps.map((g: any) => `- ${g.skillName}: Gap of ${g.gap} level(s)`).join('\n') : 'No significant gaps identified'}

### Development Path

To improve readiness for this role:

1. Focus on closing critical skill gaps
2. Gain relevant project experience
3. Pursue targeted certifications
4. Seek mentorship from senior team members

### Next Steps

- Review detailed gap analysis
- Create personalized development plan
- Set realistic timeline for skill acquisition
- Schedule follow-up assessment
    `.trim();

    const zettel = await this.prisma.knowledgeNode.create({
      data: {
        companyId: this.companyId,
        title: `Application Analysis: ${application.position.title}`,
        content,
        nodeType: 'insight',
        tags: ['auto-generated', 'job-application', 'career-development'],
        importanceScore: 0.7,
        createdById: application.userId,
        metadata: {
          eventType: event.eventType,
          applicationId,
          matchScore,
          generatedAt: new Date().toISOString(),
        },
      },
    });

    return zettel.id;
  }

  // ============================================
  // HELPER METHODS
  // ============================================

  private generateKeyTakeaways(item: any): string {
    // This would ideally use LLM to generate context-aware takeaways
    // For now, return a generic template
    return `
- Core concepts and fundamentals
- Practical applications and use cases
- Best practices and common patterns
- Common pitfalls to avoid
    `.trim();
  }

  private async identifyRelatedSkills(skillIds: string[]): Promise<string> {
    if (!skillIds || skillIds.length === 0) {
      return 'No specific skills identified';
    }

    const skills = await this.prisma.skill.findMany({
      where: {
        id: { in: skillIds },
      },
    });

    return skills.map(s => `- ${s.name} (${s.category})`).join('\n');
  }

  private async autoUpdateSkills(
    userId: string,
    skillIds: string[],
    reason: string,
    boost: number = 0.5
  ): Promise<void> {
    for (const skillId of skillIds) {
      const existing = await this.prisma.employeeSkill.findUnique({
        where: {
          userId_skillId: {
            userId,
            skillId,
          },
        },
      });

      if (existing) {
        // Increment existing skill (max 5)
        const newProficiency = Math.min(5, existing.proficiency + boost);
        await this.prisma.employeeSkill.update({
          where: {
            userId_skillId: {
              userId,
              skillId,
            },
          },
          data: {
            proficiency: newProficiency,
            lastAssessed: new Date(),
          },
        });
        console.log(`📈 Skill updated: ${skillId} → ${newProficiency} (reason: ${reason})`);
      } else {
        // Create new skill at level 1 + boost
        await this.prisma.employeeSkill.create({
          data: {
            userId,
            skillId,
            proficiency: Math.min(5, 1 + boost),
            lastAssessed: new Date(),
          },
        });
        console.log(`🆕 New skill acquired: ${skillId} (reason: ${reason})`);
      }
    }
  }

  private async autoCreateDevelopmentPlans(userId: string, weaknesses: string[]): Promise<void> {
    // Find skills matching weaknesses
    const skills = await this.prisma.skill.findMany({
      where: {
        companyId: this.companyId,
        name: {
          in: weaknesses,
          mode: 'insensitive',
        },
      },
    });

    for (const skill of skills) {
      // Check if plan already exists
      const existing = await this.prisma.skillDevelopmentPlan.findUnique({
        where: {
          userId_skillId: {
            userId,
            skillId: skill.id,
          },
        },
      });

      if (!existing) {
        await this.prisma.skillDevelopmentPlan.create({
          data: {
            userId,
            skillId: skill.id,
            companyId: this.companyId,
            currentLevel: 1,
            targetLevel: 3,
            deadline: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 days
            status: 'planning',
            learningPathIds: [],
          },
        });
        console.log(`📋 Development plan created for skill: ${skill.name}`);
      }
    }
  }
}
