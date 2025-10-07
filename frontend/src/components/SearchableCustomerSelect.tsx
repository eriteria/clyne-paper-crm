import React, { useState, useRef, useEffect } from "react";
import { ChevronDown, User, Search } from "lucide-react";
import { Customer } from "@/types";

interface SearchableCustomerSelectProps {
  customers: Customer[];
  selectedCustomer: Customer | null;
  onCustomerChange: (customer: Customer | null) => void;
  placeholder?: string;
  required?: boolean;
  loading?: boolean;
  label?: string;
  className?: string;
}

export default function SearchableCustomerSelect({
  customers,
  selectedCustomer,
  onCustomerChange,
  placeholder = "Choose a customer...",
  required = false,
  loading = false,
  label = "Customer",
  className = "",
}: SearchableCustomerSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Filter customers based on search term
  const filteredCustomers = customers.filter((customer) => {
    const searchStr = searchTerm.toLowerCase();
    const customerName = (customer.name || "").toLowerCase();
    const companyName = (customer.companyName || "").toLowerCase();
    return customerName.includes(searchStr) || companyName.includes(searchStr);
  });

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
        setSearchTerm("");
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Focus search input when dropdown opens
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isOpen]);

  const handleCustomerSelect = (customer: Customer) => {
    onCustomerChange(customer);
    setIsOpen(false);
    setSearchTerm("");
  };

  const handleClearSelection = () => {
    onCustomerChange(null);
    setIsOpen(false);
    setSearchTerm("");
  };

  const getDisplayValue = () => {
    if (selectedCustomer) {
      return (
        selectedCustomer.name ||
        selectedCustomer.companyName ||
        "Unnamed Customer"
      );
    }
    return "";
  };

  return (
    <div className={`relative ${className}`}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-2">
          <User className="w-4 h-4 inline mr-1" />
          {label} {required && "*"}
        </label>
      )}

      <div className="relative" ref={dropdownRef}>
        {/* Selected Value Display / Trigger */}
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="w-full px-3 py-2 text-left border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white flex items-center justify-between hover:border-gray-400 transition-colors"
        >
          <span
            className={selectedCustomer ? "text-gray-900" : "text-gray-500"}
          >
            {selectedCustomer ? getDisplayValue() : placeholder}
          </span>
          <ChevronDown
            className={`w-4 h-4 text-gray-400 transition-transform ${
              isOpen ? "rotate-180" : ""
            }`}
          />
        </button>

        {/* Dropdown */}
        {isOpen && (
          <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg">
            {/* Search Input */}
            <div className="p-2 border-b border-gray-200">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder="Search customers..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                />
              </div>
            </div>

            {/* Options List */}
            <div className="max-h-60 overflow-y-auto">
              {loading ? (
                <div className="px-3 py-2 text-sm text-gray-500">
                  Loading customers...
                </div>
              ) : filteredCustomers.length > 0 ? (
                <>
                  {/* Clear Selection Option */}
                  {selectedCustomer && (
                    <>
                      <button
                        type="button"
                        onClick={handleClearSelection}
                        className="w-full px-3 py-2 text-left text-sm text-gray-500 hover:bg-gray-50 border-b border-gray-100"
                      >
                        <em>Clear selection</em>
                      </button>
                    </>
                  )}

                  {/* Customer Options */}
                  {filteredCustomers.map((customer) => (
                    <button
                      key={customer.id}
                      type="button"
                      onClick={() => handleCustomerSelect(customer)}
                      className={`w-full px-3 py-2 text-left text-sm hover:bg-blue-50 focus:bg-blue-50 focus:outline-none ${
                        selectedCustomer?.id === customer.id
                          ? "bg-blue-100 text-blue-900"
                          : "text-gray-900"
                      }`}
                    >
                      <div>
                        <div className="font-medium">
                          {customer.name || "Unnamed Customer"}
                        </div>
                        {customer.companyName && (
                          <div className="text-gray-500 text-xs">
                            {customer.companyName}
                          </div>
                        )}
                        {customer.email && (
                          <div className="text-gray-400 text-xs">
                            {customer.email}
                          </div>
                        )}
                      </div>
                    </button>
                  ))}
                </>
              ) : (
                <div className="px-3 py-2 text-sm text-gray-500">
                  {searchTerm ? "No customers found" : "No customers available"}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
