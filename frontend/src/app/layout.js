'use client';

import './../styles/globals.css';
import { Inter } from 'next/font/google';
import { AuthProvider } from '../contexts/AuthContext';
import Navbar from '../components/Navbar';

const inter = Inter({ subsets: ['latin'] });

export default function RootLayout({ children }) {
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
                <p>© 2025 1kwh.store &amp; MTX Motors. All rights reserved.</p>
              </div>
            </footer>
          </div>
        </AuthProvider>
      </body>
    </html>
  );
}
