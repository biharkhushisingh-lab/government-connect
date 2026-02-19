'use client';

import { useEffect, useState } from 'react';
import { getProjects } from '@/utils/data';
import Link from 'next/link';

interface Project {
    id: number;
    title: string;
    description: string;
    budget: string;
    status: string;
}

export default function ProjectListPage() {
    const [projects, setProjects] = useState<Project[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchProjects = async () => {
            try {
                const data = await getProjects();
                setProjects(data);
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        fetchProjects();
    }, []);

    if (loading) return <div className="p-8">Loading available tenders...</div>;

    return (
        <div className="min-h-screen bg-gray-100 p-8">
            <h1 className="text-3xl font-bold mb-8">Available Tenders</h1>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {projects.map((project) => (
                    <div key={project.id} className="bg-white p-6 rounded shadow hover:shadow-lg transition">
                        <div className="flex justify-between items-start mb-4">
                            <h3 className="text-xl font-bold">{project.title}</h3>
                            <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded">{project.status}</span>
                        </div>
                        <p className="text-gray-600 mb-4 line-clamp-3">{project.description}</p>
                        <div className="text-lg font-bold text-indigo-600 mb-4">${project.budget}</div>
                        <Link href={`/projects/${project.id}`} className="block text-center w-full bg-gray-900 text-white py-2 rounded">
                            View Details & Bid
                        </Link>
                    </div>
                ))}
            </div>
        </div>
    );
}
