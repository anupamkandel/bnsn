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
  fields: Array<{ fieldName: string; fieldType: string }>;
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
    </div>
  );
}
