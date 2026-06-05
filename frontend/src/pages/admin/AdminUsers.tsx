import React, { useState } from 'react';
import { PERMISSION_LABELS } from '../../constants/permissions';
import { useGetUsersQuery, useRegisterMutation, useUpdatePermissionsMutation } from '../../services/authApi';
import { useGetBranchesQuery } from '../../services/branchApi';

interface User {
  _id: string;
  email: string;
  roles: string[];
  permissions: Record<string, boolean>;
  branch?: string;
}

export const AdminUsers: React.FC = () => {
  const { data: users = [], isLoading: loadingUsers } = useGetUsersQuery();
  const { data: branches = [] } = useGetBranchesQuery({});
  const [registerUser, { isLoading: creatingUser }] = useRegisterMutation();
  const [updatePermissions, { isLoading: updatingPerms }] = useUpdatePermissionsMutation();

  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [branch, setBranch] = useState('');
  const [selectedPermissions, setSelectedPermissions] = useState<Record<string, boolean>>({});

  const loading = creatingUser || updatingPerms;

  const handleToggle = (perm: string) => {
    setSelectedPermissions(prev => ({ ...prev, [perm]: !prev[perm] }));
  };

  const handleCreateUser = async () => {
    try {
      await registerUser({ email, password, roles: ['vendedor'], permissions: selectedPermissions, branch }).unwrap();
      setEmail(''); setPassword(''); setBranch(''); setSelectedPermissions({});
    } catch (err) { console.error('Error creating user', err); }
  };

  const handleUpdatePermissions = async () => {
    if (!selectedUser) return;
    try {
      await updatePermissions({ userId: selectedUser._id, permissions: selectedPermissions }).unwrap();
      setSelectedUser(null); setSelectedPermissions({});
    } catch (err) { console.error('Error updating permissions', err); }
  };

  const selectUserToEdit = (user: User) => {
    setSelectedUser(user);
    setSelectedPermissions(user.permissions || {});
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
                <div>
                  <label className="section-heading">Sucursal Asignada</label>
                  <select 
                    className="input py-2.5"
                    value={branch}
                    onChange={e => setBranch(e.target.value)}
                  >
                    <option value="">Seleccionar sucursal...</option>
                    {branches.map((b: any) => (
                      <option key={b._id} value={b._id}>{b.name}</option>
                    ))}
                  </select>
                </div>
              </>
            )}

            <div>
              <label className="section-heading mb-3 block">Permisos</label>
              <div className="surface rounded-xl p-4 space-y-2">
                {Object.entries(PERMISSION_LABELS).map(([key, label]) => (
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
                    <td className="text-center">
                      {!u.roles.includes('admin') && (
                        <button onClick={() => selectUserToEdit(u as any)} className="btn-icon mx-auto" title="Editar permisos">
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-5M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z" />
                          </svg>
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
                {(loadingUsers || (Array.isArray(users) && users.length === 0)) && (
                  <tr>
                    <td colSpan={3} className="text-center text-slate-600 py-10 text-sm">
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
