import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebase/admin";
import { getYesterdayDateString } from "@/lib/utils/date";
import { generateDailyQuizForUser } from "@/lib/services/daily-quiz.service";

// POST /api/internal/daily-quiz-trigger
// Cloud Schedulerから呼び出し → 全対象ユーザーのタスクをenqueue
export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader && process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // 対象ユーザー収集
    const userIds = await collectTargetUserIds();

    const appUrl = process.env.APP_URL;
    const tasksSaEmail = process.env.CLOUD_TASKS_SA_EMAIL;
    const projectId = process.env.GOOGLE_CLOUD_PROJECT;

    if (appUrl && tasksSaEmail && projectId && process.env.NODE_ENV === "production") {
      // Cloud Tasks にenqueue
      const enqueuedCount = await enqueueToCloudTasks(
        userIds,
        appUrl,
        projectId
      );
      return NextResponse.json({ success: true, enqueuedUsers: enqueuedCount });
    } else {
      // 開発環境 → 直接実行
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
    }
  } catch (error) {
    console.error("Daily quiz trigger failed:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

async function collectTargetUserIds(): Promise<Set<string>> {
  const userIds = new Set<string>();

  // 全ユーザーをデフォルトで追加
  const allUsersSnap = await db.collection("users").get();
  for (const doc of allUsersSnap.docs) {
    userIds.add(doc.id);
  }

  // 設定で無効にしたユーザーを除外
  const disabledSnap = await db
    .collectionGroup("settings")
    .where("dailyQuizEnabled", "==", false)
    .get();
  for (const doc of disabledSnap.docs) {
    const pathParts = doc.ref.path.split("/");
    if (pathParts.length >= 2) {
      userIds.delete(pathParts[1]);
    }
  }

  return userIds;
}

async function enqueueToCloudTasks(
  userIds: Set<string>,
  appUrl: string,
  projectId: string
): Promise<number> {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { CloudTasksClient } = require("@google-cloud/tasks");
  const client = new CloudTasksClient();

  const tasksQueue = process.env.CLOUD_TASKS_QUEUE || "daily-quiz-queue";
  const tasksLocation = process.env.CLOUD_TASKS_LOCATION || "asia-northeast1";
  const tasksSaEmail = process.env.CLOUD_TASKS_SA_EMAIL;
  const parent = client.queuePath(projectId, tasksLocation, tasksQueue);
  const targetDate = getYesterdayDateString();

  for (const userId of userIds) {
    await client.createTask({
      parent,
      task: {
        httpRequest: {
          httpMethod: "POST",
          url: `${appUrl}/api/internal/daily-quiz-generate`,
          headers: { "Content-Type": "application/json" },
          body: Buffer.from(
            JSON.stringify({ userId, targetDate })
          ).toString("base64"),
          oidcToken: { serviceAccountEmail: tasksSaEmail },
        },
      },
    });
  }

  return userIds.size;
}
