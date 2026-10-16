# umc.admin-certificates.read

Version: 1.0.0. Business operations are read-only.

Load only for this business topic after trusted GetUserInfo. This skill never grants permissions.
Use the fixed operation IDs in manifest.json; never accept model URLs, headers, identity, SQL or methods.
Launch API, page and knowledge agents together after identity and semantic task analysis.
Lists may run independently (maximum two). Resolve an exact application number to a taskId before personal detail.
Team reads require current-module IsLeader=true. Do not use a team taskId with the personal detail operation.
Project only requested, allowed fields; no form JSON, credentials, leave explanations or contact details.
A task count is not an application count; StatusCount is not keyword/date-filtered Page.Total.
Unknown, missing, failed and denied are not zero. Do not assert payment amounts from these APIs.
Return source operation, observation time, scope, coverage, omissions and trace references; one final answer only.

## LIC06: POST /api/LicenseManagement/list
Enabled: False
先确认全局数据权限；权限来源未闭环前不调用。列表精确定位证书Id→必要时详情；只问统计可直查统计；同时确需列表和统计可并行。
只保留证照号、状态、有效期及问题所需公开字段；列表/详情可含CertificatePassword；密码、身份证、电话、邮箱等默认剔除。全局统计不能称为本人或本部门统计。

## LIC07: GET /api/LicenseManagement/{id}
Enabled: False
先确认全局数据权限；权限来源未闭环前不调用。列表精确定位证书Id→必要时详情；只问统计可直查统计；同时确需列表和统计可并行。
只保留证照号、状态、有效期及问题所需公开字段；列表/详情可含CertificatePassword；密码、身份证、电话、邮箱等默认剔除。全局统计不能称为本人或本部门统计。

## LIC08: GET /api/LicenseManagement/statistics
Enabled: False
先确认全局数据权限；权限来源未闭环前不调用。列表精确定位证书Id→必要时详情；只问统计可直查统计；同时确需列表和统计可并行。
只保留证照号、状态、有效期及问题所需公开字段；列表/详情可含CertificatePassword；密码、身份证、电话、邮箱等默认剔除。全局统计不能称为本人或本部门统计。

