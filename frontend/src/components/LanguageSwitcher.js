'use client';

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

const LANGUAGES = [
  { code: 'zh-CN', label: '简体中文' },
  { code: 'zh-TW', label: '繁體中文' },
  { code: 'en', label: 'English' },
  { code: 'bn', label: 'বাংলা' },
  { code: 'km', label: 'ភាសាខ្មែរ' },
];

export default function LanguageSwitcher() {
  const { i18n } = useTranslation();
  const [current, setCurrent] = useState('zh-CN');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const saved = localStorage.getItem('i18nextLng');
    if (saved && LANGUAGES.some(l => l.code === saved)) {
      i18n.changeLanguage(saved);
      setCurrent(saved);
    }
  }, [i18n]);

  if (!mounted) {
    return (
      <select className="text-sm border border-gray-300 rounded-lg px-2 py-1 bg-transparent text-gray-700 cursor-pointer">
        <option value="zh-CN">简体中文</option>
      </select>
    );
  }

  const handleChange = (e) => {
    const lng = e.target.value;
    i18n.changeLanguage(lng);
    setCurrent(lng);
    localStorage.setItem('i18nextLng', lng);
  };

  return (
    <select
      value={current}
      onChange={handleChange}
      className="text-sm border border-gray-300 rounded-lg px-2 py-1 bg-transparent text-gray-700 cursor-pointer"
    >
      {LANGUAGES.map(l => (
        <option key={l.code} value={l.code}>{l.label}</option>
      ))}
    </select>
  );
}
