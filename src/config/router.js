import { lazy } from "react";

const lazyLoader = (path) =>
  lazy(() =>
    import(/* webpackChunkName: "chunk-[request]" */ `../pages/${path}`)
  );

export const MENU = [
  {
    title: "demo演示",
    key: "demo演示",
    children: [
      {
        title: "手动录制",
        key: "手动录制",
        path: "/demo1",
        component: lazyLoader("demo1"),
      },
      {
        title: "自动录制",
        key: "自动录制",
        path: "/demo2",
        component: lazyLoader("demo2"),
      },
      {
        title: "捕获错误",
        key: "捕获错误",
        path: "/demo3",
        component: lazyLoader("demo3"),
      },
      {
        title: "抽样策略",
        key: "抽样策略",
        path: "/demo4",
        component: lazyLoader("demo4"),
      },
      {
        title: "录制console",
        key: "录制console",
        path: "/demo5",
        component: lazyLoader("demo5"),
      },
    ],
  },
  {
    title: "日志管理",
    key: "日志管理",
    children: [
      {
        title: "日志列表",
        key: "日志列表",
        path: "/list",
        component: lazyLoader("list"),
      },
    ],
  },
];

export const ROUTE = (() => {
  const getTarget = ({ children, route }) => {
    let list = [];
    children.forEach((child) => {
      if (child.children) {
        list = [
          ...list,
          ...getTarget({ ...child, route: [...route, child.key] }),
        ];
      } else {
        list.push({ ...child, route: [...route, child.key] });
      }
    });
    return list;
  };
  return MENU.map((item) => getTarget({ ...item, route: [item.key] })).flat();
})();
