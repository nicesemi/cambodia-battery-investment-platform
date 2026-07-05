#!/usr/bin/env python3
"""
Single-pass i18n replacement + mapping tracking + locale generation.
"""
import re
import json
import os

BASE = "/Users/daxixi/Library/Application Support/com.tencent.mac.marvis/MarvisData/User/oAN1i2VmsGbdO4eyNVh90OQ9zP5E/workspace/conv_19ed68a9a2d_8b165236c049/output/battery_swap_platform/cambodia-battery-investment/frontend"

# Global: key -> zh-CN value
all_keys = {}
key_counters = {}

def next_key(prefix):
    key_counters[prefix] = key_counters.get(prefix, 0) + 1
    return f"{prefix}.s{key_counters[prefix]:04d}"

def process_file(filepath, prefix, manual_map=None):
    """Process a file, replacing Chinese in JSX with t('key'). Returns file content."""
    full_path = os.path.join(BASE, filepath)
    with open(full_path, 'r') as f:
        content = f.read()
    
    replacements_made = 0
    
    if manual_map:
        # For small files, use exact manual mapping
        for cn_text, key in manual_map.items():
            all_keys[key] = cn_text
        # Then apply: replace cn_text with {t('key')} in JSX contexts
        # We'll handle this specially per file
        return content, manual_map
    
    # For large files, process line by line
    lines = content.split('\n')
    modified_lines = []
    local_map = {}
    
    def make_replacement(cn_text, prefix):
        nonlocal replacements_made
        key = next_key(prefix)
        all_keys[key] = cn_text
        local_map[cn_text] = key
        replacements_made += 1
        return key
    
    for line in lines:
        stripped = line.strip()
        
        # Skip module-level constants, comments, imports
        if (not line.startswith(' ') and not line.startswith('\t') and
            (stripped.startswith('const ') or stripped.startswith('let ') or 
             stripped.startswith('var ') or stripped.startswith('//') or
             stripped.startswith('/*') or stripped.startswith('*') or
             stripped.startswith('import ') or stripped.startswith('export '))):
            modified_lines.append(line)
            continue
        
        # Check for JSX content
        has_jsx = bool(re.search(r'<[A-Za-z]|<[a-z]+\s|<[a-z]+>|</|/>', line))
        
        if has_jsx:
            # 1. Replace JSX text nodes: >CHINESE_TEXT<
            def replace_text(m):
                gt = m.group(1)
                cn = m.group(2)
                lt = m.group(3)
                key = make_replacement(cn, prefix)
                return f"{gt}{{t('{key}')}}{lt}"
            
            line = re.sub(
                r'(>)([^<{]*[\u4e00-\u9fff][^<{]*)(<)',
                replace_text,
                line
            )
            
            # 2. Replace attribute values: ="CHINESE"
            def replace_attr(m):
                attr = m.group(1)
                cn = m.group(2)
                key = make_replacement(cn, prefix)
                return f'{attr}={{t(\'{key}\')}}'
            
            line = re.sub(
                r'(\b\w+)=["\']([^"\']*[\u4e00-\u9fff][^"\']*)["\']',
                replace_attr,
                line
            )
            
            # 3. Replace object literal properties: prop: 'CHINESE'
            def replace_prop(m):
                prop = m.group(1)
                cn = m.group(2)
                if re.match(r'^[\u4e00-\u9fff\u3000-\u303f\uff00-\uffef\s，。！？、：；（）""''《》\-\+]+$', cn):
                    key = make_replacement(cn, prefix)
                    return f'{prop}: {{t(\'{key}\')}}'
                return m.group(0)
            
            line = re.sub(
                r"(\b\w+):\s*['\"]([^'\"]*[\u4e00-\u9fff][^'\"]*)['\"]",
                replace_prop,
                line
            )
        
        modified_lines.append(line)
    
    if replacements_made > 0:
        final = '\n'.join(modified_lines)
        
        # Add import
        if "import { useTranslation } from 'react-i18next'" not in final:
            # Find position after last import
            lines2 = final.split('\n')
            last_import = -1
            for i, l in enumerate(lines2):
                if l.strip().startswith('import '):
                    last_import = i
            if last_import >= 0:
                lines2.insert(last_import + 1, "import { useTranslation } from 'react-i18next';")
            elif "'use client'" in final:
                idx = final.index("'use client'")
                nl = final.index('\n', idx)
                lines2 = [final[:nl+1], "import { useTranslation } from 'react-i18next';", final[nl+1:]]
                final = ''.join(lines2)
                lines2 = final.split('\n')
            
            final = '\n'.join(lines2)
        
        # Add const { t } = useTranslation()
        func_match = re.search(r'(export\s+default\s+function\s+\w+[^(]*\([^)]*\)\s*\{)', final)
        if func_match and 'const { t } = useTranslation()' not in final:
            insert_pos = func_match.end()
            final = final[:insert_pos] + '\n  const { t } = useTranslation();' + final[insert_pos:]
        
        with open(full_path, 'w') as f:
            f.write(final)
        
        print(f"  {filepath}: {replacements_made} replacements, {len(local_map)} keys")
    else:
        print(f"  {filepath}: no replacements needed")
    
    return final, local_map

# ============================================================
# Process small files manually with explicit mappings
# ============================================================

# --- layout.js ---
layout_map = {
    '客服': 'common.customerService',
    '加盟': 'common.franchise',
}
layout_path = os.path.join(BASE, "src/app/layout.js")
with open(layout_path, 'r') as f:
    content = f.read()
content = content.replace(
    '<span>客服：',
    '<span>{t(\'common.customerService\')}：'
).replace(
    '<span>加盟：',
    '<span>{t(\'common.franchise\')}：'
)
if "import '@/i18n'" not in content:
    content = content.replace("'use client';\n\nimport", "'use client';\n\nimport '@/i18n';\nimport")
with open(layout_path, 'w') as f:
    f.write(content)
for k, v in layout_map.items():
    all_keys[v] = k
print("  layout.js: processed")

# --- Navbar.js ---
nav_map = {
    '退出': 'nav.logout',
    '登录': 'nav.login',
    '注册': 'nav.register',
    '个人中心': 'nav.profile',
    '退出登录': 'nav.logoutFull',
}
nav_path = os.path.join(BASE, "src/components/Navbar.js")
with open(nav_path, 'r') as f:
    content = f.read()

# Add import and t hook
if 'react-i18next' not in content:
    content = content.replace(
        "import { useState } from 'react';",
        "import { useState } from 'react';\nimport { useTranslation } from 'react-i18next';"
    )
    content = content.replace(
        "export default function Navbar() {",
        "export default function Navbar() {\n  const { t } = useTranslation();"
    )

# Replace desktop nav
content = content.replace(
    '<Link href="/login" className="text-sm text-gray-600 hover:text-gray-900">\n                  登录\n                </Link>',
    '<Link href="/login" className="text-sm text-gray-600 hover:text-gray-900">\n                  {t(\'nav.login\')}\n                </Link>'
)
content = content.replace(
    '<Link href="/register" className="btn-primary text-sm">\n                  注册\n                </Link>',
    '<Link href="/register" className="btn-primary text-sm">\n                  {t(\'nav.register\')}\n                </Link>'
)
content = content.replace(
    '<span className="text-sm">退出</span>',
    '<span className="text-sm">{t(\'nav.logout\')}</span>'
)
# Mobile menu
content = content.replace(
    '<Link href="/login" className="text-sm text-gray-600" onClick={() => setMobileMenuOpen(false)}>\n                    登录\n                  </Link>',
    '<Link href="/login" className="text-sm text-gray-600" onClick={() => setMobileMenuOpen(false)}>\n                    {t(\'nav.login\')}\n                  </Link>'
)
content = content.replace(
    '<Link href="/register" className="text-sm text-gray-600" onClick={() => setMobileMenuOpen(false)}>\n                    注册\n                  </Link>',
    '<Link href="/register" className="text-sm text-gray-600" onClick={() => setMobileMenuOpen(false)}>\n                    {t(\'nav.register\')}\n                  </Link>'
)
content = content.replace(
    '<Link href="/profile" className="text-sm text-gray-600" onClick={() => setMobileMenuOpen(false)}>\n                    个人中心\n                  </Link>',
    '<Link href="/profile" className="text-sm text-gray-600" onClick={() => setMobileMenuOpen(false)}>\n                    {t(\'nav.profile\')}\n                  </Link>'
)
content = content.replace(
    '<button onClick={logout} className="text-sm text-left text-gray-600">\n                    退出登录\n                  </button>',
    '<button onClick={logout} className="text-sm text-left text-gray-600">\n                    {t(\'nav.logoutFull\')}\n                  </button>'
)
with open(nav_path, 'w') as f:
    f.write(content)
for k, v in nav_map.items():
    all_keys[v] = k
print("  Navbar.js: processed")

# --- login/page.js ---
login_map = {
    '登录账户': 'login.title',
    '欢迎回来，请登录您的账户': 'login.welcome',
    '邮箱': 'login.email',
    '密码': 'login.password',
    '登录失败，请重试': 'login.error',
    '登录中...': 'login.submitting',
    '立即登录': 'login.submit',
    '还没有账号？': 'login.noAccount',
    '立即注册': 'login.goRegister',
}
login_path = os.path.join(BASE, "src/app/login/page.js")
with open(login_path, 'r') as f:
    content = f.read()
if 'react-i18next' not in content:
    content = content.replace(
        "import { useAuth } from '../../contexts/AuthContext';",
        "import { useAuth } from '../../contexts/AuthContext';\nimport { useTranslation } from 'react-i18next';"
    )
    content = content.replace(
        "export default function Login() {",
        "export default function Login() {\n  const { t } = useTranslation();"
    )

content = content.replace('<h2 className="mt-6 text-3xl font-bold text-gray-900">登录账户</h2>',
    '<h2 className="mt-6 text-3xl font-bold text-gray-900">{t(\'login.title\')}</h2>')
content = content.replace('<p className="mt-2 text-gray-600">欢迎回来，请登录您的账户</p>',
    '<p className="mt-2 text-gray-600">{t(\'login.welcome\')}</p>')
content = content.replace('<label className="label">邮箱</label>', '<label className="label">{t(\'login.email\')}</label>')
content = content.replace('<label className="label">密码</label>', '<label className="label">{t(\'login.password\')}</label>')
content = content.replace("setError(err.message || '登录失败，请重试');", "setError(err.message || t('login.error'));")
content = content.replace("{loading ? '登录中...' : '立即登录'}", "{loading ? t('login.submitting') : t('login.submit')}")
content = content.replace('还没有账号？', "{t('login.noAccount')}")
content = content.replace('立即注册', "{t('login.goRegister')}")

with open(login_path, 'w') as f:
    f.write(content)
for k, v in login_map.items():
    all_keys[v] = k
print("  login/page.js: processed")

# --- register/page.js ---
reg_map = {
    '创建账户': 'register.title',
    '加入我们，开始您的投资之旅': 'register.subtitle',
    '邮箱': 'register.email',
    '密码': 'register.password',
    '用户名': 'register.username',
    '用户名': 'register.usernamePlaceholder',
    '至少6位字符': 'register.passwordHint',
    '姓名': 'register.fullName',
    '真实姓名': 'register.fullNameHint',
    '手机号': 'register.phone',
    '手机号码': 'register.phoneHint',
    '注册身份': 'register.role',
    '投资者': 'register.investor',
    '购买电池资产，获得分红收益': 'register.investorDesc',
    '加盟商': 'register.franchisee',
    '卖电池的门店和代理': 'register.franchiseeDesc',
    '注册失败，请重试': 'register.error',
    '注册中...': 'register.submitting',
    '立即注册': 'register.submit',
    '已有账号？': 'register.hasAccount',
    '立即登录': 'register.goLogin',
}
# Fix duplicate 用户名
del reg_map['用户名']

reg_path = os.path.join(BASE, "src/app/register/page.js")
with open(reg_path, 'r') as f:
    content = f.read()
if 'react-i18next' not in content:
    content = content.replace(
        "import { useAuth } from '../../contexts/AuthContext';",
        "import { useAuth } from '../../contexts/AuthContext';\nimport { useTranslation } from 'react-i18next';"
    )
    content = content.replace(
        "export default function Register() {",
        "export default function Register() {\n  const { t } = useTranslation();"
    )

content = content.replace('<h2 className="mt-6 text-3xl font-bold text-gray-900">创建账户</h2>',
    '<h2 className="mt-6 text-3xl font-bold text-gray-900">{t(\'register.title\')}</h2>')
content = content.replace('<p className="mt-2 text-gray-600">加入我们，开始您的投资之旅</p>',
    '<p className="mt-2 text-gray-600">{t(\'register.subtitle\')}</p>')
content = content.replace('<label className="label">邮箱 *</label>', '<label className="label">{t(\'register.email\')} *</label>')
content = content.replace('<label className="label">用户名 *</label>', '<label className="label">{t(\'register.username\')} *</label>')
content = content.replace('<label className="label">密码 *</label>', '<label className="label">{t(\'register.password\')} *</label>')
content = content.replace('<label className="label">姓名</label>', '<label className="label">{t(\'register.fullName\')}</label>')
content = content.replace('<label className="label">手机号</label>', '<label className="label">{t(\'register.phone\')}</label>')
content = content.replace('<label className="label">注册身份 *</label>', '<label className="label">{t(\'register.role\')} *</label>')
content = content.replace('placeholder="用户名"', 'placeholder={t(\'register.usernamePlaceholder\')}')
content = content.replace('placeholder="至少6位字符"', 'placeholder={t(\'register.passwordHint\')}')
content = content.replace('placeholder="真实姓名"', 'placeholder={t(\'register.fullNameHint\')}')
content = content.replace('placeholder="手机号码"', 'placeholder={t(\'register.phoneHint\')}')
content = content.replace("setError(err.message || '注册失败，请重试');", "setError(err.message || t('register.error'));")
content = content.replace("{loading ? '注册中...' : '立即注册'}", "{loading ? t('register.submitting') : t('register.submit')}")
content = content.replace('已有账号？', "{t('register.hasAccount')}")
content = content.replace('立即登录', "{t('register.goLogin')}")
content = content.replace('<div className="font-semibold">投资者</div>', '<div className="font-semibold">{t(\'register.investor\')}</div>')
content = content.replace('<div className="text-xs mt-1 opacity-70">购买电池资产，获得分红收益</div>', '<div className="text-xs mt-1 opacity-70">{t(\'register.investorDesc\')}</div>')
content = content.replace('<div className="font-semibold">加盟商</div>', '<div className="font-semibold">{t(\'register.franchisee\')}</div>')
content = content.replace('<div className="text-xs mt-1 opacity-70">卖电池的门店和代理</div>', '<div className="text-xs mt-1 opacity-70">{t(\'register.franchiseeDesc\')}</div>')

with open(reg_path, 'w') as f:
    f.write(content)
for k, v in reg_map.items():
    all_keys[v] = k
print("  register/page.js: processed")

# --- trade/page.js ---
trade_map = {
    '平台回购': 'trade.title',
    '我的电池单元': 'trade.myUnits',
    '暂无可回购的电池单元': 'trade.noUnits',
    '回购价格预览': 'trade.preview',
    '点击左侧电池单元查看回购价格': 'trade.previewHint',
    '加载中...': 'trade.loading',
    '请先选择要出售的电池单元': 'trade.selectFirst',
    '出售失败': 'trade.sellFailed',
    '处理中...': 'trade.processing',
    '购入价': 'trade.purchasePrice',
    '持有': 'trade.holding',
    '残值': 'trade.residual',
    '罚金': 'trade.penalty',
    '回购价': 'trade.buybackPrice',
    '出售 ': 'trade.sellPrefix',
    ' 个单元给平台': 'trade.sellUnitsToPlatform',
}
trade_path = os.path.join(BASE, "src/app/trade/page.js")
with open(trade_path, 'r') as f:
    content = f.read()
if 'react-i18next' not in content:
    content = content.replace(
        "import { USD_TO_CNY_RATE, dualCurrency, formatUSD, formatCNY, usdToCny } from '../../lib/currency';",
        "import { USD_TO_CNY_RATE, dualCurrency, formatUSD, formatCNY, usdToCny } from '../../lib/currency';\nimport { useTranslation } from 'react-i18next';"
    )
    content = content.replace(
        "export default function Trade() {",
        "export default function Trade() {\n  const { t } = useTranslation();"
    )

content = content.replace('<h1 className="text-3xl font-bold text-gray-900 mb-8">平台回购</h1>', '<h1 className="text-3xl font-bold text-gray-900 mb-8">{t(\'trade.title\')}</h1>')
content = content.replace('<h2 className="text-lg font-semibold">我的电池单元</h2>', '<h2 className="text-lg font-semibold">{t(\'trade.myUnits\')}</h2>')
content = content.replace('暂无可回购的电池单元', '{t(\'trade.noUnits\')}')
# Fix: the preview header already has the right match from earlier
content = content.replace('<h2 className="text-lg font-semibold mb-4 flex items-center gap-2"><Calculator className="h-5 w-5" />回购价格预览</h2>', 
    '<h2 className="text-lg font-semibold mb-4 flex items-center gap-2"><Calculator className="h-5 w-5" />{t(\'trade.preview\')}</h2>')
content = content.replace('点击左侧电池单元查看回购价格', '{t(\'trade.previewHint\')}')
content = content.replace('加载中...', '{t(\'trade.loading\')}')
content = content.replace("if (selectedUnitIds.length === 0) { setSellMsg('请先选择要出售的电池单元'); return; }", "if (selectedUnitIds.length === 0) { setSellMsg(t('trade.selectFirst')); return; }")
content = content.replace("setSellMsg(json.error || '出售失败');", "setSellMsg(json.error || t('trade.sellFailed'));")
content = content.replace("catch (e) { setSellMsg('出售失败'); }", "catch (e) { setSellMsg(t('trade.sellFailed')); }")
content = content.replace("{selling ? '处理中...'", "{selling ? t('trade.processing')")
content = content.replace('<span className="text-gray-500">购入价</span>', '<span className="text-gray-500">{t(\'trade.purchasePrice\')}</span>')
content = content.replace('<span className="text-gray-500">持有</span>', '<span className="text-gray-500">{t(\'trade.holding\')}</span>')
content = content.replace('<span className="text-gray-500">残值</span>', '<span className="text-gray-500">{t(\'trade.residual\')}</span>')
content = content.replace('<span className="text-red-500">罚金', '<span className="text-red-500">{t(\'trade.penalty\')}')
content = content.replace('<span className="font-medium text-primary-900">回购价</span>', '<span className="font-medium text-primary-900">{t(\'trade.buybackPrice\')}</span>')

with open(trade_path, 'w') as f:
    f.write(content)
for k, v in trade_map.items():
    all_keys[v] = k
print("  trade/page.js: processed")

# --- stores/page.js ---
stores_map = {
    '加盟门店': 'stores.franchiseStores',
    '加盟门店网络': 'stores.network',
    '投资者购买电池资产的销售门店，覆盖全球': 'stores.description',
    '门店总数': 'stores.totalStores',
    '累计销量': 'stores.totalSales',
    '累计收益': 'stores.totalRevenue',
    '覆盖区域': 'stores.coverage',
    '全球': 'stores.global',
    '中国大陆': 'stores.chinaMainland',
    '香港': 'stores.hongkong',
    '澳门': 'stores.macau',
    '加载门店数据中...': 'stores.loading',
    '数据加载失败': 'stores.loadError',
    '门店数据加载失败': 'stores.loadError',
    '重试': 'stores.retry',
    '已售电池类型': 'stores.soldBatteryType',
    '联系电话': 'stores.phone',
    '门店地址': 'stores.address',
    '门店照片待上传': 'stores.photoPending',
}

stores_path = os.path.join(BASE, "src/app/stores/page.js")
with open(stores_path, 'r') as f:
    content = f.read()
if 'react-i18next' not in content:
    content = content.replace(
        "import { formatUSD, formatCNY, usdToCny } from '../../lib/currency';",
        "import { formatUSD, formatCNY, usdToCny } from '../../lib/currency';\nimport { useTranslation } from 'react-i18next';"
    )
    content = content.replace(
        "export default function StoresPage() {",
        "export default function StoresPage() {\n  const { t } = useTranslation();"
    )

content = content.replace('<div className="inline-flex items-center bg-purple-100 text-purple-700 text-sm font-semibold px-4 py-1.5 rounded-full mb-4">\n            <Store className="h-4 w-4 mr-2" /> 加盟门店\n          </div>',
    '<div className="inline-flex items-center bg-purple-100 text-purple-700 text-sm font-semibold px-4 py-1.5 rounded-full mb-4">\n            <Store className="h-4 w-4 mr-2" />{t(\'stores.franchiseStores\')}\n          </div>')
content = content.replace('<h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">加盟门店网络</h2>',
    '<h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">{t(\'stores.network\')}</h2>')
content = content.replace('<p className="text-gray-500 max-w-2xl mx-auto">投资者购买电池资产的销售门店，覆盖全球</p>',
    '<p className="text-gray-500 max-w-2xl mx-auto">{t(\'stores.description\')}</p>')
content = content.replace("label: '门店总数'", "label: t('stores.totalStores')")
content = content.replace("label: '累计销量'", "label: t('stores.totalSales')")
content = content.replace("label: '累计收益'", "label: t('stores.totalRevenue')")
content = content.replace("label: '覆盖区域'", "label: t('stores.coverage')")
content = content.replace("value: '全球'", "value: t('stores.global')")
content = content.replace('中国大陆', '{t(\'stores.chinaMainland\')}')
content = content.replace('<span className="flex items-center gap-1.5 text-xs text-gray-500"><span className="w-3 h-3 bg-red-600 rounded-full" />香港</span>',
    '<span className="flex items-center gap-1.5 text-xs text-gray-500"><span className="w-3 h-3 bg-red-600 rounded-full" />{t(\'stores.hongkong\')}</span>')
content = content.replace('<span className="flex items-center gap-1.5 text-xs text-gray-500"><span className="w-3 h-3 bg-green-600 rounded-full" />澳门</span>',
    '<span className="flex items-center gap-1.5 text-xs text-gray-500"><span className="w-3 h-3 bg-green-600 rounded-full" />{t(\'stores.macau\')}</span>')
content = content.replace('加载门店数据中...', '{t(\'stores.loading\')}')
content = content.replace('数据加载失败', '{t(\'stores.loadError\')}')
content = content.replace('重试', '{t(\'stores.retry\')}')
content = content.replace("e.message || '门店数据加载失败'", "e.message || t('stores.loadError')")
content = content.replace("label: '已售电池类型'", "label: t('stores.soldBatteryType')")
content = content.replace("label: '联系电话'", "label: t('stores.phone')")
content = content.replace("label: '门店地址'", "label: t('stores.address')")
content = content.replace('门店照片待上传', '{t(\'stores.photoPending\')}')

with open(stores_path, 'w') as f:
    f.write(content)
for k, v in stores_map.items():
    all_keys[v] = k
print("  stores/page.js: processed")

print(f"\nSmall files done. Keys so far: {len(all_keys)}")
print("Processing large files with auto-generated keys...")

# ============================================================
# Process remaining large files
# ============================================================
large_files = [
    ("src/app/page.js", "home"),
    ("src/app/invest/page.js", "invest"),
    ("src/app/admin/page.js", "admin"),
    ("src/app/franchisee/page.js", "franchisee"),
    ("src/app/profile/page.js", "profile"),
    ("src/app/admin/battery-types/page.js", "adminBt"),
    ("src/app/admin/operation-sites/page.js", "adminOs"),
    ("src/app/admin/workers/page.js", "adminWk"),
]

for fp, pfx in large_files:
    process_file(fp, pfx)

print(f"\nTotal keys generated: {len(all_keys)}")

# Save all keys for locale generation
keys_path = os.path.join(BASE, "temp", "all_i18n_keys.json")
with open(keys_path, 'w', encoding='utf-8') as f:
    json.dump(all_keys, f, ensure_ascii=False, indent=2)

print(f"Keys saved to: {keys_path}")
print("DONE - All files processed")
