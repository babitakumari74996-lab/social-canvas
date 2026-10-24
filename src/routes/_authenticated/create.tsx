import { createFileRoute } from "@tanstack/react-router";
import { CreateModal } from "@/components/CreateModal";

// Create is a real page (like Home and Reels), so swiping to it works the same way.
export const Route = createFileRoute("/_authenticated/create")({
  component: CreatePage,
});

function CreatePage() {
  return <CreateModal page />;
}
