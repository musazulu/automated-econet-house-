import React from 'react';
import { DataService } from '../services/dataService';
import { formatCurrency } from '../utils/dateUtils';
import { Briefcase, Users, Phone, Mail, MapPin, Award } from 'lucide-react';

export const TeamsManagement: React.FC = () => {
  const consultants = DataService.getConsultants();
  const allBas = DataService.getBAs();

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5">
        <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
          <Briefcase className="w-5 h-5 text-blue-600" />
          Sales Consultants & Territory Teams
        </h2>
        <p className="text-xs text-slate-500">
          Management hierarchy, territory assignments, and supervisory oversight for Econet sales forces.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {consultants.map(c => {
          const assignedBas = allBas.filter(b => b.salesConsultantId === c.id);
          const activeCount = assignedBas.filter(b => b.status === 'active').length;

          return (
            <div
              key={c.id}
              className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <span className="font-mono text-xs font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded">
                      {c.id}
                    </span>
                    <h3 className="text-lg font-bold text-slate-900 mt-2">{c.name}</h3>
                    <p className="text-xs text-blue-600 font-semibold">{c.teamName}</p>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold text-base shadow-sm">
                    {c.name.charAt(0)}
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 space-y-2 text-xs text-slate-600">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-slate-400 shrink-0" />
                    <span>{c.region}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-slate-400 shrink-0" />
                    <span className="font-mono">{c.email}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4 text-slate-400 shrink-0" />
                    <span className="font-mono">{c.phone}</span>
                  </div>
                </div>

                <div className="mt-4 p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500">Supervised Force:</span>
                    <span className="font-bold text-slate-900">
                      {activeCount} Active / {assignedBas.length} BAs
                    </span>
                  </div>
                </div>

                {/* Subordinate BAs List */}
                <div className="mt-4">
                  <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                    Assigned Brand Ambassadors:
                  </h4>
                  <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                    {assignedBas.map(b => (
                      <div
                        key={b.id}
                        className="p-2 bg-slate-50 hover:bg-blue-50/50 rounded-lg border border-slate-100 flex items-center justify-between text-xs transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          <img
                            src={b.photoUrl}
                            alt={b.fullName}
                            className="w-6 h-6 rounded-full object-cover"
                          />
                          <div>
                            <span className="font-semibold text-slate-800">{b.fullName}</span>
                            <span className="text-[10px] text-slate-400 block">{b.baId}</span>
                          </div>
                        </div>
                        <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-slate-200 text-slate-700">
                          {b.category}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
