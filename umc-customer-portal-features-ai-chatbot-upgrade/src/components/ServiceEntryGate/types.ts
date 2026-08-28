export type ServiceEntryGateDialogTone =
  | "warning"
  | "danger"
  | "success"
  | "info";

export type ServiceEntryGateActionVariant =
  | "primary"
  | "outline"
  | "danger"
  | "danger-outline";

export interface ServiceEntryGateDialogAction {
  key: string;
  label: string;
  variant?: ServiceEntryGateActionVariant;
  disabled?: boolean;
}

export interface ServiceEntryGateProfileOption {
  profileId: string;
  userTypeId?: string | null;
  userTypeCode?: string | null;
  title: string;
  subtitle?: string | null;
  badge?: string | null;
  avatarUrl?: string | null;
  isEligible?: boolean;
  group?: "individual" | "establishment";
}

export interface ServiceEntryGateBaseDialog {
  kind: "message" | "profile-list" | "license-status" | "danger-confirm";
  title: string;
  description: string;
  tone?: ServiceEntryGateDialogTone;
  actions: ServiceEntryGateDialogAction[];
  dismissActionKey?: string;
  width?: number;
  closeable?: boolean;
  variant?: string;
}

export interface ServiceEntryGateMessageDialog
  extends ServiceEntryGateBaseDialog {
  kind: "message";
  bulletItems?: string[];
  orderedItems?: string[];
  link?: {
    label: string;
    url: string;
  };
  descriptionHighlightText?: string;
  helperText?: string;
}

export interface ServiceEntryGateProfileListDialog
  extends ServiceEntryGateBaseDialog {
  kind: "profile-list";
  profiles: ServiceEntryGateProfileOption[];
  selectedProfileId?: string | null;
  listLabel?: string;
  helperText?: string;
}

export interface ServiceEntryGateLicenseStatusDialog
  extends ServiceEntryGateBaseDialog {
  kind: "license-status";
  identifierLabel?: string | null;
  identifierValue?: string | null;
  helperText?: string;
}

export interface ServiceEntryGateDangerConfirmDialog
  extends ServiceEntryGateBaseDialog {
  kind: "danger-confirm";
}

export type ServiceEntryGateDialogConfig =
  | ServiceEntryGateMessageDialog
  | ServiceEntryGateProfileListDialog
  | ServiceEntryGateLicenseStatusDialog
  | ServiceEntryGateDangerConfirmDialog;

export interface ServiceEntryGateDialogResult {
  actionKey: string;
  selectedProfileId?: string | null;
}

export type ServiceEntryGateDialogOpener = (
  dialog: ServiceEntryGateDialogConfig,
) => Promise<ServiceEntryGateDialogResult>;

export interface ApplicantProfileModeOption {
  value: "Individual" | "Establishment";
  label: string;
  description?: string;
}

export interface RelatedEstablishmentOption {
  value: string;
  label: string;
  subtitle?: string;
  userTypeId?: string;
  avatarUrl?: string;
}
