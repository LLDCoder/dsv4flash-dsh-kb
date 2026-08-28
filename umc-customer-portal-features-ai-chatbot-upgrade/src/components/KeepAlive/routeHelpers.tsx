import { Route } from "react-router-dom";
import type { IRoute } from "@/routes";
import KeepAliveRouteGroup from "./KeepAliveRouteGroup";

export function getKeepAliveRouteGroups(routes: IRoute[]) {
  return routes.reduce<Record<string, IRoute[]>>((groups, route) => {
    const groupKey = route.keepAlive?.group;

    if (!groupKey) {
      return groups;
    }

    if (!groups[groupKey]) {
      groups[groupKey] = [];
    }

    groups[groupKey].push(route);
    return groups;
  }, {});
}

export function renderKeepAliveAwareRoute(route: IRoute, routes: IRoute[]) {
  const groupKey = route.keepAlive?.group;

  if (!groupKey) {
    return (
      <Route
        key={route.path}
        exact
        path={route.path}
        render={() => route.element}
      />
    );
  }

  const groupRoutes = getKeepAliveRouteGroups(routes)[groupKey];

  if (groupRoutes[0] !== route) {
    return null;
  }

  return (
    <Route
      key={`keep-alive-${groupKey}`}
      exact
      path={groupRoutes.map((groupRoute) => groupRoute.path)}
      render={() => (
        <KeepAliveRouteGroup
          routes={groupRoutes.map((groupRoute) => ({
            path: groupRoute.path,
            element: groupRoute.element,
            cache: groupRoute.keepAlive?.mode === "cache",
          }))}
        />
      )}
    />
  );
}
