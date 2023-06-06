import { useState } from "preact/hooks";
import { Input } from "../components/ui/input.tsx";
import { Button } from "../components/ui/button.tsx";

type SubmitTaskProps = {
  userId: string;
};

export default function SubmitTask({ userId }: SubmitTaskProps) {
  const [description, setDescription] = useState("");

  async function saveTask() {
    await fetch("/", {
      body: JSON.stringify({ description, userId }),
      method: "POST",
    });
    alert("Task saved!");
    location.reload();
  }

  return (
    <div class="flex gap-2 w-full">
      <Input
        placeholder="What should I do today?"
        onChange={(e) => setDescription((e.target as any).value)}
      />
      <Button onClick={saveTask}>Save</Button>
    </div>
  );
}
