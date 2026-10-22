# 管理后台与数据埋点说明（0.8β）

## 本版目标

0.8β 用于验证管理后台需要展示的指标，以及用户端埋点是否完整、准确。用户端事件保存在浏览器本地，不上传姓名、电话、身份证号、地址、案情描述或任何问卷答案。

管理后台入口：`admin.html`

## 核心指标

- 匿名访客数
- 打开页面后开始填写率
- 问卷完成率
- 预览到完整诉状的转化率
- 案件类型分布
- 各步骤浏览、完成、校验失败和完成率
- 查看历史诉状、重新填写、跳过测试付费等关键行为

## 事件清单

| 事件 | 触发时机 | 属性 |
| --- | --- | --- |
| `app_open` | 页面资源加载完成 | `screen` |
| `case_start` | 用户选择案件场景 | `caseType` |
| `step_view` | 问卷步骤首次展示 | `caseType`, `stepId`, `stepIndex`, `stepCount` |
| `step_complete` | 当前步骤校验通过并继续 | 同上 |
| `validation_failed` | 必填或被告信息校验未通过 | `stepId`, `questionId` |
| `preview_generated` | 问卷完成并生成预览 | `caseType`, `stepCount` |
| `paywall_view` | 进入获取完整诉状页 | `caseType` |
| `payment_test_skipped` | 测试版跳过付费 | `caseType` |
| `result_view` | 展示完整诉状 | `caseType`, `source` |
| `history_view` | 打开历史诉状 | `caseType`, `unlocked` |
| `restart` | 重新填写 | `caseType` |

## 隐私边界

埋点只记录流程状态和枚举值。`analytics.js` 会丢弃属性名中含有 `name`、`phone`、`address`、`idNumber`、`identity`、`detail`、`answer`、`text` 的字段，防止开发时误传个人信息。

## 测试数据合并

测试人员在自己的设备打开 `admin.html`，点击“导出 JSON”，把文件交给产品负责人。产品负责人在后台点击“合并测试数据”导入多个文件，即可汇总查看。

## 正式运营版待接入

GitHub Pages 没有服务端，无法自动汇总不同用户的数据，也不能安全实现管理员登录、订单查询或用户管理。正式版需要接入中国境内可用的后端服务和数据库，并完成：

1. 管理员账号、角色和登录鉴权；
2. 事件批量上报接口、失败重试及去重；
3. 用户、草稿、文书、订单、支付记录的数据表；
4. 问卷、模板、价格和免责声明的版本管理；
5. 敏感信息加密、访问审计、数据留存和删除机制；
6. 后台按时间、案件类型、渠道和版本筛选及导出。
