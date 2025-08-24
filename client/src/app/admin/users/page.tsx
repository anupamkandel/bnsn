"use client";

import React, { useState, useEffect, useCallback } from "react";
import { adminApi, AdminUser } from "@/services/adminApi";
import { Pagination } from "@/components/ui/Pagination";
import { Search, Edit, Trash2, Plus, Users } from "lucide-react";

// Debounce hook
function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const handler = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debounced;
}

interface CreateUserInput {
  firstName: string;
  lastName: string;
  email: string;
  role: "admin" | "user";
  password: string;
}

export default function UsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearch = useDebounce(searchTerm, 400);
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    itemsPerPage: 25,
  });

  const loadUsers = useCallback(async () => {
    try {
      setLoading(true);
      const response = await adminApi.getUsers(
        pagination.currentPage,
        pagination.itemsPerPage,
        debouncedSearch
      );
      setUsers(response.data);
      setPagination(response.pagination);
    } catch (error) {
      console.error("Error loading users:", error);
    } finally {
      setLoading(false);
    }
  }, [pagination.currentPage, pagination.itemsPerPage, debouncedSearch]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const handlePageChange = (page: number) => {
    setPagination((prev) => ({ ...prev, currentPage: page }));
  };

  const handleItemsPerPageChange = (itemsPerPage: number) => {
    setPagination((prev) => ({ ...prev, itemsPerPage, currentPage: 1 }));
  };

  const handleSearch = (value: string) => {
    setSearchTerm(value);
    setPagination((prev) => ({ ...prev, currentPage: 1 }));
  };

  const handleEditUser = (user: AdminUser) => {
    setSelectedUser(user);
    setShowEditModal(true);
  };

  const handleDeleteUser = async (userId: string) => {
    if (confirm("Are you sure you want to delete this user?")) {
      try {
        await adminApi.deleteUser(userId);
        await loadUsers();
      } catch (error) {
        console.error("Error deleting user:", error);
      }
    }
  };

  const handleCreateUser = async (newUser: CreateUserInput) => {
    try {
      const response = await fetch("http://localhost:5002/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify(newUser),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to create user");
      }

      await response.json();
      await loadUsers();
      setShowCreateModal(false);
      alert("User created successfully!");
    } catch (error: any) {
      console.error("Error creating user:", error);
      alert(`Error creating user: ${error.message}`);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  return (
    <div className="space-y-8">
      <div className="bg-gradient-to-r from-purple-600 to-blue-600 rounded-2xl p-8 text-white">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-4xl font-bold mb-2">Users Management</h1>
            <p className="text-purple-100 text-lg">
              Monitor and manage user accounts with detailed insights
            </p>
          </div>
          <div className="flex items-center space-x-4">
            <div className="hidden md:block">
              <div className="h-20 w-20 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm">
                <Users className="h-10 w-10 text-white" />
              </div>
            </div>
            <button
              onClick={() => setShowCreateModal(true)}
              className="bg-white/20 backdrop-blur-sm text-white px-6 py-3 rounded-xl hover:bg-white/30 flex items-center space-x-2 transition-all duration-300 font-medium"
            >
              <Plus className="h-5 w-5" />
              <span>Add New User</span>
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
        <div className="bg-gradient-to-r from-gray-50 to-purple-50 px-6 py-4 border-b border-gray-100">
          <SearchField value={searchTerm} onChange={handleSearch} />
        </div>
        <div className="p-6">
          <UserResults
            users={users}
            loading={loading}
            onEdit={handleEditUser}
            onDelete={handleDeleteUser}
            formatDate={formatDate}
          />
        </div>
      </div>

      {!loading && pagination.totalPages > 1 && (
        <Pagination
          currentPage={pagination.currentPage}
          totalPages={pagination.totalPages}
          totalItems={pagination.totalItems}
          itemsPerPage={pagination.itemsPerPage}
          onPageChange={handlePageChange}
          onItemsPerPageChange={handleItemsPerPageChange}
        />
      )}

      {showEditModal && selectedUser && (
        <EditUserModal
          user={selectedUser}
          onClose={() => {
            setShowEditModal(false);
            setSelectedUser(null);
          }}
          onSave={async (updatedUser: Partial<AdminUser>) => {
            try {
              await adminApi.updateUser(selectedUser._id, updatedUser);
              await loadUsers();
              setShowEditModal(false);
              setSelectedUser(null);
            } catch (error) {
              console.error("Error updating user:", error);
            }
          }}
        />
      )}

      {showCreateModal && (
        <CreateUserModal
          onClose={() => setShowCreateModal(false)}
          onSave={handleCreateUser}
        />
      )}
    </div>
  );
}

// SearchField component
function SearchField({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex items-center space-x-4">
      <div className="relative flex-1">
        <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
        <input
          type="text"
          placeholder="Search users by name or email..."
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white shadow-sm transition-all duration-200"
        />
      </div>
    </div>
  );
}

// UserResults component
function UserResults({
  users,
  loading,
  onEdit,
  onDelete,
  formatDate,
}: {
  users: AdminUser[];
  loading: boolean;
  onEdit: (user: AdminUser) => void;
  onDelete: (id: string) => void;
  formatDate: (date: string) => string;
}) {
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">Loading users...</div>
      </div>
    );
  }
  if (!users.length) {
    return (
      <div className="flex items-center justify-center h-32 text-gray-500">
        No users found.
      </div>
    );
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-gray-200 bg-gray-50/50">
            <th className="text-left py-4 px-6 font-semibold text-gray-700">
              User Details
            </th>
            <th className="text-left py-4 px-6 font-semibold text-gray-700">
              Role & Status
            </th>
            <th className="text-left py-4 px-6 font-semibold text-gray-700">
              Usage Statistics
            </th>
            <th className="text-left py-4 px-6 font-semibold text-gray-700">
              Member Since
            </th>
            <th className="text-left py-4 px-6 font-semibold text-gray-700">
              Actions
            </th>
          </tr>
        </thead>
        <tbody>
          {users.map((user, index) => (
            <tr
              key={user._id}
              className={`border-b border-gray-100 hover:bg-gradient-to-r hover:from-blue-50 hover:to-purple-50 transition-all duration-200 ${
                index % 2 === 0 ? "bg-white" : "bg-gray-50/30"
              }`}
            >
              <td className="py-5 px-6">
                <div className="flex items-center space-x-4">
                  <div
                    className={`h-12 w-12 rounded-full flex items-center justify-center font-semibold text-white ${
                      user.role === "admin"
                        ? "bg-gradient-to-r from-red-500 to-pink-500"
                        : "bg-gradient-to-r from-blue-500 to-indigo-500"
                    }`}
                  >
                    {(user.firstName?.[0] || user.email[0]).toUpperCase()}
                  </div>
                  <div>
                    <div className="font-semibold text-gray-900 text-lg">
                      {user.firstName} {user.lastName}
                    </div>
                    <div className="text-gray-500 text-sm">
                      {user.email}
                    </div>
                  </div>
                </div>
              </td>
              <td className="py-5 px-6">
                <span
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold shadow-sm ${
                    user.role === "admin"
                      ? "bg-gradient-to-r from-red-100 to-pink-100 text-red-700 border border-red-200"
                      : "bg-gradient-to-r from-blue-100 to-emerald-100 text-blue-700 border border-blue-200"
                  }`}
                >
                  {user.role.toUpperCase()}
                </span>
              </td>
              <td className="py-5 px-6">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="font-medium text-gray-900">
                      {user.wordsUsed.toLocaleString()}
                    </span>
                    <span className="text-gray-500">
                      / {user.totalWords.toLocaleString()}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2.5">
                    <div
                      className="bg-gradient-to-r from-blue-500 to-purple-600 h-2.5 rounded-full transition-all duration-500"
                      style={{
                        width: `${Math.min(
                          (user.wordsUsed / user.totalWords) * 100,
                          100
                        )}%`,
                      }}
                    ></div>
                  </div>
                  <div className="text-xs text-gray-500">
                    {Math.round((user.wordsUsed / user.totalWords) * 100)}
                    % used
                  </div>
                </div>
              </td>
              <td className="py-5 px-6 text-sm text-gray-600">
                <div className="flex items-center space-x-1">
                  <span>{formatDate(user.createdAt)}</span>
                </div>
              </td>
              <td className="py-5 px-6">
                <div className="flex space-x-2">
                  <button
                    onClick={() => onEdit(user)}
                    className="p-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-all duration-200"
                    title="Edit user"
                  >
                    <Edit className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => onDelete(user._id)}
                    className="p-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition-all duration-200"
                    title="Delete user"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// EditUserModal component
function EditUserModal({
  user,
  onClose,
  onSave,
}: {
  user: AdminUser;
  onClose: () => void;
  onSave: (updatedUser: Partial<AdminUser>) => void | Promise<void>;
}) {
  const [form, setForm] = useState<Partial<AdminUser>>({
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    role: user.role,
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(form);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-lg p-8 w-full max-w-md">
        <h2 className="text-2xl font-bold mb-4">Edit User</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">First Name</label>
            <input
              type="text"
              name="firstName"
              value={form.firstName || ""}
              onChange={handleChange}
              className="w-full border rounded px-3 py-2"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Last Name</label>
            <input
              type="text"
              name="lastName"
              value={form.lastName || ""}
              onChange={handleChange}
              className="w-full border rounded px-3 py-2"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Email</label>
            <input
              type="email"
              name="email"
              value={form.email || ""}
              onChange={handleChange}
              className="w-full border rounded px-3 py-2"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Role</label>
            <select
              name="role"
              value={form.role || ""}
              onChange={handleChange}
              className="w-full border rounded px-3 py-2"
              required
            >
              <option value="user">User</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <div className="flex justify-end space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded bg-gray-200 hover:bg-gray-300"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700"
            >
              Save
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// CreateUserModal component
function CreateUserModal({
  onClose,
  onSave,
}: {
  onClose: () => void;
  onSave: (user: CreateUserInput) => void | Promise<void>;
}) {
  const [form, setForm] = useState<CreateUserInput>({
    firstName: "",
    lastName: "",
    email: "",
    role: "user",
    password: "",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(form);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-lg p-8 w-full max-w-md">
        <h2 className="text-2xl font-bold mb-4">Add New User</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">First Name</label>
            <input
              type="text"
              name="firstName"
              value={form.firstName}
              onChange={handleChange}
              className="w-full border rounded px-3 py-2"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Last Name</label>
            <input
              type="text"
              name="lastName"
              value={form.lastName}
              onChange={handleChange}
              className="w-full border rounded px-3 py-2"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Email</label>
            <input
              type="email"
              name="email"
              value={form.email}
              onChange={handleChange}
              className="w-full border rounded px-3 py-2"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Role</label>
            <select
              name="role"
              value={form.role}
              onChange={handleChange}
              className="w-full border rounded px-3 py-2"
              required
            >
              <option value="user">User</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Password</label>
            <input
              type="password"
              name="password"
              value={form.password}
              onChange={handleChange}
              className="w-full border rounded px-3 py-2"
              required
            />
          </div>
          <div className="flex justify-end space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded bg-gray-200 hover:bg-gray-300"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded bg-purple-600 text-white hover:bg-purple-700"
            >
              Create
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
