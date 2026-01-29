/**
 * Calculate course position based on user account creation date.
 * The course is 14 weeks (98 days) and wraps after completion.
 *
 * @param {Date} userCreatedAt - User's account creation timestamp
 * @returns {{ week: number, day: number, courseDay: number, daysSinceStart: number }}
 */
function getCoursePosition(userCreatedAt) {
  const now = new Date();
  const created = new Date(userCreatedAt);
  const diffMs = now.getTime() - created.getTime();
  const daysSinceStart = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  // Wrap after 98 days (14 weeks)
  const courseDay = (daysSinceStart % 98) + 1; // 1-indexed
  const week = Math.ceil(courseDay / 7); // 1-14
  const day = ((courseDay - 1) % 7) + 1; // 1-7

  return { week, day, courseDay, daysSinceStart };
}

module.exports = { getCoursePosition };
