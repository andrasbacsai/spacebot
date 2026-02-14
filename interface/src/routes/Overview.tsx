import { useMemo } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { api, type AgentSummary } from "@/api/client";
import type { ChannelLiveState } from "@/hooks/useChannelLiveState";
import { formatTimeAgo, formatUptime } from "@/lib/format";
import { ResponsiveContainer, AreaChart, Area } from "recharts";

interface OverviewProps {
	liveStates: Record<string, ChannelLiveState>;
}

export function Overview({ liveStates }: OverviewProps) {
	const { data: statusData } = useQuery({
		queryKey: ["status"],
		queryFn: api.status,
		refetchInterval: 5000,
	});

	const { data: overviewData, isLoading: overviewLoading } = useQuery({
		queryKey: ["overview"],
		queryFn: api.overview,
		refetchInterval: 10_000,
	});

	const { data: channelsData } = useQuery({
		queryKey: ["channels"],
		queryFn: api.channels,
		refetchInterval: 10000,
	});

	const channels = channelsData?.channels ?? [];
	const agents = overviewData?.agents ?? [];

	// Aggregate live activity across all agents
	const activity = useMemo(() => {
		let workers = 0;
		let branches = 0;
		let typing = 0;
		for (const state of Object.values(liveStates)) {
			workers += Object.keys(state.workers).length;
			branches += Object.keys(state.branches).length;
			if (state.isTyping) typing++;
		}
		return { workers, branches, typing };
	}, [liveStates]);

	// Get live activity for a specific agent
	const getAgentActivity = (agentId: string) => {
		let workers = 0;
		let branches = 0;
		for (const channel of channels) {
			if (channel.agent_id !== agentId) continue;
			const live = liveStates[channel.id];
			if (!live) continue;
			workers += Object.keys(live.workers).length;
			branches += Object.keys(live.branches).length;
		}
		return { workers, branches, hasActivity: workers > 0 || branches > 0 };
	};

	// Recent channels (sorted by last activity, max 6)
	const recentChannels = useMemo(() => {
		return [...channels]
			.sort((a, b) => new Date(b.last_activity_at).getTime() - new Date(a.last_activity_at).getTime())
			.slice(0, 6);
	}, [channels]);

	return (
		<div className="flex flex-col h-full">
			{/* Instance Hero */}
			<HeroSection
				status={statusData}
				totalChannels={channels.length}
				totalAgents={agents.length}
				activity={activity}
			/>

			{/* Content */}
			<main className="flex-1 overflow-y-auto p-6">
				{overviewLoading ? (
					<div className="flex items-center gap-2 text-ink-dull">
						<div className="h-2 w-2 animate-pulse rounded-full bg-accent" />
						Loading dashboard...
					</div>
				) : agents.length === 0 ? (
					<div className="rounded-lg border border-dashed border-app-line p-8 text-center">
						<p className="text-sm text-ink-faint">No agents configured.</p>
					</div>
				) : (
					<div className="flex flex-col gap-6">
						{/* Agent Cards */}
						<section>
							<h2 className="mb-4 font-plex text-sm font-medium text-ink-dull">Agents</h2>
							<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
								{agents.map((agent) => (
									<AgentCard
										key={agent.id}
										agent={agent}
										liveActivity={getAgentActivity(agent.id)}
									/>
								))}
							</div>
						</section>

						{/* Recent Channels */}
						{recentChannels.length > 0 && (
							<section>
								<div className="mb-4 flex items-center justify-between">
									<h2 className="font-plex text-sm font-medium text-ink-dull">Recent Activity</h2>
									<span className="text-tiny text-ink-faint">{channels.length} total channels</span>
								</div>
								<div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
									{recentChannels.map((channel) => (
										<ChannelCard
											key={channel.id}
											channel={channel}
											liveState={liveStates[channel.id]}
										/>
										))}
								</div>
							</section>
							)}
						</div>
					)}
				</main>
			</div>
	);
}

// -- Components --

function HeroSection({
	status,
	totalChannels,
	totalAgents,
	activity,
}: {
	status: { status: string; pid: number; uptime_seconds: number } | undefined;
	totalChannels: number;
	totalAgents: number;
	activity: { workers: number; branches: number; typing: number };
}) {
	const uptime = status?.uptime_seconds ?? 0;

	return (
		<div className="border-b border-app-line bg-app-darkBox/50 px-6 py-6">
			<div className="mx-auto max-w-6xl">
				<div className="flex flex-col gap-4">
					{/* Title row */}
					<div className="flex items-center justify-between">
						<div className="flex items-center gap-3">
							<h1 className="font-plex text-2xl font-semibold text-ink">Spacebot</h1>
							{status ? (
								<div className="flex items-center gap-2 rounded-full bg-app-darkBox px-3 py-1 text-tiny">
									<div className="h-2 w-2 rounded-full bg-green-500" />
									<span className="text-ink-dull">Running</span>
								</div>
							) : (
								<div className="flex items-center gap-2 rounded-full bg-app-darkBox px-3 py-1 text-tiny">
									<div className="h-2 w-2 rounded-full bg-red-500" />
									<span className="text-red-400">Unreachable</span>
								</div>
							)}
						</div>

						<span className="text-tiny text-ink-faint">
							{formatUptime(uptime)} uptime
						</span>
					</div>

					{/* Stats row */}
					<div className="flex flex-wrap items-center gap-4">
						<div className="flex items-center gap-6 text-sm">
							<div className="flex items-baseline gap-1.5">
								<span className="text-lg font-medium tabular-nums text-ink">{totalAgents}</span>
								<span className="text-ink-faint">agent{totalAgents !== 1 ? "s" : ""}</span>
							</div>
							<div className="flex items-baseline gap-1.5">
								<span className="text-lg font-medium tabular-nums text-ink">{totalChannels}</span>
								<span className="text-ink-faint">channel{totalChannels !== 1 ? "s" : ""}</span>
							</div>
						</div>

						{(activity.workers > 0 || activity.branches > 0) && (
							<div className="flex items-center gap-2">
								{activity.workers > 0 && (
									<div className="flex items-center gap-2 rounded-full bg-amber-500/10 px-3 py-1.5 text-sm">
										<div className="h-2 w-2 animate-pulse rounded-full bg-amber-400" />
										<span className="font-medium text-amber-400">
											{activity.workers} worker{activity.workers !== 1 ? "s" : ""}
										</span>
									</div>
								)}
								{activity.branches > 0 && (
									<div className="flex items-center gap-2 rounded-full bg-violet-500/10 px-3 py-1.5 text-sm">
										<div className="h-2 w-2 animate-pulse rounded-full bg-violet-400" />
										<span className="font-medium text-violet-400">
											{activity.branches} branch{activity.branches !== 1 ? "es" : ""}
										</span>
									</div>
								)}
							</div>
						)}
					</div>
				</div>
			</div>
		</div>
	);
}

function AgentCard({
	agent,
	liveActivity,
}: {
	agent: AgentSummary;
	liveActivity: { workers: number; branches: number; hasActivity: boolean };
}) {
	const isActive = liveActivity.hasActivity || (agent.last_activity_at && new Date(agent.last_activity_at).getTime() > Date.now() - 5 * 60 * 1000);

	return (
		<Link
			to="/agents/$agentId"
			params={{ agentId: agent.id }}
			className="group flex flex-col rounded-xl border border-app-line bg-app-darkBox p-5 transition-all hover:border-app-line/80 hover:bg-app-darkBox/80"
		>
			<div className="flex items-start justify-between">
				<div className="flex items-center gap-2">
					<div className={`h-2.5 w-2.5 rounded-full ${isActive ? "bg-green-500" : "bg-gray-500"}`} />
					<h3 className="font-plex text-lg font-medium text-ink">{agent.id}</h3>
				</div>
			</div>

			{/* Sparkline */}
			<div className="mt-3 h-10">
				<SparklineChart data={agent.activity_sparkline} />
			</div>

			{/* Stats row */}
			<div className="mt-3 flex items-center gap-4 text-tiny">
				<div className="flex items-center gap-1">
					<span className="text-ink-faint">Channels</span>
					<span className="font-medium text-ink-dull">{agent.channel_count}</span>
				</div>
				<div className="flex items-center gap-1">
					<span className="text-ink-faint">Memories</span>
					<span className="font-medium text-ink-dull">{agent.memory_total.toLocaleString()}</span>
				</div>
				<div className="flex items-center gap-1">
					<span className="text-ink-faint">Cron</span>
					<span className="font-medium text-ink-dull">{agent.cron_job_count}</span>
				</div>
			</div>

			{/* Live activity badges */}
			{(liveActivity.workers > 0 || liveActivity.branches > 0) && (
				<div className="mt-3 flex flex-wrap gap-1.5">
					{liveActivity.workers > 0 && (
						<span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-tiny text-amber-400">
							{liveActivity.workers}w
						</span>
					)}
					{liveActivity.branches > 0 && (
						<span className="rounded-full bg-violet-500/10 px-2 py-0.5 text-tiny text-violet-400">
							{liveActivity.branches}b
						</span>
					)}
				</div>
			)}

			{/* Footer */}
			<div className="mt-3 flex items-center justify-between text-tiny">
				{agent.last_activity_at ? (
					<span className="text-ink-faint">Active {formatTimeAgo(agent.last_activity_at)}</span>
				) : (
					<span className="text-ink-faint">No activity</span>
				)}
				{agent.last_bulletin_at && (
					<span className="text-accent/70">Bulletin {formatTimeAgo(agent.last_bulletin_at)}</span>
				)}
			</div>
		</Link>
	);
}

const CHART_COLORS = {
	accent: "#6366f1",
	accentBg: "#1e1b4b",
};

function SparklineChart({ data }: { data: number[] }) {
	if (data.length === 0 || data.every((v) => v === 0)) {
		return <div className="h-full w-full bg-app-box/30 rounded" />;
	}

	// Simple line chart without axes - just the sparkline
	const chartData = data.map((value, idx) => ({ idx, value }));
	const hasGradient = data.length > 0;

	return (
		<ResponsiveContainer width="100%" height="100%">
			<AreaChart data={chartData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
				{hasGradient && (
					<defs>
						<linearGradient id="sparklineGradient" x1="0" y1="0" x2="0" y2="1">
							<stop offset="5%" stopColor={CHART_COLORS.accent} stopOpacity={0.5} />
							<stop offset="95%" stopColor={CHART_COLORS.accent} stopOpacity={0.05} />
						</linearGradient>
					</defs>
				)}
				<Area
					type="monotone"
					dataKey="value"
					stroke={CHART_COLORS.accent}
					strokeWidth={2}
					fill={hasGradient ? "url(#sparklineGradient)" : "transparent"}
					fillOpacity={1}
					dot={false}
					activeDot={false}
				/>
			</AreaChart>
		</ResponsiveContainer>
	);
}

// -- Channel Card (lightweight version) --

interface ChannelInfo {
	id: string;
	agent_id: string;
	platform: string;
	display_name: string | null;
	last_activity_at: string;
}

function ChannelCard({
	channel,
	liveState,
}: {
	channel: ChannelInfo;
	liveState: ChannelLiveState | undefined;
}) {
	const isTyping = liveState?.isTyping ?? false;
	const workers = Object.keys(liveState?.workers ?? {}).length;
	const branches = Object.keys(liveState?.branches ?? {}).length;
	const hasActivity = workers > 0 || branches > 0;

	return (
		<Link
			to="/agents/$agentId/channels/$channelId"
			params={{ agentId: channel.agent_id, channelId: channel.id }}
			className="flex flex-col gap-2 rounded-lg border border-app-line bg-app-darkBox p-3 transition-colors hover:border-app-line/80 hover:bg-app-darkBox/80"
		>
			<div className="flex items-start justify-between">
				<h4 className="truncate text-sm font-medium text-ink">
					{channel.display_name ?? channel.id}
				</h4>
				<div className="ml-2 flex-shrink-0">
					<div
						className={`h-2 w-2 rounded-full ${
							hasActivity ? "animate-pulse bg-amber-400" : isTyping ? "animate-pulse bg-accent" : "bg-green-500/60"
						}`}
					/>
				</div>
			</div>
			<div className="flex items-center gap-2 text-tiny">
				<span className="rounded bg-app-box px-1.5 py-0.5 text-ink-faint">{channel.platform}</span>
				<span className="text-ink-faint">{formatTimeAgo(channel.last_activity_at)}</span>
				{hasActivity && (
					<span className="text-ink-faint">
						{workers > 0 && `${workers}w`}
						{workers > 0 && branches > 0 && " "}
						{branches > 0 && `${branches}b`}
					</span>
				)}
			</div>
		</Link>
	);
}
