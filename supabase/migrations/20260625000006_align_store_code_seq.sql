-- 对齐 store_code_seq：将序列推进到表中实际最大编码，消除手动路径造成的序列落后
-- 根因：Admin 手动创建门店时自行计算编码（路径B），不推进序列；后续触发器分配时可能产生冲突
-- 修复后：Admin POST 不再显式传 store_code，统一走触发器路径
SELECT setval('store_code_seq', COALESCE(
  (SELECT MAX(CAST(SUBSTRING(store_code FROM 'STORE-(\d+)') AS INTEGER))
   FROM franchisee_stores
   WHERE store_code IS NOT NULL),
  0
));
