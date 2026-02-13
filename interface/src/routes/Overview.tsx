import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/api/client";
import { ChannelCard } from "@/components/ChannelCard";
import type { ChannelLiveState } from "@/hooks/useChannelLiveState";
import { formatUptime } from "@/lib/format";

interface OverviewProps {
	liveStates: Record<string, ChannelLiveState>;
}

export function Overview({ liveStates }: OverviewProps) {
	const { data: statusData, isError: statusError } = useQuery({
		queryKey: ["status"],
		queryFn: api.status,
		refetchInterval: 5000,
	});

	const { data: channelsData, isLoading: channelsLoading, isError: channelsError } = useQuery({
		queryKey: ["channels"],
		queryFn: api.channels,
		refetchInterval: 10000,
	});

	const { data: agentsData } = useQuery({
		queryKey: ["agents"],
		queryFn: api.agents,
		refetchInterval: 30_000,
	});

	const channels = channelsData?.channels ?? [];
	const agents = agentsData?.agents ?? [];

	const totalWorkers = useMemo(
		() => Object.values(liveStates).reduce((sum, s) => sum + Object.keys(s.workers).length, 0),
		[liveStates],
	);
	const totalBranches = useMemo(
		() => Object.values(liveStates).reduce((sum, s) => sum + Object.keys(s.branches).length, 0),
		[liveStates],
	);

	// Group channels by agent
	const channelsByAgent = useMemo(() => {
		const map: Record<string, typeof channels> = {};
		for (const channel of channels) {
			if (!map[channel.agent_id]) map[channel.agent_id] = [];
			map[channel.agent_id].push(channel);
		}
		return map;
	}, [channels]);

	return (
		<div className="flex flex-col">
			{/* Status bar */}
			<header className="flex h-12 items-center justify-between border-b border-app-line bg-app-darkBox/50 px-6">
				<h1 className="font-plex text-sm font-medium text-ink">Dashboard</h1>
				<div className="flex items-center gap-4 text-sm">
					{statusError ? (
						<div className="flex items-center gap-1.5">
							<div className="h-2 w-2 rounded-full bg-red-500" />
							<span className="text-red-400">Unreachable</span>
						</div>
					) : statusData ? (
						<>
							<div className="flex items-center gap-1.5">
								<div className="h-2 w-2 rounded-full bg-green-500" />
								<span className="text-ink-dull">Running</span>
							</div>
							<span className="text-ink-faint">
								{formatUptime(statusData.uptime_seconds)}
							</span>
						</>
					) : null}
					{(totalWorkers > 0 || totalBranches > 0) && (
						<div className="flex items-center gap-2 text-tiny">
							{totalWorkers > 0 && (
								<span className="rounded-md bg-amber-500/15 px-1.5 py-0.5 text-amber-400">
									{totalWorkers} worker{totalWorkers !== 1 ? "s" : ""}
								</span>
							)}
							{totalBranches > 0 && (
								<span className="rounded-md bg-violet-500/15 px-1.5 py-0.5 text-violet-400">
									{totalBranches} branch{totalBranches !== 1 ? "es" : ""}
								</span>
							)}
						</div>
					)}
				</div>
			</header>

			{/* Content */}
			<main className="flex-1 overflow-y-auto p-6">
				{channelsLoading ? (
					<div className="flex items-center gap-2 text-ink-dull">
						<div className="h-2 w-2 animate-pulse rounded-full bg-accent" />
						Loading channels...
					</div>
				) : channelsError ? (
					<div className="rounded-lg border border-dashed border-red-500/30 p-8 text-center">
						<p className="text-sm text-red-400">
							Failed to load channels. Is the daemon running?
						</p>
					</div>
				) : channels.length === 0 ? (
					<div className="rounded-lg border border-dashed border-app-line p-8 text-center">
						<p className="text-sm text-ink-faint">
							No active channels. Send a message via Discord, Telegram, or webhook to get started.
						</p>
					</div>
				) : agents.length <= 1 ? (
					// Single agent — flat grid
					<div>
						<div className="mb-4 flex items-center justify-between">
							<h2 className="font-plex text-sm font-medium text-ink-dull">
								Active Channels
							</h2>
							<span className="text-tiny text-ink-faint">
								{channels.length} channel{channels.length !== 1 ? "s" : ""}
							</span>
						</div>
						<div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
							{channels.map((channel) => (
								<ChannelCard
									key={channel.id}
									channel={channel}
									liveState={liveStates[channel.id]}
								/>
							))}
						</div>
					</div>
				) : (
					// Multi-agent — grouped by agent
					<div className="flex flex-col gap-6">
						{agents.map((agent) => {
							const agentChannels = channelsByAgent[agent.id] ?? [];
							return (
								<div key={agent.id}>
									<div className="mb-3 flex items-center justify-between">
										<h2 className="font-plex text-sm font-medium text-ink-dull">
											{agent.id}
										</h2>
										<span className="text-tiny text-ink-faint">
											{agentChannels.length} channel{agentChannels.length !== 1 ? "s" : ""}
										</span>
									</div>
									{agentChannels.length === 0 ? (
										<p className="text-sm text-ink-faint">No active channels</p>
									) : (
										<div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
											{agentChannels.map((channel) => (
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
						})}
					</div>
				)}
			</main>
		</div>
	);
}
