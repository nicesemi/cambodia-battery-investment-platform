'use client';

import Script from 'next/script';

export default function AmapLoader() {
  const key = process.env.NEXT_PUBLIC_AMAP_KEY || '';
  if (!key) {
    console.warn('高德地图 Key 未配置，请设置 NEXT_PUBLIC_AMAP_KEY 环境变量');
    return null;
  }
  return (
    <Script
      src={`https://webapi.amap.com/maps?v=2.0&key=${key}`}
      strategy="afterInteractive"
    />
  );
}
