'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createProject } from '@/utils/data';

export default function CreateProjectPage() {
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [budget, setBudget] = useState('');
    const [deadline, setDeadline] = useState('');
    const [location, setLocation] = useState('');
    const [error, setError] = useState('');
    const router = useRouter();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await createProject({ title, description, budget, deadline, location });
            router.push('/dashboard/gov');
        } catch (err) {
            setError('Failed to create project');
        }
    };

    return (
        <div className="min-h-screen bg-gray-100 p-8">
            <div className="max-w-2xl mx-auto bg-white p-8 rounded shadow">
                <h2 className="text-2xl font-bold mb-6">Create New Project</h2>
                {error && <div className="text-red-500 mb-4">{error}</div>}
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-gray-700">Project Title</label>
                        <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} required className="w-full border p-2 rounded" />
                    </div>
                    <div>
                        <label className="block text-gray-700">Description</label>
                        <textarea value={description} onChange={(e) => setDescription(e.target.value)} required className="w-full border p-2 rounded" />
                    </div>
                    <div>
                        <label className="block text-gray-700">Budget ($)</label>
                        <input type="number" value={budget} onChange={(e) => setBudget(e.target.value)} required className="w-full border p-2 rounded" />
                    </div>
                    <div>
                        <label className="block text-gray-700">Deadline</label>
                        <input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} required className="w-full border p-2 rounded" />
                    </div>
                    <div>
                        <label className="block text-gray-700">Location</label>
                        <input type="text" value={location} onChange={(e) => setLocation(e.target.value)} required className="w-full border p-2 rounded" />
                    </div>
                    <button type="submit" className="w-full bg-indigo-600 text-white p-2 rounded hover:bg-indigo-700">Post Project</button>
                </form>
            </div>
        </div>
    );
}
