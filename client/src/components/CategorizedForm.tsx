"use client";
import { CategoryValue, updateCategoryValueApi } from "@/services/blueprintApi";
import { Loader } from "lucide-react";
import React, { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { updateCategoryApi } from "@/services/categoryApi";
import CategoryAliasEditor from "./CategoryAliasEditor";

export type Category = {
  _id: string;
  title: string;
  alias: string;
  effectiveAlias?: string;
  fields: Field[];
  createdAt?: string;
  updatedAt?: string;
  __v?: number;
  type: string;
};

export type Field = {
  fieldName: string;
  fieldType: string;
  _id: string;
};

type FormData = Record<string, Record<string, any[]>>;
type EditingState = Record<
  string,
  Record<string, { isEditing: boolean; tempValue: string }>
>;

interface CategoryFormProps {
  projectId?: string;
  categories: Category[];
  loading?: boolean;
  categoryValues: CategoryValue[];
  onSubmit?: (allFormData: FormData) => void;
  onCategorySubmit?: (
    categoryId: string,
    formData: Record<string, any>
  ) => void;
  onCategoryUpdate?: (categoryId: string, data: { alias: string }) => void;
}

export const CategorizedForm: React.FC<CategoryFormProps> = ({
  projectId,
  categories,
  onSubmit,
  loading,
  onCategorySubmit,
  categoryValues,
  onCategoryUpdate,
}) => {
  const [formData, setFormData] = useState<FormData>({});
  const [initialFormData, setInitialFormData] = useState<FormData>({});
  const [errors, setErrors] = useState<Record<string, Record<string, string>>>(
    {}
  );
  const [editingState, setEditingState] = useState<EditingState>({});
  const [inlineEditingState, setInlineEditingState] = useState<
    Record<
      string,
      Record<
        string,
        { isEditing: boolean; tempValue: string; editingIndex: number }
      >
    >
  >({});
  const [loadingStates, setLoadingStates] = useState<Record<string, boolean>>(
    {}
  );
  const [expandedCategories, setExpandedCategories] = useState<
    Record<string, boolean>
  >({});
  const [categoryEditingState, setCategoryEditingState] = useState<
    Record<string, { isEditing: boolean; tempValue: string }>
  >({});

  useEffect(() => {
    const initialFormData: FormData = {};

    categories.forEach((category) => {
      const matchedCategoryValue = categoryValues.find(
        (cv) => cv.category === category._id
      );

      if (matchedCategoryValue) {
        const fieldMap: Record<string, any[]> = {};

        category.fields.forEach((field) => {
          const matchedField = matchedCategoryValue.value.find(
            (val) => val.key === field.fieldName
          );

          if (matchedField) {
            let fieldValues: any[] = [];
            try {
              const parsed =
                typeof matchedField.value === "string"
                  ? JSON.parse(matchedField.value)
                  : matchedField.value;
              if (Array.isArray(parsed)) {
                fieldValues = parsed;
              } else {
                fieldValues = [matchedField.value];
              }
            } catch {
              fieldValues =
                typeof matchedField.value === "string"
                  ? matchedField.value
                      .split(",")
                      .map((v: string) => v.trim())
                      .filter(Boolean)
                  : [matchedField.value];
            }

            fieldMap[field._id] = fieldValues;
          } else {
            fieldMap[field._id] = [];
          }
        });

        initialFormData[category._id] = fieldMap;
      } else {
        const fieldMap: Record<string, any[]> = {};
        category.fields.forEach((field) => {
          fieldMap[field._id] = [];
        });
        initialFormData[category._id] = fieldMap;
      }
    });

    setFormData(initialFormData);
    setInitialFormData(initialFormData);
  }, [categories, categoryValues]);

  const handleAddValue = (categoryId: string, fieldId: string) => {
    setEditingState((prev) => ({
      ...prev,
      [categoryId]: {
        ...(prev[categoryId] || {}),
        [fieldId]: { isEditing: true, tempValue: "" },
      },
    }));
  };

  const hasCategoryChanged = (categoryId: string): boolean => {
    const current = formData[categoryId] || {};
    const initial = initialFormData[categoryId] || {};

    for (const fieldId in current) {
      const currentValues = current[fieldId] || [];
      const initialValues = initial[fieldId] || [];

      if (currentValues.length !== initialValues.length) {
        return true;
      }

      for (let i = 0; i < currentValues.length; i++) {
        if (currentValues[i] !== initialValues[i]) {
          return true;
        }
      }
    }

    return false;
  };

  const handleSaveValue = (categoryId: string, fieldId: string) => {
    const currentEditing = editingState[categoryId]?.[fieldId];
    if (currentEditing && currentEditing.tempValue.trim()) {
      setFormData((prev) => ({
        ...prev,
        [categoryId]: {
          ...(prev[categoryId] || {}),
          [fieldId]: [
            ...(prev[categoryId]?.[fieldId] || []),
            currentEditing.tempValue,
          ],
        },
      }));

      setEditingState((prev) => ({
        ...prev,
        [categoryId]: {
          ...(prev[categoryId] || {}),
          [fieldId]: { isEditing: false, tempValue: "" },
        },
      }));
    }
  };

  const handleCancelEdit = (categoryId: string, fieldId: string) => {
    setEditingState((prev) => ({
      ...prev,
      [categoryId]: {
        ...(prev[categoryId] || {}),
        [fieldId]: { isEditing: false, tempValue: "" },
      },
    }));
  };

  const handleRemoveValue = (
    categoryId: string,
    fieldId: string,
    index: number
  ) => {
    setFormData((prev) => {
      const updatedFieldValues = (prev[categoryId]?.[fieldId] || []).filter(
        (_, i) => i !== index
      );
      return {
        ...prev,
        [categoryId]: {
          ...(prev[categoryId] || {}),
          [fieldId]: updatedFieldValues,
        },
      };
    });

    // Update initialFormData to reflect the deletion
    setInitialFormData((prev) => ({
      ...prev,
      [categoryId]: {
        ...(prev[categoryId] || {}),
        [fieldId]: (prev[categoryId]?.[fieldId] || []).filter(
          (_, i) => i !== index
        ),
      },
    }));
  };

  const handleTempValueChange = (
    categoryId: string,
    fieldId: string,
    value: string
  ) => {
    setEditingState((prev) => ({
      ...prev,
      [categoryId]: {
        ...(prev[categoryId] || {}),
        [fieldId]: { isEditing: true, tempValue: value },
      },
    }));
  };

  const validateCategory = (category: Category): boolean => {
    const newErrors: Record<string, string> = {};
    const categoryData = formData[category._id] || {};

    category.fields.forEach((field) => {
      const values = categoryData[field._id] || [];

      if (values.length === 0) {
        newErrors[field._id] = `${field.fieldName} is required`;
      }

      values.forEach((value, index) => {
        if (!value || (typeof value === "string" && value.trim() === "")) {
          newErrors[field._id] = `${field.fieldName} value ${
            index + 1
          } is required`;
        }

        if (field.fieldType === "email" && value) {
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (!emailRegex.test(value)) {
            newErrors[field._id] = "Please enter a valid email address";
          }
        }

        if (field.fieldType === "number" && value && isNaN(Number(value))) {
          newErrors[field._id] = "Please enter a valid number";
        }
      });
    });

    setErrors((prev) => ({
      ...prev,
      [category._id]: newErrors,
    }));

    return Object.keys(newErrors).length === 0;
  };

  const validateAllCategories = (): boolean => {
    let allValid = true;

    categories.forEach((category) => {
      if (!validateCategory(category)) {
        allValid = false;
      }
    });

    return allValid;
  };

  const handleInlineEdit = (
    categoryId: string,
    fieldId: string,
    index: number,
    currentValue: string
  ) => {
    setInlineEditingState((prev) => ({
      ...prev,
      [categoryId]: {
        ...(prev[categoryId] || {}),
        [fieldId]: {
          isEditing: true,
          tempValue: currentValue,
          editingIndex: index,
        },
      },
    }));
  };

  const handleInlineSave = (categoryId: string, fieldId: string) => {
    const currentEditing = inlineEditingState[categoryId]?.[fieldId];
    if (currentEditing && currentEditing.tempValue.trim()) {
      setFormData((prev) => {
        const newValues = [...(prev[categoryId]?.[fieldId] || [])];
        newValues[currentEditing.editingIndex] = currentEditing.tempValue;

        return {
          ...prev,
          [categoryId]: {
            ...(prev[categoryId] || {}),
            [fieldId]: newValues,
          },
        };
      });

      setInlineEditingState((prev) => ({
        ...prev,
        [categoryId]: {
          ...(prev[categoryId] || {}),
          [fieldId]: { isEditing: false, tempValue: "", editingIndex: -1 },
        },
      }));
    }
  };

  const handleInlineCancel = (categoryId: string, fieldId: string) => {
    setInlineEditingState((prev) => ({
      ...prev,
      [categoryId]: {
        ...(prev[categoryId] || {}),
        [fieldId]: { isEditing: false, tempValue: "", editingIndex: -1 },
      },
    }));
  };

  const handleInlineValueChange = (
    categoryId: string,
    fieldId: string,
    value: string
  ) => {
    setInlineEditingState((prev) => ({
      ...prev,
      [categoryId]: {
        ...(prev[categoryId] || {}),
        [fieldId]: {
          ...prev[categoryId]?.[fieldId],
          tempValue: value,
        },
      },
    }));
  };

  const toggleCategoryExpansion = (categoryId: string) => {
    setExpandedCategories((prev) => ({
      ...prev,
      [categoryId]: !prev[categoryId],
    }));
  };

  const handleCategoryAliasEdit = (categoryId: string) => {
    const category = categories.find((c) => c._id === categoryId);
    if (category) {
      setCategoryEditingState((prev) => ({
        ...prev,
        [categoryId]: {
          isEditing: true,
          tempValue: category.alias || category.title,
        },
      }));
    }
  };

  const handleCategoryAliasChange = (categoryId: string, value: string) => {
    setCategoryEditingState((prev) => ({
      ...prev,
      [categoryId]: {
        ...prev[categoryId],
        tempValue: value,
      },
    }));
  };

  const handleCategoryAliasSave = async (categoryId: string) => {
    const editingState = categoryEditingState[categoryId];
    if (editingState && editingState.tempValue.trim()) {
      try {
        await updateCategoryApi(categoryId, {
          alias: editingState.tempValue.trim(),
        });

        if (onCategoryUpdate) {
          onCategoryUpdate(categoryId, {
            alias: editingState.tempValue.trim(),
          });
        }

        toast.success("Category alias updated successfully");
      } catch (error) {
        console.error("Error updating category alias:", error);
        toast.error("Failed to update category alias");
      }
    }

    setCategoryEditingState((prev) => ({
      ...prev,
      [categoryId]: { isEditing: false, tempValue: "" },
    }));
  };

  const handleCategoryAliasCancel = (categoryId: string) => {
    setCategoryEditingState((prev) => ({
      ...prev,
      [categoryId]: { isEditing: false, tempValue: "" },
    }));
  };

  const handleUpdateCategoryValue = async (categoryId: string) => {
    if (!hasCategoryChanged(categoryId)) {
      return;
    }
    const categoryValue = categoryValues.find(
      (cv) => cv.category === categoryId
    );
    if (!categoryValue) {
      toast.error("Category value not found");
      return;
    }

    setLoadingStates((prev) => ({ ...prev, [categoryId]: true }));

    try {
      const categoryData = formData[categoryId] || {};
      const category = categories.find((c) => c._id === categoryId);

      if (!category) {
        toast.error("Category not found");
        return;
      }

      const valueArray = category.fields.map((field) => {
        const fieldValues = categoryData[field._id] || [];
        return {
          key: field.fieldName,
          value: fieldValues,
        };
      });

      await updateCategoryValueApi({
        id: categoryValue._id,
        value: valueArray,
      });
      toast.success("Category updated successfully");

      // Update initialFormData to reflect the saved changes
      setInitialFormData((prev) => ({
        ...prev,
        [categoryId]: { ...formData[categoryId] },
      }));

      if (onCategorySubmit) {
        onCategorySubmit(categoryId, categoryData);
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to update category");
    } finally {
      setLoadingStates((prev) => ({ ...prev, [categoryId]: false }));
    }
  };

  const renderField = (category: Category, field: Field) => {
    const values = formData[category._id]?.[field._id] || [];
    const hasError = errors[category._id]?.[field._id];
    const isEditing =
      editingState[category._id]?.[field._id]?.isEditing || false;
    const tempValue = editingState[category._id]?.[field._id]?.tempValue || "";
    const inlineEditing = inlineEditingState[category._id]?.[field._id];
    const isLoading = loadingStates[category._id];

    const baseInputClasses = `w-[80%] border border-purple-500 px-3 py-2 border-l-4 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500/30 focus:border-purple-500 transition-all duration-200 ${
      hasError
        ? "border-l-red-500 bg-red-50"
        : "border-l-purple-500 hover:border-l-purple-600"
    }`;

    return (
      <div className="space-y-3">
        <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-base font-semibold text-gray-800">
              {field.fieldName}
            </h3>
          </div>

          <div className="grid items-center grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {values.map((value, index) => (
              <div key={index} className="relative group">
                {inlineEditing?.isEditing &&
                inlineEditing.editingIndex === index ? (
                  <div className="relative">
                    <textarea
                      value={inlineEditing.tempValue}
                      onChange={(e) =>
                        handleInlineValueChange(
                          category._id,
                          field._id,
                          e.target.value
                        )
                      }
                      className={baseInputClasses}
                      autoFocus
                    />
                    <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex items-center gap-1">
                      <button
                        onClick={() =>
                          handleInlineSave(category._id, field._id)
                        }
                        className="p-1 bg-green-500 text-white rounded-md hover:bg-green-600 transition-colors"
                        title="Save"
                      >
                        <svg
                          className="size-5"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                      </button>
                      <button
                        onClick={() =>
                          handleInlineCancel(category._id, field._id)
                        }
                        className="p-1 bg-gray-500 text-white rounded-md hover:bg-gray-600 transition-colors"
                        title="Cancel"
                      >
                        <svg
                          className="size-5"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M6 18L18 6M6 6l12 12"
                          />
                        </svg>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div
                    onClick={() =>
                      handleInlineEdit(category._id, field._id, index, value)
                    }
                    className="relative bg-white rounded-md border border-gray-200 px-3 py-2 hover:border-purple-300 transition-colors group-hover:shadow-sm"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-gray-700 font-medium truncate pr-6">
                        {value}
                      </span>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRemoveValue(category._id, field._id, index);
                          }}
                          className="p-1 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-md transition-colors"
                          title="Remove"
                        >
                          <svg
                            className="size-5"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                            />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}

            {isEditing && (
              <div className="relative">
                <input
                  type="text"
                  value={tempValue}
                  onChange={(e) =>
                    handleTempValueChange(
                      category._id,
                      field._id,
                      e.target.value
                    )
                  }
                  className={baseInputClasses}
                  placeholder={`Enter ${field.fieldName.toLowerCase()}`}
                  autoFocus
                />
                <div className="absolute right-2 top-1/2 transform -translate-y-[50%] flex items-center gap-1">
                  <button
                    onClick={() => handleSaveValue(category._id, field._id)}
                    className="p-1 bg-purple-500 text-white rounded-md hover:bg-purple-600 transition-colors"
                    title="Save"
                  >
                    <svg
                      className="size-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  </button>
                  <button
                    onClick={() => handleCancelEdit(category._id, field._id)}
                    className="p-1 bg-gray-500 text-white rounded-md hover:bg-gray-600 transition-colors"
                    title="Cancel"
                  >
                    <svg
                      className="size-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                </div>
              </div>
            )}
            {!isEditing && (
              <button
                onClick={() => handleAddValue(category._id, field._id)}
                className="inline-flex justify-center items-center gap-1 size-10 bg-purple-500 cursor-pointer text-white text-sm font-medium rounded-full hover:bg-purple-700 transition-colors shadow-sm"
              >
                <svg
                  className="w-3.5 h-3.5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 4v16m8-8H4"
                  />
                </svg>
              </button>
            )}
          </div>
        </div>

        {errors[category._id]?.[field._id] && (
          <div className="flex items-center gap-2 text-red-600 bg-red-50 px-3 py-2 rounded-md border border-red-200">
            <svg
              className="w-4 h-4 flex-shrink-0"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <p className="text-sm font-medium">
              {errors[category._id][field._id]}
            </p>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto p-4">
        <div className="mb-8 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-purple-500 to-purple-700 rounded-xl mb-6 shadow-lg">
            <svg
              className="w-8 h-8 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
          </div>
          <h1 className="text-4xl font-black text-gray-900 mb-3 tracking-tight">
            Blueprint
          </h1>
          <p className="text-gray-600 text-lg max-w-3xl mx-auto leading-relaxed">
            Organize your project data with precision. Manage categories and
            field values with our intuitive interface.
          </p>
        </div>

        {loading ? (
          <div className="flex justify-center items-center h-48">
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-12 h-12 bg-purple-600 rounded-full mb-3">
                <Loader className="w-6 h-6 text-white animate-spin" />
              </div>
              <p className="text-gray-600 font-medium">Loading categories...</p>
            </div>
          </div>
        ) : !loading && categories.length > 0 ? (
          <div className="space-y-6">
            {categories.map((category) => {
              const categoryData = formData[category._id] || {};
              const hasData = category.fields.some((field) => {
                const values = categoryData[field._id] || [];
                return values.length > 0;
              });

              const fieldsWithData = category.fields.filter((field) => {
                const values = categoryData[field._id] || [];
                return values.length > 0;
              });

              const isExpanded = expandedCategories[category._id] || hasData;

              return (
                <div
                  key={category._id}
                  className={`bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden transition-all duration-300 ${
                    hasData
                      ? "shadow-lg border-purple-200"
                      : "shadow-sm border-gray-200 opacity-75 hover:opacity-100"
                  }`}
                >
                  <div
                    className={`px-6 py-4 border-b border-gray-200 ${
                      hasData
                        ? "bg-gradient-to-r from-purple-50 to-blue-50"
                        : "bg-gray-50"
                    }`}
                  >
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-4">
                        <div
                          className={`w-12 h-12 rounded-lg flex items-center justify-center shadow-md ${
                            hasData
                              ? "bg-gradient-to-br from-purple-500 to-purple-700"
                              : "bg-gray-300"
                          }`}
                        >
                          <svg
                            className={`w-6 h-6 ${
                              hasData ? "text-white" : "text-gray-500"
                            }`}
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                            />
                          </svg>
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-3">
                            <div className="flex items-center gap-2">
                              {projectId && (
                                <CategoryAliasEditor
                                  projectId={projectId}
                                  categoryId={category._id}
                                  defaultAlias={
                                    category.alias || category.title
                                  }
                                  effectiveAlias={category.effectiveAlias}
                                  onAliasChange={(newAlias) => {
                                    const updatedCategories = categories.map(
                                      (cat) =>
                                        cat._id === category._id
                                          ? { ...cat, effectiveAlias: newAlias }
                                          : cat
                                    );
                                  }}
                                  className={`text-2xl font-bold mb-1 ${
                                    hasData ? "text-gray-900" : "text-gray-600"
                                  }`}
                                />
                              )}
                              {!projectId && (
                                <h2
                                  className={`text-2xl font-bold mb-1 ${
                                    hasData ? "text-gray-900" : "text-gray-600"
                                  }`}
                                >
                                  {category.alias || category.title}
                                </h2>
                              )}
                            </div>
                            {!hasData && (
                              <button
                                onClick={() =>
                                  toggleCategoryExpansion(category._id)
                                }
                                className="p-1 hover:bg-gray-200 rounded-md transition-colors"
                                title={isExpanded ? "Collapse" : "Expand"}
                              >
                                <svg
                                  className={`w-5 h-5 text-gray-500 transition-transform duration-200 ${
                                    isExpanded ? "rotate-180" : ""
                                  }`}
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M19 9l-7 7-7-7"
                                  />
                                </svg>
                              </button>
                            )}
                          </div>
                          <div className="flex items-center gap-3 text-gray-600">
                            <span className="flex items-center gap-1">
                              <svg
                                className="w-3.5 h-3.5"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                                />
                              </svg>
                              {hasData
                                ? `${fieldsWithData.length} field${
                                    fieldsWithData.length !== 1 ? "s" : ""
                                  } with data`
                                : `${category.fields.length} field${
                                    category.fields.length !== 1 ? "s" : ""
                                  } available`}
                            </span>
                            {!hasData && (
                              <span className="text-xs bg-gray-200 text-gray-600 px-2 py-1 rounded-full">
                                {isExpanded ? "Expanded" : "Collapsed"}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <button
                        onClick={() => handleUpdateCategoryValue(category._id)}
                        disabled={
                          loadingStates[category._id] ||
                          !hasCategoryChanged(category._id)
                        }
                        className={`px-6 py-3 rounded-lg font-bold text-base transition-all duration-200 shadow-md ${
                          loadingStates[category._id] ||
                          !hasCategoryChanged(category._id)
                            ? "bg-gray-300 text-gray-500 cursor-not-allowed shadow-none"
                            : hasData
                            ? "bg-gradient-to-r from-purple-500 to-purple-700 text-white hover:from-purple-600 hover:to-purple-800 hover:shadow-lg transform hover:scale-105"
                            : "bg-gray-200 text-gray-600 hover:bg-gray-300"
                        }`}
                      >
                        {loadingStates[category._id] ? (
                          <div className="flex items-center gap-2">
                            <svg
                              className="animate-spin h-4 w-4"
                              fill="none"
                              viewBox="0 0 24 24"
                            >
                              <circle
                                className="opacity-25"
                                cx="12"
                                cy="12"
                                r="10"
                                stroke="currentColor"
                                strokeWidth="4"
                              ></circle>
                              <path
                                className="opacity-75"
                                fill="currentColor"
                                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                              ></path>
                            </svg>
                            <span>Updating...</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <svg
                              className="w-4 h-4"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M5 13l4 4L19 7"
                              />
                            </svg>
                            <span>
                              {hasData ? "Update Category" : "Add Content"}
                            </span>
                          </div>
                        )}
                      </button>
                    </div>
                  </div>

                  {isExpanded && (
                    <div
                      className={`p-6 bg-white transition-all duration-300 ${
                        !hasData ? "opacity-75" : ""
                      }`}
                    >
                      <div className="space-y-6">
                        {category.fields.map((field) => (
                          <div key={field._id}>
                            {renderField(category, field)}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {!hasData && !isExpanded && (
                    <div className="p-6 bg-gray-50 border-t border-gray-200">
                      <div className="text-center py-4">
                        <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-3">
                          <svg
                            className="w-6 h-6 text-gray-400"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                            />
                          </svg>
                        </div>
                        <p className="text-gray-500 text-sm mb-3">
                          Click the arrow to expand and add content to this
                          category
                        </p>
                        <button
                          onClick={() => toggleCategoryExpansion(category._id)}
                          className="inline-flex items-center gap-2 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                        >
                          <svg
                            className="w-4 h-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M19 9l-7 7-7-7"
                            />
                          </svg>
                          Expand Category
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="flex justify-center items-center min-h-64">
            <div className="text-center max-w-md">
              <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6 border border-gray-200">
                <svg
                  className="w-12 h-12 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                  />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-3">
                No categories found
              </h2>
              <p className="text-gray-600 mb-6 leading-relaxed">
                It looks like there are no categories available yet. Please
                create some categories to get started with your blueprint.
              </p>
              <div className="w-20 h-1 bg-gradient-to-r from-purple-500 to-purple-700 rounded-full mx-auto"></div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
