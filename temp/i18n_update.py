#!/usr/bin/env python3
"""
Batch i18n update script: adds new keys to all 5 locale files,
then replaces Chinese hardcoded strings in page.js and apply-agent/page.js.
"""
import json, re, os

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
LOCALE_DIR = os.path.join(BASE, "src", "i18n", "locales")
PAGE_JS = os.path.join(BASE, "src", "app", "page.js")
APPLY_AGENT_JS = os.path.join(BASE, "src", "app", "apply-agent", "page.js")

# ─── New translation keys ──────────────────────────────────────────────
NEW_KEYS = {
    # BatteryAssetsSection
    "home.batteryAssets":        {"zh-CN": "电池资产", "zh-TW": "電池資產", "en": "Battery Assets", "bn": "ব্যাটারি সম্পদ", "km": "ទ្រព្យសម្បត្តិថ្ម"},
    "home.batteryAssetsMatrix":  {"zh-CN": "电池资产矩阵", "zh-TW": "電池資產矩陣", "en": "Battery Asset Matrix", "bn": "ব্যাটারি সম্পদ ম্যাট্রিক্স", "km": "ម៉ាទ្រីសទ្រព្យសម្បត្តិថ្ម"},
    "home.batteryAssetsDesc":    {"zh-CN": "覆盖换电、商用车辆、工商业储能及固定储能柜全品类，20款标准化电池资产", "zh-TW": "覆蓋換電、商用車輛、工商業儲能及固定儲能櫃全品類，20款標準化電池資產", "en": "Covering battery swapping, commercial vehicles, C&I storage, and fixed storage cabinets — 20 standardized battery assets", "bn": "ব্যাটারি অদলবদল, বাণিজ্যিক যানবাহন, শিল্প সঞ্চয়স্থান এবং স্থির সঞ্চয়স্থান ক্যাবিনেট কভার করে — 20 মানসম্মত ব্যাটারি সম্পদ", "km": "គ្របដណ្តប់លើការប្តូរថ្ម យានយន្តពាណិជ្ជកម្ម ការផ្ទុកថាមពលឧស្សាហកម្ម និងទូផ្ទុកថេរ — ទ្រព្យសម្បត្តិថ្មស្តង់ដារ ២០ ប្រភេទ"},
    "home.catSwap":              {"zh-CN": "两轮/三轮换电", "zh-TW": "兩輪/三輪換電", "en": "2W/3W Swapping", "bn": "২ডব্লিউ/৩ডব্লিউ অদলবদল", "km": "ប្តូរ ២កង់/៣កង់"},
    "home.catSwapDesc":          {"zh-CN": "外卖骑手、快递配送、电摩出行", "zh-TW": "外賣騎手、快遞配送、電摩出行", "en": "Food delivery, courier, e-moto commuting", "bn": "খাদ্য বিতরণ, কুরিয়ার, ই-মোটো যাতায়াত", "km": "ដឹកជញ្ជូនអាហារ នាំសំបុត្រ ធ្វើដំណើរតាមម៉ូតូអគ្គិសនី"},
    "home.catVehicle":           {"zh-CN": "物流/客运车辆", "zh-TW": "物流/客運車輛", "en": "Logistics/Passenger Vehicles", "bn": "লজিস্টিক/যাত্রীবাহী যানবাহন", "km": "យានយន្តដឹកជញ្ជូន/ដឹកអ្នកដំណើរ"},
    "home.catVehicleDesc":       {"zh-CN": "城市物流、客运车队电池托管", "zh-TW": "城市物流、客運車隊電池託管", "en": "Urban logistics & passenger fleet battery hosting", "bn": "শহুরে লজিস্টিক ও যাত্রীবাহী ফ্লিট ব্যাটারি হোস্টিং", "km": "ការគ្រប់គ្រងថ្មសម្រាប់កងនាវាដឹកជញ្ជូន និងដឹកអ្នកដំណើរ"},
    "home.catCommercial":        {"zh-CN": "移动储能柜", "zh-TW": "移動儲能櫃", "en": "Mobile Storage Cabinet", "bn": "মোবাইল স্টোরেজ ক্যাবিনেট", "km": "ទូផ្ទុកថាមពលចល័ត"},
    "home.catCommercialDesc":    {"zh-CN": "峰谷套利、需量管理、备电", "zh-TW": "峰谷套利、需量管理、備電", "en": "Peak-valley arbitrage, demand management, backup power", "bn": "পিক-ভ্যালি আরবিট্রেজ, চাহিদা ব্যবস্থাপনা, ব্যাকআপ পাওয়ার", "km": "អាជ្ញាកណ្តាលពេលខ្ពស់-ទាប ការគ្រប់គ្រងតម្រូវការ ថាមពលបម្រុង"},
    "home.catContainer":         {"zh-CN": "固定储能柜", "zh-TW": "固定儲能櫃", "en": "Fixed Storage Cabinet", "bn": "স্থির স্টোরেজ ক্যাবিনেট", "km": "ទូផ្ទុកថាមពលថេរ"},
    "home.catContainerDesc":     {"zh-CN": "电网级储能、光伏配储", "zh-TW": "電網級儲能、光伏配儲", "en": "Grid-level storage, solar PV pairing", "bn": "গ্রিড-স্তরের স্টোরেজ, সোলার পিভি পেয়ারিং", "km": "ការផ្ទុកកម្រិតបណ្តាញ ការផ្គូផ្គងសូឡា PV"},
    "home.autoPlay":             {"zh-CN": "▶ 自动轮播", "zh-TW": "▶ 自動輪播", "en": "▶ Auto Play", "bn": "▶ স্বয়ংক্রিয় প্লে", "km": "▶ ចាក់ដោយស្វ័យប្រវត្តិ"},
    "home.stopAutoPlay":         {"zh-CN": "⏸ 停止轮播", "zh-TW": "⏸ 停止輪播", "en": "⏸ Stop", "bn": "⏸ বন্ধ করুন", "km": "⏸ បញ្ឈប់"},
    "home.voltage":              {"zh-CN": "电压", "zh-TW": "電壓", "en": "Voltage", "bn": "ভোল্টেজ", "km": "វ៉ុល"},
    "home.current":              {"zh-CN": "电流", "zh-TW": "電流", "en": "Current", "bn": "কারেন্ট", "km": "ចរន្ត"},
    "home.weight":               {"zh-CN": "重量", "zh-TW": "重量", "en": "Weight", "bn": "ওজন", "km": "ទម្ងន់"},
    "home.nominalVoltage":       {"zh-CN": "标称电压", "zh-TW": "標稱電壓", "en": "Nominal Voltage", "bn": "নামমাত্র ভোল্টেজ", "km": "វ៉ុលនាម"},
    "home.capacity":             {"zh-CN": "容量", "zh-TW": "容量", "en": "Capacity", "bn": "ক্ষমতা", "km": "សមត្ថភាព"},
    "home.continuousCurrent":    {"zh-CN": "持续电流", "zh-TW": "持續電流", "en": "Continuous Current", "bn": "ক্রমাগত কারেন্ট", "km": "ចរន្តបន្ត"},
    "home.dimensions":           {"zh-CN": "外形尺寸", "zh-TW": "外形尺寸", "en": "Dimensions", "bn": "মাত্রা", "km": "វិមាត្រ"},
    "home.netWeight":            {"zh-CN": "净重", "zh-TW": "淨重", "en": "Net Weight", "bn": "নিট ওজন", "km": "ទម្ងន់សុទ្ធ"},
    "home.unitEnergy":           {"zh-CN": "单台电量", "zh-TW": "單臺電量", "en": "Unit Energy", "bn": "ইউনিট শক্তি", "km": "ថាមពលក្នុងមួយឯកតា"},
    "home.registerToView":       {"zh-CN": "注册登录，查看投资收益率与详情 →", "zh-TW": "註冊登錄，查看投資收益率與詳情 →", "en": "Register to view ROI and details →", "bn": "ROI এবং বিস্তারিত দেখতে নিবন্ধন করুন →", "km": "ចុះឈ្មោះដើម្បីមើល ROI និងព័ត៌មានលម្អិត →"},
    "home.totalProducts":        {"zh-CN": "款标准化电池产品 · 参数公开透明 · 登录查看投资详情", "zh-TW": "款標準化電池產品 · 參數公開透明 · 登錄查看投資詳情", "en": " standardized battery products · Transparent specs · Login to view investment details", "bn": " মানসম্মত ব্যাটারি পণ্য · স্বচ্ছ স্পেসিফিকেশন · বিনিয়োগের বিবরণ দেখতে লগইন করুন", "km": " ផលិតផលថ្មស្តង់ដារ · លក្ខណៈបច្ចេកទេសច្បាស់លាស់ · ចូលដើម្បីមើលព័ត៌មានវិនិយោគ"},

    # BatteryNetworkSection
    "home.batteryNetwork":       {"zh-CN": "电池网络分布", "zh-TW": "電池網絡分佈", "en": "Battery Network", "bn": "ব্যাটারি নেটওয়ার্ক", "km": "បណ្តាញថ្ម"},
    "home.networkTitle":         {"zh-CN": "电池网络实时分布", "zh-TW": "電池網絡實時分佈", "en": "Real-time Battery Network Distribution", "bn": "রিয়েল-টাইম ব্যাটারি নেটওয়ার্ক বিতরণ", "km": "ការចែកចាយបណ្តាញថ្មពេលវេលាជាក់ស្តែង"},
    "home.networkDesc":          {"zh-CN": "全球在运电池资产可视化监控，实时电量与服役状态一目了然", "zh-TW": "全球在運電池資產可視化監控，實時電量與服役狀態一目了然", "en": "Global in-service battery asset visualization — real-time charge and health status at a glance", "bn": "গ্লোবাল ইন-সার্ভিস ব্যাটারি সম্পদ ভিজ্যুয়ালাইজেশন — এক নজরে রিয়েল-টাইম চার্জ এবং স্বাস্থ্য অবস্থা", "km": "ការមើលឃើញទ្រព្យសម្បត្តិថ្មដែលកំពុងប្រើប្រាស់សកល — ស្ថានភាពសាក និងសុខភាពពេលវេលាជាក់ស្តែង"},
    "home.nodeType.swap":        {"zh-CN": "换电站", "zh-TW": "換電站", "en": "Swap Station", "bn": "অদলবদল স্টেশন", "km": "ស្ថានីយប្តូរ"},
    "home.nodeType.bus":         {"zh-CN": "运营线路", "zh-TW": "運營線路", "en": "Transit Route", "bn": "ট্রানজিট রুট", "km": "ផ្លូវដឹកជញ្ជូន"},
    "home.nodeType.commercial":  {"zh-CN": "移动储能柜", "zh-TW": "移動儲能櫃", "en": "Mobile Storage", "bn": "মোবাইল স্টোরেজ", "km": "ការផ្ទុកចល័ត"},
    "home.nodeType.container":   {"zh-CN": "固定储能柜", "zh-TW": "固定儲能櫃", "en": "Fixed Storage", "bn": "স্থির স্টোরেজ", "km": "ការផ្ទុកថេរ"},
    "home.status.normal":        {"zh-CN": "正常", "zh-TW": "正常", "en": "Normal", "bn": "স্বাভাবিক", "km": "ធម្មតា"},
    "home.status.warning":       {"zh-CN": "预警", "zh-TW": "預警", "en": "Warning", "bn": "সতর্কতা", "km": "ព្រមាន"},
    "home.status.critical":      {"zh-CN": "严重", "zh-TW": "嚴重", "en": "Critical", "bn": "গুরুতর", "km": "ធ្ងន់ធ្ងរ"},
    "home.status.offline":       {"zh-CN": "离线", "zh-TW": "離線", "en": "Offline", "bn": "অফলাইন", "km": "ក្រៅបណ្តាញ"},
    "home.swapSites":            {"zh-CN": "换电站站点", "zh-TW": "換電站站點", "en": "Swap Station Sites", "bn": "অদলবদল স্টেশন সাইট", "km": "ទីតាំងស្ថានីយប្តូរ"},
    "home.noSwapSites":          {"zh-CN": "暂无换电站站点", "zh-TW": "暫無換電站站點", "en": "No swap station sites yet", "bn": "এখনও কোনো অদলবদল স্টেশন সাইট নেই", "km": "មិនទាន់មានទីតាំងស្ថានីយប្តូរនៅឡើយ"},
    "home.lineSites":            {"zh-CN": "运营线路站点", "zh-TW": "運營線路站點", "en": "Transit Route Sites", "bn": "ট্রানজিট রুট সাইট", "km": "ទីតាំងផ្លូវដឹកជញ្ជូន"},
    "home.noLineSites":          {"zh-CN": "暂无运营线路站点", "zh-TW": "暫無運營線路站點", "en": "No transit route sites yet", "bn": "এখনও কোনো ট্রানজিট রুট সাইট নেই", "km": "មិនទាន់មានទីតាំងផ្លូវដឹកជញ្ជូននៅឡើយ"},
    "home.mobileSites":          {"zh-CN": "移动储能柜站点", "zh-TW": "移動儲能櫃站點", "en": "Mobile Storage Sites", "bn": "মোবাইল স্টোরেজ সাইট", "km": "ទីតាំងផ្ទុកចល័ត"},
    "home.noMobileSites":        {"zh-CN": "暂无移动储能柜站点", "zh-TW": "暫無移動儲能櫃站點", "en": "No mobile storage sites yet", "bn": "এখনও কোনো মোবাইল স্টোরেজ সাইট নেই", "km": "មិនទាន់មានទីតាំងផ្ទុកចល័តនៅឡើយ"},
    "home.fixedSites":           {"zh-CN": "固定储能柜站点", "zh-TW": "固定儲能櫃站點", "en": "Fixed Storage Sites", "bn": "স্থির স্টোরেজ সাইট", "km": "ទីតាំងផ្ទុកថេរ"},
    "home.noFixedSites":         {"zh-CN": "暂无固定储能柜站点", "zh-TW": "暫無固定儲能櫃站點", "en": "No fixed storage sites yet", "bn": "এখনও কোনো স্থির স্টোরেজ সাইট নেই", "km": "មិនទាន់មានទីតាំងផ្ទុកថេរនៅឡើយ"},
    "home.backToSiteList":       {"zh-CN": "返回站点列表", "zh-TW": "返回站點列表", "en": "Back to Site List", "bn": "সাইট তালিকায় ফিরুন", "km": "ត្រឡប់ទៅបញ្ជីទីតាំង"},
    "home.backToCabinetList":    {"zh-CN": "返回换电柜列表", "zh-TW": "返回換電櫃列表", "en": "Back to Cabinet List", "bn": "ক্যাবিনেট তালিকায় ফিরুন", "km": "ត្រឡប់ទៅបញ្ជីទូ"},
    "home.backToUnitList":       {"zh-CN": "返回电池单元列表", "zh-TW": "返回電池單元列表", "en": "Back to Unit List", "bn": "ইউনিট তালিকায় ফিরুন", "km": "ត្រឡប់ទៅបញ្ជីឯកតា"},
    "home.backToStorageList":    {"zh-CN": "返回储能列表", "zh-TW": "返回儲能列表", "en": "Back to Storage List", "bn": "স্টোরেজ তালিকায় ফিরুন", "km": "ត្រឡប់ទៅបញ្ជីផ្ទុក"},
    "home.backToWarehouseList":  {"zh-CN": "返回仓库列表", "zh-TW": "返回倉庫列表", "en": "Back to Warehouse List", "bn": "গুদাম তালিকায় ফিরুন", "km": "ត្រឡប់ទៅបញ្ជីឃ្លាំង"},
    "home.siteVehicles":         {"zh-CN": "本站车辆", "zh-TW": "本站車輛", "en": "Site Vehicles", "bn": "সাইট যানবাহন", "km": "យានយន្តទីតាំង"},
    "home.siteUnits":            {"zh-CN": "本站电池单元", "zh-TW": "本站電池單元", "en": "Site Battery Units", "bn": "সাইট ব্যাটারি ইউনিট", "km": "ឯកតាថ្មទីតាំង"},
    "home.blockUnit":            {"zh-CN": " 块", "zh-TW": " 塊", "en": " units", "bn": " ইউনিট", "km": " ឯកតា"},
    "home.health":               {"zh-CN": "健康度", "zh-TW": "健康度", "en": "Health", "bn": "স্বাস্থ্য", "km": "សុខភាព"},
    "home.occupied":             {"zh-CN": "已占用", "zh-TW": "已佔用", "en": "Occupied", "bn": "দখলকৃত", "km": "កាន់កាប់"},
    "home.empty":                {"zh-CN": "空闲", "zh-TW": "空閒", "en": "Empty", "bn": "খালি", "km": "ទំនេរ"},
    "home.slot":                 {"zh-CN": "槽", "zh-TW": "槽", "en": " slots", "bn": " স্লট", "km": " រន្ធ"},
    "home.slotNumber":           {"zh-CN": "槽位编号", "zh-TW": "槽位編號", "en": "Slot Number", "bn": "স্লট নম্বর", "km": "លេខរន្ធ"},
    "home.status_label":         {"zh-CN": "状态", "zh-TW": "狀態", "en": "Status", "bn": "অবস্থা", "km": "ស្ថានភាព"},
    "home.charging":             {"zh-CN": "充电中", "zh-TW": "充電中", "en": "Charging", "bn": "চার্জ হচ্ছে", "km": "កំពុងសាក"},
    "home.standby":              {"zh-CN": "待机", "zh-TW": "待機", "en": "Standby", "bn": "স্ট্যান্ডবাই", "km": "រង់ចាំ"},
    "home.occupiedStatus":       {"zh-CN": "已占用", "zh-TW": "已佔用", "en": "Occupied", "bn": "দখলকৃত", "km": "កាន់កាប់"},
    "home.lastSwap":             {"zh-CN": "最近换电", "zh-TW": "最近換電", "en": "Last Swap", "bn": "শেষ অদলবদল", "km": "ការប្តូរចុងក្រោយ"},
    "home.sensorData":           {"zh-CN": "传感器数据", "zh-TW": "傳感器數據", "en": "Sensor Data", "bn": "সেন্সর ডেটা", "km": "ទិន្នន័យឧបករណ៍ចាប់សញ្ញា"},
    "home.operatingRoute":       {"zh-CN": "运营线路", "zh-TW": "運營線路", "en": "Operating Route", "bn": "অপারেটিং রুট", "km": "ផ្លូវប្រតិបត្តិការ"},
    "home.trackOnMap":           {"zh-CN": "在地图上查看", "zh-TW": "在地圖上查看", "en": "View on Map", "bn": "ম্যাপে দেখুন", "km": "មើលនៅលើផែនទី"},
    "home.fixedStorage":         {"zh-CN": "固定储能柜", "zh-TW": "固定儲能櫃", "en": "Fixed Storage Cabinet", "bn": "স্থির স্টোরেজ ক্যাবিনেট", "km": "ទូផ្ទុកថេរ"},
    "home.mobileStorage":        {"zh-CN": "移动柜", "zh-TW": "移動櫃", "en": "Mobile Cabinet", "bn": "মোবাইল ক্যাবিনেট", "km": "ទូចល័ត"},
    "home.truck":                {"zh-CN": "货车", "zh-TW": "貨車", "en": "Truck", "bn": "ট্রাক", "km": "ឡានដឹកទំនិញ"},
    "home.running":              {"zh-CN": "运行中", "zh-TW": "運行中", "en": "Running", "bn": "চলমান", "km": "កំពុងដំណើរការ"},
    "home.fault":                {"zh-CN": "故障", "zh-TW": "故障", "en": "Fault", "bn": "ত্রুটি", "km": "កំហុស"},
    "home.batteryLevel":         {"zh-CN": "电量水平", "zh-TW": "電量水平", "en": "Battery Level", "bn": "ব্যাটারি স্তর", "km": "កម្រិតថ្ម"},
    "home.storageSensor":        {"zh-CN": "储能传感器", "zh-TW": "儲能傳感器", "en": "Storage Sensors", "bn": "স্টোরেজ সেন্সর", "km": "ឧបករណ៍ចាប់សញ្ញាផ្ទុក"},
    "home.totalVoltage":         {"zh-CN": "总电压", "zh-TW": "總電壓", "en": "Total Voltage", "bn": "মোট ভোল্টেজ", "km": "វ៉ុលសរុប"},
    "home.power":                {"zh-CN": "功率", "zh-TW": "功率", "en": "Power", "bn": "শক্তি", "km": "ថាមពល"},
    "home.energyThroughput":     {"zh-CN": "能量吞吐", "zh-TW": "能量吞吐", "en": "Energy Throughput", "bn": "শক্তি থ্রুপুট", "km": "បរិមាណថាមពល"},
    "home.cellVoltageMin":       {"zh-CN": "电芯最低电压", "zh-TW": "電芯最低電壓", "en": "Cell Voltage Min", "bn": "সেল ভোল্টেজ ন্যূনতম", "km": "វ៉ុលកោសិកាអប្បបរមា"},
    "home.cellVoltageMax":       {"zh-CN": "电芯最高电压", "zh-TW": "電芯最高電壓", "en": "Cell Voltage Max", "bn": "সেল ভোল্টেজ সর্বোচ্চ", "km": "វ៉ុលកោសិកាអតិបរមា"},
    "home.cellTempMax":          {"zh-CN": "电芯最高温度", "zh-TW": "電芯最高溫度", "en": "Cell Temp Max", "bn": "সেল তাপমাত্রা সর্বোচ্চ", "km": "សីតុណ្ហភាពកោសិកាអតិបរមា"},
    "home.insulationResistance": {"zh-CN": "绝缘电阻", "zh-TW": "絕緣電阻", "en": "Insulation Resistance", "bn": "ইনসুলেশন রেজিস্ট্যান্স", "km": "ភាពធន់អ៊ីសូឡង់"},
    "home.lastMaintenance":      {"zh-CN": "最后维护", "zh-TW": "最後維護", "en": "Last Maintenance", "bn": "শেষ রক্ষণাবেক্ষণ", "km": "ការថែទាំចុងក្រោយ"},
    "home.independentOp":        {"zh-CN": "独立运营", "zh-TW": "獨立運營", "en": "Independent Operation", "bn": "স্বাধীন অপারেশন", "km": "ប្រតិបត្តិការឯករាជ្យ"},
    "home.noUnsoldBattery":      {"zh-CN": "此仓库暂无未售电池", "zh-TW": "此倉庫暫無未售電池", "en": "No unsold batteries in this warehouse", "bn": "এই গুদামে কোনো অবিক্রীত ব্যাটারি নেই", "km": "មិនមានថ្មមិនទាន់លក់នៅក្នុងឃ្លាំងនេះ"},
    "home.unsoldBatteries":      {"zh-CN": "未售电池", "zh-TW": "未售電池", "en": "Unsold Batteries", "bn": "অবিক্রীত ব্যাটারি", "km": "ថ្មមិនទាន់លក់"},
    "home.code":                 {"zh-CN": "编码", "zh-TW": "編碼", "en": "Code", "bn": "কোড", "km": "កូដ"},
    "home.soc":                  {"zh-CN": "SOC", "zh-TW": "SOC", "en": "SOC", "bn": "SOC", "km": "SOC"},
    "home.temperature":          {"zh-CN": "温度", "zh-TW": "溫度", "en": "Temperature", "bn": "তাপমাত্রা", "km": "សីតុណ្ហភាព"},
    "home.cycleCount":           {"zh-CN": "循环次数", "zh-TW": "循環次數", "en": "Cycle Count", "bn": "সাইকেল গণনা", "km": "ចំនួនវដ្ត"},
    "home.soh":                  {"zh-CN": "SOH", "zh-TW": "SOH", "en": "SOH", "bn": "SOH", "km": "SOH"},

    # FranchiseStoresSection
    "home.franchiseStores":      {"zh-CN": "加盟门店", "zh-TW": "加盟門店", "en": "Franchise Stores", "bn": "ফ্র্যাঞ্চাইজি স্টোর", "km": "ហាងសិទ្ធិអាជីវកម្ម"},
    "home.franchiseNetwork":     {"zh-CN": "加盟门店网络", "zh-TW": "加盟門店網絡", "en": "Franchise Store Network", "bn": "ফ্র্যাঞ্চাইজি স্টোর নেটওয়ার্ক", "km": "បណ្តាញហាងសិទ្ធិអាជីវកម្ម"},
    "home.franchiseDesc":        {"zh-CN": "投资者购买电池资产的销售门店，覆盖全球", "zh-TW": "投資者購買電池資產的銷售門店，覆蓋全球", "en": "Sales stores for investors purchasing battery assets, covering the globe", "bn": "বিনিয়োগকারীদের জন্য ব্যাটারি সম্পদ ক্রয়ের বিক্রয় স্টোর, বিশ্বব্যাপী কভারেজ", "km": "ហាងលក់សម្រាប់អ្នកវិនិយោគទិញទ្រព្យសម្បត្តិថ្ម គ្របដណ្តប់សកល"},
    "home.totalStores":          {"zh-CN": "门店总数", "zh-TW": "門店總數", "en": "Total Stores", "bn": "মোট স্টোর", "km": "ហាងសរុប"},
    "home.cumulativeSales":      {"zh-CN": "累计销量", "zh-TW": "累計銷量", "en": "Cumulative Sales", "bn": "ক্রমবর্ধমান বিক্রয়", "km": "ការលក់សរុប"},
    "home.coverage":             {"zh-CN": "覆盖区域", "zh-TW": "覆蓋區域", "en": "Coverage", "bn": "কভারেজ", "km": "ការគ្របដណ្តប់"},
    "home.global":               {"zh-CN": "全球", "zh-TW": "全球", "en": "Global", "bn": "গ্লোবাল", "km": "សកល"},
    "home.chinaMainland":        {"zh-CN": "中国大陆", "zh-TW": "中國大陸", "en": "China Mainland", "bn": "চীন মূলভূখণ্ড", "km": "ចិនដីគោក"},
    "home.hongkong":             {"zh-CN": "香港", "zh-TW": "香港", "en": "Hong Kong", "bn": "হংকং", "km": "ហុងកុង"},
    "home.macau":                {"zh-CN": "澳门", "zh-TW": "澳門", "en": "Macau", "bn": "ম্যাকাও", "km": "ម៉ាកាវ"},
    "home.soldBatteryType":      {"zh-CN": "已售电池类型", "zh-TW": "已售電池類型", "en": "Sold Battery Type", "bn": "বিক্রিত ব্যাটারি প্রকার", "km": "ប្រភេទថ្មដែលបានលក់"},
    "home.soldBatteryCount":     {"zh-CN": "已售电池数量", "zh-TW": "已售電池數量", "en": "Sold Battery Count", "bn": "বিক্রিত ব্যাটারি সংখ্যা", "km": "ចំនួនថ្មដែលបានលក់"},
    "home.storePhone":           {"zh-CN": "联系电话", "zh-TW": "聯繫電話", "en": "Phone", "bn": "ফোন", "km": "ទូរស័ព្ទ"},
    "home.storeAddress":         {"zh-CN": "门店地址", "zh-TW": "門店地址", "en": "Store Address", "bn": "স্টোর ঠিকানা", "km": "អាសយដ្ឋានហាង"},
    "home.storePhotoPending":    {"zh-CN": "门店照片待上传", "zh-TW": "門店照片待上傳", "en": "Store photo pending", "bn": "স্টোর ফটো মুলতুবি", "km": "រូបថតហាងកំពុងរង់ចាំ"},
    "home.soldBattery":          {"zh-CN": "已售电池", "zh-TW": "已售電池", "en": "Sold Battery", "bn": "বিক্রিত ব্যাটারি", "km": "ថ្មដែលបានលក់"},
    "home.groupsUnit":           {"zh-CN": " 组", "zh-TW": " 組", "en": " units", "bn": " ইউনিট", "km": " ឯកតា"},
    "home.storesUnit":           {"zh-CN": " 家", "zh-TW": " 家", "en": " stores", "bn": " স্টোর", "km": " ហាង"},

    # HomePage Hero + CTA
    "home.heroTagline":          {"zh-CN": "管理好每1度电。1kWh 基于区块链+IoT技术，构建东南亚最大换电网络。每一度电都能创造价值，加入绿色能源革命。", "zh-TW": "管理好每1度電。1kWh 基於區塊鏈+IoT技術，構建東南亞最大換電網絡。每一度電都能創造價值，加入綠色能源革命。", "en": "Manage every 1 kWh wisely. 1kWh builds Southeast Asia's largest battery swap network using blockchain + IoT. Every kilowatt-hour creates value — join the green energy revolution.", "bn": "প্রতি ১ কিলোওয়াট-ঘন্টা বিজ্ঞতার সাথে পরিচালনা করুন। ১kWh ব্লকচেইন + IoT ব্যবহার করে দক্ষিণ-পূর্ব এশিয়ার বৃহত্তম ব্যাটারি অদলবদল নেটওয়ার্ক তৈরি করে। প্রতি কিলোওয়াট-ঘন্টা মূল্য তৈরি করে — সবুজ শক্তি বিপ্লবে যোগ দিন।", "km": "គ្រប់គ្រងរាល់ ១ kWh ដោយឆ្លាតវៃ។ 1kWh បង្កើតបណ្តាញប្តូរថ្មធំបំផុតនៅអាស៊ីអាគ្នេយ៍ដោយប្រើ blockchain + IoT។ រាល់គីឡូវ៉ាត់ម៉ោងបង្កើតតម្លៃ — ចូលរួមបដិវត្តន៍ថាមពលបៃតង។"},
    "home.registerNow":          {"zh-CN": "立即注册", "zh-TW": "立即註冊", "en": "Register Now", "bn": "এখনই নিবন্ধন করুন", "km": "ចុះឈ្មោះឥឡូវនេះ"},
    "home.learnInvest":          {"zh-CN": "了解投资", "zh-TW": "了解投資", "en": "Learn About Investment", "bn": "বিনিয়োগ সম্পর্কে জানুন", "km": "ស្វែងយល់ពីការវិនិយោគ"},
    "home.startInvest":          {"zh-CN": "开始投资", "zh-TW": "開始投資", "en": "Start Investing", "bn": "বিনিয়োগ শুরু করুন", "km": "ចាប់ផ្តើមវិនិយោគ"},
    "home.goTrade":              {"zh-CN": "去交易市场", "zh-TW": "去交易市場", "en": "Go to Trading", "bn": "ট্রেডিংয়ে যান", "km": "ទៅកាន់ទីផ្សារ"},
    "home.activeUsers":          {"zh-CN": "活跃用户", "zh-TW": "活躍用戶", "en": "Active Users", "bn": "সক্রিয় ব্যবহারকারী", "km": "អ្នកប្រើប្រាស់សកម្ម"},
    "home.operatingStations":    {"zh-CN": "运营换电站", "zh-TW": "運營換電站", "en": "Swap Stations", "bn": "অদলবদল স্টেশন", "km": "ស្ថានីយប្តូរ"},
    "home.annualReturn":         {"zh-CN": "年化收益率", "zh-TW": "年化收益率", "en": "Annual Return", "bn": "বার্ষিক রিটার্ন", "km": "ផលចំណេញប្រចាំឆ្នាំ"},
    "home.ctaTitle":             {"zh-CN": "加入 1kWh 电池资产平台", "zh-TW": "加入 1kWh 電池資產平台", "en": "Join the 1kWh Battery Asset Platform", "bn": "১kWh ব্যাটারি সম্পদ প্ল্যাটফর্মে যোগ দিন", "km": "ចូលរួមវេទិកាទ្រព្យសម្បត្តិថ្ម 1kWh"},
    "home.ctaDesc":              {"zh-CN": "管理好每1度电，1度电也能创造价值。加入 1kWh，让每一度电都为你赚钱。", "zh-TW": "管理好每1度電，1度電也能創造價值。加入 1kWh，讓每一度電都為你賺錢。", "en": "Manage every 1 kWh wisely — even 1 kWh creates value. Join 1kWh and let every kilowatt-hour earn for you.", "bn": "প্রতি ১ কিলোওয়াট-ঘন্টা বিজ্ঞতার সাথে পরিচালনা করুন — এমনকি ১ কিলোওয়াট-ঘন্টাও মূল্য তৈরি করে। ১kWh-এ যোগ দিন এবং প্রতি কিলোওয়াট-ঘন্টা আপনার জন্য আয় করুক।", "km": "គ្រប់គ្រងរាល់ ១ kWh ដោយឆ្លាតវៃ — សូម្បីតែ ១ kWh ក៏បង្កើតតម្លៃបានដែរ។ ចូលរួម 1kWh ហើយអនុញ្ញាតឱ្យរាល់គីឡូវ៉ាត់ម៉ោងរកប្រាក់ឱ្យអ្នក។"},
    "home.freeRegister":         {"zh-CN": "免费注册", "zh-TW": "免費註冊", "en": "Free Registration", "bn": "বিনামূল্যে নিবন্ধন", "km": "ចុះឈ្មោះដោយឥតគិតថ្លៃ"},
    "home.learnMore":            {"zh-CN": "了解更多", "zh-TW": "了解更多", "en": "Learn More", "bn": "আরও জানুন", "km": "ស្វែងយល់បន្ថែម"},
    "home.enterInvestCenter":    {"zh-CN": "进入投资中心", "zh-TW": "進入投資中心", "en": "Enter Investment Center", "bn": "বিনিয়োগ কেন্দ্রে প্রবেশ করুন", "km": "ចូលមជ្ឈមណ្ឌលវិនិយោគ"},
}

# ─── Update locale files ────────────────────────────────────────────────
for lang in ["zh-CN", "zh-TW", "en", "bn", "km"]:
    filepath = os.path.join(LOCALE_DIR, f"{lang}.json")
    with open(filepath, "r", encoding="utf-8") as f:
        data = json.load(f)
    
    for key, translations in NEW_KEYS.items():
        data[key] = translations[lang]
    
    # Sort keys for consistency (existing keys first, new keys at end)
    new_data = {}
    for k in data:
        new_data[k] = data[k]
    
    with open(filepath, "w", encoding="utf-8") as f:
        json.dump(new_data, f, ensure_ascii=False, indent=2)
        f.write("\n")
    
    print(f"Updated {lang}.json: {len(NEW_KEYS)} new keys added (total: {len(data)} keys)")

print("\n=== Locale files updated ===")
