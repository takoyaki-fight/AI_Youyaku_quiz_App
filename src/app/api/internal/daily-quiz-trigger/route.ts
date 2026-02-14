import { NextRequest, NextResponse } from "next/server";
import { CloudTasksClient } from "@google-cloud/tasks";
import { db } from "@/lib/firebase/admin";
import { getYesterdayDateString } from "@/lib/utils/date";
import { generateDailyQuizForUser } from "@/lib/services/daily-quiz.service";
import { verifyInternalRequest } from "@/lib/middleware/internal-auth";

// POST /api/internal/daily-quiz-trigger
// Called by Cloud Scheduler. Enqueues one task per target user.
export async function POST(req: NextRequest) {
  const internalAuthError = verifyInternalRequest(req);
  if (internalAuthError) return internalAuthError;

  try {
    const userIds = await collectTargetUserIds();

    const appUrl = process.env.APP_URL;
    const tasksSaEmail = process.env.CLOUD_TASKS_SA_EMAIL;
    const projectId = process.env.GOOGLE_CLOUD_PROJECT;

    if (appUrl && tasksSaEmail && projectId && process.env.NODE_ENV === "production") {
      const enqueuedCount = await enqueueToCloudTasks(userIds, appUrl, projectId);
      return NextResponse.json({ success: true, enqueuedUsers: enqueuedCount });
    }

    // Fallback for local/dev where Cloud Tasks is not configured.
    let generated = 0;
    for (const userId of userIds) {
      const result = await generateDailyQuizForUser(userId);
      if (result) generated++;
    }

    return NextResponse.json({
      success: true,
      directExecution: true,
      generatedCount: generated,
    });
  } catch (error) {
    console.error("Daily quiz trigger failed:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

async function collectTargetUserIds(): Promise<Set<string>> {
  const userIds = new Set<string>();
  const allUsersSnap = await db.collection("users").get();

  // Avoid collectionGroup query dependency on indexes in fresh projects.
  const checks = await Promise.all(
    allUsersSnap.docs.map(async (doc) => {
      try {
        const settingsDoc = await db.doc(`users/${doc.id}/settings/default`).get();
        const dailyQuizEnabled = settingsDoc.data()?.dailyQuizEnabled;
        if (dailyQuizEnabled === false) {
          return null;
        }
        return doc.id;
      } catch (error) {
        console.warn(`Failed to read settings for user ${doc.id}:`, error);
        return doc.id;
      }
    })
  );

  for (const userId of checks) {
    if (userId) userIds.add(userId);
  }

  return userIds;
}

async function enqueueToCloudTasks(
  userIds: Set<string>,
  appUrl: string,
  projectId: string
): Promise<number> {
  const client = new CloudTasksClient();

  const tasksQueue = process.env.CLOUD_TASKS_QUEUE || "daily-quiz-queue";
  const tasksLocation = process.env.CLOUD_TASKS_LOCATION || "asia-northeast1";
  const tasksSaEmail = process.env.CLOUD_TASKS_SA_EMAIL;
  const internalApiSecret = process.env.INTERNAL_API_SECRET || "";
  const parent = client.queuePath(projectId, tasksLocation, tasksQueue);
  const targetDate = getYesterdayDateString();

  for (const userId of userIds) {
    await client.createTask({
      parent,
      task: {
        httpRequest: {
          httpMethod: "POST",
          url: `${appUrl}/api/internal/daily-quiz-generate`,
          headers: {
            "Content-Type": "application/json",
            "X-Internal-Api-Key": internalApiSecret,
          },
          body: Buffer.from(JSON.stringify({ userId, targetDate })).toString("base64"),
          oidcToken: { serviceAccountEmail: tasksSaEmail },
        },
      },
    });
  }

  return userIds.size;
}
