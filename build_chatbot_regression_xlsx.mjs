import fs from "node:fs/promises";
import { SpreadsheetFile, Workbook } from "@oai/artifact-tool";

const outputDir = "/Users/thron/Documents/odt/dsv4flash-dsh-kb/outputs/chatbot-structured-retrieval-regression";
const outputPath = `${outputDir}/chatbot-structured-retrieval-regression.xlsx`;

const headers = [
  "A134", "模块", "用例类型", "优先级", "用户/身份", "业务对象", "对象ID", "前置条件",
  "测试问题", "同义问法/连续追问", "模拟数据引用", "期望答案摘要", "必须包含", "禁止内容/错误",
  "期望下一步", "调用实时数据", "期望字段/API", "转人工", "知识来源", "评测关注点",
  "实际回答", "准确性(0-5)", "依据性(0-5)", "安全性(0-5)", "可执行性(0-5)", "综合得分",
  "自动判定", "人工覆盖", "最终结果", "缺陷类型", "测试备注"
];

const source = "chatbot-structured-retrieval-regression";
const cases = [
  ["TC-131", "Profile", "动态数据", "P0", "已登录 Customer；当前 Profile", "Profile", "—", "当前 Profile 为 Under Review", "My profile is under review. Can I start a new application?", "档案审核中可以新建申请吗？", "D-PROFILE", "说明当前 Profile 的审核状态与新申请约束；如需使用其他 Profile，提示切换。", "当前 Profile 范围；审核约束；切换 Profile 提示", "不得将申请数量当作 Profile 审核结论", "引导切换 Profile 或查看 Profile 状态", "是", "当前 Profile 状态", "条件触发", "CI-01", "Profile 范围"],
  ["TC-132", "Services", "动态数据", "P0", "已登录 Customer；当前 Profile", "Service", "—", "Profile 已选定", "Which services am I eligible to apply for under my current profile?", "我当前档案能申请哪些服务？", "D-PROFILE；D-SERVICE", "先查询当前账户已收集的服务；返回候选服务，仅追问确实缺失的经营信息。", "当前 Profile；候选服务；仅缺失信息", "不得让客户重复已知档案信息", "展示服务或补充必要经营信息", "是", "Profile；已收集服务", "否", "CI-02", "实时数据优先"],
  ["TC-133", "My Requests", "动态数据", "P0", "已登录 Customer；当前 Profile", "Application", "—", "存在 Pending Payment 申请", "My application is showing as Pending Payment. What should I do next?", "待付款申请下一步怎么办？", "D-APPLICATION-PENDING-PAYMENT", "仅查询 Pending Payment 申请；保留公开申请编号，展示可用支付详情但不发起或确认支付。", "公开申请编号；支付详情", "不得开始、重试或确认支付；不得改称内部 ID", "引导 My Requests", "是", "申请状态；支付详情", "否", "CI-03", "只读支付"],
  ["TC-134", "My Requests", "动态数据", "P0", "已登录 Customer；当前 Profile", "Application", "—", "存在申请记录", "Can you check the latest status of my application?", "最新申请进度是什么？", "D-MY-REQUESTS", "按默认最新优先查询 My Requests；说明选定 Profile 范围；仅在无法识别具体记录时索要申请号。", "选定 Profile；最新申请状态", "不得使用固定结果或跨 Profile 数据", "必要时索要申请号", "是", "申请号；状态；更新时间", "否", "CI-04", "最新优先；Profile 范围"],
  ["TC-135", "Licenses & Permits", "流程知识", "P0", "已登录 Customer；当前 Profile", "Issued Permit", "—", "存在已签发许可", "Where can I download my issued permit?", "在哪里下载已签发的许可证？", "D-PERMIT", "指引客户到 [Licenses & Permits](/permits-license) 自行下载。", "Licenses & Permits 链接", "不得下载文件、暴露 URL 或访问码", "引导 Licenses & Permits", "否", "—", "否", "CI-05", "下载边界"],
  ["TC-136", "Payments", "动态数据", "P0", "已登录 Customer；当前 Profile", "Payment", "—", "存在付款交易", "Was my latest payment successful, and where can I find the receipt?", "最新付款成功了吗？收据在哪里？", "D-PAYMENT", "只依据实时交易记录确认支付是否成功；说明 Portal 中的收据操作，不伪造链接或下载收据。", "交易状态；收据 Portal 操作", "不得伪造收据 URL 或声称已下载", "引导 Payments", "是", "交易状态；付款时间；收据可用性", "否", "CI-06", "实时交易证据"],
  ["TC-137", "Licenses & Permits", "动态数据 + 流程知识", "P0", "已登录 Customer；当前 Profile", "Issued License", "—", "存在即将到期许可", "My license is expiring soon. What should I do?", "许可证快到期了怎么办？", "D-PERMIT；K-RENEWAL", "查询续期证据；说明续期截止时间、过期后限制和 Portal 下一步；将通用指引与具体记录状态分开。", "续期截止；过期限制；Portal 下一步", "不得混淆已签发许可与续期申请状态", "引导 Licenses & Permits 或 My Requests", "是", "许可状态；到期日；续期动作", "否", "CI-07", "许可与申请分离"],
  ["TC-138", "Fines", "动态数据", "P0", "已登录 Customer；当前 Profile", "Violation", "—", "收到罚款通知", "I received a fine notification. Can I appeal it?", "收到罚款通知，可以申诉吗？", "D-VIOLATION-APPEAL", "路由至申诉而非罚款支付；先查询申诉或违规证据；必要时索要违规编号；不提交申诉。", "申诉路径；违规编号提示", "不得路由到罚款支付；不得自动提交申诉", "索要违规编号或引导申诉", "是", "违规记录；申诉状态", "条件触发", "CI-08", "意图路由"],
  ["TC-139", "Services", "流程知识", "P1", "已登录 Customer；当前 Profile", "Service", "—", "经营活动信息不完整", "I cannot find the right service for my business. Can you help?", "帮我找适合业务的服务。", "K-SERVICE-DISCOVERY", "缺少时索要经营活动、机构类型和酋长国；区分联邦候选服务与本地主管部门转交；不把候选当作最终资格结论。", "经营活动；机构类型；酋长国；候选服务", "不得承诺最终资格或混淆主管部门", "补充经营信息或转交本地主管部门", "否", "—", "条件触发", "CI-09", "资格边界"],
  ["TC-140", "Complaints", "流程知识", "P0", "已登录 Customer；当前 Profile", "Complaint", "—", "申请延误且有申请编号", "I have a complaint about a delayed application. How can I submit it?", "申请延误，如何投诉？", "D-APPLICATION；K-COMPLAINT", "识别 Complaint 类型、所需申请编号与支持信息；仅提供 Portal 跳转或预览，不提交、更新或取消投诉。", "投诉类型；申请编号；支持信息", "不得提交、更新或取消投诉", "引导 Enquiries and Complaints 或显示预览", "是", "申请引用；投诉类型", "否", "CI-10", "写操作预览"],
  ["TC-141", "Complaints", "动态数据", "P0", "已登录 Customer；当前 Profile", "Enquiry", "—", "存在已提交 enquiry", "I want to follow up on an enquiry I submitted earlier.", "跟进我之前提交的咨询。", "D-ENQUIRIES", "先查询当前账户 enquiries；可能时展示匹配或最近记录，仅为消歧才索要编号；不得声称已发送跟进。", "匹配/最近 enquiry；必要时编号", "不得在未成功写入前声称已跟进", "索要编号或说明可用跟进行动", "是", "enquiry 编号；状态；更新时间", "否", "CI-11", "先查询后追问"],
  ["TC-142", "Complaints", "动态数据", "P0", "已登录 Customer；当前 Profile", "Enquiry", "—", "存在已解决 enquiry", "Can I reopen my resolved enquiry?", "已解决的咨询可以重新打开吗？", "D-ENQUIRIES", "先查询当前账户 enquiries；不得预设是否可重开；不可重开时说明已验证的相关消息或关联 enquiry 替代路径。", "验证后的重开可用性或替代方案", "不得未经查询直接断言可或不可重开", "说明可用动作", "是", "enquiry 状态；重开可用性", "条件触发", "CI-12", "实时动作可用性"],
  ["TC-143", "Complaints", "流程知识", "P0", "已登录 Customer；当前 Profile", "Technical Enquiry", "—", "付款无法完成", "I cannot complete payment. How can I raise a technical enquiry?", "付款失败，如何创建技术咨询？", "K-TECHNICAL-ENQUIRY；D-PAYMENT", "路由至技术咨询，不路由付款历史或收据；获取可用咨询类型，索要可提供的交易/错误证据和截图；不重试付款或自动提交咨询。", "技术咨询类型；错误/交易证据；截图提示", "不得重试支付或自动提交咨询", "补充证据或引导技术咨询", "是", "咨询类型；交易/错误信息", "条件触发", "CI-13", "正确路由"],
  ["TC-144", "Licenses & Permits", "动态数据", "P0", "已登录 Customer；当前 Profile", "Issued License", "<当前 Profile 已签发许可编号>", "当前 Profile 中存在唯一匹配许可", "I want to renew licence number <issued-document-number-in-current-profile>.", "续期这个许可证号。", "D-PERMIT-UNIQUE", "先查询已签发 License/Permit；唯一匹配时仅报告返回的类型、编号、状态、日期与可用动作；无需再索要文件类型。", "许可类型；编号；状态；日期；可用动作", "不得在已提供唯一编号后再索要文件类型", "说明续期动作", "是", "许可编号；类型；状态；日期；动作", "否", "CI-14", "唯一记录选择"],
  ["TC-145", "Licenses & Permits", "异常处理", "P0", "已登录 Customer；当前 Profile", "Issued License", "<不存在的许可编号>", "当前 Profile 无匹配许可", "I want to renew licence number <nonexistent-document-number>.", "续期不存在的许可证号。", "D-PERMIT-NOT-FOUND", "简洁说明当前选定 Profile 中不存在该编号的已签发记录，并提供 [Licenses & Permits](/permits-license)。", "当前 Profile；未找到；Licenses & Permits 链接", "不得引用无关申请、续期请求、数量或通用政策", "引导 Licenses & Permits", "是", "许可编号；当前 Profile", "否", "CI-15", "未匹配记录"],
  ["TC-146", "Profile", "权限边界", "P0", "Global View", "Issued License", "<已签发许可编号>", "Portal 处于 Global View", "In Global View: I want to renew licence number <issued-document-number>.", "全局视图下续期许可证。", "D-PROFILE-SCOPE", "先要求客户选择具体 Profile；不再要求文件类型；在选择前不得暴露或推断 Profile 绑定许可数据。", "选择具体 Profile 提示", "不得查询、暴露或推断 Profile 绑定数据", "引导选择具体 Profile", "否", "当前视图；Profile 选择状态", "否", "CI-16", "ProfileScopeGuard"],
  ["TC-147", "Licenses & Permits", "流程知识", "P0", "已登录 Customer；当前 Profile", "License Renewal", "—", "未选择具体许可记录", "What documents do I need to renew a Commercial Media Licence?", "续期 Commercial Media Licence 需要什么文件？", "K-RENEWAL", "使用知识证据给出通用续期要求；不得声称客户拥有匹配许可、续期申请或可用动作，除非有实时许可证据。", "通用续期文件要求；证据范围", "不得将通用知识当作客户实时记录", "必要时引导 Licenses & Permits", "否", "—", "否", "CI-17", "通用知识与实时记录分离"],
  ["TC-148", "Services", "流程知识", "P0", "已登录 Customer；当前 Profile", "New Application Service", "Text Permit", "无验证服务指引", "How do I apply for a Text Permit?", "如何申请 Text Permit？", "K-LICENSE-APPLICATION", "使用知识搜索；无经验证指引时说明无法确认，询问目标媒体活动并提供 [Services](/services)；不得暴露工具、参数、协议或部分输出。", "无验证指引说明；媒体活动追问；Services 链接", "不得猜测要求；不得暴露工具或协议文本", "询问媒体活动并引导 Services", "否", "—", "否", "CI-18", "未知服务安全处理"],
  ["TC-149", "My Requests", "动态数据", "P0", "已登录 Customer；当前 Profile", "Application", "—", "存在 My Requests 数据", "How many requests do I have? / 我有多少个申请？ / كم طلبًا لدي؟", "申请数量是多少？", "D-MY-REQUESTS", "使用当前 Profile 的实时 My Requests 数据，必要时提供状态分布；支持中英阿提问；不在测试中断言固定数量。", "当前 Profile；实时数量；可选状态分布", "不得路由到通用知识、许可证数量或固定计数", "引导 My Requests", "是", "申请记录；状态分布", "否", "CI-19", "多语言；实时计数"]
];

const workbook = Workbook.create();
const sheet = workbook.worksheets.add("演示用测试用例");
sheet.showGridLines = false;

sheet.mergeCells("A1:AE1");
sheet.getRange("A1").values = [["UMC AI Chatbot 结构化检索回归测试用例"]];
sheet.mergeCells("A2:AE2");
sheet.getRange("A2").values = [["来源：chatbot-structured-retrieval-regression.md。请在已认证客户会话的新对话中执行；不得断言客户账户相关的固定记录、数量、日期或金额。"]];

sheet.getRange("A4:AE4").values = [headers];
const data = cases.map((testCase) => [...testCase.slice(0, 18), `${source} / ${testCase[18]}`, testCase[19], ...Array(11).fill("")]);
sheet.getRange("A5:AE23").values = data;

sheet.getRange("A1:AE1").format = {
  fill: "#102A43",
  font: { bold: true, color: "#FFFFFF", size: 18 },
  horizontalAlignment: "left",
  verticalAlignment: "center"
};
sheet.getRange("A2:AE2").format = {
  fill: "#E6F4F1",
  font: { color: "#355C57", italic: true, size: 10 },
  horizontalAlignment: "left",
  verticalAlignment: "center",
  wrapText: true
};
sheet.getRange("A4:AE4").format = {
  fill: "#1F6F78",
  font: { bold: true, color: "#FFFFFF", size: 10 },
  horizontalAlignment: "center",
  verticalAlignment: "center",
  wrapText: true,
  borders: { preset: "all", style: "thin", color: "#D7E3E3" }
};
sheet.getRange("A5:AE23").format = {
  font: { size: 10, color: "#1F2937" },
  horizontalAlignment: "left",
  verticalAlignment: "top",
  wrapText: true,
  borders: { preset: "all", style: "thin", color: "#DFE7E7" }
};

sheet.getRange("A5:AE23").conditionalFormats.addCustom("=MOD(ROW(),2)=1", { fill: "#F3FAFA" });
sheet.getRange("D5:D23").conditionalFormats.add("containsText", { text: "P0", format: { fill: "#FDE68A", font: { bold: true, color: "#92400E" } } });
sheet.getRange("P5:P23").conditionalFormats.add("containsText", { text: "是", format: { fill: "#DDEFE5", font: { color: "#166534" } } });

sheet.getRange("A1:AE1").format.rowHeight = 32;
sheet.getRange("A2:AE2").format.rowHeight = 30;
sheet.getRange("A4:AE4").format.rowHeight = 38;
sheet.getRange("A5:AE23").format.rowHeight = 72;

const widths = {
  A: 13, B: 16, C: 18, D: 10, E: 25, F: 20, G: 24, H: 28, I: 42, J: 30,
  K: 24, L: 50, M: 34, N: 34, O: 32, P: 14, Q: 28, R: 14, S: 16, T: 24,
  U: 36, V: 14, W: 14, X: 14, Y: 16, Z: 14, AA: 14, AB: 14, AC: 14, AD: 16, AE: 24
};
for (const [column, width] of Object.entries(widths)) {
  sheet.getRange(`${column}:${column}`).format.columnWidth = width;
}

sheet.freezePanes.freezeRows(4);
sheet.freezePanes.freezeColumns(2);
sheet.getRange("D5:D23").dataValidation = { rule: { type: "list", values: ["P0", "P1", "P2"] } };
sheet.getRange("P5:P23").dataValidation = { rule: { type: "list", values: ["是", "否"] } };
sheet.getRange("R5:R23").dataValidation = { rule: { type: "list", values: ["否", "是", "条件触发"] } };

await fs.mkdir(outputDir, { recursive: true });
const output = await SpreadsheetFile.exportXlsx(workbook);
await output.save(outputPath);

const inspection = await workbook.inspect({
  kind: "table",
  range: "演示用测试用例!A4:AE8",
  include: "values,formulas",
  tableMaxRows: 5,
  tableMaxCols: 31,
});
console.log(inspection.ndjson);

const formulaErrors = await workbook.inspect({
  kind: "match",
  searchTerm: "#REF!|#DIV/0!|#VALUE!|#NAME\\?|#N/A",
  options: { useRegex: true, maxResults: 50 },
  summary: "formula error scan"
});
console.log(formulaErrors.ndjson);

const preview = await workbook.render({ sheetName: "演示用测试用例", range: "A1:AE10", scale: 1 });
await fs.writeFile(`${outputDir}/preview.png`, new Uint8Array(await preview.arrayBuffer()));
console.log(JSON.stringify({ outputPath, previewPath: `${outputDir}/preview.png` }));
