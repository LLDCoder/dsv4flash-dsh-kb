import * as React from "react";
import { Spin } from "antd";
import Layout from "../layout";
import AuthBoundary from "../components/AuthBoundary";
import { menuRouteConfig } from "./routes";
import { lazyWithRetry } from "@/utils/lazyWithRetry";
import type { KeepAliveRouteMeta } from "./keepAlive";
export interface IRoute {
  path: string;
  root?: boolean;
  title?: string;
  titleKey?: string;
  icon?: React.ReactNode;
  isMenu?: boolean;
  page?: string;
  element?: React.ReactNode;
  children?: IRoute[];
  i18n?: string;
  keepAlive?: KeepAliveRouteMeta;
}

type PageModule = {
  default: React.ComponentType<unknown>;
};

const pageLoaders = import.meta.glob<PageModule>(
  "../pages/*/index.tsx"
);

const normalizeModulePath = (p: string) => p.replace(/\\/g, "/");

/** `import.meta.glob` keys can differ in casing from `route.page`; a bad lookup yields `undefined` and breaks `React.lazy` (white screen). */
function resolvePageLoader(
  page: string | undefined
): () => Promise<PageModule> {
  if (!page) {
    return () =>
      Promise.reject(
        new Error("[routes] Route is missing `page` for lazy loading.")
      );
  }
  const expected = `../pages/${page}/index.tsx`;
  const byExact = pageLoaders[expected];
  if (typeof byExact === "function") {
    return byExact;
  }
  const keys = Object.keys(pageLoaders);
  const byCase = keys.find(
    (k) =>
      normalizeModulePath(k).toLowerCase() ===
      normalizeModulePath(expected).toLowerCase()
  );
  if (byCase && typeof pageLoaders[byCase] === "function") {
    return pageLoaders[byCase] as () => Promise<PageModule>;
  }
  const pl = page.toLowerCase();
  const byFolder = keys.find((k) => {
    const m = k.match(/\/pages\/([^/]+)\/index\.tsx$/i);
    return m != null && m[1] != null && m[1].toLowerCase() === pl;
  });
  if (byFolder && typeof pageLoaders[byFolder] === "function") {
    return pageLoaders[byFolder] as () => Promise<PageModule>;
  }
  console.error(
    "[routes] No lazy module for",
    expected,
    "— available keys:",
    keys
  );
  return () =>
    Promise.reject(new Error(`[routes] Page module not found for "${page}"`));
}

const routeSuspenseFallback = React.createElement(
  "div",
  {
    style: {
      display: "flex",
      justifyContent: "center",
      padding: "48px 0",
    },
  },
  React.createElement(Spin, { size: "large" })
);

function createLazyElement(loader: () => Promise<PageModule>) {
  return React.createElement(
    React.Suspense,
    { fallback: routeSuspenseFallback },
    React.createElement(lazyWithRetry(loader))
  );
}

const pageNames = Object.keys(pageLoaders)
  .map((path) => {
    const match = path.match(/\/pages\/([^/]+)\/index\.tsx$/i);
    return match ? match[1] : "";
  })
  .filter(Boolean);

function flattenConfiguredRoutes(items: IRoute[]): IRoute[] {
  return items.flatMap((item) => {
    const children = item.children ? flattenConfiguredRoutes(item.children) : [];
    return [item, ...children];
  });
}

function generateAllRoutes() {
  const routes = flattenConfiguredRoutes(menuRouteConfig).map((route) => ({
    ...route,
  }));

  pageNames.forEach((pageName) => {
    const existingRoute = routes.find(
      (route) => route.page && route.page.toLowerCase() === pageName.toLowerCase()
    );
    if (!existingRoute) {
      routes.push({
        path: `/${pageName.toLowerCase()}`,
        title: pageName,
        isMenu: false,
        page: pageName,
        titleKey: `menu.${
          pageName.charAt(0).toLowerCase() + pageName.slice(1)
        }`,
        i18n: `menu.${pageName.charAt(0).toLowerCase() + pageName.slice(1)}`,
      });
    }
  });

  return routes;
}

function createRoutes() {
  const allRoutes = generateAllRoutes();

  const rootRoute = {
    path: "/",
    root: true,
    redirect: "/home",
    element: (
      <AuthBoundary>
        <Layout />
      </AuthBoundary>
    ),
    children: allRoutes.map((route) => ({
      ...route,
      element: createLazyElement(resolvePageLoader(route.page)),
    })),
  };
  const publicRoutes = [
    {
      path: "/payment/result",
      title: "Payment Result",
      isMenu: false,
      element: createLazyElement(() => import("../pages/PaymentResult/index.tsx")),
    },
    {
      path: "/login",
      title: "Login",
      isMenu: false,
      element: createLazyElement(() => import("../pages/Login/index.tsx")),
    },
    {
      path: "/signup",
      title: "Sign Up",
      isMenu: false,
      element: createLazyElement(() => import("../pages/SignUp/index.tsx")),
    },
    {
      path: "/verification",
      title: "Verification",
      isMenu: false,
      element: createLazyElement(() => import("../pages/Verification/index.tsx")),
    },
    {
      path: "/registration-successful",
      title: "Registration Successful",
      isMenu: false,
      element: createLazyElement(
        () => import("../pages/RegistrationSuccessful/index.tsx")
      ),
    },
    {
      path: "/forgot-password",
      title: "Forgot Password",
      isMenu: false,
      element: createLazyElement(() => import("../pages/ForgotPassword/index.tsx")),
    },
    {
      path: "/forgot-email",
      title: "Forgot Email",
      isMenu: false,
      element: createLazyElement(() => import("../pages/ForgotEmail/index.tsx")),
    },
    {
      path: "/new-password",
      title: "New Password",
      isMenu: false,
      element: createLazyElement(() => import("../pages/NewPassword/index.tsx")),
    },
    {
      path: "/pwd-reset-success",
      title: "Password Reset Successful",
      isMenu: false,
      element: createLazyElement(
        () => import("../pages/PwdResetSuccess/index.tsx")
      ),
    },
    {
      path: "/pay-fines",
      title: "Pay Fines",
      isMenu: false,
      element: createLazyElement(() => import("../pages/PayFines/index.tsx")),
      keepAlive: {
        group: "public-pay-fines",
        mode: "cache",
      },
    },
    {
      path: "/inquiries",
      title: "Enquiries & Feedback",
      isMenu: false,
      element: createLazyElement(() => import("../pages/PublicEnquiry/index.tsx")),
    },
    {
      path: "/enquiry-details",
      title: "Enquiry Details",
      isMenu: false,
      element: createLazyElement(() => import("../pages/PublicEnquiryDetails/index.tsx")),
    },
    {
      path: "/pay-fines/detail",
      title: "Pay Fines Detail",
      isMenu: false,
      element: createLazyElement(
        () => import("../pages/PayFinesDetail/index.tsx")
      ),
      keepAlive: {
        group: "public-pay-fines",
        mode: "route",
      },
    },
    {
      path: "/track-application",
      title: "Track Application",
      isMenu: false,
      element: createLazyElement(
        () => import("../pages/TrackApplication/index.tsx")
      ),
    },
    {
      path: "/Verifynow",
      title: "Verify Now",
      isMenu: false,
      element: createLazyElement(() => import("../pages/VerifyNow/index.tsx")),
    },
    {
      path: "/impersonation",
      title: "Impersonation",
      isMenu: false,
      element: createLazyElement(
        () => import("../pages/Impersonation/index.tsx")
      ),
    },
  ];
  return [...publicRoutes, rootRoute];
}

const AppRoutes = createRoutes();

export default AppRoutes as IRoute[];
