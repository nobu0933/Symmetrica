// ==========================================
// shapes.js
// 図形と色の定義データ
// ==========================================

// 図形の定義
export const SHAPES = {
	triangle: { id: 'triangle', nameJa: '直角三角形' },
	six: { id: 'six', nameJa: '数字の6' },
	l_shape: { id: 'l_shape', nameJa: 'L字型' },
	f_shape: { id: 'f_shape', nameJa: 'Fの字' },
	p_shape: { id: 'p_shape', nameJa: 'Pの字' },
	lightning: { id: 'lightning', nameJa: '稲妻型' },
	seven: { id: 'seven', nameJa: '数字の7' },
	// ▼▼ 今回追加する4つの図形 ▼▼
	bird: { id: 'bird', nameJa: 'カモメ型' },
	q_shape: { id: 'q_shape', nameJa: 'Qの字' },
	step_triangle: { id: 'step_triangle', nameJa: '階段付き三角形' },
	half_arrow: { id: 'half_arrow', nameJa: '片矢印' },
	// ▲▲ 今回追加する4つの図形 ▲▲
};

// ★ 変更: 色の定義をカラーセットのオブジェクトとして管理する
export const COLOR_SETS = {
	default: [
		{ value: '#E48900' },
		{ value: '#ECCD00' },
		{ value: '#3AAA33' },
		{ value: '#1D71B8' },
		{ value: '#6E2E77' },
	],
	bright: [
		{ value: '#FF9000' },
		{ value: '#F6E80C' },
		{ value: '#81EC56' },
		{ value: '#44C3EE' },
		{ value: '#6600DD' },
		{ value: '#C50EC6' },
	],
	vintage: [
		{ value: '#EB856F' },
		{ value: '#E4C16B' },
		{ value: '#399993' },
		{ value: '#628C7B' },
		{ value: '#73A9B5' },
		{ value: '#43769C' },
		{ value: '#3C3E59' },
	],
	spring: [
		{ value: '#74C9F7' },
		{ value: '#43c3be' },
		{ value: '#19955E' },
		{ value: '#97CB61' },
		{ value: '#F1C36E' },
		{ value: '#ED4088' },
		{ value: '#6063CE' },
	],
	summer: [
		{ value: '#F18234' },
		{ value: '#F6BD07' },
		{ value: '#16954B' },
		{ value: '#93DA7B' },
		{ value: '#05B3FD' },
		{ value: '#0269CB' },
	],
	autumn: [
		{ value: '#537C00' },
		{ value: '#96A41E' },
		{ value: '#9F922B' },
		{ value: '#F49C37' },
		{ value: '#F4C648' },
		{ value: '#C84945' },
		{ value: '#6C3210' },
	],
	winter: [
		{ value: '#222E5E' },
		{ value: '#6F77A2' },
		{ value: '#79A4B1' },
		{ value: '#A69DC1' },
		{ value: '#6E796B' },
		{ value: '#417E6A' },
		{ value: '#805375' },
	],
	monochrome: [
		{ value: '#111111' },
		{ value: '#333333' },
		{ value: '#555555' },
		{ value: '#777777' },
		{ value: '#999999' },
	],
	white: [{ value: '#ffffff' }],
};

// 互換性維持のため、既存の SHAPE_COLORS には default を割り当てておく
export const SHAPE_COLORS = COLOR_SETS.default;

// 図形のパス描画定義（原点が視覚的中心になるようにオフセットを計算して描画する）
export const ShapeDefs = {
	triangle: {
		drawPath: (context, size) => {
			// 直角三角形の「重心」を原点(0,0)に合わせるためのオフセット
			const cx = -size / 3;
			const cy = -size / 6;

			context.moveTo(cx, cy);
			context.lineTo(cx + size, cy);
			context.lineTo(cx, cy + size / 2);
			context.closePath();
		},
	},
	six: {
		drawPath: (context, size) => {
			const t = size * 0.15;
			const w = size * 0.6;
			const h = size * 0.8;

			const cx = -w / 2;
			const cy = -h / 2;

			// 外側の輪郭
			context.moveTo(cx, cy);
			context.lineTo(cx + w, cy);
			context.lineTo(cx + w, cy + t);
			context.lineTo(cx + t, cy + t);
			context.lineTo(cx + t, cy + h / 2);
			context.lineTo(cx + w, cy + h / 2);
			context.lineTo(cx + w, cy + h);
			context.lineTo(cx, cy + h);
			context.closePath();

			// 内側の穴
			context.moveTo(cx + t, cy + h / 2 + t);
			context.lineTo(cx + t, cy + h - t);
			context.lineTo(cx + w - t, cy + h - t);
			context.lineTo(cx + w - t, cy + h / 2 + t);
			context.closePath();
		},
	},
	l_shape: {
		drawPath: (context, size) => {
			const t = size * 0.25;
			const w = size * 0.75;
			const h = size;

			const cx = -w / 2;
			const cy = -h / 2;

			context.moveTo(cx, cy);
			context.lineTo(cx + t, cy);
			context.lineTo(cx + t, cy + h - t);
			context.lineTo(cx + w, cy + h - t);
			context.lineTo(cx + w, cy + h);
			context.lineTo(cx, cy + h);
			context.closePath();
		},
	},
	f_shape: {
		drawPath: (context, size) => {
			const t = size * 0.2;
			const w = size * 0.8;
			const h = size;
			const mw = size * 0.6;
			const my = size * 0.4;

			const cx = -w / 2;
			const cy = -h / 2;

			context.moveTo(cx, cy);
			context.lineTo(cx + w, cy);
			context.lineTo(cx + w, cy + t);
			context.lineTo(cx + t, cy + t);
			context.lineTo(cx + t, cy + my);
			context.lineTo(cx + mw, cy + my);
			context.lineTo(cx + mw, cy + my + t);
			context.lineTo(cx + t, cy + my + t);
			context.lineTo(cx + t, cy + h);
			context.lineTo(cx, cy + h);
			context.closePath();
		},
	},

	// ▼▼ ここから追加した図形 ▼▼
	p_shape: {
		drawPath: (context, size) => {
			// Pの字型
			const t = size * 0.18; // 線の太さ
			const w = size * 0.75; // 全体の幅
			const h = size; // 全体の高さ
			const loopH = size * 0.55; // 上部のループの高さ

			// バウンディングボックスの中心を原点に合わせる
			const cx = -w / 2;
			const cy = -h / 2;

			// 外側の輪郭（時計回りで描画）
			context.moveTo(cx, cy);
			context.lineTo(cx + w, cy);
			context.lineTo(cx + w, cy + loopH);
			context.lineTo(cx + t, cy + loopH);
			context.lineTo(cx + t, cy + h);
			context.lineTo(cx, cy + h);
			context.closePath();

			// 内側の穴（反時計回りで描画して中をくり抜く）
			context.moveTo(cx + t, cy + t);
			context.lineTo(cx + t, cy + loopH - t);
			context.lineTo(cx + w - t, cy + loopH - t);
			context.lineTo(cx + w - t, cy + t);
			context.closePath();
		},
	},
	lightning: {
		drawPath: (context, size) => {
			// 稲妻型（点対称にも線対称にもならないジグザグ）
			const w = size;
			const h = size;
			const t = w / 2;
			const d = h / 2;
			const cx = 0;
			const cy = 0;

			context.moveTo(cx + t * -0.25, cy + d * -1);
			context.lineTo(cx + t * 0.33, cy + d * -1);
			context.lineTo(cx + t * 0.09, cy + d * -0.3);
			context.lineTo(cx + t * 0.64, cy + d * -0.3);
			context.lineTo(cx + t * -0.275, cy + d * 1);
			context.lineTo(cx + t * 0, cy + d * 0);
			context.lineTo(cx + t * -0.54, cy + d * 0);
			context.closePath();
		},
	},
	seven: {
		drawPath: (context, size) => {
			// 数字の7（斜めの線を持つ非対称図形）
			const t = size * 0.25; // 線の太さ
			const w = size * 0.75; // 幅
			const h = size; // 高さ

			const cx = -w / 2;
			const cy = -h / 2;

			context.moveTo(cx, cy);
			context.lineTo(cx + w, cy);
			context.lineTo(cx + w, cy + t);
			// 斜めに降りる
			context.lineTo(cx + t + w * 0.3, cy + h);
			context.lineTo(cx + w * 0.3, cy + h);
			// 内側の斜め線
			context.lineTo(cx + w - t, cy + t);
			context.lineTo(cx, cy + t);
			context.closePath();
		},
	},
	// ▲▲ ここまで追加した図形 ▲▲
	bird: {
		drawPath: (context, size) => {
			// カモメ型（中央が凹んだ曲線のV字）
			const rr = size * 0.5; // 右側の半径
			const rl = size * 1; // 左側の半径
			const w = rr + rl;
			const t = size * 0.15; // 線の太さ
			const h = rl + t / 2;
			const cx = -rr;
			const cy = 0;

			// 左上からスタートし、下側の輪郭を描画
			context.moveTo(cx, cy + rr - t / 2);
			context.arc(cx, cy, rr - t / 2, 0.5 * Math.PI, 0 * Math.PI, true);
			// context.quadraticCurveTo(cx + rr - t / 2, cy + rr - t / 2, cx + rr - t / 2, cy);
			// context.moveTo(cx + rr - t / 2, cy);
			context.lineTo(cx + rr + t / 2, cy);

			context.arc(cx + w, cy, rl - t / 2, 1 * Math.PI, 0.5 * Math.PI, true);
			// context.quadraticCurveTo(cx + rr + t / 2, cy + rl - t / 2, cx + w, cy + rl - t / 2);
			context.lineTo(cx + w, cy + rl + t / 2);

			context.arc(cx + w, cy, rl + t / 2, 0.5 * Math.PI, 1 * Math.PI, false);
			// context.quadraticCurveTo(cx + rr - t / 2, cy + rl + t / 2, cx + rr - t / 2, cy);
			context.lineTo(cx + rr + t / 2, cy);

			context.arc(cx, cy, rr + t / 2, 0 * Math.PI, 0.5 * Math.PI, false);
			// context.quadraticCurveTo(cx + rr + t / 2, cy + rr + t / 2, cx, cy + rr + t / 2);
			// context.moveTo(cx, cy + rr + t / 2);
			context.lineTo(cx, cy + rr - t / 2);
			context.closePath();
		},
	},
	q_shape: {
		drawPath: (context, size) => {
			// Qの字型（左側に円、右側に下へ伸びる直線）
			const h = size;
			const R = size * 0.35; // 外側の円の半径
			const t = size * 0.2; // 線の太さ
			const cx = -R;
			const cy = -h / 2;

			const cX = cx + R;
			const cY = cy + R;

			// 外側のシルエット（時計回り）
			context.arc(cX, cY, R, 0, Math.PI * 2, false);
			// 右側のステム（直線部分）
			context.rect(cX + R - t, cY, t, h * 0.7);

			// 内側の穴（反時計回りで描画してくり抜く）
			context.moveTo(cX + R - t, cY);
			context.arc(cX, cY, R - t, 0, Math.PI * 2, true);
		},
	},
	step_triangle: {
		drawPath: (context, size) => {
			// 階段付き三角形（右下が階段状に削られたような三角形）
			const scaledSize = size * 0.8;
			const l = scaledSize;
			const m = scaledSize * 0.5;
			const t = scaledSize * 0.2;
			const cx = -(l + m) / 2;
			const cy = -m / 2;

			context.moveTo(cx, cy);
			context.lineTo(cx + l / 2, cy + (l * Math.sqrt(3)) / 2);
			context.lineTo(cx + l, cy);
			context.lineTo(cx + l - t, cy);
			context.lineTo(cx + l - t + m / 2, cy + (m * Math.sqrt(3)) / 2);
			context.lineTo(cx + l - t + m, cy);
			// context.lineTo(cx + w * 0.8, cy + h * 0.65);
			// context.lineTo(cx + w, cy + h * 0.65);
			context.closePath(); // 頂点へ戻る
		},
	},
	half_arrow: {
		drawPath: (context, size) => {
			// 片矢印（左向きの平らな矢印）
			const w = size * 1.5;
			const h = size * 0.45;
			const t = size * 0.2;
			const cx = -w / 2;
			const cy = -h / 2;

			context.moveTo(cx, cy + h); // 左端の先端（底辺側）
			context.lineTo(cx + h, cy); // 矢印の左上
			context.lineTo(cx + h, cy + h - t); // 垂直に下がる
			context.lineTo(cx + w, cy + h - t); // 軸の右上
			context.lineTo(cx + w - t, cy + h); // 軸の右下（少し斜めにカット）
			context.closePath(); // 左端へ戻る（一直線の底辺）
		},
	},
};

// 登録されている図形のキー一覧を自動生成
export const SHAPE_TYPES = Object.keys(ShapeDefs);
