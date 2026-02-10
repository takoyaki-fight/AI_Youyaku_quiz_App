import {
  initializeApp,
  getApps,
  cert,
  applicationDefault,
} from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

function initAdmin() {
  if (getApps().length > 0) {
    return getApps()[0];
  }

  // Cloud Run ではApplication Default Credentialsが自動で使える
  // ローカル開発時は FIREBASE_ADMIN_SA_KEY 環境変数 or gcloud auth application-default login
  const saKey = process.env.FIREBASE_ADMIN_SA_KEY;

  if (saKey) {
    const serviceAccount = JSON.parse(saKey);
    return initializeApp({
      credential: cert(serviceAccount),
      projectId: process.env.GOOGLE_CLOUD_PROJECT,
    });
  }

  return initializeApp({
    credential: applicationDefault(),
    projectId: process.env.GOOGLE_CLOUD_PROJECT,
  });
}

const app = initAdmin();
const adminAuth = getAuth(app);
const db = getFirestore(app);

export { adminAuth, db };
