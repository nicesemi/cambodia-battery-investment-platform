'use client';

import '@/i18n';
import './../styles/globals.css';
import { Inter } from 'next/font/google';
import { useTranslation } from 'react-i18next';
import { AuthProvider } from '../contexts/AuthContext';
import Navbar from '../components/Navbar';

const inter = Inter({ subsets: ['latin'] });

export default function RootLayout({ children }) {
  const { t } = useTranslation();
  return (
    <html lang="en">
      <body className={inter.className}>
        <AuthProvider>
          <div className="min-h-screen flex flex-col">
            <Navbar />
            <main className="flex-1">
              {children}
            </main>
            <footer className="bg-gray-50 border-t border-gray-100 py-8">
              <div className="max-w-7xl mx-auto px-4 text-center text-gray-500 text-sm">
                <div className="flex justify-center gap-8 flex-wrap mb-3">
                  <span>{t('common.customerService')}：<a href="mailto:contact@1kwh.store" className="text-blue-600 hover:underline">contact@1kwh.store</a></span>
                  <span>{t('common.franchise')}：<a href="mailto:agent@1kwh.store" className="text-blue-600 hover:underline">agent@1kwh.store</a></span>
                </div>
                <p>© 2026 MTX Motors &amp; 1kWh.Store All rights reserved.</p>
              </div>
            </footer>
          </div>
        </AuthProvider>
      </body>
    </html>
  );
}
