# Aegis Console i18n — 中英双语设计文档

**日期**: 2026-06-04
**范围**: `aegis-console` 前端
**目标**: 中英双语（ZH 默认），`next-intl` + URL prefix 方案

---

## 1. 路由结构

### 迁移前

```
src/app/
  (auth)/login/page.tsx
  orgs/[org_slug]/...
  page.tsx
  not-found.tsx
  error.tsx
  layout.tsx
```

### 迁移后

```
src/app/
  [locale]/
    (auth)/login/page.tsx
    orgs/[org_slug]/...
    page.tsx
    not-found.tsx
    error.tsx
    layout.tsx               ← 含 <html lang={locale}>
  not-found.tsx              ← 全局 fallback（locale 未知时）
  layout.tsx                 ← 最小 shell（字体/全局 CSS only）
```

### URL 规则

| 访问路径 | 结果 |
|---|---|
| `/` | 301 → `/zh/` |
| `/orgs/default` | 301 → `/zh/orgs/default` |
| `/zh/orgs/default` | 直通（中文） |
| `/en/orgs/default` | 直通（英文） |

---

## 2. 翻译文件

### 位置

```
src/messages/
  zh.json    ← 中文，完整（默认语言）
  en.json    ← 英文，完整
```

### 命名空间结构

```json
{
  "nav": {
    "dashboard": "仪表盘",
    "apps": "应用",
    "appInstall": "安装应用",
    "store": "应用市场",
    "projects": "项目",
    "containers": "容器",
    "events": "事件",
    "runbooks": "运维手册",
    "domains": "域名",
    "alertIngest": "告警接入",
    "signOut": "退出登录"
  },
  "common": {
    "create": "创建",
    "delete": "删除",
    "cancel": "取消",
    "save": "保存",
    "loading": "加载中…",
    "enabled": "启用",
    "disabled": "禁用",
    "running": "运行中",
    "failed": "失败",
    "pending": "等待中",
    "approved": "已通过",
    "rejected": "已拒绝",
    "yes": "是",
    "no": "否"
  },
  "login": {
    "title": "登录 Aegis",
    "subtitle": "自托管 PaaS 管理平台",
    "email": "邮箱",
    "password": "密码",
    "submit": "登录",
    "loading": "登录中…"
  },
  "notFound": {
    "title": "页面不存在",
    "message": "您访问的页面不存在或已被移除。"
  },
  "error": {
    "title": "出错了",
    "reset": "重试"
  },
  "dashboard": {
    "title": "仪表盘",
    "totalApps": "应用总数",
    "running": "运行中",
    "failed": "异常",
    "events1h": "事件（1小时）",
    "applications": "应用列表",
    "eventStream": "事件流",
    "allSystemsOk": "所有系统正常"
  },
  "apps": {
    "title": "应用",
    "install": "安装应用",
    "name": "名称",
    "status": "状态",
    "created": "创建时间"
  },
  "webhooks": {
    "title": "Webhook 订阅",
    "create": "创建 Webhook",
    "url": "目标 URL",
    "eventTypes": "事件类型",
    "retryCount": "重试次数",
    "secret": "密钥（可选）",
    "enabled": "启用",
    "loading": "加载 Webhook…",
    "failed": "加载失败",
    "empty": "暂无 Webhook 订阅",
    "deliveries": "投递记录",
    "time": "时间",
    "status": "状态",
    "retries": "重试次数"
  },
  "alertRules": {
    "title": "告警规则",
    "create": "创建规则",
    "name": "规则名称",
    "severity": "级别",
    "service": "服务",
    "metric": "指标",
    "operator": "运算符",
    "warnThreshold": "警告阈值",
    "critThreshold": "严重阈值",
    "loading": "加载告警规则…",
    "failed": "加载失败",
    "empty": "暂无告警规则",
    "notFound": "规则不存在"
  },
  "events": {
    "title": "事件",
    "time": "时间",
    "type": "类型",
    "severity": "级别",
    "source": "来源",
    "traceId": "Trace ID",
    "empty": "暂无事件",
    "causalChain": "因果链"
  },
  "projects": {
    "title": "项目",
    "create": "创建项目",
    "name": "名称",
    "status": "状态"
  },
  "domains": {
    "title": "域名",
    "add": "添加域名",
    "domain": "域名",
    "targetUrl": "目标 URL",
    "tls": "TLS",
    "remove": "移除域名",
    "removeConfirm": "移除该域名路由？此操作不可撤销。",
    "created": "创建时间"
  },
  "runbooks": {
    "title": "运维手册",
    "execute": "执行",
    "dryRun": "预演",
    "executeLive": "正式执行",
    "name": "名称",
    "status": "状态"
  },
  "containers": {
    "title": "容器",
    "start": "启动",
    "stop": "停止",
    "restart": "重启",
    "logs": "日志",
    "status": "状态"
  }
}
```

`en.json` 结构相同，值为对应英文原文。

### 使用方式

```tsx
// 服务端 / 客户端组件均可
const t = useTranslations('webhooks');
<h1>{t('title')}</h1>
<button>{t('create')}</button>
```

---

## 3. Middleware 合并

`src/proxy.ts` 重命名为 `src/middleware.ts`（修正之前的命名 bug），合并 next-intl locale redirect + auth cookie guard：

```ts
import createMiddleware from 'next-intl/middleware';
import { type NextRequest, NextResponse } from 'next/server';

const intlMiddleware = createMiddleware({
  locales: ['zh', 'en'],
  defaultLocale: 'zh',
  localePrefix: 'always',
});

const PUBLIC_PATH_SEGMENTS = ['/login', '/api/', '/_next/', '/favicon'];

function isPublic(pathname: string): boolean {
  return PUBLIC_PATH_SEGMENTS.some((s) => pathname.includes(s));
}

export function middleware(req: NextRequest): NextResponse {
  // Step 1: next-intl locale redirect（无 locale → /zh/..., 有效 locale → 透传）
  const intlRes = intlMiddleware(req);
  if (intlRes) return intlRes;

  // Step 2: auth guard（原 proxy.ts 逻辑，cookie 名修正为 refresh_token）
  const { pathname } = req.nextUrl;
  if (!isPublic(pathname) && !req.cookies.has('refresh_token')) {
    const url = req.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('next', pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
```

---

## 4. 语言切换器

新建 `src/components/LocaleSwitcher.tsx`：

```tsx
'use client';
import { useLocale } from 'next-intl';
import { useRouter, usePathname } from 'next-intl/navigation';

export function LocaleSwitcher() {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();

  const toggle = () => {
    const next = locale === 'zh' ? 'en' : 'zh';
    router.replace(pathname, { locale: next });
  };

  return (
    <button onClick={toggle} className="text-sm opacity-70 hover:opacity-100 px-2">
      {locale === 'zh' ? 'EN' : '中文'}
    </button>
  );
}
```

在 `AppFrame.tsx` header 里 Sign out 按钮左侧插入 `<LocaleSwitcher />`：

```
[中文 | EN]  [退出登录]
```

---

## 5. @helios/oui 组件处理

这些组件接受文本 props，直接传翻译值：

| 组件 | 传入 props |
|---|---|
| `OLoginPage` | `title={t('login.title')}` |
| `ONotFoundPage` | `title={t('notFound.title')} message={t('notFound.message')}` |
| `OErrorBoundaryPage` | `title={t('error.title')}` |

---

## 6. 实施范围与边界

**在范围内**：
- 所有 `src/app/` 页面的硬编码英文字符串
- `src/components/AppFrame.tsx`（导航标签 + 语言切换器）
- `proxy.ts` → `middleware.ts` 合并（顺带修正命名 bug）
- `@helios/oui` 组件的可配置文本 props

**不在范围内**：
- `@helios/blocks` / `@helios/oui` 库本身的内部字符串（需 Helios 团队配合）
- `OJsonViewer`、`OLogsViewer`、`OSparkline`（纯数据展示，无 UI 文本）
- Backend API 返回的动态数据（error detail、event_type 名等）
- 数字 / 日期格式本地化（可 M3+ 加）

---

## 7. 依赖

```bash
pnpm add next-intl
```

`next-intl` 兼容 Next.js 16 App Router + React 19，无破坏性依赖冲突。
