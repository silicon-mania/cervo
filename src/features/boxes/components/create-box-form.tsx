import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import { createBoxAction } from "../server/mutations";

type CreateBoxFormProps = {
  parentBoxId?: string;
  placeholder?: string;
  buttonLabel?: string;
};

export function CreateBoxForm({
  parentBoxId,
  placeholder = "Box name",
  buttonLabel = "New Box",
}: CreateBoxFormProps) {
  return (
    <form action={createBoxAction} className="flex min-w-0 items-center gap-2">
      {parentBoxId ? (
        <input type="hidden" name="parentBoxId" value={parentBoxId} />
      ) : null}
      <Input
        name="name"
        required
        maxLength={80}
        placeholder={placeholder}
        aria-label={placeholder}
        className="h-9 min-w-0 bg-background"
      />
      <Button type="submit" variant="outline" className="shrink-0">
        <Plus className="size-4" aria-hidden="true" />
        {buttonLabel}
      </Button>
    </form>
  );
}
