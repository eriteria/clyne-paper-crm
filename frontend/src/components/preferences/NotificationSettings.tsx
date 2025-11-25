import React from "react";
import { Mail, MessageSquare, Bell } from "lucide-react";
import SectionCard from "./SectionCard";
import ToggleSwitch from "./ToggleSwitch";
import type { UpdateStructuredSettingsRequest } from "@/types/settings";

interface NotificationSettingsProps {
  settings: UpdateStructuredSettingsRequest;
  onUpdate: (updates: UpdateStructuredSettingsRequest) => void;
  isUpdating: boolean;
}

export default function NotificationSettings({
  settings,
  onUpdate,
  isUpdating,
}: NotificationSettingsProps) {
  return (
    <SectionCard
      title="Notification Preferences"
      description="Control how you receive updates and alerts"
      icon={<Bell className="h-5 w-5" />}
    >
      <div className="space-y-4">
        <ToggleSwitch
          id="emailNotifications"
          label="Email Notifications"
          description="Receive updates and alerts via email"
          checked={settings.emailNotifications ?? false}
          onChange={(checked) =>
            onUpdate({ emailNotifications: checked })
          }
          disabled={isUpdating}
          icon={<Mail className="h-5 w-5" />}
        />

        <ToggleSwitch
          id="smsNotifications"
          label="SMS Notifications"
          description="Receive alerts via SMS text messages"
          checked={settings.smsNotifications ?? false}
          onChange={(checked) =>
            onUpdate({ smsNotifications: checked })
          }
          disabled={isUpdating}
          icon={<MessageSquare className="h-5 w-5" />}
        />

        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-800">
            <strong>Note:</strong> Critical system notifications will always be sent regardless of these settings to ensure you don&apos;t miss important updates.
          </p>
        </div>
      </div>
    </SectionCard>
  );
}
