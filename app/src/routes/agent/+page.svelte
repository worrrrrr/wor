<script lang="ts">
	import type { PageProps } from './$types';
	import ChatView from '#lib/components/ChatView.svelte';

	let { data }: PageProps = $props();
</script>

<ChatView project={data.project} initialMode="agent" />
