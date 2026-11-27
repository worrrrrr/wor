export async function copyText(value: string): Promise<boolean> {
	if (!value) return false;

	try {
		if (window.isSecureContext && navigator.clipboard?.writeText) {
			await navigator.clipboard.writeText(value);
			return true;
		}
	} catch {
		// Permission can be denied in embedded browsers; fall through to execCommand.
	}

	const area = document.createElement('textarea');
	area.value = value;
	area.setAttribute('readonly', '');
	area.style.position = 'fixed';
	area.style.top = '0';
	area.style.left = '0';
	area.style.width = '1px';
	area.style.height = '1px';
	area.style.opacity = '0';
	area.style.pointerEvents = 'none';
	document.body.appendChild(area);

	let copied = false;
	try {
		area.focus();
		area.select();
		area.setSelectionRange(0, value.length);
		copied = document.execCommand('copy');
	} catch {
		copied = false;
	} finally {
		area.remove();
	}
	return copied;
}
