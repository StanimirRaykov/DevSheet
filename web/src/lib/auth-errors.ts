/**
 * Messages for the ?error= codes the API adds after a sign-in, link or connect round trip.
 * The codes come from AuthErrors in api/src/DevSheet.Infrastructure/Accounts/AccountService.cs.
 */
const MESSAGES: Record<string, string> = {
  sign_in_failed: "Sign-in didn't finish. The provider refused it or it was cancelled. Try again.",
  signed_out: "Your session ended before the provider sent you back. Sign in, then try again.",
  login_in_use: "That account already signs in to a different DevSheet. Sign in with it to manage that DevSheet.",
  provider_already_linked: "You already have a sign-in from that provider. Remove it first to use a different one.",
  github_in_use: "That GitHub account is connected to a different DevSheet.",
  github_already_connected: "A different GitHub account is already connected. Disconnect it first.",
};

/** The message for an error code, or null when there is no (known) error. */
export function authErrorMessage(code: string | string[] | undefined): string | null {
  const value = Array.isArray(code) ? code[0] : code;
  if (!value) return null;
  return MESSAGES[value] ?? MESSAGES.sign_in_failed;
}
