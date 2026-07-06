#!/usr/bin/env python3
"""Fix remaining Chinese strings in page.js - precise replacements."""
PAGE_JS = "/Users/daxixi/Library/Application Support/com.tencent.mac.marvis/MarvisData/User/oAN1i2VmsGbdO4eyNVh90OQ9zP5E/workspace/conv_19ed68a9a2d_8b165236c049/output/battery_swap_platform/cambodia-battery-investment/frontend/src/app/page.js"

with open(PAGE_JS, "r", encoding="utf-8") as f:
    content = f.read()

replacements = [
    # Site list headers
    ('                          换电站站点 ({swapSites.length})', "                          {t('home.swapSites')} ({swapSites.length})"),
    ('                          <div className="py-8 text-center text-gray-400 text-sm">暂无换电站站点</div>', "<div className=\"py-8 text-center text-gray-400 text-sm\">{t('home.noSwapSites')}</div>"),
    ('                          运营线路站点 ({lineSites.length})', "                          {t('home.lineSites')} ({lineSites.length})"),
    ('                          <div className="py-8 text-center text-gray-400 text-sm">暂无运营线路站点</div>', "<div className=\"py-8 text-center text-gray-400 text-sm\">{t('home.noLineSites')}</div>"),
    ('                          移动储能柜站点 ({mobileSites.length})', "                          {t('home.mobileSites')} ({mobileSites.length})"),
    ('                          <div className="py-8 text-center text-gray-400 text-sm">暂无移动储能柜站点</div>', "<div className=\"py-8 text-center text-gray-400 text-sm\">{t('home.noMobileSites')}</div>"),
    ('                          固定储能柜站点 ({fixedSites.length})', "                          {t('home.fixedSites')} ({fixedSites.length})"),
    ('                          <div className="py-8 text-center text-gray-400 text-sm">暂无固定储能柜站点</div>', "<div className=\"py-8 text-center text-gray-400 text-sm\">{t('home.noFixedSites')}</div>"),
    # Site vehicle/unit headers
    ('                          本站车辆 ({((', "                          {t('home.siteVehicles')} ({(() => {\n                            const vs = (batteryLive.sites || []).filter(s => s.site_type && s.site_type.includes('运营线路')"),
    ('                          本站电池单元 ({((', "                          {t('home.siteUnits')} ({(() => {\n                            const su = (batteryLive.sites || []).filter(s => s.site_type === '固定储能柜'"),
    # Wait, these are more complex. Let me handle the simpler cases first then come back.
]

# Let me do the simpler ones first and handle complex ones separately
for old, new in replacements:
    if old in content:
        content = content.replace(old, new)
        print(f"OK: {old[:50]}...")
    else:
        print(f"NOT FOUND: {old[:50]}...")

with open(PAGE_JS, "w", encoding="utf-8") as f:
    f.write(content)

print("\nDone.")
