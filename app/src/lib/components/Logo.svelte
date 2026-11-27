<script lang="ts">
	let { size = 22, class: className = '' }: { size?: number; class?: string } = $props();
</script>

<svg
	viewBox="0 0 24 24"
	width={size}
	height={size}
	fill="none"
	aria-hidden="true"
	class={className}
>
	<path
		d="M12 2.4c.62 4.86 3.14 7.38 8 8-4.86.62-7.38 3.14-8 8-.62-4.86-3.14-7.38-8-8 4.86-.62 7.38-3.14 8-8Z"
		fill="currentColor"
	></path>
	<circle cx="19.2" cy="19.2" r="1.9" fill="currentColor" opacity="0.55"></circle>
</svg>
