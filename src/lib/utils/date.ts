/**
 * JST日付ユーティリティ
 */

/** JSTの「昨日」の範囲をUTCで返す */
export function getYesterdayRange(): { start: Date; end: Date } {
  const now = new Date();
  // JST = UTC+9
  const jstNow = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  const jstYesterday = new Date(jstNow);
  jstYesterday.setDate(jstYesterday.getDate() - 1);

  // 昨日 00:00:00 JST → UTC
  const start = new Date(
    Date.UTC(
      jstYesterday.getFullYear(),
      jstYesterday.getMonth(),
      jstYesterday.getDate(),
      0,
      0,
      0
    )
  );
  start.setTime(start.getTime() - 9 * 60 * 60 * 1000);

  // 昨日 23:59:59.999 JST → UTC
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000 - 1);

  return { start, end };
}

/** JSTの「昨日」をYYYY-MM-DD文字列で返す */
export function getYesterdayDateString(): string {
  const now = new Date();
  const jstNow = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  const jstYesterday = new Date(jstNow);
  jstYesterday.setDate(jstYesterday.getDate() - 1);

  const y = jstYesterday.getFullYear();
  const m = String(jstYesterday.getMonth() + 1).padStart(2, "0");
  const d = String(jstYesterday.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** JSTの「今日」をYYYY-MM-DD文字列で返す */
export function getTodayDateString(): string {
  const now = new Date();
  const jstNow = new Date(now.getTime() + 9 * 60 * 60 * 1000);

  const y = jstNow.getFullYear();
  const m = String(jstNow.getMonth() + 1).padStart(2, "0");
  const d = String(jstNow.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}
