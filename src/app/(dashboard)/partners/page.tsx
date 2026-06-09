'use client';

import { useEffect, useRef, useState } from 'react';
import { Plus, Trash2, Handshake, Pencil, Check, X } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { useAuthStore } from '@/store/auth';
import { getCompanyPartners, createPartner, updatePartner, deletePartner } from '@/lib/firebase/firestore';
import type { Partner } from '@/types';
import toast from 'react-hot-toast';
import { useT } from '@/lib/i18n/use-t';
import { formatDate } from '@/lib/utils';

export default function PartnersPage() {
  const { user, company } = useAuthStore();
  const t = useT();
  const [partners, setPartners] = useState<Partner[]>([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState('');
  const [addSaving, setAddSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [editTarget, setEditTarget] = useState<{ id: string; name: string } | null>(null);
  const [editValue, setEditValue] = useState('');
  const editRef = useRef<HTMLInputElement>(null);
  const addRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!company?.id) return;
    getCompanyPartners(company.id)
      .then(setPartners)
      .finally(() => setLoading(false));
  }, [company?.id]);

  if (user?.role !== 'admin') {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-gray-400">
        <Handshake className="w-12 h-12 mb-3" />
        <p className="text-lg font-medium">{t.common.accessDenied}</p>
        <p className="text-sm mt-1">{t.partners.accessDeniedDesc}</p>
      </div>
    );
  }

  const handleAdd = async () => {
    const trimmed = newName.trim();
    if (!trimmed || !company) return;
    if (partners.some((p) => p.name.toLowerCase() === trimmed.toLowerCase())) {
      toast.error('Partner already exists');
      return;
    }
    setAddSaving(true);
    try {
      const id = await createPartner({ companyId: company.id, name: trimmed });
      setPartners((prev) => [...prev, { id, companyId: company.id, name: trimmed, createdAt: new Date() }].sort((a, b) => a.name.localeCompare(b.name)));
      setNewName('');
      addRef.current?.focus();
      toast.success('Partner added');
    } catch {
      toast.error('Failed to add partner');
    } finally {
      setAddSaving(false);
    }
  };

  const handleRename = async () => {
    const trimmed = editValue.trim();
    if (!trimmed || !editTarget) return;
    if (trimmed === editTarget.name) { setEditTarget(null); return; }
    if (partners.some((p) => p.name.toLowerCase() === trimmed.toLowerCase() && p.id !== editTarget.id)) {
      toast.error('Partner already exists');
      return;
    }
    try {
      await updatePartner(editTarget.id, trimmed);
      setPartners((prev) => prev.map((p) => (p.id === editTarget.id ? { ...p, name: trimmed } : p)));
      setEditTarget(null);
      toast.success('Partner renamed');
    } catch {
      toast.error('Failed to rename partner');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deletePartner(id);
      setPartners((prev) => prev.filter((p) => p.id !== id));
      setDeleteConfirm(null);
      toast.success('Partner removed');
    } catch {
      toast.error('Failed to remove partner');
    }
  };

  const startEdit = (p: Partner) => {
    setDeleteConfirm(null);
    setEditTarget({ id: p.id, name: p.name });
    setEditValue(p.name);
    setTimeout(() => editRef.current?.focus(), 0);
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">{t.partners.title}</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
          {t.partners.subtitle} {company?.name}
        </p>
      </div>

      {/* Add partner */}
      <Card>
        <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">{t.partners.addPartner}</p>
        <div className="flex gap-2">
          <input
            ref={addRef}
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
            placeholder={t.partners.partnerName}
            className="flex-1 px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 text-sm bg-white dark:bg-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
          <button
            onClick={handleAdd}
            disabled={addSaving || !newName.trim()}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-sm font-medium bg-brand-600 hover:bg-brand-700 disabled:opacity-40 text-white transition-colors"
          >
            <Plus className="w-4 h-4" />
            {t.common.add}
          </button>
        </div>
      </Card>

      {/* Partners list */}
      <Card>
        <div className="flex items-center gap-2 mb-4">
          <Handshake className="w-4 h-4 text-brand-600" />
          <h2 className="font-semibold text-gray-900 dark:text-white">
            Partners
            <span className="ml-2 text-sm font-normal text-gray-400">({partners.length})</span>
          </h2>
        </div>

        {loading ? (
          <div className="flex justify-center py-8">
            <svg className="animate-spin h-5 w-5 text-brand-600" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          </div>
        ) : partners.length === 0 ? (
          <div className="text-center py-10 text-gray-400">
            <Handshake className="w-10 h-10 mx-auto mb-2 opacity-40" />
            <p className="text-sm font-medium">{t.partners.noPartners}</p>
            <p className="text-xs mt-1">{t.partners.noPartnersDesc}</p>
          </div>
        ) : (
          <div className="space-y-2">
            {partners.map((p) => {
              const isEditing = editTarget?.id === p.id;
              const isDeleting = deleteConfirm === p.id;

              return (
                <div key={p.id} className="flex items-center justify-between py-3 px-4 rounded-lg bg-gray-50 dark:bg-gray-800/50 group">
                  {isEditing ? (
                    <div className="flex items-center gap-2 flex-1">
                      <input
                        ref={editRef}
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleRename();
                          if (e.key === 'Escape') setEditTarget(null);
                        }}
                        className="flex-1 px-2 py-0.5 rounded border border-brand-400 text-sm bg-white dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-1 focus:ring-brand-500"
                      />
                      <button onClick={handleRename} className="p-1 rounded text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20">
                        <Check className="w-4 h-4" />
                      </button>
                      <button onClick={() => setEditTarget(null)} className="p-1 rounded text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <>
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">{p.name}</p>
                        <p className="text-xs text-gray-400 mt-0.5">Added {formatDate(p.createdAt)}</p>
                      </div>
                      {isDeleting ? (
                        <div className="flex gap-1">
                          <button onClick={() => handleDelete(p.id)} className="px-2 py-1 rounded text-xs bg-red-500 text-white">
                            {t.common.delete}
                          </button>
                          <button onClick={() => setDeleteConfirm(null)} className="px-2 py-1 rounded text-xs bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                            {t.common.cancel}
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => startEdit(p)} className="p-1.5 rounded text-gray-400 hover:text-brand-600 hover:bg-brand-50 dark:hover:bg-brand-900/20">
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => { setEditTarget(null); setDeleteConfirm(p.id); }} className="p-1.5 rounded text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}
