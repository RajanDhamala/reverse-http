import { lazy } from "react";

export const LazyLandingPage = lazy(() => import("../Pages/LandingPage.tsx"));
export const LazyLoginPage = lazy(() => import("../Auth/LoginPage.tsx"));
export const LazyRegisterPage = lazy(() => import("../Auth/RegisterPage.tsx"));
export const LazyOAuthCallback = lazy(() => import("../Auth/OAuthCallback.tsx"));
export const LazyTestPage = lazy(() => import("../Pages/TestPage.tsx"));
