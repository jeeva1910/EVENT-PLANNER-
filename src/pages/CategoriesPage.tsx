import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Layers, ArrowRight, Calendar } from 'lucide-react';
import { api } from '../services/api';
import { ICategory } from '../types';

export const CategoriesPage: React.FC = () => {
  const [categories, setCategories] = useState<ICategory[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        const res = await api.getCategories();
        setCategories(res.categories);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      <div>
        <h1 className="text-3xl font-extrabold text-slate-900 font-display">
          Event Categories & Communities
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          Browse specialized sectors ranging from technical hackathons to collegiate cultural fests
        </p>
      </div>

      {loading ? (
        <div className="py-16 text-center text-xs text-slate-500">Loading categories...</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {categories.map((cat) => (
            <Link
              key={cat._id}
              to={`/explore?category=${encodeURIComponent(cat.name)}`}
              className="p-6 bg-white rounded-3xl border border-slate-200 hover:border-slate-300 hover:shadow-lg transition-all group flex flex-col justify-between"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span
                    className="w-4 h-4 rounded-full shadow-2xs"
                    style={{ backgroundColor: cat.color }}
                  ></span>
                  <span className="text-xs font-mono font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md tabular-nums">
                    {cat.eventCount || 0} Events
                  </span>
                </div>

                <h3 className="text-lg font-bold text-slate-900 group-hover:text-blue-600 transition-colors font-display">
                  {cat.name}
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">{cat.description}</p>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-blue-600">
                <span>Explore {cat.name}</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};
