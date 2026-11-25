import { redirect } from "next/navigation";
import { getMe } from "@/lib/session";

/** Sign-in and sign-up pages are for signed-out visitors: someone already signed in goes on to `next`. */
export async function redirectIfSignedIn(next: string) {
  let signedIn = false;
  try {
    signedIn = (await getMe()) !== null;
  } catch {
    // The API is down: show the page; the form says so when it is used.
  }
  if (signedIn) redirect(next);
}
