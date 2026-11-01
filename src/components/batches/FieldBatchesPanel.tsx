import React from 'react';
import { useData } from '../../context/DataContext';

/**
 * Harvest batches recorded by field agents in the Android app.
 * The list comes from the server; this panel only shows it. It shows nothing it was not given.
 */
export const FieldBatchesPanel: React.FC = () => {
  const { fieldBatches } = useData();

  return (
    <section className="bg-white dark:bg-[#1A2E23] rounded-xl border border-[#E5EBE7] dark:border-[#2D4536] shadow-warm-card overflow-hidden">
      <header className="px-4 py-3 border-b border-[#E5EBE7] dark:border-[#2D4536]">
        <h2 className="text-sm font-semibold text-[#1A2E23] dark:text-white">
          Field batches from agents ({fieldBatches.length})
        </h2>
        <p className="text-xs text-[#5A6B60] dark:text-[#A1B3A7]">
          Recorded in the Android app. Grades are as recorded by the agent and have not been reviewed here.
        </p>
      </header>

      {fieldBatches.length === 0 ? (
        <p className="px-4 py-6 text-xs text-[#5A6B60] dark:text-[#A1B3A7]">
          No batches have been synced from the field yet.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="text-[#5A6B60] dark:text-[#A1B3A7]">
              <tr>
                <th className="px-4 py-2 font-medium">Batch code</th>
                <th className="px-4 py-2 font-medium">Agent</th>
                <th className="px-4 py-2 font-medium">Weight (kg)</th>
                <th className="px-4 py-2 font-medium">Grade (agent-recorded)</th>
                <th className="px-4 py-2 font-medium">Linked farmers</th>
                <th className="px-4 py-2 font-medium">Recorded</th>
              </tr>
            </thead>
            <tbody className="text-[#1A2E23] dark:text-white">
              {fieldBatches.map((b) => (
                <tr key={b.id} className="border-t border-[#E5EBE7] dark:border-[#2D4536]">
                  <td className="px-4 py-2 font-mono">{b.batch_code}</td>
                  <td className="px-4 py-2">{b.agent_id ?? '—'}</td>
                  <td className="px-4 py-2">{b.total_quantity}</td>
                  <td className="px-4 py-2">{b.quality_grade}</td>
                  <td className="px-4 py-2">{b.contributing_farmers_count}</td>
                  <td className="px-4 py-2">{b.created_at ? new Date(b.created_at).toLocaleDateString() : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
};
