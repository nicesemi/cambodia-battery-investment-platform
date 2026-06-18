'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '../contexts/AuthContext';
import { Battery, Menu, X, User, LogOut } from 'lucide-react';
import { useState } from 'react';

export default function Navbar() {
  const { user, logout, isAdmin } = useAuth();
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navLinks = [
    { href: '/', label: '首页', en: 'Home' },
    { href: '/invest', label: '投资', en: 'Invest' },
    { href: '/trade', label: '交易', en: 'Trade' },
    { href: '/dividends', label: '分红', en: 'Dividends' },
  ];

  if (isAdmin()) {
    navLinks.push({ href: '/admin', label: '管理', en: 'Admin' });
  }

  return (
    <nav className="bg-white border-b border-gray-100 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex justify-between items-center h-16">
          <Link href="/" className="flex items-center space-x-2">
            <Battery className="h-8 w-8 text-primary-600" />
            <span className="font-bold text-xl text-gray-900">BatteryBank</span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`text-sm font-medium transition-colors ${
                  pathname === link.href
                    ? 'text-primary-600'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* Auth Buttons */}
          <div className="hidden md:flex items-center space-x-4">
            {user ? (
              <div className="flex items-center space-x-4">
                <Link href="/profile" className="flex items-center space-x-2 text-gray-600 hover:text-gray-900">
                  <User className="h-5 w-5" />
                  <span className="text-sm">{user.username}</span>
                </Link>
                <button
                  onClick={logout}
                  className="flex items-center space-x-1 text-gray-500 hover:text-gray-700"
                >
                  <LogOut className="h-4 w-4" />
                  <span className="text-sm">退出</span>
                </button>
              </div>
            ) : (
              <div className="flex items-center space-x-3">
                <Link href="/login" className="text-sm text-gray-600 hover:text-gray-900">
                  登录
                </Link>
                <Link href="/register" className="btn-primary text-sm">
                  注册
                </Link>
              </div>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden p-2"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden py-4 border-t border-gray-100">
            <div className="flex flex-col space-y-3">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`text-sm font-medium ${
                    pathname === link.href ? 'text-primary-600' : 'text-gray-600'
                  }`}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {link.label}
                </Link>
              ))}
              {user ? (
                <>
                  <Link href="/profile" className="text-sm text-gray-600" onClick={() => setMobileMenuOpen(false)}>
                    个人中心
                  </Link>
                  <button onClick={logout} className="text-sm text-left text-gray-600">
                    退出登录
                  </button>
                </>
              ) : (
                <>
                  <Link href="/login" className="text-sm text-gray-600" onClick={() => setMobileMenuOpen(false)}>
                    登录
                  </Link>
                  <Link href="/register" className="text-sm text-gray-600" onClick={() => setMobileMenuOpen(false)}>
                    注册
                  </Link>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
