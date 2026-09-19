import React, { useState } from 'react';
import { usePrivacy } from '../contexts/PrivacyContext';
import { EyeOff, CheckSquare, Plus, FileText, ArrowLeft } from 'lucide-react';

export const CamouflageOverlay: React.FC = () => {
  const { isCamouflageActive, toggleCamouflage } = usePrivacy();
  const [notes, setNotes] = useState([
    { id: 1, text: 'Review quarterly project deliverables', done: true },
    { id: 2, text: 'Sync meeting with team regarding database architecture', done: true },
    { id: 3, text: 'Prepare slides for Monday presentation', done: false },
    { id: 4, text: 'Verify staging deployment checklist', done: false },
  ]);
  const [newNote, setNewNote] = useState('');

  if (!isCamouflageActive) return null;

  const handleToggleDone = (id: number) => {
    setNotes((prev) =>
      prev.map((n) => (n.id === id ? { ...n, done: !n.done } : n))
    );
  };

  const handleAddNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNote.trim()) return;
    setNotes((prev) => [...prev, { id: Date.now(), text: newNote.trim(), done: false }]);
    setNewNote('');
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 flex flex-col overflow-y-auto animate-in fade-in duration-150">
      {/* Top Bar styled like a standard document / notes app */}
      <div className="border-b border-slate-200 dark:border-slate-800 px-6 py-4 flex items-center justify-between bg-white dark:bg-slate-900">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
            <FileText className="w-4 h-4" />
          </div>
          <div>
            <h1 className="text-sm font-bold tracking-tight">Work Notes & Project Tasks</h1>
            <p className="text-[11px] text-slate-400">Personal Workspace — Updated 2m ago</p>
          </div>
        </div>

        {/* Discreet exit button */}
        <button
          onClick={toggleCamouflage}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
          title="Exit camouflage mode (Esc)"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Exit Document</span>
        </button>
      </div>

      {/* Camouflage content */}
      <div className="flex-1 max-w-2xl mx-auto w-full p-6 sm:p-8">
        <div className="mb-6 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-800 dark:text-amber-300 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <EyeOff className="w-4 h-4 text-amber-500 shrink-0" />
            <span>Camouflage Mode Active — The screen is concealed. Press <strong>Esc</strong> or the top button to return to chat.</span>
          </div>
        </div>

        <h2 className="text-base font-bold mb-4 flex items-center gap-2">
          <CheckSquare className="w-4 h-4 text-indigo-500" />
          <span>Sprint Tasks</span>
        </h2>

        <div className="space-y-2.5 mb-6">
          {notes.map((item) => (
            <div
              key={item.id}
              onClick={() => handleToggleDone(item.id)}
              className="flex items-center gap-3 p-3 rounded-xl bg-white dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            >
              <input
                type="checkbox"
                checked={item.done}
                onChange={() => {}}
                className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500 cursor-pointer"
              />
              <span
                className={`text-xs ${
                  item.done
                    ? 'line-through text-slate-400 dark:text-slate-500'
                    : 'text-slate-700 dark:text-slate-200'
                }`}
              >
                {item.text}
              </span>
            </div>
          ))}
        </div>

        {/* Add item dummy form */}
        <form onSubmit={handleAddNote} className="flex gap-2">
          <input
            type="text"
            placeholder="Add a new checklist note..."
            value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
            className="flex-1 px-3.5 py-2 text-xs rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/30"
          />
          <button
            type="submit"
            className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-semibold hover:bg-indigo-500 transition-colors cursor-pointer"
          >
            Add
          </button>
        </form>
      </div>
    </div>
  );
};
