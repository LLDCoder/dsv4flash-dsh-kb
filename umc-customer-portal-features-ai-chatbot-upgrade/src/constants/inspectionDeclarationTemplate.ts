/**
 * Static declaration template shipped with the standalone inspection
 * declaration page. The file is served from the public folder so the page can
 * download it without an authenticated backend session.
 */
export const INSPECTION_DECLARATION_TEMPLATE_FILE_NAME =
  "Declaration and Acknowledgement.pdf";

export const INSPECTION_DECLARATION_TEMPLATE_URL = `/${encodeURIComponent(
  INSPECTION_DECLARATION_TEMPLATE_FILE_NAME,
)}`;
