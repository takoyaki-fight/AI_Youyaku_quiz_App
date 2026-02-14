import {
  initializeApp,
  getApps,
  cert,
  applicationDefault,
} from "firebase-admin/app";
import { existsSync, readFileSync } from "fs";
import { resolve } from "path";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

function loadServiceAccount() {
  const raw = process.env.FIREBASE_ADMIN_SA_KEY?.trim();
  if (!raw) return null;

  try {
    return JSON.parse(raw);
  } catch {
    const candidatePath = resolve(process.cwd(), raw);
    if (!existsSync(candidatePath)) return null;

    try {
      const fileText = readFileSync(candidatePath, "utf-8");
      return JSON.parse(fileText);
    } catch {
      return null;
    }
  }
}

function initAdmin() {
  if (getApps().length > 0) {
    return getApps()[0];
  }

  const serviceAccount = loadServiceAccount();
  if (serviceAccount) {
    return initializeApp({
      credential: cert(serviceAccount),
      projectId: process.env.GOOGLE_CLOUD_PROJECT,
    });
  }

  console.warn(
    "FIREBASE_ADMIN_SA_KEY is not set to a valid JSON or readable file path. Falling back to Application Default Credentials."
  );

  return initializeApp({
    credential: applicationDefault(),
    projectId: process.env.GOOGLE_CLOUD_PROJECT,
  });
}

const app = initAdmin();
const adminAuth = getAuth(app);
const db = getFirestore(app);

export { adminAuth, db };
