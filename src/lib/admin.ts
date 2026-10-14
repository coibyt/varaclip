/** Admins are the accounts whose email is listed in the ADMIN_EMAILS environment variable (comma separated). */
export function isAdminUser(u?: { email: string } | null) {
  if (!u) return false;
  const list = (process.env.ADMIN_EMAILS || "").toLowerCase().split(",").map((x) => x.trim()).filter(Boolean);
  return list.includes(u.email.toLowerCase());
}
