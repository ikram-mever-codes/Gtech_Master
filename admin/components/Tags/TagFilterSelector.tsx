"use client";
import React, { useState, useEffect, useRef, useCallback } from "react";
import { getTags } from "@/api/tags";
import {
  PlusIcon,
  XMarkIcon,
  FunnelIcon,
  ArrowPathIcon,
} from "@heroicons/react/24/outline";
import { colorClasses, Tag } from "./TagManager";

interface TagFilter {
  tag: Tag;
  mode: "include" | "exclude";
}

interface TagFilterSelectorProps {
  category:
    | "company"
    | "contact"
    | "inquiry"
    | "request_item"
    | "item"
    | "supplier";
  onChange: (filterString: string) => void;
  onReset?: () => void;
  compact?: boolean;
}

export const TagFilterSelector: React.FC<TagFilterSelectorProps> = ({
  category,
  onChange,
  onReset,
  compact = false,
}) => {
  const [availableTags, setAvailableTags] = useState<Tag[]>([]);
  const [selectedFilters, setSelectedFilters] = useState<TagFilter[]>([]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);

  const onChangeRef = useRef(onChange);
  useEffect(() => {
    onChangeRef.current = onChange;
  });
  const isMounted = useRef(false);

  useEffect(() => {
    const loadTags = async () => {
      try {
        const res = await getTags(category);
        if (res && res.data) {
          setAvailableTags(res.data);
        }
      } catch (err) {
        console.error("Failed to fetch filter tags:", err);
      }
    };
    loadTags();
  }, [category]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (!isMounted.current) {
      isMounted.current = true;
      return;
    }

    if (selectedFilters.length === 0) {
      onChangeRef.current("");
      return;
    }

    const filterString = selectedFilters
      .map((f) => (f.mode === "exclude" ? `!${f.tag.id}` : f.tag.id))
      .join(",");
    onChangeRef.current(filterString);
  }, [selectedFilters]);

  const handleToggleTag = (tag: Tag) => {
    const isAlreadySelected = selectedFilters.some((f) => f.tag.id === tag.id);
    if (isAlreadySelected) {
      setSelectedFilters(selectedFilters.filter((f) => f.tag.id !== tag.id));
    } else {
      setSelectedFilters([...selectedFilters, { tag, mode: "include" }]);
    }
  };

  const handleRemoveFilter = (tagId: string) => {
    setSelectedFilters(selectedFilters.filter((f) => f.tag.id !== tagId));
  };

  const handleToggleMode = (tagId: string) => {
    setSelectedFilters(
      selectedFilters.map((f) => {
        if (f.tag.id === tagId) {
          return { ...f, mode: f.mode === "include" ? "exclude" : "include" };
        }
        return f;
      }),
    );
  };

  const handleClearAll = () => {
    setSelectedFilters([]);
    if (onReset) onReset();
  };

  const filteredDropdownTags = availableTags.filter((tag) =>
    tag.name.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  return (
    <div className={compact ? "w-full" : "space-y-2.5 w-full max-w-lg"} ref={dropdownRef}>
      {!compact && (
        <label className="block text-sm font-medium text-gray-700 flex items-center justify-between">
          {selectedFilters.length > 0 && (
            <button
              type="button"
              onClick={handleClearAll}
              className="text-xs text-rose-600 hover:text-rose-800 font-semibold flex items-center gap-1"
            >
              <ArrowPathIcon className="w-3.5 h-3.5" />
              Clear Tag Filters
            </button>
          )}
        </label>
      )}

      <div className="relative">
        <div
          onClick={() => setIsDropdownOpen(true)}
          className={
            compact
              ? `min-h-[38px] w-full px-3 py-1.5 border rounded-md focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary transition-all cursor-pointer flex flex-wrap items-center gap-1 ${
                  selectedFilters.length > 0
                    ? "font-bold text-emerald-600 border-emerald-500 bg-emerald-50/20"
                    : "border-gray-300 bg-white"
                }`
              : "min-h-[46px] w-full px-3 py-2 border border-gray-200 rounded-xl bg-white focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary transition-all cursor-pointer flex flex-wrap items-center gap-2"
          }
        >
          {selectedFilters.length === 0 && (
            <span className="text-gray-400 text-sm">
              Tags...
            </span>
          )}

          {selectedFilters.map((filter) => {
            const styles = colorClasses[filter.tag.color] || colorClasses.gray;
            const isInclude = filter.mode === "include";

            return (
              <div
                key={filter.tag.id}
                onClick={(e) => e.stopPropagation()}
                className={
                  compact
                    ? `inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-semibold select-none border transition-all ${
                        isInclude
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200/60 hover:bg-emerald-100/50"
                          : "bg-rose-50 text-rose-700 border-rose-200/60 hover:bg-rose-100/50"
                      }`
                    : `inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold select-none border transition-all ${
                        isInclude
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200/60 hover:bg-emerald-100/50"
                          : "bg-rose-50 text-rose-700 border-rose-200/60 hover:bg-rose-100/50"
                      }`
                }
              >
                <button
                  type="button"
                  onClick={() => handleToggleMode(filter.tag.id)}
                  className={
                    compact
                      ? `px-1 py-0.2 rounded font-black text-[8px] uppercase tracking-wider transition-all ${
                          isInclude
                            ? "bg-emerald-200/70 text-emerald-800 hover:bg-emerald-300"
                            : "bg-rose-200/70 text-rose-800 hover:bg-rose-300"
                        }`
                      : `px-1.5 py-0.5 rounded font-black text-[9px] uppercase tracking-wider transition-all ${
                          isInclude
                            ? "bg-emerald-200/70 text-emerald-800 hover:bg-emerald-300"
                            : "bg-rose-200/70 text-rose-800 hover:bg-rose-300"
                        }`
                  }
                  title="Click to toggle Include/Exclude"
                >
                  {compact ? (isInclude ? "Inc" : "Exc") : (isInclude ? "Include" : "Exclude")}
                </button>
                <span className={compact ? "max-w-[70px] truncate" : "max-w-[120px] truncate"}>
                  {filter.tag.name}
                </span>
                <button
                  type="button"
                  onClick={() => handleRemoveFilter(filter.tag.id)}
                  className="hover:bg-black/5 rounded-full p-0.5 transition-colors"
                >
                  <XMarkIcon className="h-3 w-3 stroke-[2.5]" />
                </button>
              </div>
            );
          })}
        </div>

        {isDropdownOpen && (
          <div className="absolute w-full mt-1.5 bg-white border border-gray-200 rounded-xl shadow-xl z-50 py-2.5 animate-in fade-in slide-in-from-top-1 duration-150">
            <div className="px-3 pb-2 border-b border-gray-100 mb-2">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search tags..."
                className="w-full px-3 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
                onClick={(e) => e.stopPropagation()}
                autoFocus
              />
            </div>

            <div className="max-h-56 overflow-y-auto px-1.5 space-y-0.5">
              {filteredDropdownTags.length === 0 ? (
                <div className="px-3 py-3 text-xs text-gray-500 text-center">
                  {searchQuery ? "No tags match search." : "No available tags."}
                </div>
              ) : (
                filteredDropdownTags.map((tag) => {
                  const styles = colorClasses[tag.color] || colorClasses.gray;
                  const isSelected = selectedFilters.some(
                    (f) => f.tag.id === tag.id,
                  );
                  return (
                    <button
                      key={tag.id}
                      type="button"
                      onClick={() => handleToggleTag(tag)}
                      className={`w-full text-left px-3 py-2 text-xs rounded-lg flex items-center justify-between text-gray-700 transition-colors ${
                        isSelected
                          ? "bg-[#8CC21B]/10 hover:bg-[#8CC21B]/15"
                          : "hover:bg-gray-50"
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <div
                          className={`w-4 h-4 rounded border flex items-center justify-center transition-all ${
                            isSelected
                              ? "bg-[#8CC21B] border-[#8CC21B] text-white scale-100"
                              : "border-gray-300 bg-white"
                          }`}
                        >
                          {isSelected && (
                            <svg
                              className="w-2.5 h-2.5 stroke-[3]"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M4.5 12.75l6 6 9-13.5"
                              />
                            </svg>
                          )}
                        </div>
                        <span
                          className={`w-2 h-2 rounded-full ${styles.dot}`}
                        />
                        <span className="font-semibold">{tag.name}</span>
                      </div>
                      <span className="text-[9px] bg-gray-100 text-gray-400 px-1.5 py-0.5 rounded font-bold uppercase">
                        {tag.color}
                      </span>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>

      {!compact && selectedFilters.length > 0 && (
        <p className="text-[10px] text-gray-400 italic">
          💡 Filtering logic: Showing items that have **all**{" "}
          <span className="text-emerald-600 font-semibold">Include</span> tags
          AND **none** of the{" "}
          <span className="text-rose-600 font-semibold">Exclude</span> tags.
        </p>
      )}
    </div>
  );
};
