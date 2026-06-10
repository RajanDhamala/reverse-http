import { Suspense, useEffect } from "react";
import "./index.css";
import { LazyLandingPage, LazyRegisterPage, LazyLoginPage, LazyTestPage, LazyOAuthCallback, LazyOAuthLiveDashboard, LazyUpdateConfig, LazyAppConfig, LazyDocumentationPage } from "./LazyLoading/LazyLoading";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { QueryClientProvider } from "@tanstack/react-query";
import queryClient from "./Utils/QueryConfig.tsx";
import Loader from "./LazyLoading/Loader.tsx";
import { Toaster } from "react-hot-toast";
import Navbar from "./components/Navbar";
import { type AuthUser, useUserStore } from "./Zustand/userStore.ts";
import Error404Page from "./Pages/404ErrorPage.tsx";
import { apiUrl } from "./Utils/env";

function App() {
  const { setUser, clearUser, setAuthLoading } = useUserStore();

  useEffect(() => {
    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), 5000);

    const initUser = async () => {
      setAuthLoading();

      try {
        const res = await fetch(apiUrl("/user/me"), {
          method: "GET",
          credentials: "include",
          signal: controller.signal,
        });

        if (!res.ok) {
          clearUser();
          return;
        }

        const data = (await res.json()) as { user?: AuthUser };
        if (data?.user) {
          setUser(data.user);
        } else {
          clearUser();
        }
      } catch (err) {
        if (!(err instanceof DOMException && err.name === "AbortError")) {
          console.log(err);
        }
        clearUser();
      } finally {
        window.clearTimeout(timeoutId);
      }
    };

    initUser();

    return () => {
      window.clearTimeout(timeoutId);
      controller.abort();
    };
  }, [clearUser, setAuthLoading, setUser]);

  return (
    <QueryClientProvider client={queryClient}>
      <Toaster position="top-right" reverseOrder={false} toastOptions={{
        duration: 5000,
      }}
      />
      <Router>
        <Navbar />
        <Suspense fallback={<Loader />}>
          <Routes>
            <Route path="/" element={<LazyLandingPage />} />
            <Route path="/login" element={<LazyLoginPage />} />
            <Route path="/register" element={<LazyRegisterPage />} />
            <Route
              path="/oauth/callback"
              element={<LazyOAuthCallback />}
            />
            <Route path="/oauth/live" element={<LazyOAuthLiveDashboard />} />

            <Route path="/test" element={<LazyTestPage />} />

            <Route path="/docs" element={<LazyDocumentationPage />} />
            <Route path="/reverse" element={<LazyUpdateConfig />} />
            <Route path="/oauth" element={<LazyUpdateConfig />} />
            <Route path="/app" element={<LazyAppConfig />} />
            <Route path="*" element={<Error404Page />} />
          </Routes>
        </Suspense>
      </Router>
    </QueryClientProvider>
  );
}

export default App;
