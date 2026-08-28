import React from "react";
import type { ColumnsType } from "antd/es/table";
import ProfileNameCell, { type ProfileNameFields } from "./index";

export const createProfileNameColumn = <
  RecordType extends ProfileNameFields,
>(
  title: React.ReactNode,
): ColumnsType<RecordType>[number] => ({
  title,
  key: "profileName",
  dataIndex: "profileName",
  width: 220,
  render: (_value: unknown, record: RecordType) =>
    React.createElement(ProfileNameCell, {
      profileId: record.profileId,
      profileName: record.profileName,
      userTypeId: record.userTypeId,
      userTypeName: record.userTypeName,
    }),
});
