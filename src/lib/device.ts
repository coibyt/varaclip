/** A random id for this browser, kept in localStorage; used to count installs and visitors without accounts. */
export function deviceKey() {
  const fresh = () => Array.from(crypto.getRandomValues(new Uint8Array(12)), (b) => (b % 36).toString(36)).join("");
  try {
    let k = localStorage.getItem("vc-device");
    if (!k) { k = fresh(); localStorage.setItem("vc-device", k); }
    return k;
  } catch {
    return fresh();
  }
}
