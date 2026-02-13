import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

interface DropdownOption<T extends string> {
	value: T;
	label: string;
}

interface DropdownProps<T extends string> {
	value: T;
	onChange: (value: T) => void;
	options: DropdownOption<T>[];
}

export function Dropdown<T extends string>({ value, onChange, options }: DropdownProps<T>) {
	const [open, setOpen] = useState(false);
	const ref = useRef<HTMLDivElement>(null);

	const selected = options.find((o) => o.value === value);

	useEffect(() => {
		if (!open) return;
		function handleClick(event: MouseEvent) {
			if (ref.current && !ref.current.contains(event.target as Node)) {
				setOpen(false);
			}
		}
		document.addEventListener("mousedown", handleClick);
		return () => document.removeEventListener("mousedown", handleClick);
	}, [open]);

	return (
		<div ref={ref} className="relative">
			<button
				onClick={() => setOpen(!open)}
				className="flex items-center gap-1.5 rounded-md border border-app-line bg-app-darkBox px-2.5 py-1.5 text-sm text-ink-dull transition-colors hover:border-app-line/80 hover:text-ink"
			>
				{selected?.label ?? value}
				<svg className="h-3 w-3 text-ink-faint" viewBox="0 0 12 12" fill="currentColor">
					<path d="M3 4.5l3 3 3-3" />
				</svg>
			</button>
			<AnimatePresence>
				{open && (
					<motion.div
						initial={{ opacity: 0, y: -4 }}
						animate={{ opacity: 1, y: 0 }}
						exit={{ opacity: 0, y: -4 }}
						transition={{ duration: 0.12 }}
						className="absolute right-0 z-10 mt-1 min-w-[140px] overflow-hidden rounded-md border border-app-line bg-app-box shadow-lg"
					>
						{options.map((option) => (
							<button
								key={option.value}
								onClick={() => {
									onChange(option.value);
									setOpen(false);
								}}
								className={`flex w-full items-center px-3 py-1.5 text-left text-sm transition-colors ${
									option.value === value
										? "bg-accent/10 text-ink"
										: "text-ink-dull hover:bg-app-darkBox/50"
								}`}
							>
								{option.label}
							</button>
						))}
					</motion.div>
				)}
			</AnimatePresence>
		</div>
	);
}
