'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '../contexts/AuthContext';
import { Menu, X, User, LogOut } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import LanguageSwitcher from './LanguageSwitcher';

export default function Navbar() {
  const { t } = useTranslation();
  const { user, logout, isAdmin, isFranchisee, isProvinceAgent, canAccessAdmin } = useAuth();
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navLinks = [
    { href: '/', label: t('nav.home'), en: 'Home', all: true },
    { href: '/invest', label: t('nav.invest'), en: 'Invest', roles: ['admin', 'operator', 'investor'] },
    { href: '/stores', label: t('nav.stores'), en: 'Stores', roles: ['admin', 'operator', 'investor', 'franchisee'] },
  ];

  // Filter links by role
  const visibleLinks = navLinks.filter(link => {
    if (link.all) return true;
    if (!user) return false;
    return link.roles.includes(user.role);
  });

  // Admin link for admin/operator
  if (canAccessAdmin()) {
    visibleLinks.push({ href: '/admin', label: t('nav.admin'), en: 'Admin', roles: ['admin', 'operator'] });
  }

  // Franchisee link
  if (isFranchisee()) {
    visibleLinks.push({ href: '/franchisee', label: t('nav.franchisee'), en: 'Franchisee', roles: ['franchisee'] });
  }

  return (
    <nav className="bg-white border-b border-gray-100 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex justify-between items-center h-16">
          <Link href="/" className="flex items-center space-x-2.5">
            <img src="/logo.png" alt="MTX MOTORS" className="h-8 w-8 object-contain" />
            <div className="inline-flex flex-col items-stretch leading-none">
              <span className="font-extrabold text-[13px] text-gray-900 tracking-[0.2em] text-center block">MTX MOTORS</span>
              <span className="text-[13px] text-gray-400 tracking-[0.2em] font-medium text-center block">1kwh.store</span>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            {visibleLinks.map((link) => (
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

          {/* Language & Auth */}
          <div className="hidden md:flex items-center space-x-4">
            <LanguageSwitcher />
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
                  <span className="text-sm">{t('nav.logout')}</span>
                </button>
              </div>
            ) : (
              <div className="flex items-center space-x-3">
                <Link href="/login" className="text-sm text-gray-600 hover:text-gray-900">
                  {t('nav.login')}
                </Link>
                <Link href="/register" className="btn-primary text-sm">
                  {t('nav.register')}
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
              <div className="pb-3 mb-1 border-b border-gray-100">
                <LanguageSwitcher />
              </div>
              {visibleLinks.map((link) => (
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
                    {t('nav.profile')}
                  </Link>
                  <button onClick={logout} className="text-sm text-left text-gray-600">
                    {t('nav.logoutFull')}
                  </button>
                </>
              ) : (
                <>
                  <Link href="/login" className="text-sm text-gray-600" onClick={() => setMobileMenuOpen(false)}>
                    {t('nav.login')}
                  </Link>
                  <Link href="/register" className="text-sm text-gray-600" onClick={() => setMobileMenuOpen(false)}>
                    {t('nav.register')}
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
