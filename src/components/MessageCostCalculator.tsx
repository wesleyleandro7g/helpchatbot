import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

const FALLBACK_RATE = 5.4;
const RATE_TTL = 300_000;
const STORAGE_KEY = 'helpchatbot-calculator-state-v1';
const WHATSAPP_URL =
	'https://wa.me/5538998591036?text=' +
	encodeURIComponent(
		'Olá! Vi a calculadora de custos WhatsApp e gostaria de falar com um especialista.',
	);

const PRICES = {
	tpl: { marketing: 0.0625, utility: 0.0068, auth: 0.0045 },
	svc: { service: 0.0068 },
} as const;

type TabKey = 'tpl' | 'svc';
type TplCategory = keyof typeof PRICES.tpl;
type SvcCategory = keyof typeof PRICES.svc;

interface SavedState {
	activeTab?: TabKey;
	tabs?: {
		tpl?: { volumes?: Partial<Record<TplCategory, number | string>> };
		svc?: { volumes?: Partial<Record<SvcCategory, number | string>> };
	};
	exchangeRate?: number | null;
	lastUpdate?: number | null;
}

const formatUSD = (value: number) => `$ ${value.toFixed(2)}`;
const formatUSDUnit = (value: number) => `$ ${value.toFixed(4)}`;

function formatBRL(value: number) {
	return value.toLocaleString('pt-BR', {
		style: 'currency',
		currency: 'BRL',
		minimumFractionDigits: 2,
		maximumFractionDigits: 2,
	});
}

const formatInt = (value: number) => Math.round(value).toLocaleString('pt-BR');

function formatCompact(num: number) {
	if (num >= 1_000_000) return (num / 1_000_000).toFixed(1).replace('.0', '') + 'M';
	if (num >= 1_000) return (num / 1_000).toFixed(1).replace('.0', '') + 'K';
	return String(num);
}

function readNumber(raw: string, fallback = 0) {
	const value = parseFloat(String(raw).replace(',', '.'));
	return Number.isFinite(value) && value >= 0 ? value : fallback;
}

function loadState(): SavedState | null {
	try {
		const saved = localStorage.getItem(STORAGE_KEY);
		if (!saved) return null;
		return JSON.parse(saved) as SavedState;
	} catch {
		return null;
	}
}

const EMPTY_TPL: Record<TplCategory, number> = { marketing: 0, utility: 0, auth: 0 };

export default function MessageCostCalculator() {
	const [activeTab, setActiveTab] = useState<TabKey>('tpl');
	const [tplVolumes, setTplVolumes] = useState<Record<TplCategory, number>>(EMPTY_TPL);
	const [svcVolume, setSvcVolume] = useState(0);
	const [tplInputs, setTplInputs] = useState<Record<TplCategory, string>>({
		marketing: '0',
		utility: '0',
		auth: '0',
	});
	const [svcInput, setSvcInput] = useState('0');
	const [exchangeRate, setExchangeRate] = useState<number | null>(null);
	const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
	const [rateStatus, setRateStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
	const [pulse, setPulse] = useState(false);
	const [hydrated, setHydrated] = useState(false);

	const fetchExchangeRate = useCallback(async () => {
		setRateStatus('loading');
		try {
			const response = await fetch('https://economia.awesomeapi.com.br/json/last/USD-BRL');
			if (!response.ok) throw new Error(`HTTP ${response.status}`);
			const data = await response.json();
			const parsed = parseFloat(data.USDBRL.bid);
			if (!Number.isFinite(parsed)) throw new Error('cotação inválida');

			let updateTime = new Date(String(data.USDBRL.create_date).replace(' ', 'T'));
			if (Number.isNaN(updateTime.getTime())) updateTime = new Date();

			setExchangeRate(parsed);
			setLastUpdate(updateTime);
			setRateStatus('success');
		} catch (error) {
			console.error('Erro ao buscar cotação:', error);
			setRateStatus('error');
		}
	}, []);

	useEffect(() => {
		const saved = loadState();
		let hasFreshRate = false;

		if (saved) {
			if (saved.activeTab === 'svc' || saved.activeTab === 'tpl') {
				setActiveTab(saved.activeTab);
			}

			const marketing = Math.round(readNumber(String(saved.tabs?.tpl?.volumes?.marketing ?? 0)));
			const utility = Math.round(readNumber(String(saved.tabs?.tpl?.volumes?.utility ?? 0)));
			const auth = Math.round(readNumber(String(saved.tabs?.tpl?.volumes?.auth ?? 0)));
			const service = Math.round(readNumber(String(saved.tabs?.svc?.volumes?.service ?? 0)));

			setTplVolumes({ marketing, utility, auth });
			setTplInputs({
				marketing: String(marketing),
				utility: String(utility),
				auth: String(auth),
			});
			setSvcVolume(service);
			setSvcInput(String(service));

			if (
				saved.exchangeRate &&
				saved.lastUpdate &&
				Date.now() - saved.lastUpdate < RATE_TTL
			) {
				setExchangeRate(saved.exchangeRate);
				setLastUpdate(new Date(saved.lastUpdate));
				setRateStatus('success');
				hasFreshRate = true;
			}
		}

		setHydrated(true);
		if (!hasFreshRate) fetchExchangeRate();
		const interval = setInterval(fetchExchangeRate, RATE_TTL);
		return () => clearInterval(interval);
	}, [fetchExchangeRate]);

	useEffect(() => {
		if (!hydrated) return;
		try {
			const state: SavedState = {
				activeTab,
				tabs: {
					tpl: { volumes: tplVolumes },
					svc: { volumes: { service: svcVolume } },
				},
				exchangeRate,
				lastUpdate: lastUpdate ? lastUpdate.getTime() : null,
			};
			localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
		} catch {
			// ignore quota / private mode
		}
	}, [hydrated, activeTab, tplVolumes, svcVolume, exchangeRate, lastUpdate]);

	const effectiveRate = exchangeRate ?? FALLBACK_RATE;

	const tplTotals = useMemo(() => {
		let totalUSD = 0;
		let totalQty = 0;
		(Object.keys(PRICES.tpl) as TplCategory[]).forEach((cat) => {
			totalUSD += tplVolumes[cat] * PRICES.tpl[cat];
			totalQty += tplVolumes[cat];
		});
		return { totalUSD, totalQty };
	}, [tplVolumes]);

	const svcTotalUSD = svcVolume * PRICES.svc.service;

	useEffect(() => {
		setPulse(true);
		const t = setTimeout(() => setPulse(false), 300);
		return () => clearTimeout(t);
	}, [tplTotals.totalUSD, svcTotalUSD, effectiveRate, activeTab]);

	const svcNote =
		svcTotalUSD > 0
			? `Hoje isso custa R$ 0,00. A partir de outubro, ${formatBRL(svcTotalUSD * effectiveRate * 12)} por ano.`
			: 'Hoje isso custa R$ 0,00. A cobrança começa em 1º de outubro de 2026.';

	const disclaimer = exchangeRate
		? `Convertido a ${formatBRL(effectiveRate)} por dólar.`
		: `Cotação indisponível no momento. Estimativa feita com dólar a ${formatBRL(effectiveRate)}.`;

	const rateLabel =
		rateStatus === 'loading'
			? 'Carregando...'
			: rateStatus === 'error'
				? `R$ ${FALLBACK_RATE.toFixed(2)} (estimado)`
				: exchangeRate
					? `R$ ${exchangeRate.toFixed(4)}`
					: 'Carregando...';

	const timestampLabel =
		rateStatus === 'error'
			? 'Não conseguimos falar com a API de câmbio'
			: lastUpdate
				? `Atualizado em: ${lastUpdate.toLocaleString('pt-BR', {
						day: '2-digit',
						month: '2-digit',
						year: 'numeric',
						hour: '2-digit',
						minute: '2-digit',
					})}`
				: '';

	const rateClass =
		rateStatus === 'loading' || rateStatus === 'idle'
			? 'exchange-value loading-text'
			: rateStatus === 'error'
				? 'exchange-value error-text'
				: 'exchange-value success-text';

	const setTplFromSlider = (cat: TplCategory, raw: string) => {
		const value = Math.max(0, Math.round(readNumber(raw)));
		setTplVolumes((prev) => ({ ...prev, [cat]: value }));
		setTplInputs((prev) => ({ ...prev, [cat]: String(value) }));
	};

	const setTplFromNumber = (cat: TplCategory, raw: string) => {
		setTplInputs((prev) => ({ ...prev, [cat]: raw }));
		const value = Math.max(0, Math.round(readNumber(raw)));
		setTplVolumes((prev) => ({ ...prev, [cat]: value }));
	};

	const blurTpl = (cat: TplCategory) => {
		const raw = tplInputs[cat];
		if (raw === '' || readNumber(raw) < 0) {
			setTplVolumes((prev) => ({ ...prev, [cat]: 0 }));
			setTplInputs((prev) => ({ ...prev, [cat]: '0' }));
			return;
		}
		const value = Math.max(0, Math.round(readNumber(raw)));
		setTplVolumes((prev) => ({ ...prev, [cat]: value }));
		setTplInputs((prev) => ({ ...prev, [cat]: String(value) }));
	};

	const setSvcFromSlider = (raw: string) => {
		const value = Math.max(0, Math.round(readNumber(raw)));
		setSvcVolume(value);
		setSvcInput(String(value));
	};

	const setSvcFromNumber = (raw: string) => {
		setSvcInput(raw);
		const value = Math.max(0, Math.round(readNumber(raw)));
		setSvcVolume(value);
	};

	const blurSvc = () => {
		if (svcInput === '' || readNumber(svcInput) < 0) {
			setSvcVolume(0);
			setSvcInput('0');
			return;
		}
		const value = Math.max(0, Math.round(readNumber(svcInput)));
		setSvcVolume(value);
		setSvcInput(String(value));
	};

	return (
		<div className="calculator-card">
			<div className="form-group">
				<div className="exchange-rate-display">
					<div className="exchange-info">
						<span className="exchange-label">Cotação USD → BRL:</span>
						<span className={rateClass}>{rateLabel}</span>
					</div>
					{timestampLabel ? (
						<div className="exchange-timestamp">{timestampLabel}</div>
					) : null}
				</div>
				<p className="form-help">
					Cotação em tempo real, atualizada automaticamente a cada 5 minutos.
				</p>
			</div>

			<div className="tabs" role="tablist">
				<button
					className="tab"
					id="tab-tpl"
					role="tab"
					type="button"
					aria-selected={activeTab === 'tpl'}
					aria-controls="panel-tpl"
					onClick={() => setActiveTab('tpl')}
				>
					Templates
					<span className="tab-hint">já é cobrado</span>
				</button>
				<button
					className="tab"
					id="tab-svc"
					role="tab"
					type="button"
					aria-selected={activeTab === 'svc'}
					aria-controls="panel-svc"
					onClick={() => setActiveTab('svc')}
				>
					Mensagens
					<span className="tab-hint">novo em outubro</span>
				</button>
			</div>

			<section
				className="panel"
				id="panel-tpl"
				role="tabpanel"
				aria-labelledby="tab-tpl"
				hidden={activeTab !== 'tpl'}
			>
				<p className="panel-intro">
					Informe quantos templates você dispara por mês em cada categoria.
				</p>

				<CategoryRow
					id="tpl-marketing"
					label="Templates de Marketing"
					tooltip="Promoção, novidade, carrinho abandonado, reengajamento."
					sliderLabel="Templates de marketing por mês"
					numberLabel="Quantidade de templates de marketing"
					price={PRICES.tpl.marketing}
					qty={tplVolumes.marketing}
					inputValue={tplInputs.marketing}
					max={50000}
					step={100}
					onSlider={setTplFromSlider.bind(null, 'marketing')}
					onNumber={setTplFromNumber.bind(null, 'marketing')}
					onBlur={() => blurTpl('marketing')}
					visible={activeTab === 'tpl'}
				/>

				<CategoryRow
					id="tpl-utility"
					label="Templates de Utilidade"
					tooltip="Confirmação de pedido, status de entrega, cobrança, lembrete."
					sliderLabel="Templates de utilidade por mês"
					numberLabel="Quantidade de templates de utilidade"
					price={PRICES.tpl.utility}
					qty={tplVolumes.utility}
					inputValue={tplInputs.utility}
					max={50000}
					step={100}
					onSlider={setTplFromSlider.bind(null, 'utility')}
					onNumber={setTplFromNumber.bind(null, 'utility')}
					onBlur={() => blurTpl('utility')}
					visible={activeTab === 'tpl'}
				/>

				<CategoryRow
					id="tpl-auth"
					label="Templates de Autenticação"
					tooltip="Código de verificação, OTP, login."
					sliderLabel="Templates de autenticação por mês"
					numberLabel="Quantidade de templates de autenticação"
					price={PRICES.tpl.auth}
					qty={tplVolumes.auth}
					inputValue={tplInputs.auth}
					max={50000}
					step={100}
					onSlider={setTplFromSlider.bind(null, 'auth')}
					onNumber={setTplFromNumber.bind(null, 'auth')}
					onBlur={() => blurTpl('auth')}
					visible={activeTab === 'tpl'}
				/>

				<div className="estimate-section">
					<div className="estimate-content">
						<h3 className="estimate-title">Total em templates por mês</h3>
						<div className={`estimate-value${pulse ? ' value-update' : ''}`}>
							{formatBRL(tplTotals.totalUSD * effectiveRate)}
						</div>
						<div className="estimate-usd">{formatUSD(tplTotals.totalUSD)}</div>
						<div className="estimate-detail">
							{formatInt(tplTotals.totalQty)}{' '}
							{tplTotals.totalQty === 1 ? 'template entregue' : 'templates entregues'}
						</div>
					</div>
				</div>
			</section>

			<section
				className="panel"
				id="panel-svc"
				role="tabpanel"
				aria-labelledby="tab-svc"
				hidden={activeTab !== 'svc'}
			>
				<p className="panel-intro">
					Toda resposta que você manda dentro da janela de 24 horas que o cliente abriu.
					Hoje sai de graça; em outubro passa a ser cobrada.
				</p>

				<CategoryRow
					id="svc-service"
					label="Mensagens por mês"
					tooltip="Resposta do agente ou do bot dentro da janela de 24 horas aberta pelo cliente."
					sliderLabel="Mensagens por mês"
					numberLabel="Quantidade de mensagens"
					price={PRICES.svc.service}
					qty={svcVolume}
					inputValue={svcInput}
					max={100000}
					step={500}
					onSlider={setSvcFromSlider}
					onNumber={setSvcFromNumber}
					onBlur={blurSvc}
					visible={activeTab === 'svc'}
					help="Conte só o que sai da sua ponta. Mensagem recebida do cliente nunca é cobrada."
				/>

				<div className="estimate-section">
					<div className="estimate-content">
						<h3 className="estimate-title">Custo de mensagens por mês</h3>
						<div className={`estimate-value${pulse ? ' value-update' : ''}`}>
							{formatBRL(svcTotalUSD * effectiveRate)}
						</div>
						<div className="estimate-usd">{formatUSD(svcTotalUSD)}</div>
						<div className="estimate-detail">
							{formatInt(svcVolume)} {svcVolume === 1 ? 'mensagem' : 'mensagens'}
						</div>
						<div className="estimate-note">{svcNote}</div>
					</div>
				</div>
			</section>

			<p className="disclaimer">{disclaimer}</p>

			<a className="cta-button" href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer">
				Falar com um especialista
			</a>
		</div>
	);
}

interface CategoryRowProps {
	id: string;
	label: string;
	tooltip: string;
	sliderLabel: string;
	numberLabel: string;
	price: number;
	qty: number;
	inputValue: string;
	max: number;
	step: number;
	onSlider: (raw: string) => void;
	onNumber: (raw: string) => void;
	onBlur: () => void;
	visible: boolean;
	help?: string;
}

function CategoryRow({
	id,
	label,
	tooltip,
	sliderLabel,
	numberLabel,
	price,
	qty,
	inputValue,
	max,
	step,
	onSlider,
	onNumber,
	onBlur,
	visible,
	help,
}: CategoryRowProps) {
	const sliderRef = useRef<HTMLInputElement>(null);
	const [bubbleLeft, setBubbleLeft] = useState(12);
	const sliderValue = Math.min(qty, max);
	const cost = qty * price;

	const positionBubble = useCallback(() => {
		const slider = sliderRef.current;
		if (!slider) return;
		const min = parseFloat(slider.min);
		const sliderMax = parseFloat(slider.max);
		const value = parseFloat(slider.value);
		const percent = sliderMax > min ? (value - min) / (sliderMax - min) : 0;
		setBubbleLeft(percent * (slider.offsetWidth - 24) + 12);
	}, []);

	useEffect(() => {
		if (!visible) return;
		positionBubble();
	}, [visible, sliderValue, positionBubble]);

	useEffect(() => {
		window.addEventListener('resize', positionBubble);
		return () => window.removeEventListener('resize', positionBubble);
	}, [positionBubble]);

	return (
		<div className="form-group">
			<label className="form-label" htmlFor={`${id}-number`}>
				{label}
				<span className="info-icon" title={tooltip}>
					ℹ️
				</span>
			</label>
			<div className="price-display">
				<span className="price-value">
					<strong>{formatUSDUnit(price)}</strong> por mensagem
				</span>
				<span className="total-value">{formatUSD(cost)}</span>
			</div>
			<div className="input-row">
				<div className="slider-container">
					<input
						ref={sliderRef}
						type="range"
						id={`${id}-slider`}
						className="slider"
						min={0}
						max={max}
						step={step}
						value={sliderValue}
						aria-label={sliderLabel}
						onInput={(e) => onSlider((e.target as HTMLInputElement).value)}
					/>
					<div className="slider-value" style={{ left: `${bubbleLeft}px` }}>
						{formatCompact(qty)}
					</div>
				</div>
				<input
					type="number"
					id={`${id}-number`}
					className="number-input"
					min={0}
					step={1}
					value={inputValue}
					aria-label={numberLabel}
					onChange={(e) => onNumber(e.target.value)}
					onBlur={onBlur}
				/>
			</div>
			{help ? <p className="form-help">{help}</p> : null}
		</div>
	);
}
