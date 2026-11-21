import type { Metadata } from "next";
import { DRAFT_NOTE, ProsePage } from "../_components/prose-page";
import { REPO_URL } from "../_components/site-links";

export const metadata: Metadata = {
  title: "Privacy",
  description: "Which data DevSheet stores, what is public, how long it is kept, and how to delete it.",
};

export default function PrivacyPage() {
  return (
    <ProsePage
      title="Privacy"
      lead="What DevSheet stores about you, what other people can see, and how to remove it."
      note={DRAFT_NOTE}
    >
      <h2>What is stored</h2>
      <h3>Your account</h3>
      <ul>
        <li>Your display name, profile picture address and email, as the sign-in provider you use (GitHub or Google) gives them.</li>
        <li>Which sign-in methods you use, stored as the provider&apos;s id for your account, not your password. DevSheet never sees a password.</li>
        <li>The address of your public page (for example /ana-petrova) and whether it is published.</li>
      </ul>
      <h3>From GitHub</h3>
      <ul>
        <li>Your GitHub user id and login.</li>
        <li>For each public repository: its name, description, link, stars, languages and last push date.</li>
        <li>
          An access token, so DevSheet can sync your repositories when you ask it to. It is encrypted before it is stored
          and is never sent to your browser. It allows reading your public profile only (the read:user permission).
        </li>
      </ul>
      <h3>From Google, if you sign in with it</h3>
      <ul>
        <li>
          Your Google account id, name, email and profile picture address. DevSheet asks Google for your basic profile and
          email only, and does not keep an access token: it cannot read your mail, files or contacts.
        </li>
      </ul>
      <h3>What you enter</h3>
      <ul>
        <li>Your profile: name, headline, summary, location and email.</li>
        <li>Work history, education, languages and certifications.</li>
        <li>Your decisions: which projects are shown or hidden, which skills you confirmed or rejected.</li>
      </ul>
      <h3>In your browser</h3>
      <ul>
        <li>
          A sign-in cookie (devsheet.auth), which keeps you signed in for up to 14 days. It is needed for the site to work.
        </li>
        <li>Short-lived cookies during sign-in that protect against forged requests; they are removed when sign-in finishes.</li>
        <li>Your light or dark theme choice, in local storage.</li>
      </ul>
      <p>There are no analytics, no advertising and no tracking cookies. Fonts are served by DevSheet itself.</p>

      <h2>What is public</h2>
      <p>Nothing, until you publish your page. After that, anyone with the address can see:</p>
      <ul>
        <li>Your name, headline and summary.</li>
        <li>The projects you approved, and on them only the skills you confirmed.</li>
        <li>Your work history and education.</li>
        <li>Your email and location only if you turned them on; both are off by default.</li>
      </ul>
      <p>
        Your CV is not public. Only you can download it while signed in. Unpublishing your page hides all of the above
        again straight away.
      </p>

      <h2>Who else receives data</h2>
      <p>
        GitHub and Google, when you sign in with them, and GitHub when you sync, because that is where the data comes
        from. DevSheet does not sell or share your data with anyone else.
      </p>

      <h2>How long it is kept</h2>
      <p>
        As long as you have an account. Disconnecting GitHub deletes the access token at once; projects already synced are
        kept and marked as no longer connected, so your page does not break. Deleting your account deletes everything
        listed above.
      </p>

      <h2>Deleting your account</h2>
      <p>
        A delete button is coming to the Settings page. It removes your account and all its data in one step. Until it is
        there, open an issue in the <a href={REPO_URL}>project&apos;s repository</a> and the account will be deleted by hand.
        You can also revoke DevSheet&apos;s access at any time: on GitHub under Settings, Applications, and in your Google
        Account under Security, third-party connections.
      </p>

      <h2>Contact</h2>
      <p>
        Questions about your data: open an issue in the <a href={REPO_URL}>DevSheet repository</a>.
      </p>
    </ProsePage>
  );
}
