'use client';
import { useEffect, useState } from 'react';
import axios from 'axios';

const API_URL = 'http://localhost:5000/api';

export default function LeaderboardPage() {
    const [contractors, setContractors] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchLeaderboard = async () => {
            try {
                const res = await axios.get(`${API_URL}/dashboard/leaderboard`);
                setContractors(res.data);
            } catch (err) {
                console.error("Failed to fetch leaderboard", err);
            } finally {
                setLoading(false);
            }
        };

        fetchLeaderboard();
    }, []);

    if (loading) return <div className="p-8">Loading Leaderboard...</div>;

    return (
        <div className="p-8 bg-gray-50 min-h-screen">
            <div className="max-w-6xl mx-auto">
                <h1 className="text-3xl font-bold mb-2 text-gray-800 text-center">🏆 Contractor Transparency Leaderboard</h1>
                <p className="text-gray-500 mb-8 text-center">Real-time public ranking based on performance, compliance, and anti-fraud metrics.</p>

                <div className="bg-white rounded-lg shadow-xl overflow-hidden">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-blue-600 text-white uppercase text-sm leading-normal">
                                <th className="py-4 px-6">Rank</th>
                                <th className="py-4 px-6">Contractor Name</th>
                                <th className="py-4 px-6">Trust Score</th>
                                <th className="py-4 px-6 text-center">Completion Rate</th>
                                <th className="py-4 px-6 text-center">Fraud Flags</th>
                                <th className="py-4 px-6 text-center">Status</th>
                            </tr>
                        </thead>
                        <tbody className="text-gray-700 text-sm font-light">
                            {contractors.map((c, index) => {
                                let rankBadge = null;
                                if (index === 0) rankBadge = '🥇';
                                if (index === 1) rankBadge = '🥈';
                                if (index === 2) rankBadge = '🥉';

                                return (
                                    <tr key={index} className="border-b border-gray-200 hover:bg-gray-50 transition duration-150">
                                        <td className="py-4 px-6 whitespace-nowrap">
                                            <span className="font-bold text-lg mr-2">{index + 1}</span>
                                            {rankBadge}
                                        </td>
                                        <td className="py-4 px-6 font-medium text-gray-900">{c.contractor}</td>
                                        <td className="py-4 px-6">
                                            <div className="flex items-center">
                                                <div className="w-full bg-gray-200 rounded-full h-2.5 mr-2 max-w-[100px]">
                                                    <div className={`h-2.5 rounded-full ${c.score >= 80 ? 'bg-green-500' : c.score >= 50 ? 'bg-yellow-400' : 'bg-red-500'}`} style={{ width: `${c.score}%` }}></div>
                                                </div>
                                                <span className="font-bold">{c.score}</span>
                                            </div>
                                        </td>
                                        <td className="py-4 px-6 text-center">{c.completionRate}%</td>
                                        <td className="py-4 px-6 text-center">
                                            {c.fraudFlags === 0 ? (
                                                <span className="text-green-500 font-bold">0</span>
                                            ) : (
                                                <span className="bg-red-100 text-red-600 py-1 px-3 rounded-full font-bold">{c.fraudFlags}</span>
                                            )}
                                        </td>
                                        <td className="py-4 px-6 text-center">
                                            {c.score >= 50 ? (
                                                <span className="bg-green-100 text-green-700 py-1 px-3 rounded-full text-xs font-bold">Good Standing</span>
                                            ) : (
                                                <span className="bg-red-100 text-red-700 py-1 px-3 rounded-full text-xs font-bold">At Risk</span>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
