# Farmstay System Web V2 前端功能文档

## 1. 角色定义
- `未登录用户`：可浏览首页、搜索、查看农家乐详情、进入登录注册页。
- `游客`：可浏览、预订、支付、评价、查看自己的订单。
- `经营者`：继承游客能力，并可管理自己名下农家乐资料、查看订单、使用经营建议功能。

## 2. 页面信息架构
- `/`
  - 首页
  - 搜索、推荐、分页浏览、AI 悬浮助手
- `/login`
  - 登录与注册
- `/farmstays/:id`
  - 农家乐详情与下单
- `/personal`
  - 个人中心 / 工作台

## 3. 首页要求
- 支持按城市、关键字、价格等级、标签搜索。
- 支持分页展示农家乐结果。
- 保留推荐农家乐与平台概览信息。
- 右下角提供可拖拽悬浮 AI 助手。

## 4. AI 助手要求
- 不放在个人中心主工作区，统一放在首页。
- 交互形式：
1. 默认收起为小助手按钮。
2. 点击后展开为对话面板。
3. 支持拖拽移动位置。
4. 支持连续对话、引用展示、反馈按钮。
- 适用场景：
1. 游客咨询房型、规则、活动、退款等问题。
2. 经营者咨询运营问题和平台使用问题。

## 5. 个人中心要求
## 5.1 游客
- 展示身份信息。
- 展示订单列表和评价入口。

## 5.2 经营者
- 展示订单工作区。
- 展示店铺资料管理工作台。
- 展示经营建议报告。

## 6. 店铺资料管理要求
- 采用“左侧店铺列表 + 右侧资料编辑区”的双栏布局。
- 左侧用于切换当前店铺、查看店铺状态摘要、创建新店铺。
- 右侧用于编辑名称、城市、地址、联系方式、价格区间、标签、介绍等信息。
- 页面要体现经营工作台感，不再使用简单堆表单的方式。

## 7. 当前实现状态
- 已完成：
1. 首页分页。
2. 首页悬浮 AI 助手。
3. 个人中心移除 AI Tab。
4. 经营者店铺资料管理页重做。
5. 前端文档中文化。
- 待继续：
1. 店铺管理继续扩展房型/餐饮/活动能力。
2. AI 助手升级为流式输出和更强上下文能力。
3. 正式支付链路接入后的支付页面重做。

## 8. 技术实现要求
- 统一通过 `src/services/api.ts` 访问后端接口。
- AI 和经营建议的数据结构统一放在 `src/types`。
- 复杂交互优先抽离为组件：
1. 首页 AI 悬浮助手组件。
2. 经营者建议组件。
3. 店铺工作台组件。
## 9. 2026-03-11 Frontend Contract Alignment
- Authentication pages must trust backend auth responses for `username`, `displayName`, and `status`. Frontend should not overwrite stored user info with raw form input after login or register succeeds.
- Personal center should call `GET /api/auth/me` after entering the page to refresh the current auth payload and repair stale local cache.
- Operator order pages should render `visitorName`, `visitorUsername`, `contactName`, `contactPhone`, and `guests` directly from the booking API response instead of issuing per-order user lookups.
- `src/types/booking.ts` is the single source of truth for booking detail fields used by the frontend.
