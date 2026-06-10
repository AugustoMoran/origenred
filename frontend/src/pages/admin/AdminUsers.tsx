import React, { useState } from 'react';
import { PERMISSION_LABELS } from '../../constants/permissions';
import { useDeleteUserMutation, useGetUsersQuery, useRegisterMutation, useUpdateBranchMutation, useUpdateCommissionMutation, useUpdatePermissionsMutation } from '../../services/authApi';
import { useGetBranchesQuery } from '../../services/branchApi';

interface User {
  _id: string;
  email: string;
  roles: string[];
  permissions: Record<string, boolean>;
  branch?: string;
  commissionRate?: number;
}

export const AdminUsers: React.FC = () => {
  const { data: users = [], isLoading: loadingUsers } = useGetUsersQuery();
  const { data: branches = [] } = useGetBranchesQuery({});
  const [registerUser, { isLoading: creatingUser }] = useRegisterMutation();
  const [updatePermissions, { isLoading: updatingPerms }] = useUpdatePermissionsMutation();
  const [updateCommission, { isLoading: updatingCommission }] = useUpdateCommissionMutation();
  const [updateBranch, { isLoading: updatingBranch }] = useUpdateBranchMutation();
  const [deleteUser, { isLoading: deletingUser }] = useDeleteUserMutation();

  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [branch, setBranch] = useState('');
  const [commissionRate, setCommissionRate] = useState('0');
  const [selectedPermissions, setSelectedPermissions] = useState<Record<string, boolean>>({});

  const loading = creatingUser || updatingPerms || updatingCommission || updatingBranch || deletingUser;

  const handleToggle = (perm: string) => {
    setSelectedPermissions(prev => ({ ...prev, [perm]: !prev[perm] }));
  };

  const handleCreateUser = async () => {
    try {
      await registerUser({
        email,
        password,
        roles: ['vendedor'],
        permissions: selectedPermissions,
        branch,
        commissionRate: Number(commissionRate || 0),
      }).unwrap();
      setEmail(''); setPassword(''); setBranch(''); setCommissionRate('0'); setSelectedPermissions({});
    } catch (err) { console.error('Error creating user', err); }
  };

  const handleUpdatePermissions = async () => {
    if (!selectedUser) return;
    try {
      await updatePermissions({ userId: selectedUser._id, permissions: selectedPermissions }).unwrap();
      await updateCommission({ userId: selectedUser._id, commissionRate: Number(commissionRate || 0) }).unwrap();
      await updateBranch({ userId: selectedUser._id, branchId: branch || null }).unwrap();
      setSelectedUser(null); setSelectedPermissions({});
    } catch (err) { console.error('Error updating permissions', err); }
  };

  const selectUserToEdit = (user: User) => {
    setSelectedUser(user);
    setSelectedPermissions(user.permissions || {});
    setCommissionRate(String(user.commissionRate ?? 0));
    setBranch(String(user.branch || ''));
  };

  const getBranchName = (branchId?: string) => {
    if (!branchId) return 'Sin sucursal';
    return branches.find((b: any) => String(b._id) === String(branchId))?.name || 'Sucursal no encontrada';
  };

  const handleDeleteUser = async (user: User) => {
    if (!user?._id) return;
    const confirmed = window.confirm(`¿Eliminar el usuario ${user.email}? Esta acción no se puede deshacer.`);
    if (!confirmed) return;

    try {
      await deleteUser(user._id).unwrap();
      if (selectedUser?._id === user._id) {
        setSelectedUser(null);
        setSelectedPermissions({});
        setCommissionRate('0');
        setBranch('');
      }
    } catch (err: any) {
      alert(err?.data?.message || 'No se pudo eliminar el usuario');
    }
  };

  return (
    <div className="space-y-6 animate-slide-up">
      <div>
        <h1 className="page-title">Usuarios</h1>
        <p className="page-sub">Gestión de accesos y permisos</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Form panel */}
        <div className="lg:col-span-5">
          <div className="card p-6 space-y-4">
            <h2 className="text-sm font-semibold text-white">
              {selectedUser ? `Editar: ${selectedUser.email.split('@')[0]}` : 'Nuevo usuario'}
            </h2>

            {!selectedUser && (
              <>
                <div>
                  <label className="section-heading">Email</label>
                  <input type="email" placeholder="user@empresa.com" className="input"
                    value={email} onChange={e => setEmail(e.target.value)} />
                </div>
                <div>
                  <label className="section-heading">Contraseña temporal</label>
                  <input type="password" placeholder="••••••••" className="input"
                    value={password} onChange={e => setPassword(e.target.value)} />
                </div>
              </>
            )}

            <div>
              <label className="section-heading">Sucursal Asignada</label>
              <select
                className="input py-2.5"
                value={branch}
                onChange={e => setBranch(e.target.value)}
              >
                <option value="">Sin sucursal</option>
                {branches.map((b: any) => (
                  <option key={b._id} value={b._id}>{b.name}</option>
                ))}
              </select>
              {!branch && (
                <p className="text-[11px] text-amber-300 mt-1">
                  ⚠️ Este usuario no podrá cargar ventas hasta que se le asigne una sucursal.
                </p>
              )}
            </div>

            <div>
              <label className="section-heading">Comisión (%)</label>
              <input
                type="number"
                step="0.000001"
                min="0"
                placeholder="0"
                className="input"
                value={commissionRate}
                onChange={e => setCommissionRate(e.target.value)}
              />
            </div>

            <div>
              <label className="section-heading mb-3 block">Permisos</label>
              <div className="surface rounded-xl p-4 space-y-2">
                {Object.entries(PERMISSION_LABELS)
                  .filter(([key]) => key !== 'clients:view' && key !== 'clients:edit')
                  .map(([key, label]) => (
                  <label key={key} className="flex items-center gap-3 cursor-pointer group py-1">
                    <div className="relative flex items-center justify-center w-4 h-4 flex-shrink-0">
                      <input type="checkbox" checked={!!selectedPermissions[key]}
                        onChange={() => handleToggle(key)}
                        className="w-4 h-4 appearance-none rounded border border-white/20 bg-[#060D1F] checked:bg-brand-600 checked:border-brand-600 transition-all cursor-pointer" />
                      {selectedPermissions[key] && (
                        <svg className="absolute w-3 h-3 text-white pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                    <span className="text-sm text-slate-400 group-hover:text-white transition-colors">{label as string}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              {selectedUser ? (
                <>
                  <button onClick={handleUpdatePermissions} disabled={loading} className="btn-primary flex-1">
                    {loading ? 'Guardando...' : 'Actualizar'}
                  </button>
                  <button onClick={() => { setSelectedUser(null); setSelectedPermissions({}); }} className="btn-secondary w-full sm:w-auto">
                    Cancelar
                  </button>
                </>
              ) : (
                <button onClick={handleCreateUser} disabled={loading || !email || !password} className="btn-primary w-full">
                  {loading ? 'Creando...' : 'Crear usuario'}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Users table */}
        <div className="lg:col-span-7">
          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
            <table className="data-table min-w-[620px]">
              <thead>
                <tr>
                  <th>Usuario</th>
                  <th>Rol</th>
                  <th>Sucursal</th>
                  <th className="text-right">Comisión</th>
                  <th className="text-center">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u._id}>
                    <td>
                      <div className="text-sm font-medium text-white">{u.email}</div>
                      <div className="text-xs font-mono text-brand-400 mt-0.5">{u._id.slice(-8)}</div>
                    </td>
                    <td>
                      <span className={u.roles.includes('admin') ? 'badge-blue' : 'badge-gray'}>
                        {u.roles[0]}
                      </span>
                    </td>
                    <td>
                      <div className="text-sm text-slate-200">{getBranchName(u.branch)}</div>
                      {!u.roles.includes('admin') && !u.branch && (
                        <div className="text-[11px] text-amber-300 mt-0.5">Asignar sucursal</div>
                      )}
                    </td>
                    <td className="text-right text-brand-300 font-semibold">{Number(u.commissionRate || 0)}%</td>
                    <td className="text-center">
                      {!u.roles.includes('admin') && (
                        <div className="flex items-center justify-center gap-2">
                          <button onClick={() => selectUserToEdit(u as any)} className="btn-icon" title="Editar usuario">
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-5M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => handleDeleteUser(u as any)}
                            className="btn-icon text-rose-300 hover:text-rose-200"
                            title="Eliminar usuario"
                            disabled={loading}
                          >
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
                {(loadingUsers || (Array.isArray(users) && users.length === 0)) && (
                  <tr>
                    <td colSpan={5} className="text-center text-slate-600 py-10 text-sm">
                      {loadingUsers ? 'Cargando usuarios...' : 'Sin usuarios registrados'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
