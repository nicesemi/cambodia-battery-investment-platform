# 柬埔寨换电虚拟资产投资平台

## 项目概述

柬埔寨电池银行投资平台是一个面向中国投资者的虚拟资产交易平台，投资者通过购买电池虚拟资产，享受柬埔寨换电市场的收益分红。

## 核心功能

### 用户端功能
- 用户注册/登录（JWT认证）
- 虚拟资产购买与交易
- 收益查看与分红记录
- 个人资产管理
- 中英文双语切换

### 管理端功能
- 数据可视化看板
- 用户管理
- 资产管理
- 交易审核
- 分红管理
- 系统配置

### 核心算法
- **70%利润自动分红算法**：每月自动计算平台利润，70%按持有资产比例分配给投资者
- **虚拟资产交易撮合引擎**：买卖单自动匹配撮合
- **柬埔寨换电市场收益测算模型**：基于换电站数据的收益预测

## 技术栈

- **前端**: Next.js 14 + React + TypeScript + Tailwind CSS
- **后端**: Node.js + Express + PostgreSQL
- **认证**: JWT + bcrypt
- **图表**: Recharts
- **国际化**: i18next

## 快速开始

### 环境要求
- Node.js 18+
- PostgreSQL 14+
- npm 或 yarn

### 安装部署

详细部署说明请查看 [docs/DEPLOY.md](./docs/DEPLOY.md)

## 项目结构

```
cambodia-battery-investment/
├── frontend/          # Next.js前端
├── backend/           # Node.js后端API
├── database/          # 数据库脚本
└── docs/              # 文档
```

## 联系方式

技术支持：support@battery-invest.com
