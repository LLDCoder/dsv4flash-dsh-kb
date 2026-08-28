import { matchPath } from "react-router-dom";

export function matchKeepAliveRoute(pathname, routePath) {
  return Boolean(
    matchPath(pathname, {
      path: routePath,
      exact: true,
      strict: false,
    }),
  );
}
