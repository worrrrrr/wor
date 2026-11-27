<script lang="ts">
	let {
		side = 'left',
		open = false,
		size = 15
	}: { side?: 'left' | 'right' | 'bottom'; open?: boolean; size?: number } = $props();

	const stroke = $derived(Math.max(1, Math.round(size * 0.085 * 100) / 100));
	const height = $derived(Math.round(size * 0.86));
	const radius = $derived(Math.round(size * 0.16 * 100) / 100);
	const band = $derived(Math.max(2, size * 0.22));
	const line = $derived(Math.max(1, size * 0.075));

	const place = $derived(
		open
			? side === 'bottom'
				? `left:0;right:0;bottom:0;height:${band}px`
				: side === 'left'
					? `top:0;bottom:0;left:0;width:${band}px`
					: `top:0;bottom:0;right:0;width:${band}px`
			: side === 'bottom'
				? `left:${stroke + line}px;right:${stroke + line}px;bottom:${stroke + line}px;height:${line}px`
				: side === 'left'
					? `top:${stroke + line}px;bottom:${stroke + line}px;left:${stroke + line}px;width:${line}px`
					: `top:${stroke + line}px;bottom:${stroke + line}px;right:${stroke + line}px;width:${line}px`
	);
</script>

<span
	class="relative inline-block shrink-0 overflow-hidden"
	style={`width:${size}px;height:${height}px;border:${stroke}px solid currentColor;border-radius:${radius}px;box-sizing:border-box`}
	aria-hidden="true"
>
	<span
		style={`position:absolute;${place};background:currentColor;opacity:${open ? 1 : 0.5};border-radius:${open ? Math.max(1, radius - stroke) : 1}px`}
	></span>
</span>
