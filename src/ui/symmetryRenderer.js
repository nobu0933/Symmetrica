import { SymmetryConfig } from '../game/symmetryConfig.js';

function symbolColor() {
	return getComputedStyle(document.documentElement).getPropertyValue('--symbol').trim() || '#d43d79';
}

function getSymbolVisibility(id, type, hints, activeSymbols, hintSymbols, isHintMode) {
	const symbolId = Number(id);
	if (activeSymbols || hintSymbols) {
		if (hints.showProblem && activeSymbols?.includes(symbolId)) return { visible: true, hint: false };
		if (isHintMode && hintSymbols?.includes(symbolId)) return { visible: true, hint: true };
		return { visible: false, hint: false };
	}
	if (!hints.showProblem) return { visible: false, hint: false };
	const visible =
		(type === 'm' && hints.mirror) ||
		(type === 'g' && hints.glide) ||
		(type.startsWith('r') && hints.rotation);
	return { visible, hint: false };
}

function drawRotationMarker(ctx, x, y, order, radius) {
	ctx.beginPath();
	if (order === 2) {
		ctx.ellipse(x, y, radius, radius * 0.65, 0, 0, 2 * Math.PI);
	} else {
		for (let index = 0; index < order; index++) {
			const angle = order === 4
				? (index * 2 * Math.PI) / order - Math.PI / 4
				: (index * 2 * Math.PI) / order - Math.PI / 2;
			const scale = order === 6 ? 0.8 : 1;
			ctx.lineTo(x + radius * scale * Math.cos(angle), y + radius * scale * Math.sin(angle));
		}
		ctx.closePath();
	}
	ctx.fill();
	ctx.stroke();
}

/** Draws the selected problem and hint symmetry markers for a wallpaper group. */
export function drawSymmetryElements(
	ctx,
	groupId,
	offsetX,
	offsetY,
	cellSize,
	hints,
	activeSymbols = null,
	hintSymbols = null,
	isHintMode = false,
	baseAlpha = 1,
	colorOverride = null,
	dropOffsetY = 0,
) {
	const config = SymmetryConfig[groupId];
	if (!config) return;
	const triangleHeight = (cellSize * Math.sqrt(3)) / 2;
	const toCanvasPosition = (u, v) => config.system === 'hexagonal'
		? { x: offsetX + u * cellSize + v * (cellSize / 2), y: offsetY + v * triangleHeight }
		: { x: offsetX + u * cellSize, y: offsetY + v * cellSize };

	for (const [id, [type, u1, v1, u2, v2]] of Object.entries(config.lines || {})) {
		const visibility = getSymbolVisibility(id, type, hints, activeSymbols, hintSymbols, isHintMode);
		if (!visibility.visible) continue;
		const start = toCanvasPosition(u1, v1);
		const end = toCanvasPosition(u2, v2);
		ctx.save();
		ctx.translate(0, dropOffsetY);
		ctx.beginPath();
		ctx.strokeStyle = colorOverride || symbolColor();
		ctx.globalAlpha = (visibility.hint ? 0.5 : 1) * baseAlpha;
		ctx.lineWidth = type === 'g' ? 7 : 4;
		ctx.setLineDash(type === 'g' ? [8, 8] : []);
		ctx.moveTo(start.x, start.y);
		ctx.lineTo(end.x, end.y);
		ctx.stroke();
		ctx.restore();
	}

	for (const [id, [type, u, v]] of Object.entries(config.rotations || {})) {
		const visibility = getSymbolVisibility(id, type, hints, activeSymbols, hintSymbols, isHintMode);
		if (!visibility.visible) continue;
		const position = toCanvasPosition(u, v);
		ctx.save();
		ctx.translate(0, dropOffsetY);
		ctx.fillStyle = colorOverride || symbolColor();
		ctx.strokeStyle = colorOverride || symbolColor();
		ctx.globalAlpha = (visibility.hint ? 0.5 : 1) * baseAlpha;
		ctx.lineWidth = 1;
		drawRotationMarker(ctx, position.x, position.y, Number(type.slice(1)), cellSize === 200 ? 13 : 19);
		ctx.restore();
	}
}
