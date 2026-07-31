import { createFileRoute } from "@tanstack/react-router";
import { UsersRound } from "lucide-react";

export const Route = createFileRoute("/_authenticated/groups")({
  component: GroupsPage,
});

const GROUPS = [
  { name: "Photography Lovers", members: 12400, color: "from-blue-500 to-cyan-500" },
  { name: "Indie Music", members: 8210, color: "from-purple-500 to-blue-500" },
  { name: "Travel Diaries", members: 5320, color: "from-emerald-500 to-teal-500" },
  { name: "Foodies Club", members: 9870, color: "from-orange-500 to-red-500" },
  { name: "Book Nerds", members: 3400, color: "from-yellow-500 to-amber-500" },
  { name: "Fitness Daily", members: 6540, color: "from-lime-500 to-green-600" },
];

function GroupsPage() {
  return (
    <div className="max-w-5xl mx-auto px-3 md:px-6 py-4 space-y-4">
      <h1 className="text-2xl font-bold">Groups</h1>
      <div className="card-flat p-4 flex items-center gap-3">
        <div className="h-12 w-12 rounded-full bg-primary/10 text-primary grid place-items-center">
          <UsersRound className="h-6 w-6" />
        </div>
        <div>
          <div className="font-semibold">Your Groups</div>
          <div className="text-sm text-muted-foreground">{GROUPS.length} active groups</div>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {GROUPS.map((g) => (
          <div key={g.name} className="card-flat overflow-hidden">
            <div className={`h-24 bg-gradient-to-br ${g.color}`} />
            <div className="p-3">
              <div className="font-semibold truncate">{g.name}</div>
              <div className="text-xs text-muted-foreground">
                {g.members.toLocaleString()} members
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
