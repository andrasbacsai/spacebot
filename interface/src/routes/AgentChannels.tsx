import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/api/client";
import { ChannelCard } from "@/components/ChannelCard";
import type { ChannelLiveState } from "@/hooks/useChannelLiveState";

interface AgentChannelsProps {
	agentId: string;
	liveStates: Record<string, ChannelLiveState>;
}

export function AgentChannels({ agentId, liveStates }: AgentChannelsProps) {
	const { data: channelsData, isLoading } = useQuery({
		queryKey: ["channels"],
		queryFn: api.channels,
		refetchInterval: 10_000,
	});

	const channels = useMemo(
		() => (channelsData?.channels ?? []).filter((c) => c.agent_id === agentId),
		[channelsData, agentId],
	);

	return (
		<div className="h-full overflow-y-auto p-6">
			{isLoading ? (
				<div className="flex items-center gap-2 text-ink-dull">
					<div className="h-2 w-2 animate-pulse rounded-full bg-accent" />
					Loading channels...
				</div>
			) : channels.length === 0 ? (
				<p className="text-sm text-ink-faint">No active channels for this agent.</p>
			) : (
				<div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
					{channels.map((channel) => (
						<ChannelCard
							key={channel.id}
							channel={channel}
							liveState={liveStates[channel.id]}
						/>
					))}
				</div>
			)}
		</div>
	);
}
