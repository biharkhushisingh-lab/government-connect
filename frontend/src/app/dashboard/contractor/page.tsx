'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getCurrentUser, logout } from '@/utils/auth';

interface User {
    name: string;
    role: string;
}

export default function ContractorDashboard() {
    const [user, setUser] = useState<User | null>(null);
    const router = useRouter();

    useEffect(() => {
        const currentUser = getCurrentUser();
        if (!currentUser || currentUser.role !== 'CONTRACTOR') {
            router.push('/login');
        } else {
            setUser(currentUser);
        }
    }, [router]);

    if (!user) return <div>Loading...</div>;

    return (
        <div className="flex min-h-screen bg-gray-100">
            {/* Sidebar */}
            <div className="w-64 bg-gray-900 text-white shadow-xl">
                <div className="p-6 text-2xl font-bold text-green-400">BuilderPro</div>
                <nav className="mt-6">
                    <a href="#" className="block px-6 py-3 bg-gray-800 border-l-4 border-green-500">Dashboard</a>
                    <a href="#" className="block px-6 py-3 hover:bg-gray-800 transition">Find Tenders</a>
                    <a href="#" className="block px-6 py-3 hover:bg-gray-800 transition">My Bids</a>
                    <a href="#" className="block px-6 py-3 hover:bg-gray-800 transition">Upload Progress</a>
                </nav>
            </div>

            {/* Main Content */}
            <div className="flex-1 overflow-y-auto">
                <header className="flex justify-between items-center p-6 bg-white shadow-sm">
                    <h1 className="text-2xl font-semibold text-gray-800">Contractor Dashboard</h1>
                    <div className="flex items-center space-x-4">
                        <div className="text-right">
                            <span className="block text-gray-800 font-medium">{user.name}</span>
                            <span className="block text-xs text-green-600 font-bold">Score: 95/100</span>
                        </div>
                        <button onClick={logout} className="px-4 py-2 text-sm text-red-600 border border-red-600 rounded hover:bg-red-50">Logout</button>
                    </div>
                </header>

                <main className="p-8">
                    <div className="bg-white rounded-lg shadow border border-gray-200 p-6 mb-8">
                        <h2 className="text-xl font-bold mb-4">Credibility Score Analysis</h2>
                        <div className="w-full bg-gray-200 rounded-full h-4">
                            <div className="bg-green-500 h-4 rounded-full" style={{ width: '95%' }}></div>
                        </div>
                        <p className="mt-2 text-sm text-gray-600">Your score is excellent. You are eligible for Tier-1 Government Projects.</p>
                    </div>

                    <div className="hidden grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Placeholders for charts/graphs */}
                    </div>
                </main>
            </div>
        </div>
    );
}
