"use client";
import React, { useState, useEffect, useRef } from "react";
import { PlusIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { getTags, syncEntityTags } from "@/api/tags";
import { toast } from "react-hot-toast";

export const colorClasses: Record<string, { badge: string; dot: string; button: string }> = {
  gray: {
    badge: "bg-gray-100/70 text-gray-700 border border-gray-200/50 hover:bg-gray-200/50",
    dot: "bg-gray-400",
    button: "bg-gray-100 border-gray-300 text-gray-700 hover:bg-gray-200",
  },
  blue: {
    badge: "bg-blue-50/70 text-blue-700 border border-blue-100 hover:bg-blue-100/50",
    dot: "bg-blue-500",
    button: "bg-blue-100 border-blue-300 text-blue-700 hover:bg-blue-200",
  },
  green: {
    badge: "bg-emerald-50/70 text-emerald-700 border border-emerald-100 hover:bg-emerald-100/50",
    dot: "bg-emerald-500",
    button: "bg-emerald-100 border-emerald-300 text-emerald-700 hover:bg-emerald-200",
  },
  yellow: {
    badge: "bg-amber-50/70 text-amber-700 border border-amber-100 hover:bg-amber-100/50",
    dot: "bg-amber-500",
    button: "bg-amber-100 border-amber-300 text-amber-700 hover:bg-amber-200",
  },
  orange: {
    badge: "bg-orange-50/70 text-orange-700 border border-orange-100 hover:bg-orange-100/50",
    dot: "bg-orange-500",
    button: "bg-orange-100 border-orange-300 text-orange-700 hover:bg-orange-200",
  },
  red: {
    badge: "bg-rose-50/70 text-rose-700 border border-rose-100 hover:bg-rose-100/50",
    dot: "bg-rose-500",
    button: "bg-rose-100 border-rose-300 text-rose-700 hover:bg-rose-200",
  },
  purple: {
    badge: "bg-purple-50/70 text-purple-700 border border-purple-100 hover:bg-purple-100/50",
    dot: "bg-purple-500",
    button: "bg-purple-100 border-purple-300 text-purple-700 hover:bg-purple-200",
  },
};

export interface Tag {
  id: string;
  name: string;
  category: string;
  color: string;
}

export const TagBadge = ({
  tag,
  onRemove,
  size = "md",
}: {
  tag: Tag;
  onRemove?: () => void;
  size?: "sm" | "md";
}) => {
  const styles =
    tag.color && tag.color !== "none"
      ? colorClasses[tag.color]
      : null;
  const padding = size === "sm" ? "px-2 py-0.5 text-[10px]" : "px-2.5 py-1 text-xs";

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full font-semibold transition-colors duration-150 ${padding} ${styles
        ? styles.badge
        : "bg-transparent text-gray-700 border border-gray-300"
        }`}
    >
      <span>{tag.name}</span>
      {onRemove && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="hover:bg-black/5 rounded-full p-0.5 transition-colors"
        >
          <XMarkIcon className="h-3 w-3 stroke-[2.5]" />
        </button>
      )}
    </span>
  );
};

export const EntityTagSelector = ({
  entityId,
  entityType,
  initialTags = [],
  onTagsUpdated,
  disabled = false,
}: {
  entityId: string | number;
  entityType: "company" | "contact" | "inquiry" | "request_item" | "item" | "supplier";
  initialTags?: Tag[];
  onTagsUpdated?: (tags: Tag[]) => void;
  disabled?: boolean;
}) => {
  const [currentTags, setCurrentTags] = useState<Tag[]>(initialTags);
  const [allAvailableTags, setAllAvailableTags] = useState<Tag[]>([]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setCurrentTags(initialTags || []);
  }, [initialTags]);
  const loadAvailableTags = async () => {
    try {
      const res = await getTags(entityType);
      if (res && res.data) {
        setAllAvailableTags(res.data);
      }
    } catch (err) {
      console.error("Failed to load tags for selection:", err);
    }
  };

  useEffect(() => {
    if (isDropdownOpen) {
      loadAvailableTags();
    }
  }, [isDropdownOpen, entityType]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const saveTags = async (newTags: Tag[]) => {
    setLoading(true);
    try {
      const tagIds = newTags.map((t) => t.id);
      await syncEntityTags(entityId, entityType, tagIds);
      setCurrentTags(newTags);
      if (onTagsUpdated) {
        onTagsUpdated(newTags);
      }
    } catch (err) {
      toast.error("Failed to update tags");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddTag = (tag: Tag) => {
    if (currentTags.some((t) => t.id === tag.id)) return;
    const updated = [...currentTags, tag];
    saveTags(updated);
  };

  const handleRemoveTag = (tagId: string) => {
    const updated = currentTags.filter((t) => t.id !== tagId);
    saveTags(updated);
  };

  const tagsToSelect = allAvailableTags.filter(
    (tag) => !currentTags.some((t) => t.id === tag.id)
  );

  return (
    <div className="flex flex-wrap items-center gap-1.5 relative" ref={dropdownRef}>
      {currentTags.map((tag) => (
        <TagBadge key={tag.id} tag={tag} onRemove={disabled ? undefined : () => handleRemoveTag(tag.id)} />
      ))}

      {!disabled && (
        <div className="relative">
          <button
            type="button"
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            disabled={loading}
            className="flex items-center justify-center p-1 rounded-full border border-dashed border-gray-300 hover:border-[#8CC21B] hover:bg-[#8CC21B]/5 text-gray-500 hover:text-[#8CC21B] transition-all"
            title="Add Tag"
          >
            <PlusIcon className="h-4 w-4 stroke-[2]" />
          </button>

          {isDropdownOpen && (
            <div className="absolute left-0 mt-1 w-64 bg-white border border-gray-200 rounded-xl shadow-xl z-50 py-2 animate-in fade-in slide-in-from-top-1 duration-150">
              <div className="px-3 py-1.5 border-b border-gray-100 mb-1">
                <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                  Select Tag ({entityType})
                </span>
              </div>

              <div className="max-h-56 overflow-y-auto px-1 space-y-0.5">
                {tagsToSelect.length === 0 ? (
                  <div className="px-3 py-3 text-xs text-gray-500 text-center">
                    {allAvailableTags.length === 0 ? "No tags created yet." : "All tags already assigned."}
                  </div>
                ) : (
                  tagsToSelect.map((tag) => {
                    const styles =
                      tag.color && tag.color !== "none"
                        ? colorClasses[tag.color]
                        : null;
                    return (
                      <button
                        key={tag.id}
                        type="button"
                        onClick={() => {
                          handleAddTag(tag);
                          setIsDropdownOpen(false);
                        }}
                        className="w-full text-left px-3 py-2 text-xs rounded-lg hover:bg-gray-50 flex items-center gap-2 text-gray-700 transition-colors"
                      >
                        <span
                          className={`w-2 h-2 rounded-full ${styles ? styles.dot : "bg-white border border-gray-400"
                            }`}
                        />
                        <span className="font-medium">{tag.name}</span>
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export const TagPickerInput = ({
  category,
  selectedTags,
  onChange,
  disabled = false,
}: {
  category: "company" | "contact" | "inquiry" | "request_item" | "item" | "supplier";
  selectedTags: Tag[];
  onChange: (tags: Tag[]) => void;
  disabled?: boolean;
}) => {
  const [allAvailableTags, setAllAvailableTags] = useState<Tag[]>([]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isDropdownOpen) return;
    getTags(category)
      .then((res) => {
        if (res?.data) setAllAvailableTags(res.data);
      })
      .catch(console.error);
  }, [isDropdownOpen, category]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const tagsToSelect = allAvailableTags.filter(
    (t) => !selectedTags.some((s) => s.id === t.id)
  );

  return (
    <div className="flex flex-wrap items-center gap-1.5 relative" ref={dropdownRef}>
      {selectedTags.map((tag) => (
        <TagBadge
          key={tag.id}
          tag={tag}
          onRemove={
            disabled
              ? undefined
              : () => onChange(selectedTags.filter((t) => t.id !== tag.id))
          }
        />
      ))}
      {!disabled && (
        <div className="relative">
          <button
            type="button"
            onClick={() => setIsDropdownOpen((o) => !o)}
            className="flex items-center justify-center p-1 rounded-full border border-dashed border-gray-300 hover:border-[#8CC21B] hover:bg-[#8CC21B]/5 text-gray-500 hover:text-[#8CC21B] transition-all"
            title="Add Tag"
          >
            <PlusIcon className="h-4 w-4 stroke-[2]" />
          </button>
          {isDropdownOpen && (
            <div className="absolute left-0 mt-1 w-60 bg-white border border-gray-200 rounded-xl shadow-xl z-50 py-2 animate-in fade-in slide-in-from-top-1 duration-150">
              <div className="px-3 py-1.5 border-b border-gray-100 mb-1">
                <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                  Select Tag
                </span>
              </div>
              <div className="max-h-52 overflow-y-auto px-1 space-y-0.5">
                {tagsToSelect.length === 0 ? (
                  <div className="px-3 py-3 text-xs text-gray-500 text-center">
                    {allAvailableTags.length === 0
                      ? "No tags created yet."
                      : "All tags already assigned."}
                  </div>
                ) : (
                  tagsToSelect.map((tag) => {
                    const styles =
                      tag.color && tag.color !== "none"
                        ? colorClasses[tag.color]
                        : null;
                    return (
                      <button
                        key={tag.id}
                        type="button"
                        onClick={() => {
                          onChange([...selectedTags, tag]);
                          setIsDropdownOpen(false);
                        }}
                        className="w-full text-left px-3 py-2 text-xs rounded-lg hover:bg-gray-50 flex items-center gap-2 text-gray-700 transition-colors"
                      >
                        <span
                          className={`w-2 h-2 rounded-full flex-shrink-0 ${styles ? styles.dot : "bg-white border border-gray-400"
                            }`}
                        />
                        <span className="font-medium">{tag.name}</span>
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>
      )}
      {selectedTags.length === 0 && !isDropdownOpen && (
        <span className="text-xs text-gray-400 italic">No tags selected</span>
      )}
    </div>
  );
};
