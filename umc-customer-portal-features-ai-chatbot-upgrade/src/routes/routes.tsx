import * as React from "react";
import Home from "@/assets/icons/Home";
import MyRequests from "@/assets/icons/MyRequests";
import Wallet from "@/assets/icons/Wallet";
import Dir from "@/assets/icons/Dir";
import Database from "@/assets/icons/Database";
import Db from "@/assets/icons/Db";
import Email from "@/assets/icons/Email";
import Services from "@/assets/icons/Services";
import type { KeepAliveRouteMeta } from "./keepAlive";
export interface IRoute {
  path: string;
  root?: boolean;
  title: string;
  titleKey?: string;
  icon?: React.ReactNode;
  isMenu?: boolean;
  page?: string;
  element?: React.ReactNode;
  children?: IRoute[];
  i18n?: string;
  keepAlive?: KeepAliveRouteMeta;
}

export const menuRouteConfig: IRoute[] = [
  {
    path: "/home",
    title: "Home",
    titleKey: "menu.home",
    isMenu: true,
    icon: <Home />,
    page: "Home",
    i18n: "menu.home",
  },
  {
    path: "/services",
    title: "Services",
    titleKey: "menu.services",
    i18n: "menu.services",
    isMenu: true,
    icon: <Services />,
    page: "Services",
    keepAlive: {
      group: "services",
      mode: "cache",
    },
    children: [
      {
        title: "Media License",
        path: "/services/media-license",
        titleKey: "menu.mediaLicense",
        page: "MediaLicense",
        i18n: "menu.mediaLicense",
        keepAlive: {
          group: "services",
          mode: "route",
        },
      },
      {
        title: "Service Details",
        path: "/services/service-card",
        titleKey: "menu.serviceCard",
        page: "ServiceCard",
        i18n: "menu.serviceCard",
        keepAlive: {
          group: "services",
          mode: "route",
        },
      },
    ],
  },
  {
    path: "/my-requests",
    title: "My Requests",
    titleKey: "menu.myRequests",
    i18n: "menu.myRequests",
    isMenu: true,
    icon: <MyRequests />,
    page: "my-requests",
    keepAlive: {
      group: "my-requests",
      mode: "cache",
    },
    children: [
      {
        title: "Details",
        path: "/my-requests/detail",
        titleKey: "menu.details",
        page: "Detail",
        i18n: "menu.details",
        keepAlive: {
          group: "my-requests",
          mode: "route",
        },
      },
    ],
  },
  {
    path: "/payments",
    title: "Payments",
    titleKey: "menu.payments",
    i18n: "menu.payments",
    isMenu: true,
    icon: <Wallet />,
    page: "Payments",
    keepAlive: {
      group: "payments",
      mode: "cache",
    },
    children: [
      {
        title: "Transaction Detail",
        path: "/payments/transaction-detail",
        titleKey: "menu.transactionDetail",
        page: "TransactionDetail",
        i18n: "menu.transactionDetail",
        keepAlive: {
          group: "payments",
          mode: "route",
        },
      },
    ],
  },
  {
    path: "/permits-license",
    title: "Licenses & Permits",
    titleKey: "menu.permitsLicense",
    i18n: "menu.permitsLicense",
    isMenu: true,
    icon: <Dir />,
    page: "PermitsLicense",
    // element: <>Dir</>
  },
  {
    path: "/violations-fines",
    title: "ViolationsFines",
    titleKey: "menu.ViolationsFines",
    i18n: "menu.ViolationsFines",
    isMenu: true,
    icon: <Database />,
    page: "ViolationsFines",
    keepAlive: {
      group: "violations-fines",
      mode: "cache",
    },
    children: [
      {
        path: "/violations-fines/appeals/:appealId",
        title: "Appeal Details",
        page: "ViolationsFinesAppealDetail",
        keepAlive: {
          group: "violations-fines",
          mode: "route",
        },
      },
      {
        path: "/violations-fines/violations/:violationId",
        title: "Violation Details",
        page: "ViolationsFinesViolationDetail",
        keepAlive: {
          group: "violations-fines",
          mode: "route",
        },
      },
      {
        path: "/violations-fines/payment/success",
        title: "Payment Successful",
        page: "ViolationsFinesPaymentResult",
        keepAlive: {
          group: "violations-fines",
          mode: "route",
        },
      },
      {
        path: "/violations-fines/payment/failed",
        title: "Payment Failed",
        page: "ViolationsFinesPaymentResult",
        keepAlive: {
          group: "violations-fines",
          mode: "route",
        },
      },
    ],
  },
  {
    path: "/refund",
    title: "Refund",
    titleKey: "menu.refund",
    i18n: "menu.refund",
    isMenu: true,
    icon: <Db />,
    page: "Refund",
    element: <>refund</>,
    keepAlive: {
      group: "refund",
      mode: "cache",
    },
    children: [
      {
        title: "Add Refund Request",
        path: "/addRefund",
        titleKey: "menu.addRefund",
        page: "AddRefund",
        i18n: "menu.addRefund",
      },
      {
        title: "Refund Details",
        path: "/refund/refund-detail",
        titleKey: "menu.refundDetail",
        page: "RefundDetail",
        i18n: "menu.refundDetail",
        keepAlive: {
          group: "refund",
          mode: "route",
        },
      },
    ],
  },
  {
    path: "/complaints",
    title: "Enquiries & Complaints",
    titleKey: "menu.complaints",
    i18n: "menu.complaints",
    isMenu: true,
    icon: <Email />,
    page: "Complaints",
    keepAlive: {
      group: "complaints",
      mode: "cache",
    },
    children: [
      {
        title: "Enquiry Details",
        path: "/complaints/complaints-details",
        titleKey: "menu.complaintsDetails",
        page: "ComplaintsDetails",
        i18n: "menu.complaintsDetails",
        keepAlive: {
          group: "complaints",
          mode: "route",
        },
      },
    ],
  },
  {
    path: "/global-search",
    title: "Global Search",
    titleKey: "menu.globalsearch",
    i18n: "menu.globalsearch",
    isMenu: false,
    icon: <Email />,
    page: "Globalsearch",
    element: <>globalsearch</>,
  },
  {
    path: "/knowledge-center",
    title: "Knowledge Center",
    titleKey: "menu.knowledgecenter",
    i18n: "menu.knowledgecenter",
    isMenu: false,
    icon: <Email />,
    page: "Knowledgecenter",
    children: [
      {
        path: "/knowledge-center/knowledge-center-detail",
        title: "Knowledge Center Detail",
        titleKey: "menu.KnowledgecenterDetail",
        i18n: "menu.KnowledgecenterDetail",
        icon: <Email />,
        page: "KnowledgecenterDetail",
      },
    ],
  },

  {
    path: "/my-account",
    title: "My Account",
    titleKey: "menu.myAccount",
    i18n: "menu.myAccount",
    isMenu: false,
    page: "MyAccount",
    children: [
      {
        title: "Personal Profile",
        path: "/my-account/personal-profile",
        titleKey: "menu.personalProfile",
        page: "PersonalProfile",
        i18n: "menu.personalProfile",
      },
      {
        title: "Establishment Profile",
        path: "/my-account/establishment-profile",
        titleKey: "menu.establishmentProfile",
        page: "EstablishmentProfile",
        i18n: "menu.establishmentProfile",
      },
    ],
  },
];
