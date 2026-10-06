// symmetryGroups.js
import { filterDuplicates } from './symmetryMath.js';
import { drawSymmetryElements } from '../ui/symmetryRenderer.js';

export const SymmetryGroups = {
	p1: {
		name: 'p1 (並進のみ)',
		getCorrectShapes: (p0, OFFSET_X, OFFSET_Y, CELL_SIZE, wrap) => {
			return filterDuplicates([{ ...p0 }]);
		},
		drawAxes: (ctx, OX, OY, CS, hints, active, hintSymbols, isHintMode) =>
			drawSymmetryElements(ctx, 'p1', OX, OY, CS, hints, active, hintSymbols, isHintMode),
		drawModelAxes: (ctx, hints) => drawSymmetryElements(ctx, 'p1', 0, 0, 200, hints),
	},
	p2: {
		name: 'p2 (2回回転)',
		getCorrectShapes: (p0, OFFSET_X, OFFSET_Y, CELL_SIZE, wrap) => {
			let corrects = [{ ...p0 }];
			let cx = OFFSET_X + CELL_SIZE / 2,
				cy = OFFSET_Y + CELL_SIZE / 2;
			corrects.push({
				x: wrap(2 * cx - p0.x, OFFSET_X, CELL_SIZE),
				y: wrap(2 * cy - p0.y, OFFSET_Y, CELL_SIZE),
				angle: (p0.angle + 180) % 360,
				flipped: p0.flipped,
				isInitial: false,
			});
			return filterDuplicates(corrects);
		},
		drawAxes: (ctx, OX, OY, CS, hints, active, hintSymbols, isHintMode) =>
			drawSymmetryElements(ctx, 'p2', OX, OY, CS, hints, active, hintSymbols, isHintMode),
		drawModelAxes: (ctx, hints) => drawSymmetryElements(ctx, 'p2', 0, 0, 200, hints),
	},
	pm: {
		name: 'pm (鏡映)',
		getCorrectShapes: (p0, OFFSET_X, OFFSET_Y, CELL_SIZE, wrap) => {
			let corrects = [{ ...p0 }];
			corrects.push({
				x: wrap(2 * OFFSET_X - p0.x, OFFSET_X, CELL_SIZE),
				y: p0.y,
				angle: (360 - p0.angle) % 360,
				flipped: !p0.flipped,
				isInitial: false,
			});
			return filterDuplicates(corrects);
		},
		drawAxes: (ctx, OX, OY, CS, hints, active, hintSymbols, isHintMode) =>
			drawSymmetryElements(ctx, 'pm', OX, OY, CS, hints, active, hintSymbols, isHintMode),
		drawModelAxes: (ctx, hints) => drawSymmetryElements(ctx, 'pm', 0, 0, 200, hints),
	},
	pm_h: {
		name: 'pm (横鏡映)',
		getCorrectShapes: (p0, OFFSET_X, OFFSET_Y, CELL_SIZE, wrap) => {
			let corrects = [{ ...p0 }];
			corrects.push({
				x: p0.x,
				y: wrap(2 * OFFSET_Y - p0.y, OFFSET_Y, CELL_SIZE),
				// キャンバスのscale(-1, 1)仕様における横反転の角度計算
				angle: (180 - p0.angle + 360) % 360,
				flipped: !p0.flipped,
				isInitial: false,
			});
			return filterDuplicates(corrects);
		},
		drawAxes: (ctx, OX, OY, CS, hints, active, hintSymbols, isHintMode) =>
			drawSymmetryElements(ctx, 'pm_h', OX, OY, CS, hints, active, hintSymbols, isHintMode),
		drawModelAxes: (ctx, hints) => drawSymmetryElements(ctx, 'pm_h', 0, 0, 200, hints),
	},
	pg: {
		name: 'pg (映進)',
		getCorrectShapes: (p0, OFFSET_X, OFFSET_Y, CELL_SIZE, wrap) => {
			let corrects = [{ ...p0 }];
			corrects.push({
				x: wrap(2 * OFFSET_X - p0.x, OFFSET_X, CELL_SIZE),
				y: wrap(p0.y + CELL_SIZE / 2, OFFSET_Y, CELL_SIZE),
				angle: (360 - p0.angle) % 360,
				flipped: !p0.flipped,
				isInitial: false,
			});
			return filterDuplicates(corrects);
		},
		drawAxes: (ctx, OX, OY, CS, hints, active, hintSymbols, isHintMode) =>
			drawSymmetryElements(ctx, 'pg', OX, OY, CS, hints, active, hintSymbols, isHintMode),
		drawModelAxes: (ctx, hints) => drawSymmetryElements(ctx, 'pg', 0, 0, 200, hints),
	},
	pg_h: {
		name: 'pg (横映進)',
		getCorrectShapes: (p0, OFFSET_X, OFFSET_Y, CELL_SIZE, wrap) => {
			let corrects = [{ ...p0 }];
			corrects.push({
				// 横方向に半周期シフト
				x: wrap(p0.x + CELL_SIZE / 2, OFFSET_X, CELL_SIZE),
				y: wrap(2 * OFFSET_Y - p0.y, OFFSET_Y, CELL_SIZE),
				angle: (180 - p0.angle + 360) % 360,
				flipped: !p0.flipped,
				isInitial: false,
			});
			return filterDuplicates(corrects);
		},
		drawAxes: (ctx, OX, OY, CS, hints, active, hintSymbols, isHintMode) =>
			drawSymmetryElements(ctx, 'pg_h', OX, OY, CS, hints, active, hintSymbols, isHintMode),
		drawModelAxes: (ctx, hints) => drawSymmetryElements(ctx, 'pg_h', 0, 0, 200, hints),
	},
	cm: {
		name: 'cm (鏡映・映進)',
		getCorrectShapes: (p0, OFFSET_X, OFFSET_Y, CELL_SIZE, wrap) => {
			let corrects = [{ ...p0 }];
			corrects.push({
				x: wrap(2 * OFFSET_X - p0.x, OFFSET_X, CELL_SIZE),
				y: p0.y,
				angle: (360 - p0.angle) % 360,
				flipped: !p0.flipped,
				isInitial: false,
			});
			let len = corrects.length;
			for (let i = 0; i < len; i++) {
				let c = corrects[i];
				corrects.push({
					x: wrap(c.x + CELL_SIZE / 2, OFFSET_X, CELL_SIZE),
					y: wrap(c.y + CELL_SIZE / 2, OFFSET_Y, CELL_SIZE),
					angle: c.angle,
					flipped: c.flipped,
					isInitial: false,
				});
			}
			return filterDuplicates(corrects);
		},
		drawAxes: (ctx, OX, OY, CS, hints, active, hintSymbols, isHintMode) =>
			drawSymmetryElements(ctx, 'cm', OX, OY, CS, hints, active, hintSymbols, isHintMode),
		drawModelAxes: (ctx, hints) => drawSymmetryElements(ctx, 'cm', 0, 0, 200, hints),
	},
	cm_h: {
		name: 'cm (横)',
		getCorrectShapes: (p0, OFFSET_X, OFFSET_Y, CELL_SIZE, wrap) => {
			let corrects = [{ ...p0 }];

			// 1. 横鏡映 (m) : 横軸に対してそのまま反転
			corrects.push({
				x: p0.x,
				y: wrap(2 * OFFSET_Y - p0.y, OFFSET_Y, CELL_SIZE),
				angle: (180 - p0.angle + 360) % 360,
				flipped: !p0.flipped,
				isInitial: false,
			});

			// 2. センタリング : 面心格子のための平行移動 (x方向, y方向ともに1/2周期ズレ)
			corrects.push({
				x: wrap(p0.x + CELL_SIZE / 2, OFFSET_X, CELL_SIZE),
				y: wrap(p0.y + CELL_SIZE / 2, OFFSET_Y, CELL_SIZE),
				angle: p0.angle, // 平行移動なので角度はそのまま
				flipped: p0.flipped, // 反転もなし
				isInitial: false,
			});

			// 3. 横映進 (g) : 1の横鏡映をさらに1/2周期ズラしたもの（または2の反転）
			corrects.push({
				x: wrap(p0.x + CELL_SIZE / 2, OFFSET_X, CELL_SIZE),
				y: wrap(2 * OFFSET_Y - p0.y + CELL_SIZE / 2, OFFSET_Y, CELL_SIZE),
				angle: (180 - p0.angle + 360) % 360,
				flipped: !p0.flipped,
				isInitial: false,
			});

			return filterDuplicates(corrects);
		},
		drawAxes: (ctx, OX, OY, CS, hints, active, hintSymbols, isHintMode) =>
			drawSymmetryElements(ctx, 'cm_h', OX, OY, CS, hints, active, hintSymbols, isHintMode),
		drawModelAxes: (ctx, hints) => drawSymmetryElements(ctx, 'cm_h', 0, 0, 200, hints),
	},
	p2mm: {
		name: 'p2mm (縦横鏡映・2回回転)',
		getCorrectShapes: (p0, OFFSET_X, OFFSET_Y, CELL_SIZE, wrap) => {
			let corrects = [{ ...p0 }];
			corrects.push({
				x: wrap(2 * OFFSET_X - p0.x, OFFSET_X, CELL_SIZE),
				y: p0.y,
				angle: (360 - p0.angle) % 360,
				flipped: !p0.flipped,
				isInitial: false,
			});
			let len = corrects.length;
			for (let i = 0; i < len; i++) {
				let c = corrects[i];
				corrects.push({
					x: c.x,
					y: wrap(2 * OFFSET_Y - c.y, OFFSET_Y, CELL_SIZE),
					angle: (180 - c.angle + 360) % 360,
					flipped: !c.flipped,
					isInitial: false,
				});
			}
			return filterDuplicates(corrects);
		},
		drawAxes: (ctx, OX, OY, CS, hints, active, hintSymbols, isHintMode) =>
			drawSymmetryElements(ctx, 'p2mm', OX, OY, CS, hints, active, hintSymbols, isHintMode),
		drawModelAxes: (ctx, hints) => drawSymmetryElements(ctx, 'p2mm', 0, 0, 200, hints),
	},
	p2mg: {
		name: 'p2mg (2回回転・縦鏡映・横映進)',
		getCorrectShapes: (p0, OFFSET_X, OFFSET_Y, CELL_SIZE, wrap) => {
			let corrects = [{ ...p0 }];
			// 縦鏡映 (x = 1/4 基準)
			const mx = 2 * (OFFSET_X + CELL_SIZE / 4) - p0.x;
			corrects.push({
				x: wrap(mx, OFFSET_X, CELL_SIZE),
				y: p0.y,
				angle: (360 - p0.angle) % 360,
				flipped: !p0.flipped,
				isInitial: false,
			});
			// 横映進 (y = 0 基準、x方向に CELL_SIZE/2 シフト)
			const len = corrects.length;
			for (let i = 0; i < len; i++) {
				const p = corrects[i];
				corrects.push({
					x: wrap(p.x + CELL_SIZE / 2, OFFSET_X, CELL_SIZE),
					y: wrap(2 * OFFSET_Y - p.y, OFFSET_Y, CELL_SIZE),
					angle: (180 - p.angle + 360) % 360,
					flipped: !p.flipped,
					isInitial: false,
				});
			}
			return filterDuplicates(corrects);
		},
		drawAxes: (ctx, OX, OY, CS, hints, active, hintSymbols, isHintMode) =>
			drawSymmetryElements(ctx, 'p2mg', OX, OY, CS, hints, active, hintSymbols, isHintMode),
		drawModelAxes: (ctx, hints) => drawSymmetryElements(ctx, 'p2mg', 0, 0, 200, hints),
	},
	p2mg_h: {
		name: 'p2mg_h (2回回転・横鏡映・縦映進)',
		getCorrectShapes: (p0, OFFSET_X, OFFSET_Y, CELL_SIZE, wrap) => {
			let corrects = [{ ...p0 }];

			// 横鏡映 (y = 1/4 基準)
			const my = 2 * (OFFSET_Y + CELL_SIZE / 4) - p0.y;
			corrects.push({
				x: p0.x,
				y: wrap(my, OFFSET_Y, CELL_SIZE),
				angle: (180 - p0.angle + 360) % 360,
				flipped: !p0.flipped,
				isInitial: false,
			});

			// 縦映進 (x = 0 基準、y方向に CELL_SIZE/2 シフト)
			const len = corrects.length;
			for (let i = 0; i < len; i++) {
				const p = corrects[i];
				corrects.push({
					x: wrap(2 * OFFSET_X - p.x, OFFSET_X, CELL_SIZE),
					y: wrap(p.y + CELL_SIZE / 2, OFFSET_Y, CELL_SIZE),
					angle: (360 - p.angle) % 360,
					flipped: !p.flipped,
					isInitial: false,
				});
			}

			return filterDuplicates(corrects);
		},
		drawAxes: (ctx, OX, OY, CS, hints, active, hintSymbols, isHintMode) =>
			drawSymmetryElements(ctx, 'p2mg_h', OX, OY, CS, hints, active, hintSymbols, isHintMode),
		drawModelAxes: (ctx, hints) => drawSymmetryElements(ctx, 'p2mg_h', 0, 0, 200, hints),
	},
	pgg: {
		name: 'pgg (縦横映進・2回回転)',
		getCorrectShapes: (p0, OFFSET_X, OFFSET_Y, CELL_SIZE, wrap) => {
			let corrects = [{ ...p0 }];
			corrects.push({
				x: wrap(2 * OFFSET_X - p0.x, OFFSET_X, CELL_SIZE),
				y: wrap(p0.y + CELL_SIZE / 2, OFFSET_Y, CELL_SIZE),
				angle: (360 - p0.angle) % 360,
				flipped: !p0.flipped,
				isInitial: false,
			});
			let len = corrects.length;
			for (let i = 0; i < len; i++) {
				let c = corrects[i];
				corrects.push({
					x: wrap(c.x + CELL_SIZE / 2, OFFSET_X, CELL_SIZE),
					y: wrap(2 * OFFSET_Y - c.y, OFFSET_Y, CELL_SIZE),
					angle: (180 - c.angle + 360) % 360,
					flipped: !c.flipped,
					isInitial: false,
				});
			}
			return filterDuplicates(corrects);
		},
		drawAxes: (ctx, OX, OY, CS, hints, active, hintSymbols, isHintMode) =>
			drawSymmetryElements(ctx, 'pgg', OX, OY, CS, hints, active, hintSymbols, isHintMode),
		drawModelAxes: (ctx, hints) => drawSymmetryElements(ctx, 'pgg', 0, 0, 200, hints),
	},
	c2mm: {
		name: 'c2mm (縦横鏡映・2回回転・中心等価)',
		getCorrectShapes: (p0, OFFSET_X, OFFSET_Y, CELL_SIZE, wrap) => {
			let corrects = [{ ...p0 }];
			corrects.push({
				x: wrap(2 * OFFSET_X - p0.x, OFFSET_X, CELL_SIZE),
				y: p0.y,
				angle: (360 - p0.angle) % 360,
				flipped: !p0.flipped,
				isInitial: false,
			});
			let len = corrects.length;
			for (let i = 0; i < len; i++) {
				let c = corrects[i];
				corrects.push({
					x: c.x,
					y: wrap(2 * OFFSET_Y - c.y, OFFSET_Y, CELL_SIZE),
					angle: (180 - c.angle + 360) % 360,
					flipped: !c.flipped,
					isInitial: false,
				});
			}
			let len2 = corrects.length;
			for (let i = 0; i < len2; i++) {
				let c = corrects[i];
				corrects.push({
					x: wrap(c.x + CELL_SIZE / 2, OFFSET_X, CELL_SIZE),
					y: wrap(c.y + CELL_SIZE / 2, OFFSET_Y, CELL_SIZE),
					angle: c.angle,
					flipped: c.flipped,
					isInitial: false,
				});
			}
			return filterDuplicates(corrects);
		},
		drawAxes: (ctx, OX, OY, CS, hints, active, hintSymbols, isHintMode) =>
			drawSymmetryElements(ctx, 'c2mm', OX, OY, CS, hints, active, hintSymbols, isHintMode),
		drawModelAxes: (ctx, hints) => drawSymmetryElements(ctx, 'c2mm', 0, 0, 200, hints),
	},
	p4: {
		name: 'p4 (4回回転)',
		getCorrectShapes: (p0, OFFSET_X, OFFSET_Y, CELL_SIZE, wrap) => {
			let corrects = [{ ...p0 }];
			let cx = OFFSET_X + CELL_SIZE / 2,
				cy = OFFSET_Y + CELL_SIZE / 2;
			for (let i = 1; i < 4; i++) {
				let prev = corrects[i - 1];
				let dx = prev.x - cx,
					dy = prev.y - cy;
				corrects.push({
					x: wrap(cx - dy, OFFSET_X, CELL_SIZE),
					y: wrap(cy + dx, OFFSET_Y, CELL_SIZE),
					angle: (prev.angle + 90) % 360,
					flipped: prev.flipped,
					isInitial: false,
				});
			}
			return filterDuplicates(corrects);
		},
		drawAxes: (ctx, OX, OY, CS, hints, active, hintSymbols, isHintMode) =>
			drawSymmetryElements(ctx, 'p4', OX, OY, CS, hints, active, hintSymbols, isHintMode),
		drawModelAxes: (ctx, hints) => drawSymmetryElements(ctx, 'p4', 0, 0, 200, hints),
	},
	p4mm: {
		name: 'p4mm (4回回転・鏡映)',
		getCorrectShapes: (p0, OFFSET_X, OFFSET_Y, CELL_SIZE, wrap) => {
			let pts = [{ ...p0 }];
			let cx = OFFSET_X + CELL_SIZE / 2,
				cy = OFFSET_Y + CELL_SIZE / 2;
			for (let i = 1; i < 4; i++) {
				let prev = pts[i - 1];
				let dx = prev.x - cx,
					dy = prev.y - cy;
				pts.push({
					x: wrap(cx - dy, OFFSET_X, CELL_SIZE),
					y: wrap(cy + dx, OFFSET_Y, CELL_SIZE),
					angle: (prev.angle + 90) % 360,
					flipped: prev.flipped,
					isInitial: false,
				});
			}
			let len = pts.length;
			for (let i = 0; i < len; i++) {
				let p = pts[i];
				pts.push({
					x: wrap(2 * OFFSET_X - p.x, OFFSET_X, CELL_SIZE),
					y: p.y,
					angle: (360 - p.angle) % 360,
					flipped: !p.flipped,
					isInitial: false,
				});
			}
			return filterDuplicates(pts);
		},
		drawAxes: (ctx, OX, OY, CS, hints, active, hintSymbols, isHintMode) =>
			drawSymmetryElements(ctx, 'p4mm', OX, OY, CS, hints, active, hintSymbols, isHintMode),
		drawModelAxes: (ctx, hints) => drawSymmetryElements(ctx, 'p4mm', 0, 0, 200, hints),
	},
	p4mg: {
		name: 'p4mg (4回回転・対角鏡映・縦横映進)',
		getCorrectShapes: (p0, OFFSET_X, OFFSET_Y, CELL_SIZE, wrap) => {
			let pts = [{ ...p0 }];
			let cx = OFFSET_X,
				cy = OFFSET_Y;
			for (let i = 1; i < 4; i++) {
				let prev = pts[i - 1];
				let dx = prev.x - cx,
					dy = prev.y - cy;
				pts.push({
					x: wrap(cx - dy, OFFSET_X, CELL_SIZE),
					y: wrap(cy + dx, OFFSET_Y, CELL_SIZE),
					angle: (prev.angle + 90) % 360,
					flipped: prev.flipped,
					isInitial: false,
				});
			}
			let len = pts.length;
			for (let i = 0; i < len; i++) {
				let p = pts[i];
				pts.push({
					x: wrap(p.x + CELL_SIZE / 2, OFFSET_X, CELL_SIZE),
					y: wrap(2 * OFFSET_Y - p.y + CELL_SIZE / 2, OFFSET_Y, CELL_SIZE),
					angle: (180 - p.angle + 360) % 360,
					flipped: !p.flipped,
					isInitial: false,
				});
			}
			return filterDuplicates(pts);
		},
		drawAxes: (ctx, OX, OY, CS, hints, active, hintSymbols, isHintMode) =>
			drawSymmetryElements(ctx, 'p4mg', OX, OY, CS, hints, active, hintSymbols, isHintMode),
		drawModelAxes: (ctx, hints) => drawSymmetryElements(ctx, 'p4mg', 0, 0, 200, hints),
	},
	p3: {
		name: 'p3 (3回回転)',
		getCorrectShapes: (p0, OFFSET_X, OFFSET_Y, CELL_SIZE, wrap, wrapHex) => {
			// ★ 修正1: 基準点(p0)がひし形の外に生成された場合を考慮し、まずp0自身を枠内に引き戻す
			const wrappedP0 = wrapHex(p0.x, p0.y, OFFSET_X, OFFSET_Y, CELL_SIZE);
			const pBase = { ...p0, x: wrappedP0.x, y: wrappedP0.y };

			const pts = [pBase];

			// 回転の中心は、単位格子の左上格子点 (OFFSET_X, OFFSET_Y)
			const cx = OFFSET_X;
			const cy = OFFSET_Y;

			// ★ 修正2: 反転状態に関わらず、純粋な回転として角度を足す（引き算しない）
			const calcAngle = (baseAngle, rot) => {
				return (baseAngle + rot + 360) % 360;
			};

			for (let i = 1; i < 3; i++) {
				const rotDeg = i * 120; // 120度 と 240度
				const rotRad = (rotDeg * Math.PI) / 180;

				// 原点 (cx, cy) からの相対座標 (引き戻した pBase を基準にする)
				const dx = pBase.x - cx;
				const dy = pBase.y - cy;

				// 直交座標系上での 120度 / 240度 回転
				const nx = dx * Math.cos(rotRad) - dy * Math.sin(rotRad);
				const ny = dx * Math.sin(rotRad) + dy * Math.cos(rotRad);

				// はみ出た座標を、渡された wrapHex を使ってひし形内に引き戻す
				const wrapped = wrapHex(cx + nx, cy + ny, OFFSET_X, OFFSET_Y, CELL_SIZE);

				pts.push({
					x: wrapped.x,
					y: wrapped.y,
					angle: calcAngle(pBase.angle, rotDeg),
					flipped: pBase.flipped,
					isInitial: false,
				});
			}
			return filterDuplicates(pts);
		},
		drawAxes: (ctx, OX, OY, CS, hints, active, hintSymbols, isHintMode) =>
			drawSymmetryElements(ctx, 'p3', OX, OY, CS, hints, active, hintSymbols, isHintMode),
		drawModelAxes: (ctx, hints) => drawSymmetryElements(ctx, 'p3', 0, 0, 200, hints),
	},
	p3m1: {
		name: 'p3m1 (3回回転 + 対角方向の鏡映)',
		getCorrectShapes: (p0, OFFSET_X, OFFSET_Y, CELL_SIZE, wrap, wrapHex) => {
			const wrappedP0 = wrapHex(p0.x, p0.y, OFFSET_X, OFFSET_Y, CELL_SIZE);
			const pBase = { ...p0, x: wrappedP0.x, y: wrappedP0.y };

			const pts = [];
			const cx = OFFSET_X;
			const cy = OFFSET_Y;

			const calcAngle = (baseAngle, rot) => (baseAngle + rot + 360) % 360;

			const dx = pBase.x - cx;
			const dy = pBase.y - cy;

			// 30度軸に対する鏡映反転の座標計算
			const rx = dx * 0.5 + dy * (Math.sqrt(3) / 2);
			const ry = dx * (Math.sqrt(3) / 2) - dy * 0.5;

			const baseStates = [
				pBase,
				{
					x: cx + rx,
					y: cy + ry,
					// ★ 修正箇所：キャンバスの scale(-1, 1) 仕様に適合する正確な角度
					angle: (240 - pBase.angle + 360) % 360,
					flipped: !pBase.flipped,
				},
			];

			baseStates.forEach((state, stateIndex) => {
				for (let i = 0; i < 3; i++) {
					const rotDeg = i * 120;
					const rotRad = (rotDeg * Math.PI) / 180;

					const sdx = state.x - cx;
					const sdy = state.y - cy;

					const nx = sdx * Math.cos(rotRad) - sdy * Math.sin(rotRad);
					const ny = sdx * Math.sin(rotRad) + sdy * Math.cos(rotRad);

					const wrapped = wrapHex(cx + nx, cy + ny, OFFSET_X, OFFSET_Y, CELL_SIZE);

					pts.push({
						x: wrapped.x,
						y: wrapped.y,
						angle: calcAngle(state.angle, rotDeg),
						flipped: state.flipped,
						isInitial: stateIndex === 0 && i === 0,
					});
				}
			});

			return filterDuplicates(pts);
		},
		drawAxes: (ctx, OX, OY, CS, hints, active, hintSymbols, isHintMode) =>
			drawSymmetryElements(ctx, 'p3m1', OX, OY, CS, hints, active, hintSymbols, isHintMode),
		drawModelAxes: (ctx, hints) => drawSymmetryElements(ctx, 'p3m1', 0, 0, 200, hints),
	},
	p31m: {
		name: 'p31m (3回回転 + 格子ベクトル平行方向の鏡映)',
		getCorrectShapes: (p0, OFFSET_X, OFFSET_Y, CELL_SIZE, wrap, wrapHex) => {
			const wrappedP0 = wrapHex(p0.x, p0.y, OFFSET_X, OFFSET_Y, CELL_SIZE);
			const pBase = { ...p0, x: wrappedP0.x, y: wrappedP0.y };

			const pts = [];
			const cx = OFFSET_X;
			const cy = OFFSET_Y;

			const calcAngle = (baseAngle, rot) => (baseAngle + rot + 360) % 360;

			// p31mは0度方向（水平軸）に鏡映面を持つ
			const baseStates = [
				pBase,
				{
					x: pBase.x,
					y: cy - (pBase.y - cy),
					// ★ 修正箇所：水平軸に対する鏡映反転は「180 - 元の角度」になる
					angle: (180 - pBase.angle + 360) % 360,
					flipped: !pBase.flipped,
				},
			];

			baseStates.forEach((state, stateIndex) => {
				for (let i = 0; i < 3; i++) {
					const rotDeg = i * 120;
					const rotRad = (rotDeg * Math.PI) / 180;

					const dx = state.x - cx;
					const dy = state.y - cy;

					const nx = dx * Math.cos(rotRad) - dy * Math.sin(rotRad);
					const ny = dx * Math.sin(rotRad) + dy * Math.cos(rotRad);

					const wrapped = wrapHex(cx + nx, cy + ny, OFFSET_X, OFFSET_Y, CELL_SIZE);

					pts.push({
						x: wrapped.x,
						y: wrapped.y,
						angle: calcAngle(state.angle, rotDeg),
						flipped: state.flipped,
						isInitial: stateIndex === 0 && i === 0,
					});
				}
			});

			return filterDuplicates(pts);
		},
		drawAxes: (ctx, OX, OY, CS, hints, active, hintSymbols, isHintMode) =>
			drawSymmetryElements(ctx, 'p31m', OX, OY, CS, hints, active, hintSymbols, isHintMode),
		drawModelAxes: (ctx, hints) => drawSymmetryElements(ctx, 'p31m', 0, 0, 200, hints),
	},
	p6: {
		name: 'p6 (6回回転)',
		getCorrectShapes: (p0, OFFSET_X, OFFSET_Y, CELL_SIZE, wrap, wrapHex) => {
			const wrappedP0 = wrapHex(p0.x, p0.y, OFFSET_X, OFFSET_Y, CELL_SIZE);
			const pBase = { ...p0, x: wrappedP0.x, y: wrappedP0.y };

			const pts = [pBase];
			const cx = OFFSET_X;
			const cy = OFFSET_Y;

			const calcAngle = (baseAngle, rot) => (baseAngle + rot + 360) % 360;

			// 6回回転なので、60度ずつ 1〜5回（60度, 120度, 180度, 240度, 300度）回転
			for (let i = 1; i < 6; i++) {
				const rotDeg = i * 60;
				const rotRad = (rotDeg * Math.PI) / 180;

				const dx = pBase.x - cx;
				const dy = pBase.y - cy;

				const nx = dx * Math.cos(rotRad) - dy * Math.sin(rotRad);
				const ny = dx * Math.sin(rotRad) + dy * Math.cos(rotRad);

				const wrapped = wrapHex(cx + nx, cy + ny, OFFSET_X, OFFSET_Y, CELL_SIZE);

				pts.push({
					x: wrapped.x,
					y: wrapped.y,
					angle: calcAngle(pBase.angle, rotDeg),
					flipped: pBase.flipped,
					isInitial: false,
				});
			}

			return filterDuplicates(pts);
		},
		drawAxes: (ctx, OX, OY, CS, hints, active, hintSymbols, isHintMode) =>
			drawSymmetryElements(ctx, 'p6', OX, OY, CS, hints, active, hintSymbols, isHintMode),
		drawModelAxes: (ctx, hints) => drawSymmetryElements(ctx, 'p6', 0, 0, 200, hints),
	},
	p6mm: {
		name: 'p6mm (6回回転 + 鏡映)',
		getCorrectShapes: (p0, OFFSET_X, OFFSET_Y, CELL_SIZE, wrap, wrapHex) => {
			const wrappedP0 = wrapHex(p0.x, p0.y, OFFSET_X, OFFSET_Y, CELL_SIZE);
			const pBase = { ...p0, x: wrappedP0.x, y: wrappedP0.y };

			const pts = [];
			const cx = OFFSET_X;
			const cy = OFFSET_Y;

			const calcAngle = (baseAngle, rot) => (baseAngle + rot + 360) % 360;

			// p6mm は全ての対称軸に鏡映面を持つため、
			// 0度方向（水平軸）での反転状態を1つ作れば、あとは6回回転で全方位の反転が網羅されます
			const baseStates = [
				pBase,
				{
					x: pBase.x,
					y: cy - (pBase.y - cy),
					angle: (180 - pBase.angle + 360) % 360,
					flipped: !pBase.flipped,
				},
			];

			// 2つの状態それぞれに対して、0, 60, 120, 180, 240, 300度の回転を適用 (合計12個生成)
			baseStates.forEach((state, stateIndex) => {
				for (let i = 0; i < 6; i++) {
					const rotDeg = i * 60;
					const rotRad = (rotDeg * Math.PI) / 180;

					const dx = state.x - cx;
					const dy = state.y - cy;

					// 6回回転の適用
					const nx = dx * Math.cos(rotRad) - dy * Math.sin(rotRad);
					const ny = dx * Math.sin(rotRad) + dy * Math.cos(rotRad);

					const wrapped = wrapHex(cx + nx, cy + ny, OFFSET_X, OFFSET_Y, CELL_SIZE);

					pts.push({
						x: wrapped.x,
						y: wrapped.y,
						angle: calcAngle(state.angle, rotDeg),
						flipped: state.flipped,
						// 元の図形の0度回転時のみ true
						isInitial: stateIndex === 0 && i === 0,
					});
				}
			});

			return filterDuplicates(pts);
		},
		drawAxes: (ctx, OX, OY, CS, hints, active, hintSymbols, isHintMode) =>
			drawSymmetryElements(ctx, 'p6mm', OX, OY, CS, hints, active, hintSymbols, isHintMode),
		drawModelAxes: (ctx, hints) => drawSymmetryElements(ctx, 'p6mm', 0, 0, 200, hints),
	},
};
