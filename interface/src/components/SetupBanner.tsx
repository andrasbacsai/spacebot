import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { api } from "@/api/client";

export function SetupBanner() {
	const { data } = useQuery({
		queryKey: ["providers"],
		queryFn: api.providers,
		staleTime: 10_000,
	});

	if (!data || data.has_any) return null;

	return (
		<div className="border-b border-amber-500/20 bg-amber-500/10 px-4 py-2 text-sm text-amber-400">
			<div className="flex items-center gap-2">
				<div className="h-1.5 w-1.5 rounded-full bg-current" />
				No LLM provider configured.{" "}
				<Link to="/settings" className="underline hover:text-amber-300">
					Add an API key in Settings
				</Link>{" "}
				to get started.
			</div>
		</div>
	);
}
