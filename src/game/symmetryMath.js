/** Removes coincident placements while preserving their first occurrence. */
export function filterDuplicates(shapes) {
	const unique = [];
	for (const shape of shapes) {
		const isDuplicate = unique.some((other) => {
			const angleDifference = Math.abs(other.angle - shape.angle) % 360;
			const matchingAngle = angleDifference < 0.1 || angleDifference > 359.9;
			return (
				Math.abs(other.x - shape.x) < 0.1 &&
				Math.abs(other.y - shape.y) < 0.1 &&
				matchingAngle &&
				other.flipped === shape.flipped
			);
		});
		if (!isDuplicate) unique.push(shape);
	}
	return unique;
}
