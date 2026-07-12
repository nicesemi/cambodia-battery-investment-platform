-- 迁移 V10: 历史数据补录 — 为已有 user_assets 但缺失 investor_battery_units 的用户补录电池明细
-- 日期: 2026-07-13
-- 场景: 交易撮合(matchOrders)历史上只更新了 user_assets.units，未创建 battery_units + investor_battery_units
-- 影响: 我的资产明细、分红明细、电池匹配检测中缺少独立的电池编号记录

BEGIN;

DO $$
DECLARE
    rec RECORD;
    existing_count INT;
    missing INT;
    i INT;
    v_code TEXT;
    new_unit_id UUID;
BEGIN
    FOR rec IN
        SELECT
            a.user_id,
            a.asset_id,
            a.units,
            a.average_cost,
            ba.asset_code
        FROM user_assets a
        JOIN battery_assets ba ON ba.id = a.asset_id
        WHERE a.units > 0
    LOOP
        SELECT COUNT(*) INTO existing_count
        FROM investor_battery_units ibu
        JOIN battery_units bu ON bu.id = ibu.battery_unit_id
        WHERE ibu.investor_id = rec.user_id
          AND ibu.battery_asset_id = rec.asset_id
          AND bu.status = 'sold';

        missing := rec.units - existing_count;

        IF missing > 0 THEN
            RAISE NOTICE '补录: user=%, asset=%, 已有=%, 需要=%, 缺失=%',
                rec.user_id, rec.asset_code, existing_count, rec.units, missing;

            FOR i IN 1..missing LOOP
                v_code := rec.asset_code
                    || '-BAK-'
                    || TO_CHAR(NOW(), 'YYMMDD')
                    || '-'
                    || i
                    || '-'
                    || SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 6);

                INSERT INTO battery_units (
                    battery_asset_id, unit_code, status, investor_id,
                    created_at, updated_at
                ) VALUES (
                    rec.asset_id, v_code, 'sold', rec.user_id,
                    NOW(), NOW()
                )
                ON CONFLICT (unit_code) DO NOTHING
                RETURNING id INTO new_unit_id;

                IF new_unit_id IS NOT NULL THEN
                    INSERT INTO investor_battery_units (
                        investor_id, battery_unit_id, battery_asset_id,
                        purchase_price, purchased_at
                    ) VALUES (
                        rec.user_id, new_unit_id, rec.asset_id,
                        COALESCE(rec.average_cost, 0), NOW()
                    )
                    ON CONFLICT (investor_id, battery_unit_id) DO NOTHING;
                END IF;

                new_unit_id := NULL;
            END LOOP;
        END IF;
    END LOOP;

    RAISE NOTICE '=== 历史数据补录完成 ===';
END $$;

SELECT
    a.user_id,
    ba.asset_code,
    a.units AS 持有数量,
    COUNT(DISTINCT ibu.battery_unit_id) AS 电池明细数,
    CASE WHEN a.units = COUNT(DISTINCT ibu.battery_unit_id) THEN '✓' ELSE '✗ 不一致' END AS 状态
FROM user_assets a
JOIN battery_assets ba ON ba.id = a.asset_id
LEFT JOIN investor_battery_units ibu ON ibu.investor_id = a.user_id AND ibu.battery_asset_id = a.asset_id
LEFT JOIN battery_units bu ON bu.id = ibu.battery_unit_id AND bu.status = 'sold'
WHERE a.units > 0
GROUP BY a.user_id, a.asset_id, ba.asset_code, a.units
ORDER BY a.user_id, ba.asset_code;

COMMIT;
