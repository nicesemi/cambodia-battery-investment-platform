# 部署说明文档

## 系统要求

- Node.js 18.x 或更高版本
- PostgreSQL 14.x 或更高版本
- npm 9.x 或 yarn 1.x
- 至少 2GB RAM，推荐 4GB+

## 一、数据库部署

### 1. 安装 PostgreSQL

```bash
# Ubuntu/Debian
sudo apt update
sudo apt install postgresql postgresql-contrib

# 启动服务
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

### 2. 创建数据库和用户

```bash
# 切换到postgres用户
sudo -u postgres psql

# 在psql中执行
CREATE DATABASE battery_investment;
CREATE USER battery_user WITH PASSWORD 'your_secure_password';
GRANT ALL PRIVILEGES ON DATABASE battery_investment TO battery_user;
ALTER USER battery_user CREATEDB;
\q
```

### 3. 导入数据库Schema

```bash
cd /path/to/project
psql -U battery_user -d battery_investment -f database/schema.sql
```

## 二、后端部署

### 1. 安装依赖

```bash
cd backend
npm install
```

### 2. 配置环境变量

```bash
cp .env.example .env
nano .env
```

编辑 `.env` 文件：

```env
# 服务器配置
PORT=3001
NODE_ENV=production

# 数据库配置
DB_HOST=localhost
DB_PORT=5432
DB_NAME=battery_investment
DB_USER=battery_user
DB_PASSWORD=your_secure_password

# JWT配置（生产环境务必修改为强密钥）
JWT_SECRET=your_super_secret_jwt_key_here_change_in_production
JWT_EXPIRES_IN=7d

# 分红配置
PROFIT_SHARE_RATIO=0.70

# 柬埔寨市场配置
EXCHANGE_RATE_USD_KHR=4100
BATTERY_UNIT_PRICE=1000
```

### 3. 启动后端服务

```bash
# 开发模式
npm run dev

# 生产模式（使用PM2）
npm install -g pm2
pm2 start src/server.js --name battery-backend
pm2 save
pm2 startup
```

## 三、前端部署

### 1. 安装依赖

```bash
cd frontend
npm install
```

### 2. 构建生产版本

```bash
npm run build
```

### 3. 启动前端服务

```bash
# 开发模式
npm run dev

# 生产模式
npm start

# 或使用PM2
pm2 start "npm start" --name battery-frontend
```

## 四、Nginx 反向代理配置（推荐）

### 安装 Nginx

```bash
sudo apt install nginx
```

### 配置文件 `/etc/nginx/sites-available/battery-investment`

```nginx
server {
    listen 80;
    server_name your-domain.com;

    # 前端
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # API后端
    location /api {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    client_max_body_size 10M;
}
```

### 启用配置

```bash
sudo ln -s /etc/nginx/sites-available/battery-investment /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

## 五、SSL 证书配置（Let's Encrypt）

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

## 六、默认测试账号

| 邮箱 | 密码 | 角色 |
|------|------|------|
| admin@battery-invest.com | admin123 | 超级管理员 |

## 七、项目结构

```
cambodia-battery-investment/
├── frontend/                 # Next.js 前端
│   ├── src/
│   │   ├── app/             # 页面路由
│   │   ├── components/      # 组件
│   │   ├── contexts/        # React Context
│   │   ├── services/        # API服务
│   │   └── styles/          # 样式
│   ├── package.json
│   └── next.config.js
├── backend/                  # Node.js 后端
│   ├── src/
│   │   ├── config/          # 配置
│   │   ├── controllers/     # 控制器
│   │   ├── middlewares/     # 中间件
│   │   ├── routes/          # 路由
│   │   └── server.js        # 入口
│   └── package.json
├── database/                 # 数据库脚本
│   └── schema.sql
├── docs/                     # 文档
└── README.md
```

## 八、核心功能说明

### 1. 用户端功能
- ✅ 用户注册/登录（JWT认证）
- ✅ 电池资产购买
- ✅ 虚拟资产交易（买卖撮合）
- ✅ 分红记录查看
- ✅ 个人资产管理
- ✅ 响应式设计（PC/移动端）

### 2. 管理端功能
- ✅ 数据可视化看板
- ✅ 用户管理
- ✅ 交易记录查询
- ✅ 系统配置管理
- ✅ 手动分红计算

### 3. 核心算法
- ✅ **70%利润自动分红算法**：每月1日自动计算
- ✅ **交易撮合引擎**：价格优先、时间优先
- ✅ **柬埔寨市场收益测算模型**：基于实际运营数据

## 九、API 接口列表

### 认证
- POST `/api/auth/register` - 用户注册
- POST `/api/auth/login` - 用户登录
- GET `/api/auth/profile` - 获取个人信息

### 资产
- GET `/api/assets` - 获取资产列表
- GET `/api/assets/my` - 获取我的资产
- POST `/api/assets/purchase` - 购买资产

### 交易
- POST `/api/trades/orders` - 创建订单
- GET `/api/trades/orders` - 获取我的订单
- GET `/api/trades/orderbook/:assetId` - 获取订单簿
- DELETE `/api/trades/orders/:orderId` - 取消订单

### 分红
- GET `/api/dividends/my` - 获取我的分红
- GET `/api/dividends/forecast` - 获取收益预测
- POST `/api/dividends/calculate` - 计算分红（管理员）

### 管理员
- GET `/api/admin/dashboard` - 看板数据
- GET `/api/admin/users` - 用户列表
- PUT `/api/admin/users/:userId` - 更新用户
- GET `/api/admin/trades` - 交易记录
- GET `/api/admin/configs` - 系统配置
- PUT `/api/admin/configs/:configKey` - 更新配置

## 十、监控与维护

### 查看日志

```bash
# PM2日志
pm2 logs battery-backend
pm2 logs battery-frontend

# PostgreSQL日志
sudo tail -f /var/log/postgresql/postgresql-*.log
```

### 数据库备份

```bash
# 备份
pg_dump -U battery_user battery_investment > backup_$(date +%Y%m%d).sql

# 恢复
psql -U battery_user battery_investment < backup_file.sql
```

## 十一、安全建议

1. **修改默认密码**：所有默认密码必须修改
2. **JWT密钥**：使用强随机密钥
3. **防火墙**：只开放必要端口
4. **HTTPS**：强制使用HTTPS
5. **定期备份**：每日自动备份数据库
6. **更新依赖**：定期更新npm包修复安全漏洞

## 十二、故障排查

### 后端无法启动
- 检查PostgreSQL是否运行
- 检查数据库连接配置
- 检查端口是否被占用

### 前端无法访问API
- 检查CORS配置
- 检查后端服务状态
- 检查Nginx代理配置

### 分红计算失败
- 检查数据库中是否有用户资产数据
- 检查period格式是否正确（YYYY-MM）
