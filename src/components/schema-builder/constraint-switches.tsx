"use client";

import { KeyRound, LockKeyhole, Sparkles } from "lucide-react";

import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import type { ColumnDefinition } from "@/lib/sql-generator";

interface ConstraintSwitchesProps {
  column: ColumnDefinition;
  primaryKeyCount: number;
  onChange: (patch: Partial<ColumnDefinition>) => void;
}

const constraintItems = [
  {
    key: "isPrimaryKey" as const,
    title: "Primary key",
    description: "Defines the table's core identity",
    icon: KeyRound,
  },
  {
    key: "isUnique" as const,
    title: "Unique",
    description: "Prevents duplicate values",
    icon: Sparkles,
  },
  {
    key: "isNotNull" as const,
    title: "Required",
    description: "Disallows null values",
    icon: LockKeyhole,
  },
];

export function ConstraintSwitches({
  column,
  primaryKeyCount,
  onChange,
}: ConstraintSwitchesProps) {
  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-3">
        {constraintItems.map((item) => {
          const Icon = item.icon;
          const checked =
            item.key === "isPrimaryKey"
              ? column.isPrimaryKey
              : item.key === "isUnique"
                ? column.isUnique
                : column.isPrimaryKey
                  ? true
                  : column.isNotNull;
          const disabled = item.key === "isNotNull" && column.isPrimaryKey;

          return (
            <label
              key={item.key}
              className={cn(
                "group rounded-[24px] border px-4 py-4 shadow-[0_18px_40px_-34px_rgba(15,23,42,0.42)] transition-all duration-200 ease-out",
                checked
                  ? "border-primary/18 bg-primary/[0.08]"
                  : "border-white/82 bg-white/78",
                disabled && "opacity-85",
              )}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div
                    className={cn(
                      "flex h-10 w-10 items-center justify-center rounded-[16px] transition-colors",
                      checked
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted/80 text-muted-foreground",
                    )}
                  >
                    <Icon className="h-4 w-4" />
                  </div>
                  <span className="space-y-1">
                    <span className="block text-sm font-semibold text-foreground">
                      {item.title}
                    </span>
                    <span className="block text-xs leading-5 text-muted-foreground">
                      {item.description}
                    </span>
                  </span>
                </div>

                <Switch
                  checked={checked}
                  disabled={disabled}
                  onCheckedChange={(nextChecked) => {
                    if (item.key === "isPrimaryKey") {
                      onChange({
                        isPrimaryKey: nextChecked,
                        isNotNull: nextChecked ? true : column.isNotNull,
                      });
                      return;
                    }

                    if (item.key === "isUnique") {
                      onChange({ isUnique: nextChecked });
                      return;
                    }

                    onChange({ isNotNull: nextChecked });
                  }}
                />
              </div>
            </label>
          );
        })}
      </div>

      <p
        className="overflow-hidden rounded-[20px] border border-amber-400/18 bg-amber-400/10 px-4 text-sm text-amber-800 transition-all duration-200 ease-out"
        style={{
          maxHeight: primaryKeyCount > 1 ? 72 : 0,
          opacity: primaryKeyCount > 1 ? 1 : 0,
          paddingTop: primaryKeyCount > 1 ? 12 : 0,
          paddingBottom: primaryKeyCount > 1 ? 12 : 0,
        }}
      >
        More than one primary key is selected. On save, these columns will be
        created as a composite primary key.
      </p>
    </div>
  );
}
