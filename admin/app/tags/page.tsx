"use client";
import React, { useState, useEffect } from "react";
import {
  TagIcon,
  TrashIcon,
  PencilIcon,
  CheckIcon,
} from "@heroicons/react/24/outline";
import { getTags, createTag, updateTag, deleteTag } from "@/api/tags";
import { toast } from "react-hot-toast";
import { colorClasses, TagBadge } from "@/components/Tags/TagManager";
import PageHeader from "@/components/UI/PageHeader";
import { Tag } from "lucide-react";

const CATEGORIES = [
  { id: "company", label: "Companies" },
  { id: "contact", label: "Contacts" },
  { id: "inquiry", label: "Inquiries" },
  { id: "request_item", label: "Request Items" },
  { id: "item", label: "Items" },
  { id: "supplier", label: "Suppliers" },
];

const FORM_CATEGORIES = [
  { id: "company", label: "Company" },
  { id: "contact", label: "Contact" },
  { id: "inquiry", label: "Inquiry" },
  { id: "request_item", label: "Request Item" },
  { id: "item", label: "Item" },
  { id: "supplier", label: "Supplier" },
];

const COLORS = [
  { id: "none", label: "No Color", bg: "bg-white" },
  { id: "gray", label: "Gray", bg: "bg-gray-100" },
  { id: "blue", label: "Blue", bg: "bg-blue-100" },
  { id: "green", label: "Green", bg: "bg-emerald-100" },
  { id: "yellow", label: "Yellow", bg: "bg-amber-100" },
  { id: "orange", label: "Orange", bg: "bg-orange-100" },
  { id: "red", label: "Red", bg: "bg-rose-100" },
  { id: "purple", label: "Purple", bg: "bg-purple-100" },
];

interface Tag {
  id: string;
  name: string;
  category: string;
  color: string;
}

export default function TagsPage() {
  const [activeTab, setActiveTab] = useState("company");
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [tagName, setTagName] = useState("");
  const [tagCategory, setTagCategory] = useState("company");
  const [tagColor, setTagColor] = useState("none");
  const [submitting, setSubmitting] = useState(false);

  const fetchTags = async () => {
    setLoading(true);
    try {
      const res = await getTags(activeTab);
      if (res && res.data) {
        setTags(res.data);
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to load tags");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTags();
  }, [activeTab]);

  const resetForm = () => {
    setTagName("");
    setTagCategory("company");
    setTagColor("none");
    setIsEditing(false);
    setEditingId(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tagName.trim()) {
      toast.error("Tag name is required");
      return;
    }

    setSubmitting(true);
    try {
      if (isEditing && editingId) {
        const res = await updateTag(editingId, {
          name: tagName,
          category: tagCategory,
          color: tagColor,
        });
        if (res) {
          toast.success("Tag updated successfully");
          fetchTags();
          resetForm();
        }
      } else {
        const res = await createTag({
          name: tagName,
          category: tagCategory,
          color: tagColor,
        });
        if (res) {
          toast.success("Tag created successfully");
          fetchTags();
          resetForm();
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (tag: Tag) => {
    setIsEditing(true);
    setEditingId(tag.id);
    setTagName(tag.name);
    setTagCategory(tag.category);
    setTagColor(tag.color);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this tag?")) return;
    try {
      const res = await deleteTag(id);
      if (res) {
        toast.success("Tag deleted successfully");
        fetchTags();
      }
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || "Failed to delete tag";
      toast.error(msg);
      console.error(err);
    }
  };

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-8">
      <PageHeader title="Tag Management" icon={Tag} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-6 h-fit lg:sticky lg:top-6">
          <div>
            <h3 className="text-lg font-bold text-gray-900">
              {isEditing ? "Edit Tag" : "Create New Tag"}
            </h3>
            <p className="text-xs text-gray-500 mt-1">
              {isEditing
                ? "Update details for this tag."
                : "Add a new reusable category tag."}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-1.5">
              <label
                htmlFor="tag_name_field"
                className="text-xs font-bold text-gray-700 uppercase tracking-wider block"
              >
                Tag Name
              </label>
              <input
                id="tag_name_field"
                type="text"
                value={tagName}
                onChange={(e) => setTagName(e.target.value)}
                placeholder="e.g. Strategic Partner"
                className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#8CC21B]/20 focus:border-[#8CC21B] transition-all bg-gray-50/50"
              />
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="tagCategory"
                className="text-xs font-bold text-gray-700 uppercase tracking-wider block"
              >
                Category Resource
              </label>
              <select
                id="tagCategory"
                value={tagCategory}
                onChange={(e) => setTagCategory(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#8CC21B]/20 focus:border-[#8CC21B] transition-all bg-gray-50/50"
              >
                {FORM_CATEGORIES.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-700 uppercase tracking-wider block">
                Badge Color
              </label>
              <div className="grid grid-cols-8 gap-2">
                {COLORS.map((col) => {
                  const isSelected = tagColor === col.id;
                  const activeColorClass =
                    colorClasses[col.id] || {
                      button: "bg-white border-gray-300 text-gray-700",
                      dot: "bg-white",
                    };
                  return (
                    <button
                      key={col.id}
                      type="button"
                      onClick={() => setTagColor(col.id)}
                      className={`h-9 rounded-xl flex items-center justify-center border transition-all ${isSelected
                        ? `${activeColorClass.button} ring-2 ring-[#8CC21B]/20`
                        : "border-gray-200 bg-white hover:bg-gray-50 text-gray-400"
                        }`}
                      title={col.label}
                    >
                      <span
                        className={`w-3.5 h-3.5 rounded-full ${col.id === "none"
                          ? "bg-white border border-gray-400"
                          : isSelected
                            ? activeColorClass.dot
                            : col.bg
                          } flex items-center justify-center`}
                      >
                        {isSelected && col.id !== "none" && (
                          <CheckIcon className="h-2 w-2 stroke-[3] text-white" />
                        )}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-700 uppercase tracking-wider block">
                Preview
              </label>
              <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-xl border border-gray-100">
                <TagBadge
                  tag={{
                    id: "preview",
                    name: tagName || "Tag Name",
                    category: tagCategory,
                    color: tagColor,
                  }}
                />
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="submit"
                disabled={submitting}
                className="flex-1 px-4 py-2.5 bg-[#8CC21B] hover:bg-[#7ab318] disabled:opacity-50 text-white rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-2 shadow-sm"
              >
                {isEditing ? "Save Changes" : "Create Tag"}
              </button>
              {isEditing && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-sm font-semibold transition-all"
                >
                  Cancel
                </button>
              )}
            </div>
          </form>
        </div>

        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center gap-2 border-b border-gray-100 overflow-x-auto pb-px">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setActiveTab(cat.id)}
                className={`px-4 py-2.5 text-sm font-semibold border-b-2 whitespace-nowrap transition-all -mb-px ${activeTab === cat.id
                  ? "border-[#8CC21B] text-[#8CC21B]"
                  : "border-transparent text-gray-500 hover:text-gray-900"
                  }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="bg-white rounded-2xl border border-gray-100 p-12 flex flex-col items-center justify-center gap-3">
              <div className="w-8 h-8 border-2 border-[#8CC21B] border-t-transparent rounded-full animate-spin"></div>
              <span className="text-sm font-semibold text-gray-500">
                Loading tags...
              </span>
            </div>
          ) : tags.length === 0 ? (
            <div className="bg-white rounded-2xl border-2 border-dashed border-gray-200 p-12 text-center">
              <TagIcon className="h-10 w-10 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 font-medium">
                No tags found for this category.
              </p>
              <p className="text-xs text-gray-400 mt-1">
                Use the form on the left to add a tag.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {tags.map((tag) => (
                <div
                  key={tag.id}
                  className="bg-white rounded-2xl border border-gray-100 p-4 flex items-center justify-between hover:border-gray-200 hover:shadow-sm transition-all group"
                >
                  <div className="flex flex-col gap-1.5">
                    <div>
                      <TagBadge tag={tag} />
                    </div>
                    <span className="text-[10px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider w-fit">
                      {tag.category}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => handleEdit(tag)}
                      className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"
                      title="Edit Tag"
                    >
                      <PencilIcon className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(tag.id)}
                      className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
                      title="Delete Tag"
                    >
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
