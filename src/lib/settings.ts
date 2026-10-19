import { db } from "./db";

/** Site-wide switches an admin can flip (stored in the SiteSetting table; a missing table or row means "off"). */
export type SettingKey = "requireEmailVerify";

export async function getFlag(key: SettingKey): Promise<boolean> {
  try {
    const row = await db.siteSetting.findUnique({ where: { key } });
    return row?.value === "1";
  } catch {
    return false;
  }
}

export async function setFlag(key: SettingKey, on: boolean) {
  await db.siteSetting.upsert({ where: { key }, update: { value: on ? "1" : "0" }, create: { key, value: on ? "1" : "0" } });
}
