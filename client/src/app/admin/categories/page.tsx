"use client";
import React, { useState, useEffect } from "react";
import { adminApi } from "@/services/adminApi";
import { Search, Edit, Plus, ChevronRight, ChevronDown, X } from "lucide-react";
import useCategory from "@/hooks/useCategory";

interface Category {
  _id: string;
  title: string;
  alias: string;
  description: string;
  type: "blueprint" | "project";
  level: number;
  parentId?: string | null;
  fields: Array<{
    fieldName: string;
    fieldType: string;
  }>;
  settings: {
    focus: string;
    tone: string;
    quantity: string;
    contentLength: number;
  };
  createdAt: string;
  updatedAt: string;
  children?: Category[];
}

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState(""); // input text
  const [debouncedSearch, setDebouncedSearch] = useState(""); // actual query text
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(
    null
  );
  const [showEditModal, setShowEditModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set()
  );

  // Debounce effect: wait 500ms after typing before triggering search
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchTerm);
    }, 500);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  // Load categories only when debouncedSearch changes
  const loadCategories = async (search: string = "") => {
    try {
      setLoading(true);
      const response = await adminApi.getCategories(1, 25, search);
      setCategories(response.data);
    } catch (error) {
      console.error("Error loading categories:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCategories(debouncedSearch);
  }, [debouncedSearch]);

  const handleSearch = (value: string) => {
    setSearchTerm(value);
  };

  const expandAllCategories = (categories: Category[]) => {
    const allIds = new Set<string>();
    const collectIds = (cats: Category[]) => {
      cats.forEach((cat) => {
        if (cat.children && cat.children.length > 0) {
          allIds.add(cat._id);
          collectIds(cat.children);
        }
      });
    };
    collectIds(categories);
    setExpandedCategories(allIds);
  };

  const collapseAllCategories = () => setExpandedCategories(new Set());

  const toggleExpanded = (categoryId: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(categoryId)) newExpanded.delete(categoryId);
    else newExpanded.add(categoryId);
    setExpandedCategories(newExpanded);
  };

  const handleEditCategory = (category: Category) => {
    setSelectedCategory(category);
    setShowEditModal(true);
  };

  const renderCategoryTree = (categories: Category[], level = 0) => {
    return categories.map((category, index) => (
      <div key={`${category._id}-${level}-${index}`}>
        <div
          className={`flex items-center p-3 hover:bg-gray-50 border-b ${
            level > 0 ? "ml-6" : ""
          }`}
        >
          <div className="flex items-center flex-1">
            {category.children && category.children.length > 0 ? (
              <button
                onClick={() => toggleExpanded(category._id)}
                className="p-1 mr-2"
              >
                {expandedCategories.has(category._id) ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </button>
            ) : (
              <div className="w-6 mr-2"></div>
            )}
            <div className="flex-1">
              <div className="font-medium">{category.title}</div>
              <div className="text-sm text-gray-500">{category.alias}</div>
            </div>
            <div className="flex items-center space-x-2">
              <span
                className={`px-2 py-1 rounded-full text-xs font-medium ${
                  category.type === "blueprint"
                    ? "bg-blue-100 text-blue-800"
                    : "bg-green-100 text-green-800"
                }`}
              >
                {category.type}
              </span>
              <span className="text-xs text-gray-500">
                Level {category.level}
              </span>
              {category.children && category.children.length > 0 && (
                <span className="text-xs text-gray-400">
                  ({category.children.length} children)
                </span>
              )}
              <button
                onClick={() => handleEditCategory(category)}
                className="p-1 text-blue-600 hover:text-blue-800"
                title="Edit category (only alias can be modified)"
              >
                <Edit className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
        {category.children &&
          category.children.length > 0 &&
          expandedCategories.has(category._id) && (
            <div key={`children-${category._id}-${level}`}>
              {renderCategoryTree(category.children, level + 1)}
            </div>
          )}
      </div>
    ));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Categories Management
          </h1>
          <p className="text-gray-600 mt-2">
            View content categories and their structure
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={() => expandAllCategories(categories)}
            className="bg-gray-600 text-white px-3 py-2 rounded-lg hover:bg-gray-700 text-sm"
          >
            Expand All
          </button>
          <button
            onClick={collapseAllCategories}
            className="bg-gray-600 text-white px-3 py-2 rounded-lg hover:bg-gray-700 text-sm"
          >
            Collapse All
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center space-x-2"
          >
            <Plus className="h-4 w-4" />
            <span>Add Category</span>
          </button>
        </div>
      </div>

      {/* Search & Results */}
      <div className="border rounded-lg shadow-sm overflow-hidden">
        <div className="p-3 border-b relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <input
            type="text"
            placeholder="Search categories..."
            value={searchTerm}
            onChange={(e) => handleSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* Only result section refreshes */}
        <div className="p-3 min-h-[100px]">
          {loading ? (
            <div className="flex items-center justify-center h-32 text-lg">
              Loading categories...
            </div>
          ) : categories.length > 0 ? (
            renderCategoryTree(categories)
          ) : (
            <div className="text-center text-gray-500">
              No categories found.
            </div>
          )}
        </div>
      </div>

      {/* Edit Modal */}
      {showEditModal && selectedCategory && (
        <CategoryModal
          category={selectedCategory}
          categories={categories}
          onClose={() => {
            setShowEditModal(false);
            setSelectedCategory(null);
          }}
          onSave={async (updatedCategory) => {
            try {
              await adminApi.updateCategory(
                selectedCategory._id,
                updatedCategory
              );
              await loadCategories(debouncedSearch);
              setShowEditModal(false);
              setSelectedCategory(null);
            } catch (error) {
              console.error("Error updating category:", error);
            }
          }}
        />
      )}

      {/* Create Modal */}
      {showCreateModal && (
        <CategoryModal
          categories={categories}
          onClose={() => setShowCreateModal(false)}
          onSave={async (newCategory) => {
            try {
              await adminApi.createCategory(newCategory);
              await loadCategories(debouncedSearch);
              setShowCreateModal(false);
            } catch (error) {
              console.error("Error creating category:", error);
            }
          }}
        />
      )}
    </div>
  );
}

// --------------------- CATEGORY MODAL ---------------------
interface CategoryModalProps {
  category?: Category;
  categories: Category[];
  onClose: () => void;
  onSave: (category: Partial<Category>) => void;
}

function CategoryModal({
  category,
  categories,
  onClose,
  onSave,
}: CategoryModalProps) {
  const [formData, setFormData] = useState({
    title: category?.title || "",
    alias: category?.alias || "",
    description: category?.description || "",
    type: category?.type || ("project" as "blueprint" | "project"),
    level: category?.level || 0,
    parentId: category?.parentId || null,
    fields: category?.fields || [],
    settings: category?.settings || {
      focus: "",
      tone: "",
      quantity: "",
      contentLength: 0,
    },
  });

  const [newField, setNewField] = useState({
    fieldName: "",
    fieldType: "text",
  });

  const [fieldError, setFieldError] = useState<string | null>(null);

  const { category: parentCategories } = useCategory({
    type: formData.type,
    level: formData.level - 1,
  });

  const addField = () => {
    if (!newField.fieldName.trim()) {
      setFieldError("Field name is required.");
      return;
    }
    setFormData({
      ...formData,
      fields: [...formData.fields, { ...newField }],
    });
    setNewField({ fieldName: "", fieldType: "text" });
    setFieldError(null);
  };

  const removeField = (index: number) =>
    setFormData({
      ...formData,
      fields: formData.fields.filter((_, i) => i !== index),
    });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanedData = {
      ...formData,
      parentId: formData.parentId || null,
    };

    if (category) {
      // For editing, exclude title from update data
      const { title, ...updateData } = cleanedData;
      onSave(updateData);
    } else {
      // For creating, include all data
      onSave(cleanedData);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-xl font-bold">
              {category ? "Edit Category" : "Create Category"}
            </h2>
            {category && (
              <p className="text-sm text-gray-600 mt-1 font-normal">
                Note: Only the alias can be modified for existing categories
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-full hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">
                Title{" "}
                {category && (
                  <span className="text-gray-500 text-xs">(Read-only)</span>
                )}
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) =>
                  setFormData({ ...formData, title: e.target.value })
                }
                className={`w-full p-2 border rounded-lg ${
                  category ? "bg-gray-100 cursor-not-allowed" : ""
                }`}
                disabled={!!category}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Alias</label>
              <input
                type="text"
                value={formData.alias}
                onChange={(e) =>
                  setFormData({ ...formData, alias: e.target.value })
                }
                className="w-full p-2 border rounded-lg"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              className="w-full p-2 border rounded-lg"
              rows={3}
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Type</label>
              <select
                value={formData.type}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    type: e.target.value as "blueprint" | "project",
                  })
                }
                className="w-full p-2 border rounded-lg"
              >
                <option value="project">Project</option>
                <option value="blueprint">Blueprint</option>
              </select>
            </div>

            {formData.type === "project" && (
              <div>
                <label className="block text-sm font-medium mb-1">Level</label>
                <select
                  value={formData.level}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      level: parseInt(e.target.value) || 0,
                    })
                  }
                  className="w-full p-2 border rounded-lg"
                >
                  {[0, 1, 2].map((lvl) => (
                    <option key={lvl} value={lvl}>
                      {lvl}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {(formData.level === 1 || formData.level === 2) &&
              formData.type === "project" && (
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Parent Category
                  </label>
                  <select
                    value={formData.parentId || ""}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        parentId: e.target.value === "" ? null : e.target.value,
                      })
                    }
                    className="w-full p-2 border rounded-lg"
                  >
                    <option value="">Select a parent category</option>
                    {parentCategories.map((cat) => (
                      <option key={cat._id} value={cat._id}>
                        {cat.title}
                      </option>
                    ))}
                  </select>
                </div>
              )}
          </div>

          {formData.level === 2 && (
            <div>
              <label className="block text-sm font-medium mb-2">Fields</label>
              <div className="space-y-2">
                {formData.fields?.map((field, index) => (
                  <div key={index} className="flex items-center space-x-2">
                    <input
                      type="text"
                      value={field.fieldName}
                      onChange={(e) => {
                        const newFields = [...formData.fields];
                        newFields[index].fieldName = e.target.value;
                        setFormData({ ...formData, fields: newFields });
                      }}
                      className="flex-1 p-2 border rounded-lg"
                      placeholder="Field name"
                    />
                    <select
                      value={field.fieldType}
                      onChange={(e) => {
                        const newFields = [...formData.fields];
                        newFields[index].fieldType = e.target.value;
                        setFormData({ ...formData, fields: newFields });
                      }}
                      className="p-2 border rounded-lg"
                    >
                      <option value="text">Text</option>
                      <option value="number">Number</option>
                      <option value="date">Date</option>
                      <option value="boolean">Boolean</option>
                    </select>
                    <button
                      type="button"
                      onClick={() => removeField(index)}
                      className="p-2 text-red-600 hover:text-red-800"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}

                <div className="flex items-center space-x-2">
                  <input
                    type="text"
                    value={newField.fieldName}
                    onChange={(e) =>
                      setNewField({ ...newField, fieldName: e.target.value })
                    }
                    className="flex-1 p-2 border rounded-lg"
                    placeholder="New field name"
                  />
                  <select
                    value={newField.fieldType}
                    onChange={(e) =>
                      setNewField({ ...newField, fieldType: e.target.value })
                    }
                    className="p-2 border rounded-lg"
                  >
                    <option value="text">Text</option>
                    <option value="number">Number</option>
                    <option value="date">Date</option>
                    <option value="boolean">Boolean</option>
                  </select>
                  <button
                    type="button"
                    onClick={addField}
                    className="p-2 text-blue-600 hover:text-blue-800"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
                {fieldError && (
                  <p className="text-red-500 text-sm mt-1">{fieldError}</p>
                )}
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Focus</label>
              <input
                type="text"
                value={formData.settings.focus}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    settings: { ...formData.settings, focus: e.target.value },
                  })
                }
                className="w-full p-2 border rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Tone</label>
              <input
                type="text"
                value={formData.settings.tone}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    settings: { ...formData.settings, tone: e.target.value },
                  })
                }
                className="w-full p-2 border rounded-lg"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Quantity</label>
              <input
                type="text"
                value={formData.settings.quantity}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    settings: {
                      ...formData.settings,
                      quantity: e.target.value,
                    },
                  })
                }
                className="w-full p-2 border rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">
                Content Length
              </label>
              <input
                type="number"
                value={formData.settings.contentLength}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    settings: {
                      ...formData.settings,
                      contentLength: parseInt(e.target.value) || 0,
                    },
                  })
                }
                className="w-full p-2 border rounded-lg"
              />
            </div>
          </div>

          <div className="flex space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              {category ? "Update Category" : "Create Category"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
