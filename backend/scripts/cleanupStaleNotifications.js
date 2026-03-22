const db = require("../db");

async function cleanupStaleNotifications() {
  const [reminderResult] = await db.execute(
    `DELETE n
     FROM notifications n
     LEFT JOIN reminders r
       ON n.type = 'reminder'
      AND n.message = CONCAT('Reminder: ', r.title)
     WHERE n.type = 'reminder'
       AND r.id IS NULL`
  );

  const [announcementResult] = await db.execute(
    `DELETE n
     FROM notifications n
     LEFT JOIN announcements a
       ON n.type = 'announcement'
      AND n.message = CONCAT('New announcement: ', a.title)
     WHERE n.type = 'announcement'
       AND a.id IS NULL`
  );

  return {
    remindersDeleted: reminderResult.affectedRows || 0,
    announcementsDeleted: announcementResult.affectedRows || 0,
  };
}

async function main() {
  try {
    const result = await cleanupStaleNotifications();
    console.log(JSON.stringify(result));
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  } finally {
    await db.end();
  }
}

main();
