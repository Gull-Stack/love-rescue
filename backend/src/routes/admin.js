const express = require('express');
const { authenticate, requirePlatformAdmin, PLATFORM_ADMIN_EMAILS } = require('../middleware/auth');
const logger = require('../utils/logger');

const router = express.Router();

// All admin routes require authentication + platform admin role
router.use(authenticate);
router.use(requirePlatformAdmin);

// ─── Dashboard Stats ──────────────────────────────────────────────

/**
 * GET /api/admin/stats
 * Dashboard overview with key metrics
 */
router.get('/stats', async (req, res) => {
  try {
    const now = new Date();
    const sevenDaysAgo = new Date(now - 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(now - 30 * 24 * 60 * 60 * 1000);
    const oneDayAgo = new Date(now - 24 * 60 * 60 * 1000);

    // Total users
    const totalUsers = await req.prisma.user.count();

    // New users (7d/30d)
    const newUsers7d = await req.prisma.user.count({
      where: { createdAt: { gte: sevenDaysAgo } }
    });
    const newUsers30d = await req.prisma.user.count({
      where: { createdAt: { gte: thirtyDaysAgo } }
    });

    // Active users (daily/weekly/monthly) based on lastActiveAt or recent logs
    const dailyActiveUsers = await req.prisma.user.count({
      where: {
        OR: [
          { lastActiveAt: { gte: oneDayAgo } },
          { dailyLogs: { some: { createdAt: { gte: oneDayAgo } } } }
        ]
      }
    });

    const weeklyActiveUsers = await req.prisma.user.count({
      where: {
        OR: [
          { lastActiveAt: { gte: sevenDaysAgo } },
          { dailyLogs: { some: { createdAt: { gte: sevenDaysAgo } } } }
        ]
      }
    });

    const monthlyActiveUsers = await req.prisma.user.count({
      where: {
        OR: [
          { lastActiveAt: { gte: thirtyDaysAgo } },
          { dailyLogs: { some: { createdAt: { gte: thirtyDaysAgo } } } }
        ]
      }
    });

    // Total assessments completed
    const totalAssessments = await req.prisma.assessment.count();

    // Total couples matched (relationships with both users)
    const totalCouplesMatched = await req.prisma.relationship.count({
      where: {
        user2Id: { not: null },
        status: 'active'
      }
    });

    // Subscription breakdown
    const subscriptionBreakdown = await req.prisma.user.groupBy({
      by: ['subscriptionStatus'],
      _count: true
    });

    const subscriptions = {
      trial: 0,
      paid: 0,
      premium: 0,
      expired: 0
    };
    subscriptionBreakdown.forEach(item => {
      subscriptions[item.subscriptionStatus] = item._count;
    });

    // Revenue data (if Stripe data available) - count of premium users as proxy
    const premiumUsers = subscriptions.premium + subscriptions.paid;

    res.json({
      stats: {
        totalUsers,
        newUsers7d,
        newUsers30d,
        dailyActiveUsers,
        weeklyActiveUsers,
        monthlyActiveUsers,
        totalAssessments,
        totalCouplesMatched,
        subscriptions,
        premiumUsers
      }
    });
  } catch (error) {
    logger.error('Admin stats error', { error: error.message });
    res.status(500).json({ error: 'Failed to fetch admin stats' });
  }
});

// ─── Users List ───────────────────────────────────────────────────

/**
 * GET /api/admin/users
 * List all users with pagination, search, and filters
 */
router.get('/users', async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      search,
      subscription,
      hasPartner,
      startDate,
      endDate,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    // Build where clause
    const where = {};

    if (search) {
      where.OR = [
        { email: { contains: search, mode: 'insensitive' } },
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } }
      ];
    }

    if (subscription) {
      where.subscriptionStatus = subscription;
    }

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate);
    }

    // Get users with counts
    const [users, total] = await Promise.all([
      req.prisma.user.findMany({
        where,
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          subscriptionStatus: true,
          isPlatformAdmin: true,
          isDisabled: true,
          lastActiveAt: true,
          createdAt: true,
          _count: {
            select: {
              assessments: true,
              dailyLogs: true,
              gratitudeEntries: true
            }
          },
          relationshipsAsUser1: {
            select: { user2Id: true },
            take: 1
          },
          relationshipsAsUser2: {
            select: { user1Id: true },
            take: 1
          }
        },
        orderBy: { [sortBy]: sortOrder },
        skip,
        take
      }),
      req.prisma.user.count({ where })
    ]);

    // Transform data
    const transformedUsers = users.map(user => ({
      id: user.id,
      email: user.email,
      name: [user.firstName, user.lastName].filter(Boolean).join(' ') || null,
      firstName: user.firstName,
      lastName: user.lastName,
      subscriptionStatus: user.subscriptionStatus,
      isPlatformAdmin: user.isPlatformAdmin,
      isDisabled: user.isDisabled,
      lastActiveAt: user.lastActiveAt,
      createdAt: user.createdAt,
      assessmentsCompleted: user._count.assessments,
      dailyLogsCount: user._count.dailyLogs,
      gratitudeEntriesCount: user._count.gratitudeEntries,
      hasPartner: !!(user.relationshipsAsUser1?.[0]?.user2Id || user.relationshipsAsUser2?.[0]?.user1Id)
    }));

    // Filter by hasPartner if specified
    let filteredUsers = transformedUsers;
    if (hasPartner !== undefined) {
      const partnerFilter = hasPartner === 'true';
      filteredUsers = transformedUsers.filter(u => u.hasPartner === partnerFilter);
    }

    res.json({
      users: filteredUsers,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / take)
      }
    });
  } catch (error) {
    logger.error('Admin users list error', { error: error.message });
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// ─── User Detail ──────────────────────────────────────────────────

/**
 * GET /api/admin/users/:id
 * Get detailed user information
 */
router.get('/users/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const user = await req.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        gender: true,
        authProvider: true,
        role: true,
        subscriptionStatus: true,
        trialEndsAt: true,
        stripeCustomerId: true,
        isPlatformAdmin: true,
        isDisabled: true,
        lastActiveAt: true,
        createdAt: true,
        updatedAt: true,
        assessments: {
          select: {
            id: true,
            type: true,
            score: true,
            completedAt: true
          },
          orderBy: { completedAt: 'desc' }
        },
        _count: {
          select: {
            dailyLogs: true,
            gratitudeEntries: true,
            videoCompletions: true
          }
        },
        relationshipsAsUser1: {
          select: {
            id: true,
            status: true,
            sharedConsent: true,
            user2: {
              select: { id: true, email: true, firstName: true, lastName: true }
            },
            _count: {
              select: { matchups: true }
            }
          },
          take: 1
        },
        relationshipsAsUser2: {
          select: {
            id: true,
            status: true,
            sharedConsent: true,
            user1: {
              select: { id: true, email: true, firstName: true, lastName: true }
            },
            _count: {
              select: { matchups: true }
            }
          },
          take: 1
        }
      }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Get relationship info
    const relationship = user.relationshipsAsUser1?.[0] || user.relationshipsAsUser2?.[0];
    const partner = relationship?.user2 || relationship?.user1;

    // Get recent daily logs
    const recentLogs = await req.prisma.dailyLog.findMany({
      where: { userId: id },
      orderBy: { date: 'desc' },
      take: 10,
      select: {
        id: true,
        date: true,
        positiveCount: true,
        negativeCount: true,
        ratio: true,
        mood: true
      }
    });

    res.json({
      user: {
        ...user,
        assessments: user.assessments,
        activityCounts: {
          dailyLogs: user._count.dailyLogs,
          gratitudeEntries: user._count.gratitudeEntries,
          videoCompletions: user._count.videoCompletions
        },
        relationship: relationship ? {
          id: relationship.id,
          status: relationship.status,
          sharedConsent: relationship.sharedConsent,
          matchupsCount: relationship._count?.matchups || 0,
          partner: partner ? {
            id: partner.id,
            email: partner.email,
            name: [partner.firstName, partner.lastName].filter(Boolean).join(' ') || partner.email
          } : null
        } : null,
        recentLogs
      }
    });
  } catch (error) {
    logger.error('Admin user detail error', { error: error.message, userId: req.params.id });
    res.status(500).json({ error: 'Failed to fetch user details' });
  }
});

// ─── Update User ──────────────────────────────────────────────────

/**
 * PUT /api/admin/users/:id
 * Update user (admin actions)
 */
router.put('/users/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { subscriptionStatus, isPlatformAdmin, isDisabled } = req.body;

    // Prevent admins from modifying themselves in certain ways
    if (id === req.user.id && isDisabled === true) {
      return res.status(400).json({ error: 'Cannot disable your own account' });
    }

    const updateData = {};
    if (subscriptionStatus !== undefined) {
      updateData.subscriptionStatus = subscriptionStatus;
    }
    if (isPlatformAdmin !== undefined) {
      updateData.isPlatformAdmin = isPlatformAdmin;
    }
    if (isDisabled !== undefined) {
      updateData.isDisabled = isDisabled;
    }

    const user = await req.prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        subscriptionStatus: true,
        isPlatformAdmin: true,
        isDisabled: true
      }
    });

    // Audit log
    await req.prisma.auditLog.create({
      data: {
        userId: req.user.id,
        action: 'ADMIN_USER_UPDATE',
        resource: 'user',
        resourceId: id,
        metadata: {
          updatedBy: req.user.email,
          changes: updateData
        },
        ipAddress: req.ip
      }
    });

    logger.info('Admin updated user', { adminId: req.user.id, targetUserId: id, changes: updateData });

    res.json({ user, message: 'User updated successfully' });
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'User not found' });
    }
    logger.error('Admin user update error', { error: error.message, userId: req.params.id });
    res.status(500).json({ error: 'Failed to update user' });
  }
});

// ─── Usage Analytics ──────────────────────────────────────────────

/**
 * GET /api/admin/usage
 * Usage analytics and metrics
 */
router.get('/usage', async (req, res) => {
  try {
    const now = new Date();
    const thirtyDaysAgo = new Date(now - 30 * 24 * 60 * 60 * 1000);

    // Daily active users for last 30 days
    const dailyActiveData = [];
    for (let i = 29; i >= 0; i--) {
      const dayStart = new Date(now);
      dayStart.setDate(dayStart.getDate() - i);
      dayStart.setHours(0, 0, 0, 0);
      
      const dayEnd = new Date(dayStart);
      dayEnd.setHours(23, 59, 59, 999);

      const count = await req.prisma.dailyLog.groupBy({
        by: ['userId'],
        where: {
          createdAt: {
            gte: dayStart,
            lte: dayEnd
          }
        }
      });

      dailyActiveData.push({
        date: dayStart.toISOString().split('T')[0],
        count: count.length
      });
    }

    // Feature usage breakdown (last 30 days)
    const [assessmentCount, logsCount, gratitudeCount, matchupCount] = await Promise.all([
      req.prisma.assessment.count({
        where: { completedAt: { gte: thirtyDaysAgo } }
      }),
      req.prisma.dailyLog.count({
        where: { createdAt: { gte: thirtyDaysAgo } }
      }),
      req.prisma.gratitudeEntry.count({
        where: { createdAt: { gte: thirtyDaysAgo } }
      }),
      req.prisma.matchup.count({
        where: { generatedAt: { gte: thirtyDaysAgo } }
      })
    ]);

    // Retention metrics
    // Users who signed up 7-14 days ago and were active in last 7 days
    const sevenDaysAgo = new Date(now - 7 * 24 * 60 * 60 * 1000);
    const fourteenDaysAgo = new Date(now - 14 * 24 * 60 * 60 * 1000);

    const cohortUsers = await req.prisma.user.count({
      where: {
        createdAt: {
          gte: fourteenDaysAgo,
          lte: sevenDaysAgo
        }
      }
    });

    const retainedUsers = await req.prisma.user.count({
      where: {
        createdAt: {
          gte: fourteenDaysAgo,
          lte: sevenDaysAgo
        },
        OR: [
          { lastActiveAt: { gte: sevenDaysAgo } },
          { dailyLogs: { some: { createdAt: { gte: sevenDaysAgo } } } }
        ]
      }
    });

    const retentionRate = cohortUsers > 0 ? Math.round((retainedUsers / cohortUsers) * 100) : 0;

    // Subscription distribution
    const subscriptionDistribution = await req.prisma.user.groupBy({
      by: ['subscriptionStatus'],
      _count: true
    });

    res.json({
      usage: {
        dailyActive: dailyActiveData,
        featureUsage: {
          assessments: assessmentCount,
          dailyLogs: logsCount,
          gratitude: gratitudeCount,
          matchups: matchupCount
        },
        retention: {
          cohortSize: cohortUsers,
          retainedUsers,
          retentionRate
        },
        subscriptionDistribution: subscriptionDistribution.map(item => ({
          status: item.subscriptionStatus,
          count: item._count
        }))
      }
    });
  } catch (error) {
    logger.error('Admin usage analytics error', { error: error.message });
    res.status(500).json({ error: 'Failed to fetch usage analytics' });
  }
});

// ─── Recent Signups ───────────────────────────────────────────────

/**
 * GET /api/admin/recent-signups
 * Get recent user signups
 */
router.get('/recent-signups', async (req, res) => {
  try {
    const { limit = 10 } = req.query;

    const recentUsers = await req.prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      take: parseInt(limit),
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        authProvider: true,
        subscriptionStatus: true,
        createdAt: true
      }
    });

    res.json({ users: recentUsers });
  } catch (error) {
    logger.error('Admin recent signups error', { error: error.message });
    res.status(500).json({ error: 'Failed to fetch recent signups' });
  }
});

module.exports = router;
