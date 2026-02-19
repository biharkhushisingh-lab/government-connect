'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link'; // Added import for Link
import { getCurrentUser, logout } from '@/utils/auth';

// Added User interface
interface User {
    name: string;
    role: string;
}

export default function GovDashboard() {
    const [user, setUser] = useState<User | null>(null); // Updated useState with User type
    const router = useRouter();

    useEffect(() => {
        const currentUser = getCurrentUser();
        if (!currentUser || currentUser.role !== 'GOVERNMENT') {
            router.push('/login');
        } else {
            setUser(currentUser);
        }
    }, [router]);

    if (!user) return <div>Loading...</div>;

    return (
        <div className="flex min-h-screen bg-gray-100">
            {/* Sidebar */}
            <div className="w-64 bg-indigo-900 text-white shadow-xl">
                <div className="p-6 text-2xl font-bold">GovPortal</div>
                <nav className="mt-6">
                    <a href="#" className="block px-6 py-3 bg-indigo-800 border-l-4 border-white">Dashboard</a>
                    {/* Changed <a> to Link */}
                    <Link href="/projects/create" className="block px-6 py-3 hover:bg-indigo-800 transition">Create Project</Link>
                    <a href="#" className="block px-6 py-3 hover:bg-indigo-800 transition">Verify Milestones</a>
                    <a href="#" className="block px-6 py-3 hover:bg-indigo-800 transition">Contractor Audit</a>
                </nav>
            </div>

            {/* Main Content */}
            <div className="flex-1 overflow-y-auto">
                <header className="flex justify-between items-center p-6 bg-white shadow-sm">
                    <h1 className="text-2xl font-semibold text-gray-800">Government Dashboard</h1>
                    <div className="flex items-center space-x-4">
                        <span className="text-gray-600">Welcome, {user.name}</span>
                        <button onClick={logout} className="px-4 py-2 text-sm text-red-600 border border-red-600 rounded hover:bg-red-50">Logout</button>
                    </div>
                </header>

                <main className="p-8">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                        <div className="bg-white p-6 rounded-lg shadow border-t-4 border-indigo-500">
                            <h3 className="text-gray-500 text-sm uppercase">Active Projects</h3>
                            <p className="text-3xl font-bold text-gray-800 mt-2">12</p>
                        </div>
                        <div className="bg-white p-6 rounded-lg shadow border-t-4 border-green-500">
                            <h3 className="text-gray-500 text-sm uppercase">Pending Approvals</h3>
                            <p className="text-3xl font-bold text-gray-800 mt-2">5</p>
                        </div>
                        <div className="bg-white p-6 rounded-lg shadow border-t-4 border-yellow-500">
                            <h3 className="text-gray-500 text-sm uppercase">Flagged Risks</h3>
                            <p className="text-3xl font-bold text-gray-800 mt-2">2</p>
                        </div>
                    </div>

                    <div className="bg-white rounded-lg shadow overflow-hidden">
                        <div className="px-6 py-4 border-b border-gray-200">
                            <h3 className="text-lg font-semibold text-gray-800">Recent Applications</h3>
                        </div>
                        <div className="p-6">
                            <p className="text-gray-500 italic">No recent applications found.</p>
                        </div>
                    </div>
                </main>
            </div>
        </div>
    );
}
