'use client';

import { useEffect, useState } from 'react';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { motion } from 'framer-motion';
import api from '../../../services/api/client';

function generateMockData(days: number) {
  return Array.from({ length: days }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (days - 1 - i));
    return {
      date:     d.toLocaleDateString('en', { month: 'short', day: 'numeric' }),
      orders:   Math.floor(Math.random() * 120 + 30),
      revenue:  Math.floor(Math.random() * 3000 + 800),
      newUsers: Math.floor(Math.random() * 40 + 5),
      xpAwarded:Math.floor(Math.random() * 5000 + 1000),
    };
  });
}

const PIE_DATA = [
  { name: 'Direct',    value: 42, color: '#ff6b35' },
  { name: 'Challenge', value: 28, color: '#f59e0b' },
  { name: 'Referral',  value: 18, color: '#10b981' },
  { name: 'Spin',      value: 12, color: '#8b5cf6' },
];

export default function AdminAnalyticsPage() {
  const [data30] = useState(() => generateMockData(30));

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl sm:text-2xl font-display font-bold text-gray-900 dark:text-gray-100">Analytics</h1>
        <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">Last 30 days overview</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card p-5">
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">Daily Orders</h2>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={data30}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="date" tick={{ fontSize: 10 }} interval={4} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip />
              <Bar dataKey="orders" fill="#ff6b35" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="card p-5">
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">Revenue Trend</h2>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={data30}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="date" tick={{ fontSize: 10 }} interval={4} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip />
              <Line type="monotone" dataKey="revenue" stroke="#f59e0b" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="card p-5">
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">New Users Daily</h2>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={data30}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="date" tick={{ fontSize: 10 }} interval={4} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip />
              <Bar dataKey="newUsers" fill="#10b981" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="card p-5">
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">Order Sources</h2>
          <div className="flex items-center gap-6">
            <ResponsiveContainer width={160} height={160}>
              <PieChart>
                <Pie data={PIE_DATA} cx="50%" cy="50%" innerRadius={45} outerRadius={70} dataKey="value">
                  {PIE_DATA.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-2 flex-1">
              {PIE_DATA.map((d) => (
                <div key={d.name} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: d.color }} />
                    <span className="text-gray-600 dark:text-gray-400">{d.name}</span>
                  </div>
                  <span className="font-semibold text-gray-900 dark:text-gray-100">{d.value}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
