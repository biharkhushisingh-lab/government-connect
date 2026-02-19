'use client';
import { useEffect, useState } from 'react';
import axios from 'axios';
import { Bar, Pie } from 'react-chartjs-2';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend,
    ArcElement
} from 'chart.js';

ChartJS.register(
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend,
    ArcElement
);

const API_URL = 'http://localhost:5000/api';

export default function AdminDashboard() {
    const [stats, setStats] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const token = localStorage.getItem('token');
                const res = await axios.get(`${API_URL}/dashboard/stats`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                setStats(res.data);
            } catch (err) {
                console.error("Failed to fetch dashboard stats", err);
            } finally {
                setLoading(false);
            }
        };

        fetchStats();
    }, []);

    if (loading) return <div className="p-8">Loading Dashboard...</div>;
    if (!stats) return <div className="p-8 text-red-500">Access Denied or Error Loading Data</div>;

    const barData = {
        labels: ['Projects', 'Active', 'Suspended Contractors'],
        datasets: [
            {
                label: 'System Metrics',
                data: [stats.totalProjects, stats.activeProjects, stats.suspendedContractors],
                backgroundColor: 'rgba(53, 162, 235, 0.5)',
            },
        ],
    };

    const pieData = {
        labels: ['Active Contractors', 'Suspended', 'High Risk'],
        datasets: [
            {
                data: [
                    stats.totalContractors - stats.suspendedContractors,
                    stats.suspendedContractors,
                    stats.highRiskContractors.length
                ],
                backgroundColor: [
                    'rgba(75, 192, 192, 0.2)',
                    'rgba(255, 99, 132, 0.2)',
                    'rgba(255, 206, 86, 0.2)',
                ],
                borderColor: [
                    'rgba(75, 192, 192, 1)',
                    'rgba(255, 99, 132, 1)',
                    'rgba(255, 206, 86, 1)',
                ],
                borderWidth: 1,
            },
        ],
    };

    return (
        <div className="p-8 bg-gray-50 min-h-screen">
            <h1 className="text-3xl font-bold mb-8 text-gray-800">🏛️ Government Oversight Dashboard</h1>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-blue-500">
                    <h3 className="text-gray-500 text-sm font-semibold">Total Projects</h3>
                    <p className="text-3xl font-bold mt-2">{stats.totalProjects}</p>
                </div>
                <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-red-500">
                    <h3 className="text-gray-500 text-sm font-semibold">Fraud Flags Today</h3>
                    <p className="text-3xl font-bold mt-2 text-red-600">{stats.fraudFlagsToday}</p>
                </div>
                <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-orange-500">
                    <h3 className="text-gray-500 text-sm font-semibold">Rejected Milestones</h3>
                    <p className="text-3xl font-bold mt-2">{stats.milestonesRejected}</p>
                </div>
                <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-gray-800">
                    <h3 className="text-gray-500 text-sm font-semibold">Suspended Contractors</h3>
                    <p className="text-3xl font-bold mt-2">{stats.suspendedContractors}</p>
                </div>
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
                <div className="bg-white p-6 rounded-lg shadow-md">
                    <h3 className="text-xl font-bold mb-4">System Overview</h3>
                    <Bar data={barData} />
                </div>
                <div className="bg-white p-6 rounded-lg shadow-md">
                    <h3 className="text-xl font-bold mb-4">Contractor Health</h3>
                    <div className="w-1/2 mx-auto">
                        <Pie data={pieData} />
                    </div>
                </div>
            </div>

            {/* High Risk Table */}
            <div className="bg-white rounded-lg shadow-md overflow-hidden">
                <div className="bg-red-50 p-4 border-b border-red-100">
                    <h3 className="text-lg font-bold text-red-800">⚠️ High Risk Contractors (Score &lt; 50)</h3>
                </div>
                <table className="w-full text-left">
                    <thead>
                        <tr className="bg-gray-100 text-gray-600 uppercase text-sm leading-normal">
                            <th className="py-3 px-6">ID</th>
                            <th className="py-3 px-6">Name</th>
                            <th className="py-3 px-6">Score</th>
                            <th className="py-3 px-6">Action</th>
                        </tr>
                    </thead>
                    <tbody className="text-gray-600 text-sm font-light">
                        {stats.highRiskContractors.map((c) => (
                            <tr key={c.contractorId} className="border-b border-gray-200 hover:bg-gray-100">
                                <td className="py-3 px-6 whitespace-nowrap font-medium">{c.contractorId}</td>
                                <td className="py-3 px-6">{c.User ? c.User.name : 'Unknown'}</td>
                                <td className="py-3 px-6 font-bold text-red-600">{c.totalScore}</td>
                                <td className="py-3 px-6">
                                    <span className="bg-red-200 text-red-600 py-1 px-3 rounded-full text-xs">Unsafe</span>
                                </td>
                            </tr>
                        ))}
                        {stats.highRiskContractors.length === 0 && (
                            <tr>
                                <td colSpan="4" className="py-4 text-center text-gray-500">No high risk contractors found.</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
