"use client";

import React, { useState, useEffect } from "react";
import { Search, Filter, Download } from "lucide-react";

interface SearchBarProps {
  onSearchChange: (searchTerm: string) => void;
  placeholder?: string;
}

export default function SearchBar({
  onSearchChange,
  placeholder = "Search...",
}: SearchBarProps) {
  const [searchValue, setSearchValue] = useState("");

  // Debounce the search term
  useEffect(() => {
    const timer = setTimeout(() => {
      onSearchChange(searchValue);
    }, 500);

    return () => clearTimeout(timer);
  }, [searchValue, onSearchChange]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchValue(e.target.value);
  };

  return (
    <div className="flex flex-col sm:flex-row gap-4">
      <div className="flex-1">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <input
            type="text"
            placeholder={placeholder}
            value={searchValue}
            onChange={handleSearchChange}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder-gray-500"
          />
        </div>
      </div>
      <div className="flex gap-3">
        <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-gray-700">
          <Download className="h-4 w-4" />
          Export
        </button>
        <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-gray-700">
          <Filter className="h-4 w-4" />
          Filters
        </button>
      </div>
    </div>
  );
}
