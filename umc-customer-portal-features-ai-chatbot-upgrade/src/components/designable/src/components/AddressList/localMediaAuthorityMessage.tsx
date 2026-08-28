import React from "react";
import { Trans } from "react-i18next";
import { useServicesStore } from "@/store/services";

/**
 * Text Permit services: photography inside Abu Dhabi, Dubai and Sharjah is issued by
 * each emirate's own media authority, not by UMC, so a pin dropped there is refused
 * with links to those authorities instead of the generic "permitted emirates" notice.
 */
const LOCAL_AUTHORITY_SERVICE_CODES = new Set(["7", "14", "20"]);

const ABU_DHABI_URL = "https://www.cma.gov.ae/media-services";
// The ticket linked the Salesforce login redirect; ec/startURL are the artifacts of
// that bounce and resolve to this same page, so link the portal root directly.
const DUBAI_URL = "https://www.filmdubai.gov.ae/";
const SHARJAH_URL =
  "https://ec.shj.ae/en/government-service-details/?serviceId=8a0afb33829cb5f478b86f6882ef80f3165eacf577b61e8d0d420c105da53001f931cb56d2f416805e1bfd0bc3cc1ec3";

/**
 * Mirrors getEmirateList: the query string carries a serviceCode only on the entry
 * links that had one to pass on, so resuming a draft or editing an application lands
 * here without it. Falling back to the same store the emirate request falls back to
 * keeps the refusal and its explanation describing one service, never two.
 */
export const usesLocalMediaAuthority = (routeServiceCode?: string | number | null) => {
  const resolvedServiceCode =
    routeServiceCode ?? useServicesStore.getState().userInfo.servicesCode;
  return LOCAL_AUTHORITY_SERVICE_CODES.has(String(resolvedServiceCode ?? "").trim());
};

const externalLink = (href: string) => (
  <a href={href} target="_blank" rel="noopener noreferrer" />
);

export const renderLocalMediaAuthorityMessage = () => (
  <Trans
    i18nKey="AddressList.validation.mapEmirateLocalAuthority"
    components={{
      abuDhabi: externalLink(ABU_DHABI_URL),
      dubai: externalLink(DUBAI_URL),
      sharjah: externalLink(SHARJAH_URL),
    }}
  />
);
