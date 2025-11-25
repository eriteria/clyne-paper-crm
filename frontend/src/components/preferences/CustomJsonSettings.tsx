import React, { useState, useEffect } from "react";
import { Code, AlertCircle, CheckCircle, X } from "lucide-react";
import SectionCard from "./SectionCard";
import { safeJsonParse, safeJsonStringify } from "@/utils/merge";
import type { CustomSettings } from "@/types/settings";

interface CustomJsonSettingsProps {
  settings: CustomSettings;
  onUpdate: (updates: Partial<CustomSettings>) => void;
  isUpdating: boolean;
}

export default function CustomJsonSettings({
  settings,
  onUpdate,
  isUpdating,
}: CustomJsonSettingsProps) {
  const [jsonText, setJsonText] = useState("");
  const [isValid, setIsValid] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [hasChanges, setHasChanges] = useState(false);

  // Initialize JSON text from settings
  useEffect(() => {
    setJsonText(safeJsonStringify(settings, 2));
    setIsValid(true);
    setErrorMessage("");
    setHasChanges(false);
  }, [settings]);

  // Validate JSON on change
  const handleJsonChange = (value: string) => {
    setJsonText(value);
    setHasChanges(true);

    if (!value.trim()) {
      setIsValid(false);
      setErrorMessage("JSON cannot be empty");
      return;
    }

    const parsed = safeJsonParse<CustomSettings>(value);
    if (parsed === null) {
      setIsValid(false);
      setErrorMessage("Invalid JSON format. Please check your syntax.");
    } else {
      setIsValid(true);
      setErrorMessage("");
    }
  };

  // Apply changes
  const handleApply = () => {
    const parsed = safeJsonParse<CustomSettings>(jsonText);
    if (parsed) {
      onUpdate(parsed);
      setHasChanges(false);
    }
  };

  // Reset to current settings
  const handleReset = () => {
    setJsonText(safeJsonStringify(settings, 2));
    setIsValid(true);
    setErrorMessage("");
    setHasChanges(false);
  };

  // Format JSON
  const handleFormat = () => {
    const parsed = safeJsonParse<CustomSettings>(jsonText);
    if (parsed) {
      setJsonText(safeJsonStringify(parsed, 2));
      setIsValid(true);
      setErrorMessage("");
    }
  };

  return (
    <SectionCard
      title="Advanced / Custom Settings"
      description="Edit custom preferences in JSON format for advanced users"
      icon={<Code className="h-5 w-5" />}
      actions={
        <div className="flex gap-2">
          <button
            onClick={handleFormat}
            disabled={!isValid || isUpdating}
            className="px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            Format
          </button>
          <button
            onClick={handleReset}
            disabled={!hasChanges || isUpdating}
            className="px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            Reset
          </button>
          <button
            onClick={handleApply}
            disabled={!isValid || !hasChanges || isUpdating}
            className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            {isUpdating ? "Saving..." : "Apply"}
          </button>
        </div>
      }
    >
      <div className="space-y-4">
        {/* Warning */}
        <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5 flex-shrink-0" />
            <div>
              <h4 className="font-medium text-yellow-800">Advanced Users Only</h4>
              <p className="text-sm text-yellow-700 mt-1">
                Editing JSON directly can break your settings if done incorrectly.
                Only modify if you understand JSON syntax and the settings structure.
              </p>
            </div>
          </div>
        </div>

        {/* JSON Editor */}
        <div className="relative">
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium text-gray-700">
              Custom Settings JSON
            </label>
            {isValid && hasChanges && (
              <div className="flex items-center gap-1 text-green-600 text-sm">
                <CheckCircle className="h-4 w-4" />
                Valid JSON
              </div>
            )}
            {!isValid && (
              <div className="flex items-center gap-1 text-red-600 text-sm">
                <X className="h-4 w-4" />
                Invalid JSON
              </div>
            )}
          </div>
          
          <textarea
            value={jsonText}
            onChange={(e) => handleJsonChange(e.target.value)}
            disabled={isUpdating}
            className={`w-full h-96 px-4 py-3 font-mono text-sm border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed transition ${
              isValid ? "border-gray-300 bg-white" : "border-red-300 bg-red-50"
            }`}
            placeholder='{\n  "theme": "light",\n  "sidebarCollapsed": false\n}'
            spellCheck={false}
          />

          {/* Error Message */}
          {!isValid && errorMessage && (
            <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-red-700">{errorMessage}</p>
              </div>
            </div>
          )}
        </div>

        {/* Schema Reference */}
        <div className="bg-gray-50 border border-gray-200 p-4 rounded-lg">
          <h4 className="text-sm font-medium text-gray-900 mb-2">
            Available Custom Settings:
          </h4>
          <div className="text-xs text-gray-600 font-mono space-y-1">
            <div>• <span className="text-blue-600">theme</span>: &quot;light&quot; | &quot;dark&quot; | &quot;system&quot;</div>
            <div>• <span className="text-blue-600">sidebarCollapsed</span>: boolean</div>
            <div>• <span className="text-blue-600">table</span>: {`{ defaultPageSize: number, density: string }`}</div>
            <div>• <span className="text-blue-600">[custom]</span>: Add your own key-value pairs</div>
          </div>
        </div>
      </div>
    </SectionCard>
  );
}
