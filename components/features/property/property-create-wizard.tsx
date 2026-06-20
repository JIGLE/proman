"use client";

import * as React from "react";
import { Home, Building2, BadgeEuro } from "lucide-react";
import { useTranslations } from "next-intl";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  MultiStepFormContainer,
  type MultiStepFormStep,
} from "@/components/ui/multi-step-form";
import { useMultiStepForm } from "@/lib/hooks/use-multi-step-form";
import { propertySchema, type PropertyFormData } from "@/lib/schemas/property.schema";
import { useApp } from "@/lib/contexts/app-context";
import { useToast } from "@/lib/contexts/toast-context";

const PROPERTY_TYPES: PropertyFormData["type"][] = [
  "apartment",
  "house",
  "condo",
  "townhouse",
  "commercial",
  "other",
];

const PROPERTY_STATUSES: PropertyFormData["status"][] = ["vacant", "occupied", "maintenance"];

const initialFormData: PropertyFormData = {
  name: "",
  address: "",
  streetAddress: "",
  city: "",
  zipCode: "",
  country: "PT",
  addressVerified: false,
  buildingName: "",
  type: "apartment",
  bedrooms: 1,
  bathrooms: 1,
  rent: 0,
  status: "vacant",
  description: "",
};

interface PropertyCreateWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: () => void;
}

/**
 * Guided 3-step property creation. Replaces the intimidating single 14-field
 * modal for first-run users with a required-first, draft-persisting wizard
 * built on the shared MultiStepForm primitives (same pattern as the lease
 * wizard). Optional fields live behind an expander so the happy path stays
 * short.
 */
export function PropertyCreateWizard({
  open,
  onOpenChange,
  onCreated,
}: PropertyCreateWizardProps): React.ReactElement {
  const t = useTranslations("propertyWizard");
  const { addProperty } = useApp();
  const toast = useToast();
  const [showMore, setShowMore] = React.useState(false);

  const wizard = useMultiStepForm<PropertyFormData>({
    schema: propertySchema,
    initialData: initialFormData,
    persistence: { key: "property-wizard-draft" },
    steps: [
      {
        id: "basics",
        title: t("stepBasics"),
        fields: ["name", "address", "city", "zipCode"],
        validate: (data) => {
          const errors: Record<string, string> = {};
          if (!data.name?.trim()) errors.name = t("name");
          if (!data.address?.trim()) errors.address = t("address");
          return Object.keys(errors).length ? errors : null;
        },
      },
      {
        id: "details",
        title: t("stepDetails"),
        fields: ["type", "bedrooms", "bathrooms"],
      },
      {
        id: "rent",
        title: t("stepRent"),
        fields: ["rent", "status", "description"],
      },
    ],
    onComplete: async (data) => {
      try {
        await addProperty(data);
        toast.success(t("created"));
        onOpenChange(false);
        setShowMore(false);
        wizard.resetForm();
        onCreated?.();
      } catch {
        toast.error(t("error"));
      }
    },
  });

  const { formData, updateFormData, stepErrors } = wizard;

  const wizardSteps: MultiStepFormStep[] = [
    { id: "basics", title: t("stepBasics"), icon: <Home className="h-4 w-4" /> },
    { id: "details", title: t("stepDetails"), icon: <Building2 className="h-4 w-4" /> },
    { id: "rent", title: t("stepRent"), icon: <BadgeEuro className="h-4 w-4" /> },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("title")}</DialogTitle>
        </DialogHeader>

        <MultiStepFormContainer
          steps={wizardSteps}
          currentStep={wizard.currentStep}
          completedSteps={new Set<number>()}
          visitedSteps={wizard.visitedSteps}
          progress={wizard.progress}
          isSubmitting={wizard.isSubmitting}
          isFirstStep={wizard.isFirstStep}
          isLastStep={wizard.isLastStep}
          onPrevStep={wizard.prevStep}
          onNextStep={wizard.nextStep}
          onSubmit={wizard.handleSubmit}
          onGoToStep={wizard.goToStep}
          submitText={t("create")}
        >
          {wizard.currentStep === 0 && (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="pw-name">{t("name")}</Label>
                <Input
                  id="pw-name"
                  value={formData.name}
                  placeholder={t("namePlaceholder")}
                  onChange={(e) => updateFormData({ name: e.target.value })}
                />
                {stepErrors.name && (
                  <p className="text-xs text-[var(--color-error)]">{stepErrors.name}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="pw-address">{t("address")}</Label>
                <Input
                  id="pw-address"
                  value={formData.address}
                  placeholder={t("addressPlaceholder")}
                  onChange={(e) => updateFormData({ address: e.target.value })}
                />
                {stepErrors.address && (
                  <p className="text-xs text-[var(--color-error)]">{stepErrors.address}</p>
                )}
              </div>

              {showMore ? (
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="pw-city">{t("city")}</Label>
                    <Input
                      id="pw-city"
                      value={formData.city ?? ""}
                      onChange={(e) => updateFormData({ city: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="pw-zip">{t("zipCode")}</Label>
                    <Input
                      id="pw-zip"
                      value={formData.zipCode ?? ""}
                      onChange={(e) => updateFormData({ zipCode: e.target.value })}
                    />
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowMore(true)}
                  className="text-xs font-medium text-[var(--color-primary)] hover:underline"
                >
                  {t("moreDetails")}
                </button>
              )}
            </div>
          )}

          {wizard.currentStep === 1 && (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label>{t("type")}</Label>
                <Select
                  value={formData.type}
                  onValueChange={(value) =>
                    updateFormData({ type: value as PropertyFormData["type"] })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PROPERTY_TYPES.map((type) => (
                      <SelectItem key={type} value={type}>
                        {t(
                          `type${type.charAt(0).toUpperCase()}${type.slice(1)}` as Parameters<
                            typeof t
                          >[0],
                        )}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="pw-beds">{t("bedrooms")}</Label>
                  <Input
                    id="pw-beds"
                    type="number"
                    min={0}
                    value={formData.bedrooms}
                    onChange={(e) => updateFormData({ bedrooms: Number(e.target.value) })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="pw-baths">{t("bathrooms")}</Label>
                  <Input
                    id="pw-baths"
                    type="number"
                    min={0}
                    value={formData.bathrooms}
                    onChange={(e) => updateFormData({ bathrooms: Number(e.target.value) })}
                  />
                </div>
              </div>
            </div>
          )}

          {wizard.currentStep === 2 && (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="pw-rent">{t("rent")}</Label>
                <Input
                  id="pw-rent"
                  type="number"
                  min={0}
                  value={formData.rent}
                  onChange={(e) => updateFormData({ rent: Number(e.target.value) })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>{t("status")}</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value) =>
                    updateFormData({ status: value as PropertyFormData["status"] })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PROPERTY_STATUSES.map((status) => (
                      <SelectItem key={status} value={status}>
                        {t(
                          `status${status.charAt(0).toUpperCase()}${status.slice(1)}` as Parameters<
                            typeof t
                          >[0],
                        )}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="pw-desc">{t("description")}</Label>
                <Textarea
                  id="pw-desc"
                  rows={2}
                  value={formData.description ?? ""}
                  onChange={(e) => updateFormData({ description: e.target.value })}
                />
              </div>
            </div>
          )}
        </MultiStepFormContainer>
      </DialogContent>
    </Dialog>
  );
}

export default PropertyCreateWizard;
