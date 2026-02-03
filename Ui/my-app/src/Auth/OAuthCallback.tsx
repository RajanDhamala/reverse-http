import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

interface OAuthUserData {
  provider: string;
  id: string;
  email: string;
  full_name: string;
  avatar_url: string;
}

const OAuthCallback = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [userData, setUserData] = useState<OAuthUserData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const data = searchParams.get("data");
    const errorParam = searchParams.get("error");

    if (errorParam) {
      setError(decodeURIComponent(errorParam));
      return;
    }

    if (data) {
      try {
        const decoded = decodeURIComponent(data);
        const parsed: OAuthUserData = JSON.parse(decoded);
        setUserData(parsed);
        console.log("OAuth User Data:", parsed);
      } catch {
        setError("Failed to parse user data");
      }
    } else {
      setError("No data received");
    }
  }, [searchParams]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-950 p-4">
        <div className="w-full max-w-sm space-y-6 text-center">
          <div className="w-16 h-16 mx-auto bg-red-500/20 rounded-full flex items-center justify-center">
            <svg className="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-white">Authentication Error</h1>
          <p className="text-zinc-400">{error}</p>
          <button
            onClick={() => navigate("/login")}
            className="px-6 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg transition"
          >
            Back to Login
          </button>
        </div>
      </div>
    );
  }

  if (!userData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-950">
        <div className="w-8 h-8 border-2 border-zinc-700 border-t-white rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-950 p-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 mx-auto bg-green-500/20 rounded-full flex items-center justify-center">
            <svg className="w-8 h-8 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-white">Welcome!</h1>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 space-y-4">
          <div className="flex items-center gap-4">
            {userData.avatar_url ? (
              <img
                src={userData.avatar_url}
                alt="Avatar"
                className="w-14 h-14 rounded-full border-2 border-zinc-700"
              />
            ) : (
              <div className="w-14 h-14 rounded-full bg-zinc-800 flex items-center justify-center">
                <span className="text-xl text-white font-medium">
                  {userData.full_name?.charAt(0) || userData.email?.charAt(0) || "?"}
                </span>
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-white font-medium truncate">{userData.full_name || "User"}</p>
              <p className="text-zinc-400 text-sm truncate">{userData.email}</p>
            </div>
          </div>

          <div className="pt-4 border-t border-zinc-800">
            <div className="flex items-center justify-between text-sm">
              <span className="text-zinc-500">Provider</span>
              <span className="text-white capitalize">{userData.provider}</span>
            </div>
            <div className="flex items-center justify-between text-sm mt-2">
              <span className="text-zinc-500">ID</span>
              <span className="text-zinc-400 font-mono text-xs">{userData.id}</span>
            </div>
          </div>
        </div>

        <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-4">
          <p className="text-zinc-500 text-xs mb-2">Response data:</p>
          <pre className="text-xs text-zinc-400 overflow-x-auto">
            {JSON.stringify(userData, null, 2)}
          </pre>
        </div>

        <button
          onClick={() => navigate("/")}
          className="w-full py-3 bg-white text-black hover:bg-zinc-200 font-medium rounded-lg transition"
        >
          Continue
        </button>
      </div>
    </div>
  );
};

export default OAuthCallback;
