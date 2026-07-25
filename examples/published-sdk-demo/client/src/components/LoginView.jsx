import { OAuthButton } from "@reverse-http/react";

function GoogleIcon() {
  return (
    <svg className="size-5" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#4285f4"
        d="M21.6 12.23c0-.71-.06-1.4-.18-2.07H12v3.92h5.38a4.6 4.6 0 0 1-2 3.02v2.54h3.24c1.9-1.75 2.98-4.32 2.98-7.41Z"
      />
      <path
        fill="#34a853"
        d="M12 22c2.7 0 4.98-.9 6.63-2.36l-3.24-2.54c-.9.6-2.05.96-3.39.96-2.61 0-4.82-1.76-5.61-4.13H3.04v2.62A10 10 0 0 0 12 22Z"
      />
      <path
        fill="#fbbc05"
        d="M6.39 13.93A6.02 6.02 0 0 1 6.07 12c0-.67.11-1.32.32-1.93V7.45H3.04A10 10 0 0 0 2 12c0 1.61.38 3.14 1.04 4.55l3.35-2.62Z"
      />
      <path
        fill="#ea4335"
        d="M12 5.94c1.47 0 2.79.5 3.82 1.5l2.88-2.88A9.65 9.65 0 0 0 12 2a10 10 0 0 0-8.96 5.45l3.35 2.62C7.18 7.7 9.39 5.94 12 5.94Z"
      />
    </svg>
  );
}

function GitHubIcon() {
  return (
    <svg className="size-5" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="currentColor"
        d="M12 2C6.48 2 2 6.59 2 12.25c0 4.53 2.87 8.37 6.84 9.73.5.1.68-.22.68-.49v-1.92c-2.78.62-3.37-1.21-3.37-1.21-.45-1.18-1.11-1.49-1.11-1.49-.91-.64.07-.62.07-.62 1 .07 1.53 1.06 1.53 1.06.9 1.57 2.35 1.12 2.92.85.09-.66.35-1.12.64-1.37-2.22-.26-4.56-1.14-4.56-5.07 0-1.12.39-2.04 1.03-2.76-.1-.26-.45-1.3.1-2.72 0 0 .84-.27 2.75 1.06A9.33 9.33 0 0 1 12 7c.85 0 1.7.12 2.5.34 1.91-1.33 2.75-1.06 2.75-1.06.55 1.42.2 2.46.1 2.72.64.72 1.03 1.64 1.03 2.76 0 3.94-2.34 4.8-4.57 5.06.36.32.68.94.68 1.9v2.77c0 .27.18.59.69.49A10.26 10.26 0 0 0 22 12.25C22 6.59 17.52 2 12 2Z"
      />
    </svg>
  );
}

const buttonClass =
  "flex min-h-12 w-full cursor-pointer items-center justify-center gap-3 rounded-xl border px-4 font-semibold transition hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-indigo-200";

export default function LoginView({ backendUrl }) {
  return (
    <div className="mx-auto w-full max-w-md">
      <h2 className="mb-2 text-2xl font-bold tracking-tight text-balance text-slate-950 sm:text-3xl">
        Test the login flow
      </h2>
      <p className="mb-7 text-sm leading-6 text-slate-500 sm:mb-8 sm:text-base">
        Choose a provider. After authentication, this page will display the
        response returned by{" "}
        <code className="font-mono text-slate-700">/api/me</code>.
      </p>

      <div className="grid gap-3">
        <OAuthButton
          provider="google"
          backendUrl={backendUrl}
          className={`${buttonClass} border-slate-300 bg-white text-slate-700 hover:border-slate-400`}
        >
          <GoogleIcon />
          Continue with Google
        </OAuthButton>

        <OAuthButton
          provider="github"
          backendUrl={backendUrl}
          className={`${buttonClass} border-slate-950 bg-slate-950 text-white hover:bg-slate-800`}
        >
          <GitHubIcon />
          Continue with GitHub
        </OAuthButton>
      </div>
    </div>
  );
}
